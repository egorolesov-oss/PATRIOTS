export enum PlanetType {
  RED = 'RED',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  GOLD = 'GOLD',
  PINK = 'PINK',
  PURPLE = 'PURPLE',
}

export interface PlanetConfig {
  type: PlanetType;
  color: string;
  sprite: string;
}

export const PLANET_CONFIGS: Record<PlanetType, PlanetConfig> = {
  [PlanetType.RED]: { type: PlanetType.RED, color: '#e74c3c', sprite: 'planet_red' },
  [PlanetType.GREEN]: { type: PlanetType.GREEN, color: '#2ecc71', sprite: 'planet_green' },
  [PlanetType.BLUE]: { type: PlanetType.BLUE, color: '#3498db', sprite: 'planet_blue' },
  [PlanetType.GOLD]: { type: PlanetType.GOLD, color: '#f1c40f', sprite: 'planet_gold' },
  [PlanetType.PINK]: { type: PlanetType.PINK, color: '#e91e90', sprite: 'planet_pink' },
  [PlanetType.PURPLE]: { type: PlanetType.PURPLE, color: '#9b59b6', sprite: 'planet_purple' },
};

export interface Planet {
  id: string;
  type: PlanetType;
  orbitIndex: number;
  slotIndex: number;
}

export interface OrbitConfig {
  radius: number;
  slotCount: number;
  rotationDirection: 1 | -1;
  rotationDuration: number;
}

export const ORBIT_CONFIGS: OrbitConfig[] = [
  { radius: 70, slotCount: 6, rotationDirection: 1, rotationDuration: 30 },
  { radius: 115, slotCount: 8, rotationDirection: -1, rotationDuration: 45 },
  { radius: 160, slotCount: 10, rotationDirection: 1, rotationDuration: 60 },
];

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

// Swipe collects adjacent same-type planets on one orbit
export interface SwipeState {
  active: boolean;
  orbitIndex: number;
  collectedIds: string[];
  matchType: PlanetType | null;
}

export interface GameState {
  planets: Planet[];
  score: number;
  movesLeft: number;
  selectedPlanetId: string | null;
  phase: 'title' | 'playing' | 'gameover';
  powerUps: PowerUpState[];
  combo: number;
  bestScore: number;
}

// Adjacent match on one orbit
export interface OrbitMatch {
  orbitIndex: number;
  planets: Planet[];
  type: PlanetType;
}

export const STAR_SIZE = 50;
export const PLANET_SIZE = 42;
export const PLANET_HITBOX = 28;
export const INITIAL_MOVES = 30;
export const ROTATION_SLOWDOWN = 0.3;
