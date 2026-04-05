import {
  Planet,
  PlanetType,
  ORBIT_CONFIGS,
  CONJUNCTION_TOLERANCE,
  Conjunction,
} from '../types/game';

const PLANET_TYPES = Object.values(PlanetType);

let nextId = 1;
export function resetIdCounter(): void {
  nextId = 1;
}

export function generateId(): string {
  return `p${nextId++}`;
}

export function getSlotAngle(orbitIndex: number, slotIndex: number): number {
  const config = ORBIT_CONFIGS[orbitIndex];
  return (slotIndex * 360) / config.slotCount;
}

export function getSlotPosition(
  orbitIndex: number,
  slotIndex: number,
  centerX: number,
  centerY: number,
  rotationAngle: number = 0
): { x: number; y: number; angle: number } {
  const config = ORBIT_CONFIGS[orbitIndex];
  const baseAngle = (slotIndex * 360) / config.slotCount;
  const angle = baseAngle + rotationAngle;
  const rad = (angle * Math.PI) / 180;
  return {
    x: centerX + config.radius * Math.cos(rad),
    y: centerY + config.radius * Math.sin(rad),
    angle,
  };
}

export function randomPlanetType(): PlanetType {
  return PLANET_TYPES[Math.floor(Math.random() * PLANET_TYPES.length)];
}

export function generateBoard(): Planet[] {
  const planets: Planet[] = [];
  for (let oi = 0; oi < ORBIT_CONFIGS.length; oi++) {
    const config = ORBIT_CONFIGS[oi];
    for (let si = 0; si < config.slotCount; si++) {
      planets.push({
        id: generateId(),
        type: randomPlanetType(),
        orbitIndex: oi,
        slotIndex: si,
      });
    }
  }
  return planets;
}

export function normalizeAngle(angle: number): number {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
}

function angleDiff(a: number, b: number): number {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(diff, 360 - diff);
}

export function findConjunctions(
  planets: Planet[],
  rotationAngles: number[]
): Conjunction[] {
  // Collect all unique spoke angles from all planet positions
  const spokeAngles: number[] = [];
  for (const planet of planets) {
    const angle = normalizeAngle(
      getSlotAngle(planet.orbitIndex, planet.slotIndex) +
        rotationAngles[planet.orbitIndex]
    );
    let found = false;
    for (const existing of spokeAngles) {
      if (angleDiff(angle, existing) < CONJUNCTION_TOLERANCE) {
        found = true;
        break;
      }
    }
    if (!found) spokeAngles.push(angle);
  }

  const conjunctions: Conjunction[] = [];

  for (const spokeAngle of spokeAngles) {
    // Group planets near this spoke angle by type
    const nearbyPlanets = planets.filter((p) => {
      const pAngle = normalizeAngle(
        getSlotAngle(p.orbitIndex, p.slotIndex) + rotationAngles[p.orbitIndex]
      );
      return angleDiff(pAngle, spokeAngle) < CONJUNCTION_TOLERANCE;
    });

    // Group by type
    const byType: Record<string, Planet[]> = {};
    for (const p of nearbyPlanets) {
      if (!byType[p.type]) byType[p.type] = [];
      byType[p.type].push(p);
    }

    for (const type of Object.keys(byType)) {
      const group = byType[type];
      // Must span at least 2 different orbits
      const orbits = new Set(group.map((p) => p.orbitIndex));
      if (orbits.size >= 2) {
        conjunctions.push({ spokeAngle, planets: group });
      }
    }
  }

  // Deduplicate - a planet should only be in one conjunction
  const usedPlanetIds = new Set<string>();
  const unique: Conjunction[] = [];
  // Sort by size descending to prioritize bigger matches
  conjunctions.sort((a, b) => b.planets.length - a.planets.length);
  for (const c of conjunctions) {
    const unusedPlanets = c.planets.filter((p) => !usedPlanetIds.has(p.id));
    const orbits = new Set(unusedPlanets.map((p) => p.orbitIndex));
    if (orbits.size >= 2) {
      for (const p of unusedPlanets) usedPlanetIds.add(p.id);
      unique.push({ ...c, planets: unusedPlanets });
    }
  }

  return unique;
}

export function hasMinConjunctions(
  planets: Planet[],
  minCount: number
): boolean {
  const rotations = [0, 0, 0];
  return findConjunctions(planets, rotations).length >= minCount;
}

/** Check if any swap on any orbit creates at least one conjunction */
export function hasPossibleMoves(
  planets: Planet[],
  rotationAngles: number[]
): boolean {
  for (let oi = 0; oi < ORBIT_CONFIGS.length; oi++) {
    const orbitPlanets = planets.filter((p) => p.orbitIndex === oi);
    for (let i = 0; i < orbitPlanets.length; i++) {
      for (let j = i + 1; j < orbitPlanets.length; j++) {
        // Simulate swap
        const swapped = planets.map((p) => {
          if (p.id === orbitPlanets[i].id) return { ...p, slotIndex: orbitPlanets[j].slotIndex };
          if (p.id === orbitPlanets[j].id) return { ...p, slotIndex: orbitPlanets[i].slotIndex };
          return p;
        });
        if (findConjunctions(swapped, rotationAngles).length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

/** Reshuffle planet types while keeping positions, ensuring at least 2 conjunctions exist */
export function reshuffleBoard(planets: Planet[]): Planet[] {
  let attempts = 0;
  while (attempts < 50) {
    const shuffled = planets.map((p) => ({
      ...p,
      type: randomPlanetType(),
    }));
    if (hasMinConjunctions(shuffled, 2)) {
      return shuffled;
    }
    attempts++;
  }
  // Fallback: force conjunctions by placing same types at slot 0 across orbits
  const shuffled = planets.map((p) => ({
    ...p,
    type: randomPlanetType(),
  }));
  const type1 = PlanetType.RED;
  const type2 = PlanetType.BLUE;
  for (const p of shuffled) {
    if (p.slotIndex === 0 && (p.orbitIndex === 0 || p.orbitIndex === 1)) {
      p.type = type1;
    }
    // Slot 0 on all orbits aligns at 0 degrees — guaranteed conjunction
    if (p.slotIndex === 0 && p.orbitIndex === 2) {
      p.type = type2;
    }
    // Use slot that aligns: inner slot 3 = 180°, middle slot 4 = 180°, outer slot 5 = 180°
    if ((p.orbitIndex === 0 && p.slotIndex === 3) ||
        (p.orbitIndex === 1 && p.slotIndex === 4)) {
      p.type = type2;
    }
  }
  return shuffled;
}

export function generateValidBoard(): Planet[] {
  resetIdCounter();
  let attempts = 0;
  while (attempts < 100) {
    const board = generateBoard();
    if (hasMinConjunctions(board, 2)) {
      return board;
    }
    attempts++;
  }
  // Fallback: generate and force conjunctions
  const board = generateBoard();
  return reshuffleBoard(board);
}

export function calculateScore(matchCount: number, cascadeLevel: number): number {
  return matchCount * matchCount * 100 * cascadeLevel;
}

export function fillEmptySlots(planets: Planet[], biasType?: PlanetType): Planet[] {
  const occupied = new Set(
    planets.map((p) => `${p.orbitIndex}-${p.slotIndex}`)
  );
  const newPlanets: Planet[] = [...planets];

  for (let oi = 0; oi < ORBIT_CONFIGS.length; oi++) {
    const config = ORBIT_CONFIGS[oi];
    for (let si = 0; si < config.slotCount; si++) {
      const key = `${oi}-${si}`;
      if (!occupied.has(key)) {
        // 30% chance to spawn a type that could help create conjunctions
        const type = biasType && Math.random() < 0.3
          ? biasType
          : randomPlanetType();
        newPlanets.push({
          id: generateId(),
          type,
          orbitIndex: oi,
          slotIndex: si,
        });
      }
    }
  }

  return newPlanets;
}
