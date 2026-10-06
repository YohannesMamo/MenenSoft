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
}

interface MegaEngine {
  fromURL: (url: string) => MegaNode;
}

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

    // The folder itself resolved, so anything still unmatched is simply not
    // uploaded yet rather than a lookup failure.
    for (const build of APK_BUILDS) {
      const match = files.find((f) =>
        String(f?.name ?? '').toLowerCase().includes(build.match)
      );
      const link = match ? buildFileLink(MEGA_APK_FOLDER_URL, match.downloadId) : null;
      results.set(build.match, {
        ...build,
        url: link ?? MEGA_APK_FOLDER_URL,
        size: match && typeof match.size === 'number' ? match.size : null,
        status: link ? 'ready' : 'missing',
      });
    }
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
