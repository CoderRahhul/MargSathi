import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLenis } from '@studio-freight/react-lenis';

const ScrollToAnchor = () => {
  const { hash } = useLocation();
  const lenis = useLenis();
  const isMounted = useRef(false);

  useEffect(() => {
    if (hash && lenis) {
      
      const id = hash.replace('#', '');
      const element = document.getElementById(id);

      if (element) {
        
        lenis.scrollTo(element, { 
          offset: -50, 
          duration: 1.5 
        });
      }
    }
  }, [hash, lenis, useLocation]);

  return null;
};

export default ScrollToAnchor;