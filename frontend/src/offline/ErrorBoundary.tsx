import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort boundary so an unexpected render/lifecycle crash paints a
 * readable message instead of React unmounting the whole tree (white screen).
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error('[app] React render crash', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans select-none">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-xl font-black">
            !
          </div>
          <h1 className="mt-3 text-sm font-bold text-white">Something went wrong</h1>
          <pre className="mt-3 max-w-full text-[11px] text-red-300 bg-red-950/40 border border-red-500/20 rounded-lg p-3 whitespace-pre-wrap break-words">
            {this.state.error.stack || this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;