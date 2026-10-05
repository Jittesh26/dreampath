import { db } from '@/db';
import { users } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Shield, GraduationCap } from 'lucide-react';
import { UserManagementTable } from '@/components/admin/UserManagementTable';

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

  const adminCount = allUsers.filter((u) => u.role === 'admin').length;
  const studentCount = allUsers.filter((u) => u.role === 'student').length;

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 font-sans">
              Users &amp; <span className="font-serif italic font-normal text-blue-900">Role Management</span>
            </h1>
            <p className="font-sans text-slate-600 text-sm mt-1 font-normal max-w-2xl">
              Control system access and promote trusted users to administrators. Demotion protects against locking out the last remaining administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Registered</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="font-sans text-3xl font-black text-slate-950 my-1">{allUsers.length}</p>
          <span className="text-[11px] text-slate-400 font-medium">Supabase Auth linked accounts</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Administrators</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700 border border-purple-200/60">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="font-sans text-3xl font-black text-purple-950 my-1">{adminCount}</p>
          <span className="text-[11px] text-purple-600/80 font-medium">Console management access</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Students</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 border border-blue-200/60">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <p className="font-sans text-3xl font-black text-blue-950 my-1">{studentCount}</p>
          <span className="text-[11px] text-slate-400 font-medium">Student workspace access</span>
        </div>
      </div>

      {/* Users Table */}
      <UserManagementTable users={allUsers} currentUserId={user.id} />
    </div>
  );
}
