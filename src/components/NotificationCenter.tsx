'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Clock, Sparkles, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'deadline' | 'reopened' | 'update' | 'tip';
  link?: string;
  read: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Gamuda Scholarship Closing Soon',
    message: 'Intake cycle closes within 48 hours. Ensure your resume and essay are prepared.',
    timestamp: '2 hours ago',
    type: 'deadline',
    link: '/scholarships/d17042a6-eb13-4141-b952-449615287a2d',
    read: false,
  },
  {
    id: 'n2',
    title: 'Bank Negara Kijang Intake Verified',
    message: 'Central Bank of Malaysia 2026 criteria updated with confirmed SPM subject cutoffs.',
    timestamp: 'Yesterday',
    type: 'reopened',
    link: '/scholarships/3d1c2f80-73b0-4c3d-84dd-6c486cf2dae4',
    read: false,
  },
  {
    id: 'n3',
    title: 'ATS Resume Review Complete',
    message: 'Your resume has 0 structural warnings. Ready for official scholarship submission.',
    timestamp: '3 days ago',
    type: 'update',
    link: '/student/resume',
    read: true,
  },
];

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem('dreampath_notifications');
        if (stored) {
          const parsed = JSON.parse(stored) as NotificationItem[];
          // Migrate cached notifications to specific scholarship detail URLs
          const updated = parsed.map((item) => {
            if (item.id === 'n1' && (item.link === '/scholarships' || !item.link)) {
              return { ...item, link: '/scholarships/d17042a6-eb13-4141-b952-449615287a2d' };
            }
            if (item.id === 'n2' && (item.link === '/scholarships' || !item.link)) {
              return { ...item, link: '/scholarships/3d1c2f80-73b0-4c3d-84dd-6c486cf2dae4' };
            }
            return item;
          });
          setNotifications(updated);
          localStorage.setItem('dreampath_notifications', JSON.stringify(updated));
        }
      } catch {
        // default remains
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    try {
      localStorage.setItem('dreampath_notifications', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const markSingleRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    try {
      localStorage.setItem('dreampath_notifications', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`relative p-2 rounded-xl transition-all cursor-pointer ${
          isOpen
            ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-600/20'
            : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
        }`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-blue-600 rounded-full ring-2 ring-white animate-pulse" />
        )}
      </button>

      {isOpen && (
        <>
          {/* Outside click overlay */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/5 md:bg-transparent"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Notification Popover Panel: on mobile anchors cleanly within viewport margins; on desktop flyout to the right of the sidebar */}
          <div className="fixed inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:absolute sm:right-0 sm:mt-2 w-auto sm:w-96 max-w-sm ml-auto md:left-full md:right-auto md:top-[-6px] md:ml-5 md:mt-0 md:w-[380px] bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider font-sans">
                  Notifications
                </h4>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/70 px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-slate-500 hover:text-slate-900 font-semibold transition-colors cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="py-12 px-6 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Bell className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">All caught up!</p>
                  <p className="text-[11px] text-slate-500">No new notifications at the moment.</p>
                </div>
              ) : (
                notifications.map((item) => {
                  const cardContent = (
                    <>
                      <div className="shrink-0 mt-0.5">
                        {item.type === 'deadline' && (
                          <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                            <Clock className="w-4 h-4" />
                          </div>
                        )}
                        {item.type === 'reopened' && (
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                        {item.type === 'update' && (
                          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                            <Sparkles className="w-4 h-4" />
                          </div>
                        )}
                        {item.type === 'tip' && (
                          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!item.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                            )}
                            <p className={`text-xs font-semibold leading-snug truncate group-hover:text-blue-700 transition-colors ${item.read ? 'text-slate-800' : 'text-slate-950 font-bold'}`}>
                              {item.title}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>
                        {item.link && (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 group-hover:text-blue-900 transition-colors">
                            <span>View opportunity</span>
                            <span aria-hidden="true" className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                          </div>
                        )}
                      </div>
                    </>
                  );

                  const cardClass = `group p-3.5 sm:p-4 flex items-start gap-3 transition-colors cursor-pointer block ${
                    item.read
                      ? 'bg-white hover:bg-slate-50/80 opacity-80 hover:opacity-100'
                      : 'bg-blue-50/25 hover:bg-blue-50/50'
                  }`;

                  if (item.link) {
                    return (
                      <Link
                        key={item.id}
                        href={item.link}
                        onClick={() => {
                          markSingleRead(item.id);
                          setIsOpen(false);
                        }}
                        className={cardClass}
                      >
                        {cardContent}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => markSingleRead(item.id)}
                      className={cardClass}
                    >
                      {cardContent}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-center">
              <Link
                href="/student/settings"
                onClick={() => setIsOpen(false)}
                className="text-xs text-slate-600 hover:text-slate-950 font-semibold transition-colors inline-flex items-center gap-1"
              >
                <span>Notification & Alert Preferences</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

