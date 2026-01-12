
import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider, useAuth } from './contexts/AuthContext'; // Switch to Supabase Context
import { Role } from './types';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/Loading';
import { ToastProvider } from './components/Toast';
import { StorageService } from './services/storage';

// Re-export useAuth to prevent breaking changes in other files importing from '../App'
export { useAuth };

// Lazy Load Pages
const Login = React.lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Attendance = React.lazy(() => import('./pages/Attendance').then(module => ({ default: module.Attendance })));
const Events = React.lazy(() => import('./pages/Events').then(module => ({ default: module.Events })));
const Members = React.lazy(() => import('./pages/Members').then(module => ({ default: module.Members })));
const Reports = React.lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));
const Settings = React.lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Permissions = React.lazy(() => import('./pages/Permissions').then(module => ({ default: module.Permissions })));
const Rewards = React.lazy(() => import('./pages/Rewards').then(module => ({ default: module.Rewards })));
const AuditLogs = React.lazy(() => import('./pages/AuditLogs').then(module => ({ default: module.AuditLogs })));
const RecycleBin = React.lazy(() => import('./pages/RecycleBin').then(module => ({ default: module.RecycleBin })));
const Analytics = React.lazy(() => import('./pages/Analytics').then(module => ({ default: module.Analytics })));
const Agendas = React.lazy(() => import('./pages/Agendas').then(module => ({ default: module.Agendas })));
const NotFound = React.lazy(() => import('./pages/NotFound').then(module => ({ default: module.NotFound })));

const ProtectedRoute: React.FC<{ children: React.ReactNode, roles?: Role[] }> = ({ children, roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullScreen />;
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />; // Unauthorized
  }

  return <>{children}</>;
};

const InitWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Run Storage Init Once on Mount to hydration from Supabase
    React.useEffect(() => {
        const nativeSplash = document.getElementById('native-splash');
        
        StorageService.init().then(() => {
            if (nativeSplash) {
                nativeSplash.style.opacity = '0';
                setTimeout(() => nativeSplash.remove(), 500);
            }
        });
    }, []);

    return <>{children}</>;
};

export default function App() {
  return (
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <InitWrapper>
            <HashRouter>
                <Suspense fallback={<LoadingSpinner fullScreen />}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    
                    <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
                    <Route path="/attendance" element={<ProtectedRoute><Layout><Attendance /></Layout></ProtectedRoute>} />
                    <Route path="/events" element={<ProtectedRoute roles={[Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS]}><Layout><Events /></Layout></ProtectedRoute>} />
                    <Route path="/agendas" element={<ProtectedRoute roles={[Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS]}><Layout><Agendas /></Layout></ProtectedRoute>} />
                    <Route path="/members" element={<ProtectedRoute roles={[Role.SUPER_ADMIN, Role.ADMIN]}><Layout><Members /></Layout></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
                    <Route path="/permissions" element={<ProtectedRoute><Layout><Permissions /></Layout></ProtectedRoute>} />
                    <Route path="/rewards" element={<ProtectedRoute><Layout><Rewards /></Layout></ProtectedRoute>} />
                    <Route path="/analytics" element={<ProtectedRoute roles={[Role.SUPER_ADMIN, Role.ADMIN, Role.PENGURUS, Role.ANGGOTA]}><Layout><Analytics /></Layout></ProtectedRoute>} />
                    
                    <Route path="/audit-logs" element={<ProtectedRoute roles={[Role.SUPER_ADMIN, Role.ADMIN]}><Layout><AuditLogs /></Layout></ProtectedRoute>} />
                    <Route path="/recycle-bin" element={<ProtectedRoute roles={[Role.SUPER_ADMIN, Role.ADMIN]}><Layout><RecycleBin /></Layout></ProtectedRoute>} />

                    <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
            </HashRouter>
          </InitWrapper>
        </AuthProvider>
      </QueryClientProvider>
    </ToastProvider>
  );
}
