import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8 min-h-screen">
      <h1 className="text-4xl font-extrabold tracking-tight">Terms of Service</h1>
      
      <p className="text-sm text-muted-foreground">Last Updated: September 2026</p>

      <div className="p-4 bg-destructive/10 border-l-4 border-destructive rounded-r-md">
        <h3 className="font-bold text-destructive mb-1">Disclaimer of Liability</h3>
        <p className="text-sm text-foreground/80 leading-relaxed">
          DreamPath is a third-party discovery tool. While we rigorously strive to verify all requirement data, official scholarship criteria are subject to change by the respective providers at any time without notice. DreamPath cannot be held liable for missed deadlines, rejected applications, or discrepancies in eligibility. <strong>Always verify requirements on the official provider portal before applying.</strong>
        </p>
      </div>

      <section className="space-y-4 mt-8">
        <h2 className="text-2xl font-bold">1. Independent Service</h2>
        <p className="text-foreground/80 leading-relaxed">
          DreamPath is not affiliated with, endorsed by, or sponsored by any government agency, foundation, or corporation listed on this platform. The "Eligibility Check" feature is purely informational and does not guarantee an award.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">2. User Responsibilities</h2>
        <p className="text-foreground/80 leading-relaxed">
          By utilizing the platform, you agree to provide truthful and accurate information when checking eligibility. You acknowledge that any applications must be filed directly with the official provider, and our Application Tracker is strictly for your personal organization.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">3. Account Termination</h2>
        <p className="text-foreground/80 leading-relaxed">
          We reserve the right to suspend or terminate accounts that abuse the platform, submit malicious data reports, or violate these terms. You may terminate your account at any time via the Settings page.
        </p>
      </section>

      <div className="pt-8">
        <Link href="/" className="text-primary font-medium hover:underline">&larr; Back to Home</Link>
      </div>
    </div>
  );
}
