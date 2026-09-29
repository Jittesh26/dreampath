import { getResume } from '@/app/actions/resume';
import { notFound } from 'next/navigation';
import ResumeEditorClient from './ResumeEditorClient';
import { ResumeContent } from '@/domain/resume';

export default async function ResumeEditorPage(
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  let resume;
  try {
    resume = await getResume(params.id);
  } catch {
    notFound();
  }
  
  const formattedResume = {
    ...resume,
    content: resume.content as ResumeContent
  };
  
  return <ResumeEditorClient resume={formattedResume} />;
}
