'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { updateApplicationStatus, deleteApplication } from '@/app/actions/student';
import {
  Kanban,
  Table as TableIcon,
  Calendar,
  Trash2,
  Clock
} from 'lucide-react';

export interface ApplicationItem {
  id: string;
  status: string;
  updatedAt: Date | string;
  scholarshipId: string;
  scholarshipName: string;
  providerName: string;
  closeDate: string | null;
  sourceUrl?: string;
}

const STAGES = [
  { key: 'saved', label: 'Saved', color: 'bg-slate-100 text-slate-700' },
  { key: 'planning', label: 'Planning', color: 'bg-blue-50 text-blue-700' },
  { key: 'applying', label: 'In Progress', color: 'bg-amber-50 text-amber-800' },
  { key: 'submitted', label: 'Submitted', color: 'bg-purple-50 text-purple-700' },
  { key: 'interview', label: 'Interview', color: 'bg-indigo-50 text-indigo-700' },
  { key: 'awarded', label: 'Awarded / Offer', color: 'bg-emerald-50 text-emerald-800' },
  { key: 'rejected', label: 'Unsuccessful', color: 'bg-rose-50 text-rose-700' },
];

export function ApplicationTrackerClient({
  initialApplications,
}: {
  initialApplications: ApplicationItem[];
}) {
  const [apps, setApps] = useState<ApplicationItem[]>(initialApplications);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [, startTransition] = useTransition();

  const handleStatusChange = (appId: string, newStatus: string) => {
    // Optimistic update
    setApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: newStatus, updatedAt: new Date() } : a))
    );

    startTransition(async () => {
      await updateApplicationStatus(appId, newStatus);
    });
  };

  const handleDelete = (appId: string) => {
    if (!confirm('Remove this scholarship from your application tracker?')) return;
    setApps((prev) => prev.filter((a) => a.id !== appId));
    startTransition(async () => {
      await deleteApplication(appId);
    });
  };

  return (
    <div className="space-y-6">
      {/* Control bar: Switch between Kanban and List view */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">View:</span>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table List</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span>Tracking <strong className="text-slate-900">{apps.length}</strong> active scholarship pipelines</span>
          <Link
            href="/scholarships"
            className="px-3 py-1.5 bg-[#0B1B3D] hover:bg-[#132A5C] text-white rounded-lg font-bold transition-colors"
          >
            + Add Scholarship
          </Link>
        </div>
      </div>

      {/* Empty State */}
      {apps.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <Clock className="w-12 h-12 text-amber-700/60 mx-auto" />
          <h3 className="font-serif text-2xl font-bold text-[#0B1B3D]">Your Application Pipeline is Empty</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Save scholarships from the catalogue or run an eligibility check to start tracking your deadlines and interview dates.
          </p>
          <Link
            href="/scholarships"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0B1B3D] text-white text-xs font-bold rounded-xl hover:bg-[#132A5C] transition-colors"
          >
            Browse Verified Opportunities &rarr;
          </Link>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {STAGES.map((col) => {
            const colApps = apps.filter((a) => a.status === col.key);
            return (
              <div
                key={col.key}
                className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col min-h-[480px] space-y-3"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{colApps.length}</span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-3">
                  {colApps.map((app) => (
                    <div
                      key={app.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all space-y-3"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {app.providerName}
                        </span>
                        <Link
                          href={`/scholarships/${app.scholarshipId}`}
                          className="font-serif text-sm font-bold text-[#0B1B3D] hover:text-amber-800 line-clamp-2"
                        >
                          {app.scholarshipName}
                        </Link>
                      </div>

                      {app.closeDate && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Deadline: {new Date(app.closeDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      )}

                      {/* Stage Selector Dropdown */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          className="text-[11px] p-1 bg-slate-50 border border-slate-200 rounded text-slate-700 font-semibold focus:outline-none"
                        >
                          {STAGES.map((s) => (
                            <option key={s.key} value={s.key}>
                              Move: {s.label}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleDelete(app.id)}
                          aria-label="Delete application"
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <th className="p-4">Scholarship</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Pipeline Stage</th>
                <th className="p-4">Deadline (MYT)</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {apps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-4 font-bold text-slate-900">
                    <Link href={`/scholarships/${app.scholarshipId}`} className="hover:text-amber-800">
                      {app.scholarshipName}
                    </Link>
                  </td>
                  <td className="p-4 text-slate-600">{app.providerName}</td>
                  <td className="p-4">
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                    >
                      {STAGES.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    {app.closeDate
                      ? new Date(app.closeDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'TBA'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      {app.closeDate && (
                        <Link
                          href={`/api/scholarships/export-ics?name=${encodeURIComponent(app.scholarshipName)}&provider=${encodeURIComponent(app.providerName)}&closeDate=${encodeURIComponent(app.closeDate)}`}
                          title="Export deadline to calendar"
                          className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-md"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      <button
                        onClick={() => handleDelete(app.id)}
                        title="Remove"
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
