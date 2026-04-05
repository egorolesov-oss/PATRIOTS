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
  size: number;
}

export const PLANET_CONFIGS: Record<PlanetType, PlanetConfig> = {
  [PlanetType.RED]: { type: PlanetType.RED, color: '#e74c3c', sprite: 'planet_red', size: 42 },
  [PlanetType.GREEN]: { type: PlanetType.GREEN, color: '#2ecc71', sprite: 'planet_green', size: 42 },
  [PlanetType.BLUE]: { type: PlanetType.BLUE, color: '#3498db', sprite: 'planet_blue', size: 42 },
  [PlanetType.GOLD]: { type: PlanetType.GOLD, color: '#f1c40f', sprite: 'planet_gold', size: 42 },
  [PlanetType.PINK]: { type: PlanetType.PINK, color: '#e91e90', sprite: 'planet_pink', size: 42 },
  [PlanetType.PURPLE]: { type: PlanetType.PURPLE, color: '#9b59b6', sprite: 'planet_purple', size: 42 },
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

// Smooth interpolation between colors
function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

const STAR_STOPS = [
  { at: 1.0, color: '#ffffff', glow: '#ffd700' },
  { at: 0.7, color: '#fff8dd', glow: '#ffcc44' },
  { at: 0.4, color: '#ffaa44', glow: '#ff7700' },
  { at: 0.2, color: '#ff5522', glow: '#ff2200' },
  { at: 0.0, color: '#aa1100', glow: '#660000' },
];

export function getStarPhase(timeRatio: number): StarPhase {
  const r = Math.max(0, Math.min(1, timeRatio));
  // Find two stops to interpolate between
  for (let i = 0; i < STAR_STOPS.length - 1; i++) {
    const a = STAR_STOPS[i];
    const b = STAR_STOPS[i + 1];
    if (r <= a.at && r >= b.at) {
      const t = 1 - (r - b.at) / (a.at - b.at);
      return {
        color: lerpColor(a.color, b.color, t),
        glowColor: lerpColor(a.glow, b.glow, t),
        scale: 0.7 + r * 0.6, // 1.3 at full → 0.7 at death
        label: '',
      };
    }
  }
  return { color: '#ffffff', glowColor: '#ffd700', scale: 1.3, label: '' };
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
