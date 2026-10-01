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
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  breadcrumbs,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="hover:text-slate-900 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-slate-900 font-semibold truncate' : ''}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {eyebrow && (
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wider">
          {typeof eyebrow === 'string' ? <span>{eyebrow}</span> : eyebrow}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0B1B3D] leading-[1.15]">
            {title}
          </h1>
          {subtitle && (
            <p className="font-sans text-slate-600 text-sm sm:text-base leading-relaxed">
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
