import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SessionProvider } from './hooks/useSession';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import RecordEditorPage from './pages/RecordEditorPage';
import SettingsPage from './pages/SettingsPage';
import SharedRecordPage from './pages/SharedRecordPage';

export default function App() {
  return <BrowserRouter>
    <SessionProvider>
      <Toaster position="top-right" closeButton richColors toastOptions={{ className: 'font-sans' }} />
      <Routes>
        <Route path="/shared/:token" element={<SharedRecordPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage key="login" initialMode="login" />} />
        <Route path="/register" element={<AuthPage key="register" initialMode="register" />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/records/edit" element={<RecordEditorPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionProvider>
  </BrowserRouter>;
}
