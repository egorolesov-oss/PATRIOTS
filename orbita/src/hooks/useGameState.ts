import { useState, useCallback, useRef } from 'react';
import {
  GameState,
  Planet,
  PowerUpType,
  PowerUpState,
  SwipeState,
  INITIAL_SWAPS,
  ORBIT_CONFIGS,
} from '../types/game';
import {
  generateBoard,
  findAlignedGroups,
  findProximityPairs,
  canSwapPlanets,
  isValidSwipe,
  calculateScore,
  biasedFillEmptySlots,
  shufflePlanets,
  AlignedTriple,
  ProximityPair,
} from '../engine/board';

const initialPowerUps: PowerUpState[] = [
  { type: PowerUpType.STAR_FREEZE, used: false, active: false },
  { type: PowerUpType.NOVA_PULSE, used: false, active: false },
  { type: PowerUpType.ANTIGRAVITY, used: false, active: false },
];

export interface UseGameStateReturn {
  state: GameState;
  rotationAngles: number[];
  isSwiping: boolean;
  isPaused: boolean;
  swipe: SwipeState;
  alignedIds: Set<string>;
  alignedTriples: AlignedTriple[];
  proximityPairs: ProximityPair[];
  removingPlanetIds: Set<string>;
  newPlanetIds: Set<string>;
  startGame: () => void;
  selectPlanet: (planet: Planet) => void;
  onSwipeStart: (planet: Planet) => void;
  onSwipeThrough: (planet: Planet) => void;
  onSwipeEnd: () => void;
  usePowerUp: (type: PowerUpType) => void;
  setRotationAngles: React.Dispatch<React.SetStateAction<number[]>>;
  updateIndicators: () => void;
}

export function useGameState(): UseGameStateReturn {
  const [state, setState] = useState<GameState>({
    planets: [],
    score: 0,
    swapsLeft: INITIAL_SWAPS,
    selectedPlanetId: null,
    phase: 'title',
    powerUps: initialPowerUps.map((p) => ({ ...p })),
    combo: 0,
    bestScore: 0,
  });

  const [rotationAngles, setRotationAngles] = useState([0, 0, 0]);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [swipe, setSwipe] = useState<SwipeState>({
    active: false,
    orbitIndex: -1,
    collectedIds: [],
    matchType: null,
  });
  const [alignedIds, setAlignedIds] = useState<Set<string>>(new Set());
  const [alignedTriples, setAlignedTriples] = useState<AlignedTriple[]>([]);
  const [proximityPairs, setProximityPairs] = useState<ProximityPair[]>([]);
  const [removingPlanetIds, setRemovingPlanetIds] = useState<Set<string>>(new Set());
  const [newPlanetIds, setNewPlanetIds] = useState<Set<string>>(new Set());
  const processingRef = useRef(false);
  const freezeActiveRef = useRef(false);
  const freezeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMatchTimeRef = useRef<number>(Date.now());
  const stateRef = useRef(state);
  stateRef.current = state;
  const rotationAnglesRef = useRef(rotationAngles);
  rotationAnglesRef.current = rotationAngles;

  const updateIndicators = useCallback(() => {
    if (stateRef.current.phase !== 'playing' || processingRef.current) return;
    const angles = rotationAnglesRef.current;
    const result = findAlignedGroups(stateRef.current.planets, angles, 28);
    setAlignedIds(result.ids);
    setAlignedTriples(result.triples);
    setProximityPairs(findProximityPairs(stateRef.current.planets, angles));
  }, []);

  const startGame = useCallback(() => {
    const planets = generateBoard();
    if (freezeTimerRef.current) clearInterval(freezeTimerRef.current);
    freezeActiveRef.current = false;
    lastMatchTimeRef.current = Date.now();
    setState({
      planets,
      score: 0,
      swapsLeft: INITIAL_SWAPS,
      selectedPlanetId: null,
      phase: 'playing',
      powerUps: initialPowerUps.map((p) => ({ ...p })),
      combo: 0,
      bestScore: stateRef.current.bestScore,
    });
    setAlignedIds(new Set());
    setAlignedTriples([]);
    setProximityPairs([]);
    setRemovingPlanetIds(new Set());
    setNewPlanetIds(new Set());
    setRotationAngles([0, 0, 0]);
    setIsPaused(false);
    setIsSwiping(false);
    setSwipe({ active: false, orbitIndex: -1, collectedIds: [], matchType: null });
    processingRef.current = false;
  }, []);

  // --- SWIPE through aligned planets across orbits ---

  const onSwipeStart = useCallback((planet: Planet) => {
    if (stateRef.current.phase !== 'playing' || processingRef.current) return;
    setIsSwiping(true);
    setSwipe({
      active: true,
      orbitIndex: planet.orbitIndex,
      collectedIds: [planet.id],
      matchType: planet.type,
    });
    setState((prev) => ({ ...prev, selectedPlanetId: null }));
  }, []);

  const onSwipeThrough = useCallback((planet: Planet) => {
    if (!swipe.active) return;
    if (planet.type !== swipe.matchType || swipe.collectedIds.includes(planet.id)) return;
    // Must be on a different orbit
    const collectedPlanets = stateRef.current.planets.filter(
      (p) => swipe.collectedIds.includes(p.id)
    );
    const usedOrbits = new Set(collectedPlanets.map((p) => p.orbitIndex));
    if (usedOrbits.has(planet.orbitIndex)) return;

    setSwipe((prev) => ({
      ...prev,
      collectedIds: [...prev.collectedIds, planet.id],
    }));
  }, [swipe]);

  const onSwipeEnd = useCallback(() => {
    if (!swipe.active) {
      setIsSwiping(false);
      return;
    }

    const collected = stateRef.current.planets.filter(
      (p) => swipe.collectedIds.includes(p.id)
    );

    // Only valid if all collected planets are currently aligned (lines visible)
    const currentAligned = alignedIds;
    const allAligned = collected.every((p) => currentAligned.has(p.id));

    if (isValidSwipe(collected) && allAligned) {
      processingRef.current = true;
      const matchIds = new Set(swipe.collectedIds);
      const newCombo = stateRef.current.combo + 1;
      const points = calculateScore(collected.length, newCombo);

      setRemovingPlanetIds(matchIds);

      setTimeout(() => {
        setState((prev) => {
          const remaining = prev.planets.filter((p) => !matchIds.has(p.id));
          // Refill empty slots with biased spawning
          let filled = biasedFillEmptySlots(remaining);
          const newIds = new Set(
            filled.filter((p) => !remaining.find((r) => r.id === p.id)).map((p) => p.id)
          );
          setNewPlanetIds(newIds);
          setRemovingPlanetIds(new Set());
          // Reset no-match timer
          lastMatchTimeRef.current = Date.now();
          return {
            ...prev,
            planets: filled,
            score: prev.score + points,
            combo: newCombo,
          };
        });

        setTimeout(() => {
          setNewPlanetIds(new Set());
          processingRef.current = false;
          if (!freezeActiveRef.current) setIsPaused(false);
        }, 500);
      }, 500);
    } else {
      setState((prev) => ({ ...prev, combo: 0 }));
    }

    setIsSwiping(false);
    setSwipe({ active: false, orbitIndex: -1, collectedIds: [], matchType: null });
  }, [swipe, alignedIds]);

  // --- CROSS-ORBIT TAP SWAP ---

  const selectPlanet = useCallback((planet: Planet) => {
    if (stateRef.current.phase !== 'playing' || processingRef.current) return;
    if (isSwiping) return;

    const currentSelected = stateRef.current.selectedPlanetId;

    if (!currentSelected) {
      setState((prev) => ({ ...prev, selectedPlanetId: planet.id }));
      return;
    }

    if (currentSelected === planet.id) {
      setState((prev) => ({ ...prev, selectedPlanetId: null }));
      return;
    }

    const selectedPlanet = stateRef.current.planets.find((p) => p.id === currentSelected);
    if (!selectedPlanet) return;

    // Cross-orbit swap: must be different orbit, adjacent, and close enough
    if (selectedPlanet.orbitIndex === planet.orbitIndex) {
      // Same orbit — just re-select
      setState((prev) => ({ ...prev, selectedPlanetId: planet.id }));
      return;
    }

    if (stateRef.current.swapsLeft <= 0) {
      setState((prev) => ({ ...prev, selectedPlanetId: null }));
      return;
    }

    // Check proximity
    if (!canSwapPlanets(selectedPlanet, planet, rotationAnglesRef.current)) {
      // Too far apart — re-select
      setState((prev) => ({ ...prev, selectedPlanetId: planet.id }));
      return;
    }

    // Valid cross-orbit swap!
    setState((prev) => {
      const planets = prev.planets.map((p) => {
        if (p.id === selectedPlanet.id) {
          return { ...p, orbitIndex: planet.orbitIndex, slotIndex: planet.slotIndex };
        }
        if (p.id === planet.id) {
          return { ...p, orbitIndex: selectedPlanet.orbitIndex, slotIndex: selectedPlanet.slotIndex };
        }
        return p;
      });

      const newSwaps = prev.swapsLeft - 1;
      if (newSwaps <= 0) {
        return {
          ...prev,
          planets,
          selectedPlanetId: null,
          swapsLeft: 0,
          phase: 'gameover',
          bestScore: Math.max(prev.bestScore, prev.score),
        };
      }
      return {
        ...prev,
        planets,
        selectedPlanetId: null,
        swapsLeft: newSwaps,
      };
    });
  }, [isSwiping]);

  // --- POWER-UPS ---

  const usePowerUp = useCallback((type: PowerUpType) => {
    if (stateRef.current.phase !== 'playing') return;
    const pu = stateRef.current.powerUps.find((p) => p.type === type);
    if (!pu || pu.used) return;

    switch (type) {
      case PowerUpType.STAR_FREEZE: {
        freezeActiveRef.current = true;
        setIsPaused(true);
        setState((prev) => ({
          ...prev,
          powerUps: prev.powerUps.map((p) =>
            p.type === type ? { ...p, used: true, active: true, remainingTime: 8 } : p
          ),
        }));
        let remaining = 8;
        freezeTimerRef.current = setInterval(() => {
          remaining--;
          if (remaining <= 0) {
            if (freezeTimerRef.current) clearInterval(freezeTimerRef.current);
            freezeActiveRef.current = false;
            if (!processingRef.current) setIsPaused(false);
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
      case PowerUpType.NOVA_PULSE: {
        setState((prev) => ({
          ...prev,
          powerUps: prev.powerUps.map((p) =>
            p.type === type ? { ...p, used: true } : p
          ),
        }));
        break;
      }
      case PowerUpType.ANTIGRAVITY: {
        setState((prev) => {
          const types = prev.planets.map((p) => p.type);
          for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
          }
          const shuffled = prev.planets.map((p, i) => ({ ...p, type: types[i] }));
          return {
            ...prev,
            planets: shuffled,
            powerUps: prev.powerUps.map((p) =>
              p.type === type ? { ...p, used: true } : p
            ),
          };
        });
        break;
      }
    }
  }, []);

  return {
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
    startGame,
    selectPlanet,
    onSwipeStart,
    onSwipeThrough,
    onSwipeEnd,
    usePowerUp,
    setRotationAngles,
    updateIndicators,
  };
}
