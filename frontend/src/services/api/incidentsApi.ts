import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import { MOCK_INCIDENTS } from '../../mocks/fixtures';
import {
  IncidentItem,
  IncidentDetectRequest,
  IncidentDetectResponse,
  PipelineFailureDetectResponse,
  ResolveIncidentRequest,
} from '../../types/api';

// In-memory store for mocks during interactive session
let localIncidents = [...MOCK_INCIDENTS];

export const incidentsApi = {
  async getIncidents(filters?: {
    status?: string;
    severity?: string;
    dataset_name?: string;
  }): Promise<{ data: IncidentItem[]; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<IncidentItem[]>('/incidents/', {
          params: filters,
        });
        return res.data;
      },
      () => {
        let results = [...localIncidents];
        if (filters?.status && filters.status !== 'all') {
          results = results.filter((inc) => inc.status === filters.status);
        }
        if (filters?.severity && filters.severity !== 'all') {
          results = results.filter((inc) => inc.severity === filters.severity);
        }
        if (filters?.dataset_name && filters.dataset_name !== 'all') {
          results = results.filter((inc) => inc.dataset_name === filters.dataset_name);
        }
        return results;
      }
    );
  },

  async detectDatasetIncidents(
    datasetName: string,
    params?: IncidentDetectRequest
  ): Promise<{ data: IncidentDetectResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<IncidentDetectResponse>(
          `/incidents/detect/${encodeURIComponent(datasetName)}`,
          params || {}
        );
        return res.data;
      },
      () => {
        const detected = datasetName.includes('ledger') ? 1 : 0;
        return {
          dataset_name: datasetName,
          incidents_detected: detected,
          incident_codes: detected ? ['INC-2026-8942'] : [],
          scan_duration_ms: 1240,
        };
      }
    );
  },

  async detectPipelineFailures(
    datasetName: string
  ): Promise<{ data: PipelineFailureDetectResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<PipelineFailureDetectResponse>(
          `/incidents/detect-pipeline-failures/${encodeURIComponent(datasetName)}`
        );
        return res.data;
      },
      () => ({
        dataset_name: datasetName,
        new_failures_flagged: 1,
        incidents: localIncidents.filter((inc) => inc.dataset_name === datasetName),
      })
    );
  },

  async resolveIncident(
    incidentCode: string,
    payload: ResolveIncidentRequest
  ): Promise<{ data: IncidentItem; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.patch<IncidentItem>(
          `/incidents/${encodeURIComponent(incidentCode)}/resolve`,
          payload
        );
        return res.data;
      },
      () => {
        const index = localIncidents.findIndex((i) => i.incident_code === incidentCode);
        if (index >= 0) {
          localIncidents[index] = {
            ...localIncidents[index],
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolution_notes: payload.resolution_notes,
          };
          return localIncidents[index];
        }
        return {
          incident_code: incidentCode,
          dataset_name: 'unknown',
          severity: 'medium',
          status: 'resolved',
          title: 'Resolved Incident',
          description: 'Incident marked as resolved in system.',
          detected_at: new Date(Date.now() - 3600000).toISOString(),
          resolved_at: new Date().toISOString(),
          resolution_notes: payload.resolution_notes,
        };
      }
    );
  },
};
