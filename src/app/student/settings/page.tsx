import { PrivacyControls } from '@/components/PrivacyControls';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-instrument text-4xl font-bold tracking-tight text-primary">Settings & Privacy</h1>
        <p className="font-jakarta text-slate-500 mt-2 text-lg">Manage your account and exercise your data rights.</p>
      </div>

      <div className="pt-4">
        <PrivacyControls />
      </div>
    </div>
  );
}
