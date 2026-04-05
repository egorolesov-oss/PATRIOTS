import {
  Planet,
  PlanetType,
  ORBIT_CONFIGS,
  PLANET_HITBOX,
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

/**
 * Find groups of same-type planets that are nearly aligned across orbits.
 * Returns planet IDs that are part of any potential alignment (within tolerance).
 */
export function findAlignedGroups(
  planets: Planet[],
  rotationAngles: number[],
  tolerance: number = 15
): Set<string> {
  const ids = new Set<string>();
  const byType: Record<string, Planet[]> = {};

  for (const p of planets) {
    if (!byType[p.type]) byType[p.type] = [];
    byType[p.type].push(p);
  }

  for (const type of Object.keys(byType)) {
    const group = byType[type];
    // Need planets on all 3 orbits
    const byOrbit: Planet[][] = [[], [], []];
    for (const p of group) byOrbit[p.orbitIndex].push(p);
    if (byOrbit[0].length === 0 || byOrbit[1].length === 0 || byOrbit[2].length === 0) continue;

    // Check all triples (one per orbit)
    for (const p0 of byOrbit[0]) {
      const a0 = getPlanetAngle(p0, rotationAngles);
      for (const p1 of byOrbit[1]) {
        const a1 = getPlanetAngle(p1, rotationAngles);
        if (angleDiff(a0, a1) >= tolerance) continue;
        for (const p2 of byOrbit[2]) {
          const a2 = getPlanetAngle(p2, rotationAngles);
          if (angleDiff(a0, a2) < tolerance && angleDiff(a1, a2) < tolerance) {
            ids.add(p0.id);
            ids.add(p1.id);
            ids.add(p2.id);
          }
        }
      }
    }
  }

  return ids;
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
