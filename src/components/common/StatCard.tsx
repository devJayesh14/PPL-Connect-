import React from 'react';
import { Card } from './Card';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  highlight = false,
}) => {
  return (
    <Card className={clsx(highlight && 'border-blue-300 ring-1 ring-blue-100')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
          {trend && (
            <span
              className={clsx(
                'mt-2 inline-flex items-center text-xs font-medium',
                trend.positive ? 'text-emerald-600' : 'text-slate-500'
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 border border-blue-100">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};
