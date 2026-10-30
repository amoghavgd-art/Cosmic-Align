/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Eye,
  Layers,
  Moon,
  Compass,
  Calendar,
  Sparkles,
  Info,
  ChevronDown,
  Sun,
  Radio,
  Clock,
} from 'lucide-react';
import { ViewMode, AlignmentEvent } from '../types/astronomy';
import { PLANETS_DATA, ALIGNMENT_PRESETS } from '../data/planetsData';

interface ControlsOverlayProps {
  currentDate: Date;
  onDateChange: (newDate: Date) => void;
  isLiveMode: boolean;
  onToggleLiveMode: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showOrbits: boolean;
  onToggleOrbits: () => void;
  showMoons: boolean;
  onToggleMoons: () => void;
  showAsteroids: boolean;
  onToggleAsteroids: () => void;
  showStems: boolean;
  onToggleStems: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  realShadowsMode: boolean;
  onToggleRealShadows: () => void;
  selectedPlanetId: string | null;
  onSelectPlanet: (id: string | null) => void;
  eclipseNotification: { planetName: string; moonName: string; type: 'solar' | 'lunar' } | null;
  isChatOpen: boolean;
  onToggleChat: () => void;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  currentDate,
  onDateChange,
  isLiveMode,
  onToggleLiveMode,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onSpeedChange,
  viewMode,
  onViewModeChange,
  showOrbits,
  onToggleOrbits,
  showMoons,
  onToggleMoons,
  showAsteroids,
  onToggleAsteroids,
  showStems,
  onToggleStems,
  showLabels,
  onToggleLabels,
  realShadowsMode,
  onToggleRealShadows,
  selectedPlanetId,
  onSelectPlanet,
  eclipseNotification,
  isChatOpen,
  onToggleChat,
}) => {
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);

  const handleStepDays = (days: number) => {
    const nextDate = new Date(currentDate.getTime() + days * 86400000);
    onDateChange(nextDate);
  };

  const handleSelectPreset = (preset: AlignmentEvent) => {
    onDateChange(new Date(preset.timestamp));
    setShowPresetsMenu(false);
  };

  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const formattedTime = currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* Top Poster Navigation Bar */}
      <header className="pointer-events-auto flex items-center justify-between gap-3 sm:gap-4 px-3 sm:px-5 py-2.5 rounded-2xl bg-[#070b1e]/95 backdrop-blur-xl border border-slate-800 shadow-2xl max-w-full overflow-x-auto scrollbar-none">
        {/* Brand & Poster Title (Kurzgesagt Poster Style) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
            <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black tracking-tight text-white uppercase font-sans whitespace-nowrap">
                The Solar System
              </span>
              {isLiveMode ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                  <Clock className="w-3 h-3" />
                  SIM
                </span>
              )}
            </div>
            <p className="text-[10px] text-cyan-300 font-medium hidden sm:block">
              Real-time planetary alignments & lunar ephemeris
            </p>
          </div>
        </div>

        {/* View Mode Controls (Poster Tilted vs Top-Down vs Shadows Mode) */}
        <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800/90 shrink-0">
          <button
            onClick={() => onViewModeChange('poster_tilted')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'poster_tilted' && !realShadowsMode
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Poster 3D
          </button>
          <button
            onClick={() => {
              onViewModeChange('top_down');
              if (realShadowsMode) onToggleRealShadows();
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'top_down' && !realShadowsMode
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Top-Down
          </button>
          <button
            onClick={onToggleRealShadows}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              realShadowsMode
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Real Shadows
          </button>

          {/* Historic Events Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPresetsMenu(!showPresetsMenu)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Historic Eclipses
              <ChevronDown className="w-3 h-3 ml-0.5 text-slate-400" />
            </button>

            {showPresetsMenu && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#090e24]/98 border border-slate-700/80 p-2 shadow-2xl backdrop-blur-2xl z-40 space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                  Select Astronomical Event
                </div>
                {ALIGNMENT_PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    onClick={() => handleSelectPreset(preset)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors flex flex-col cursor-pointer group border border-transparent hover:border-cyan-500/30"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-cyan-300">
                      <span>{preset.title}</span>
                      <span className="text-[10px] font-mono text-cyan-400/80">{preset.dateStr}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Chatbot & Primary Actions (Guaranteed NEVER pushed off) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onToggleChat}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
              isChatOpen
                ? 'bg-purple-600 text-white shadow-purple-600/40 ring-1 ring-purple-400'
                : 'bg-[#1e1b4b] hover:bg-[#2e2b6b] text-purple-200 border border-purple-500/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Ask Cosmo</span>
          </button>

          <button
            onClick={onToggleLiveMode}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
              isLiveMode
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isLiveMode ? 'Live' : 'Go Live'}</span>
          </button>

          <button
            onClick={() => onSelectPlanet('earth')}
            title="Focus Camera on Earth"
            className="px-3 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-all shadow-md shadow-cyan-600/30 cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Focus Earth</span>
          </button>
        </div>
      </header>

      {/* Floating Eclipse Banner: IN THE TOP-RIGHT CORNER (NOT smack in the middle) */}
      {realShadowsMode && eclipseNotification && (
        <aside className="pointer-events-auto absolute top-20 right-4 sm:right-6 z-20 max-w-xs sm:max-w-sm rounded-2xl bg-[#140b2e]/98 border border-purple-500/70 shadow-2xl backdrop-blur-xl p-3.5 flex items-start gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-xl bg-purple-500/25 border border-purple-500/40 flex items-center justify-center shrink-0 text-purple-300">
            <Moon className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs pr-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-200">
                {eclipseNotification.type === 'solar' ? '☀️ Solar Eclipse Active' : '🌑 Lunar Eclipse Active'}
              </span>
            </div>
            <p className="text-[11px] text-purple-300/85 mt-1 leading-relaxed">
              {eclipseNotification.moonName} is {eclipseNotification.type === 'solar' ? 'transiting between the Sun and' : 'immersed in the umbra of'} {eclipseNotification.planetName}.
            </p>
          </div>
        </aside>
      )}

      {/* Left HUD: Visual Layers & Orbit Path Toggles */}
      <div className="pointer-events-auto absolute left-4 sm:left-6 top-24 flex flex-col gap-2">
        <div className="bg-[#070b1e]/90 backdrop-blur-xl border border-slate-800 p-2 rounded-2xl shadow-xl flex flex-col gap-1.5">
          <div className="px-2 py-1 text-[10px] font-mono uppercase text-slate-500 font-bold">
            Layers & Paths
          </div>

          {/* Orbital Paths Toggle (User Request!) */}
          <button
            onClick={onToggleOrbits}
            title="Toggle Orbital Paths"
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 text-xs font-bold ${
              showOrbits
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Orbit Paths</span>
          </button>

          {/* Real Shadows Toggle (User Request!) */}
          <button
            onClick={onToggleRealShadows}
            title="Toggle Real Shadows Mode"
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 text-xs font-bold ${
              realShadowsMode
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Moon className="w-4 h-4 shrink-0" />
            <span>Real Shadows</span>
          </button>

          {/* Moons Toggle */}
          <button
            onClick={onToggleMoons}
            title="Toggle Planetary Moons"
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 text-xs font-bold ${
              showMoons
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span>Moons</span>
          </button>

          {/* Asteroid Belt Toggle */}
          <button
            onClick={onToggleAsteroids}
            title="Toggle Asteroid Belt"
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 text-xs font-bold ${
              showAsteroids
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Asteroid Belt</span>
          </button>

          {/* Poster Stems Toggle */}
          {viewMode === 'poster_tilted' && (
            <button
              onClick={onToggleStems}
              title="Toggle Poster Elevation Stems"
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 text-xs font-bold ${
                showStems
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span>Poster Stems</span>
            </button>
          )}

          {/* Labels Toggle */}
          <button
            onClick={onToggleLabels}
            title="Toggle Planet Labels"
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 text-xs font-bold ${
              showLabels
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>Planet Labels</span>
          </button>
        </div>
      </div>

      {/* Bottom Control Bar & Planet Strip */}
      <div className="pointer-events-auto flex flex-col gap-3 w-full max-w-5xl self-center">
        {/* Planet Quick-Selector Strip (Kurzgesagt Poster Palette) */}
        <div className="flex items-center gap-1.5 p-2 rounded-2xl bg-[#070b1e]/92 backdrop-blur-xl border border-slate-800 shadow-2xl overflow-x-auto scrollbar-none justify-start sm:justify-center">
          <button
            onClick={() => onSelectPlanet('sun')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
              selectedPlanetId === 'sun'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block shadow-sm" />
            Sun
          </button>

          {PLANETS_DATA.map((planet) => (
            <button
              key={planet.id}
              onClick={() => onSelectPlanet(planet.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                selectedPlanetId === planet.id
                  ? 'bg-white text-slate-950 shadow-lg'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full inline-block shadow-sm"
                style={{ backgroundColor: planet.color }}
              />
              {planet.name}
            </button>
          ))}

          {selectedPlanetId && (
            <button
              onClick={() => onSelectPlanet(null)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 shrink-0 cursor-pointer ml-1"
            >
              Reset View
            </button>
          )}
        </div>

        {/* Time Engine Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-[#070b1e]/95 backdrop-blur-xl border border-slate-800 shadow-2xl">
          {/* Current Date & Clock */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                <span>{formattedDate}</span>
                <span className="text-xs font-mono text-cyan-400 tabular-nums">
                  {formattedTime}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                {isLiveMode ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE 1X REAL-TIME (TRUE PRESENT STATE)
                  </span>
                ) : (
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    FAST SIMULATION: {playbackSpeed} DAYS/SEC
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Playback Controls (Play / Pause / Steps / Live) */}
          <div className="flex items-center gap-1.5">
            {/* Live Mode Toggle Button */}
            <button
              onClick={onToggleLiveMode}
              title="Lock to True Live Clock"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 mr-1 ${
                isLiveMode
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>LIVE</span>
            </button>

            {/* Step Backward */}
            <button
              onClick={() => handleStepDays(-30)}
              title="Back 1 Month"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <Rewind className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleStepDays(-1)}
              title="Back 1 Day"
              className="px-2 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              -1d
            </button>

            {/* Play/Pause Simulation */}
            <button
              onClick={onTogglePlay}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isPlaying && !isLiveMode
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/25'
              }`}
            >
              {isPlaying && !isLiveMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying && !isLiveMode ? 'Pause' : 'Simulate'}</span>
            </button>

            {/* Step Forward */}
            <button
              onClick={() => handleStepDays(1)}
              title="Forward 1 Day"
              className="px-2 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              +1d
            </button>
            <button
              onClick={() => handleStepDays(30)}
              title="Forward 1 Month"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <FastForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Selectors (when in fast-forward simulation) */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onSpeedChange(0.25)}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                playbackSpeed === 0.25 && !isLiveMode
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              6hr/s
            </button>
            <button
              onClick={() => onSpeedChange(1)}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                playbackSpeed === 1 && !isLiveMode
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1d/s
            </button>
            <button
              onClick={() => onSpeedChange(7)}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                playbackSpeed === 7 && !isLiveMode
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1w/s
            </button>
            <button
              onClick={() => onSpeedChange(30)}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                playbackSpeed === 30 && !isLiveMode
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1m/s
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
