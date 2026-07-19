import React, { useRef } from 'react';
import { MapPin, Navigation, Search, CheckCircle, ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

const steps = [
  { icon: MapPin, step: '01', title: 'Start', desc: 'Input your current location.' },
  { icon: Navigation, step: '02', title: 'End', desc: 'Set your destination.' },
  { icon: Search, step: '03', title: 'Scan', desc: 'AI analyzes 50+ risk factors.' },
  { icon: CheckCircle, step: '04', title: 'Go', desc: 'Follow the illuminated path.' },
];

const HowItWorksSection = () => {
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: targetRef });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);




  const xDesktop = useTransform(scrollYProgress, [0, 1], ["0%", "-60%"]);
  const xMobile = useTransform(scrollYProgress, [0, 1], ["0%", "-85%"]);
  const x = isMobile ? xMobile : xDesktop;



  const titleOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  const titleX = useTransform(scrollYProgress, [0, 0.15], ["0%", "-20%"]);

  return (
    <section ref={targetRef} className="relative h-[300vh] bg-brand-dark">


      <div className="sticky top-0 flex h-screen items-center overflow-hidden">


        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-purple/10 rounded-full blur-[120px] pointer-events-none" />


        <motion.div
          style={{ opacity: titleOpacity, x: titleX }}
          className="absolute left-8 lg:left-20 top-1/2 -translate-y-1/2 z-20 max-w-sm p-8"
        >
          <div className="text-brand-teal font-mono text-sm mb-4 tracking-widest">SYSTEM_PROCESS</div>
          <h2 className="font-display text-6xl font-bold mb-6 text-white leading-tight">How It<br />Works</h2>
          <p className="text-white/50 text-lg mb-8">
            An intelligent workflow designed for speed and safety.
          </p>
          <div className="flex items-center gap-2 text-brand-purple animate-pulse">
            <span className="text-xs font-bold uppercase tracking-widest">Scroll Down</span>
            <ArrowRight className="w-4 h-4 rotate-90" />
          </div>
        </motion.div>


        <motion.div style={{ x }} className="flex gap-8 pl-[600px] items-center will-change-transform">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative h-[450px] w-[350px] shrink-0 rounded-[2rem] bg-white/5 border border-white/10 p-10 flex flex-col justify-end backdrop-blur-md transition-colors hover:bg-white/10 hover:border-brand-teal/30 group"
            >
              <div className="absolute top-8 right-8 text-8xl font-bold text-white/5 font-display group-hover:text-brand-teal/10 transition-colors">
                {step.step}
              </div>
              <div className="mb-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-dark flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                <step.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-4xl font-bold text-white mb-4">{step.title}</h3>
              <p className="text-white/60 text-lg">{step.desc}</p>
            </div>
          ))}

          <div className="w-[200px]" />
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;