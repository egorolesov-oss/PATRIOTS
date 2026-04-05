import { useState, useCallback, useRef } from 'react';
import {
  GameState,
  Planet,
  PowerUpType,
  PowerUpState,
  INITIAL_MOVES,
  MAX_CASCADE_DEPTH,
  CRYO_DURATION,
  ORBIT_CONFIGS,
  Conjunction,
} from '../types/game';
import {
  generateValidBoard,
  findConjunctions,
  calculateScore,
  fillEmptySlots,
  getSlotAngle,
  normalizeAngle,
  hasPossibleMoves,
  reshuffleBoard,
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
  const cryoActiveRef = useRef(false);
  const cryoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs for latest state to avoid stale closures
  const rotationAnglesRef = useRef(rotationAngles);
  rotationAnglesRef.current = rotationAngles;
  const stateRef = useRef(state);
  stateRef.current = state;

  const finishProcessing = useCallback(() => {
    processingRef.current = false;
    // Don't unpause if Cryo Freeze is active
    if (!cryoActiveRef.current) {
      setIsPaused(false);
    }
  }, []);

  const checkGameOver = useCallback((planets: Planet[], score: number) => {
    setState((prev) => {
      if (prev.movesLeft <= 0) {
        return {
          ...prev,
          planets,
          score,
          phase: 'gameover',
          bestScore: Math.max(prev.bestScore, score),
        };
      }
      // Check for possible moves, reshuffle if none
      if (!hasPossibleMoves(planets, rotationAnglesRef.current)) {
        const reshuffled = reshuffleBoard(planets);
        return { ...prev, planets: reshuffled, score };
      }
      return prev;
    });
  }, []);

  const processConjunctions = useCallback(
    (planets: Planet[], snapshotAngles: number[], cascadeLevel: number, currentScore: number) => {
      const conjunctions = findConjunctions(planets, snapshotAngles);

      if (conjunctions.length === 0) {
        finishProcessing();
        // Check game over after all conjunctions are processed
        checkGameOver(planets, currentScore);
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
          // Find most common matched type to bias new spawns
          const matchedTypes = planets.filter((p) => allMatchIds.has(p.id)).map((p) => p.type);
          const biasType = matchedTypes.length > 0 ? matchedTypes[0] : undefined;
          const filled = fillEmptySlots(remaining, biasType);
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
              processConjunctions(filled, snapshotAngles, cascadeLevel + 1, newScore);
            }, 800);
          } else {
            finishProcessing();
            checkGameOver(filled, newScore);
          }
        }, 700);
      }, 800);
    },
    [finishProcessing, checkGameOver]
  );

  const startGame = useCallback(() => {
    const planets = generateValidBoard();
    if (cryoTimerRef.current) clearInterval(cryoTimerRef.current);
    cryoActiveRef.current = false;
    setState({
      planets,
      score: 0,
      movesLeft: INITIAL_MOVES,
      selectedPlanetId: null,
      phase: 'playing',
      powerUps: initialPowerUps.map((p) => ({ ...p })),
      cascadeLevel: 0,
      bestScore: stateRef.current.bestScore,
    });
    setActiveConjunctions([]);
    setMatchingPlanetIds(new Set());
    setRemovingPlanetIds(new Set());
    setNewPlanetIds(new Set());
    setSwapPair(null);
    setRotationAngles([0, 0, 0]);
    setIsPaused(false);
    processingRef.current = false;
  }, []);

  const selectPlanet = useCallback(
    (planet: Planet) => {
      if (stateRef.current.phase !== 'playing' || processingRef.current) return;
      if (stateRef.current.movesLeft <= 0) return;

      if (!stateRef.current.selectedPlanetId) {
        setState((prev) => ({ ...prev, selectedPlanetId: planet.id }));
        return;
      }

      if (stateRef.current.selectedPlanetId === planet.id) {
        setState((prev) => ({ ...prev, selectedPlanetId: null }));
        return;
      }

      // Find selected planet
      const selectedPlanet = stateRef.current.planets.find(
        (p) => p.id === stateRef.current.selectedPlanetId
      );
      if (!selectedPlanet) return;

      // Must be same orbit
      if (selectedPlanet.orbitIndex !== planet.orbitIndex) {
        setState((prev) => ({ ...prev, selectedPlanetId: planet.id }));
        return;
      }

      // Swap — snapshot angles now for conjunction checking later
      processingRef.current = true;
      setIsPaused(true);
      setSwapPair({ a: selectedPlanet, b: planet });
      setState((prev) => ({
        ...prev,
        selectedPlanetId: null,
        movesLeft: prev.movesLeft - 1,
      }));
    },
    []
  );

  const onSwapComplete = useCallback(() => {
    if (!swapPair) return;
    const { a, b } = swapPair;
    // Snapshot rotation angles at swap time for consistent conjunction detection
    const snapshotAngles = [...rotationAnglesRef.current];

    setState((prev) => {
      const planets = prev.planets.map((p) => {
        if (p.id === a.id) return { ...p, slotIndex: b.slotIndex };
        if (p.id === b.id) return { ...p, slotIndex: a.slotIndex };
        return p;
      });
      return { ...prev, planets };
    });

    setSwapPair(null);

    // Check conjunctions with snapshotted angles (not from stale closure)
    setTimeout(() => {
      const currentState = stateRef.current;
      processConjunctions(currentState.planets, snapshotAngles, 0, currentState.score);
    }, 50);
  }, [swapPair, processConjunctions]);

  const handleDragStart = useCallback(
    (planet: Planet) => {
      if (stateRef.current.phase !== 'playing' || processingRef.current) return;
      if (stateRef.current.movesLeft <= 0) return;
      setIsTouching(true);
      setState((prev) => ({ ...prev, selectedPlanetId: planet.id }));
    },
    []
  );

  const handleDragUpdate = useCallback((_planet: Planet, _angle: number) => {
    // Visual update handled in PlanetView
  }, []);

  const handleDragEnd = useCallback(
    (planet: Planet) => {
      setIsTouching(false);
      if (stateRef.current.phase !== 'playing' || processingRef.current) return;
      if (stateRef.current.movesLeft <= 0) return;

      const config = ORBIT_CONFIGS[planet.orbitIndex];
      const currentAngle = normalizeAngle(
        getSlotAngle(planet.orbitIndex, planet.slotIndex) +
          rotationAnglesRef.current[planet.orbitIndex]
      );

      let nearestSlot = planet.slotIndex;
      let minDist = Infinity;
      for (let si = 0; si < config.slotCount; si++) {
        const slotAngle = normalizeAngle(
          (si * 360) / config.slotCount + rotationAnglesRef.current[planet.orbitIndex]
        );
        const dist = Math.abs(currentAngle - slotAngle);
        if (dist < minDist) {
          minDist = dist;
          nearestSlot = si;
        }
      }

      if (nearestSlot !== planet.slotIndex) {
        const occupant = stateRef.current.planets.find(
          (p) => p.orbitIndex === planet.orbitIndex && p.slotIndex === nearestSlot
        );
        if (occupant) {
          const snapshotAngles = [...rotationAnglesRef.current];
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
            const currentState = stateRef.current;
            processConjunctions(currentState.planets, snapshotAngles, 0, currentState.score);
          }, 350);
        }
      }

      setState((prev) => ({ ...prev, selectedPlanetId: null }));
    },
    [processConjunctions]
  );

  const usePowerUp = useCallback(
    (type: PowerUpType) => {
      if (stateRef.current.phase !== 'playing') return;

      const pu = stateRef.current.powerUps.find((p) => p.type === type);
      if (!pu || pu.used) return;

      switch (type) {
        case PowerUpType.NOVA_BURST: {
          const innerPlanets = stateRef.current.planets.filter((p) => p.orbitIndex === 0);
          const innerIds = new Set(innerPlanets.map((p) => p.id));
          // Score based on number cleared
          const novaScore = innerPlanets.length * 150;
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
                score: prev.score + novaScore,
                powerUps: prev.powerUps.map((p) =>
                  p.type === type ? { ...p, used: true } : p
                ),
              };
            });
          }, 600);
          break;
        }

        case PowerUpType.CRYO_FREEZE: {
          cryoActiveRef.current = true;
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
              cryoActiveRef.current = false;
              // Only unpause if not currently processing conjunctions
              if (!processingRef.current) {
                setIsPaused(false);
              }
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
          if (!stateRef.current.selectedPlanetId) return;
          const selected = stateRef.current.planets.find(
            (p) => p.id === stateRef.current.selectedPlanetId
          );
          if (!selected) return;

          const targetType = selected.type;

          setState((prev) => {
            const newPlanets = prev.planets.map((p) => ({ ...p }));
            for (let oi = 0; oi < ORBIT_CONFIGS.length; oi++) {
              const orbitPlanets = newPlanets.filter((p) => p.orbitIndex === oi);
              const targets = orbitPlanets.filter((p) => p.type === targetType);
              if (targets.length < 2) continue;

              const avgSlot = Math.round(
                targets.reduce((sum, p) => sum + p.slotIndex, 0) / targets.length
              );
              const slotCount = ORBIT_CONFIGS[oi].slotCount;

              // Track occupied slots properly — update after each swap
              const slotOccupants = new Map<number, string>();
              for (const p of orbitPlanets) {
                slotOccupants.set(p.slotIndex, p.id);
              }

              // Sort targets by distance from avgSlot
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

              let offset = 0;
              for (const target of targets) {
                const desiredSlot = ((avgSlot + offset) % slotCount + slotCount) % slotCount;
                const targetIdx = newPlanets.findIndex((p) => p.id === target.id);
                const currentSlot = newPlanets[targetIdx].slotIndex;

                if (currentSlot !== desiredSlot) {
                  const occupantId = slotOccupants.get(desiredSlot);
                  if (occupantId && occupantId !== target.id) {
                    const occupantIdx = newPlanets.findIndex((p) => p.id === occupantId);
                    // Swap: occupant goes to target's current slot
                    newPlanets[occupantIdx] = { ...newPlanets[occupantIdx], slotIndex: currentSlot };
                    slotOccupants.set(currentSlot, occupantId);
                  }
                  newPlanets[targetIdx] = { ...newPlanets[targetIdx], slotIndex: desiredSlot };
                  slotOccupants.set(desiredSlot, target.id);
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
            const snapshotAngles = [...rotationAnglesRef.current];
            processingRef.current = true;
            setIsPaused(true);
            const currentState = stateRef.current;
            processConjunctions(currentState.planets, snapshotAngles, 0, currentState.score);
          }, 400);
          break;
        }
      }
    },
    [processConjunctions]
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
