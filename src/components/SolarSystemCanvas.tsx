/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { PlanetData, CelestialCoordinates, ViewMode } from '../types/astronomy';
import { PLANETS_DATA, SUN_DATA } from '../data/planetsData';
import {
  computePlanetCoordinates,
  computeMoonPositions,
  computeShadowCone,
  generateAsteroidBelt,
  AsteroidParticle,
} from '../utils/astronomy';

interface SolarSystemCanvasProps {
  currentDate: Date;
  viewMode: ViewMode;
  showOrbits: boolean;
  showMoons: boolean;
  showAsteroids: boolean;
  showStems: boolean;
  showLabels: boolean;
  realShadowsMode: boolean;
  selectedPlanetId: string | null;
  onSelectPlanet: (planetId: string | null) => void;
  selectedMoonId: string | null;
  onSelectMoon: (moonId: string | null) => void;
  onEclipseDetected?: (info: { planetName: string; moonName: string; type: 'solar' | 'lunar' }) => void;
}

export const SolarSystemCanvas: React.FC<SolarSystemCanvasProps> = ({
  currentDate,
  viewMode,
  showOrbits,
  showMoons,
  showAsteroids,
  showStems,
  showLabels,
  realShadowsMode,
  selectedPlanetId,
  onSelectPlanet,
  selectedMoonId,
  onSelectMoon,
  onEclipseDetected,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera state
  const cameraRef = useRef({
    x: 0,
    y: 0,
    zoom: 1.05,
    targetX: 0,
    targetY: 0,
    targetZoom: 1.05,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    hasUserMoved: false,
  });

  const [hoveredEntity, setHoveredEntity] = useState<{
    id: string;
    name: string;
    type: 'planet' | 'moon' | 'sun';
    screenX: number;
    screenY: number;
    info?: string;
  } | null>(null);

  // Pre-generate asteroid belt
  const asteroidBelt = useMemo<AsteroidParticle[]>(() => generateAsteroidBelt(320), []);

  // Visual scale mapping: carefully tuned to give inner planets comfortable spacing
  // while keeping outer planets in view, maintaining true Keplerian angular alignment
  const getVisualDistance = useCallback((rAU: number) => {
    return 118 * Math.pow(rAU, 0.56);
  }, []);

  // Isometric projection factor for poster tilted mode (matches the ~55 deg poster tilt)
  const TILT_Y = viewMode === 'poster_tilted' ? 0.50 : 1.0;

  // Zoom to selected planet when selection changes
  useEffect(() => {
    if (!selectedPlanetId) {
      if (!cameraRef.current.hasUserMoved) {
        cameraRef.current.targetX = 0;
        cameraRef.current.targetY = 0;
        cameraRef.current.targetZoom = 1.0;
      }
      return;
    }

    if (selectedPlanetId === 'sun') {
      cameraRef.current.targetX = 0;
      cameraRef.current.targetY = 0;
      cameraRef.current.targetZoom = 1.7;
      return;
    }

    const planet = PLANETS_DATA.find((p) => p.id === selectedPlanetId);
    if (!planet) return;

    const coords = computePlanetCoordinates(planet.kepler, currentDate);
    const dist = getVisualDistance(coords.distanceAU);
    const rad = coords.eclipticLongitudeDeg * (Math.PI / 180);

    const worldX = Math.cos(rad) * dist;
    const stemElevation = viewMode === 'poster_tilted' && showStems
      ? -Math.sin(rad + 0.8) * 32
      : 0;
    const elevatedY = Math.sin(rad) * dist * TILT_Y + stemElevation;

    // Offset camera slightly to the left so the planet is centered in the open viewport
    // (fact drawer occupies ~440px on the right on desktop)
    const drawerOffset = typeof window !== 'undefined' && window.innerWidth > 900 ? 120 : 0;
    const zoomLevel = 2.2;

    cameraRef.current.targetX = -worldX - drawerOffset / zoomLevel;
    cameraRef.current.targetY = -elevatedY;
    cameraRef.current.targetZoom = zoomLevel;
  }, [selectedPlanetId, currentDate, getVisualDistance, TILT_Y, viewMode, showStems]);

  // Main rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const cam = cameraRef.current;
      cam.x += (cam.targetX - cam.x) * 0.12;
      cam.y += (cam.targetY - cam.y) * 0.12;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.12;

      ctx.clearRect(0, 0, width, height);
      ctx.save();

      // Poster Cosmic Navy / Indigo Backdrop Gradient
      const bgGrad = ctx.createRadialGradient(
        width / 2 + cam.x * 0.2,
        height / 2 + cam.y * 0.2,
        40,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.95
      );

      if (realShadowsMode) {
        bgGrad.addColorStop(0, '#0a0d1f');
        bgGrad.addColorStop(0.5, '#050713');
        bgGrad.addColorStop(1, '#020308');
      } else {
        bgGrad.addColorStop(0, '#101833');
        bgGrad.addColorStop(0.35, '#0c1228');
        bgGrad.addColorStop(0.7, '#070b1a');
        bgGrad.addColorStop(1, '#040712');
      }

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Starfield (Kurzgesagt crisp diamonds, circles, and soft color dots)
      ctx.save();
      const numStars = 220;
      for (let s = 0; s < numStars; s++) {
        const starX = ((s * 223.7 + s * s * 4.9) % width);
        const starY = ((s * 341.3 + s * 23.1) % height);
        const starSize = (s % 4 === 0) ? 2.0 : (s % 7 === 0) ? 1.4 : 0.9;
        const opacity = 0.35 + 0.55 * Math.sin(s * 1.5 + currentDate.getTime() * 0.0006);

        // Star colors: crisp white, soft cyan, warm golden
        const starColor = s % 5 === 0 ? `rgba(254, 240, 138, ${opacity})` : s % 9 === 0 ? `rgba(165, 243, 252, ${opacity})` : `rgba(241, 245, 249, ${opacity})`;
        ctx.fillStyle = starColor;
        ctx.beginPath();
        ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
        ctx.fill();

        // Distinctive 4-point diamond sparkles for key stars
        if (s % 22 === 0) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(starX - 6, starY);
          ctx.lineTo(starX + 6, starY);
          ctx.moveTo(starX, starY - 6);
          ctx.lineTo(starX, starY + 6);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Transform world coordinates
      ctx.translate(width / 2 + cam.x * cam.zoom, height / 2 + cam.y * cam.zoom);
      ctx.scale(cam.zoom, cam.zoom);

      // Compute Earth coordinates for relative distance
      const earthData = PLANETS_DATA.find((p) => p.id === 'earth')!;
      const earthCoords = computePlanetCoordinates(earthData.kepler, currentDate);

      // Compute all planet coordinates
      const rawPositions = PLANETS_DATA.map((planet) => {
        const coords = computePlanetCoordinates(planet.kepler, currentDate, {
          x: earthCoords.x,
          y: earthCoords.y,
          z: earthCoords.z,
        });
        const dist = getVisualDistance(coords.distanceAU);
        const rad = coords.eclipticLongitudeDeg * (Math.PI / 180);

        // Projected world position
        const worldX = Math.cos(rad) * dist;
        const worldY = Math.sin(rad) * dist * TILT_Y;

        // Ground anchor point on the orbital plane
        const planeX = worldX;
        const planeY = worldY;

        // Poster stem height: distinct elevation offset for poster mode
        const stemElevation = viewMode === 'poster_tilted' && showStems
          ? -Math.sin(rad + 0.8) * 32
          : 0;
        const elevatedY = planeY + stemElevation;

        const moons = computeMoonPositions(planet, coords, currentDate);

        return {
          planet,
          coords,
          dist,
          rad,
          worldX,
          worldY: elevatedY,
          planeX,
          planeY,
          stemElevation,
          moons,
        };
      });

      // 1. Draw Asteroid Belt (Stylized orbiting geometric rocks between Mars & Jupiter)
      if (showAsteroids) {
        ctx.save();
        const beltTime = currentDate.getTime() * 0.0000004;
        for (const rock of asteroidBelt) {
          const rDist = getVisualDistance(rock.orbitAU);
          const rockAngle = rock.initialAngle + beltTime * rock.speedMultiplier;
          const rockX = Math.cos(rockAngle) * rDist;
          const rockY = Math.sin(rockAngle) * rDist * TILT_Y;

          ctx.fillStyle = rock.color;
          ctx.beginPath();
          for (let p = 0; p < rock.points.length; p++) {
            const pa = (p / rock.points.length) * Math.PI * 2;
            const pr = rock.radius * rock.points[p];
            const px = rockX + Math.cos(pa) * pr;
            const py = rockY + Math.sin(pa) * pr;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // 2. Draw Orbit Paths (Vibrant vector ellipses matching the poster)
      if (showOrbits) {
        ctx.save();
        rawPositions.forEach(({ planet, dist }) => {
          // Inner glowing track
          ctx.beginPath();
          ctx.strokeStyle = planet.orbitColor;
          ctx.lineWidth = 2.0 / cam.zoom;
          ctx.setLineDash([7 / cam.zoom, 5 / cam.zoom]);
          ctx.globalAlpha = realShadowsMode ? 0.45 : 0.85;
          ctx.ellipse(0, 0, dist, dist * TILT_Y, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Outer delicate hairline track
          ctx.beginPath();
          ctx.lineWidth = 0.8 / cam.zoom;
          ctx.setLineDash([]);
          ctx.globalAlpha = realShadowsMode ? 0.25 : 0.5;
          ctx.ellipse(0, 0, dist, dist * TILT_Y, 0, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.restore();
      }

      // 3. Draw Poster Drop Stems (Bold colored pins connecting planet to its orbital ring)
      if (viewMode === 'poster_tilted' && showStems) {
        ctx.save();
        rawPositions.forEach(({ planet, planeX, planeY, worldX, worldY, stemElevation }) => {
          if (Math.abs(stemElevation) > 1) {
            // Anchor disc on orbital plane
            ctx.beginPath();
            ctx.fillStyle = planet.orbitColor;
            ctx.globalAlpha = 0.85;
            ctx.ellipse(planeX, planeY, 4.5, 4.5 * TILT_Y, 0, 0, Math.PI * 2);
            ctx.fill();

            // Anchor center dot
            ctx.beginPath();
            ctx.fillStyle = '#FFFFFF';
            ctx.arc(planeX, planeY, 1.8, 0, Math.PI * 2);
            ctx.fill();

            // Thick rounded vector connecting stem
            ctx.beginPath();
            ctx.strokeStyle = planet.orbitColor;
            ctx.lineWidth = 2.6 / cam.zoom;
            ctx.lineCap = 'round';
            ctx.globalAlpha = 0.95;
            ctx.moveTo(planeX, planeY);
            ctx.lineTo(worldX, worldY);
            ctx.stroke();

            // White core highlight inside stem for clean pop
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.0 / cam.zoom;
            ctx.moveTo(planeX, planeY);
            ctx.lineTo(worldX, worldY);
            ctx.stroke();
          }
        });
        ctx.restore();
      }

      // 4. Draw Real Shadows Mode (Umbra & Penumbra cones)
      if (realShadowsMode) {
        ctx.save();
        rawPositions.forEach(({ planet, worldX, worldY }) => {
          const cone = computeShadowCone(worldX, worldY, planet.displayRadius);

          // Penumbra cone
          const penGrad = ctx.createLinearGradient(
            worldX,
            worldY,
            cone.umbraApex.x,
            cone.umbraApex.y
          );
          penGrad.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
          penGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.45)');
          penGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = penGrad;
          ctx.beginPath();
          ctx.moveTo(cone.p1.x, cone.p1.y);
          ctx.lineTo(cone.pen1.x, cone.pen1.y);
          ctx.lineTo(cone.pen2.x, cone.pen2.y);
          ctx.lineTo(cone.p2.x, cone.p2.y);
          ctx.closePath();
          ctx.fill();

          // Dark dense Umbra cone
          const umbraGrad = ctx.createLinearGradient(
            worldX,
            worldY,
            cone.umbraApex.x,
            cone.umbraApex.y
          );
          umbraGrad.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
          umbraGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.90)');
          umbraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = umbraGrad;
          ctx.beginPath();
          ctx.moveTo(cone.p1.x, cone.p1.y);
          ctx.lineTo(cone.umbraApex.x, cone.umbraApex.y);
          ctx.lineTo(cone.p2.x, cone.p2.y);
          ctx.closePath();
          ctx.fill();

          // Shadow edge outline
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.lineWidth = 1.0 / cam.zoom;
          ctx.stroke();
        });
        ctx.restore();
      }

      // 5. Draw the Sun (High-Contrast Vibrant Nuclear Engine)
      ctx.save();
      const sunRad = SUN_DATA.displayRadius;

      // Radiant outer corona aura
      const sunHalo = ctx.createRadialGradient(0, 0, sunRad * 0.7, 0, 0, sunRad * 4.0);
      sunHalo.addColorStop(0, 'rgba(255, 230, 0, 0.95)');
      sunHalo.addColorStop(0.25, 'rgba(255, 107, 0, 0.6)');
      sunHalo.addColorStop(0.65, 'rgba(239, 68, 68, 0.2)');
      sunHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = sunHalo;
      ctx.beginPath();
      ctx.arc(0, 0, sunRad * 4.0, 0, Math.PI * 2);
      ctx.fill();

      // Sharp radiating beams slicing out across space
      const numBeams = 24;
      const beamRot = currentDate.getTime() * 0.0001;
      ctx.lineWidth = 1.6 / cam.zoom;
      for (let b = 0; b < numBeams; b++) {
        const ba = (b / numBeams) * Math.PI * 2 + beamRot;
        const bLen = sunRad * (1.9 + 0.7 * Math.sin(b * 3.5 + beamRot * 2));
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.35)';
        ctx.beginPath();
        ctx.moveTo(Math.cos(ba) * sunRad, Math.sin(ba) * sunRad);
        ctx.lineTo(Math.cos(ba) * bLen, Math.sin(ba) * bLen);
        ctx.stroke();
      }

      // Coronal loops / prominence arches
      const numLoops = 8;
      for (let l = 0; l < numLoops; l++) {
        const loopAngle = (l / numLoops) * Math.PI * 2 + beamRot * 0.35;
        const loopDist = sunRad * 1.4;
        const startX = Math.cos(loopAngle - 0.2) * sunRad;
        const startY = Math.sin(loopAngle - 0.2) * sunRad;
        const peakX = Math.cos(loopAngle) * loopDist;
        const peakY = Math.sin(loopAngle) * loopDist;
        const endX = Math.cos(loopAngle + 0.2) * sunRad;
        const endY = Math.sin(loopAngle + 0.2) * sunRad;

        ctx.strokeStyle = '#FF5400';
        ctx.lineWidth = 3.2 / cam.zoom;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(peakX, peakY, endX, endY);
        ctx.stroke();

        ctx.strokeStyle = '#FFE600';
        ctx.lineWidth = 1.4 / cam.zoom;
        ctx.stroke();
      }

      // Sun body disk with high saturation
      const sunGrad = ctx.createRadialGradient(
        -sunRad * 0.25,
        -sunRad * 0.25,
        sunRad * 0.08,
        0,
        0,
        sunRad
      );
      sunGrad.addColorStop(0, '#FFFFFF');
      sunGrad.addColorStop(0.25, '#FFF275');
      sunGrad.addColorStop(0.65, '#FF8C00');
      sunGrad.addColorStop(1, '#D9381E');

      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(0, 0, sunRad, 0, Math.PI * 2);
      ctx.fill();

      // Stylized sunspots
      ctx.fillStyle = '#9A1C00';
      const spots = [
        { x: sunRad * 0.35, y: -sunRad * 0.2, r: sunRad * 0.09 },
        { x: sunRad * 0.46, y: -sunRad * 0.14, r: sunRad * 0.06 },
        { x: -sunRad * 0.32, y: sunRad * 0.28, r: sunRad * 0.08 },
        { x: -sunRad * 0.18, y: sunRad * 0.38, r: sunRad * 0.05 },
      ];
      spots.forEach((sp) => {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Selection indicator
      if (selectedPlanetId === 'sun') {
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 3.5 / cam.zoom;
        ctx.setLineDash([8 / cam.zoom, 6 / cam.zoom]);
        ctx.beginPath();
        ctx.arc(0, 0, sunRad * 1.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      // 6. DEPTH-SORT PLANETS: Sort by worldY (so back planets are drawn first,
      // and foreground overlapping planets render cleanly on top!)
      const sortedPlanets = [...rawPositions].sort((a, b) => a.worldY - b.worldY);

      sortedPlanets.forEach(({ planet, coords, worldX, worldY, moons }) => {
        ctx.save();
        ctx.translate(worldX, worldY);

        const r = planet.displayRadius;
        const angleToSun = Math.atan2(-worldY, -worldX);

        // A. Separation boundary shadow around planet body to distinguish overlapping planets!
        // This prevents overlapping planets from blending together!
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, r + 3.0 / cam.zoom, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(4, 7, 18, 0.95)';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();

        // B. Draw Saturn or Uranus Rings (back half)
        if (planet.rings) {
          ctx.save();
          const ringInner = planet.rings.innerRadius;
          const ringOuter = planet.rings.outerRadius;
          const ringTilt = (planet.rings.tiltDeg * Math.PI) / 180;
          ctx.rotate(ringTilt);

          // Outer vibrant cyan/teal ring (as in reference poster!)
          ctx.beginPath();
          ctx.ellipse(0, 0, ringOuter, ringOuter * 0.32, 0, Math.PI, Math.PI * 2);
          ctx.lineWidth = (ringOuter - ringInner);
          ctx.strokeStyle = planet.rings.colors[0]; // Turquoise/cyan
          ctx.globalAlpha = 0.95;
          ctx.stroke();

          // Dark Cassini Division Gap
          ctx.beginPath();
          ctx.ellipse(0, 0, ringInner + (ringOuter - ringInner) * 0.6, (ringInner + (ringOuter - ringInner) * 0.6) * 0.32, 0, Math.PI, Math.PI * 2);
          ctx.lineWidth = 2.2 / cam.zoom;
          ctx.strokeStyle = '#050814';
          ctx.stroke();

          // Inner golden ring band
          ctx.beginPath();
          ctx.ellipse(0, 0, ringInner + (ringOuter - ringInner) * 0.28, (ringInner + (ringOuter - ringInner) * 0.28) * 0.32, 0, Math.PI, Math.PI * 2);
          ctx.lineWidth = (ringOuter - ringInner) * 0.45;
          ctx.strokeStyle = planet.rings.colors[2] || '#FBBF24';
          ctx.stroke();

          ctx.restore();
        }

        // C. Planet Body Rendering with High-Contrast Vector Details
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.clip();

        // Base vibrant fill
        ctx.fillStyle = planet.color;
        ctx.fillRect(-r, -r, r * 2, r * 2);

        // Individual Planet Vector Details
        if (planet.id === 'earth') {
          // Deep ocean background #0284C7
          // Emerald continents with high saturation
          ctx.fillStyle = '#059669';
          ctx.beginPath();
          // Eurasia/Africa
          ctx.ellipse(-r * 0.2, -r * 0.22, r * 0.52, r * 0.38, 0.4, 0, Math.PI * 2);
          ctx.fill();
          // Americas
          ctx.beginPath();
          ctx.ellipse(r * 0.32, r * 0.28, r * 0.48, r * 0.32, -0.35, 0, Math.PI * 2);
          ctx.fill();
          // Continent interior terrain tint
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.arc(-r * 0.2, -r * 0.2, r * 0.22, 0, Math.PI * 2);
          ctx.fill();

          // Swirling crisp white clouds with drop shadows
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.lineWidth = 3.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(-r * 0.1, -r * 0.4, r * 0.65, 0.2, 1.9);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(r * 0.25, r * 0.32, r * 0.52, 3.1, 4.9);
          ctx.stroke();

          // Polar ice cap
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(0, -r * 0.88, r * 0.32, 0, Math.PI * 2);
          ctx.fill();
        } else if (planet.id === 'jupiter') {
          // Horizontal wavy atmospheric bands (Kurzgesagt saturated poster palette)
          const jupBands = [
            '#EA580C', '#FF6B00', '#FDBA74', '#C2410C',
            '#F97316', '#7C2D12', '#00BBF9', '#FED7AA', '#E11D48'
          ];
          for (let b = 0; b < jupBands.length; b++) {
            const by = -r + (b / jupBands.length) * (r * 2);
            ctx.fillStyle = jupBands[b];
            ctx.beginPath();
            ctx.ellipse(0, by, r * 1.1, r * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          // Great Red Spot: nested dramatic swirling storm
          ctx.fillStyle = '#991B1B';
          ctx.beginPath();
          ctx.ellipse(r * 0.32, r * 0.26, r * 0.36, r * 0.22, -0.15, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#DC2626';
          ctx.beginPath();
          ctx.ellipse(r * 0.32, r * 0.26, r * 0.24, r * 0.14, -0.15, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FEF08A';
          ctx.beginPath();
          ctx.arc(r * 0.32, r * 0.26, r * 0.07, 0, Math.PI * 2);
          ctx.fill();
        } else if (planet.id === 'mars') {
          // Rust-orange base terrain
          // Darker iron-oxide maria
          ctx.fillStyle = '#7F1D1D';
          ctx.beginPath();
          ctx.ellipse(-r * 0.1, r * 0.15, r * 0.65, r * 0.35, 0.25, 0, Math.PI * 2);
          ctx.fill();

          // Valles Marineris canyon rift
          ctx.strokeStyle = '#450A0A';
          ctx.lineWidth = 2.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-r * 0.45, r * 0.1);
          ctx.lineTo(r * 0.35, r * 0.25);
          ctx.stroke();

          // Olympus Mons crater
          ctx.fillStyle = '#991B1B';
          ctx.beginPath();
          ctx.arc(r * 0.28, -r * 0.25, r * 0.24, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#F87171';
          ctx.beginPath();
          ctx.arc(r * 0.28, -r * 0.25, r * 0.11, 0, Math.PI * 2);
          ctx.fill();

          // Crisp white polar ice cap
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(0, -r * 0.85, r * 0.38, 0, Math.PI * 2);
          ctx.fill();
        } else if (planet.id === 'venus') {
          // Swirling sulfuric cloud patterns with amber-gold waves
          ctx.strokeStyle = '#D97706';
          ctx.lineWidth = 4.0;
          ctx.beginPath();
          ctx.ellipse(0, -r * 0.32, r * 0.85, r * 0.28, 0.15, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = '#FDE68A';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.ellipse(0, r * 0.28, r * 0.88, r * 0.3, -0.15, 0, Math.PI * 2);
          ctx.stroke();
        } else if (planet.id === 'mercury') {
          // Craters with dark shadow and bright rims
          const mCraters = [
            { x: -r * 0.3, y: -r * 0.25, rad: r * 0.28 },
            { x: r * 0.35, y: r * 0.2, rad: r * 0.22 },
            { x: -r * 0.1, y: r * 0.35, rad: r * 0.18 },
          ];
          mCraters.forEach((cr) => {
            ctx.fillStyle = '#581C87';
            ctx.beginPath();
            ctx.arc(cr.x, cr.y, cr.rad, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#E9D5FF';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Central peak
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cr.x, cr.y, cr.rad * 0.25, 0, Math.PI * 2);
            ctx.fill();
          });
        } else if (planet.id === 'saturn') {
          // Striped body
          const satBands = ['#CA8A04', '#EAB308', '#FACC15', '#A16207', '#FEF08A'];
          for (let b = 0; b < satBands.length; b++) {
            const by = -r + (b / satBands.length) * (r * 2);
            ctx.fillStyle = satBands[b];
            ctx.beginPath();
            ctx.ellipse(0, by, r * 1.05, r * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          // Hexagonal north pole storm
          ctx.fillStyle = '#854D0E';
          ctx.beginPath();
          ctx.arc(0, -r * 0.78, r * 0.28, 0, Math.PI * 2);
          ctx.fill();
        } else if (planet.id === 'uranus') {
          // Mint/aquamarine stripes
          const urBands = ['#0D9488', '#14B8A6', '#2DD4BF', '#5EEAD4', '#99F6E4'];
          for (let b = 0; b < urBands.length; b++) {
            const by = -r + (b / urBands.length) * (r * 2);
            ctx.fillStyle = urBands[b];
            ctx.beginPath();
            ctx.ellipse(0, by, r * 1.05, r * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (planet.id === 'neptune') {
          // Deep electric sapphire blue with Great Dark Spot
          ctx.fillStyle = '#1E3A8A';
          ctx.beginPath();
          ctx.ellipse(-r * 0.25, -r * 0.15, r * 0.38, r * 0.22, 0.2, 0, Math.PI * 2);
          ctx.fill();

          // Azure cloud streak
          ctx.strokeStyle = '#67E8F9';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.ellipse(0, r * 0.3, r * 0.8, r * 0.18, -0.1, 0, Math.PI * 2);
          ctx.stroke();
        } else if (planet.id === 'pluto') {
          // Tombaugh Regio Heart!
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.ellipse(r * 0.15, r * 0.1, r * 0.48, r * 0.4, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(r * 0.42, r * 0.15, r * 0.38, r * 0.32, -0.3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Night-side Terminator Shadow (facing away from Sun)
        const termGrad = ctx.createLinearGradient(
          Math.cos(angleToSun) * r,
          Math.sin(angleToSun) * r,
          -Math.cos(angleToSun) * r,
          -Math.sin(angleToSun) * r
        );

        if (realShadowsMode) {
          termGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          termGrad.addColorStop(0.48, 'rgba(0, 0, 0, 0.1)');
          termGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.90)');
          termGrad.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
        } else {
          termGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
          termGrad.addColorStop(0.48, 'rgba(0, 0, 0, 0)');
          termGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.50)');
          termGrad.addColorStop(1, 'rgba(0, 0, 0, 0.80)');
        }

        ctx.fillStyle = termGrad;
        ctx.fillRect(-r, -r, r * 2, r * 2);

        // Luminous atmosphere rim on sunny side
        ctx.strokeStyle = planet.id === 'earth' ? '#38BDF8' : planet.color;
        ctx.lineWidth = 2.2 / cam.zoom;
        ctx.beginPath();
        ctx.arc(0, 0, r, angleToSun - Math.PI * 0.45, angleToSun + Math.PI * 0.45);
        ctx.stroke();

        ctx.restore();

        // D. Draw Front Half of Rings
        if (planet.rings) {
          ctx.save();
          const ringInner = planet.rings.innerRadius;
          const ringOuter = planet.rings.outerRadius;
          const ringTilt = (planet.rings.tiltDeg * Math.PI) / 180;
          ctx.rotate(ringTilt);

          ctx.beginPath();
          ctx.ellipse(0, 0, ringOuter, ringOuter * 0.32, 0, 0, Math.PI);
          ctx.lineWidth = (ringOuter - ringInner);
          ctx.strokeStyle = planet.rings.colors[0]; // Turquoise/cyan
          ctx.globalAlpha = 0.98;
          ctx.stroke();

          // Dark Cassini Division Gap
          ctx.beginPath();
          ctx.ellipse(0, 0, ringInner + (ringOuter - ringInner) * 0.6, (ringInner + (ringOuter - ringInner) * 0.6) * 0.32, 0, 0, Math.PI);
          ctx.lineWidth = 2.2 / cam.zoom;
          ctx.strokeStyle = '#050814';
          ctx.stroke();

          // Inner golden ring band
          ctx.beginPath();
          ctx.ellipse(0, 0, ringInner + (ringOuter - ringInner) * 0.28, (ringInner + (ringOuter - ringInner) * 0.28) * 0.32, 0, 0, Math.PI);
          ctx.lineWidth = (ringOuter - ringInner) * 0.45;
          ctx.strokeStyle = planet.rings.colors[2] || '#FBBF24';
          ctx.stroke();

          // Real shadow cast on rings
          if (realShadowsMode) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.beginPath();
            ctx.ellipse(Math.cos(angleToSun + Math.PI) * r * 1.3, Math.sin(angleToSun + Math.PI) * r * 0.5, r * 0.65, r * 0.42, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }

        // E. Draw Moons (if enabled)
        if (showMoons && moons.length > 0) {
          moons.forEach((mPos) => {
            const mDist = 34 + mPos.moon.radiusKm * 0.005;
            const mx = Math.cos(mPos.angle) * mDist;
            const my = Math.sin(mPos.angle) * mDist * TILT_Y;
            const mr = Math.max(3.2, Math.min(7.0, mPos.moon.radiusKm * 0.0024));

            // Moon orbit circle
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 1.0 / cam.zoom;
            ctx.ellipse(0, 0, mDist, mDist * TILT_Y, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.save();
            ctx.translate(mx, my);

            // Eclipse check
            if (mPos.isInUmbra && realShadowsMode) {
              ctx.fillStyle = '#991B1B'; // Blood moon eclipse tint
              ctx.beginPath();
              ctx.arc(0, 0, mr, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = '#EF4444';
              ctx.lineWidth = 2.0 / cam.zoom;
              ctx.beginPath();
              ctx.arc(0, 0, mr + 3, 0, Math.PI * 2);
              ctx.stroke();

              if (onEclipseDetected) {
                onEclipseDetected({
                  planetName: planet.name,
                  moonName: mPos.moon.name,
                  type: 'lunar',
                });
              }
            } else if (mPos.isCastingEclipse && realShadowsMode) {
              ctx.fillStyle = mPos.moon.color;
              ctx.beginPath();
              ctx.arc(0, 0, mr, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = '#F59E0B';
              ctx.lineWidth = 2.0 / cam.zoom;
              ctx.beginPath();
              ctx.arc(0, 0, mr + 3, 0, Math.PI * 2);
              ctx.stroke();

              if (onEclipseDetected) {
                onEclipseDetected({
                  planetName: planet.name,
                  moonName: mPos.moon.name,
                  type: 'solar',
                });
              }
            } else {
              ctx.fillStyle = mPos.moon.color;
              ctx.beginPath();
              ctx.arc(0, 0, mr, 0, Math.PI * 2);
              ctx.fill();

              // Shading on moon
              const mAngleToSun = Math.atan2(-(worldY + my), -(worldX + mx));
              ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
              ctx.beginPath();
              ctx.arc(0, 0, mr, mAngleToSun + Math.PI * 0.5, mAngleToSun + Math.PI * 1.5);
              ctx.fill();
            }

            // Moon outline
            ctx.strokeStyle = '#050814';
            ctx.lineWidth = 1.0 / cam.zoom;
            ctx.stroke();

            // Selected Moon ring
            if (selectedMoonId === mPos.moon.id) {
              ctx.strokeStyle = '#38BDF8';
              ctx.lineWidth = 2.0 / cam.zoom;
              ctx.beginPath();
              ctx.arc(0, 0, mr + 4, 0, Math.PI * 2);
              ctx.stroke();
            }

            ctx.restore();
          });
        }

        // F. Selection Reticle Brackets
        if (selectedPlanetId === planet.id) {
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2.6 / cam.zoom;
          const boxSize = r + 9 / cam.zoom;
          const cornerLen = 8 / cam.zoom;

          ctx.beginPath();
          // Top-left
          ctx.moveTo(-boxSize, -boxSize + cornerLen);
          ctx.lineTo(-boxSize, -boxSize);
          ctx.lineTo(-boxSize + cornerLen, -boxSize);
          // Top-right
          ctx.moveTo(boxSize - cornerLen, -boxSize);
          ctx.lineTo(boxSize, -boxSize);
          ctx.lineTo(boxSize, -boxSize + cornerLen);
          // Bottom-left
          ctx.moveTo(-boxSize, boxSize - cornerLen);
          ctx.lineTo(-boxSize, boxSize);
          ctx.lineTo(-boxSize + cornerLen, boxSize);
          // Bottom-right
          ctx.moveTo(boxSize - cornerLen, boxSize);
          ctx.lineTo(boxSize, boxSize);
          ctx.lineTo(boxSize, boxSize - cornerLen);
          ctx.stroke();
        }

        // G. Planet Labels (High legibility with background plate)
        if (showLabels) {
          ctx.save();
          const labelY = r + 18 / cam.zoom;
          ctx.font = `700 ${Math.max(12, 14 / cam.zoom)}px 'Plus Jakarta Sans', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          // Background pill plate behind text so overlapping planets never confuse labels!
          const textWidth = ctx.measureText(planet.name).width;
          ctx.fillStyle = 'rgba(5, 8, 22, 0.85)';
          ctx.beginPath();
          ctx.roundRect(
            -textWidth / 2 - 8 / cam.zoom,
            labelY - 3 / cam.zoom,
            textWidth + 16 / cam.zoom,
            28 / cam.zoom,
            6 / cam.zoom
          );
          ctx.fill();
          ctx.strokeStyle = planet.orbitColor;
          ctx.lineWidth = 1.0 / cam.zoom;
          ctx.stroke();

          // Planet name
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(planet.name, 0, labelY);

          // AU distance sub-label
          ctx.font = `600 ${Math.max(10, 11 / cam.zoom)}px 'JetBrains Mono', monospace`;
          ctx.fillStyle = '#38BDF8';
          ctx.fillText(`${coords.distanceAU.toFixed(2)} AU`, 0, labelY + 14 / cam.zoom);
          ctx.restore();
        }

        ctx.restore();
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [
    currentDate,
    viewMode,
    showOrbits,
    showMoons,
    showAsteroids,
    showStems,
    showLabels,
    realShadowsMode,
    selectedPlanetId,
    selectedMoonId,
    asteroidBelt,
    getVisualDistance,
    TILT_Y,
    onEclipseDetected,
  ]);

  // Pointer interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    cameraRef.current.isDragging = true;
    cameraRef.current.dragStartX = e.clientX;
    cameraRef.current.dragStartY = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (cameraRef.current.isDragging) {
      const dx = (e.clientX - cameraRef.current.dragStartX) / cameraRef.current.zoom;
      const dy = (e.clientY - cameraRef.current.dragStartY) / cameraRef.current.zoom;

      cameraRef.current.targetX += dx;
      cameraRef.current.targetY += dy;
      cameraRef.current.dragStartX = e.clientX;
      cameraRef.current.dragStartY = e.clientY;
      cameraRef.current.hasUserMoved = true;
      return;
    }

    const cam = cameraRef.current;
    const worldMouseX = (mouseX - rect.width / 2) / cam.zoom - cam.x;
    const worldMouseY = (mouseY - rect.height / 2) / cam.zoom - cam.y;

    // Check Sun
    if (Math.hypot(worldMouseX, worldMouseY) <= SUN_DATA.displayRadius + 10) {
      setHoveredEntity({
        id: 'sun',
        name: 'The Sun (Sol)',
        type: 'sun',
        screenX: mouseX,
        screenY: mouseY,
        info: 'Spectral G2V · 99.86% Solar System Mass',
      });
      return;
    }

    // Check Planets (check front-to-back using sorted positions)
    for (const planet of PLANETS_DATA) {
      const coords = computePlanetCoordinates(planet.kepler, currentDate);
      const dist = getVisualDistance(coords.distanceAU);
      const rad = coords.eclipticLongitudeDeg * (Math.PI / 180);
      const px = Math.cos(rad) * dist;
      const stemElevation = viewMode === 'poster_tilted' && showStems
        ? -Math.sin(rad + 0.8) * 32
        : 0;
      const py = Math.sin(rad) * dist * TILT_Y + stemElevation;

      const pDist = Math.hypot(worldMouseX - px, worldMouseY - py);
      if (pDist <= planet.displayRadius + 14) {
        setHoveredEntity({
          id: planet.id,
          name: planet.name,
          type: 'planet',
          screenX: mouseX,
          screenY: mouseY,
          info: `${coords.distanceAU.toFixed(2)} AU from Sun · ${coords.zodiacSign}`,
        });
        return;
      }

      // Check Moons
      if (showMoons && planet.moons.length > 0) {
        const moons = computeMoonPositions(planet, coords, currentDate);
        for (const mPos of moons) {
          const mDist = 34 + mPos.moon.radiusKm * 0.005;
          const mx = px + Math.cos(mPos.angle) * mDist;
          const my = py + Math.sin(mPos.angle) * mDist * TILT_Y;
          if (Math.hypot(worldMouseX - mx, worldMouseY - my) <= 10) {
            setHoveredEntity({
              id: mPos.moon.id,
              name: `${mPos.moon.name} (Moon of ${planet.name})`,
              type: 'moon',
              screenX: mouseX,
              screenY: mouseY,
              info: `Period: ${mPos.moon.orbitalPeriodDays}d · Radius: ${mPos.moon.radiusKm}km`,
            });
            return;
          }
        }
      }
    }

    setHoveredEntity(null);
  };

  const handleMouseUp = () => {
    cameraRef.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    const newZoom = Math.max(0.25, Math.min(7.0, cameraRef.current.targetZoom * zoomFactor));
    cameraRef.current.targetZoom = newZoom;
    cameraRef.current.hasUserMoved = true;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cam = cameraRef.current;
    const worldMouseX = (mouseX - rect.width / 2) / cam.zoom - cam.x;
    const worldMouseY = (mouseY - rect.height / 2) / cam.zoom - cam.y;

    // Check Sun
    if (Math.hypot(worldMouseX, worldMouseY) <= SUN_DATA.displayRadius + 14) {
      onSelectPlanet('sun');
      onSelectMoon(null);
      return;
    }

    // Check Planets (test in reverse Z-order so foreground clicked first!)
    const planetList = [...PLANETS_DATA].sort((a, b) => {
      const ca = computePlanetCoordinates(a.kepler, currentDate);
      const cb = computePlanetCoordinates(b.kepler, currentDate);
      const da = getVisualDistance(ca.distanceAU);
      const db = getVisualDistance(cb.distanceAU);
      const ya = Math.sin(ca.eclipticLongitudeDeg * (Math.PI / 180)) * da * TILT_Y;
      const yb = Math.sin(cb.eclipticLongitudeDeg * (Math.PI / 180)) * db * TILT_Y;
      return yb - ya; // Front first
    });

    for (const planet of planetList) {
      const coords = computePlanetCoordinates(planet.kepler, currentDate);
      const dist = getVisualDistance(coords.distanceAU);
      const rad = coords.eclipticLongitudeDeg * (Math.PI / 180);
      const px = Math.cos(rad) * dist;
      const stemElevation = viewMode === 'poster_tilted' && showStems
        ? -Math.sin(rad + 0.8) * 32
        : 0;
      const py = Math.sin(rad) * dist * TILT_Y + stemElevation;

      // Check Moons first
      if (showMoons && planet.moons.length > 0) {
        const moons = computeMoonPositions(planet, coords, currentDate);
        for (const mPos of moons) {
          const mDist = 34 + mPos.moon.radiusKm * 0.005;
          const mx = px + Math.cos(mPos.angle) * mDist;
          const my = py + Math.sin(mPos.angle) * mDist * TILT_Y;
          if (Math.hypot(worldMouseX - mx, worldMouseY - my) <= 12) {
            onSelectPlanet(planet.id);
            onSelectMoon(mPos.moon.id);
            return;
          }
        }
      }

      if (Math.hypot(worldMouseX - px, worldMouseY - py) <= planet.displayRadius + 16) {
        onSelectPlanet(planet.id);
        onSelectMoon(null);
        return;
      }
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#040714]">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Floating Hover Tooltip */}
      {hoveredEntity && (
        <div
          className="absolute z-20 pointer-events-none px-3.5 py-2 rounded-xl bg-slate-950/95 border border-cyan-500/40 shadow-2xl backdrop-blur-md transform -translate-x-1/2 -translate-y-full transition-transform duration-75"
          style={{
            left: `${hoveredEntity.screenX}px`,
            top: `${hoveredEntity.screenY - 16}px`,
          }}
        >
          <div className="text-xs font-bold text-white flex items-center gap-2 whitespace-nowrap">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor:
                  hoveredEntity.type === 'sun'
                    ? '#FBBF24'
                    : hoveredEntity.type === 'planet'
                    ? '#38BDF8'
                    : '#A78BFA',
              }}
            />
            {hoveredEntity.name}
          </div>
          {hoveredEntity.info && (
            <div className="text-[11px] font-mono text-cyan-300/90 mt-0.5 whitespace-nowrap">
              {hoveredEntity.info}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
