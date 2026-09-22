/**
 * MEGA textbook asset pipeline.
 *
 * Resolves the shared MEGA folder link (metadata + file index) once at app
 * startup instead of on every StudyPage navigation, then downloads/decrypts a
 * requested textbook PDF with a resilient retry loop.
 *
 * Failure contract (consumed by the StudyPage cascading/fallover step):
 *   - timeout  -> MEGA is retried up to 3 attempts with 2s/5s backoff; on final
 *                 timeout it does NOT cascade to the local mirror.
 *   - notfound -> definitive 404 (file absent from the MEGA folder index);
 *                 caller may cascade to the local mirror.
 *   - auth / decrypt -> caller may cascade to the local mirror.
 */
import { } from 'megajs';

type MegaReason = 'timeout' | 'auth' | 'notfound' | 'decrypt';

export interface MegaFailure {
  ok: false;
  reason: MegaReason;
  file: string;
  attempt: number;
  lastError?: unknown;
  /** true when the caller should cascade to the secondary local mirror. */
  shouldCascade: boolean;
}

export interface MegaSuccess {
  ok: true;
  chunks: Uint8Array[];
  file: string;
  attempt: number;
}

export type MegaPdfResult = MegaSuccess | MegaFailure;

// The project's verified public asset container (shared folder link).
const PUBLIC_MEGA_FOLDER_URL = 'https://mega.nz/folder/EMdRGZBJ#L814x1beExJxZYAloNdD5w';

// Single-download hard cap: 15s was too aggressive for multi-MB PDFs on slow
// networks (it produced "timed out after 15s" straight into a local 404). 60s
// gives the decryption stream room to finish before we classify it as a stall.
const DOWNLOAD_TIMEOUT_MS = 60000;

const MAX_ATTEMPTS = 3;
// Escalating backoff between retries: 2s before attempt #2, 5s before attempt #3.
const RETRY_BACKOFF_MS = [2000, 5000];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Coarse error classifier used to pick the structured MEGA failure reason. */
function classifyError(err: unknown): MegaReason {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('etimedout') ||
    msg.includes('network idle') ||
    msg.includes('abort')
  ) return 'timeout';
  if (
    msg.includes('not found') ||
    msg.includes('enoent') ||
    msg.includes('not uploaded') ||
    msg.includes('status 404') ||
    msg.includes('404')
  ) return 'notfound';
  if (
    msg.includes('auth') ||
    msg.includes('permission') ||
    msg.includes('unauthorized') ||
    msg.includes('banned') ||
    msg.includes('ebadkey') ||
    msg.includes('eaccess') ||
    msg.includes('forbidden')
  ) return 'auth';
  return 'decrypt';
}

class MegaPipeline {
  private warmupPromise: Promise<void> | null = null;
  /** lowercase filename -> megajs File instance, populated during pre-warm. */
  private fileIndex = new Map<string, any>();

  /** Wait for the shared MEGA folder resolution (logged once). */
  prewarm(): Promise<void> {
    if (!this.warmupPromise) {
      this.warmupPromise = this.init()
        .catch((err: unknown) => {
          console.warn('[Asset Pipeline] MEGA pre-warm failed; will re-warm on next request.', err);
          this.warmupPromise = null;
          throw err;
        });
    }
    return this.warmupPromise;
  }

  private async init(): Promise<void> {
    const megaModule = await import('megajs') as any;
    const FileEngine = megaModule.File || (megaModule as any).default?.File;
    if (!FileEngine) {
      throw new Error('Could not extract the File constructor from the megajs library bundle context.');
    }

    console.log('[Asset Pipeline] Pre-warming MEGA folder index...');
    const megaFolder = FileEngine.fromURL(PUBLIC_MEGA_FOLDER_URL);
    await megaFolder.loadAttributes();

    const index = (folder: any) => {
      for (const child of folder.children || []) {
        if (child.children && child.children.length) {
          index(child);
        } else {
          this.fileIndex.set(String(child.name || '').toLowerCase(), child);
        }
      }
    };
    index(megaFolder);

    console.log(`[Asset Pipeline] MEGA pre-warm complete (${this.fileIndex.size} files indexed).`);
  }

  /** Log every MEGA failure using the structured shape requested. */
  private log(reason: MegaReason, file: string, attempt: number, extra?: unknown) {
    const entry = { source: 'MEGA', reason, file, attempt };
    if (extra !== undefined) {
      console.warn('[Asset Pipeline] MEGA fetch failed', entry, extra);
    } else {
      console.warn('[Asset Pipeline] MEGA fetch failed', entry);
    }
  }

  private async downloadAttempt(file: any, name: string): Promise<Uint8Array[]> {
    const downloadWithTimeout = async (): Promise<Uint8Array[]> => {
      const chunks: Uint8Array[] = [];
      for await (const chunk of file.download({})) {
        chunks.push(new Uint8Array(chunk));
      }
      return chunks;
    };
    let downloadTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        downloadWithTimeout(),
        new Promise<never>((_, reject) => {
          downloadTimer = setTimeout(
            () => reject(new Error(`MEGA download for [${name}] timed out after ${DOWNLOAD_TIMEOUT_MS / 1000}s`)),
            DOWNLOAD_TIMEOUT_MS
          );
        }),
      ]);
    } finally {
      if (downloadTimer) clearTimeout(downloadTimer);
    }
  }

  /**
   * Fetch + decrypt a single textbook PDF from MEGA.
   *
   * - Resolves metadata from the pre-warmed index (never re-loads the folder).
   * - Retries downloads up to MAX_ATTEMPTS with escalating backoff.
   * - timeout (final) -> shouldCascade = false (MEGA is just slow; do not fall
   *   back to a likely-missing local mirror).
   * - notfound (definitive 404) -> shouldCascade = true, no pointless retries.
   * - auth/decrypt -> retried, then shouldCascade = true.
   */
  async fetchPdf(name: string): Promise<MegaPdfResult> {
    await this.prewarm();

    const targetKey = String(name || '').toLowerCase();
    const cloudFile = this.fileIndex.get(targetKey);
    if (!cloudFile) {
      this.log('notfound', name, 0);
      return { ok: false, reason: 'notfound', file: name, attempt: 0, shouldCascade: true };
    }

    console.log(`[Asset Pipeline] Cloud target confirmed: ${cloudFile.name}. Starting decryption stream...`);

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) {
        await sleep(RETRY_BACKOFF_MS[attempt - 2] || 0);
      }
      try {
        const chunks = await this.downloadAttempt(cloudFile, name);
        return { ok: true, chunks, file: name, attempt };
      } catch (err) {
        lastError = err;
        const reason = classifyError(err);
        this.log(reason, name, attempt, err);

        // Definitive 404: do not waste the remaining retries, cascade now.
        if (reason === 'notfound') {
          return { ok: false, reason, file: name, attempt, lastError, shouldCascade: true };
        }
        if (attempt === MAX_ATTEMPTS) {
          return {
            ok: false,
            reason,
            file: name,
            attempt,
            lastError,
            shouldCascade: reason !== 'timeout',
          };
        }
      }
    }

    // Unreachable — kept to satisfy control-flow analysis.
    return { ok: false, reason: 'decrypt', file: name, attempt: MAX_ATTEMPTS, lastError, shouldCascade: true };
  }
}

export const megaPipeline = new MegaPipeline();

/**
 * Kick off the MEGA folder pre-warm without blocking app startup.
 * Safe no-op outside the browser (e.g. build-time tooling).
 */
export function prewarmMegaAssets(): void {
  if (typeof window === 'undefined') return;
  megaPipeline.prewarm().catch((err: unknown) => {
    console.warn('[Asset Pipeline] Background MEGA pre-warm failed (will retry on demand).', err);
  });
}