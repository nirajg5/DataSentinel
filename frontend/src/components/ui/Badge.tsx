import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'healthy' | 'degraded' | 'failing' | 'critical' | 'high' | 'medium' | 'low' | 'info' | 'neutral' | 'live' | 'mock';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const variantStyles = {
    healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    degraded: 'bg-amber-50 text-amber-700 border-amber-200/80',
    failing: 'bg-rose-50 text-rose-700 border-rose-200/80',
    critical: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
    high: 'bg-orange-50 text-orange-700 border-orange-200/80',
    medium: 'bg-amber-50 text-amber-700 border-amber-200/80',
    low: 'bg-blue-50 text-blue-700 border-blue-200/80',
    info: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    live: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    mock: 'bg-purple-50 text-purple-700 border-purple-300',
  };

  const dotColors = {
    healthy: 'bg-emerald-500',
    degraded: 'bg-amber-500',
    failing: 'bg-rose-500',
    critical: 'bg-rose-600',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
    info: 'bg-indigo-500',
    neutral: 'bg-slate-400',
    live: 'bg-emerald-500 animate-pulse',
    mock: 'bg-purple-500',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border tracking-tight ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
