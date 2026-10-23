import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { datasetsApi } from '../../services/api/datasetsApi';
import { DatasetSummary } from '../../types/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  Database,
  Search,
  Filter,
  Layers,
  Table,
  ShieldCheck,
  Clock,
  Workflow,
  TrendingDown,
  Info,
  ExternalLink,
} from 'lucide-react';

export const DatasetsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [layerFilter, setLayerFilter] = useState<string>('all');
  const [selectedDataset, setSelectedDataset] = useState<DatasetSummary | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['datasetsList'],
    queryFn: () => datasetsApi.getDatasets(),
  });

  const datasets = data?.data || [];

  const filteredDatasets = datasets.filter((ds) => {
    const matchesSearch =
      ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ds.dataset_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ds.description && ds.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLayer = layerFilter === 'all' || ds.layer === layerFilter;
    return matchesSearch && matchesLayer;
  });

  const getLayerColor = (layer: string) => {
    switch (layer) {
      case 'bronze':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'silver':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      case 'gold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dataset Catalog</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered tables across Bronze raw ingestion, Silver cleansed, and Gold business marts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/ingestion')}
            leftIcon={<Workflow className="w-3.5 h-3.5" />}
          >
            New Ingestion
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search dataset name, type, or schema..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium">Layer:</span>
          {['all', 'bronze', 'silver', 'gold'].map((layer) => (
            <button
              key={layer}
              onClick={() => setLayerFilter(layer)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                layerFilter === layer
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {layer}
            </button>
          ))}
        </div>
      </div>

      {/* Datasets Table / Cards */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Dataset Name</th>
                <th className="px-5 py-3.5">Layer</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Row Count</th>
                <th className="px-5 py-3.5">Quality Score</th>
                <th className="px-5 py-3.5">Health Status</th>
                <th className="px-5 py-3.5">Last Ingested</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDatasets.map((ds) => (
                <tr key={ds.name} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <button
                          onClick={() => setSelectedDataset(ds)}
                          className="font-semibold text-slate-900 hover:text-indigo-600 text-left transition-colors cursor-pointer"
                        >
                          {ds.name}
                        </button>
                        <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">
                          {ds.description || 'No description recorded'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getLayerColor(
                        ds.layer
                      )}`}
                    >
                      {ds.layer}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px] text-slate-700">{ds.dataset_type}</td>
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {ds.row_count?.toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    {ds.quality_score !== undefined ? (
                      <span
                        className={`font-semibold ${
                          ds.quality_score >= 95
                            ? 'text-emerald-600'
                            : ds.quality_score >= 80
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {ds.quality_score}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      variant={
                        ds.status === 'healthy'
                          ? 'healthy'
                          : ds.status === 'degraded'
                          ? 'degraded'
                          : 'failing'
                      }
                      size="sm"
                      dot
                    >
                      {ds.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-slate-400">
                    {new Date(ds.last_updated).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDataset(ds)}
                        title="Inspect Schema & Metadata"
                      >
                        Schema
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/quality?dataset_type=${ds.dataset_type}`)}
                        title="Run Quality Check"
                      >
                        Quality
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/freshness?dataset_name=${ds.name}`)}
                        title="Check Freshness SLA"
                      >
                        SLA
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredDatasets.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <Database className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No datasets matching filter "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dataset Schema & Details Modal */}
      <Modal
        isOpen={!!selectedDataset}
        onClose={() => setSelectedDataset(null)}
        title={selectedDataset?.name || 'Dataset Details'}
        description={`Layer: ${selectedDataset?.layer.toUpperCase()} | Type: ${selectedDataset?.dataset_type}`}
        maxWidth="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const ds = selectedDataset;
                  setSelectedDataset(null);
                  navigate(`/predictions?dataset_name=${ds?.name}`);
                }}
                leftIcon={<TrendingDown className="w-3.5 h-3.5" />}
              >
                Predict Failure
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const ds = selectedDataset;
                  setSelectedDataset(null);
                  navigate(`/etl?dataset_type=${ds?.dataset_type}`);
                }}
                leftIcon={<Workflow className="w-3.5 h-3.5" />}
              >
                Trigger ETL
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSelectedDataset(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedDataset && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <p className="text-slate-700 leading-relaxed">{selectedDataset.description}</p>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Row Count</span>
                  <p className="font-bold text-slate-900">{selectedDataset.row_count.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Columns</span>
                  <p className="font-bold text-slate-900">{selectedDataset.column_count}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Table Health</span>
                  <p className="font-bold text-slate-900 capitalize">{selectedDataset.status}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                Schema Definition ({selectedDataset.columns?.length || 0} fields)
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="px-3 py-2">Column Name</th>
                      <th className="px-3 py-2">Data Type</th>
                      <th className="px-3 py-2">Nullable</th>
                      <th className="px-3 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedDataset.columns?.map((col) => (
                      <tr key={col.name}>
                        <td className="px-3 py-2 font-mono font-medium text-slate-900">{col.name}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-indigo-600">{col.type}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              col.nullable ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-600'
                            }`}
                          >
                            {col.nullable ? 'YES' : 'NOT NULL'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500">{col.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
