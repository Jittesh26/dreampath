import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8 min-h-screen">
      <h1 className="text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
      
      <p className="text-sm text-muted-foreground">Last Updated: September 2026</p>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">1. Independent Platform</h2>
        <p className="text-foreground/80 leading-relaxed">
          DreamPath is an independent entity. <strong>We do not share your data directly with any scholarship providers.</strong> Using our platform does not constitute an official application to any scholarship program.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">2. Data We Collect</h2>
        <p className="text-foreground/80 leading-relaxed">
          When you create an account, we securely store the demographic and academic information (your <code>StudentProfile</code>) that you provide. This includes data such as your citizenship, household income band, CGPA, and specific SPM results. We only collect data necessary to evaluate your eligibility against verified rules.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">3. How We Use Your Data</h2>
        <p className="text-foreground/80 leading-relaxed">
          Your data is used strictly to power our deterministic Eligibility Engine. It allows us to seamlessly evaluate your profile against scholarship criteria without requiring you to re-enter your information. We do not sell your personal data to third parties.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">4. Data Portability & Deletion</h2>
        <p className="text-foreground/80 leading-relaxed">
          You maintain full control over your data. Through the <strong>Settings & Privacy</strong> dashboard, you can export your entire profile as a JSON file or permanently delete your account and all associated records from our systems at any time.
        </p>
      </section>

      <div className="pt-8">
        <Link href="/" className="text-primary font-medium hover:underline">&larr; Back to Home</Link>
      </div>
    </div>
  );
}
