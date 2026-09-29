'use client';
import { useEffect, useRef } from 'react';

export function HowItWorks() {
  const lineRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && lineRef.current) {
          lineRef.current.classList.add('is-drawn');
        }
      });
    }, { threshold: 0.2 });

    if (lineRef.current) {
      observer.observe(lineRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const steps = [
    { title: "Discover", desc: "Find opportunities tailored to your profile." },
    { title: "Check", desc: "Verify eligibility against official rules." },
    { title: "Understand", desc: "Get clear reasons for your match status." },
    { title: "Apply", desc: "Proceed securely to the provider's portal." },
  ];

  return (
    <section className="w-full py-24 bg-[#0B1B3D] text-white relative overflow-hidden bg-navy-section">
      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <h2 className="font-serif text-4xl md:text-5xl text-center mb-20">The Clear Path Forward</h2>
        
        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <svg className="absolute top-12 left-0 w-full h-4 hidden md:block" preserveAspectRatio="none">
            <line 
              ref={lineRef}
              x1="10%" y1="2" x2="90%" y2="2" 
              stroke="#D97706" 
              strokeWidth="4" 
              pathLength="1"
              className="path-draw"
            />
          </svg>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center">
            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center relative">
                <div className="w-8 h-8 rounded-full bg-amber-500 mb-6 z-10 flex items-center justify-center font-bold text-[#0B1B3D]">
                  {idx + 1}
                </div>
                <h3 className="font-serif text-2xl mb-3">{step.title}</h3>
                <p className="font-sans text-slate-300 text-sm max-w-[200px]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
