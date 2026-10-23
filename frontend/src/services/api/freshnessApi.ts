import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import { MOCK_FRESHNESS_RESULT } from '../../mocks/fixtures';
import { FreshnessCheckRequest, FreshnessResult } from '../../types/api';

export const freshnessApi = {
  async checkFreshness(
    datasetName: string,
    params?: FreshnessCheckRequest
  ): Promise<{ data: FreshnessResult; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<FreshnessResult>(
          `/freshness/check/${encodeURIComponent(datasetName)}`,
          params || {}
        );
        return res.data;
      },
      () => {
        const fixture = MOCK_FRESHNESS_RESULT[datasetName] || {
          dataset_name: datasetName,
          last_updated: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
          sla_threshold_min: params?.sla_minutes_threshold || 60,
          age_minutes: 22,
          is_fresh: true,
          status: 'fresh',
          checked_at: new Date().toISOString(),
          sla_variance_min: -38,
        };
        return fixture;
      }
    );
  },
};
