import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import { MOCK_QUALITY_RESULT } from '../../mocks/fixtures';
import { QualityCheckOptions, QualityCheckResult } from '../../types/api';

export const qualityApi = {
  async runQualityCheck(
    datasetType: string,
    options?: QualityCheckOptions
  ): Promise<{ data: QualityCheckResult; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<QualityCheckResult>(
          `/quality/check/${encodeURIComponent(datasetType)}`,
          options || {}
        );
        return res.data;
      },
      () => {
        const fixture = MOCK_QUALITY_RESULT[datasetType] || {
          dataset_type: datasetType,
          total_checks: 8,
          passed_checks: 8,
          failed_checks: 0,
          warning_checks: 0,
          pass_rate: 100,
          status: 'passed',
          timestamp: new Date().toISOString(),
          checks: [
            {
              rule_name: 'expect_column_values_to_not_be_null',
              status: 'passed',
              description: 'Zero null values across required columns',
            },
            {
              rule_name: 'expect_column_types_to_match_schema',
              status: 'passed',
              description: 'Strict typing matches catalog definition',
            },
            {
              rule_name: 'expect_row_count_within_bounds',
              status: 'passed',
              description: 'Volume within 3-sigma tolerance',
            },
          ],
        };
        return fixture;
      }
    );
  },
};
