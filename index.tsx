import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// SECURITY: Prevent Context Menu & DevTools shortcuts
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S')) {
    e.preventDefault();
  }
});

// SERVICE WORKER LOGIC (FIXED)
if ('serviceWorker' in navigator) {
  // Hanya register jika BUKAN di AI Studio preview dan protocol adalah https atau localhost
  const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  const isPreview = window.location.hostname.includes('ai.studio') || window.location.hostname.includes('googleusercontent');

  if (isSecure && !isPreview) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SAKATO Service Worker: Active', reg.scope))
        .catch(err => console.error('SAKATO Service Worker: Failed', err));
    });
  } else {
    console.log('SAKATO SW: Skipped (Dev/Preview Mode)');
  }
}

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  // Fix TS error: Property 'props' does not exist on type 'ErrorBoundary'
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Aplikasi Terhenti</h1>
            <p className="text-gray-500 mb-6 text-sm">Terjadi kesalahan sistem. Data Anda aman.</p>
            <button 
              onClick={() => {
                localStorage.clear(); 
                window.location.reload();
              }} 
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition shadow-lg"
            >
              Reset & Muat Ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);