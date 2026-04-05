import {
  Planet,
  PlanetType,
  ORBIT_CONFIGS,
  PLANET_HITBOX,
  SWAP_PROXIMITY,
  SWAP_WARN_PROXIMITY,
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
  return (slotIndex * 360) / currentSlots[orbitIndex];
}

export function getSlotPosition(
  orbitIndex: number,
  slotIndex: number,
  centerX: number,
  centerY: number,
  rotationAngle: number = 0
): { x: number; y: number; angle: number } {
  const config = ORBIT_CONFIGS[orbitIndex];
  const baseAngle = (slotIndex * 360) / currentSlots[orbitIndex];
  const angle = baseAngle + rotationAngle;
  const rad = (angle * Math.PI) / 180;
  return {
    x: centerX + config.radius * Math.cos(rad),
    y: centerY + config.radius * Math.sin(rad),
    angle,
  };
}

export function normalizeAngle(angle: number): number {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
}

export function angleDiff(a: number, b: number): number {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(diff, 360 - diff);
}

let allowedTypes: PlanetType[] = PLANET_TYPES;
let currentSlots: [number, number, number] = [6, 8, 10];

export function setCurrentSlots(slots: [number, number, number]): void {
  currentSlots = slots;
}

export function getSlotCount(orbitIndex: number): number {
  return currentSlots[orbitIndex];
}

export function setAllowedTypes(types: PlanetType[]): void {
  allowedTypes = types;
}

export function randomPlanetType(): PlanetType {
  return allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
}

export function generateBoard(types?: PlanetType[], slots?: [number, number, number]): Planet[] {
  resetIdCounter();
  if (types) setAllowedTypes(types);
  if (slots) setCurrentSlots(slots);
  const planets: Planet[] = [];
  for (let oi = 0; oi < ORBIT_CONFIGS.length; oi++) {
    const slotCount = currentSlots[oi];
    for (let si = 0; si < slotCount; si++) {
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

export function getPlanetAngle(planet: Planet, rotationAngles: number[]): number {
  return normalizeAngle(
    getSlotAngle(planet.orbitIndex, planet.slotIndex) +
      rotationAngles[planet.orbitIndex]
  );
}

/**
 * Check if a swipe collection is valid:
 * - All same type
 * - All on DIFFERENT orbits
 * - At least 2 planets (2 orbits), ideally 3 (all orbits)
 */
export function isValidSwipe(collected: Planet[]): boolean {
  if (collected.length < 3) return false;
  const type = collected[0].type;
  if (!collected.every((p) => p.type === type)) return false;
  const orbits = new Set(collected.map((p) => p.orbitIndex));
  return orbits.size === collected.length; // each on a different orbit
}

export interface AlignedTriple {
  planets: [Planet, Planet, Planet];
  type: PlanetType;
  avgAngleDiff: number;
}

/**
 * Find groups of same-type planets that are nearly aligned across orbits.
 * Returns both the set of IDs and the actual triples for drawing lines.
 */
export function findAlignedGroups(
  planets: Planet[],
  rotationAngles: number[],
  tolerance: number = 15
): { ids: Set<string>; triples: AlignedTriple[] } {
  const ids = new Set<string>();
  const triples: AlignedTriple[] = [];
  const byType: Record<string, Planet[]> = {};

  for (const p of planets) {
    if (!byType[p.type]) byType[p.type] = [];
    byType[p.type].push(p);
  }

  for (const type of Object.keys(byType)) {
    const group = byType[type];
    const byOrbit: Planet[][] = [[], [], []];
    for (const p of group) byOrbit[p.orbitIndex].push(p);
    if (byOrbit[0].length === 0 || byOrbit[1].length === 0 || byOrbit[2].length === 0) continue;

    for (const p0 of byOrbit[0]) {
      const a0 = getPlanetAngle(p0, rotationAngles);
      for (const p1 of byOrbit[1]) {
        const a1 = getPlanetAngle(p1, rotationAngles);
        if (angleDiff(a0, a1) >= tolerance) continue;
        for (const p2 of byOrbit[2]) {
          const a2 = getPlanetAngle(p2, rotationAngles);
          const d01 = angleDiff(a0, a1);
          const d02 = angleDiff(a0, a2);
          const d12 = angleDiff(a1, a2);
          if (d02 < tolerance && d12 < tolerance) {
            ids.add(p0.id);
            ids.add(p1.id);
            ids.add(p2.id);
            triples.push({
              planets: [p0, p1, p2],
              type: type as PlanetType,
              avgAngleDiff: (d01 + d02 + d12) / 3,
            });
          }
        }
      }
    }
  }

  return { ids, triples };
}

/**
 * Find all cross-orbit planet pairs that are close enough to swap.
 * Returns pairs with their angle difference.
 */
export interface ProximityPair {
  a: Planet;
  b: Planet;
  angleDiff: number;
  canSwap: boolean; // within SWAP_PROXIMITY
}

export function findProximityPairs(
  planets: Planet[],
  rotationAngles: number[]
): ProximityPair[] {
  const pairs: ProximityPair[] = [];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i];
      const b = planets[j];
      // Must be on adjacent orbits
      if (Math.abs(a.orbitIndex - b.orbitIndex) !== 1) continue;

      const angleA = getPlanetAngle(a, rotationAngles);
      const angleB = getPlanetAngle(b, rotationAngles);
      const diff = angleDiff(angleA, angleB);

      if (diff < SWAP_WARN_PROXIMITY) {
        pairs.push({
          a,
          b,
          angleDiff: diff,
          canSwap: diff < SWAP_PROXIMITY,
        });
      }
    }
  }

  return pairs;
}

/**
 * Check if two specific planets are close enough to swap cross-orbit.
 */
export function canSwapPlanets(
  planetA: Planet,
  planetB: Planet,
  rotationAngles: number[]
): boolean {
  if (planetA.orbitIndex === planetB.orbitIndex) return false;
  if (Math.abs(planetA.orbitIndex - planetB.orbitIndex) !== 1) return false;
  const angleA = getPlanetAngle(planetA, rotationAngles);
  const angleB = getPlanetAngle(planetB, rotationAngles);
  return angleDiff(angleA, angleB) < SWAP_PROXIMITY;
}

export function calculateScore(matchCount: number, combo: number): number {
  const base = matchCount === 3 ? 500 : 1000;
  let multiplier = 1;
  if (combo >= 4) multiplier = 3;
  else if (combo >= 3) multiplier = 2.5;
  else if (combo >= 2) multiplier = 2;
  else if (combo >= 1) multiplier = 1.5;
  return Math.round(base * multiplier);
}

export function fillEmptySlots(planets: Planet[]): Planet[] {
  const occupied = new Set(
    planets.map((p) => `${p.orbitIndex}-${p.slotIndex}`)
  );
  const newPlanets: Planet[] = [...planets];

  for (let oi = 0; oi < ORBIT_CONFIGS.length; oi++) {
    const config = ORBIT_CONFIGS[oi];
    for (let si = 0; si < currentSlots[oi]; si++) {
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

/**
 * Fill empty slots with bias: if orbit already has 2 of a type,
 * 40% chance to spawn that type (helps create triples).
 */
export function biasedFillEmptySlots(planets: Planet[]): Planet[] {
  const occupied = new Set(
    planets.map((p) => `${p.orbitIndex}-${p.slotIndex}`)
  );
  const newPlanets: Planet[] = [...planets];

  // Count types per orbit
  const orbitTypeCounts: Record<number, Record<string, number>> = {};
  for (let oi = 0; oi < ORBIT_CONFIGS.length; oi++) {
    orbitTypeCounts[oi] = {};
    for (const p of planets) {
      if (p.orbitIndex === oi) {
        orbitTypeCounts[oi][p.type] = (orbitTypeCounts[oi][p.type] || 0) + 1;
      }
    }
  }

  // Find types that exist on 2 orbits but not 3 (potential triples)
  const neededTypes: PlanetType[] = [];
  for (const type of PLANET_TYPES) {
    let orbitsWithType = 0;
    for (let oi = 0; oi < ORBIT_CONFIGS.length; oi++) {
      if ((orbitTypeCounts[oi][type] || 0) > 0) orbitsWithType++;
    }
    if (orbitsWithType === 2) neededTypes.push(type);
  }

  for (let oi = 0; oi < ORBIT_CONFIGS.length; oi++) {
    const config = ORBIT_CONFIGS[oi];
    for (let si = 0; si < currentSlots[oi]; si++) {
      const key = `${oi}-${si}`;
      if (!occupied.has(key)) {
        let type: PlanetType;
        // Bias: if this orbit is missing a "needed" type, 40% chance to spawn it
        const missingNeeded = neededTypes.filter(
          (t) => (orbitTypeCounts[oi][t] || 0) === 0
        );
        if (missingNeeded.length > 0 && Math.random() < 0.4) {
          type = missingNeeded[Math.floor(Math.random() * missingNeeded.length)];
        } else {
          type = randomPlanetType();
        }

        newPlanets.push({
          id: generateId(),
          type,
          orbitIndex: oi,
          slotIndex: si,
        });
        orbitTypeCounts[oi][type] = (orbitTypeCounts[oi][type] || 0) + 1;
      }
    }
  }

  return newPlanets;
}

/**
 * Shuffle planet types across all occupied slots.
 */
export function shufflePlanets(planets: Planet[]): Planet[] {
  const types = planets.map((p) => p.type);
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return planets.map((p, i) => ({ ...p, type: types[i] }));
}

/**
 * Check if any valid triples exist (same type on all 3 orbits within tolerance).
 */
export function hasValidTriples(
  planets: Planet[],
  rotationAngles: number[],
  tolerance: number = 28
): boolean {
  const result = findAlignedGroups(planets, rotationAngles, tolerance);
  return result.triples.length > 0;
}
