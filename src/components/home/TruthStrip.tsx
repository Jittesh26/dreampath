export function TruthStrip() {
  return (
    <div className="w-full border-y border-slate-200 bg-white md:py-6 z-10 relative">
      <div className="container mx-auto px-0 md:px-4 flex flex-col md:flex-row justify-between items-stretch md:items-center text-left">
        <div className="flex-1 px-4 py-4 md:py-0 border-b border-slate-200 md:border-b-0 flex items-center justify-start md:justify-center">
          <p className="text-sm font-sans font-bold text-[#0B1B3D] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B45309] inline-block"></span>
            100% Verified Data
          </p>
        </div>
        <div className="flex-1 px-4 py-4 md:py-0 border-b border-slate-200 md:border-b-0 flex items-center justify-start md:justify-center">
          <p className="text-sm font-sans font-bold text-[#0B1B3D] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B45309] inline-block"></span>
            No AI Guesswork
          </p>
        </div>
        <div className="flex-1 px-4 py-4 md:py-0 flex items-center justify-start md:justify-center">
          <p className="text-sm font-sans font-bold text-[#0B1B3D] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B45309] inline-block"></span>
            Direct Provider Links
          </p>
        </div>
      </div>
    </div>
  );
}
