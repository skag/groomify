import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/services/authService';
import type { LoginResponse } from '@/types/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: LoginResponse | null;
  isLoading: boolean;
  login: (userData: LoginResponse) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = (): boolean => {
    const token = authService.getToken();
    if (token) {
      setIsAuthenticated(true);
      return true;
    }
    setIsAuthenticated(false);
    setUser(null);
    return false;
  };

  useEffect(() => {
    // Check authentication on mount
    checkAuth();
    setIsLoading(false);
  }, []);

  const login = (userData: LoginResponse) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
