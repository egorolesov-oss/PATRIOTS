import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import { ORBIT_CONFIGS, Planet } from '../types/game';
import { getSlotPosition } from '../engine/board';
import { StarCore } from './StarCore';
import { OrbitalRings } from './OrbitalRings';
import { PlanetView } from './PlanetView';
import { ConjunctionBeam } from './ConjunctionBeam';
import { CascadePopup } from './CascadePopup';
import { UseGameStateReturn } from '../hooks/useGameState';

interface Props {
  game: UseGameStateReturn;
  boardSize: number;
}

export const GameBoard: React.FC<Props> = ({ game, boardSize }) => {
  const {
    state,
    rotationAngles,
    isTouching,
    isPaused,
    activeConjunctions,
    matchingPlanetIds,
    removingPlanetIds,
    newPlanetIds,
    swapPair,
    selectPlanet,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd,
    onSwapComplete,
    setIsTouching,
    setRotationAngles,
  } = game;

  const centerX = boardSize / 2;
  const centerY = boardSize / 2;
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Orbital rotation loop
  useEffect(() => {
    if (state.phase !== 'playing') return;

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (!isTouching && !isPaused) {
        setRotationAngles((prev: number[]) => {
          const next = [...prev];
          for (let i = 0; i < ORBIT_CONFIGS.length; i++) {
            const config = ORBIT_CONFIGS[i];
            next[i] += (config.rotationDirection * 360 * dt) / config.rotationDuration;
          }
          return next;
        });
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = 0;
    };
  }, [state.phase, isTouching, isPaused]);

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

  const activeSpokeAngle =
    activeConjunctions.length > 0 ? activeConjunctions[0].spokeAngle : null;

  return (
    <View style={[styles.container, { width: boardSize, height: boardSize }]}>
      {/* Background rings and spokes */}
      <OrbitalRings
        centerX={centerX}
        centerY={centerY}
        width={boardSize}
        height={boardSize}
        activeSpokeAngle={activeSpokeAngle}
      />

      {/* Central star */}
      <StarCore centerX={centerX} centerY={centerY} />

      {/* Conjunction beams */}
      {activeConjunctions.map((c, i) => (
        <ConjunctionBeam
          key={`beam-${i}`}
          spokeAngle={c.spokeAngle}
          centerX={centerX}
          centerY={centerY}
          width={boardSize}
          height={boardSize}
        />
      ))}

      {/* Planets */}
      {state.planets.map((planet) => (
        <PlanetView
          key={planet.id}
          planet={planet}
          centerX={centerX}
          centerY={centerY}
          rotationAngle={rotationAngles[planet.orbitIndex]}
          isSelected={state.selectedPlanetId === planet.id}
          isMatching={matchingPlanetIds.has(planet.id)}
          isRemoving={removingPlanetIds.has(planet.id)}
          isNew={newPlanetIds.has(planet.id)}
          onTap={selectPlanet}
          onDragStart={(p) => {
            setIsTouching(true);
            handleDragStart(p);
          }}
          onDragUpdate={handleDragUpdate}
          onDragEnd={(p) => {
            setIsTouching(false);
            handleDragEnd(p);
          }}
          swapTarget={getSwapTarget(planet)}
          onSwapComplete={
            swapPair && planet.id === swapPair.a.id ? onSwapComplete : undefined
          }
        />
      ))}

      {/* Cascade popup */}
      {state.cascadeLevel >= 2 && (
        <CascadePopup
          level={state.cascadeLevel}
          centerX={centerX}
          centerY={centerY}
        />
      )}

      {/* Cryo freeze overlay */}
      {state.powerUps.find((p) => p.type === 'CRYO_FREEZE' && p.active) && (
        <View style={styles.cryoOverlay} pointerEvents="none" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  cryoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(52, 152, 219, 0.08)',
    borderRadius: 999,
  },
});
