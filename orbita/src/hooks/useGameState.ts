import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GameState,
  Planet,
  PowerUpType,
  PowerUpState,
  INITIAL_MOVES,
  MAX_CASCADE_DEPTH,
  CRYO_DURATION,
  ORBIT_CONFIGS,
  PlanetType,
  Conjunction,
} from '../types/game';
import {
  generateValidBoard,
  findConjunctions,
  calculateScore,
  fillEmptySlots,
  getSlotAngle,
  normalizeAngle,
} from '../engine/board';

const initialPowerUps: PowerUpState[] = [
  { type: PowerUpType.NOVA_BURST, used: false, active: false },
  { type: PowerUpType.CRYO_FREEZE, used: false, active: false },
  { type: PowerUpType.GRAVITY_WELL, used: false, active: false },
];

export interface UseGameStateReturn {
  state: GameState;
  rotationAngles: number[];
  isTouching: boolean;
  isPaused: boolean;
  activeConjunctions: Conjunction[];
  matchingPlanetIds: Set<string>;
  removingPlanetIds: Set<string>;
  newPlanetIds: Set<string>;
  swapPair: { a: Planet; b: Planet } | null;
  startGame: () => void;
  selectPlanet: (planet: Planet) => void;
  handleDragStart: (planet: Planet) => void;
  handleDragUpdate: (planet: Planet, angle: number) => void;
  handleDragEnd: (planet: Planet) => void;
  usePowerUp: (type: PowerUpType) => void;
  onSwapComplete: () => void;
  setIsTouching: (v: boolean) => void;
  setRotationAngles: React.Dispatch<React.SetStateAction<number[]>>;
}

export function useGameState(): UseGameStateReturn {
  const [state, setState] = useState<GameState>({
    planets: [],
    score: 0,
    movesLeft: INITIAL_MOVES,
    selectedPlanetId: null,
    phase: 'title',
    powerUps: initialPowerUps.map((p) => ({ ...p })),
    cascadeLevel: 0,
    bestScore: 0,
  });

  const [rotationAngles, setRotationAngles] = useState([0, 0, 0]);
  const [isTouching, setIsTouching] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeConjunctions, setActiveConjunctions] = useState<Conjunction[]>([]);
  const [matchingPlanetIds, setMatchingPlanetIds] = useState<Set<string>>(new Set());
  const [removingPlanetIds, setRemovingPlanetIds] = useState<Set<string>>(new Set());
  const [newPlanetIds, setNewPlanetIds] = useState<Set<string>>(new Set());
  const [swapPair, setSwapPair] = useState<{ a: Planet; b: Planet } | null>(null);
  const processingRef = useRef(false);
  const cryoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback(() => {
    const planets = generateValidBoard();
    setState({
      planets,
      score: 0,
      movesLeft: INITIAL_MOVES,
      selectedPlanetId: null,
      phase: 'playing',
      powerUps: initialPowerUps.map((p) => ({ ...p })),
      cascadeLevel: 0,
      bestScore: state.bestScore,
    });
    setActiveConjunctions([]);
    setMatchingPlanetIds(new Set());
    setRemovingPlanetIds(new Set());
    setNewPlanetIds(new Set());
    setSwapPair(null);
    setRotationAngles([0, 0, 0]);
    processingRef.current = false;
  }, [state.bestScore]);

  const processConjunctions = useCallback(
    (planets: Planet[], currentAngles: number[], cascadeLevel: number, currentScore: number) => {
      const conjunctions = findConjunctions(planets, currentAngles);

      if (conjunctions.length === 0) {
        processingRef.current = false;
        setIsPaused(false);
        return;
      }

      const allMatchIds = new Set<string>();
      for (const c of conjunctions) {
        for (const p of c.planets) {
          allMatchIds.add(p.id);
        }
      }

      setActiveConjunctions(conjunctions);
      setMatchingPlanetIds(allMatchIds);

      // After matching animation, remove planets
      setTimeout(() => {
        setRemovingPlanetIds(allMatchIds);
        setActiveConjunctions([]);

        // Calculate score
        let matchScore = 0;
        for (const c of conjunctions) {
          matchScore += calculateScore(c.planets.length, cascadeLevel + 1);
        }
        const newScore = currentScore + matchScore;

        // Remove matched planets and fill
        setTimeout(() => {
          const remaining = planets.filter((p) => !allMatchIds.has(p.id));
          const filled = fillEmptySlots(remaining);
          const newIds = new Set(
            filled.filter((p) => !remaining.find((r) => r.id === p.id)).map((p) => p.id)
          );

          setState((prev) => ({
            ...prev,
            planets: filled,
            score: newScore,
            cascadeLevel: cascadeLevel + 1,
          }));
          setMatchingPlanetIds(new Set());
          setRemovingPlanetIds(new Set());
          setNewPlanetIds(newIds);

          // Check for cascades
          if (cascadeLevel + 1 < MAX_CASCADE_DEPTH) {
            setTimeout(() => {
              setNewPlanetIds(new Set());
              processConjunctions(filled, currentAngles, cascadeLevel + 1, newScore);
            }, 800);
          } else {
            processingRef.current = false;
            setIsPaused(false);
          }
        }, 700);
      }, 800);
    },
    []
  );

  const selectPlanet = useCallback(
    (planet: Planet) => {
      if (state.phase !== 'playing' || processingRef.current) return;

      if (!state.selectedPlanetId) {
        setState((prev) => ({ ...prev, selectedPlanetId: planet.id }));
        return;
      }

      if (state.selectedPlanetId === planet.id) {
        setState((prev) => ({ ...prev, selectedPlanetId: null }));
        return;
      }

      // Find selected planet
      const selectedPlanet = state.planets.find((p) => p.id === state.selectedPlanetId);
      if (!selectedPlanet) return;

      // Must be same orbit
      if (selectedPlanet.orbitIndex !== planet.orbitIndex) {
        // Select the new planet instead
        setState((prev) => ({ ...prev, selectedPlanetId: planet.id }));
        return;
      }

      // Swap
      processingRef.current = true;
      setIsPaused(true);
      setSwapPair({ a: selectedPlanet, b: planet });
      setState((prev) => ({
        ...prev,
        selectedPlanetId: null,
        movesLeft: prev.movesLeft - 1,
      }));
    },
    [state.phase, state.selectedPlanetId, state.planets]
  );

  const onSwapComplete = useCallback(() => {
    if (!swapPair) return;
    const { a, b } = swapPair;

    setState((prev) => {
      const planets = prev.planets.map((p) => {
        if (p.id === a.id) return { ...p, slotIndex: b.slotIndex };
        if (p.id === b.id) return { ...p, slotIndex: a.slotIndex };
        return p;
      });

      // Check game over
      const movesLeft = prev.movesLeft;
      if (movesLeft <= 0) {
        return {
          ...prev,
          planets,
          phase: 'gameover',
          bestScore: Math.max(prev.bestScore, prev.score),
        };
      }

      return { ...prev, planets };
    });

    setSwapPair(null);

    // Check conjunctions after a short delay
    setTimeout(() => {
      setState((prev) => {
        processConjunctions(prev.planets, rotationAngles, 0, prev.score);
        return prev;
      });
    }, 50);
  }, [swapPair, rotationAngles, processConjunctions]);

  const handleDragStart = useCallback(
    (planet: Planet) => {
      if (state.phase !== 'playing' || processingRef.current) return;
      setIsTouching(true);
      setState((prev) => ({ ...prev, selectedPlanetId: planet.id }));
    },
    [state.phase]
  );

  const handleDragUpdate = useCallback((_planet: Planet, _angle: number) => {
    // Visual update handled in PlanetView
  }, []);

  const handleDragEnd = useCallback(
    (planet: Planet) => {
      setIsTouching(false);
      if (state.phase !== 'playing' || processingRef.current) return;

      // Snap to nearest slot
      const config = ORBIT_CONFIGS[planet.orbitIndex];
      const currentAngle = normalizeAngle(
        getSlotAngle(planet.orbitIndex, planet.slotIndex) +
          rotationAngles[planet.orbitIndex]
      );

      let nearestSlot = planet.slotIndex;
      let minDist = Infinity;
      for (let si = 0; si < config.slotCount; si++) {
        const slotAngle = normalizeAngle(
          (si * 360) / config.slotCount + rotationAngles[planet.orbitIndex]
        );
        const dist = Math.abs(currentAngle - slotAngle);
        if (dist < minDist) {
          minDist = dist;
          nearestSlot = si;
        }
      }

      if (nearestSlot !== planet.slotIndex) {
        // Check if slot is occupied and swap
        const occupant = state.planets.find(
          (p) => p.orbitIndex === planet.orbitIndex && p.slotIndex === nearestSlot
        );
        if (occupant) {
          processingRef.current = true;
          setIsPaused(true);
          setState((prev) => ({
            ...prev,
            selectedPlanetId: null,
            movesLeft: prev.movesLeft - 1,
            planets: prev.planets.map((p) => {
              if (p.id === planet.id) return { ...p, slotIndex: nearestSlot };
              if (p.id === occupant.id) return { ...p, slotIndex: planet.slotIndex };
              return p;
            }),
          }));

          setTimeout(() => {
            setState((prev) => {
              if (prev.movesLeft <= 0) {
                return {
                  ...prev,
                  phase: 'gameover',
                  bestScore: Math.max(prev.bestScore, prev.score),
                };
              }
              processConjunctions(prev.planets, rotationAngles, 0, prev.score);
              return prev;
            });
          }, 350);
        }
      }

      setState((prev) => ({ ...prev, selectedPlanetId: null }));
    },
    [state.phase, state.planets, rotationAngles, processConjunctions]
  );

  const usePowerUp = useCallback(
    (type: PowerUpType) => {
      if (state.phase !== 'playing') return;

      const pu = state.powerUps.find((p) => p.type === type);
      if (!pu || pu.used) return;

      switch (type) {
        case PowerUpType.NOVA_BURST: {
          // Remove all inner orbit planets
          const innerIds = new Set(
            state.planets
              .filter((p) => p.orbitIndex === 0)
              .map((p) => p.id)
          );
          setRemovingPlanetIds(innerIds);

          setTimeout(() => {
            setState((prev) => {
              const remaining = prev.planets.filter((p) => p.orbitIndex !== 0);
              const filled = fillEmptySlots(remaining);
              const newIds = new Set(
                filled.filter((p) => !remaining.find((r) => r.id === p.id)).map((p) => p.id)
              );
              setNewPlanetIds(newIds);
              setRemovingPlanetIds(new Set());

              return {
                ...prev,
                planets: filled,
                score: prev.score + 500,
                powerUps: prev.powerUps.map((p) =>
                  p.type === type ? { ...p, used: true } : p
                ),
              };
            });
          }, 600);
          break;
        }

        case PowerUpType.CRYO_FREEZE: {
          setIsPaused(true);
          setState((prev) => ({
            ...prev,
            powerUps: prev.powerUps.map((p) =>
              p.type === type ? { ...p, used: true, active: true, remainingTime: CRYO_DURATION } : p
            ),
          }));

          let remaining = CRYO_DURATION;
          cryoTimerRef.current = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
              if (cryoTimerRef.current) clearInterval(cryoTimerRef.current);
              setIsPaused(false);
              setState((prev) => ({
                ...prev,
                powerUps: prev.powerUps.map((p) =>
                  p.type === type ? { ...p, active: false, remainingTime: 0 } : p
                ),
              }));
            } else {
              setState((prev) => ({
                ...prev,
                powerUps: prev.powerUps.map((p) =>
                  p.type === type ? { ...p, remainingTime: remaining } : p
                ),
              }));
            }
          }, 1000);
          break;
        }

        case PowerUpType.GRAVITY_WELL: {
          if (!state.selectedPlanetId) return;
          const selected = state.planets.find((p) => p.id === state.selectedPlanetId);
          if (!selected) return;

          const targetType = selected.type;

          // For each orbit, group planets of targetType toward each other
          setState((prev) => {
            const newPlanets = [...prev.planets];
            for (let oi = 0; oi < ORBIT_CONFIGS.length; oi++) {
              const orbitPlanets = newPlanets.filter((p) => p.orbitIndex === oi);
              const targets = orbitPlanets.filter((p) => p.type === targetType);
              if (targets.length < 2) continue;

              // Find average slot position and cluster targets around it
              const avgSlot = Math.round(
                targets.reduce((sum, p) => sum + p.slotIndex, 0) / targets.length
              );
              const slotCount = ORBIT_CONFIGS[oi].slotCount;

              // Sort by distance from avgSlot
              targets.sort((a, b) => {
                const da = Math.min(
                  Math.abs(a.slotIndex - avgSlot),
                  slotCount - Math.abs(a.slotIndex - avgSlot)
                );
                const db = Math.min(
                  Math.abs(b.slotIndex - avgSlot),
                  slotCount - Math.abs(b.slotIndex - avgSlot)
                );
                return da - db;
              });

              // Try to move targets to adjacent slots around avgSlot
              const usedSlots = new Set(orbitPlanets.map((p) => p.slotIndex));
              let offset = 0;
              for (const target of targets) {
                const desiredSlot = ((avgSlot + offset) % slotCount + slotCount) % slotCount;
                if (!usedSlots.has(desiredSlot) || target.slotIndex === desiredSlot) {
                  // Swap with whatever is at desiredSlot
                  const occupant = newPlanets.find(
                    (p) => p.orbitIndex === oi && p.slotIndex === desiredSlot && p.id !== target.id
                  );
                  if (occupant) {
                    const idx = newPlanets.indexOf(occupant);
                    newPlanets[idx] = { ...occupant, slotIndex: target.slotIndex };
                  }
                  const tIdx = newPlanets.indexOf(target);
                  newPlanets[tIdx] = { ...target, slotIndex: desiredSlot };
                }
                offset = offset <= 0 ? -offset + 1 : -offset;
              }
            }

            return {
              ...prev,
              planets: newPlanets,
              selectedPlanetId: null,
              powerUps: prev.powerUps.map((p) =>
                p.type === type ? { ...p, used: true } : p
              ),
            };
          });

          // Check conjunctions after gravity well
          setTimeout(() => {
            processingRef.current = true;
            setIsPaused(true);
            setState((prev) => {
              processConjunctions(prev.planets, rotationAngles, 0, prev.score);
              return prev;
            });
          }, 400);
          break;
        }
      }
    },
    [state.phase, state.powerUps, state.selectedPlanetId, state.planets, rotationAngles, processConjunctions]
  );

  return {
    state,
    rotationAngles,
    isTouching,
    isPaused,
    activeConjunctions,
    matchingPlanetIds,
    removingPlanetIds,
    newPlanetIds,
    swapPair,
    startGame,
    selectPlanet,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd,
    usePowerUp,
    onSwapComplete,
    setIsTouching,
    setRotationAngles,
  };
}
