import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import { MOCK_RELIABILITY_SCORES } from '../../mocks/fixtures';
import { ReliabilityCalculationRequest, ReliabilityScoreResponse } from '../../types/api';

export const reliabilityApi = {
  async calculateReliability(
    datasetType: string,
    params?: ReliabilityCalculationRequest
  ): Promise<{ data: ReliabilityScoreResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<ReliabilityScoreResponse>(
          `/reliability/calculate/${encodeURIComponent(datasetType)}`,
          params || {}
        );
        return res.data;
      },
      () => {
        const fixture = MOCK_RELIABILITY_SCORES[datasetType] || {
          dataset_type: datasetType,
          score: 96.5,
          grade: 'A',
          uptime_percentage: 99.4,
          failure_frequency: 0.03,
          mttr_minutes: 24.0,
          data_loss_percentage: 0.0,
          calculation_window_days: params?.window_days || 30,
          historical_scores: [
            { date: '2026-10-16', score: 98.0 },
            { date: '2026-10-17', score: 97.2 },
            { date: '2026-10-18', score: 96.8 },
            { date: '2026-10-19', score: 97.5 },
            { date: '2026-10-20', score: 96.1 },
            { date: '2026-10-21', score: 95.8 },
            { date: '2026-10-22', score: 96.5 },
          ],
        };
        return fixture;
      }
    );
  },
};
