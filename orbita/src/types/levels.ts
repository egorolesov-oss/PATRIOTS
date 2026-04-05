import { PlanetType, PowerUpType } from './game';

export interface LevelConfig {
  id: number;
  name: string;
  time: number;
  rescueTarget: number;
  swaps: number;
  planetTypes: PlanetType[];
  slots: [number, number, number]; // [inner, middle, outer]
  speedMultiplier: number;
  alignmentTolerance: number;
  powerUps: { type: PowerUpType; uses: number }[];
  newMechanic?: string;
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'First Constellation',
    time: 180,
    rescueTarget: 6,
    swaps: 0,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN],
    slots: [3, 4, 5],   // 12 planets
    speedMultiplier: 0.5,
    alignmentTolerance: 25,
    powerUps: [],
    newMechanic: 'Swipe through 3 same-color planets when they align!',
  },
  {
    id: 2,
    name: 'Dance of Orbits',
    time: 150,
    rescueTarget: 9,
    swaps: 0,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN],
    slots: [4, 5, 6],   // 15 planets
    speedMultiplier: 0.7,
    alignmentTolerance: 22,
    powerUps: [{ type: PowerUpType.STAR_FREEZE, uses: 1 }],
    newMechanic: 'FREEZE stops all orbits for 8 seconds!',
  },
  {
    id: 3,
    name: 'Magnetic Storm',
    time: 130,
    rescueTarget: 12,
    swaps: 3,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN, PlanetType.GOLD],
    slots: [4, 6, 7],   // 17 planets
    speedMultiplier: 0.8,
    alignmentTolerance: 20,
    powerUps: [
      { type: PowerUpType.STAR_FREEZE, uses: 1 },
      { type: PowerUpType.NOVA_PULSE, uses: 1 },
    ],
    newMechanic: 'Tap 2 planets on adjacent orbits to SWAP them!',
  },
  {
    id: 4,
    name: 'Heart of the Pulsar',
    time: 120,
    rescueTarget: 15,
    swaps: 5,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN, PlanetType.GOLD],
    slots: [5, 6, 8],   // 19 planets
    speedMultiplier: 1.0,
    alignmentTolerance: 18,
    powerUps: [
      { type: PowerUpType.STAR_FREEZE, uses: 1 },
      { type: PowerUpType.NOVA_PULSE, uses: 2 },
    ],
    newMechanic: 'MAGNET pulls the nearest triple into alignment!',
  },
  {
    id: 5,
    name: 'Quantum Leap',
    time: 110,
    rescueTarget: 15,
    swaps: 4,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN, PlanetType.GOLD, PlanetType.PINK],
    slots: [5, 7, 8],   // 20 planets
    speedMultiplier: 1.2,
    alignmentTolerance: 16,
    powerUps: [
      { type: PowerUpType.STAR_FREEZE, uses: 1 },
      { type: PowerUpType.ANTIGRAVITY, uses: 1 },
    ],
    newMechanic: 'ANTI-G reshuffles all planets!',
  },
  {
    id: 6,
    name: 'Gravitational Lens',
    time: 100,
    rescueTarget: 18,
    swaps: 4,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN, PlanetType.GOLD, PlanetType.PINK],
    slots: [5, 7, 9],   // 21 planets
    speedMultiplier: 1.3,
    alignmentTolerance: 14,
    powerUps: [
      { type: PowerUpType.STAR_FREEZE, uses: 2 },
      { type: PowerUpType.NOVA_PULSE, uses: 1 },
    ],
  },
  {
    id: 7,
    name: 'Black Hole Nearby',
    time: 90,
    rescueTarget: 18,
    swaps: 3,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN, PlanetType.GOLD, PlanetType.PINK, PlanetType.PURPLE],
    slots: [6, 7, 9],   // 22 planets
    speedMultiplier: 1.4,
    alignmentTolerance: 12,
    powerUps: [
      { type: PowerUpType.STAR_FREEZE, uses: 1 },
      { type: PowerUpType.ANTIGRAVITY, uses: 1 },
    ],
  },
  {
    id: 8,
    name: 'Agony of a Superstar',
    time: 85,
    rescueTarget: 21,
    swaps: 3,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN, PlanetType.GOLD, PlanetType.PINK, PlanetType.PURPLE],
    slots: [6, 8, 9],   // 23 planets
    speedMultiplier: 1.5,
    alignmentTolerance: 11,
    powerUps: [
      { type: PowerUpType.NOVA_PULSE, uses: 1 },
      { type: PowerUpType.STAR_FREEZE, uses: 1 },
    ],
  },
  {
    id: 9,
    name: 'Final Flare',
    time: 80,
    rescueTarget: 21,
    swaps: 2,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN, PlanetType.GOLD, PlanetType.PINK, PlanetType.PURPLE],
    slots: [6, 8, 10],  // 24 planets
    speedMultiplier: 1.6,
    alignmentTolerance: 10,
    powerUps: [
      { type: PowerUpType.ANTIGRAVITY, uses: 1 },
    ],
  },
  {
    id: 10,
    name: 'Supernova',
    time: 75,
    rescueTarget: 24,
    swaps: 2,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN, PlanetType.GOLD, PlanetType.PINK, PlanetType.PURPLE],
    slots: [6, 8, 10],  // 24 planets
    speedMultiplier: 1.8,
    alignmentTolerance: 9,
    powerUps: [
      { type: PowerUpType.STAR_FREEZE, uses: 1 },
      { type: PowerUpType.NOVA_PULSE, uses: 1 },
      { type: PowerUpType.ANTIGRAVITY, uses: 1 },
    ],
  },
];

export function getStarRating(level: LevelConfig, rescued: number, timeLeft: number, swapsUsed: number, powerUpsUsed: number): number {
  if (rescued < level.rescueTarget) return 0;
  const timeRatio = timeLeft / level.time;
  if (swapsUsed === 0 && powerUpsUsed <= 1) return 3;
  if (timeRatio > 0.25) return 2;
  return 1;
}
