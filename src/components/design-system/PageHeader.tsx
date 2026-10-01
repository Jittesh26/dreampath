import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
  pill?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  breadcrumbs,
  className = '',
  pill,
}: PageHeaderProps) {
  return (
    <div className={`space-y-3.5 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="hover:text-[#0F172A] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-slate-800 font-semibold truncate' : ''}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {pill && (
        <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-blue-50/90 border border-blue-200/90 text-blue-700 text-[11px] font-bold uppercase tracking-wider font-sans shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          <span>{pill}</span>
        </div>
      )}

      {eyebrow && !pill && (
        <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 uppercase tracking-wider font-sans">
          {typeof eyebrow === 'string' ? <span>{eyebrow}</span> : eyebrow}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-[#0F172A] leading-[1.18] font-sans">
            {title}
          </h1>
          {subtitle && (
            <p className="font-sans text-slate-600 text-sm sm:text-base leading-relaxed font-normal">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

