import { SiteNav } from '@/components/home/SiteNav';
import { Hero } from '@/components/home/Hero';
import { TruthStrip } from '@/components/home/TruthStrip';
import { ScholarshipDiscovery } from '@/components/home/ScholarshipDiscovery';
import { HowItWorks } from '@/components/home/HowItWorks';
import { Footer } from '@/components/home/Footer';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#FAFAF9] home-scoped">
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <TruthStrip />
        <ScholarshipDiscovery />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}
