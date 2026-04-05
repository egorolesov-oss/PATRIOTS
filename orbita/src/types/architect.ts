import { PlanetType } from './game';

export interface ArchitectTarget {
  orbitIndex: number;
  slotIndex: number;
  type: PlanetType;
}

export interface ArchitectLevel {
  id: number;
  name: string;
  swaps: number;
  planetTypes: PlanetType[];
  slots: [number, number, number];
  speedMultiplier: number;
  targets: ArchitectTarget[]; // planets that must be in these positions
}

export const ARCHITECT_LEVELS: ArchitectLevel[] = [
  {
    id: 1,
    name: 'Simple Triangle',
    swaps: 5,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN],
    slots: [3, 3, 3],
    speedMultiplier: 0.5,
    targets: [
      { orbitIndex: 0, slotIndex: 0, type: PlanetType.RED },
      { orbitIndex: 1, slotIndex: 0, type: PlanetType.RED },
      { orbitIndex: 2, slotIndex: 0, type: PlanetType.RED },
    ],
  },
  {
    id: 2,
    name: 'Twin Stars',
    swaps: 7,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN],
    slots: [3, 4, 4],
    speedMultiplier: 0.6,
    targets: [
      { orbitIndex: 0, slotIndex: 0, type: PlanetType.BLUE },
      { orbitIndex: 1, slotIndex: 0, type: PlanetType.BLUE },
      { orbitIndex: 2, slotIndex: 0, type: PlanetType.BLUE },
      { orbitIndex: 0, slotIndex: 1, type: PlanetType.GREEN },
      { orbitIndex: 1, slotIndex: 2, type: PlanetType.GREEN },
      { orbitIndex: 2, slotIndex: 2, type: PlanetType.GREEN },
    ],
  },
  {
    id: 3,
    name: 'Color Ring',
    swaps: 8,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN],
    slots: [3, 4, 5],
    speedMultiplier: 0.65,
    targets: [
      { orbitIndex: 1, slotIndex: 0, type: PlanetType.RED },
      { orbitIndex: 1, slotIndex: 1, type: PlanetType.BLUE },
      { orbitIndex: 1, slotIndex: 2, type: PlanetType.GREEN },
      { orbitIndex: 1, slotIndex: 3, type: PlanetType.RED },
    ],
  },
  {
    id: 4,
    name: 'Cross Formation',
    swaps: 10,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN, PlanetType.GOLD],
    slots: [4, 5, 6],
    speedMultiplier: 0.7,
    targets: [
      { orbitIndex: 0, slotIndex: 0, type: PlanetType.GOLD },
      { orbitIndex: 1, slotIndex: 0, type: PlanetType.GOLD },
      { orbitIndex: 2, slotIndex: 0, type: PlanetType.GOLD },
      { orbitIndex: 0, slotIndex: 2, type: PlanetType.GOLD },
      { orbitIndex: 1, slotIndex: 2, type: PlanetType.GOLD },
      { orbitIndex: 2, slotIndex: 3, type: PlanetType.GOLD },
    ],
  },
  {
    id: 5,
    name: 'Rainbow Bridge',
    swaps: 12,
    planetTypes: [PlanetType.RED, PlanetType.BLUE, PlanetType.GREEN, PlanetType.GOLD, PlanetType.PINK],
    slots: [5, 6, 7],
    speedMultiplier: 0.75,
    targets: [
      { orbitIndex: 2, slotIndex: 0, type: PlanetType.RED },
      { orbitIndex: 2, slotIndex: 1, type: PlanetType.BLUE },
      { orbitIndex: 2, slotIndex: 2, type: PlanetType.GREEN },
      { orbitIndex: 2, slotIndex: 3, type: PlanetType.GOLD },
      { orbitIndex: 2, slotIndex: 4, type: PlanetType.PINK },
    ],
  },
];
