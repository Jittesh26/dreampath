'use client';

import { useState } from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { ResumeContent } from '@/domain/resume';
import { StandardAcademicTemplate } from './templates/StandardAcademicTemplate';
import { ModernTechTemplate } from './templates/ModernTechTemplate';
import { Button } from '@/components/ui/button';

export type TemplateId = 'academic' | 'modern';

interface PDFPreviewContentProps {
  content: ResumeContent;
  title?: string;
  initialTemplate?: TemplateId;
  onClose: () => void;
}

export default function PDFPreviewContent({
  content,
  title,
  initialTemplate = 'academic',
  onClose,
}: PDFPreviewContentProps) {
  const [templateId, setTemplateId] = useState<TemplateId>(initialTemplate);

  const baseName = (content.personal?.fullName || title || 'Resume').replace(/[^a-zA-Z0-9_-]/g, '_');
  const templateSuffix = templateId === 'academic' ? 'Academic' : 'ModernTech';
  const fileName = `${baseName}_Resume_${templateSuffix}.pdf`;

  const templateDocument =
    templateId === 'academic' ? (
      <StandardAcademicTemplate content={content} />
    ) : (
      <ModernTechTemplate content={content} />
    );

  return (
    <div className="flex flex-col h-full bg-[#FAFAF9]">
      {/* Modal Top Bar */}
      <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-primary">
            PDF Preview &amp; Export
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            {templateId === 'academic'
              ? 'Classic Malaysian Academic & Scholarship Template (A4)'
              : 'Modern Tech & Engineering ATS Template (A4)'}
          </p>
        </div>

        {/* Center: Template Switcher Segmented Control */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setTemplateId('academic')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              templateId === 'academic'
                ? 'bg-white text-primary shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Classic Academic
          </button>
          <button
            type="button"
            onClick={() => setTemplateId('modern')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              templateId === 'modern'
                ? 'bg-white text-primary shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Modern Tech
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          {/* One-click direct PDF Download */}
          <PDFDownloadLink
            key={templateId}
            document={templateDocument}
            fileName={fileName}
          >
            {({ loading }) => (
              <Button
                size="sm"
                disabled={loading}
                className="bg-[#0B1B3D] text-[#FAFAF9] hover:bg-[#0B1B3D]/90 shadow-sm flex items-center gap-1.5"
              >
                <span>📥</span>
                <span>{loading ? 'Preparing PDF...' : 'Download PDF'}</span>
              </Button>
            )}
          </PDFDownloadLink>

          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-500">
            Close
          </Button>
        </div>
      </div>

      {/* Embedded Live PDF Viewer (keyed by templateId for clean fresh re-render) */}
      <div className="flex-1 p-3 sm:p-6 bg-slate-100 flex items-center justify-center overflow-hidden">
        <div className="w-full h-full max-w-4xl bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
          <PDFViewer
            key={templateId}
            width="100%"
            height="100%"
            showToolbar={true}
            className="border-none w-full h-full"
          >
            {templateDocument}
          </PDFViewer>
        </div>
      </div>
    </div>
  );
}
