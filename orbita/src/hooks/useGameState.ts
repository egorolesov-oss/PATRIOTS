import { useState, useCallback, useRef } from 'react';
import {
  GameState,
  Planet,
  PlanetType,
  PowerUpType,
  PowerUpState,
  SwipeRayState,
  AlignmentIndicator,
  INITIAL_MOVES,
  ALIGNMENT_PERFECT,
  ORBIT_CONFIGS,
} from '../types/game';
import {
  generateBoard,
  findPlanetsOnRay,
  findBestMatch,
  findAlignments,
  calculateSwipeScore,
  fillEmptySlots,
  normalizeAngle,
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
  swipeRay: SwipeRayState;
  alignments: AlignmentIndicator[];
  removingPlanetIds: Set<string>;
  newPlanetIds: Set<string>;
  swapPair: { a: Planet; b: Planet } | null;
  startGame: () => void;
  selectPlanet: (planet: Planet) => void;
  startSwipe: () => void;
  updateSwipe: (angle: number) => void;
  endSwipe: () => void;
  usePowerUp: (type: PowerUpType) => void;
  onSwapComplete: () => void;
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
    combo: 0,
    bestScore: 0,
  });

  const [rotationAngles, setRotationAngles] = useState([0, 0, 0]);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [swipeRay, setSwipeRay] = useState<SwipeRayState>({
    active: false,
    angle: 0,
    hitPlanets: [],
    matchType: null,
  });
  const [alignments, setAlignments] = useState<AlignmentIndicator[]>([]);
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

  // Update alignments periodically (called from GameBoard animation loop)
  const updateAlignments = useCallback(() => {
    const current = stateRef.current;
    if (current.phase !== 'playing' || processingRef.current) return;
    const a = findAlignments(current.planets, rotationAnglesRef.current);
    setAlignments(a);
  }, []);

  const finishProcessing = useCallback(() => {
    processingRef.current = false;
    if (!freezeActiveRef.current) {
      setIsPaused(false);
    }
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
    setAlignments([]);
    setRemovingPlanetIds(new Set());
    setNewPlanetIds(new Set());
    setSwapPair(null);
    setRotationAngles([0, 0, 0]);
    setIsPaused(false);
    setIsSwiping(false);
    setSwipeRay({ active: false, angle: 0, hitPlanets: [], matchType: null });
    processingRef.current = false;
  }, []);

  // --- SWIPE RAY ---

  const startSwipe = useCallback(() => {
    if (stateRef.current.phase !== 'playing' || processingRef.current) return;
    setIsSwiping(true);
    setSwipeRay({ active: true, angle: 0, hitPlanets: [], matchType: null });
    // Deselect any selected planet
    setState((prev) => ({ ...prev, selectedPlanetId: null }));
  }, []);

  const updateSwipe = useCallback((angle: number) => {
    if (!isSwiping && !swipeRay.active) return;
    const normAngle = normalizeAngle(angle);
    const hits = findPlanetsOnRay(
      stateRef.current.planets,
      normAngle,
      rotationAnglesRef.current
    );
    const { matchedPlanets, matchType } = findBestMatch(hits);

    setSwipeRay({
      active: true,
      angle: normAngle,
      hitPlanets: hits,
      matchType,
    });
  }, [isSwiping, swipeRay.active]);

  const endSwipe = useCallback(() => {
    if (!swipeRay.active) return;

    const { hitPlanets } = swipeRay;
    const { matchedPlanets, matchType } = findBestMatch(hitPlanets);

    if (matchedPlanets.length >= 2 && matchType) {
      // Successful swipe!
      processingRef.current = true;
      const matchIds = new Set(matchedPlanets.map((p) => p.id));
      const allThreeOrbits = new Set(matchedPlanets.map((p) => p.orbitIndex)).size === 3;

      // Check if perfect alignment
      const angles = matchedPlanets.map((p) => {
        const slotAngle = (p.slotIndex * 360) / ORBIT_CONFIGS[p.orbitIndex].slotCount;
        return normalizeAngle(slotAngle + rotationAnglesRef.current[p.orbitIndex]);
      });
      let maxDiff = 0;
      for (let i = 1; i < angles.length; i++) {
        const diff = Math.abs(normalizeAngle(angles[i]) - normalizeAngle(angles[0]));
        const d = Math.min(diff, 360 - diff);
        if (d > maxDiff) maxDiff = d;
      }
      const perfect = maxDiff <= ALIGNMENT_PERFECT;

      const newCombo = stateRef.current.combo + 1;
      const points = calculateSwipeScore(
        matchedPlanets.length,
        allThreeOrbits,
        perfect,
        newCombo
      );

      setRemovingPlanetIds(matchIds);

      // Remove after animation
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
          const movesLeft = prev.movesLeft;

          if (movesLeft <= 0) {
            return {
              ...prev,
              planets: filled,
              score: newScore,
              combo: newCombo,
              phase: 'gameover',
              bestScore: Math.max(prev.bestScore, newScore),
            };
          }

          return {
            ...prev,
            planets: filled,
            score: newScore,
            combo: newCombo,
          };
        });

        setTimeout(() => {
          setNewPlanetIds(new Set());
          finishProcessing();
        }, 600);
      }, 500);
    } else {
      // Missed swipe — reset combo
      setState((prev) => ({ ...prev, combo: 0 }));
    }

    setIsSwiping(false);
    setSwipeRay({ active: false, angle: 0, hitPlanets: [], matchType: null });
  }, [swipeRay, finishProcessing]);

  // --- TAP TO SWAP (within orbit) ---

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

    // Must be same orbit
    if (selectedPlanet.orbitIndex !== planet.orbitIndex) {
      setState((prev) => ({ ...prev, selectedPlanetId: planet.id }));
      return;
    }

    // Swap — costs 1 move
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
        // Find nearest alignment and snap it to perfect
        const currentAlignments = findAlignments(
          stateRef.current.planets,
          rotationAnglesRef.current
        );
        if (currentAlignments.length === 0) return;

        // Already handled visually — just mark as used
        setState((prev) => ({
          ...prev,
          powerUps: prev.powerUps.map((p) =>
            p.type === type ? { ...p, used: true } : p
          ),
        }));
        break;
      }

      case PowerUpType.CLEANSE_RAY: {
        // Next swipe will clear everything on the line regardless of type
        setState((prev) => ({
          ...prev,
          powerUps: prev.powerUps.map((p) =>
            p.type === type ? { ...p, used: true, active: true } : p
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
    swipeRay,
    alignments,
    removingPlanetIds,
    newPlanetIds,
    swapPair,
    startGame,
    selectPlanet,
    startSwipe,
    updateSwipe,
    endSwipe,
    usePowerUp,
    onSwapComplete,
    setRotationAngles,
  };
}
