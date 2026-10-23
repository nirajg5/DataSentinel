import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import { MOCK_DATASETS } from '../../mocks/fixtures';
import { DatasetSummary } from '../../types/api';

export const datasetsApi = {
  async getDatasets(): Promise<{ data: DatasetSummary[]; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<DatasetSummary[]>('/datasets/');
        return res.data;
      },
      () => MOCK_DATASETS
    );
  },
};
