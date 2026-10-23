import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import { ConfigProvider } from '../context/ConfigContext';
import { AuthProvider } from '../context/AuthContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfigProvider>
          <AuthProvider>{children}</AuthProvider>
        </ConfigProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
