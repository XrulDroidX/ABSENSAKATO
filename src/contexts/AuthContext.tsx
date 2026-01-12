
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Role } from '../types';
import { ApiService } from '../services/api';
import { LoadingSpinner } from '../components/Loading';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate or retrieve a persistent device ID for this browser
  const getDeviceId = () => {
    let id = localStorage.getItem('sakato_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('sakato_device_id', id);
    }
    return id;
  };

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    };
    
    checkSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const loadProfile = async (uid: string) => {
    try {
      const profile = await ApiService.getProfile(uid);
      const deviceId = getDeviceId();

      // DEVICE LOCK CHECK
      if (profile.device_id && profile.device_id !== deviceId) {
        // If DB has a device ID and it's different from current, force logout
        alert("Akun Anda sedang digunakan di perangkat lain. Anda telah dikeluarkan.");
        await supabase.auth.signOut();
        return;
      }

      // If no device ID (first login) or match, ensure it's set
      if (!profile.device_id) {
        await ApiService.updateDeviceLock(uid, deviceId);
      }

      // Transform to User type
      setUser({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as Role,
        division: profile.division,
        deviceId: deviceId,
        trustScore: profile.trust_score,
        isActive: profile.is_active,
        phone: profile.phone || '',
        totalPoints: profile.total_points
      });
    } catch (error) {
      console.error("Profile load failed", error);
      // Fallback or force logout
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
