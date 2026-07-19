import React from 'react';
import { AlertTriangle, Moon, MapPin, Eye } from 'lucide-react';

const problems = [
  {
    icon: AlertTriangle,
    title: 'Safety Concerns',
    description: 'Women face unique safety challenges while traveling, especially in unfamiliar areas or during certain hours.',
  },
  {
    icon: Moon,
    title: 'Late Night Risks',
    description: 'Traveling during late-night hours can expose women to higher risks due to reduced visibility and fewer people around.',
  },
  {
    icon: MapPin,
    title: 'Unsafe Routes',
    description: 'Some routes may pass through areas with poor lighting, isolated stretches, or historically higher incident rates.',
  },
  {
    icon: Eye,
    title: 'Lack of Awareness',
    description: 'Without proper information, travelers cannot make informed decisions about the safest route to take.',
  },
];

const ProblemSection = () => {
  return (
    <section className="py-24 bg-card relative overflow-hidden">
      { }
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="container px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-coral/10 text-coral rounded-full text-sm font-medium mb-4">
            The Challenge
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Route Awareness Matters
          </h2>
          <p className="text-lg text-muted-foreground">
            Understanding the challenges women face while traveling is the first step toward creating safer journeys.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, index) => (
            <div
              key={problem.title}
              className="group bg-background rounded-2xl p-6 shadow-card hover:shadow-elevated transition-[box-shadow,transform] duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <problem.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">
                {problem.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
