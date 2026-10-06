import React, { useState, useEffect } from 'react';
import { initMenenDatabase } from './db';
import { initLicense } from './licensing';
import { AndroidShell } from './AndroidShell';

/**
 * The offline APK ships all content in the app bundle, so a leftover PWA
 * service worker from an older install is pure liability: it caches a stale
 * index.html/assets and can leave the app on a white screen. Forcefully remove
 * every registered service worker and CacheStorage entry at boot.
 */
async function purgeServiceWorkers(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(r => r.unregister()));
  } catch {
    // ignore — no SW or not accessible
  }
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k).catch(() => undefined)));
    }
  } catch {
    // ignore — caches unavailable (not a secure context / no SW)
  }
}

export const OfflineAppRoot: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    purgeServiceWorkers()
      .then(() => initMenenDatabase())
      .then(initLicense)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans select-none">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-xl font-black">
          !
        </div>
        <h1 className="mt-3 text-sm font-bold text-white">Database initialization failed</h1>
        <p className="mt-1 text-xs text-slate-400 text-center max-w-sm break-words">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3 font-sans select-none">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shadow-md shadow-emerald-600/20">
          M
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        <p className="text-xs text-slate-400">Preparing offline database...</p>
      </div>
    );
  }

  return <AndroidShell />;
};

export default OfflineAppRoot;