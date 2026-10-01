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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 font-sans">
          Scholarship <span className="font-serif italic font-normal text-blue-900">Providers</span> ({allProviders.length})
        </h1>
        <p className="font-sans text-slate-600 text-sm mt-1 font-normal">
          Official foundations, government ministries, and corporate sponsors verified on DreamPath.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Providers List (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="divide-y divide-slate-100">
            {allProviders.map((p) => (
              <div key={p.id} className="py-4 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-sans text-base font-bold text-slate-900">{p.name}</h3>
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 transition-colors"
                    >
                      <span>Official Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">{p.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Add Provider Form (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-slate-900" />
            <h2 className="font-sans text-base font-bold text-slate-950">Add New Provider</h2>
          </div>

          <form action={createProvider} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Provider Name</label>
              <input
                name="name"
                required
                placeholder="e.g. Yayasan Khazanah"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Official Website URL</label>
              <input
                name="url"
                type="url"
                required
                placeholder="https://..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Description / Mission</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Background overview of the provider and mandate..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-normal focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Save Provider
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
