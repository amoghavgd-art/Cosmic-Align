/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KeplerianElements, CelestialCoordinates, MoonData, MoonPosition, PlanetData } from '../types/astronomy';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Computes Julian Date from JavaScript Date
 */
export function getJulianDate(date: Date): number {
  const time = date.getTime();
  return time / 86400000 + 2440587.5;
}

/**
 * Computes centuries since J2000.0 (January 1, 2000, 12:00 TT)
 */
export function getCenturiesSinceJ2000(date: Date): number {
  const jd = getJulianDate(date);
  return (jd - 2451545.0) / 36525.0;
}

/**
 * Normalizes angle to [0, 360) degrees
 */
export function normalizeDegrees(deg: number): number {
  let val = deg % 360;
  if (val < 0) val += 360;
  return val;
}

/**
 * Solves Kepler's equation E - e*sin(E) = M via Newton-Raphson iteration
 */
function solveKepler(M_rad: number, e: number): number {
  let E = M_rad + e * Math.sin(M_rad) * (1.0 + e * Math.cos(M_rad));
  for (let i = 0; i < 15; i++) {
    const f = E - e * Math.sin(E) - M_rad;
    const fPrime = 1.0 - e * Math.cos(E);
    const delta = f / fPrime;
    E -= delta;
    if (Math.abs(delta) < 1e-7) break;
  }
  return E;
}

/**
 * Computes precise heliocentric ecliptic coordinates for a planet at a given date
 */
export function computePlanetCoordinates(
  kepler: KeplerianElements,
  date: Date,
  earthCoords?: { x: number; y: number; z: number }
): CelestialCoordinates {
  const T = getCenturiesSinceJ2000(date);

  // Compute elements at epoch T
  const a = kepler.a + (kepler.a_rate || 0) * T;
  const e = kepler.e + (kepler.e_rate || 0) * T;
  const i = (kepler.i + (kepler.i_rate || 0) * T) * DEG2RAD;
  const L = normalizeDegrees(kepler.L + kepler.L_rate * T);
  const w_bar = normalizeDegrees(kepler.w_bar + (kepler.w_bar_rate || 0) * T);
  const node = normalizeDegrees(kepler.node + (kepler.node_rate || 0) * T) * DEG2RAD;

  const w = normalizeDegrees(w_bar - node * RAD2DEG) * DEG2RAD;
  const M = normalizeDegrees(L - w_bar) * DEG2RAD;

  // Solve Kepler equation
  const E = solveKepler(M, e);

  // Coordinates in orbital plane
  const x_prime = a * (Math.cos(E) - e);
  const y_prime = a * Math.sqrt(1 - e * e) * Math.sin(E);

  // Rotate to heliocentric ecliptic coordinates
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);
  const cosNode = Math.cos(node);
  const sinNode = Math.sin(node);
  const cosI = Math.cos(i);

  const x = (cosW * cosNode - sinW * sinNode * cosI) * x_prime +
            (-sinW * cosNode - cosW * sinNode * cosI) * y_prime;
  const y = (cosW * sinNode + sinW * cosNode * cosI) * x_prime +
            (-sinW * sinNode + cosW * cosNode * cosI) * y_prime;
  const z = (sinW * Math.sin(i)) * x_prime +
            (cosW * Math.sin(i)) * y_prime;

  const distanceAU = Math.sqrt(x * x + y * y + z * z);
  let eclipticLongitudeDeg = normalizeDegrees(Math.atan2(y, x) * RAD2DEG);

  // True anomaly
  const trueAnomalyDeg = normalizeDegrees(Math.atan2(y_prime, x_prime) * RAD2DEG);

  // Orbital speed (vis-viva equation: v = sqrt(GM * (2/r - 1/a)))
  // Earth's mean speed = 29.78 km/s
  const currentSpeedKmS = 29.78 * Math.sqrt(Math.max(0, 2 / distanceAU - 1 / a));

  // Distance from Earth and phase angle if Earth coords available
  let distanceFromEarthAU = 0;
  let phaseAngleDeg = 0;

  if (earthCoords) {
    const dx = x - earthCoords.x;
    const dy = y - earthCoords.y;
    const dz = z - earthCoords.z;
    distanceFromEarthAU = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Phase angle: angle Sun - Planet - Earth
    const sunPlanetDist = distanceAU;
    const earthPlanetDist = distanceFromEarthAU;
    const sunEarthDist = Math.sqrt(earthCoords.x ** 2 + earthCoords.y ** 2 + earthCoords.z ** 2);

    const cosPhase = (sunPlanetDist ** 2 + earthPlanetDist ** 2 - sunEarthDist ** 2) /
      (2 * sunPlanetDist * earthPlanetDist + 1e-9);
    phaseAngleDeg = Math.acos(Math.max(-1, Math.min(1, cosPhase))) * RAD2DEG;
  }

  const zodiacSign = getZodiacSign(eclipticLongitudeDeg);

  return {
    x,
    y,
    z,
    distanceAU,
    eclipticLongitudeDeg,
    trueAnomalyDeg,
    currentSpeedKmS,
    distanceFromEarthAU,
    phaseAngleDeg,
    zodiacSign,
  };
}

/**
 * Returns the astrological/astronomical zodiac constellation for a given ecliptic longitude
 */
export function getZodiacSign(longitudeDeg: number): string {
  const signs = [
    'Aries ♈',
    'Taurus ♉',
    'Gemini ♊',
    'Cancer ♋',
    'Leo ♌',
    'Virgo ♍',
    'Libra ♎',
    'Scorpius ♏',
    'Sagittarius ♐',
    'Capricornus ♑',
    'Aquarius ♒',
    'Pisces ♓',
  ];
  const index = Math.floor(longitudeDeg / 30) % 12;
  return signs[index];
}

/**
 * Calculates current position of moons for a given planet and date
 */
export function computeMoonPositions(
  planet: PlanetData,
  planetCoords: CelestialCoordinates,
  date: Date
): MoonPosition[] {
  const timeMs = date.getTime();
  const dayFrac = timeMs / 86400000;

  // Direction from Sun to planet
  const sunToPlanetAngle = Math.atan2(planetCoords.y, planetCoords.x);

  return planet.moons.map((moon, idx) => {
    // Semi-major axis for display aesthetic around the planet
    // Spread moons comfortably
    const baseVisualRadiusAU = 0.08 + idx * 0.055;
    const periodDays = Math.abs(moon.orbitalPeriodDays);
    const direction = moon.orbitalPeriodDays >= 0 ? 1 : -1;

    // Angle of moon around planet
    const moonAngle = (dayFrac / periodDays) * 2 * Math.PI * direction + (idx * 1.57);

    const offsetX = Math.cos(moonAngle) * baseVisualRadiusAU;
    const offsetY = Math.sin(moonAngle) * baseVisualRadiusAU;

    // Calculate angle relative to Sun shadow axis (shadow is at sunToPlanetAngle)
    const angleDiff = Math.abs(normalizeDegrees((moonAngle - sunToPlanetAngle) * RAD2DEG));

    // In umbra if directly behind planet (angle difference < 14 degrees from shadow axis)
    const isInUmbra = angleDiff < 14;

    // Casting eclipse if directly between Sun and planet (angle difference around 180 degrees)
    const isCastingEclipse = Math.abs(angleDiff - 180) < 14;

    return {
      moon,
      offsetX,
      offsetY,
      angle: moonAngle,
      isInUmbra,
      isCastingEclipse,
    };
  });
}

/**
 * Calculates shadow cone vertices (Umbra & Penumbra) pointing away from Sun
 */
export function computeShadowCone(
  planetX: number,
  planetY: number,
  planetRadius: number,
  sunX = 0,
  sunY = 0
) {
  const dx = planetX - sunX;
  const dy = planetY - sunY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const dirX = dx / dist;
  const dirY = dy / dist;

  // Perpendicular vector
  const perpX = -dirY;
  const perpY = dirX;

  // Umbra length (longer for larger planets)
  const umbraLength = planetRadius * 12 + 60;
  const penumbraLength = umbraLength * 1.6;

  // Tangent points on planet
  const p1X = planetX + perpX * planetRadius;
  const p1Y = planetY + perpY * planetRadius;
  const p2X = planetX - perpX * planetRadius;
  const p2Y = planetY - perpY * planetRadius;

  // Umbra apex
  const umbraApexX = planetX + dirX * umbraLength;
  const umbraApexY = planetY + dirY * umbraLength;

  // Penumbra flaring points
  const penumbraSpread = planetRadius * 2.8;
  const pen1X = planetX + dirX * penumbraLength + perpX * penumbraSpread;
  const pen1Y = planetY + dirY * penumbraLength + perpY * penumbraSpread;
  const pen2X = planetX + dirX * penumbraLength - perpX * penumbraSpread;
  const pen2Y = planetY + dirY * penumbraLength - perpY * penumbraSpread;

  return {
    dirX,
    dirY,
    perpX,
    perpY,
    p1: { x: p1X, y: p1Y },
    p2: { x: p2X, y: p2Y },
    umbraApex: { x: umbraApexX, y: umbraApexY },
    pen1: { x: pen1X, y: pen1Y },
    pen2: { x: pen2X, y: pen2Y },
  };
}

/**
 * Generate randomized yet stable asteroid belt particles
 */
export interface AsteroidParticle {
  orbitAU: number;
  initialAngle: number;
  speedMultiplier: number;
  radius: number;
  eccentricity: number;
  color: string;
  points: number[];
}

export function generateAsteroidBelt(count = 280): AsteroidParticle[] {
  const asteroids: AsteroidParticle[] = [];
  const colors = ['#64748B', '#94A3B8', '#78716C', '#A8A29E', '#CBD5E1', '#475569'];

  for (let i = 0; i < count; i++) {
    // Asteroid belt sits between 2.2 and 3.2 AU
    const orbitAU = 2.15 + Math.random() * 1.15;
    const initialAngle = Math.random() * Math.PI * 2;
    // Keplerian speed approximately scales as 1 / sqrt(r)
    const speedMultiplier = 1 / Math.sqrt(orbitAU);
    const radius = 1.2 + Math.random() * 2.2;
    const eccentricity = Math.random() * 0.08;
    const color = colors[Math.floor(Math.random() * colors.length)];

    // 5-7 polygon vertex offsets for stylized faceted asteroid look
    const numPoints = 5 + Math.floor(Math.random() * 3);
    const points: number[] = [];
    for (let p = 0; p < numPoints; p++) {
      points.push(0.75 + Math.random() * 0.5);
    }

    asteroids.push({
      orbitAU,
      initialAngle,
      speedMultiplier,
      radius,
      eccentricity,
      color,
      points,
    });
  }

  return asteroids;
}
