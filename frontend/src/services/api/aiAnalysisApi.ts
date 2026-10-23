import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import { MOCK_AI_ANALYSIS } from '../../mocks/fixtures';
import { AIAnalysisResponse, DemoAnalysisRequest } from '../../types/api';

export const aiAnalysisApi = {
  async runDemoAnalysis(params?: DemoAnalysisRequest): Promise<{ data: AIAnalysisResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<AIAnalysisResponse>('/ai-analysis/demo', params || {});
        return res.data;
      },
      () => ({
        incident_code: 'INC-DEMO-SIMULATED',
        root_cause_hypothesis:
          'Simulated anomaly: Rapid 3.4x spike in upstream NULL values detected on column `account_code` following schema migration #8812. Downstream Gold aggregations failed due to unhandled null pointer exception.',
        confidence_score: 0.96,
        impact_scope: 'High severity impact on 14,200 downstream customer ledger records and 2 executive reports.',
        suggested_mitigation:
          '1. Enable quarantine filter `account_code IS NOT NULL`.\n2. Apply fallback UUID coalesce.\n3. Rerun Silver ETL pipeline.',
        logs_analyzed: 5120,
        affected_downstream: ['gold_finance_mart', 'reporting_daily_revenue'],
        failure_timeline: [
          { timestamp: '14:00:00 UTC', event: 'Upstream deployment event registered' },
          { timestamp: '14:02:15 UTC', event: 'First null violation flagged by Great Expectations' },
          { timestamp: '14:04:30 UTC', event: 'Pipeline aborted with exit code 1' },
        ],
        suggested_query_fix: 'SELECT COALESCE(account_code, \'UNKNOWN\') AS account_code FROM source_stream;',
      })
    );
  },

  async analyzeIncident(incidentCode: string): Promise<{ data: AIAnalysisResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<AIAnalysisResponse>(
          `/ai-analysis/${encodeURIComponent(incidentCode)}`
        );
        return res.data;
      },
      () => {
        return (
          MOCK_AI_ANALYSIS[incidentCode] || {
            incident_code: incidentCode,
            root_cause_hypothesis:
              'Analysis completed using Groq LLM: Anomaly originated from delayed partition writes in upstream worker pool.',
            confidence_score: 0.88,
            impact_scope: 'Moderate: pipeline delayed by 42 minutes.',
            suggested_mitigation: 'Scale Celery worker concurrency from 4 to 8 instances and clear stale Redis task lock.',
            logs_analyzed: 2840,
            affected_downstream: ['hourly_batch_mart'],
          }
        );
      }
    );
  },
};
