/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SolarSystemCanvas } from './components/SolarSystemCanvas';
import { PlanetFactDrawer } from './components/PlanetFactDrawer';
import { ControlsOverlay } from './components/ControlsOverlay';
import { CosmicChatDrawer } from './components/CosmicChatDrawer';
import { ViewMode } from './types/astronomy';

export default function App() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  // Default to LIVE REAL-TIME mode as requested by user!
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // Days per real second when simulating
  const [viewMode, setViewMode] = useState<ViewMode>('poster_tilted');

  // Visual toggles
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showMoons, setShowMoons] = useState<boolean>(true);
  const [showAsteroids, setShowAsteroids] = useState<boolean>(true);
  const [showStems, setShowStems] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [realShadowsMode, setRealShadowsMode] = useState<boolean>(false);

  // Selection state
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);
  const [selectedMoonId, setSelectedMoonId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Eclipse notifications
  const [eclipseNotification, setEclipseNotification] = useState<{
    planetName: string;
    moonName: string;
    type: 'solar' | 'lunar';
  } | null>(null);

  // Animation frame loop for simulation clock
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    let animId: number;

    const tick = (now: number) => {
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isLiveMode) {
        // True live broadcast: advance clock by 1 real-world second per second!
        // No fast spinning, planets stay in their real-world current positions!
        setCurrentDate((prev) => new Date(prev.getTime() + deltaSec * 1000));
      } else if (isPlaying) {
        // Simulation mode: advance by playbackSpeed (days per second)
        const daysToAdd = playbackSpeed * deltaSec;
        setCurrentDate((prev) => new Date(prev.getTime() + daysToAdd * 86400000));
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isLiveMode, isPlaying, playbackSpeed]);

  const handleToggleLiveMode = () => {
    if (!isLiveMode) {
      // Snap to present real-time now!
      setCurrentDate(new Date());
      setIsLiveMode(true);
      setIsPlaying(true);
    } else {
      setIsLiveMode(false);
    }
  };

  const handleTogglePlay = () => {
    lastTimeRef.current = performance.now();
    if (isLiveMode) {
      // Entering simulation mode
      setIsLiveMode(false);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const handleDateChange = (newDate: Date) => {
    setIsLiveMode(false); // Manually setting date exits pure live mode
    setCurrentDate(newDate);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    setIsLiveMode(false);
    setIsPlaying(true);
  };

  const handleToggleRealShadows = () => {
    setRealShadowsMode((prev) => !prev);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#040714] text-slate-100 flex flex-col font-sans select-none">
      {/* 2D Canvas Solar System Stage */}
      <SolarSystemCanvas
        currentDate={currentDate}
        viewMode={viewMode}
        showOrbits={showOrbits}
        showMoons={showMoons}
        showAsteroids={showAsteroids}
        showStems={showStems}
        showLabels={showLabels}
        realShadowsMode={realShadowsMode}
        selectedPlanetId={selectedPlanetId}
        onSelectPlanet={(id) => {
          setSelectedPlanetId(id);
          if (!id) setSelectedMoonId(null);
        }}
        selectedMoonId={selectedMoonId}
        onSelectMoon={setSelectedMoonId}
        onEclipseDetected={(info) => {
          setEclipseNotification(info);
        }}
      />

      {/* Floating HUD Controls */}
      <ControlsOverlay
        currentDate={currentDate}
        onDateChange={handleDateChange}
        isLiveMode={isLiveMode}
        onToggleLiveMode={handleToggleLiveMode}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        playbackSpeed={playbackSpeed}
        onSpeedChange={handleSpeedChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showOrbits={showOrbits}
        onToggleOrbits={() => setShowOrbits((prev) => !prev)}
        showMoons={showMoons}
        onToggleMoons={() => setShowMoons((prev) => !prev)}
        showAsteroids={showAsteroids}
        onToggleAsteroids={() => setShowAsteroids((prev) => !prev)}
        showStems={showStems}
        onToggleStems={() => setShowStems((prev) => !prev)}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((prev) => !prev)}
        realShadowsMode={realShadowsMode}
        onToggleRealShadows={handleToggleRealShadows}
        selectedPlanetId={selectedPlanetId}
        onSelectPlanet={(id) => {
          setSelectedPlanetId(id);
          setSelectedMoonId(null);
        }}
        eclipseNotification={eclipseNotification}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen((prev) => !prev)}
      />

      {/* Slide-out Planet & Moon Fact Drawer */}
      <PlanetFactDrawer
        planetId={selectedPlanetId}
        moonId={selectedMoonId}
        currentDate={currentDate}
        onClose={() => {
          setSelectedPlanetId(null);
          setSelectedMoonId(null);
        }}
        onSelectMoon={setSelectedMoonId}
      />

      {/* Cosmic AI Chatbot Drawer (Powered by Gemini) */}
      <CosmicChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        selectedPlanetId={selectedPlanetId}
        currentDate={currentDate}
      />
    </main>
  );
}
