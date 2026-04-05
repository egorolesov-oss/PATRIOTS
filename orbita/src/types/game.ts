export enum PlanetType {
  RED = 'RED',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  GOLD = 'GOLD',
  PINK = 'PINK',
  PURPLE = 'PURPLE',
  TEAL = 'TEAL',
  VOLCANIC = 'VOLCANIC',
}

export interface PlanetConfig {
  type: PlanetType;
  color: string;
  sprite: string; // asset filename
}

export const PLANET_CONFIGS: Record<PlanetType, PlanetConfig> = {
  [PlanetType.RED]: { type: PlanetType.RED, color: '#e74c3c', sprite: 'planet_red' },
  [PlanetType.GREEN]: { type: PlanetType.GREEN, color: '#2ecc71', sprite: 'planet_green' },
  [PlanetType.BLUE]: { type: PlanetType.BLUE, color: '#3498db', sprite: 'planet_blue' },
  [PlanetType.GOLD]: { type: PlanetType.GOLD, color: '#f1c40f', sprite: 'planet_gold' },
  [PlanetType.PINK]: { type: PlanetType.PINK, color: '#e91e90', sprite: 'planet_pink' },
  [PlanetType.PURPLE]: { type: PlanetType.PURPLE, color: '#9b59b6', sprite: 'planet_purple' },
  [PlanetType.TEAL]: { type: PlanetType.TEAL, color: '#1abc9c', sprite: 'planet_teal' },
  [PlanetType.VOLCANIC]: { type: PlanetType.VOLCANIC, color: '#e67e22', sprite: 'planet_volcanic' },
};

export interface Planet {
  id: string;
  type: PlanetType;
  orbitIndex: number; // 0=inner, 1=middle, 2=outer
  slotIndex: number;
}

export interface OrbitConfig {
  radius: number;
  slotCount: number;
  rotationDirection: 1 | -1;
  rotationDuration: number; // seconds for full 360
}

export const ORBIT_CONFIGS: OrbitConfig[] = [
  { radius: 70, slotCount: 6, rotationDirection: 1, rotationDuration: 30 },
  { radius: 115, slotCount: 8, rotationDirection: -1, rotationDuration: 45 },
  { radius: 160, slotCount: 10, rotationDirection: 1, rotationDuration: 60 },
];

export interface Conjunction {
  spokeAngle: number;
  planets: Planet[];
}

export enum PowerUpType {
  STAR_FREEZE = 'STAR_FREEZE',
  NOVA_PULSE = 'NOVA_PULSE',
  CLEANSE_RAY = 'CLEANSE_RAY',
}

export interface PowerUpState {
  type: PowerUpType;
  used: boolean;
  active: boolean;
  remainingTime?: number;
}

export interface SwipeRayState {
  active: boolean;
  angle: number; // current swipe angle in degrees
  hitPlanets: Planet[]; // planets under the ray
  matchType: PlanetType | null; // the matching type (most numerous same-type across orbits)
}

export interface GameState {
  planets: Planet[];
  score: number;
  movesLeft: number;
  selectedPlanetId: string | null;
  phase: 'title' | 'playing' | 'gameover';
  powerUps: PowerUpState[];
  combo: number; // consecutive successful swipes
  bestScore: number;
}

// Alignment state for a pair/triple of same-type planets across orbits
export interface AlignmentIndicator {
  type: PlanetType;
  planets: Planet[];
  angleDiff: number; // how far from perfect alignment (degrees)
}

export const STAR_SIZE = 50;
export const STAR_HITZONE = 35; // radius of swipe start zone
export const PLANET_SIZE = 42;
export const PLANET_HITBOX = 30; // radius for ray hit detection
export const SWIPE_TOLERANCE = 8; // degrees tolerance for hitting a planet
export const INITIAL_MOVES = 25;
export const ALIGNMENT_FAR = 15; // degrees — start showing indicator
export const ALIGNMENT_CLOSE = 5; // degrees — bright indicator
export const ALIGNMENT_PERFECT = 1; // degrees — gold glow
export const MERCY_WINDOW = 0.5; // seconds after alignment passes
export const ROTATION_SLOWDOWN = 0.3; // multiplier during swipe (70% slower)
