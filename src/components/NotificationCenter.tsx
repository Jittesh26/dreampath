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
    link: '/scholarships',
    read: false,
  },
  {
    id: 'n2',
    title: 'Bank Negara Kijang Intake Verified',
    message: 'Central Bank of Malaysia 2026 criteria updated with confirmed SPM subject cutoffs.',
    timestamp: 'Yesterday',
    type: 'reopened',
    link: '/scholarships',
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
          setNotifications(JSON.parse(stored));
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

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        className="relative p-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-amber-600"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-600 rounded-full ring-2 ring-white animate-pulse" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-slate-500 hover:text-slate-900 font-medium"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No notifications at the moment.
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => markSingleRead(item.id)}
                    className={`p-3.5 flex gap-3 transition-colors ${
                      item.read ? 'bg-white opacity-80' : 'bg-amber-50/30'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {item.type === 'deadline' && (
                        <div className="p-1.5 bg-rose-50 text-rose-600 rounded-md">
                          <Clock className="w-4 h-4" />
                        </div>
                      )}
                      {item.type === 'reopened' && (
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      {item.type === 'update' && (
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}
                      {item.type === 'tip' && (
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-xs font-semibold ${item.read ? 'text-slate-800' : 'text-slate-900 font-bold'}`}>
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">{item.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      {item.link && (
                        <Link
                          href={item.link}
                          onClick={() => setIsOpen(false)}
                          className="mt-1.5 inline-block text-[11px] font-semibold text-amber-700 hover:text-amber-900 hover:underline"
                        >
                          View opportunity &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
              <Link
                href="/student/settings"
                onClick={() => setIsOpen(false)}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                Notification & Alert Preferences &rarr;
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
