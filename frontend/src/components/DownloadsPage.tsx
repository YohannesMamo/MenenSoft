// DownloadsPage.tsx - Public APK download facility (no sign-in required)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, CheckCircle2, Download, HardDrive, Globe, ShieldCheck,
  Smartphone, WifiOff, X, PackageOpen, Loader2,
} from 'lucide-react';
import { APK_BUILDS, MEGA_APK_FOLDER_URL, formatSize, getApkLinks, downloadApk } from '../services/apkDownloads';
import type { ResolvedApk } from '../services/apkDownloads';

const BRAND = '#2563eb';

type DownloadState = 'idle' | 'downloading' | 'done' | 'error';

interface DownloadStatus {
  state: DownloadState;
  percent: number;
  message?: string;
}

export default function DownloadsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [apks, setApks] = useState<ResolvedApk[]>(() =>
    APK_BUILDS.map((b) => ({ ...b, url: MEGA_APK_FOLDER_URL, size: null, status: 'pending' as const }))
  );

  useEffect(() => {
    let alive = true;
    getApkLinks().then((resolved) => { if (alive) setApks(resolved); });
    return () => { alive = false; };
  }, []);

  const [progress, setProgress] = useState<Record<string, DownloadStatus>>({});

  const startDownload = async (apk: ResolvedApk) => {
    if (progress[apk.match]?.state === 'downloading') return;
    const set = (status: DownloadStatus) =>
      setProgress((prev) => ({ ...prev, [apk.match]: status }));

    set({ state: 'downloading', percent: 0 });
    try {
      await downloadApk(apk.match, (p) => set({ state: 'downloading', percent: p.percent }));
      set({ state: 'done', percent: 100 });
    } catch (err) {
      set({
        state: 'error',
        percent: 0,
        message: err instanceof Error ? err.message : 'Download failed. Please try again.',
      });
    }
  };

  const renderAction = (apk: ResolvedApk) => {
    if (apk.status === 'missing') {
      return (
        <span className="inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-gray-400 bg-gray-100 cursor-not-allowed">
          <PackageOpen className="h-4 w-4" /> Coming soon
        </span>
      );
    }

    const status = progress[apk.match];

    if (status?.state === 'downloading') {
      return (
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-2">
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading…
            </span>
            <span>{status.percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(status.percent, 2)}%`, backgroundColor: BRAND }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">Keep this page open until it finishes.</p>
        </div>
      );
    }

    const label = apk.kind === 'online' ? 'Download App' : `Download Grade ${apk.grade.replace('G', '')}`;

    return (
      <>
        <button
          onClick={() => startDownload(apk)}
          className="inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white transition-shadow hover:shadow-md cursor-pointer"
          style={{ backgroundColor: status?.state === 'done' ? '#059669' : BRAND }}
        >
          {status?.state === 'done' ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {status?.state === 'done' ? 'Downloaded — tap to save again' : label}
        </button>
        {status?.state === 'error' && (
          <p className="mt-2 text-xs text-red-600">{status.message}</p>
        )}
      </>
    );
  };

  const offline = apks.filter((a) => a.kind === 'offline');
  const online = apks.filter((a) => a.kind === 'online');

  const renderCard = (apk: ResolvedApk) => {
    const size = formatSize(apk.size);
    return (
      <div
        key={apk.match}
        className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span
              className="inline-block px-2.5 py-1 rounded-full text-xs font-bold tracking-wide"
              style={{
                backgroundColor: apk.kind === 'online' ? '#ECFDF5' : '#EEF2FF',
                color: apk.kind === 'online' ? '#047857' : BRAND,
              }}
            >
              {apk.grade}
            </span>
            <h3 className="mt-3 text-xl font-bold text-gray-900">{apk.title}</h3>
          </div>
          <span className="text-gray-300">
            {apk.kind === 'online' ? <Globe className="h-7 w-7" /> : <WifiOff className="h-7 w-7" />}
          </span>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed mb-4">{apk.description}</p>

        <ul className="space-y-2 mb-6">
          {apk.points.map((point) => (
            <li key={point} className="flex items-center gap-2 text-sm text-gray-700">
              <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: BRAND }} />
              {point}
            </li>
          ))}
        </ul>

        <div className="mt-auto">
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
            <HardDrive className="h-3.5 w-3.5" />
            {apk.status === 'pending' && 'Checking availability…'}
            {apk.status === 'ready' && `${apk.filename}${size ? ` · ${size}` : ''}`}
            {apk.status === 'missing' && 'Not uploaded yet'}
          </div>

          {renderAction(apk)}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <img src="/Menen Student assist Logo.png" alt="Menen logo" className="h-9 w-9 object-contain rounded-lg" />
              <span className="text-lg font-bold tracking-tight">Menen OSHS</span>
            </button>
            <div className="hidden md:flex items-center gap-7 text-sm">
              <button onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-900 transition-colors">Home</button>
              <button onClick={() => navigate('/about')} className="text-gray-600 hover:text-gray-900 transition-colors">About</button>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                  Dashboard
                </button>
              ) : (
                <>
                  <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
                    Log in
                  </button>
                  <button onClick={() => navigate('/register')} className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-shadow hover:shadow-md" style={{ backgroundColor: BRAND }}>
                    Sign up free
                  </button>
                </>
              )}
            </div>
            <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6 text-gray-700" /> : <><span className="sr-only">Menu</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></>}
            </button>
          </div>
          {isMenuOpen && (
            <div className="md:hidden pb-4 space-y-3 text-sm">
              <button onClick={() => navigate('/')} className="block text-gray-700 hover:text-gray-900">Home</button>
              <button onClick={() => navigate('/about')} className="block text-gray-700 hover:text-gray-900">About</button>
              <hr className="border-gray-100" />
              {user ? (
                <button onClick={() => navigate('/dashboard')} className="w-full text-left font-semibold text-gray-700">Dashboard</button>
              ) : (
                <>
                  <button onClick={() => navigate('/login')} className="block text-gray-700">Log in</button>
                  <button onClick={() => navigate('/register')} className="w-full py-2.5 text-white rounded-lg font-semibold" style={{ backgroundColor: BRAND }}>Sign up free</button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* ── Header ── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-8">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: '#EEF2FF', color: BRAND }}>
            <Smartphone className="h-4 w-4" /> Android downloads
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
          Download the <span style={{ color: BRAND }}>Menen OSHS</span> app
        </h1>
        <p className="max-w-2xl text-lg text-gray-600 leading-relaxed">
          Pick the build that fits you. Offline APKs carry your whole grade inside the file, so you
          can study without any connection. The online app streams content and stays up to date.
        </p>
      </section>

      {/* ── Offline grades ── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-6">
        <div className="flex items-center gap-2 mb-5">
          <WifiOff className="h-5 w-5" style={{ color: BRAND }} />
          <h2 className="text-lg font-bold">Offline — by grade</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {offline.map(renderCard)}
        </div>
      </section>

      {/* ── Online app ── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="h-5 w-5" style={{ color: BRAND }} />
          <h2 className="text-lg font-bold">Online — every grade</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{online.map(renderCard)}</div>
      </section>

      {/* ── Install help ── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="font-bold mb-3">How to install</h3>
              <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
                <li>Tap a Download button above — the transfer starts straight away.</li>
                <li>Keep this page open and wait for the progress bar to reach 100%.</li>
                <li>Open the downloaded .apk file from your notification or Files app.</li>
                <li>If Android blocks it, allow installs from your browser when prompted.</li>
              </ol>
            </div>
            <div>
              <h3 className="font-bold mb-3">Storage &amp; updates</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Offline builds are roughly 110–385&nbsp;MB, so use Wi-Fi where you can.</li>
                <li>Only install the APK for your own grade — offline builds do not share content.</li>
                <li>Updates are published as new builds; install over the old version to update.</li>
              </ul>
              <p className="mt-4 text-sm text-gray-500">
                Downloads run through your browser and finish right here — no extra apps or accounts needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <img src="/Menen Student assist Logo.png" alt="Menen logo" className="h-7 w-7 object-contain rounded" />
            <span>Menen OSHS — study companion</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/')} className="hover:text-gray-900 transition-colors">Home</button>
            <button onClick={() => navigate('/about')} className="hover:text-gray-900 transition-colors">About</button>
            <button onClick={() => navigate(user ? '/dashboard' : '/register')} className="hover:text-gray-900 transition-colors">
              {user ? 'Dashboard' : 'Get started'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
