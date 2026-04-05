import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  ORBIT_CONFIGS,
  STAR_HITZONE,
  ROTATION_SLOWDOWN,
  Planet,
} from '../types/game';
import { getSlotPosition, normalizeAngle } from '../engine/board';
import { StarCore } from './StarCore';
import { OrbitalRings } from './OrbitalRings';
import { PlanetView } from './PlanetView';
import { SwipeRayBeam } from './SwipeRayBeam';
import { AlignmentLines } from './AlignmentLines';
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
    swipeRay,
    alignments,
    removingPlanetIds,
    newPlanetIds,
    swapPair,
    selectPlanet,
    startSwipe,
    updateSwipe,
    endSwipe,
    onSwapComplete,
    setRotationAngles,
  } = game;

  const centerX = boardSize / 2;
  const centerY = boardSize / 2;
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const alignmentTickRef = useRef<number>(0);

  // Orbital rotation loop
  useEffect(() => {
    if (state.phase !== 'playing') return;

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (!isPaused) {
        const speedMultiplier = isSwiping ? ROTATION_SLOWDOWN : 1;
        setRotationAngles((prev: number[]) => {
          const next = [...prev];
          for (let i = 0; i < ORBIT_CONFIGS.length; i++) {
            const config = ORBIT_CONFIGS[i];
            next[i] +=
              (config.rotationDirection * 360 * dt * speedMultiplier) /
              config.rotationDuration;
          }
          return next;
        });
      }

      // Update alignments every ~200ms
      alignmentTickRef.current += dt;
      if (alignmentTickRef.current > 0.2) {
        alignmentTickRef.current = 0;
        // Alignment updates happen via the hook
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = 0;
    };
  }, [state.phase, isPaused, isSwiping]);

  // Swipe gesture — starts from star center area
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      const dx = event.x - centerX;
      const dy = event.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Must start near the star
      if (dist < STAR_HITZONE) {
        startSwipe();
      }
    })
    .onUpdate((event) => {
      if (!isSwiping && !swipeRay.active) return;
      const dx = event.x - centerX;
      const dy = event.y - centerY;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      updateSwipe(normalizeAngle(angle));
    })
    .onEnd(() => {
      endSwipe();
    })
    .onFinalize(() => {
      if (isSwiping || swipeRay.active) {
        endSwipe();
      }
    });

  const getSwapTarget = useCallback(
    (planet: Planet): { x: number; y: number } | null => {
      if (!swapPair) return null;
      if (planet.id === swapPair.a.id) {
        return getSlotPosition(
          swapPair.b.orbitIndex,
          swapPair.b.slotIndex,
          centerX,
          centerY,
          rotationAngles[swapPair.b.orbitIndex]
        );
      }
      if (planet.id === swapPair.b.id) {
        return getSlotPosition(
          swapPair.a.orbitIndex,
          swapPair.a.slotIndex,
          centerX,
          centerY,
          rotationAngles[swapPair.a.orbitIndex]
        );
      }
      return null;
    },
    [swapPair, centerX, centerY, rotationAngles]
  );

  // Determine which planets are hit by the ray
  const rayHitIds = new Set(
    swipeRay.active && swipeRay.matchType
      ? swipeRay.hitPlanets
          .filter((p) => p.type === swipeRay.matchType)
          .map((p) => p.id)
      : []
  );

  return (
    <GestureDetector gesture={panGesture}>
      <View style={[styles.container, { width: boardSize, height: boardSize }]}>
        {/* Background rings and spokes */}
        <OrbitalRings
          centerX={centerX}
          centerY={centerY}
          width={boardSize}
          height={boardSize}
          activeSpokeAngle={null}
        />

        {/* Alignment indicators */}
        <AlignmentLines
          alignments={alignments}
          rotationAngles={rotationAngles}
          centerX={centerX}
          centerY={centerY}
          width={boardSize}
          height={boardSize}
        />

        {/* Central star */}
        <StarCore centerX={centerX} centerY={centerY} />

        {/* Swipe ray beam */}
        <SwipeRayBeam
          swipeRay={swipeRay}
          centerX={centerX}
          centerY={centerY}
          width={boardSize}
          height={boardSize}
        />

        {/* Planets */}
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
            isRayHit={rayHitIds.has(planet.id)}
            onTap={selectPlanet}
            swapTarget={getSwapTarget(planet)}
            onSwapComplete={
              swapPair && planet.id === swapPair.a.id ? onSwapComplete : undefined
            }
          />
        ))}

        {/* Freeze overlay */}
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
