import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, User, setTokens, clearTokens } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, turnstileToken: string) => Promise<void>;
  register: (username: string, password: string, turnstileToken: string, email?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      authApi.me().then(setUser).catch(() => clearTokens()).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string, turnstileToken: string) => {
    const res = await authApi.login({ username, password, turnstileToken });
    setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
  };

  const register = async (username: string, password: string, turnstileToken: string, email?: string) => {
    const res = await authApi.register({ username, password, turnstileToken, email });
    setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
