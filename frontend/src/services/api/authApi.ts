import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import { MOCK_USERS } from '../../mocks/fixtures';
import { UserResponse, TokenResponse, AdminTestResponse } from '../../types/api';

export const authApi = {
  async register(data: {
    username: string;
    email: string;
    password: string;
    full_name: string;
    role?: string;
  }): Promise<{ data: UserResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<UserResponse>('/auth/register', data);
        return res.data;
      },
      () => ({
        id: `usr-${Date.now()}`,
        username: data.username,
        email: data.email,
        full_name: data.full_name,
        role: (data.role as any) || 'data_engineer',
        is_active: true,
        created_at: new Date().toISOString(),
      })
    );
  },

  async login(credentials: {
    username: string;
    password: string;
  }): Promise<{ data: TokenResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        // Support both JSON body and OAuth2PasswordRequestForm
        const formData = new URLSearchParams();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);
        
        try {
          const res = await apiClient.post<TokenResponse>('/auth/login', credentials);
          return res.data;
        } catch {
          const res = await apiClient.post<TokenResponse>('/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          return res.data;
        }
      },
      () => {
        const user =
          credentials.username.includes('admin')
            ? MOCK_USERS.admin
            : credentials.username.includes('alex')
            ? MOCK_USERS.data_engineer
            : MOCK_USERS.analyst;
        return {
          access_token: `mock-jwt-token-${user.role}-${Date.now()}`,
          token_type: 'bearer',
          expires_in: 86400,
          user,
        };
      }
    );
  },

  async getMe(): Promise<{ data: UserResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<UserResponse>('/auth/me');
        return res.data;
      },
      () => {
        const token = localStorage.getItem('datasentinel_token') || '';
        if (token.includes('admin')) return MOCK_USERS.admin;
        if (token.includes('analyst')) return MOCK_USERS.analyst;
        return MOCK_USERS.data_engineer;
      }
    );
  },

  async checkAdminAccess(): Promise<{ data: AdminTestResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<AdminTestResponse>('/auth/admin-test');
        return res.data;
      },
      () => {
        const token = localStorage.getItem('datasentinel_token') || '';
        const role = token.includes('admin') ? 'admin' : 'data_engineer';
        if (role !== 'admin') {
          throw new Error('Forbidden (403): Administrative role required to access /auth/admin-test');
        }
        return {
          status: 'success',
          message: 'Admin access verified. You possess full platform privileges.',
          user_role: 'admin',
          timestamp: new Date().toISOString(),
        };
      }
    );
  },
};
