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
      className={`bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xs ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 bg-amber-50 text-amber-800 rounded-2xl flex items-center justify-center mx-auto border border-amber-200/60">
          {icon}
        </div>
      )}
      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="font-serif text-xl font-bold text-[#0B1B3D]">
          {title}
        </h3>
        <p className="font-sans text-xs sm:text-sm text-slate-500 leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
