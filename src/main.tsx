import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { bindGameViewport } from './lib/viewport';

const unbindViewport = bindGameViewport(window, document.documentElement);
if (import.meta.hot) import.meta.hot.dispose(unbindViewport);

const root = createRoot(document.getElementById('root')!);
const isAuthCallback = new URLSearchParams(window.location.search).has('code') || /access_token=|error_description=/.test(window.location.hash);
const useMobilePreview = import.meta.env.DEV && !isAuthCallback && window.self === window.top && window.innerWidth > 480;

if (useMobilePreview) {
  root.render(
    <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09080d' }}>
      <iframe
        title="Game - xem thử trên điện thoại"
        src={window.location.href}
        allow="microphone; autoplay"
        style={{ width: 'min(390px, 100vw)', height: 'min(844px, 100dvh)', border: '1px solid #594329', borderRadius: 16, overflow: 'hidden' }}
      />
    </div>
  );
} else {
  root.render(<App />);
}
