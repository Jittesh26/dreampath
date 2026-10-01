import { PrivacyControls } from '@/components/PrivacyControls';
import { PageHeader } from '@/components/design-system';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        breadcrumbs={[
          { label: 'Student Workspace', href: '/student' },
          { label: 'Settings & Privacy' },
        ]}
        eyebrow="Account Governance & Data Rights"
        title="Settings & Privacy"
        subtitle="Manage your account preferences, exercise statutory data portability rights under PDPA, and control profile visibility."
      />

      <div className="pt-2">
        <PrivacyControls />
      </div>
    </div>
  );
}
