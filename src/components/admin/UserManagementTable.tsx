'use client';

import React, { useState, useTransition } from 'react';
import { updateUserRole } from '@/app/actions/admin';
import {
  Shield,
  GraduationCap,
  Search,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';

interface UserRecord {
  id: string;
  email: string;
  role: string;
  createdAt: Date | string;
}

interface UserManagementTableProps {
  users: UserRecord[];
  currentUserId: string | null;
}

export function UserManagementTable({ users, currentUserId }: UserManagementTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'student'>('all');
  
  // Pending action modal state
  const [targetUser, setTargetUser] = useState<UserRecord | null>(null);
  const [proposedRole, setProposedRole] = useState<'admin' | 'student' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const adminCount = users.filter((u) => u.role === 'admin').length;

  const handleOpenConfirm = (user: UserRecord, nextRole: 'admin' | 'student') => {
    setModalError(null);
    setTargetUser(user);
    setProposedRole(nextRole);
  };

  const handleCloseModal = () => {
    if (isPending) return;
    setTargetUser(null);
    setProposedRole(null);
    setModalError(null);
  };

  const handleConfirmRoleChange = () => {
    if (!targetUser || !proposedRole) return;
    setModalError(null);

    startTransition(async () => {
      try {
        const result = await updateUserRole(targetUser.id, proposedRole);
        setFeedback({
          type: 'success',
          message: result.message || `Successfully updated ${targetUser.email} to ${proposedRole}.`,
        });
        setTargetUser(null);
        setProposedRole(null);
      } catch (err: any) {
        setModalError(err.message || 'Failed to update user role.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
            aria-label="Dismiss feedback"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
            Role:
          </span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              All ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'admin' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Admins ({adminCount})
            </button>
            <button
              onClick={() => setRoleFilter('student')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'student' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Students ({users.length - adminCount})
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrentUser = user.id === currentUserId;
                  const isAdmin = user.role === 'admin';
                  const isOnlyAdmin = isAdmin && adminCount <= 1;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{user.email}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                          ID: {user.id}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200/80">
                            <Shield className="w-3.5 h-3.5 text-purple-600" />
                            Administrator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                            Student
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(user.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isAdmin ? (
                          <button
                            type="button"
                            disabled={isOnlyAdmin}
                            title={
                              isOnlyAdmin
                                ? 'Cannot demote the last remaining administrator.'
                                : 'Demote this user to Student'
                            }
                            onClick={() => handleOpenConfirm(user, 'student')}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isOnlyAdmin
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                : 'border border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-100 hover:border-amber-400'
                            }`}
                          >
                            <UserX className="w-3.5 h-3.5 text-amber-700" />
                            <span>Demote to Student</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenConfirm(user, 'admin')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-2xs cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-amber-300" />
                            <span>Promote to Admin</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {targetUser && proposedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    proposedRole === 'admin'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                      : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                  }`}
                >
                  {proposedRole === 'admin' ? (
                    <Shield className="w-5 h-5 text-blue-700" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-amber-700" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-950">
                    {proposedRole === 'admin' ? 'Promote to Administrator' : 'Demote to Student'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-xs">
                    {targetUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={isPending}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanatory Context */}
            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {proposedRole === 'admin' ? (
                <>
                  <p className="font-medium text-slate-900">
                    This user will receive full administrator privileges:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                    <li>Access to the DreamPath Administrator Console (<code className="text-slate-800">/admin</code>)</li>
                    <li>Create, publish, and edit canonical scholarship entries</li>
                    <li>Run AI-assisted scholarship extractions</li>
                    <li>Promote or demote other users</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="font-medium text-slate-900">
                    This user will lose all administrative privileges:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                    <li>Access to <code className="text-slate-800">/admin</code> will be immediately revoked</li>
                    <li>They will be redirected to the student workspace</li>
                    <li>They will no longer be able to ingest or manage scholarships</li>
                  </ul>
                  {targetUser.id === currentUserId && (
                    <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] font-bold">
                      Warning: You are demoting your own account. Once applied, you will immediately lose administrative access to this console.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Error */}
            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={isPending}
                className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  proposedRole === 'admin'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {proposedRole === 'admin' ? 'Confirm Promotion' : 'Confirm Demotion'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
