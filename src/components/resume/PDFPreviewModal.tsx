'use client';

import dynamic from 'next/dynamic';
import { ResumeContent } from '@/domain/resume';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ResumeContent;
  title?: string;
  initialTemplate?: 'academic' | 'modern';
}

// Client-only dynamic import with SSR disabled to guarantee no hydration mismatch
const DynamicPDFPreviewContent = dynamic(
  () => import('./PDFPreviewContent'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full bg-[#FAFAF9] p-8 space-y-4">
        <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-600 font-sans">
          Initializing PDF Engine &amp; Rendering Template...
        </p>
        <p className="text-xs text-slate-400">
          Compiling A4 Malaysian Academic layout
        </p>
      </div>
    ),
  }
);

export default function PDFPreviewModal({
  isOpen,
  onClose,
  content,
  title,
  initialTemplate,
}: PDFPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <DynamicPDFPreviewContent
          content={content}
          title={title}
          initialTemplate={initialTemplate}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
