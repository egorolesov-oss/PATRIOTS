import { useState, useCallback, useRef } from 'react';
import {
  GameState,
  Planet,
  PowerUpType,
  PowerUpState,
  SwipeState,
  INITIAL_MOVES,
  ORBIT_CONFIGS,
  PLANET_HITBOX,
} from '../types/game';
import {
  generateBoard,
  findOrbitMatches,
  findMatchingPlanetIds,
  calculateScore,
  fillEmptySlots,
  getSlotPosition,
} from '../engine/board';

const initialPowerUps: PowerUpState[] = [
  { type: PowerUpType.STAR_FREEZE, used: false, active: false },
  { type: PowerUpType.NOVA_PULSE, used: false, active: false },
  { type: PowerUpType.CLEANSE_RAY, used: false, active: false },
];

export interface UseGameStateReturn {
  state: GameState;
  rotationAngles: number[];
  isSwiping: boolean;
  isPaused: boolean;
  swipe: SwipeState;
  matchableIds: Set<string>;
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
  updateMatchables: () => void;
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
  const [matchableIds, setMatchableIds] = useState<Set<string>>(new Set());
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

  const updateMatchables = useCallback(() => {
    if (stateRef.current.phase !== 'playing' || processingRef.current) return;
    const ids = findMatchingPlanetIds(stateRef.current.planets);
    setMatchableIds(ids);
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
    setMatchableIds(new Set());
    setRemovingPlanetIds(new Set());
    setNewPlanetIds(new Set());
    setSwapPair(null);
    setRotationAngles([0, 0, 0]);
    setIsPaused(false);
    setIsSwiping(false);
    setSwipe({ active: false, orbitIndex: -1, collectedIds: [], matchType: null });
    processingRef.current = false;
  }, []);

  // --- SWIPE through adjacent planets ---

  const onSwipeStart = useCallback((planet: Planet) => {
    if (stateRef.current.phase !== 'playing' || processingRef.current) return;
    // Only start on matchable planets
    if (!matchableIds.has(planet.id)) return;

    setIsSwiping(true);
    setSwipe({
      active: true,
      orbitIndex: planet.orbitIndex,
      collectedIds: [planet.id],
      matchType: planet.type,
    });
    setState((prev) => ({ ...prev, selectedPlanetId: null }));
  }, [matchableIds]);

  const onSwipeThrough = useCallback((planet: Planet) => {
    if (!swipe.active) return;
    // Must be same orbit, same type, not already collected
    if (
      planet.orbitIndex !== swipe.orbitIndex ||
      planet.type !== swipe.matchType ||
      swipe.collectedIds.includes(planet.id)
    ) return;

    // Must be adjacent to last collected planet
    const lastId = swipe.collectedIds[swipe.collectedIds.length - 1];
    const lastPlanet = stateRef.current.planets.find((p) => p.id === lastId);
    if (!lastPlanet) return;

    const slotCount = ORBIT_CONFIGS[planet.orbitIndex].slotCount;
    const diff = Math.abs(planet.slotIndex - lastPlanet.slotIndex);
    const isAdjacent = diff === 1 || diff === slotCount - 1;
    if (!isAdjacent) return;

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

    if (swipe.collectedIds.length >= 3) {
      // Valid match!
      processingRef.current = true;
      const matchIds = new Set(swipe.collectedIds);
      const newCombo = stateRef.current.combo + 1;
      const points = calculateScore(swipe.collectedIds.length, newCombo);

      setRemovingPlanetIds(matchIds);

      setTimeout(() => {
        setState((prev) => {
          const remaining = prev.planets.filter((p) => !matchIds.has(p.id));
          const filled = fillEmptySlots(remaining);
          const filledIds = new Set(
            filled.filter((p) => !remaining.find((r) => r.id === p.id)).map((p) => p.id)
          );
          setNewPlanetIds(filledIds);
          setRemovingPlanetIds(new Set());

          const newScore = prev.score + points;

          return {
            ...prev,
            planets: filled,
            score: newScore,
            combo: newCombo,
          };
        });

        // Check for auto-matches (cascades) after fill
        setTimeout(() => {
          setNewPlanetIds(new Set());
          // Auto-collect any new matches
          const currentPlanets = stateRef.current.planets;
          const autoMatches = findOrbitMatches(currentPlanets);
          if (autoMatches.length > 0) {
            const autoIds = new Set<string>();
            let autoScore = 0;
            for (const m of autoMatches) {
              for (const p of m.planets) autoIds.add(p.id);
              autoScore += calculateScore(m.planets.length, stateRef.current.combo + 1);
            }
            setRemovingPlanetIds(autoIds);

            setTimeout(() => {
              setState((prev) => {
                const remaining = prev.planets.filter((p) => !autoIds.has(p.id));
                const filled = fillEmptySlots(remaining);
                const filledIds = new Set(
                  filled.filter((p) => !remaining.find((r) => r.id === p.id)).map((p) => p.id)
                );
                setNewPlanetIds(filledIds);
                setRemovingPlanetIds(new Set());
                return {
                  ...prev,
                  planets: filled,
                  score: prev.score + autoScore,
                  combo: prev.combo + 1,
                };
              });
              setTimeout(() => {
                setNewPlanetIds(new Set());
                processingRef.current = false;
                if (!freezeActiveRef.current) setIsPaused(false);
              }, 600);
            }, 500);
          } else {
            processingRef.current = false;
            if (!freezeActiveRef.current) setIsPaused(false);
          }
        }, 600);
      }, 500);
    } else {
      // Too few — reset combo
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
      case PowerUpType.NOVA_PULSE:
      case PowerUpType.CLEANSE_RAY: {
        setState((prev) => ({
          ...prev,
          powerUps: prev.powerUps.map((p) =>
            p.type === type ? { ...p, used: true } : p
          ),
        }));
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
    matchableIds,
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
    updateMatchables,
  };
}
