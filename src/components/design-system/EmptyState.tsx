import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-2xs ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center mx-auto border border-blue-100 shadow-2xs">
          {icon}
        </div>
      )}
      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight font-sans">
          {title}
        </h3>
        <p className="font-sans text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
          {description}
        </p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

