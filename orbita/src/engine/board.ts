import {
  Planet,
  PlanetType,
  ORBIT_CONFIGS,
  CONJUNCTION_TOLERANCE,
  Conjunction,
} from '../types/game';

const PLANET_TYPES = Object.values(PlanetType);

let nextId = 1;
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
    // Check if this angle is already accounted for
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

export function generateValidBoard(): Planet[] {
  let attempts = 0;
  while (attempts < 100) {
    const board = generateBoard();
    if (hasMinConjunctions(board, 2)) {
      return board;
    }
    attempts++;
  }
  // Fallback: force some conjunctions
  const board = generateBoard();
  // Place same type on spoke 0 across orbits
  const type1 = PlanetType.RED;
  const type2 = PlanetType.BLUE;
  board[0] = { ...board[0], type: type1 }; // inner slot 0
  board[6] = { ...board[6], type: type1 }; // middle slot 0
  board[14] = { ...board[14], type: type2 }; // outer slot 0
  // Find middle slot closest to 0 degrees
  board[7] = { ...board[7], type: type2 }; // middle slot 1 (45 deg)
  // outer slot 1 is 36 deg - close enough with tolerance
  board[15] = { ...board[15], type: type2 };
  return board;
}

export function calculateScore(matchCount: number, cascadeLevel: number): number {
  return matchCount * matchCount * 100 * cascadeLevel;
}

export function fillEmptySlots(planets: Planet[]): Planet[] {
  const occupied = new Set(
    planets.map((p) => `${p.orbitIndex}-${p.slotIndex}`)
  );
  const newPlanets: Planet[] = [...planets];

  for (let oi = 0; oi < ORBIT_CONFIGS.length; oi++) {
    const config = ORBIT_CONFIGS[oi];
    for (let si = 0; si < config.slotCount; si++) {
      const key = `${oi}-${si}`;
      if (!occupied.has(key)) {
        newPlanets.push({
          id: generateId(),
          type: randomPlanetType(),
          orbitIndex: oi,
          slotIndex: si,
        });
      }
    }
  }

  return newPlanets;
}
