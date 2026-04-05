import {
  Planet,
  PlanetType,
  ORBIT_CONFIGS,
  OrbitMatch,
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

/**
 * Find all groups of 3+ adjacent same-type planets on each orbit.
 * Orbits are circular, so slot 0 is adjacent to the last slot.
 */
export function findOrbitMatches(planets: Planet[]): OrbitMatch[] {
  const matches: OrbitMatch[] = [];

  for (let oi = 0; oi < ORBIT_CONFIGS.length; oi++) {
    const config = ORBIT_CONFIGS[oi];
    const slotCount = config.slotCount;
    // Build slot array for this orbit
    const slots: (Planet | null)[] = new Array(slotCount).fill(null);
    for (const p of planets) {
      if (p.orbitIndex === oi) {
        slots[p.slotIndex] = p;
      }
    }

    // Find runs of same type (circular)
    const visited = new Set<number>();
    for (let start = 0; start < slotCount; start++) {
      if (visited.has(start) || !slots[start]) continue;
      const type = slots[start]!.type;
      const group: Planet[] = [slots[start]!];
      visited.add(start);

      // Expand forward
      let next = (start + 1) % slotCount;
      while (next !== start && slots[next] && slots[next]!.type === type) {
        group.push(slots[next]!);
        visited.add(next);
        next = (next + 1) % slotCount;
      }

      if (group.length >= 3) {
        matches.push({ orbitIndex: oi, planets: group, type });
      }
    }
  }

  return matches;
}

/**
 * Check if a planet belongs to any match group (for highlighting).
 */
export function findMatchingPlanetIds(planets: Planet[]): Set<string> {
  const matches = findOrbitMatches(planets);
  const ids = new Set<string>();
  for (const m of matches) {
    for (const p of m.planets) {
      ids.add(p.id);
    }
  }
  return ids;
}

/**
 * Check if a set of planet IDs forms a valid swipe
 * (all same type, all adjacent on the same orbit, 3+ planets).
 */
export function isValidSwipe(
  planets: Planet[],
  collectedIds: string[]
): boolean {
  if (collectedIds.length < 3) return false;

  const collected = planets.filter((p) => collectedIds.includes(p.id));
  if (collected.length < 3) return false;

  // All same type
  const type = collected[0].type;
  if (!collected.every((p) => p.type === type)) return false;

  // All same orbit
  const orbit = collected[0].orbitIndex;
  if (!collected.every((p) => p.orbitIndex === orbit)) return false;

  // All adjacent
  const slotCount = ORBIT_CONFIGS[orbit].slotCount;
  const slotSet = new Set(collected.map((p) => p.slotIndex));
  const sortedSlots = [...slotSet].sort((a, b) => a - b);

  // Check if consecutive (accounting for circular wrap)
  let consecutive = true;
  for (let i = 1; i < sortedSlots.length; i++) {
    if (sortedSlots[i] - sortedSlots[i - 1] !== 1) {
      consecutive = false;
      break;
    }
  }
  // Check wrap-around case (e.g., slots 0,1,9 on 10-slot orbit)
  if (!consecutive && sortedSlots.length >= 3) {
    const wrapCheck = sortedSlots[sortedSlots.length - 1] - sortedSlots[0] === slotCount - 1;
    if (wrapCheck) {
      // Check if the gap is exactly at one point
      let gapCount = 0;
      for (let i = 1; i < sortedSlots.length; i++) {
        if (sortedSlots[i] - sortedSlots[i - 1] !== 1) gapCount++;
      }
      consecutive = gapCount === 1;
    }
  }

  return consecutive;
}

export function calculateScore(matchCount: number, combo: number): number {
  const base = matchCount === 3 ? 300 : matchCount === 4 ? 600 : 1000;
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
