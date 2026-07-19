import React, { Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import ProblemSection from '@/components/ProblemSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import WhySection from '@/components/WhySection';
import TrustSection from '@/components/TrustSection';
import Footer from '@/components/Footer';


const Experience = lazy(() => import('@/components/Experience').then(module => ({ default: module.Experience })));

const Index = () => {
  return (
    <>
      <Helmet>
        <title>MargSathi - Women Safety Route Awareness | Know Your Route, Travel Safe</title>
        <meta name="description" content="MargSathi helps women evaluate route safety before traveling. Check your route, get safety awareness, and travel with confidence - day or night." />
        <meta name="keywords" content="women safety, route safety, travel safety, safe routes, India travel safety" />
      </Helmet>
      
      {}
      <Suspense fallback={<div className="fixed inset-0 bg-[#050505] z-[-1]" />}>
        <Experience />
      </Suspense>

      {}
      <div className="min-h-screen relative z-10">
        <Navbar />
        <main>
          <HeroSection />
          <ProblemSection />
          <section id="how-it-works">
            <HowItWorksSection />
          </section>
          <WhySection />
          <TrustSection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;