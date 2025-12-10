import * as THREE from 'three';
import { Blessing } from './types';

// Visual Palette
export const COLORS = {
  emerald: new THREE.Color('#002419'),
  deepGreen: new THREE.Color('#004b34'),
  silver: new THREE.Color('#e5e7eb'),
  gold: new THREE.Color('#FFD700'),
  ruby: new THREE.Color('#E0115F'),
  uiPink: '#fce7f3',
  uiBlack: '#0a0a0a',
};

// Luxury Pink Palette for Gemstones
export const PINK_PALETTE = [
  new THREE.Color('#FCE7F3'), // Pale Pink (UI Match)
  new THREE.Color('#FBCFE8'), // Light Pink
  new THREE.Color('#F9A8D4'), // Soft Rose
  new THREE.Color('#F472B6'), // Medium Pink
  new THREE.Color('#EC4899'), // Vivid Pink
  new THREE.Color('#DB2777'), // Deep Pink
  new THREE.Color('#E5E7EB'), // Silver highlight
];

// Low saturation, earthy/muted tones (Kept for reference or fallback)
export const MORANDI_PALETTE = [
  new THREE.Color('#A8B0A5'), // Sage
  new THREE.Color('#C9C0BB'), // Greige
  new THREE.Color('#D3C4BD'), // Dusty Rose
  new THREE.Color('#949398'), // Muted Purple/Grey
  new THREE.Color('#AAB3BC'), // Slate Blue
  new THREE.Color('#B4A8AB'), // Mauve
  new THREE.Color('#8F9E8B'), // Olive Grey
];

// Tree Config
export const TREE_CONFIG = {
  height: 14,
  radius: 5,
  foliageCount: 28000,
  ornamentCount: 200,
  pearlCount: 150,
  dustCount: 1200, // Increased for fantasy effect
};

// Blessings
export const BLESSINGS: Blessing[] = [
  { id: 1, text: "May your days be merry and bright." },
  { id: 2, text: "Peace, love, and joy to you this season." },
  { id: 3, text: "Wishing you a season of sparkle." },
  { id: 4, text: "May your heart be light and your holidays bright." },
  { id: 5, text: "Joy to the world, and especially to you." },
  { id: 6, text: "Warmest thoughts and best wishes for a wonderful holiday." },
  { id: 7, text: "Shine bright like a diamond this Christmas." },
];

export const SHADERS = {
  foliageVertex: `
    uniform float uTime;
    attribute float aSize;
    attribute vec3 aColor;
    varying vec3 vColor;
    void main() {
      vColor = aColor;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (150.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  foliageFragment: `
    varying vec3 vColor;
    void main() {
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;
      float alpha = 1.0 - smoothstep(0.4, 0.5, r);
      gl_FragColor = vec4(vColor, alpha);
    }
  `
};