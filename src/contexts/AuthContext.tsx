import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authAPI } from '@/services/api';
import { jwtDecode } from 'jwt-decode';

import { useNavigate } from 'react-router-dom';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'superadmin' | 'tenant' | 'staff';
  avatar: string;
  tenantId?: number;
  tenantName?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface DecodedToken {
  exp: number;
  iat: number;
  id: number;
  email: string;
  role: string;
  tenant_id?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutTimer = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const scheduleAutoLogout = (expiryTime: number) => {
    const now = Date.now();
    const timeout = expiryTime - now;

    if (logoutTimer.current) clearTimeout(logoutTimer.current);

    if (timeout > 0) {
      logoutTimer.current = setTimeout(() => {
        logout(true);
      }, timeout);
    } else {
      logout(true);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    
    if (response.success) {
      const token = response.token;
      const userData = response.user;

      // Decode token to extract expiry time
      const decoded = jwtDecode<DecodedToken>(token);
      const expiryTime = decoded.exp * 1000; // convert seconds → ms

      localStorage.setItem('auth_token', token);
      localStorage.setItem('token_expiry', expiryTime.toString());
      localStorage.setItem('user_data', JSON.stringify(userData));

      setUser(userData);
      scheduleAutoLogout(expiryTime);
    }
  };

  const logout = async (auto = false) => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore if logout API fails (like session already invalidated)
    }

    localStorage.removeItem('auth_token');
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('user_data');
    setUser(null);

    if (logoutTimer.current) clearTimeout(logoutTimer.current);

    if (auto) {
      alert('⚠️ Session expired. Please log in again.');
    }

    navigate('/login');
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    const expiry = localStorage.getItem('token_expiry');

    if (token && userData && expiry) {
      const now = Date.now();
      if (now < Number(expiry)) {
        setUser(JSON.parse(userData));
        scheduleAutoLogout(Number(expiry));
      } else {
        logout(true);
      }
    }
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
