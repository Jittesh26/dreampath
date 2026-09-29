'use client';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { useEffect, useRef } from 'react';

export function Hero() {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && pathRef.current) {
          pathRef.current.classList.add('is-drawn');
        }
      });
    }, { threshold: 0.1 });

    if (pathRef.current) {
      observer.observe(pathRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <section className="w-full py-24 md:py-32 bg-dot-pattern relative overflow-hidden">
      <div className="container px-4 md:px-6 mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-7 flex flex-col space-y-8 z-10">
          <h1 className="font-serif text-[#0B1B3D] text-5xl md:text-7xl font-normal leading-[1.1] tracking-tight">
            Your Officially Verified Path to Malaysian Scholarships
          </h1>
          <p className="font-sans text-slate-600 text-lg md:text-xl max-w-2xl font-medium">
            Stop guessing. We verify eligibility rules directly against official provider sources, guaranteeing you only apply to what you actually qualify for.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link href="/scholarships" className={buttonVariants({ variant: "default", size: "lg", className: "w-full sm:w-auto font-bold text-base px-8 h-12" })}>
              Discover Scholarships
            </Link>
            <Link href="/about" className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full sm:w-auto font-bold text-base px-8 h-12" })}>
              How We Verify
            </Link>
          </div>
        </div>
        
        <div className="md:col-span-5 relative h-[400px] flex items-center justify-center hidden md:flex">
          {/* Amber SVG path connecting cards */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              ref={pathRef}
              d="M 50 100 C 150 100 150 300 250 300 C 300 300 350 250 350 200" 
              stroke="#D97706" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              pathLength="1"
              className="path-draw"
            />
          </svg>
          
          {/* Layered Cards */}
          <div className="absolute top-10 left-10 bg-white border border-slate-200 p-4 shadow-md rounded-md transform -rotate-3 z-10 w-64">
            <p className="font-sans text-xs text-slate-500 uppercase font-bold mb-1">Step 1</p>
            <p className="font-serif text-[#0B1B3D] text-xl">Discover</p>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 p-4 shadow-lg rounded-md z-20 w-64">
            <p className="font-sans text-xs text-[#B45309] uppercase font-bold mb-1">Step 2</p>
            <p className="font-serif text-[#0B1B3D] text-xl">Check Eligibility</p>
          </div>
          <div className="absolute bottom-10 right-10 bg-white border border-slate-200 p-4 shadow-md rounded-md transform rotate-3 z-30 w-64">
            <p className="font-sans text-xs text-slate-500 uppercase font-bold mb-1">Step 3</p>
            <p className="font-serif text-[#0B1B3D] text-xl">Apply with Confidence</p>
          </div>
        </div>
      </div>
    </section>
  );
}
