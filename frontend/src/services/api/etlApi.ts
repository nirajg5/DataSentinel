import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import {
  SilverETLOptions,
  ETLResultResponse,
  GoldBuildRequest,
  GoldBuildResponse,
} from '../../types/api';

export const etlApi = {
  async triggerSilverETL(
    datasetType: string,
    options?: SilverETLOptions
  ): Promise<{ data: ETLResultResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<ETLResultResponse>(
          `/etl/silver/${encodeURIComponent(datasetType)}`,
          options || {}
        );
        return res.data;
      },
      () => {
        const baseRows = datasetType.includes('financial') ? 84000 : 512000;
        const dropped = options?.drop_nulls ? 1420 : 0;
        return {
          status: 'success',
          layer: 'silver',
          dataset_type: datasetType,
          rows_in: baseRows,
          rows_out: baseRows - dropped,
          dropped_rows: dropped,
          execution_time_sec: 14.8,
          timestamp: new Date().toISOString(),
          details: `Processed Silver layer for ${datasetType}. Deduplication: ${
            options?.deduplicate ? 'enabled' : 'disabled'
          }, Type validation: ${options?.validate_types ? 'enforced' : 'skipped'}.`,
        };
      }
    );
  },

  async triggerGoldBuild(payload: GoldBuildRequest): Promise<{ data: GoldBuildResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<GoldBuildResponse>('/etl/gold/build', payload);
        return res.data;
      },
      () => ({
        status: 'success',
        target_table: payload.target_table,
        rows_aggregated: 142000,
        execution_time_sec: 38.4,
        completed_at: new Date().toISOString(),
        metrics: {
          aggregations_computed: payload.aggregations.length,
          output_partitions: 8,
        },
      })
    );
  },
};
