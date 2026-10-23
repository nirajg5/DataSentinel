import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  status?: 'healthy' | 'warning' | 'critical' | 'neutral';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  status = 'neutral',
  onClick,
}) => {
  const statusBorder = {
    healthy: 'hover:border-emerald-300',
    warning: 'border-l-4 border-l-amber-500',
    critical: 'border-l-4 border-l-rose-500',
    neutral: 'hover:border-indigo-300',
  };

  const statusBg = {
    healthy: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    critical: 'bg-rose-50 text-rose-600',
    neutral: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all ${
        statusBorder[status]
      } ${onClick ? 'cursor-pointer hover:shadow-sm' : ''}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        {icon && <div className={`p-2 rounded-lg ${statusBg[status]}`}>{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h4>
        {trend && (
          <span
            className={`text-xs font-semibold ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
};
