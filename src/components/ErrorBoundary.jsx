import React from 'react';

/**
 * Flaw fix F3: top-level error boundary. Any uncaught render error now
 * shows a friendly recovery screen instead of a blank white page.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    // Surface for debugging; no external reporting service is used.
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    try {
      localStorage.removeItem('vintage_watchlist'); // most likely corrupted-data culprit (F2)
      localStorage.removeItem('vintage_progress');
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary-screen" role="alert">
          <h1 className="error-boundary-title">Something glitched the TV 📺</h1>
          <p className="error-boundary-text">
            An unexpected error occurred while rendering the app. Your data (watchlist and
            progress) lives in this browser, so nothing was lost — try reloading.
          </p>
          <p className="error-boundary-detail">{String(this.state.error?.message || this.state.error)}</p>
          <button className="error-boundary-reload" onClick={this.handleReload}>
            Clear data & reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
