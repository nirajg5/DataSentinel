import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';

// Feature Pages
import { OverviewPage } from '../features/dashboard/OverviewPage';
import { DatasetsPage } from '../features/datasets/DatasetsPage';
import { IngestionPage } from '../features/ingestion/IngestionPage';
import { EtlPage } from '../features/etl/EtlPage';
import { PipelineRunsPage } from '../features/pipeline-runs/PipelineRunsPage';
import { QualityPage } from '../features/quality/QualityPage';
import { FreshnessPage } from '../features/freshness/FreshnessPage';
import { ReliabilityPage } from '../features/reliability/ReliabilityPage';
import { IncidentsPage } from '../features/incidents/IncidentsPage';
import { PredictionsPage } from '../features/predictions/PredictionsPage';
import { AiAnalysisPage } from '../features/ai-analysis/AiAnalysisPage';
import { RagPage } from '../features/rag/RagPage';
import { AgentsPage } from '../features/agents/AgentsPage';
import { AgentMetricsPage } from '../features/agents/AgentMetricsPage';
import { HealthPage } from '../features/monitoring/HealthPage';
import { ProfilePage } from '../features/auth/ProfilePage';
import { AdminPage } from '../features/auth/AdminPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs">
        Initializing DataSentinel session...
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Main Protected Platform Routes */}
      <Route
        path="/"
        element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<OverviewPage />} />
        <Route path="datasets" element={<DatasetsPage />} />
        <Route path="ingestion" element={<IngestionPage />} />
        <Route path="etl" element={<EtlPage />} />
        <Route path="pipeline-runs" element={<PipelineRunsPage />} />
        <Route path="quality" element={<QualityPage />} />
        <Route path="freshness" element={<FreshnessPage />} />
        <Route path="reliability" element={<ReliabilityPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="predictions" element={<PredictionsPage />} />
        <Route path="ai-analysis" element={<AiAnalysisPage />} />
        <Route path="rag" element={<RagPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agent-metrics" element={<AgentMetricsPage />} />
        <Route path="health" element={<HealthPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
