export enum PlanetType {
  RED = 'RED',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  ORANGE = 'ORANGE',
  PURPLE = 'PURPLE',
  PINK = 'PINK',
}

export interface PlanetConfig {
  type: PlanetType;
  color: string;
  symbol: 'square' | 'triangle' | 'diamond' | 'circle' | 'pentagon' | 'star';
}

export const PLANET_CONFIGS: Record<PlanetType, PlanetConfig> = {
  [PlanetType.RED]: { type: PlanetType.RED, color: '#e74c3c', symbol: 'square' },
  [PlanetType.GREEN]: { type: PlanetType.GREEN, color: '#2ecc71', symbol: 'triangle' },
  [PlanetType.BLUE]: { type: PlanetType.BLUE, color: '#3498db', symbol: 'diamond' },
  [PlanetType.ORANGE]: { type: PlanetType.ORANGE, color: '#e67e22', symbol: 'circle' },
  [PlanetType.PURPLE]: { type: PlanetType.PURPLE, color: '#9b59b6', symbol: 'pentagon' },
  [PlanetType.PINK]: { type: PlanetType.PINK, color: '#e91e90', symbol: 'star' },
};

export interface Planet {
  id: string;
  type: PlanetType;
  orbitIndex: number; // 0=inner, 1=middle, 2=outer
  slotIndex: number;  // position within orbit
}

export interface OrbitConfig {
  radius: number;
  slotCount: number;
  rotationDirection: 1 | -1; // 1=CW, -1=CCW
  rotationDuration: number;  // seconds for full 360
}

export const ORBIT_CONFIGS: OrbitConfig[] = [
  { radius: 90, slotCount: 6, rotationDirection: 1, rotationDuration: 30 },
  { radius: 150, slotCount: 8, rotationDirection: -1, rotationDuration: 45 },
  { radius: 210, slotCount: 10, rotationDirection: 1, rotationDuration: 60 },
];

export interface SlotPosition {
  orbitIndex: number;
  slotIndex: number;
  baseAngle: number; // degrees, before rotation
  x: number;
  y: number;
}

export interface Conjunction {
  spokeAngle: number;
  planets: Planet[];
}

export enum PowerUpType {
  NOVA_BURST = 'NOVA_BURST',
  CRYO_FREEZE = 'CRYO_FREEZE',
  GRAVITY_WELL = 'GRAVITY_WELL',
}

export interface PowerUpState {
  type: PowerUpType;
  used: boolean;
  active: boolean;
  remainingTime?: number;
}

export interface GameState {
  planets: Planet[];
  score: number;
  movesLeft: number;
  selectedPlanetId: string | null;
  phase: 'title' | 'playing' | 'gameover';
  powerUps: PowerUpState[];
  cascadeLevel: number;
  bestScore: number;
}

export const STAR_SIZE = 60;
export const PLANET_SIZE = 44;
export const INITIAL_MOVES = 30;
export const CONJUNCTION_TOLERANCE = 5; // degrees
export const MAX_CASCADE_DEPTH = 5;
export const CRYO_DURATION = 10; // seconds
