import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  header,
  footer,
  noPadding = false,
}) => {
  return (
    <div
      className={clsx(
        'bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden',
        className
      )}
    >
      {header && (
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          {header}
        </div>
      )}
      <div className={clsx(!noPadding && 'p-6')}>{children}</div>
      {footer && (
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/50">
          {footer}
        </div>
      )}
    </div>
  );
};
