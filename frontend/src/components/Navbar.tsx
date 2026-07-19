import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import logo from '@/assets/logo.png';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {

      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Check Route', path: '/check-route' },
    { name: 'How It Works', path: '/#how-it-works' },
    { name: 'Inspiration', path: '/inspiration' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-[padding] duration-500 ${isScrolled ? 'py-4' : 'py-6'
      }`}>
      <div className="container px-4">
        <div className={`mx-auto max-w-7xl rounded-full transition-colors duration-500 px-6 h-16 flex items-center justify-between ${isScrolled
          ? 'bg-[#0b0614]/80 backdrop-blur-xl border border-white/10 shadow-lg'
          : 'bg-transparent'
          }`}>


          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
            <span className="font-display text-xl font-bold text-white">
              Marg<span className="text-brand-purple">Sathi</span>
            </span>
          </Link>


          <div className="hidden xl:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>


          <div className="hidden xl:block">
            <a
              href="https://github.com/CoderRahhul#-about-me"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-white text-brand-dark hover:bg-brand-teal hover:text-white font-semibold rounded-full px-6 transition-all duration-300">
                About Me
              </Button>
            </a>
          </div>


          <div className="xl:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="w-[300px] bg-[#0a0a0a] border-r border-white/10 text-white z-[100]">
                <SheetHeader className="mb-8 text-left">
                  <SheetTitle>
                    <Link to="/" className="flex items-center gap-3">
                      <img
                        src={logo}
                        alt="Logo"
                        className="h-10 w-auto object-contain"
                      />
                      <span className="font-display text-xl font-bold text-white">
                        Marg<span className="text-brand-purple">Sathi</span>
                      </span>
                    </Link>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-6">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      className="text-lg font-medium text-white/70 hover:text-brand-purple transition-colors"
                    >
                      {item.name}
                    </Link>
                  ))}
                  <a
                    href="https://github.com/CoderRahhul#-about-me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4"
                  >
                    <Button className="w-full bg-brand-purple text-white hover:bg-brand-teal hover:text-brand-dark font-semibold rounded-lg py-6 transition-all duration-300">
                      About Me
                    </Button>
                  </a>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;