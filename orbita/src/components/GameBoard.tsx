import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  ORBIT_CONFIGS,
  PLANET_SIZE,
  PLANET_HITBOX,
  ROTATION_SLOWDOWN,
  Planet,
} from '../types/game';
import { getSlotPosition } from '../engine/board';
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
    matchableIds,
    removingPlanetIds,
    newPlanetIds,
    swapPair,
    selectPlanet,
    onSwipeStart,
    onSwipeThrough,
    onSwipeEnd,
    onSwapComplete,
    setRotationAngles,
    updateMatchables,
  } = game;

  const centerX = boardSize / 2;
  const centerY = boardSize / 2;
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const matchTickRef = useRef<number>(0);

  // Orbital rotation + matchable updates
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

      // Update matchable highlights every ~300ms
      matchTickRef.current += dt;
      if (matchTickRef.current > 0.3) {
        matchTickRef.current = 0;
        updateMatchables();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = 0;
    };
  }, [state.phase, isPaused, isSwiping]);

  // Find nearest planet to a touch point
  const findNearestPlanet = useCallback(
    (touchX: number, touchY: number): Planet | null => {
      let best: Planet | null = null;
      let bestDist = PLANET_HITBOX;

      for (const planet of state.planets) {
        const pos = getSlotPosition(
          planet.orbitIndex,
          planet.slotIndex,
          centerX,
          centerY,
          rotationAngles[planet.orbitIndex]
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

  // Pan gesture for swiping through planets
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      const planet = findNearestPlanet(event.x, event.y);
      if (planet) {
        onSwipeStart(planet);
      }
    })
    .onUpdate((event) => {
      if (!swipe.active) return;
      const planet = findNearestPlanet(event.x, event.y);
      if (planet) {
        onSwipeThrough(planet);
      }
    })
    .onEnd(() => {
      onSwipeEnd();
    })
    .onFinalize(() => {
      onSwipeEnd();
    });

  // Tap gesture for selecting/swapping planets
  const tapGesture = Gesture.Tap().onEnd((event) => {
    const planet = findNearestPlanet(event.x, event.y);
    if (planet) {
      selectPlanet(planet);
    }
  });

  const composed = Gesture.Exclusive(panGesture, tapGesture);

  const getSwapTarget = useCallback(
    (planet: Planet): { x: number; y: number } | null => {
      if (!swapPair) return null;
      if (planet.id === swapPair.a.id) {
        return getSlotPosition(
          swapPair.b.orbitIndex, swapPair.b.slotIndex,
          centerX, centerY, rotationAngles[swapPair.b.orbitIndex]
        );
      }
      if (planet.id === swapPair.b.id) {
        return getSlotPosition(
          swapPair.a.orbitIndex, swapPair.a.slotIndex,
          centerX, centerY, rotationAngles[swapPair.a.orbitIndex]
        );
      }
      return null;
    },
    [swapPair, centerX, centerY, rotationAngles]
  );

  const collectedSet = new Set(swipe.collectedIds);

  return (
    <GestureDetector gesture={composed}>
      <View style={[styles.container, { width: boardSize, height: boardSize }]}>
        <OrbitalRings
          centerX={centerX}
          centerY={centerY}
          width={boardSize}
          height={boardSize}
          activeSpokeAngle={null}
        />

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
            isMatchable={matchableIds.has(planet.id)}
            isCollected={collectedSet.has(planet.id)}
            onTap={selectPlanet}
            swapTarget={getSwapTarget(planet)}
            onSwapComplete={
              swapPair && planet.id === swapPair.a.id ? onSwapComplete : undefined
            }
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
