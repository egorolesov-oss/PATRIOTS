import {
  Planet,
  PlanetType,
  ORBIT_CONFIGS,
  SWIPE_TOLERANCE,
  ALIGNMENT_FAR,
  AlignmentIndicator,
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

export function normalizeAngle(angle: number): number {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
}

export function angleDiff(a: number, b: number): number {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(diff, 360 - diff);
}

export function randomPlanetType(): PlanetType {
  return PLANET_TYPES[Math.floor(Math.random() * PLANET_TYPES.length)];
}

export function generateBoard(): Planet[] {
  resetIdCounter();
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

/** Get the current angle of a planet (slot angle + orbit rotation) */
export function getPlanetAngle(
  planet: Planet,
  rotationAngles: number[]
): number {
  return normalizeAngle(
    getSlotAngle(planet.orbitIndex, planet.slotIndex) +
      rotationAngles[planet.orbitIndex]
  );
}

/**
 * Find planets hit by a ray at the given angle.
 * Returns planets within SWIPE_TOLERANCE degrees of the ray angle,
 * one per orbit (the closest to the ray on each orbit).
 */
export function findPlanetsOnRay(
  planets: Planet[],
  rayAngle: number,
  rotationAngles: number[]
): Planet[] {
  const hits: Planet[] = [];

  for (let oi = 0; oi < ORBIT_CONFIGS.length; oi++) {
    const orbitPlanets = planets.filter((p) => p.orbitIndex === oi);
    let bestPlanet: Planet | null = null;
    let bestDiff = Infinity;

    for (const p of orbitPlanets) {
      const pAngle = getPlanetAngle(p, rotationAngles);
      const diff = angleDiff(pAngle, rayAngle);
      if (diff < SWIPE_TOLERANCE && diff < bestDiff) {
        bestDiff = diff;
        bestPlanet = p;
      }
    }

    if (bestPlanet) {
      hits.push(bestPlanet);
    }
  }

  return hits;
}

/**
 * From a list of hit planets, find the best matching group:
 * the most numerous same-type group that spans 2+ orbits.
 */
export function findBestMatch(hitPlanets: Planet[]): {
  matchedPlanets: Planet[];
  matchType: PlanetType | null;
} {
  if (hitPlanets.length < 2) return { matchedPlanets: [], matchType: null };

  const byType: Record<string, Planet[]> = {};
  for (const p of hitPlanets) {
    if (!byType[p.type]) byType[p.type] = [];
    byType[p.type].push(p);
  }

  let bestType: PlanetType | null = null;
  let bestGroup: Planet[] = [];

  for (const type of Object.keys(byType)) {
    const group = byType[type];
    const orbits = new Set(group.map((p) => p.orbitIndex));
    if (orbits.size >= 2 && group.length > bestGroup.length) {
      bestType = type as PlanetType;
      bestGroup = group;
    }
  }

  return { matchedPlanets: bestGroup, matchType: bestType };
}

/**
 * Find all current alignment indicators — pairs/triples of same-type
 * planets that are close to radial alignment across orbits.
 */
export function findAlignments(
  planets: Planet[],
  rotationAngles: number[]
): AlignmentIndicator[] {
  const indicators: AlignmentIndicator[] = [];

  // Group planets by type
  const byType: Record<string, Planet[]> = {};
  for (const p of planets) {
    if (!byType[p.type]) byType[p.type] = [];
    byType[p.type].push(p);
  }

  for (const type of Object.keys(byType)) {
    const group = byType[type];
    // Check all pairs across different orbits
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (group[i].orbitIndex === group[j].orbitIndex) continue;

        const angleI = getPlanetAngle(group[i], rotationAngles);
        const angleJ = getPlanetAngle(group[j], rotationAngles);
        const diff = angleDiff(angleI, angleJ);

        if (diff < ALIGNMENT_FAR) {
          // Check if a third planet on remaining orbit also aligns
          const usedOrbits = new Set([group[i].orbitIndex, group[j].orbitIndex]);
          const avgAngle = normalizeAngle(
            (angleI + angleJ) / 2
          );
          let triple: Planet | null = null;

          for (let k = 0; k < group.length; k++) {
            if (k === i || k === j) continue;
            if (usedOrbits.has(group[k].orbitIndex)) continue;
            const angleK = getPlanetAngle(group[k], rotationAngles);
            if (angleDiff(angleK, avgAngle) < ALIGNMENT_FAR) {
              triple = group[k];
              break;
            }
          }

          const alignedPlanets = [group[i], group[j]];
          if (triple) alignedPlanets.push(triple);

          indicators.push({
            type: type as PlanetType,
            planets: alignedPlanets,
            angleDiff: diff,
          });
        }
      }
    }
  }

  // Deduplicate: keep only the tightest alignment for each planet
  const usedIds = new Set<string>();
  const unique: AlignmentIndicator[] = [];
  indicators.sort((a, b) => a.angleDiff - b.angleDiff);
  for (const ind of indicators) {
    const newPlanets = ind.planets.filter((p) => !usedIds.has(p.id));
    const orbits = new Set(newPlanets.map((p) => p.orbitIndex));
    if (orbits.size >= 2) {
      for (const p of newPlanets) usedIds.add(p.id);
      unique.push({ ...ind, planets: newPlanets });
    }
  }

  return unique;
}

export function calculateSwipeScore(
  matchCount: number,
  allThreeOrbits: boolean,
  perfectAlignment: boolean,
  combo: number
): number {
  let base = matchCount === 2 ? 200 : 500;
  if (perfectAlignment) base = Math.round(base * 1.25);

  // Combo multiplier
  let multiplier = 1;
  if (combo >= 5) multiplier = 3;
  else if (combo >= 4) multiplier = 2.5;
  else if (combo >= 3) multiplier = 2;
  else if (combo >= 2) multiplier = 1.5;

  return Math.round(base * multiplier);
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
