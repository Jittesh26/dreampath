import { getResumes, createResume, deleteResume } from '@/app/actions/resume';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Resume Builder | DreamPath',
};

export default async function ResumeDashboard() {
  const resumes = await getResumes();

  async function handleCreate() {
    'use server';
    const newResume = await createResume('Untitled Resume');
    redirect(`/student/resume/${newResume.id}`);
  }

  async function handleDelete(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    await deleteResume(id);
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-serif text-primary">Resume Builder</h1>
        <form action={handleCreate}>
          <button 
            type="submit" 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 font-medium"
          >
            Create New Resume
          </button>
        </form>
      </div>

      <div className="bg-surface rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900">My Resumes</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your tailored resumes here.</p>
        </div>
        
        {resumes.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-gray-900 font-medium mb-2">No resumes yet</h3>
            <p className="text-gray-500 text-sm mb-6">Create your first resume to get started.</p>
            <form action={handleCreate}>
              <button 
                type="submit" 
                className="px-4 py-2 border border-gray-300 shadow-sm text-gray-700 bg-white rounded-md hover:bg-gray-50 font-medium text-sm"
              >
                Create New
              </button>
            </form>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {resumes.map((resume) => (
              <li key={resume.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between">
                <div>
                  <Link href={`/student/resume/${resume.id}`} className="text-lg font-medium text-primary hover:underline">
                    {resume.title}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    Last edited: {new Date(resume.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link 
                    href={`/student/resume/${resume.id}`}
                    className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20"
                  >
                    Edit
                  </Link>
                  <form action={handleDelete}>
                    <input type="hidden" name="id" value={resume.id} />
                    <button 
                      type="submit"
                      className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
