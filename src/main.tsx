import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import { initializeNativePlugins } from './utils/capacitor';
import { prewarmMegaAssets } from './services/megaPipeline';
import { defineCustomElements as defineJeepSqlite } from 'jeep-sqlite/loader';
import { ErrorBoundary } from './offline/ErrorBoundary';
import './index.css';

// Boot-stage marker for the index.html startup harness. Note this runs AFTER all
// imports above have been evaluated (ESM hoists imports), so:
//   'html-parsed'        -> the bundle never executed, or an import threw
//   'main-tsx-running'   -> main.tsx body ran; failure is inside React rendering
(window as unknown as { __BOOT?: string }).__BOOT = 'main-tsx-running';

// Register jeep-sqlite custom elements on web so the offline DB init can proceed.
defineJeepSqlite(window);

initializeNativePlugins();
prewarmMegaAssets();

// Honest liveness signal for the index.html startup harness. It must be set from
// inside the committed React tree, NOT derived from #root contents: prerender.mjs
// injects static landing HTML into #root for SEO, so #root is non-empty even when
// the bundle never boots — which is what silently produced the white screen.
function MarkMounted(): null {
  React.useEffect(() => {
    (window as unknown as { __APP_MOUNTED?: boolean }).__APP_MOUNTED = true;
  }, []);
  return null;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
    <MarkMounted />
    </ErrorBoundary>
  </React.StrictMode>
);