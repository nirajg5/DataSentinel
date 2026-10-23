import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import {
  MOCK_AGENT_RESULT,
  MOCK_AGENT_HISTORY,
  MOCK_AGENT_METRICS,
} from '../../mocks/fixtures';
import {
  AgentInvestigateRequest,
  AgentInvestigationResult,
  AsyncTaskResponse,
  TaskStatusResponse,
  AgentInvestigationSummary,
  RecoverStaleRequest,
  RecoverStaleResponse,
  AgentMetricsResponse,
} from '../../types/api';

// In-memory async tasks simulation for local dev
const mockAsyncTasks = new Map<string, { startTime: number; req: AgentInvestigateRequest }>();

export const agentsApi = {
  async investigateSync(
    payload: AgentInvestigateRequest
  ): Promise<{ data: AgentInvestigationResult; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<AgentInvestigationResult>('/agent/investigate', payload);
        return res.data;
      },
      () => ({
        ...MOCK_AGENT_RESULT,
        investigation_id: `inv-${Date.now()}`,
        dataset_name: payload.dataset_name,
        incident_code: payload.incident_code || 'INC-MANUAL-REQ',
        completed_at: new Date().toISOString(),
      })
    );
  },

  async investigateAsync(
    payload: AgentInvestigateRequest
  ): Promise<{ data: AsyncTaskResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<AsyncTaskResponse>('/agent/investigate/async', payload);
        return res.data;
      },
      () => {
        const taskId = `task-celery-${Date.now()}`;
        mockAsyncTasks.set(taskId, { startTime: Date.now(), req: payload });
        return {
          task_id: taskId,
          status: 'queued',
          message: 'Asynchronous investigation task accepted and queued on Celery agent pool.',
          created_at: new Date().toISOString(),
        };
      }
    );
  },

  async getTaskStatus(taskId: string): Promise<{ data: TaskStatusResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<TaskStatusResponse>(`/agent/tasks/${encodeURIComponent(taskId)}`);
        return res.data;
      },
      () => {
        const item = mockAsyncTasks.get(taskId);
        if (!item) {
          // If unknown, return completed standard result
          return {
            task_id: taskId,
            status: 'completed',
            progress: 100,
            result: MOCK_AGENT_RESULT,
            updated_at: new Date().toISOString(),
          };
        }

        const elapsedMs = Date.now() - item.startTime;
        if (elapsedMs < 2500) {
          return {
            task_id: taskId,
            status: 'running',
            progress: 35,
            current_step: 'Step 1/4: Inspecting Prometheus logs and telemetry trace',
            updated_at: new Date().toISOString(),
          };
        } else if (elapsedMs < 5000) {
          return {
            task_id: taskId,
            status: 'running',
            progress: 75,
            current_step: 'Step 3/4: Querying Pinecone vector store for runbook recommendations',
            updated_at: new Date().toISOString(),
          };
        } else {
          return {
            task_id: taskId,
            status: 'completed',
            progress: 100,
            result: {
              ...MOCK_AGENT_RESULT,
              dataset_name: item.req.dataset_name,
              incident_code: item.req.incident_code || 'INC-2026-ASYNC',
            },
            updated_at: new Date().toISOString(),
          };
        }
      }
    );
  },

  async getHistory(): Promise<{ data: AgentInvestigationSummary[]; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<AgentInvestigationSummary[]>('/agent/history');
        return res.data;
      },
      () => MOCK_AGENT_HISTORY
    );
  },

  async recoverStale(payload?: RecoverStaleRequest): Promise<{ data: RecoverStaleResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<RecoverStaleResponse>('/agent/maintenance/recover-stale', payload || {});
        return res.data;
      },
      () => ({
        tasks_inspected: 14,
        tasks_recovered: 2,
        message: 'Successfully purged 2 abandoned worker locks and reconciled task states.',
        timestamp: new Date().toISOString(),
      })
    );
  },

  async getMetrics(): Promise<{ data: AgentMetricsResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.get<AgentMetricsResponse>('/agent/metrics');
        return res.data;
      },
      () => MOCK_AGENT_METRICS
    );
  },
};
