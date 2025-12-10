import * as THREE from 'three';

export enum TreeState {
  FORMED = 'FORMED',
  CHAOS = 'CHAOS',
}

export interface DualPosition {
  chaos: THREE.Vector3;
  target: THREE.Vector3;
  current: THREE.Vector3;
  speed: number;
  phase?: number; // Added for animation offset
  hoverStrength?: number; // Added for interaction (0 to 1)
}

export interface GestureState {
  gesture: string; // "Open_Palm", "Closed_Fist", "None"
  handPosition: { x: number; y: number }; // Normalized 0-1
  isDetected: boolean;
}

export interface Blessing {
  id: number;
  text: string;
}