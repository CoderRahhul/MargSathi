import React, { useEffect } from 'react';
import { casesData } from '../data/cases';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const GrainOverlay = () => (
  <div className="fixed inset-0 pointer-events-none opacity-20 z-0 mix-blend-overlay"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    }}
  />
);

const Inspiration = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0614] relative overflow-x-hidden selection:bg-[#8a2cff]/30 selection:text-white">
      <GrainOverlay />
      <Navbar />

      <div className="container mx-auto px-4 pt-32 pb-20 relative z-10">
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight font-display">
            THE REALITY
          </h1>
          <p className="text-xl md:text-2xl text-white/70 font-light mb-4">
            Inspiration Behind MargSathi
          </p>
          <p className="text-white/40 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            "Awareness is the first step toward safety. This platform exists because of real-world moments where silence cost lives."
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {casesData.map((item, index) => (
            <div
              key={index}
              className="group relative h-[450px] w-full overflow-hidden rounded-3xl bg-gray-900 border border-white/5 transition-[box-shadow,transform] duration-500 hover:shadow-[0_0_40px_-10px_rgba(138,44,255,0.3)] hover:-translate-y-2"
            >
              <img
                src={item.img}
                alt={item.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-30 grayscale group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0614] via-[#0b0614]/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
              <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col justify-end h-full">
                <div className="transform transition-transform duration-500 group-hover:-translate-y-2">
                  <span className="inline-block px-3 py-1 mb-3 text-xs font-bold tracking-widest text-[#8a2cff] uppercase bg-[#8a2cff]/10 rounded-full border border-[#8a2cff]/20 backdrop-blur-md">
                    {item.year}
                  </span>
                  <h3 className="text-3xl font-bold text-white leading-tight font-display">
                    {item.title}
                  </h3>
                </div>
                <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-out">
                  <div className="overflow-hidden">
                    <p className="text-gray-300 text-sm leading-relaxed mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 border-l-2 border-[#8a2cff] pl-4">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Inspiration;