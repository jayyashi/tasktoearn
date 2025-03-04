import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import MasterReport from './MasterReport.tsx';
import './index.css';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
        <Routes>
        <Route path="/" element={<App />} />
        <Route path="/master-report" element={<MasterReport />} />
        <Route path="/:memberId" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
