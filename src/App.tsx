
import React, { createContext, useContext, useState, useEffect, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StorageService } from './services/storage';
import { User, Role, AuthState } from './types';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/Loading';
import { ToastProvider, useToast } from './components/Toast';

// Lazy Load Pages for Performance
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

const AuthContext = createContext<AuthState | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- HARDCODED CREDENTIALS (IMMUTABLE) ---
const ADMIN_CRED = {
    id: 'adminsakato',
    pass: 'sahabatsakato',
    data: {
        id: 'adminsakato',
        name: 'Administrator SAKATO',
        nia: 'ADMIN-001',
        role: Role.SUPER_ADMIN,
        division: 'HQ',
        phone: '08123456789',
        email: 'admin@sakato.local',
        isActive: true,
        trustScore: 100,
        totalPoints: 0,
        password: 'sahabatsakato' // Stored plain text for consistency
    } as User
};

const MEMBER_CRED = {
    id: 'sakato',
    pass: 'sakato123',
    data: {
        id: 'sakato',
        name: 'Anggota Sakato',
        nia: 'MEMBER-001',
        role: Role.ANGGOTA,
        division: 'Umum',
        phone: '08123456780',
        email: 'member@sakato.local',
        isActive: true,
        trustScore: 100,
        totalPoints: 0,
        password: 'sakato123'
    } as User
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[App] Mounting & Initializing...");
    
    const nativeSplash = document.getElementById('native-splash');
    
    // SAFETY: Failsafe timer to force stop loading if DB/Network hangs > 8 seconds
    const safetyTimer = setTimeout(() => {
        if (loading) {
            console.warn("[App] Initialization took too long. Forcing UI render.");
            setLoading(false);
            if (nativeSplash) nativeSplash.remove();
        }
    }, 8000);

    const init = async () => {
      try {
          await new Promise(r => setTimeout(r, 500)); // Small delay for animation
          await StorageService.init();
          console.log("[App] Storage initialized");
          
          // Check localStorage for persisted session
          const sessionJson = localStorage.getItem('sakato_login_user');
          if (sessionJson) {
              try {
                  const sessionUser = JSON.parse(sessionJson);
                  setUser(sessionUser);
                  console.log("[App] Session restored for:", sessionUser.name);
              } catch (e) {
                  console.warn("[App] Invalid session data, clearing.");
                  localStorage.removeItem('sakato_login_user');
              }
          }
      } catch (e: any) {
          console.error("[App] Initialization Fatal Error:", e);
          setInitError(e.message || "Gagal memuat aplikasi.");
      } finally {
          console.log("[App] Loading finished");
          setLoading(false);
          clearTimeout(safetyTimer);
          if (nativeSplash) {
              nativeSplash.style.opacity = '0';
              setTimeout(() => nativeSplash.remove(), 500);
          }
      }
    };
    init();
  }, []);

  const login = async (inputUser: string, inputPass: string): Promise<void> => {
      try {
          let targetUser: User | null = null;

          // 1. CHECK HARDCODED CREDENTIALS FIRST (FAILSAFE)
          if (inputUser === ADMIN_CRED.id && inputPass === ADMIN_CRED.pass) {
              targetUser = ADMIN_CRED.data;
          } else if (inputUser === MEMBER_CRED.id && inputPass === MEMBER_CRED.pass) {
              targetUser = MEMBER_CRED.data;
          }

          // 2. IF NOT HARDCODED, CHECK DATABASE
          if (!targetUser) {
              const dbUsers = await StorageService.getUsers();
              const found = dbUsers.find(u => 
                  (u.id === inputUser || u.nia === inputUser) && !u.deleted
              );
              // SIMPLE STRING COMPARISON
              if (found && found.password === inputPass && found.isActive) {
                  targetUser = found;
              }
          }

          // 3. FINALIZE LOGIN
          if (targetUser) {
              setUser(targetUser);
              
              // Persist session simply
              localStorage.setItem('sakato_login_user', JSON.stringify(targetUser));
              
              StorageService.logAudit(targetUser, 'LOGIN', 'User logged in successfully');
              return;
          }

      } catch (e) { console.error("Login Error:", e); }
      
      throw new Error("ID atau Password salah.");
  };

  const logout = async (): Promise<void> => {
      if (user) await StorageService.logAudit(user, 'LOGOUT', 'User logged out');
      setUser(null);
      localStorage.removeItem('sakato_login_user');
  };

  if (loading) return <LoadingSpinner fullScreen />;

  // Display Critical Error if Init Failed
  if (initError) {
      return (
          <div className="flex items-center justify-center h-screen flex-col p-8 text-center bg-red-50">
              <h1 className="text-2xl font-bold text-red-600 mb-2">Gagal Memuat Aplikasi</h1>
              <p className="text-red-800 mb-4">{initError}</p>
              <p className="text-xs text-slate-500 mb-6 font-mono">Check console for details (F12)</p>
              <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded-lg">Muat Ulang</button>
          </div>
      );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode, roles?: Role[] }> = ({ children, roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullScreen />;

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
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
      </AuthProvider>
    </ToastProvider>
  );
}
