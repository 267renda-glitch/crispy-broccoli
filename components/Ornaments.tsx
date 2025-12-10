import React, { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { TreeState, DualPosition } from '../types';
import { TREE_CONFIG, COLORS, MORANDI_PALETTE, PINK_PALETTE } from '../constants';

interface OrnamentsProps {
  state: TreeState;
}

// Wrap in forwardRef to expose the Sun Mesh for GodRays
const Ornaments = forwardRef<THREE.Mesh, OrnamentsProps>(({ state }, ref) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pearlRef = useRef<THREE.InstancedMesh>(null);
  const starRef = useRef<THREE.Group>(null);
  const sunMeshRef = useRef<THREE.Mesh>(null);

  // Expose the sun mesh to the parent
  useImperativeHandle(ref, () => sunMeshRef.current as THREE.Mesh);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Data Generation
  const { gemData, pearlData, gemColors, gemScales } = useMemo(() => {
    // Gems
    const gems: DualPosition[] = [];
    const gColors = new Float32Array(TREE_CONFIG.ornamentCount * 3);
    const gScales = new Float32Array(TREE_CONFIG.ornamentCount);

    for (let i = 0; i < TREE_CONFIG.ornamentCount; i++) {
        const yNorm = Math.random();
        const y = (yNorm - 0.5) * TREE_CONFIG.height;
        const radiusAtY = (1 - yNorm) * TREE_CONFIG.radius;
        const theta = Math.random() * Math.PI * 2;
        const x = radiusAtY * Math.cos(theta);
        const z = radiusAtY * Math.sin(theta);

        const chaosR = 30 * Math.cbrt(Math.random());
        // Chaos spherical position
        const u = Math.random();
        const v = Math.random();
        const phi = Math.acos(2 * v - 1);
        const lam = 2 * Math.PI * u;

        gems.push({
            target: new THREE.Vector3(x, y, z),
            chaos: new THREE.Vector3(chaosR * Math.sin(phi) * Math.cos(lam), chaosR * Math.sin(phi) * Math.sin(lam), chaosR * Math.cos(phi)),
            current: new THREE.Vector3(x, y, z),
            speed: Math.random() * 2 + 0.5,
            phase: Math.random() * Math.PI * 2, // Random phase for swaying
            hoverStrength: 0 // Initialize interaction state
        });

        // PINK Palette Color Selection
        const color = PINK_PALETTE[Math.floor(Math.random() * PINK_PALETTE.length)];
        gColors[i * 3] = color.r;
        gColors[i * 3 + 1] = color.g;
        gColors[i * 3 + 2] = color.b;

        // Varied Size (0.5x to 1.5x)
        gScales[i] = 0.5 + Math.random(); 
    }

    // Pearls (spiraling)
    const pearls: DualPosition[] = [];
    for (let i = 0; i < TREE_CONFIG.pearlCount; i++) {
        const t = i / TREE_CONFIG.pearlCount;
        const y = (t - 0.5) * TREE_CONFIG.height;
        const radius = (1 - t) * (TREE_CONFIG.radius + 0.5);
        const angle = t * Math.PI * 10;
        
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        
        const chaosR = 20 * Math.random();

        pearls.push({
            target: new THREE.Vector3(x, y, z),
            chaos: new THREE.Vector3((Math.random()-0.5)*chaosR, (Math.random()-0.5)*chaosR, (Math.random()-0.5)*chaosR),
            current: new THREE.Vector3(x, y, z),
            speed: Math.random() + 0.2
        });
    }

    return { gemData: gems, pearlData: pearls, gemColors: gColors, gemScales: gScales };
  }, []);

  // Generate 5-Pointed Star Shape
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 1;
    const innerRadius = 0.4;
    
    for (let i = 0; i < points * 2; i++) {
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        // -PI/2 to start pointing up
        const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings = {
        steps: 1,
        depth: 0.2, // Thickness
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelSegments: 3
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // Center the star geometry
  useMemo(() => {
    starGeometry.center();
  }, [starGeometry]);

  useFrame((stateThree, delta) => {
    const isChaos = state === TreeState.CHAOS;
    const targetKey = isChaos ? 'chaos' : 'target';
    const time = stateThree.clock.elapsedTime;
    
    // Raycasting for Gem Interaction
    // Only raycast in Formed state for stable interaction
    if (meshRef.current && !isChaos) {
        stateThree.raycaster.setFromCamera(stateThree.pointer, stateThree.camera);
        const intersects = stateThree.raycaster.intersectObject(meshRef.current);
        
        // If we hit an instance, trigger its hover strength
        if (intersects.length > 0) {
            const instanceId = intersects[0].instanceId;
            if (instanceId !== undefined && gemData[instanceId]) {
                // Boost strength to 1 instantly on hover
                gemData[instanceId].hoverStrength = 1.0;
            }
        }
    }

    // Update Gems
    if (meshRef.current) {
        let i = 0;
        for (const gem of gemData) {
            const target = gem[targetKey];
            const lerpFactor = THREE.MathUtils.clamp(delta * gem.speed, 0, 1);
            gem.current.lerp(target, lerpFactor);
            
            // Decay Hover Strength
            if (gem.hoverStrength && gem.hoverStrength > 0.001) {
                gem.hoverStrength = THREE.MathUtils.lerp(gem.hoverStrength, 0, delta * 4); // Fast decay
            } else {
                gem.hoverStrength = 0;
            }

            dummy.position.copy(gem.current);
            
            if (isChaos) {
                // Chaotic Tumble
                dummy.rotation.x += delta * 2;
                dummy.rotation.y += delta * 2;
            } else {
                // Subtle Swaying Physics (Hanging Decoration)
                // Base sway
                const baseSway = 0.15;
                // Add hover strength to sway amplitude
                const swayAmp = baseSway + (gem.hoverStrength || 0) * 0.3; // Swing wider when hovered
                
                dummy.rotation.x = Math.sin(time * 1.5 + (gem.phase || 0)) * swayAmp;
                dummy.rotation.z = Math.cos(time * 1.2 + (gem.phase || 0)) * swayAmp;
                
                // Rotation Y: Slow normally, faster if hovered
                dummy.rotation.y += delta * 0.2 + (gem.hoverStrength || 0) * delta * 5.0; 
            }
            
            // Scale: Base scale + subtle pop when hovered
            const hoverScale = 1.0 + (gem.hoverStrength || 0) * 0.3;
            const s = (isChaos ? 0.3 : 0.15) * gemScales[i] * hoverScale;
            dummy.scale.setScalar(s);
            
            dummy.updateMatrix();
            
            // Color Logic: Mix Palette with Silver/White on hover (Shimmer)
            tempColor.setRGB(gemColors[i*3], gemColors[i*3+1], gemColors[i*3+2]);
            if (gem.hoverStrength && gem.hoverStrength > 0) {
                // Lerp towards white for shimmer effect
                tempColor.lerp(COLORS.silver, gem.hoverStrength * 0.6);
            }
            meshRef.current.setColorAt(i, tempColor);
            meshRef.current.setMatrixAt(i++, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }

    // Update Pearls
    if (pearlRef.current) {
        let i = 0;
        for (const pearl of pearlData) {
            const target = pearl[targetKey];
            const lerpFactor = THREE.MathUtils.clamp(delta * pearl.speed * 0.5, 0, 1);
            pearl.current.lerp(target, lerpFactor);

            dummy.position.copy(pearl.current);
            dummy.rotation.set(0,0,0);
            dummy.scale.setScalar(0.4);
            dummy.updateMatrix();
            pearlRef.current.setMatrixAt(i++, dummy.matrix);
        }
        if(!isChaos) pearlRef.current.rotation.y += delta * 0.05;
        pearlRef.current.instanceMatrix.needsUpdate = true;
    }

    // Star Animation (Heavier Physics)
    if (starRef.current) {
        const hover = Math.sin(time * 1.5) * 0.25;

        const starTargetY = isChaos ? 0 : (TREE_CONFIG.height / 2 + 0.8); // Slightly lower
        const targetPos = new THREE.Vector3(0, starTargetY + hover, 0);

        // Physics: Heavier weight (lower lerp factor)
        starRef.current.position.lerp(targetPos, delta * 1.0);
        
        // Continuous Rotation
        if (isChaos) {
            starRef.current.rotation.y += delta * 2;
            starRef.current.rotation.x += delta;
        } else {
            starRef.current.rotation.y += delta * 0.5;
            // Slight tilt wobble
            starRef.current.rotation.z = Math.sin(time) * 0.05;
        }
    }
  });

  // Create Halo Texture
  const haloTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
        const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        gradient.addColorStop(0.4, 'rgba(255, 215, 0, 0.5)'); // Gold tint
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <>
        {/* Gems: Cut gems with Morandi Palette */}
        <instancedMesh ref={meshRef} args={[undefined, undefined, TREE_CONFIG.ornamentCount]}>
            <icosahedronGeometry args={[1, 0]} /> {/* Base size 1, scaled by matrix */}
            <meshPhysicalMaterial 
                roughness={0.1} 
                metalness={0.6} 
                transmission={0.2}
                thickness={1.0}
            />
        </instancedMesh>

        {/* Pearls */}
        <instancedMesh ref={pearlRef} args={[undefined, undefined, TREE_CONFIG.pearlCount]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshPhysicalMaterial 
                color={COLORS.silver} 
                roughness={0.2} 
                metalness={0.4} 
                clearcoat={1} 
            />
        </instancedMesh>

        {/* Floating Star - Golden 5-Pointed Star */}
        <group ref={starRef} position={[0, TREE_CONFIG.height/2 + 0.8, 0]}>
            
            {/* Emitter for God Rays - Invisible but bright color for post-proc */}
            <mesh ref={sunMeshRef}>
                <sphereGeometry args={[0.4, 16, 16]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0} />
            </mesh>

            {/* Extruded 5-Point Star Geometry */}
            <mesh geometry={starGeometry} scale={[0.8, 0.8, 0.8]}>
                <meshStandardMaterial 
                    color={COLORS.gold} 
                    metalness={1} 
                    roughness={0.1} 
                    emissive={COLORS.gold}
                    emissiveIntensity={0.2}
                />
            </mesh>

            {/* Gold Halo Sprite */}
            <sprite scale={[4, 4, 1]}>
                <spriteMaterial map={haloTexture} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
            </sprite>

            {/* Light */}
            <pointLight distance={15} intensity={1.5} color={COLORS.gold} decay={2} />
        </group>
    </>
  );
});

export default Ornaments;