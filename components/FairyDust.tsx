import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState, DualPosition } from '../types';
import { TREE_CONFIG, COLORS } from '../constants';

interface FairyDustProps {
  state: TreeState;
}

const FairyDust: React.FC<FairyDustProps> = ({ state }) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate Data
  const { positions, colors, sizes, phases, attributes } = useMemo(() => {
    const count = TREE_CONFIG.dustCount;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const s = new Float32Array(count);
    const ph = new Float32Array(count);
    const attrs: DualPosition[] = [];
    
    const colorHelper = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Formed: Spiral around the tree
      const t = Math.random(); 
      const y = t * TREE_CONFIG.height - (TREE_CONFIG.height / 2); // Spread vertically
      const rBase = (1 - t) * TREE_CONFIG.radius + 1.2; // Slightly outside foliage
      const angle = Math.random() * Math.PI * 2;
      
      const x = rBase * Math.cos(angle);
      const z = rBase * Math.sin(angle);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Chaos: Random explosion
      const u = Math.random();
      const v = Math.random();
      const phi = Math.acos(2 * v - 1);
      const lam = 2 * Math.PI * u;
      const chaosR = 25 * Math.cbrt(Math.random());

      attrs.push({
        chaos: new THREE.Vector3(chaosR * Math.sin(phi) * Math.cos(lam), chaosR * Math.sin(phi) * Math.sin(lam), chaosR * Math.cos(phi)),
        target: new THREE.Vector3(x, y, z), // Initial target base
        current: new THREE.Vector3(x, y, z),
        speed: Math.random() * 0.5 + 0.2, // Slower rising speed
      });

      // Colors: Gold, Silver, and faint Pink (Luxury Palette)
      const rand = Math.random();
      if (rand > 0.6) {
        colorHelper.copy(COLORS.gold);
      } else if (rand > 0.3) {
        colorHelper.copy(COLORS.silver);
      } else {
        colorHelper.set(COLORS.uiPink); // Add touch of pink
      }
      
      col[i * 3] = colorHelper.r;
      col[i * 3 + 1] = colorHelper.g;
      col[i * 3 + 2] = colorHelper.b;

      // Size & Phase
      s[i] = Math.random() * 0.2 + 0.1; // Random size
      ph[i] = Math.random() * Math.PI * 2; // Random blink phase
    }

    return { positions: pos, colors: col, sizes: s, phases: ph, attributes: attrs };
  }, []);

  // Interaction Vectors
  const mouseRay = useMemo(() => new THREE.Ray(), []);
  const vec = useMemo(() => new THREE.Vector3(), []);
  const closestPoint = useMemo(() => new THREE.Vector3(), []);
  const distVec = useMemo(() => new THREE.Vector3(), []);
  const tempVec = useMemo(() => new THREE.Vector3(), []);

  // Shader Uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);

  // Shaders for Enhanced Sparkle Effect
  const vertexShader = `
    uniform float uTime;
    attribute float aSize;
    attribute vec3 aColor;
    attribute float aPhase;
    varying vec3 vColor;
    varying float vAlpha;
    
    void main() {
      vColor = aColor;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Sparkle Physics
      // Use a faster sine wave combined with a power function to create sharp "flashes"
      // instead of a smooth slow pulse.
      float pulse = sin(uTime * 3.0 + aPhase);
      float sparkle = pow(pulse * 0.5 + 0.5, 10.0); // Sharp peak
      
      // Dynamic Size: Particles "pop" when they sparkle
      float sizeMod = 1.0 + sparkle * 0.8;
      
      // Distance attenuation
      gl_PointSize = (aSize * sizeMod) * (200.0 / -mvPosition.z);
      
      // Alpha: Faint when resting, bright when sparkling
      vAlpha = 0.15 + sparkle * 0.85; 
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;
    
    void main() {
      // Soft circular particle
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;
      
      // Glow falloff
      float glow = 1.0 - (r * 2.0);
      glow = pow(glow, 2.0); 
      
      gl_FragColor = vec4(vColor, vAlpha * glow);
    }
  `;

  useFrame((stateThree, delta) => {
    if (!pointsRef.current) return;
    
    const positionsAttribute = pointsRef.current.geometry.attributes.position;
    const isChaos = state === TreeState.CHAOS;
    const time = stateThree.clock.elapsedTime;
    
    // Update Uniforms
    (pointsRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = time;

    // Update Interaction Ray
    stateThree.raycaster.setFromCamera(stateThree.pointer, stateThree.camera);
    mouseRay.copy(stateThree.raycaster.ray);

    for (let i = 0; i < TREE_CONFIG.dustCount; i++) {
      const attr = attributes[i];

      // 1. Base Movement
      if (isChaos) {
        attr.current.lerp(attr.chaos, delta * 2.0);
      } else {
        // Spiral Rise
        const yBase = attr.target.y;
        let newY = yBase + (time * attr.speed * 0.5); // Slower rise
        const h = TREE_CONFIG.height + 4;
        newY = ((newY + h/2) % h) - h/2;

        const t = 1 - ((newY + TREE_CONFIG.height/2) / TREE_CONFIG.height);
        const rCurrent = Math.max(0, t * TREE_CONFIG.radius + 1.2);
        
        const angle = Math.atan2(attr.target.z, attr.target.x) + time * 0.2 * (i % 2 === 0 ? 1 : -1);

        const targetX = rCurrent * Math.cos(angle);
        const targetZ = rCurrent * Math.sin(angle);
        
        attr.current.x += (targetX - attr.current.x) * delta * 2;
        attr.current.y += (newY - attr.current.y) * delta * 5;
        attr.current.z += (targetZ - attr.current.z) * delta * 2;
      }

      // 2. Mouse Interaction (Same as TreeParticles)
      vec.subVectors(attr.current, mouseRay.origin);
      const projection = vec.dot(mouseRay.direction);

      if (projection > 0) {
          closestPoint.copy(mouseRay.origin).addScaledVector(mouseRay.direction, projection);
          distVec.subVectors(attr.current, closestPoint);
          const distSq = distVec.lengthSq();

          if (isChaos) {
             // Attraction & Swirl
             if (distSq < 36.0) { 
                const dist = Math.sqrt(distSq);
                if (dist > 0.01) {
                    const factor = (1.0 - dist / 6.0);
                    // Attraction
                    vec.copy(distVec).multiplyScalar(factor * 10.0 * delta / dist);
                    attr.current.sub(vec);
                    // Swirl
                    tempVec.crossVectors(mouseRay.direction, distVec).normalize().multiplyScalar(factor * 20.0 * delta);
                    attr.current.add(tempVec);
                }
             }
          } else {
              // Repulsion
              if (distSq < 3.0) { // Slightly larger interaction radius for dust
                  const strength = (3.0 - distSq) * 3.0 * delta;
                  distVec.normalize().multiplyScalar(strength);
                  attr.current.add(distVec);
              }
          }
      }

      positionsAttribute.setXYZ(i, attr.current.x, attr.current.y, attr.current.z);
    }
    
    positionsAttribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aColor" count={colors.length / 3} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={sizes.length} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aPhase" count={phases.length} array={phases} itemSize={1} />
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

export default FairyDust;