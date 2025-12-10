import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState, DualPosition } from '../types';
import { TREE_CONFIG, COLORS, SHADERS } from '../constants';

interface TreeParticlesProps {
  state: TreeState;
}

const TreeParticles: React.FC<TreeParticlesProps> = ({ state }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Generate Data
  const { positions, chaosPositions, colors, sizes, attributes } = useMemo(() => {
    const count = TREE_CONFIG.foliageCount;
    const pos = new Float32Array(count * 3);
    const chaos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const s = new Float32Array(count);
    const attrs: DualPosition[] = [];

    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // 1. Tree Form (Cone)
      const yNorm = Math.random(); 
      const y = (yNorm - 0.5) * TREE_CONFIG.height;
      const radiusAtY = (1 - yNorm) * TREE_CONFIG.radius;
      const theta = Math.random() * Math.PI * 2;
      const r = radiusAtY * Math.sqrt(Math.random()); 
      
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // 2. Chaos Form
      const u = Math.random();
      const v = Math.random();
      const phi = Math.acos(2 * v - 1);
      const lam = 2 * Math.PI * u;
      const chaosR = 25 * Math.cbrt(Math.random()); 
      
      chaos[i * 3] = chaosR * Math.sin(phi) * Math.cos(lam);
      chaos[i * 3 + 1] = chaosR * Math.sin(phi) * Math.sin(lam);
      chaos[i * 3 + 2] = chaosR * Math.cos(phi);

      // 3. Colors
      const mix = Math.random();
      if (mix > 0.9) {
        tempColor.copy(COLORS.silver);
      } else if (mix > 0.6) {
        tempColor.copy(COLORS.deepGreen);
      } else {
        tempColor.copy(COLORS.emerald);
      }
      
      cols[i * 3] = tempColor.r;
      cols[i * 3 + 1] = tempColor.g;
      cols[i * 3 + 2] = tempColor.b;

      // 4. Size
      s[i] = Math.random() * 0.4 + 0.1;

      attrs.push({
        chaos: new THREE.Vector3(chaos[i * 3], chaos[i * 3 + 1], chaos[i * 3 + 2]),
        target: new THREE.Vector3(x, y, z),
        current: new THREE.Vector3(x, y, z),
        speed: Math.random() * 2 + 1
      });
    }

    return { positions: pos, chaosPositions: chaos, colors: cols, sizes: s, attributes: attrs };
  }, []);

  // Helper vectors for interaction
  const mouseRay = useMemo(() => new THREE.Ray(), []);
  const vec = useMemo(() => new THREE.Vector3(), []);
  const closestPoint = useMemo(() => new THREE.Vector3(), []);
  const distVec = useMemo(() => new THREE.Vector3(), []);
  const tempVec = useMemo(() => new THREE.Vector3(), []);

  // Animation Loop
  useFrame((stateThree, delta) => {
    if (!pointsRef.current) return;
    
    const positionsAttribute = pointsRef.current.geometry.attributes.position;
    const isChaos = state === TreeState.CHAOS;
    const targetKey = isChaos ? 'chaos' : 'target';

    // Update Raycaster for mouse interaction
    stateThree.raycaster.setFromCamera(stateThree.pointer, stateThree.camera);
    mouseRay.copy(stateThree.raycaster.ray);

    for (let i = 0; i < TREE_CONFIG.foliageCount; i++) {
      const attr = attributes[i];
      const target = attr[targetKey];
      
      // 1. Move towards target state
      const lerpFactor = THREE.MathUtils.clamp(delta * attr.speed * (isChaos ? 3.0 : 1.5), 0, 1);
      attr.current.lerp(target, lerpFactor);

      // 2. Mouse Interaction
      vec.subVectors(attr.current, mouseRay.origin);
      const projection = vec.dot(mouseRay.direction);

      if (projection > 0) {
          closestPoint.copy(mouseRay.origin).addScaledVector(mouseRay.direction, projection);
          distVec.subVectors(attr.current, closestPoint);
          const distSq = distVec.lengthSq();
          
          if (isChaos) {
             // Attraction & Swirl (Chaos Mode)
             // Interaction Radius ~ 6.0 units
             if (distSq < 36.0) { 
                const dist = Math.sqrt(distSq);
                if (dist > 0.01) {
                    const factor = (1.0 - dist / 6.0); // 1.0 at center, 0.0 at edge
                    
                    // Attraction Force (Pull IN towards ray)
                    const attractStr = factor * 15.0 * delta;
                    // Vector towards ray is -distVec. Normalized is distVec/dist.
                    // We calculate vector and subtract from current.
                    vec.copy(distVec).multiplyScalar(attractStr / dist);
                    attr.current.sub(vec);

                    // Swirl Force (Tangential rotation around ray)
                    const swirlStr = factor * 30.0 * delta;
                    // Tangent = Cross(RayDirection, RadiusVector)
                    tempVec.crossVectors(mouseRay.direction, distVec).normalize().multiplyScalar(swirlStr);
                    attr.current.add(tempVec);
                }
             }
          } else {
              // Repulsion (Tree Mode)
              // Interaction Radius = 2.0 (approx 1.4 units)
              if (distSq < 2.0) {
                  const strength = (2.0 - distSq) * 2.0 * delta; // Force strength
                  distVec.normalize().multiplyScalar(strength);
                  attr.current.add(distVec);
              }
          }
      }

      // 3. Ambient Noise
      if (!isChaos) {
        const time = stateThree.clock.elapsedTime;
        const noiseY = Math.sin(time + attr.target.x) * 0.05;
        positionsAttribute.setXYZ(i, attr.current.x, attr.current.y + noiseY, attr.current.z);
      } else {
        positionsAttribute.setXYZ(i, attr.current.x, attr.current.y, attr.current.z);
      }
    }
    
    positionsAttribute.needsUpdate = true;
    
    if (!isChaos) {
      pointsRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={SHADERS.foliageVertex}
        fragmentShader={SHADERS.foliageFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default TreeParticles;