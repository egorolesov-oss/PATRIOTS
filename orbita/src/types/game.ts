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
  ANTIGRAVITY = 'ANTIGRAVITY',
}

export interface PowerUpState {
  type: PowerUpType;
  used: boolean;
  active: boolean;
  remainingTime?: number;
}

export interface SwipeState {
  active: boolean;
  orbitIndex: number;
  collectedIds: string[];
  matchType: PlanetType | null;
}

export interface GameState {
  planets: Planet[];
  rescued: number;       // planets saved by swiping
  rescueTarget: number;  // how many to save to win
  swapsLeft: number;
  selectedPlanetId: string | null;
  phase: 'title' | 'playing' | 'exploding' | 'won' | 'gameover';
  powerUps: PowerUpState[];
  combo: number;
  bestRescued: number;
  timeLeft: number;       // seconds remaining
  totalTime: number;      // total level time in seconds
}

// Star phase based on time remaining (0-1 ratio)
export interface StarPhase {
  color: string;
  glowColor: string;
  scale: number;
  label: string;
}

export const STAR_PHASES: StarPhase[] = [
  { color: '#ffffff', glowColor: '#ffd700', scale: 1.0, label: 'Stable' },       // >80%
  { color: '#fff4cc', glowColor: '#ffaa00', scale: 0.95, label: 'Warming' },     // 60-80%
  { color: '#ffaa44', glowColor: '#ff6600', scale: 0.90, label: 'Unstable' },    // 40-60%
  { color: '#ff6633', glowColor: '#ff2200', scale: 0.85, label: 'Critical' },    // 20-40%
  { color: '#cc2200', glowColor: '#880000', scale: 0.80, label: 'Collapsing' },  // <20%
];

export function getStarPhase(timeRatio: number): StarPhase {
  if (timeRatio > 0.8) return STAR_PHASES[0];
  if (timeRatio > 0.6) return STAR_PHASES[1];
  if (timeRatio > 0.4) return STAR_PHASES[2];
  if (timeRatio > 0.2) return STAR_PHASES[3];
  return STAR_PHASES[4];
}

export const STAR_SIZE = 50;
export const PLANET_SIZE = 42;
export const PLANET_HITBOX = 36;
export const INITIAL_SWAPS = 5;
export const LEVEL_TIME = 120;    // 2 minutes
export const RESCUE_TARGET = 15;  // planets to save
export const SWAP_PROXIMITY = 13;
export const SWAP_WARN_PROXIMITY = 25;
export const ROTATION_SLOWDOWN = 0.3;
