import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api/authApi';
import { UserResponse, UserRole } from '../types/api';
import { MOCK_USERS } from '../mocks/fixtures';

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: {
    username: string;
    email: string;
    password: string;
    full_name: string;
    role?: string;
  }) => Promise<void>;
  switchUserRole: (role: UserRole) => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('datasentinel_token'));
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize or restore session
  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem('datasentinel_token');
      if (!savedToken) {
        // Pre-populate with a default authenticated session so user can explore right away
        const defaultUser = MOCK_USERS.admin;
        const defaultToken = `mock-jwt-token-admin-${Date.now()}`;
        localStorage.setItem('datasentinel_token', defaultToken);
        setToken(defaultToken);
        setUser(defaultUser);
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await authApi.getMe();
        setUser(data);
      } catch {
        // Fallback to role inferred from token
        if (savedToken.includes('admin')) {
          setUser(MOCK_USERS.admin);
        } else if (savedToken.includes('analyst')) {
          setUser(MOCK_USERS.analyst);
        } else {
          setUser(MOCK_USERS.data_engineer);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await authApi.login({ username, password });
      localStorage.setItem('datasentinel_token', data.access_token);
      setToken(data.access_token);
      if (data.user) {
        setUser(data.user);
      } else {
        const meRes = await authApi.getMe();
        setUser(meRes.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    username: string;
    email: string;
    password: string;
    full_name: string;
    role?: string;
  }) => {
    setIsLoading(true);
    try {
      await authApi.register(data);
      // Auto-login after registration
      await login(data.username, data.password);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('datasentinel_token');
    setToken(null);
    setUser(null);
  };

  const switchUserRole = (role: UserRole) => {
    const targetUser = MOCK_USERS[role] || {
      id: `usr-${role}-001`,
      username: `${role}_user`,
      email: `${role}@datasentinel.io`,
      full_name: `${role.toUpperCase()} User`,
      role,
      is_active: true,
    };
    const newToken = `mock-jwt-token-${role}-${Date.now()}`;
    localStorage.setItem('datasentinel_token', newToken);
    setToken(newToken);
    setUser(targetUser);
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const isAdmin = user?.role === 'admin';
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        logout,
        register,
        switchUserRole,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
