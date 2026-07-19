import React, { useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';


const ShieldMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#6366f1'),
    uRimColor: new THREE.Color('#a5b4fc')
  },

  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uRimColor;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;

    void main() {
      // 1. Fresnel (Edge Glow)
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);

      // Combine Effects
      float alpha = fresnel * 1.5;
      
      // Color mixing
      vec3 finalColor = mix(uColor, uRimColor, fresnel);

      // Reduced Master Opacity
      gl_FragColor = vec4(finalColor, alpha * 0.2); 
    }
  `
);

extend({ ShieldMaterial });

// Fix for: ES2015 module syntax is preferred over namespaces
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      shieldMaterial: any;
    }
  }
}

export const CityMap = () => {
  return (
    <group>
      { }
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#080808" roughness={0.1} metalness={0.8} />
      </mesh>

      { }
      <Shield />

    </group>
  );
};


const Shield = () => {
  const materialRef = useRef<any>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      { }
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[10, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <shieldMaterial
          ref={materialRef}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          uColor={new THREE.Color("#6366f1")}
          uRimColor={new THREE.Color("#a5b4fc")}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[9.8, 10, 32]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};