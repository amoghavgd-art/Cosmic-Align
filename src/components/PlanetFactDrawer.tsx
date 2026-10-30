/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Compass, Globe, Sparkles, Orbit, Thermometer, Weight, Clock, ArrowRight, ShieldAlert } from 'lucide-react';
import { PLANETS_DATA, SUN_DATA } from '../data/planetsData';
import { CelestialCoordinates, MoonData } from '../types/astronomy';
import { computePlanetCoordinates } from '../utils/astronomy';

interface PlanetFactDrawerProps {
  planetId: string | null;
  moonId: string | null;
  currentDate: Date;
  onClose: () => void;
  onSelectMoon: (moonId: string | null) => void;
}

export const PlanetFactDrawer: React.FC<PlanetFactDrawerProps> = ({
  planetId,
  moonId,
  currentDate,
  onClose,
  onSelectMoon,
}) => {
  if (!planetId) return null;

  const isSun = planetId === 'sun';
  const planet = !isSun ? PLANETS_DATA.find((p) => p.id === planetId) : null;

  if (!isSun && !planet) return null;

  // Compute live coordinates
  let coords: CelestialCoordinates | null = null;
  if (planet) {
    const earth = PLANETS_DATA.find((p) => p.id === 'earth')!;
    const earthCoords = computePlanetCoordinates(earth.kepler, currentDate);
    coords = computePlanetCoordinates(planet.kepler, currentDate, {
      x: earthCoords.x,
      y: earthCoords.y,
      z: earthCoords.z,
    });
  }

  // Find selected moon if any
  const selectedMoon: MoonData | undefined =
    planet && moonId ? planet.moons.find((m) => m.id === moonId) : undefined;

  return (
    <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-[440px] z-30 bg-[#080d1e]/95 backdrop-blur-xl border-l border-slate-700/60 shadow-2xl flex flex-col text-slate-100 overflow-hidden transition-all duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Orbit className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isSun ? 'CENTRAL STELLAR ENGINE' : `${planet?.category.toUpperCase()} PLANET`}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          aria-label="Close fact panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">
        {/* Title & Tagline */}
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border border-white/20 shrink-0"
              style={{
                backgroundColor: isSun ? SUN_DATA.color : planet?.color,
                boxShadow: `0 0 20px ${isSun ? '#F59E0B' : planet?.color}66`,
              }}
            >
              <span className="text-slate-900 font-bold text-sm">
                {isSun ? '☉' : planet?.name.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {isSun ? SUN_DATA.name : planet?.name}
              </h2>
              <p className="text-xs text-cyan-300 font-medium mt-0.5">
                {isSun ? SUN_DATA.tagline : planet?.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Live Alignment Telemetry Card */}
        {coords && planet && (
          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                Live Heliocentric Alignment
              </span>
              <span className="text-[11px] font-mono text-emerald-400">LIVE SYNC</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[10px] uppercase">Ecliptic Longitude</div>
                <div className="text-sm font-semibold text-cyan-300 mt-0.5 tabular-nums">
                  {coords.eclipticLongitudeDeg.toFixed(2)}°
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{coords.zodiacSign}</div>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[10px] uppercase">Distance from Earth</div>
                <div className="text-sm font-semibold text-emerald-300 mt-0.5 tabular-nums">
                  {coords.distanceFromEarthAU.toFixed(3)} AU
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                  {(coords.distanceFromEarthAU * 149.6).toFixed(1)} M km
                </div>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[10px] uppercase">Distance from Sun</div>
                <div className="text-sm font-semibold text-amber-300 mt-0.5 tabular-nums">
                  {coords.distanceAU.toFixed(3)} AU
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                  {(coords.distanceAU * 149.6).toFixed(1)} M km
                </div>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[10px] uppercase">Orbital Speed</div>
                <div className="text-sm font-semibold text-purple-300 mt-0.5 tabular-nums">
                  {coords.currentSpeedKmS.toFixed(2)} km/s
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                  {(coords.currentSpeedKmS * 3600).toLocaleString(undefined, { maximumFractionDigits: 0 })} km/h
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kurzgesagt Fact Card */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/30">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Mind-Blowing Cosmic Fact
          </div>
          <p className="text-xs text-amber-100/90 leading-relaxed">
            {isSun ? SUN_DATA.kurzgesagtFact : planet?.kurzgesagtFact}
          </p>
        </div>

        {/* Selected Moon Spotlight (if moon chosen) */}
        {selectedMoon && (
          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Selected Moon: {selectedMoon.name}
              </div>
              <button
                onClick={() => onSelectMoon(null)}
                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Back to Planet
              </button>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">{selectedMoon.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400">Radius:</span>{' '}
                <span className="text-cyan-300 font-semibold">{selectedMoon.radiusKm} km</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400">Orbital Period:</span>{' '}
                <span className="text-cyan-300 font-semibold">{selectedMoon.orbitalPeriodDays} days</span>
              </div>
            </div>
            <div className="p-2.5 rounded bg-slate-950/70 text-xs text-cyan-100/90 border border-cyan-500/20 italic">
              "{selectedMoon.keyFact}"
            </div>
          </div>
        )}

        {/* Physical Facts Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Planetary Physical Parameters
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex items-start gap-2.5">
              <Thermometer className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-slate-400 text-[11px]">Average Temp</div>
                <div className="font-semibold text-slate-200 mt-0.5">
                  {isSun ? `${SUN_DATA.avgTempC}°C (surface)` : `${planet?.avgTempC}°C`}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex items-start gap-2.5">
              <Weight className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-slate-400 text-[11px]">Surface Gravity</div>
                <div className="font-semibold text-slate-200 mt-0.5">
                  {isSun ? '274 m/s² (28g)' : `${planet?.gravityMPerS2} m/s²`}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-slate-400 text-[11px]">Day Length (Rotation)</div>
                <div className="font-semibold text-slate-200 mt-0.5">
                  {isSun
                    ? '25-35 Earth Days'
                    : Math.abs(planet?.rotationPeriodHours || 0) < 48
                    ? `${Math.abs(planet?.rotationPeriodHours || 0).toFixed(1)} hrs`
                    : `${(Math.abs(planet?.rotationPeriodHours || 0) / 24).toFixed(1)} days`}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex items-start gap-2.5">
              <Orbit className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-slate-400 text-[11px]">Year Length (Orbit)</div>
                <div className="font-semibold text-slate-200 mt-0.5">
                  {isSun
                    ? '230M yrs (Milky Way)'
                    : `${planet?.orbitalPeriodYears} Earth yrs`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Atmosphere & Composition */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Atmospheric Composition
          </h3>
          <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800 leading-relaxed">
            {isSun
              ? '73.46% Hydrogen, 24.85% Helium, trace oxygen, carbon, neon, iron.'
              : planet?.atmosphere}
          </p>
        </div>

        {/* Moons Explorer List */}
        {planet && planet.moons.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Key Moons ({planet.moons.length} featured of {planet.moonsCount} total)
              </h3>
            </div>
            <div className="space-y-1.5">
              {planet.moons.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onSelectMoon(m.id === moonId ? null : m.id)}
                  className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                    m.id === moonId
                      ? 'bg-cyan-950/60 border-cyan-500/80 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                      style={{ backgroundColor: m.color }}
                    />
                    <div>
                      <div className="text-xs font-semibold">{m.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Radius: {m.radiusKm} km · Period: {m.orbitalPeriodDays}d
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scientific Dossier */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Scientific Overview
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isSun ? SUN_DATA.scientificSummary : planet?.scientificSummary}
          </p>
        </div>
      </div>
    </aside>
  );
};
