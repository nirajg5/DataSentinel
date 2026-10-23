import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api-client';

export type OperationMode = 'adaptive' | 'live_only' | 'mock_only';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  timestamp: number;
}

interface ConfigContextType {
  apiUrl: string;
  mode: OperationMode;
  setMode: (mode: OperationMode) => void;
  backendReachable: boolean | null;
  latencyMs: number | null;
  isChecking: boolean;
  checkConnectivity: () => Promise<boolean>;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<OperationMode>(() => {
    return (localStorage.getItem('datasentinel_mode') as OperationMode) || 'adaptive';
  });

  const [backendReachable, setBackendReachable] = useState<boolean | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { ...toast, id, timestamp: Date.now() };
    setToasts((prev) => [newToast, ...prev].slice(0, 5));

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setMode = (newMode: OperationMode) => {
    setModeState(newMode);
    localStorage.setItem('datasentinel_mode', newMode);
    addToast({
      type: 'info',
      title: 'Operational Mode Changed',
      message: `System operating in ${newMode.toUpperCase().replace('_', ' ')} mode.`,
    });
  };

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    const start = performance.now();
    try {
      // Test basic endpoint
      await axios.get(`${API_BASE_URL}/health`, { timeout: 3500 });
      const duration = Math.round(performance.now() - start);
      setBackendReachable(true);
      setLatencyMs(duration);
      setIsChecking(false);
      return true;
    } catch {
      setBackendReachable(false);
      setLatencyMs(null);
      setIsChecking(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkConnectivity]);

  return (
    <ConfigContext.Provider
      value={{
        apiUrl: API_BASE_URL,
        mode,
        setMode,
        backendReachable,
        latencyMs,
        isChecking,
        checkConnectivity,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
