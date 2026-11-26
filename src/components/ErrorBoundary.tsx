import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { clearAppStorage, exportRawStorage } from "../utils/storage";

interface State {
  error: Error | null;
  confirmReset: boolean;
}

/** Last line of defence: shows a recovery screen instead of a blank page. */
class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, confirmReset: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  private reset = () => {
    if (!this.state.confirmReset) {
      this.setState({ confirmReset: true });
      return;
    }
    clearAppStorage();
    window.location.reload();
  };

  render() {
    const { error, confirmReset } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="min-h-screen bg-[#0a0a0b] text-zinc-200 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h1 className="text-lg font-semibold text-zinc-100">
            Something went wrong
          </h1>
          <p className="text-sm text-zinc-400">
            The app hit an unexpected error. Your data is still saved in this
            browser. Try reloading first; if the problem persists, download a
            copy of your data before resetting.
          </p>
          <pre className="text-xs text-rose-300 bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-auto max-h-32 whitespace-pre-wrap">
            {error.message}
          </pre>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 rounded-xl text-sm font-semibold"
            >
              Reload
            </button>
            <button
              onClick={exportRawStorage}
              className="px-4 py-2 border border-zinc-700 rounded-xl text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Download my data
            </button>
            <button
              onClick={this.reset}
              className="px-4 py-2 border border-rose-500/40 rounded-xl text-sm font-medium text-rose-300 hover:bg-rose-500/10"
            >
              {confirmReset ? "Click again to erase all data" : "Reset app"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
