/**
 * Public APK download catalogue.
 *
 * Resolves the shared MEGA APK folder into direct "folder + file" links so the
 * Downloads page can send a visitor straight to one APK instead of the folder
 * listing. Every card falls back to the plain folder URL, so the page still
 * works when MEGA is unreachable or a build has not been uploaded yet.
 */
import { } from 'megajs';

/** Public MEGA container holding the five shipped APK builds. */
export const MEGA_APK_FOLDER_URL =
  'https://mega.nz/folder/JVMCARZI#bGLOV-MhLopW-EBZNVG41Q';

export type ApkKind = 'offline' | 'online';

export type ApkStatus = 'ready' | 'missing' | 'pending';

export interface ApkBuild {
  /** Unique substring matched against the file name inside the MEGA folder. */
  match: string;
  /** File name shown to the visitor when it cannot be resolved. */
  filename: string;
  title: string;
  kind: ApkKind;
  grade: string;
  description: string;
  points: string[];
}

export interface ResolvedApk extends ApkBuild {
  url: string;
  size: number | null;
  status: ApkStatus;
}

export const APK_BUILDS: ApkBuild[] = [
  {
    match: 'offline-g9',
    filename: 'MenenOSHS-offline-G9-debug.apk',
    title: 'Offline Grade 9',
    kind: 'offline',
    grade: 'G9',
    description:
      'Complete Grade 9 notes and quizzes bundled into the app. Study with no connection after the one-time install.',
    points: ['Works 100% offline', 'All Grade 9 subjects', 'No data needed while studying'],
  },
  {
    match: 'offline-g10',
    filename: 'MenenOSHS-offline-G10-debug.apk',
    title: 'Offline Grade 10',
    kind: 'offline',
    grade: 'G10',
    description:
      'Complete Grade 10 notes and quizzes bundled into the app. Study with no connection after the one-time install.',
    points: ['Works 100% offline', 'All Grade 10 subjects', 'No data needed while studying'],
  },
  {
    match: 'offline-g11',
    filename: 'MenenOSHS-offline-G11-debug.apk',
    title: 'Offline Grade 11',
    kind: 'offline',
    grade: 'G11',
    description:
      'Complete Grade 11 notes and quizzes bundled into the app. Study with no connection after the one-time install.',
    points: ['Works 100% offline', 'All Grade 11 subjects', 'No data needed while studying'],
  },
  {
    match: 'offline-g12',
    filename: 'MenenOSHS-offline-G12-debug.apk',
    title: 'Offline Grade 12',
    kind: 'offline',
    grade: 'G12',
    description:
      'Complete Grade 12 notes and quizzes bundled into the app, including ESLCE past papers. Study offline after install.',
    points: ['Works 100% offline', 'All Grade 12 subjects', 'Includes ESLCE past papers'],
  },
  {
    match: 'online',
    filename: 'MenenOSHS-online-debug.apk',
    title: 'Online App',
    kind: 'online',
    grade: 'Any',
    description:
      'The full Android app for every grade. Content streams from the server, so it stays current and needs an internet connection.',
    points: ['All grades in one app', 'Always up to date', 'Syncs progress to your account'],
  },
];

export const formatSize = (bytes: number | null): string => {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`;
};

/** Builds MEGA's public "file inside a shared folder" deep link. */
function buildFileLink(folderUrl: string, downloadId: unknown): string | null {
  try {
    const url = new URL(folderUrl);
    const folderId = url.pathname.split('/').filter(Boolean).pop();
    const folderKey = url.hash.replace(/^#/, '');
    const parts = Array.isArray(downloadId)
      ? downloadId.map(String)
      : String(downloadId ?? '').split(',');
    const fileId = parts.filter(Boolean).pop();
    if (!folderId || !folderKey || !fileId) return null;
    return `${url.origin}/folder/${folderId}#${folderKey}/file/${fileId}`;
  } catch {
    return null;
  }
}

function fallbackBuilds(): ResolvedApk[] {
  return APK_BUILDS.map((build) => ({
    ...build,
    url: MEGA_APK_FOLDER_URL,
    size: null,
    status: 'pending' as ApkStatus,
  }));
}

/** Structural shape of a megajs node — kept local so no `any` escapes. */
interface MegaNode {
  name?: string;
  size?: number;
  directory?: boolean;
  downloadId?: string | string[];
  children?: MegaNode[];
  loadAttributes?: () => Promise<void>;
  download?: (options?: Record<string, unknown>) => AsyncIterable<Uint8Array<ArrayBuffer>>;
}

interface MegaEngine {
  fromURL: (url: string) => MegaNode;
}

/**
 * The resolved megajs nodes, keyed by build. Kept so a download can stream
 * straight from MEGA without exposing the folder to the visitor.
 */
let nodeCache: Map<string, MegaNode> | null = null;

async function resolveApkLinks(): Promise<ResolvedApk[]> {
  const results = new Map<string, ResolvedApk>();
  APK_BUILDS.forEach((build) => {
    results.set(build.match, { ...build, url: MEGA_APK_FOLDER_URL, size: null, status: 'pending' });
  });

  try {
    const megaModule = (await import('megajs')) as unknown as { File?: MegaEngine } | undefined;
    const FileEngine = megaModule?.File ?? (megaModule as { default?: { File?: MegaEngine } } | undefined)?.default?.File;
    if (!FileEngine) return fallbackBuilds();

    const folder = FileEngine.fromURL(MEGA_APK_FOLDER_URL);
    await folder.loadAttributes?.();

    const files: MegaNode[] = [];
    const walk = (node: MegaNode) => {
      for (const child of node.children || []) {
        if (child.directory) walk(child);
        else files.push(child);
      }
    };
    walk(folder);

    const nodes = new Map<string, MegaNode>();

    // The folder itself resolved, so anything still unmatched is simply not
    // uploaded yet rather than a lookup failure.
    for (const build of APK_BUILDS) {
      const match = files.find((f) =>
        String(f?.name ?? '').toLowerCase().includes(build.match)
      );
      const link = match ? buildFileLink(MEGA_APK_FOLDER_URL, match.downloadId) : null;
      if (match) nodes.set(build.match, match);
      results.set(build.match, {
        ...build,
        url: link ?? MEGA_APK_FOLDER_URL,
        size: match && typeof match.size === 'number' ? match.size : null,
        status: link ? 'ready' : 'missing',
      });
    }

    nodeCache = nodes;
  } catch {
    return fallbackBuilds();
  }

  return APK_BUILDS.map((build) => results.get(build.match)!);
}

let cached: Promise<ResolvedApk[]> | null = null;

/** Cached so revisiting the Downloads page never re-hits MEGA. */
export function getApkLinks(): Promise<ResolvedApk[]> {
  if (!cached) cached = resolveApkLinks();
  return cached;
}

/* ------------------------------------------------------------------ *
 * In-page download
 *
 * A MEGA link cannot be handed to the browser as a plain file: the bytes
 * on MEGA's servers are ciphertext (verified: they start 0e94fe07..., not
 * "PK"). Decryption has to happen client-side, so we do it here rather
 * than sending the visitor to mega.nz. Consequence: the visitor never
 * sees, or can browse, the source folder.
 * ------------------------------------------------------------------ */

const APK_MIME = 'application/vnd.android.package-archive';

export interface ApkDownloadProgress {
  received: number;
  total: number;
  percent: number;
}

/** File System Access API bits, typed locally to avoid `any`. */
interface WritableFileStream {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
}
interface SavedFileHandle {
  createWritable(): Promise<WritableFileStream>;
}
type SaveFilePicker = (options: {
  suggestedName?: string;
  types?: Array<{ description: string; accept: Record<string, string[]> }>;
}) => Promise<SavedFileHandle>;

/**
 * Stream the build out of MEGA, decrypting it in the browser, and save it.
 *
 * Uses the File System Access API to write straight to disk where available
 * (desktop Chromium). Elsewhere — including Android, which lacks the picker —
 * the decrypted bytes are buffered and handed to the browser as a blob, which
 * lands in the normal Downloads flow.
 */
export async function downloadApk(
  match: string,
  onProgress?: (progress: ApkDownloadProgress) => void
): Promise<void> {
  await getApkLinks();

  if (!nodeCache) {
    throw new Error('Could not reach the download server. Check your connection and try again.');
  }
  const node = nodeCache.get(match);
  if (!node?.download) {
    throw new Error('That build is not available for download yet.');
  }

  const build = APK_BUILDS.find((b) => b.match === match);
  const filename = build?.filename ?? 'menen.apk';
  const total = typeof node.size === 'number' ? node.size : 0;
  const report = (received: number) =>
    onProgress?.({
      received,
      total,
      percent: total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0,
    });

  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;

  if (typeof picker === 'function') {
    const handle = await picker({
      suggestedName: filename,
      types: [{ description: 'Android app package', accept: { [APK_MIME]: ['.apk'] } }],
    });
    const writable = await handle.createWritable();
    let received = 0;
    report(0);
    try {
      for await (const chunk of node.download()) {
        await writable.write(chunk);
        received += chunk.length;
        report(received);
      }
    } finally {
      await writable.close();
    }
    return;
  }

  const parts: BlobPart[] = [];
  let received = 0;
  report(0);
  for await (const chunk of node.download()) {
    parts.push(chunk);
    received += chunk.length;
    report(received);
  }
  const blob = new Blob(parts, { type: APK_MIME });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
