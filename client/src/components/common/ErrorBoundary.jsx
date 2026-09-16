import React, { Component } from 'react';
import Button from './Button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-[500px] flex items-center justify-center p-6 bg-gray-50 dark:bg-slate-950"
        >
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-slate-800 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle size={32} />
            </div>

            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2">
              Something went wrong
            </h2>

            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              We encountered an unexpected issue while rendering this section. Your order and account data remain secure.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/30 rounded-xl text-left border border-red-200 dark:border-red-900/50 overflow-x-auto max-h-32">
                <p className="text-[11px] font-mono text-red-800 dark:text-red-300 font-bold">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                size="md"
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> Reload Page
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="flex items-center justify-center gap-2"
              >
                <Home size={16} /> Back to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
