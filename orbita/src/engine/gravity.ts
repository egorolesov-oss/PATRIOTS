import { PlanetType, PLANET_CONFIGS } from '../types/game';

// --- PHYSICS CONSTANTS ---
export const GRAVITY_G = 120;
export const STAR_MASS = 8000;
export const STAR_RADIUS = 30; // collision radius (visual is bigger)
export const BOARD_RADIUS = 220; // escape boundary

// Planet size categories — Earth-like proportions
export interface GravPlanet {
  id: string;
  type: PlanetType;
  mass: number;
  radius: number; // visual radius px
  x: number;
  y: number;
  vx: number;
  vy: number;
  stable: boolean; // has been orbiting long enough
  stableTime: number; // seconds in orbit
  launched: boolean;
}

export const PLANET_MASSES: Record<'small' | 'medium' | 'large', { mass: number; radius: number }> = {
  small: { mass: 1, radius: 8 },
  medium: { mass: 2, radius: 11 },
  large: { mass: 5, radius: 15 },
};

const SIZES = ['small', 'medium', 'large'] as const;

let nextGravId = 1;

export function createRandomGravPlanet(x: number, y: number): GravPlanet {
  const types = Object.values(PlanetType);
  const type = types[Math.floor(Math.random() * types.length)];
  const sizeKey = SIZES[Math.floor(Math.random() * SIZES.length)];
  const size = PLANET_MASSES[sizeKey];
  return {
    id: `gp${nextGravId++}`,
    type,
    mass: size.mass,
    radius: size.radius,
    x,
    y,
    vx: 0,
    vy: 0,
    stable: false,
    stableTime: 0,
    launched: false,
  };
}

export function resetGravIds() {
  nextGravId = 1;
}

// --- PHYSICS SIMULATION ---

export function gravityStep(
  planets: GravPlanet[],
  starX: number,
  starY: number,
  dt: number
): { planets: GravPlanet[]; crashed: string[]; escaped: string[] } {
  const crashed: string[] = [];
  const escaped: string[] = [];

  // Calculate forces and update velocities
  const updated = planets.map((p) => {
    if (!p.launched) return p;

    let ax = 0;
    let ay = 0;

    // Gravity from star
    const dxS = starX - p.x;
    const dyS = starY - p.y;
    const distS = Math.sqrt(dxS * dxS + dyS * dyS);
    if (distS > 1) {
      const forceS = (GRAVITY_G * STAR_MASS * p.mass) / (distS * distS);
      ax += (forceS * dxS) / (distS * p.mass);
      ay += (forceS * dyS) / (distS * p.mass);
    }

    // Gravity from other planets
    for (const other of planets) {
      if (other.id === p.id || !other.launched) continue;
      const dx = other.x - p.x;
      const dy = other.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        const force = (GRAVITY_G * other.mass * p.mass) / (dist * dist);
        ax += (force * dx) / (dist * p.mass);
        ay += (force * dy) / (dist * p.mass);
      }
    }

    const newVx = p.vx + ax * dt;
    const newVy = p.vy + ay * dt;
    const newX = p.x + newVx * dt;
    const newY = p.y + newVy * dt;

    // Check star collision
    const distToStar = Math.sqrt((newX - starX) ** 2 + (newY - starY) ** 2);
    if (distToStar < STAR_RADIUS + p.radius) {
      crashed.push(p.id);
      return p;
    }

    // Check escape — only if far away AND moving away faster than escape velocity
    const speed = Math.sqrt(newVx * newVx + newVy * newVy);
    const escapeV = Math.sqrt(2 * GRAVITY_G * STAR_MASS / distToStar);
    // Radial velocity (positive = moving away from star)
    const radialV = ((newX - starX) * newVx + (newY - starY) * newVy) / distToStar;
    if (distToStar > BOARD_RADIUS * 2 && radialV > 0 && speed > escapeV) {
      escaped.push(p.id);
      return p;
    }

    // Check orbit stability (orbiting for 3+ seconds)
    const circularV = Math.sqrt(GRAVITY_G * STAR_MASS / distToStar);
    const isOrbiting = distToStar > STAR_RADIUS + 20 && speed < circularV * 2 && speed > circularV * 0.2;

    let newStableTime = isOrbiting ? p.stableTime + dt : 0;
    let newStable = p.stable || newStableTime > 3;

    return {
      ...p,
      x: newX,
      y: newY,
      vx: newVx,
      vy: newVy,
      stableTime: newStableTime,
      stable: newStable,
    };
  });

  const remaining = updated.filter((p) => !crashed.includes(p.id) && !escaped.includes(p.id));
  return { planets: remaining, crashed, escaped };
}

// Calculate trajectory preview (simplified, star gravity only)
export function trajectoryPreview(
  startX: number,
  startY: number,
  vx: number,
  vy: number,
  starX: number,
  starY: number,
  steps: number = 60
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let x = startX;
  let y = startY;
  let cvx = vx;
  let cvy = vy;
  const dt = 0.016;

  for (let i = 0; i < steps; i++) {
    const dx = starX - x;
    const dy = starY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < STAR_RADIUS || dist > BOARD_RADIUS + 50) break;

    const force = (GRAVITY_G * STAR_MASS) / (dist * dist);
    const ax = (force * dx) / dist;
    const ay = (force * dy) / dist;
    cvx += ax * dt;
    cvy += ay * dt;
    x += cvx * dt;
    y += cvy * dt;

    if (i % 3 === 0) points.push({ x, y });
  }

  return points;
}
