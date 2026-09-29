import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8 min-h-screen">
      <h1 className="text-4xl font-extrabold tracking-tight">About DreamPath</h1>
      
      <div className="p-4 bg-primary/10 border-l-4 border-primary rounded-r-md">
        <h3 className="font-bold text-primary mb-1">Non-Affiliation Disclaimer</h3>
        <p className="text-sm text-foreground/80 leading-relaxed">
          DreamPath is an independent, third-party consultancy platform. We are <strong>not officially affiliated with, endorsed by, or partnered with</strong> Gamuda, Yayasan Bank Rakyat, Maxis, Yayasan TM, JPA, or any other scholarship provider listed on this site. All trademarks, logos, and brand names are the property of their respective owners.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Our Mission: Trust Before AI</h2>
        <p className="text-foreground/80 leading-relaxed">
          The scholarship application process is overwhelming. Students often waste hours applying for opportunities they do not qualify for due to hidden criteria or confusing guidelines.
        </p>
        <p className="text-foreground/80 leading-relaxed">
          DreamPath was built to solve this. Instead of relying on unpredictable AI "matching percentages," we use a strict, deterministic engine. We manually verify and map the exact rules from official provider portals into our system. When we say you meet the criteria, it's based on hard facts.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">How We Operate</h2>
        <ul className="list-disc list-inside space-y-2 text-foreground/80">
          <li><strong>Transparency:</strong> We link directly to the official source for every single intake.</li>
          <li><strong>Accuracy:</strong> Our data is rigorously tested against real-world criteria.</li>
          <li><strong>Privacy:</strong> Your data belongs to you. We provide simple tools to export or completely delete your profile at any time.</li>
        </ul>
      </section>

      <div className="pt-8">
        <Link href="/" className="text-primary font-medium hover:underline">&larr; Back to Home</Link>
      </div>
    </div>
  );
}
