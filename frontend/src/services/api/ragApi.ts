import { apiClient, executeApiWithFallback } from '../../lib/api-client';
import { MOCK_RAG_RESPONSES } from '../../mocks/fixtures';
import { RAGQueryRequest, RAGQueryResponse } from '../../types/api';

export const ragApi = {
  async askQuestion(payload: RAGQueryRequest): Promise<{ data: RAGQueryResponse; isLive: boolean }> {
    return executeApiWithFallback(
      async () => {
        const res = await apiClient.post<RAGQueryResponse>('/rag/ask', payload);
        return res.data;
      },
      () => {
        const questionLower = payload.question.toLowerCase();
        let citations = [...MOCK_RAG_RESPONSES.default.citations];
        let answer = MOCK_RAG_RESPONSES.default.answer;

        if (questionLower.includes('freshness') || questionLower.includes('sla')) {
          answer =
            'Freshness SLAs are computed by comparing table maximum partition timestamp against wall-clock time. If lag exceeds the SLA threshold (default 60 minutes), DataSentinel automatically flags the dataset as stale and dispatches Prometheus alert `DataFreshnessSLABreached`. To recover, execute the Bronze-to-Silver ETL pipeline or verify upstream webhook ingestion.';
          citations = [
            {
              title: 'Data Platform SLA & Freshness Monitoring Framework',
              doc_id: 'SLA-POL-02',
              snippet: 'SLA monitors check table metadata every 5 minutes. Critical datasets are alerted via Slack & PagerDuty when lag > threshold.',
              score: 0.94,
              source_type: 'doc',
            },
          ];
        } else if (questionLower.includes('agent') || questionLower.includes('celery') || questionLower.includes('stale')) {
          answer =
            'LangGraph agent investigations run on Celery worker queues backed by Redis. In the event of worker node eviction or unhandled network timeouts, tasks may linger in a `running` or `queued` state. Administrators can trigger `POST /agent/maintenance/recover-stale` with an age threshold to gracefully recycle worker locks and requeue uncompleted traces.';
          citations = [
            {
              title: 'Autonomous Agent Orchestration & Worker Recovery SOP',
              doc_id: 'AGENT-RUNBOOK-01',
              snippet: 'Stale-task recovery scans Celery task registry for tasks with no heartbeat in 30 minutes, revokes orphaned Redis locks, and resets task state.',
              score: 0.95,
              source_type: 'playbook',
            },
          ];
        }

        return {
          question: payload.question,
          answer,
          citations,
          search_latency_ms: Math.floor(Math.random() * 80) + 120,
          model_used: 'llama-3.3-70b-versatile via Groq + Pinecone Index: datasentinel-knowledge',
        };
      }
    );
  },
};
