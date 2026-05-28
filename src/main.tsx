// src/main.tsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { GlobalErrorGuard } from '@/components/ui/GlobalErrorGuard'; // ✅ Import

// Mobile Height Fix for 100dvh
const setAppHeight = () => {
  const doc = document.documentElement;
  doc.style.setProperty('--app-height', `${window.innerHeight}px`);
};
window.addEventListener('resize', setAppHeight);
setAppHeight();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* ✅ ครอบด้วย Guard เพื่อป้องกัน App ตาย */}
    <GlobalErrorGuard>
      <App />
    </GlobalErrorGuard>
  </StrictMode>
);