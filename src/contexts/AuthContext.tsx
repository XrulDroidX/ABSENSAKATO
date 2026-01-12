
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
    let mounted = true;

    // Safety Timeout: Force loading false if Supabase hangs > 5s
    const safetyTimer = setTimeout(() => {
        if (mounted && loading) {
            console.warn("[Auth] Session check timed out. Forcing UI render.");
            setLoading(false);
        }
    }, 5000);

    // Check active session
    const checkSession = async () => {
      try {
        console.log("[Auth] Checking session...");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (data.session?.user) {
          console.log("[Auth] Session found for:", data.session.user.email);
          await loadProfile(data.session.user.id);
        } else {
          console.log("[Auth] No active session.");
          if (mounted) setLoading(false);
        }
      } catch (err) {
        console.error("[Auth] Session Check CRITICAL ERROR:", err);
        // CRITICAL FIX: Ensure loading is set to false even on error so app doesn't hang
        if (mounted) setLoading(false);
      } finally {
        clearTimeout(safetyTimer);
      }
    };
    
    checkSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] Event: ${event}`);
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true);
        await loadProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        // Handle initial session explicitly if needed, mostly covered by checkSession
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (uid: string) => {
    try {
      console.log("[Auth] Fetching profile for:", uid);
      const profile = await ApiService.getProfile(uid);
      const deviceId = getDeviceId();

      // DEVICE LOCK CHECK
      if (profile.device_id && profile.device_id !== deviceId) {
        console.warn("[Auth] Device mismatch. Logging out.");
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
      console.error("[Auth] Profile load failed:", error);
      // Don't leave user in limbo - sign out if profile fails to ensure clean state
      // await supabase.auth.signOut(); 
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
