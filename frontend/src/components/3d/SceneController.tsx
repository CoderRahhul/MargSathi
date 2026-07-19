import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useScroll, useTransform } from 'framer-motion';

export const SceneController = () => {
  const { camera } = useThree();
  const { scrollYProgress } = useScroll();

  // Transform scroll progress to camera position
  // Phase 1: Move to x:3, y:1.5, z:5
  // Phase 2: Move to x:-4, y:6, z:-2
  const x = useTransform(scrollYProgress, [0, 0.5, 1], [0, 3, -4]);
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [8, 1.5, 6]);
  const z = useTransform(scrollYProgress, [0, 0.5, 1], [12, 5, -2]);

  useLayoutEffect(() => {
    // Initial position
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 0, 0);

    // Subscribe to scroll updates to update camera manually on each frame if needed,
    // but useTransform values are reactive. However, Three.js camera needs manual update or useFrame.
    // Framer Motion's useScroll with Three.js usually requires binding to the frame loop.
    // simpler approach: use an effect to subscribe to changes if outside canvas, but this is inside Canvas.
    // Let's use a simpler subscriber for now or a useFrame from fiber if we were interpolating.
    // Actually, reactive values from useTransform can be read.

    // BETTER APPROACH: Since we are inside Canvas, we can use useFrame to apply the values.
    // But useTransform returns a MotionValue.
    const unsubscribeX = x.on("change", v => camera.position.x = v);
    const unsubscribeY = y.on("change", v => camera.position.y = v);
    const unsubscribeZ = z.on("change", v => camera.position.z = v);

    return () => {
      unsubscribeX();
      unsubscribeY();
      unsubscribeZ();
    };
  }, [camera, x, y, z]);

  return null;
};