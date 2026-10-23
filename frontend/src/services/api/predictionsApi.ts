import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import {
  MOCK_MODEL_STATUS,
  MOCK_PREDICTION_RESULT,
  MOCK_PREDICTION_HISTORY,
  MOCK_MODEL_EVALUATION,
} from '../../mocks/fixtures';
import {
  ModelStatusResponse,
  PredictionResultResponse,
  PredictionHistoryItem,
  ModelEvaluationResponse,
} from '../../types/api';

export const predictionsApi = {
  async getModelStatus(): Promise<{ data: ModelStatusResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<ModelStatusResponse>('/predictions/failure/model-status');
        return res.data;
      },
      () => MOCK_MODEL_STATUS
    );
  },

  async predictFailure(
    datasetName: string
  ): Promise<{ data: PredictionResultResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<PredictionResultResponse>(
          `/predictions/failure/${encodeURIComponent(datasetName)}`
        );
        return res.data;
      },
      () => {
        return (
          MOCK_PREDICTION_RESULT[datasetName] || {
            dataset_name: datasetName,
            failure_probability: 0.14,
            risk_level: 'LOW',
            key_risk_factors: [
              {
                factor: 'Moderate ingestion jitter',
                importance: 0.18,
                description: 'Kafka arrival time standard deviation slightly elevated over baseline.',
              },
            ],
            suggested_prevention: 'Normal execution advised. Keep standard alerting active.',
            timestamp: new Date().toISOString(),
          }
        );
      }
    );
  },

  async getPredictionHistory(
    datasetName: string
  ): Promise<{ data: PredictionHistoryItem[]; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<PredictionHistoryItem[]>(
          `/predictions/failure/${encodeURIComponent(datasetName)}/history`
        );
        return res.data;
      },
      () => MOCK_PREDICTION_HISTORY.filter((p) => !datasetName || p.dataset_name === datasetName || true)
    );
  },

  async getEvaluation(): Promise<{ data: ModelEvaluationResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<ModelEvaluationResponse>('/predictions/evaluation');
        return res.data;
      },
      () => MOCK_MODEL_EVALUATION
    );
  },
};
