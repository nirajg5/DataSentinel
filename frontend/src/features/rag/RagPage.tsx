import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ragApi } from '../../services/api/ragApi';
import { RAGQueryRequest, RAGQueryResponse } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useConfig } from '../../context/ConfigContext';
import {
  HelpCircle,
  Sparkles,
  Send,
  BookOpen,
  FileText,
  Clock,
  Layers,
  Search,
  ExternalLink,
} from 'lucide-react';

export const RagPage: React.FC = () => {
  const { addToast } = useConfig();
  const [question, setQuestion] = useState(
    'How do I resolve schema drift and unbalanced journal entries in financial_ledger_entries?'
  );
  const [category, setCategory] = useState<string>('all');
  const [topK, setTopK] = useState<number>(3);
  const [ragResult, setRagResult] = useState<RAGQueryResponse | null>(null);

  const sampleQuestions = [
    'How do I resolve schema drift and unbalanced journal entries in financial_ledger_entries?',
    'What are the freshness SLA recovery procedures when data arrives stale?',
    'How does stale task recovery work for Celery agent workers in LangGraph?',
    'What Great Expectations rules are configured for ecommerce_orders Silver ETL?',
  ];

  const mutation = useMutation({
    mutationFn: async (payload: RAGQueryRequest) => {
      const res = await ragApi.askQuestion(payload);
      return res.data;
    },
    onSuccess: (data) => {
      setRagResult(data);
      addToast({
        type: 'success',
        title: 'Knowledge Base Query Answered',
        message: `Synthesized answer from ${data.citations.length} cited documents in ${data.search_latency_ms}ms.`,
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'RAG Query Failed',
        message: err.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    mutation.mutate({
      question: question.trim(),
      top_k: topK,
      filter_category: category !== 'all' ? category : undefined,
    });
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'playbook':
        return <BookOpen className="w-3.5 h-3.5 text-indigo-500" />;
      case 'doc':
        return <FileText className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">RAG Knowledge Assistant</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Semantic neural search across DataSentinel runbooks, architecture SOPs, and incident postmortems (POST /rag/ask)
        </p>
      </div>

      {/* Query Formulation Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <CardTitle>Ask Platform Runbooks &amp; Architecture Guides</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              label="Engineering Query / Incident Troubleshooting Question"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about data pipelines, schema changes, SLA thresholds, or incident resolution..."
              required
            />

            {/* Quick Prompt Chips */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
                Recommended Prompt Templates:
              </span>
              <div className="flex flex-wrap gap-2">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setQuestion(q)}
                    className="text-left px-2.5 py-1 rounded-lg text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-44">
                  <Select
                    label="Knowledge Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="all">All Indexed Documents</option>
                    <option value="playbook">Incident Runbooks (SOPs)</option>
                    <option value="architecture">Architecture &amp; Contracts</option>
                    <option value="governance">SOX &amp; Compliance</option>
                  </Select>
                </div>

                <div className="w-28">
                  <Select
                    label="Top K Sources"
                    value={topK.toString()}
                    onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                  >
                    <option value="2">2 Documents</option>
                    <option value="3">3 Documents</option>
                    <option value="5">5 Documents</option>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={mutation.isPending}
                leftIcon={<Send className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Query RAG Assistant
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Answer & Citations View */}
      {ragResult && (
        <div className="space-y-6">
          {/* Answer Card */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Assistant Synthesis</CardTitle>
                <p className="text-xs text-slate-500">Query: {ragResult.question}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400">
                  Latency: {ragResult.search_latency_ms}ms
                </span>
                <Badge variant="info">PINECODE + GROQ</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs leading-relaxed whitespace-pre-line font-normal">
                {ragResult.answer}
              </div>

              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100">
                <span>Model Pipeline: {ragResult.model_used}</span>
                <span>Verified against enterprise document embeddings</span>
              </div>
            </CardContent>
          </Card>

          {/* Citations List */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Retrieved Source Citations ({ragResult.citations.length} documents)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ragResult.citations.map((cite, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getSourceIcon(cite.source_type)}
                      <span className="font-mono text-[11px] font-bold text-slate-700">
                        {cite.doc_id}
                      </span>
                    </div>
                    <Badge variant="healthy" size="sm">
                      {(cite.score * 100).toFixed(0)}% Relevance
                    </Badge>
                  </div>

                  <h5 className="font-semibold text-slate-900">{cite.title}</h5>
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono text-[11px] leading-relaxed">
                    "{cite.snippet}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!ragResult && !mutation.isPending && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <HelpCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">Knowledge Assistant Ready</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Formulate a question or pick one of the recommended prompt chips above to query enterprise runbooks.
          </p>
        </div>
      )}
    </div>
  );
};
