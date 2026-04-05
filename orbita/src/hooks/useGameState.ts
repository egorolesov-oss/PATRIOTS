import { useState, useCallback, useRef } from 'react';
import {
  GameState,
  Planet,
  PowerUpType,
  PowerUpState,
  SwipeState,
  INITIAL_MOVES,
  ORBIT_CONFIGS,
} from '../types/game';
import {
  generateBoard,
  findAlignedGroups,
  isValidSwipe,
  calculateScore,
  fillEmptySlots,
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
  removingPlanetIds: Set<string>;
  newPlanetIds: Set<string>;
  swapPair: { a: Planet; b: Planet } | null;
  startGame: () => void;
  selectPlanet: (planet: Planet) => void;
  onSwipeStart: (planet: Planet) => void;
  onSwipeThrough: (planet: Planet) => void;
  onSwipeEnd: () => void;
  usePowerUp: (type: PowerUpType) => void;
  onSwapComplete: () => void;
  setRotationAngles: React.Dispatch<React.SetStateAction<number[]>>;
  updateAligned: () => void;
}

export function useGameState(): UseGameStateReturn {
  const [state, setState] = useState<GameState>({
    planets: [],
    score: 0,
    movesLeft: INITIAL_MOVES,
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
  const [removingPlanetIds, setRemovingPlanetIds] = useState<Set<string>>(new Set());
  const [newPlanetIds, setNewPlanetIds] = useState<Set<string>>(new Set());
  const [swapPair, setSwapPair] = useState<{ a: Planet; b: Planet } | null>(null);
  const processingRef = useRef(false);
  const freezeActiveRef = useRef(false);
  const freezeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const rotationAnglesRef = useRef(rotationAngles);
  rotationAnglesRef.current = rotationAngles;

  const updateAligned = useCallback(() => {
    if (stateRef.current.phase !== 'playing' || processingRef.current) return;
    const ids = findAlignedGroups(
      stateRef.current.planets,
      rotationAnglesRef.current,
      15 // tolerance degrees
    );
    setAlignedIds(ids);
  }, []);

  const startGame = useCallback(() => {
    const planets = generateBoard();
    if (freezeTimerRef.current) clearInterval(freezeTimerRef.current);
    freezeActiveRef.current = false;
    setState({
      planets,
      score: 0,
      movesLeft: INITIAL_MOVES,
      selectedPlanetId: null,
      phase: 'playing',
      powerUps: initialPowerUps.map((p) => ({ ...p })),
      combo: 0,
      bestScore: stateRef.current.bestScore,
    });
    setAlignedIds(new Set());
    setRemovingPlanetIds(new Set());
    setNewPlanetIds(new Set());
    setSwapPair(null);
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
    // Must be same type, different orbit, not already collected
    if (
      planet.type !== swipe.matchType ||
      swipe.collectedIds.includes(planet.id)
    ) return;

    // Must be on a different orbit than all already collected
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

    if (isValidSwipe(collected)) {
      // Valid match!
      processingRef.current = true;
      const matchIds = new Set(swipe.collectedIds);
      const newCombo = stateRef.current.combo + 1;
      const points = calculateScore(collected.length, newCombo);

      setRemovingPlanetIds(matchIds);

      setTimeout(() => {
        setState((prev) => {
          const remaining = prev.planets.filter((p) => !matchIds.has(p.id));
          setRemovingPlanetIds(new Set());

          return {
            ...prev,
            planets: remaining,
            score: prev.score + points,
            combo: newCombo,
          };
        });

        setTimeout(() => {
          setNewPlanetIds(new Set());
          processingRef.current = false;
          if (!freezeActiveRef.current) setIsPaused(false);
        }, 600);
      }, 500);
    } else {
      // Invalid swipe — reset combo
      setState((prev) => ({ ...prev, combo: 0 }));
    }

    setIsSwiping(false);
    setSwipe({ active: false, orbitIndex: -1, collectedIds: [], matchType: null });
  }, [swipe]);

  // --- TAP TO SWAP ---

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

    if (selectedPlanet.orbitIndex !== planet.orbitIndex) {
      setState((prev) => ({ ...prev, selectedPlanetId: planet.id }));
      return;
    }

    if (stateRef.current.movesLeft <= 0) return;
    setSwapPair({ a: selectedPlanet, b: planet });
    setState((prev) => ({
      ...prev,
      selectedPlanetId: null,
      movesLeft: prev.movesLeft - 1,
    }));
  }, [isSwiping]);

  const onSwapComplete = useCallback(() => {
    if (!swapPair) return;
    const { a, b } = swapPair;

    setState((prev) => {
      const planets = prev.planets.map((p) => {
        if (p.id === a.id) return { ...p, slotIndex: b.slotIndex };
        if (p.id === b.id) return { ...p, slotIndex: a.slotIndex };
        return p;
      });

      if (prev.movesLeft <= 0) {
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
  }, [swapPair]);

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
        // Shake/shuffle: randomly reassign planet types across all occupied slots
        setState((prev) => {
          const types = prev.planets.map((p) => p.type);
          // Fisher-Yates shuffle
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
    removingPlanetIds,
    newPlanetIds,
    swapPair,
    startGame,
    selectPlanet,
    onSwipeStart,
    onSwipeThrough,
    onSwipeEnd,
    usePowerUp,
    onSwapComplete,
    setRotationAngles,
    updateAligned,
  };
}
