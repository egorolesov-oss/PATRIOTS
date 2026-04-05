import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  ORBIT_CONFIGS,
  PLANET_HITBOX,
  ROTATION_SLOWDOWN,
  SWAP_PROXIMITY,
  PLANET_CONFIGS,
  Planet,
} from '../types/game';
import { getSlotPosition, getPlanetAngle } from '../engine/board';
import { StarCore } from './StarCore';
import { OrbitalRings } from './OrbitalRings';
import { PlanetView } from './PlanetView';
import { UseGameStateReturn } from '../hooks/useGameState';

interface Props {
  game: UseGameStateReturn;
  boardSize: number;
}

export const GameBoard: React.FC<Props> = ({ game, boardSize }) => {
  const {
    state,
    rotationAngles,
    isSwiping,
    isPaused,
    swipe,
    alignedIds,
    alignedTriples,
    proximityPairs,
    removingPlanetIds,
    newPlanetIds,
    selectPlanet,
    onSwipeStart,
    onSwipeThrough,
    onSwipeEnd,
    setRotationAngles,
    updateIndicators,
  } = game;

  const centerX = boardSize / 2;
  const centerY = boardSize / 2;
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const tickRef = useRef<number>(0);

  useEffect(() => {
    if (state.phase !== 'playing') return;

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (!isPaused) {
        const speed = isSwiping ? ROTATION_SLOWDOWN : 1;
        setRotationAngles((prev: number[]) => {
          const next = [...prev];
          for (let i = 0; i < ORBIT_CONFIGS.length; i++) {
            const config = ORBIT_CONFIGS[i];
            next[i] += (config.rotationDirection * 360 * dt * speed) / config.rotationDuration;
          }
          return next;
        });
      }

      tickRef.current += dt;
      if (tickRef.current > 0.1) {
        tickRef.current = 0;
        updateIndicators();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = 0;
    };
  }, [state.phase, isPaused, isSwiping]);

  const findNearestPlanet = useCallback(
    (touchX: number, touchY: number): Planet | null => {
      let best: Planet | null = null;
      let bestDist = PLANET_HITBOX;

      for (const planet of state.planets) {
        const pos = getSlotPosition(
          planet.orbitIndex, planet.slotIndex,
          centerX, centerY, rotationAngles[planet.orbitIndex]
        );
        const dx = touchX - pos.x;
        const dy = touchY - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          best = planet;
        }
      }
      return best;
    },
    [state.planets, centerX, centerY, rotationAngles]
  );

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      const planet = findNearestPlanet(event.x, event.y);
      if (planet) onSwipeStart(planet);
    })
    .onUpdate((event) => {
      if (!swipe.active) return;
      const planet = findNearestPlanet(event.x, event.y);
      if (planet) onSwipeThrough(planet);
    })
    .onEnd(() => onSwipeEnd())
    .onFinalize(() => onSwipeEnd());

  const tapGesture = Gesture.Tap().onEnd((event) => {
    const planet = findNearestPlanet(event.x, event.y);
    if (planet) selectPlanet(planet);
  });

  const composed = Gesture.Exclusive(panGesture, tapGesture);

  const collectedSet = new Set(swipe.collectedIds);

  // Check if selected planet can swap with each proximity pair partner
  const selectedPlanet = state.selectedPlanetId
    ? state.planets.find((p) => p.id === state.selectedPlanetId)
    : null;

  return (
    <GestureDetector gesture={composed}>
      <View style={[styles.container, { width: boardSize, height: boardSize }]}>
        <OrbitalRings
          centerX={centerX} centerY={centerY}
          width={boardSize} height={boardSize}
          activeSpokeAngle={null}
        />

        {/* Proximity lines between close cross-orbit planets */}
        <Svg width={boardSize} height={boardSize} style={StyleSheet.absoluteFill} pointerEvents="none">
          {proximityPairs.map((pair, i) => {
            const posA = getSlotPosition(
              pair.a.orbitIndex, pair.a.slotIndex,
              centerX, centerY, rotationAngles[pair.a.orbitIndex]
            );
            const posB = getSlotPosition(
              pair.b.orbitIndex, pair.b.slotIndex,
              centerX, centerY, rotationAngles[pair.b.orbitIndex]
            );
            const isSwappable = pair.canSwap;
            const involvesSelected = selectedPlanet &&
              (pair.a.id === selectedPlanet.id || pair.b.id === selectedPlanet.id);

            return (
              <Line
                key={`prox-${i}`}
                x1={posA.x} y1={posA.y}
                x2={posB.x} y2={posB.y}
                stroke={involvesSelected && isSwappable ? '#ffd700' : 'rgba(255,255,255,0.15)'}
                strokeWidth={involvesSelected && isSwappable ? 2 : 0.5}
                strokeDasharray={isSwappable ? undefined : '3,3'}
                strokeOpacity={isSwappable ? 0.8 : 0.3}
              />
            );
          })}
          {/* Alignment lines through triples */}
          {alignedTriples.map((triple, i) => {
            const positions = triple.planets.map((p) =>
              getSlotPosition(p.orbitIndex, p.slotIndex, centerX, centerY, rotationAngles[p.orbitIndex])
            );
            const color = PLANET_CONFIGS[triple.type].color;
            const tight = triple.avgAngleDiff < 5;
            // Pulse effect: oscillate opacity using rotation angle as proxy for time
            const pulse = Math.abs(Math.sin(rotationAngles[0] * 0.15));
            const glowOpacity = tight ? 0.3 + pulse * 0.4 : 0.1 + pulse * 0.15;
            const mainOpacity = tight ? 0.7 + pulse * 0.3 : 0.25 + pulse * 0.15;
            const mainWidth = tight ? 3 : 1.5;
            const glowWidth = tight ? 10 : 5;
            return (
              <React.Fragment key={`align-${i}`}>
                {/* Glow layer */}
                <Line
                  x1={positions[0].x} y1={positions[0].y}
                  x2={positions[2].x} y2={positions[2].y}
                  stroke={color}
                  strokeWidth={glowWidth}
                  strokeOpacity={glowOpacity}
                  strokeLinecap="round"
                />
                {/* Main line: inner to middle */}
                <Line
                  x1={positions[0].x} y1={positions[0].y}
                  x2={positions[1].x} y2={positions[1].y}
                  stroke={color}
                  strokeWidth={mainWidth}
                  strokeOpacity={mainOpacity}
                  strokeDasharray={tight ? undefined : '6,4'}
                  strokeLinecap="round"
                />
                {/* Main line: middle to outer */}
                <Line
                  x1={positions[1].x} y1={positions[1].y}
                  x2={positions[2].x} y2={positions[2].y}
                  stroke={color}
                  strokeWidth={mainWidth}
                  strokeOpacity={mainOpacity}
                  strokeDasharray={tight ? undefined : '6,4'}
                  strokeLinecap="round"
                />
              </React.Fragment>
            );
          })}
        </Svg>

        <StarCore centerX={centerX} centerY={centerY} />

        {state.planets.map((planet) => (
          <PlanetView
            key={planet.id}
            planet={planet}
            centerX={centerX}
            centerY={centerY}
            rotationAngle={rotationAngles[planet.orbitIndex]}
            isSelected={state.selectedPlanetId === planet.id}
            isRemoving={removingPlanetIds.has(planet.id)}
            isNew={newPlanetIds.has(planet.id)}
            isMatchable={alignedIds.has(planet.id)}
            isCollected={collectedSet.has(planet.id)}
            onTap={selectPlanet}
          />
        ))}

        {state.powerUps.find((p) => p.type === 'STAR_FREEZE' && p.active) && (
          <View style={styles.freezeOverlay} pointerEvents="none" />
        )}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  freezeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(52, 152, 219, 0.08)',
    borderRadius: 999,
  },
});
