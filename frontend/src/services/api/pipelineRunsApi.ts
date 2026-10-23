import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import {
  MOCK_PIPELINE_RUNS,
  MOCK_PIPELINE_SUMMARY,
  MOCK_PIPELINE_RUN_DETAIL,
} from '../../mocks/fixtures';
import {
  PipelineRunItem,
  PipelineSummaryResponse,
  PipelineRunDetail,
} from '../../types/api';

export const pipelineRunsApi = {
  async getRuns(filters?: {
    status?: string;
    dataset_name?: string;
    limit?: number;
  }): Promise<{ data: PipelineRunItem[]; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<PipelineRunItem[]>('/pipeline-runs', {
          params: filters,
        });
        return res.data;
      },
      () => {
        let results = [...MOCK_PIPELINE_RUNS];
        if (filters?.status && filters.status !== 'all') {
          results = results.filter((r) => r.status === filters.status);
        }
        if (filters?.dataset_name && filters.dataset_name !== 'all') {
          results = results.filter((r) => r.dataset_name === filters.dataset_name);
        }
        return results;
      }
    );
  },

  async getSummary(): Promise<{ data: PipelineSummaryResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<PipelineSummaryResponse>('/pipeline-runs/summary');
        return res.data;
      },
      () => MOCK_PIPELINE_SUMMARY
    );
  },

  async getRunById(runId: string): Promise<{ data: PipelineRunDetail; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<PipelineRunDetail>(`/pipeline-runs/${encodeURIComponent(runId)}`);
        return res.data;
      },
      () => {
        const base = MOCK_PIPELINE_RUNS.find((r) => r.run_id === runId);
        if (base && base.status === 'success') {
          return {
            ...MOCK_PIPELINE_RUN_DETAIL,
            run_id: base.run_id,
            pipeline_name: base.pipeline_name,
            dataset_name: base.dataset_name,
            status: base.status,
            error_message: undefined,
            steps: [
              { step_name: 'Extract Bronze Delta Logs', status: 'success', started_at: base.started_at, duration_sec: 18, records_processed: base.records_processed },
              { step_name: 'Schema Validation & Coercion', status: 'success', started_at: base.started_at, duration_sec: 25, records_processed: base.records_processed },
              { step_name: 'Business Rule Suite Check', status: 'success', started_at: base.started_at, duration_sec: 42, records_processed: base.records_processed },
              { step_name: 'Silver Layer Materialization', status: 'success', started_at: base.started_at, duration_sec: 39, records_processed: base.records_processed },
            ],
            logs: `[INFO] Pipeline run ${runId} started successfully.\n[INFO] Validating schema constraints.\n[INFO] Processing ${base.records_processed?.toLocaleString()} records.\n[SUCCESS] Pipeline completed in ${base.duration_sec}s.`,
          };
        }
        return {
          ...MOCK_PIPELINE_RUN_DETAIL,
          run_id: runId,
        };
      }
    );
  },
};
