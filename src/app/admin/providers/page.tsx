import { db } from '@/db';
import { providers } from '@/db/schema';
import { createProvider } from '@/app/actions/admin';
import Link from 'next/link';
import { Plus, ExternalLink, ArrowLeft } from 'lucide-react';

export default async function AdminProvidersPage() {
  const allProviders = await db.select().from(providers);

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B3D]">
          Scholarship Providers ({allProviders.length})
        </h1>
        <p className="font-sans text-slate-500 text-sm mt-1">
          Official foundations, government ministries, and corporate sponsors verified on DreamPath.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Providers List (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="divide-y divide-slate-100">
            {allProviders.map((p) => (
              <div key={p.id} className="py-4 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-bold text-[#0B1B3D]">{p.name}</h3>
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-800 hover:underline flex items-center gap-1"
                    >
                      <span>Official URL</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Add Provider Form (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-slate-700" />
            <h2 className="font-serif text-lg font-bold text-[#0B1B3D]">Add New Provider</h2>
          </div>

          <form action={createProvider} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Provider Name</label>
              <input
                name="name"
                required
                placeholder="e.g. Yayasan Khazanah"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Official Website URL</label>
              <input
                name="url"
                type="url"
                required
                placeholder="https://..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Description / Mission</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Background overview of the provider and mandate..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#0B1B3D] text-white text-xs font-bold rounded-xl hover:bg-[#132A5C] transition-colors"
            >
              Save Provider
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
