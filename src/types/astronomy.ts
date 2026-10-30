/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface KeplerianElements {
  /** Semi-major axis in AU */
  a: number;
  /** Rate of change of a (AU / century) */
  a_rate?: number;
  /** Eccentricity */
  e: number;
  /** Rate of change of e (/ century) */
  e_rate?: number;
  /** Inclination in degrees */
  i: number;
  /** Rate of change of i (deg / century) */
  i_rate?: number;
  /** Mean longitude in degrees */
  L: number;
  /** Rate of change of L (deg / century) */
  L_rate: number;
  /** Longitude of perihelion in degrees */
  w_bar: number;
  /** Rate of change of w_bar (deg / century) */
  w_bar_rate?: number;
  /** Longitude of ascending node in degrees */
  node: number;
  /** Rate of change of node (deg / century) */
  node_rate?: number;
}

export interface MoonData {
  id: string;
  name: string;
  radiusKm: number;
  distanceKm: number; // distance from planet center
  orbitalPeriodDays: number;
  color: string;
  textureType: 'crater' | 'volcanic' | 'ice_cracked' | 'hazy' | 'smooth' | 'mottled';
  description: string;
  discovered: string;
  keyFact: string;
}

export interface PlanetData {
  id: string;
  name: string;
  category: 'Terrestrial' | 'Gas Giant' | 'Ice Giant' | 'Dwarf Planet' | 'Star';
  realRadiusKm: number;
  displayRadius: number; // Scaled for vector poster aesthetic
  color: string;
  secondaryColor: string;
  orbitColor: string;
  kepler: KeplerianElements;
  tiltDeg: number;
  rotationPeriodHours: number;
  orbitalPeriodYears: number;
  meanVelocityKmS: number;
  avgTempC: number;
  gravityMPerS2: number;
  massKg: string;
  densityGPerCm3: number;
  atmosphere: string;
  moonsCount: number;
  moons: MoonData[];
  tagline: string;
  kurzgesagtFact: string;
  scientificSummary: string;
  rings?: {
    innerRadius: number;
    outerRadius: number;
    colors: string[];
    tiltDeg: number;
  };
}

export interface CelestialCoordinates {
  /** Heliocentric X in AU */
  x: number;
  /** Heliocentric Y in AU */
  y: number;
  /** Heliocentric Z in AU */
  z: number;
  /** Distance from Sun in AU */
  distanceAU: number;
  /** Heliocentric ecliptic longitude in degrees [0, 360) */
  eclipticLongitudeDeg: number;
  /** True anomaly in degrees */
  trueAnomalyDeg: number;
  /** Orbital speed at current position in km/s */
  currentSpeedKmS: number;
  /** Distance from Earth in AU */
  distanceFromEarthAU: number;
  /** Phase angle from Earth in degrees */
  phaseAngleDeg: number;
  /** Constellation / Zodiac direction */
  zodiacSign: string;
}

export interface MoonPosition {
  moon: MoonData;
  /** Relative offset X from planet in AU */
  offsetX: number;
  /** Relative offset Y from planet in AU */
  offsetY: number;
  /** Angle in radians */
  angle: number;
  /** Is currently in planet's umbra shadow? */
  isInUmbra: boolean;
  /** Is currently casting solar eclipse shadow on planet? */
  isCastingEclipse: boolean;
}

export type ViewMode = 'poster_tilted' | 'top_down' | 'shadows_eclipses';

export interface AlignmentEvent {
  title: string;
  dateStr: string;
  description: string;
  type: 'eclipse' | 'conjunction' | 'opposition' | 'parade';
  timestamp: number;
}
