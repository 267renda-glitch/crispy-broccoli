import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import TreeParticles from './TreeParticles';
import Ornaments from './Ornaments';
import Snow from './Snow';
import FairyDust from './FairyDust';
import { TreeState, GestureState } from '../types';

interface SceneProps {
  treeState: TreeState;
  gestureState: GestureState;
}

const Scene: React.FC<SceneProps> = ({ treeState, gestureState }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  // Camera Control Logic based on Gesture
  useFrame((state, delta) => {
    if (cameraRef.current) {
        // Base position
        const r = 20;
        let targetX = 0;
        let targetY = 4; // Base height
        let targetZ = 20;

        // If gesture detected, influence camera
        if (gestureState.isDetected) {
             // Map x (0 to 1) to rotation angle (-PI/2 to PI/2)
             const angle = (gestureState.handPosition.x - 0.5) * Math.PI * 2;
             const heightOffset = (gestureState.handPosition.y - 0.5) * 10;
             
             targetX = Math.sin(angle) * r;
             targetZ = Math.cos(angle) * r;
             targetY = 4 - heightOffset; // Relative to the new base height
        } else {
             // Auto rotate slowly if no interaction
             const time = state.clock.elapsedTime * 0.1;
             targetX = Math.sin(time) * r;
             targetZ = Math.cos(time) * r;
        }

        cameraRef.current.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), delta * 2);
        cameraRef.current.lookAt(0, 0, 0);
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault ref={cameraRef} position={[0, 4, 20]} fov={50} />
      
      {/* Fog ensures strictly black background by fading out distant geometry/floor */}
      <fog attach="fog" args={['#000000', 10, 40]} />

      {/* Lighting: Lobby HDRI with Black Background */}
      <ambientLight intensity={0.2} color="#050505" />
      <Environment preset="lobby" background={false} blur={0.8} />
      
      {/* Pure Black Background */}
      <color attach="background" args={['#000000']} />
      
      {/* Snow Effect */}
      <Snow />
      
      {/* Content Group - Shifted down slightly to center the tree in the lower half */}
      <group position={[0, -2, 0]}>
        <TreeParticles state={treeState} />
        <Ornaments state={treeState} />
        <FairyDust state={treeState} />
        
        {/* Floor Reflections - Glossy Black */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -7.5, 0]}>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial 
                color="#000000" 
                roughness={0.1} 
                metalness={0.8} 
            />
        </mesh>
      </group>

      {/* Post Processing for Luxury Glow */}
      <EffectComposer disableNormalPass>
        <Bloom 
            luminanceThreshold={0.7} 
            mipmapBlur 
            intensity={1.2} 
            radius={0.5}
            levels={8}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
};

export default Scene;