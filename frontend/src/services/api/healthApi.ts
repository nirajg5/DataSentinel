import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import {
  MOCK_ROOT_INFO,
  MOCK_HEALTH,
  MOCK_DB_HEALTH,
} from '../../mocks/fixtures';
import {
  RootResponse,
  HealthResponse,
  DatabaseHealthResponse,
} from '../../types/api';

export const healthApi = {
  async getRoot(): Promise<{ data: RootResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<RootResponse>('/');
        return res.data;
      },
      () => MOCK_ROOT_INFO
    );
  },

  async getHealth(): Promise<{ data: HealthResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<HealthResponse>('/health');
        return res.data;
      },
      () => MOCK_HEALTH
    );
  },

  async getDatabaseHealth(): Promise<{ data: DatabaseHealthResponse; isLive: boolean; error?: string }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<DatabaseHealthResponse>('/health/database');
        return res.data;
      },
      () => MOCK_DB_HEALTH
    );
  },
};
