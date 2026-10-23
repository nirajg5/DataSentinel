import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import { IngestionRequest, IngestionResponse } from '../../types/api';

export const ingestionApi = {
  async submitIngestion(payload: IngestionRequest): Promise<{ data: IngestionResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<IngestionResponse>('/ingestion/dataset', payload);
        return res.data;
      },
      () => ({
        job_id: `job-ingest-${Date.now()}`,
        status: 'success',
        dataset_name: payload.dataset_name,
        records_ingested: payload.records?.length || 25400,
        duration_ms: Math.floor(Math.random() * 800) + 450,
        timestamp: new Date().toISOString(),
      })
    );
  },
};
