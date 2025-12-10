import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Snow: React.FC = () => {
  const mesh = useRef<THREE.Points>(null);
  const count = 1500;

  const { positions, randoms } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60; // x range
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40 + 10; // y range
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60; // z range

      rnd[i * 3] = Math.random(); // speed factor
      rnd[i * 3 + 1] = Math.random(); // sway offset x
      rnd[i * 3 + 2] = Math.random(); // sway offset z
    }
    return { positions: pos, randoms: rnd };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#ffffff') }
  }), []);

  const vertexShader = `
    uniform float uTime;
    attribute vec3 aRandom;
    varying float vAlpha;
    
    void main() {
      vec3 pos = position;
      float speed = 0.5 + aRandom.x * 1.5; // Speed variation
      
      // Fall logic
      float height = 50.0;
      float fall = uTime * speed;
      
      // Calculate continuous Y position
      float yOffset = mod(fall, height);
      pos.y = position.y - yOffset;
      
      // Reset logic to keep it within view
      if (pos.y < -15.0) pos.y += height;

      // --- WIND PHYSICS ---
      float t = uTime;
      
      // 1. Global Wind Gusts (Low frequency sine waves)
      // Simulates wind changing direction and strength over time. 
      // Added height (pos.y) factor for wind shear.
      float windStrength = 2.0; 
      float windX = sin(t * 0.4) * windStrength + sin(t * 0.1 + pos.y * 0.05) * 1.5;
      float windZ = cos(t * 0.3) * (windStrength * 0.5);

      // 2. Individual Particle Turbulence (High frequency)
      float swayFreq = 1.0 + aRandom.x; // Random frequency per particle
      float swayAmp = 0.3 + aRandom.y * 0.3; // Random amplitude
      
      float turbulenceX = sin(t * swayFreq + aRandom.z * 10.0) * swayAmp;
      float turbulenceZ = cos(t * swayFreq + aRandom.x * 10.0) * swayAmp;

      // Apply combined forces
      pos.x += windX + turbulenceX;
      pos.z += windZ + turbulenceZ;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size attenuation
      gl_PointSize = (80.0 / -mvPosition.z) * 0.6;
      
      vAlpha = 0.3 + aRandom.x * 0.4; // Soft random opacity
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    varying float vAlpha;
    
    void main() {
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;
      
      // Soft glow gradient
      float glow = 1.0 - (r * 2.0);
      glow = pow(glow, 1.5);
      
      gl_FragColor = vec4(uColor, vAlpha * glow);
    }
  `;

  useFrame((state) => {
    if (mesh.current) {
        (mesh.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={count} array={randoms} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial 
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Snow;