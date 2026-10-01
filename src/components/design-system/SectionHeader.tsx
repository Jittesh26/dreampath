import React from 'react';

interface SectionHeaderProps {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  action,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2.5">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#0B1B3D] tracking-tight">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="font-sans text-xs sm:text-sm text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
