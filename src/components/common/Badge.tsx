import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'navy' | 'gray' | 'green' | 'amber' | 'red';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  size = 'md',
  className,
  dot = false,
}) => {
  const variantStyles = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    navy: 'bg-slate-100 text-slate-800 border-slate-300',
    gray: 'bg-slate-50 text-slate-600 border-slate-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const dotStyles = {
    blue: 'bg-blue-600',
    navy: 'bg-slate-700',
    gray: 'bg-slate-400',
    green: 'bg-emerald-600',
    amber: 'bg-amber-600',
    red: 'bg-rose-600',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium border rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full mr-1.5',
            dotStyles[variant]
          )}
        />
      )}
      {children}
    </span>
  );
};
