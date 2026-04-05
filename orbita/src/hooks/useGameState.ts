import { useState, useCallback, useRef, useEffect } from 'react';
import { Sounds, startMusic, stopMusic, setMusicUrgency } from '../engine/sounds';
import {
  GameState,
  Planet,
  PowerUpType,
  PowerUpState,
  SwipeState,
  ORBIT_CONFIGS,
} from '../types/game';
import { LevelConfig, LEVELS } from '../types/levels';
import {
  generateBoard,
  findAlignedGroups,
  findProximityPairs,
  canSwapPlanets,
  isValidSwipe,
  biasedFillEmptySlots,
  AlignedTriple,
  ProximityPair,
} from '../engine/board';

function makePowerUps(level: LevelConfig): PowerUpState[] {
  return level.powerUps.map((p) => ({
    type: p.type,
    used: false,
    active: false,
  }));
}

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
  antigravityActive: boolean;
  currentLevel: LevelConfig;
  levelStars: number[];
  maxUnlockedLevel: number;
  startLevel: (levelId: number) => void;
  startGame: () => void;
  selectPlanet: (planet: Planet) => void;
  onSwipeStart: (planet: Planet) => void;
  onSwipeThrough: (planet: Planet) => void;
  onSwipeEnd: () => void;
  usePowerUp: (type: PowerUpType) => void;
  setRotationAngles: React.Dispatch<React.SetStateAction<number[]>>;
  updateIndicators: () => void;
  tickTimer: (dt: number) => void;
}

export function useGameState(): UseGameStateReturn {
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(LEVELS[0]);
  const [levelStars, setLevelStars] = useState<number[]>(new Array(LEVELS.length).fill(0));
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(1);

  const [state, setState] = useState<GameState>({
    planets: [],
    rescued: 0,
    rescueTarget: currentLevel.rescueTarget,
    swapsLeft: currentLevel.swaps,
    selectedPlanetId: null,
    phase: 'title',
    powerUps: makePowerUps(currentLevel),
    combo: 0,
    bestRescued: 0,
    timeLeft: currentLevel.time,
    totalTime: currentLevel.time,
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
  const [antigravityActive, setAntigravityActive] = useState(false);
  const processingRef = useRef(false);
  const freezeActiveRef = useRef(false);
  const freezeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const rotationAnglesRef = useRef(rotationAngles);
  rotationAnglesRef.current = rotationAngles;

  const updateIndicators = useCallback(() => {
    if (stateRef.current.phase !== 'playing' || processingRef.current) return;
    const angles = rotationAnglesRef.current;
    const result = findAlignedGroups(stateRef.current.planets, angles, currentLevel.alignmentTolerance);
    setAlignedIds(result.ids);
    setAlignedTriples(result.triples);
    setProximityPairs(findProximityPairs(stateRef.current.planets, angles));
  }, []);

  // Timer tick — called from GameBoard animation loop
  const musicTickRef = useRef(0);
  const tickTimer = useCallback((dt: number) => {
    if (stateRef.current.phase !== 'playing' || isPaused) return;

    // Update music urgency every ~1 second (not every frame)
    musicTickRef.current += dt;
    if (musicTickRef.current > 5) {
      musicTickRef.current = 0;
      const ratio = stateRef.current.timeLeft / stateRef.current.totalTime;
      setMusicUrgency(ratio);
    }

    setState((prev) => {
      const newTime = Math.max(0, prev.timeLeft - dt);
      if (newTime <= 0 && prev.phase === 'playing') {
        // Star explodes — start explosion animation
        stopMusic();
        Sounds.gameOver();
        // Transition to gameover after 4 seconds
        setTimeout(() => {
          setState((p) => ({
            ...p,
            phase: 'gameover',
            bestRescued: Math.max(p.bestRescued, p.rescued),
          }));
        }, 4000);
        return {
          ...prev,
          timeLeft: 0,
          phase: 'exploding',
        };
      }
      return { ...prev, timeLeft: newTime };
    });
  }, [isPaused]);

  const startLevel = useCallback((levelId: number) => {
    const level = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
    setCurrentLevel(level);
    const planets = generateBoard(level.planetTypes, level.slots);
    if (freezeTimerRef.current) clearInterval(freezeTimerRef.current);
    freezeActiveRef.current = false;
    Sounds.gameStart();
    startMusic();
    setState({
      planets,
      rescued: 0,
      rescueTarget: level.rescueTarget,
      swapsLeft: level.swaps,
      selectedPlanetId: null,
      phase: 'playing',
      powerUps: makePowerUps(level),
      combo: 0,
      bestRescued: stateRef.current.bestRescued,
      timeLeft: level.time,
      totalTime: level.time,
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

  const startGame = useCallback(() => {
    startLevel(currentLevel.id);
  }, [currentLevel, startLevel]);

  // --- SWIPE ---

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

    const currentAligned = alignedIds;
    const allAligned = collected.every((p) => currentAligned.has(p.id));

    if (isValidSwipe(collected) && allAligned) {
      processingRef.current = true;
      const matchIds = new Set(swipe.collectedIds);
      const rescueCount = collected.length;
      const newCombo = stateRef.current.combo + 1;

      if (newCombo >= 2) {
        Sounds.comboMatch(newCombo);
      } else {
        Sounds.match();
      }

      setRemovingPlanetIds(matchIds);

      setTimeout(() => {
        setState((prev) => {
          const remaining = prev.planets.filter((p) => !matchIds.has(p.id));
          let filled = biasedFillEmptySlots(remaining);
          const newIds = new Set(
            filled.filter((p) => !remaining.find((r) => r.id === p.id)).map((p) => p.id)
          );
          setNewPlanetIds(newIds);
          setRemovingPlanetIds(new Set());
          Sounds.spawn();

          const newRescued = prev.rescued + rescueCount;

          // Check win condition
          if (newRescued >= prev.rescueTarget) {
            stopMusic();
            Sounds.gameStart(); // victory sound
            // Record stars and unlock next level
            const swapsUsed = currentLevel.swaps - prev.swapsLeft;
            const powerUpsUsed = prev.powerUps.filter((p) => p.used).length;
            const stars = prev.timeLeft / currentLevel.time > 0.25
              ? (swapsUsed === 0 && powerUpsUsed <= 1 ? 3 : 2)
              : 1;
            setLevelStars((prev) => {
              const next = [...prev];
              next[currentLevel.id - 1] = Math.max(next[currentLevel.id - 1], stars);
              return next;
            });
            if (currentLevel.id < LEVELS.length) {
              setMaxUnlockedLevel((prev) => Math.max(prev, currentLevel.id + 1));
            }
            return {
              ...prev,
              planets: filled,
              rescued: newRescued,
              combo: newCombo,
              phase: 'won',
              bestRescued: Math.max(prev.bestRescued, newRescued),
            };
          }

          return {
            ...prev,
            planets: filled,
            rescued: newRescued,
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

  // --- CROSS-ORBIT SWAP ---

  const selectPlanet = useCallback((planet: Planet) => {
    if (stateRef.current.phase !== 'playing' || processingRef.current) return;
    if (isSwiping) return;

    const currentSelected = stateRef.current.selectedPlanetId;

    if (!currentSelected) {
      Sounds.select();
      setState((prev) => ({ ...prev, selectedPlanetId: planet.id }));
      return;
    }

    if (currentSelected === planet.id) {
      Sounds.deselect();
      setState((prev) => ({ ...prev, selectedPlanetId: null }));
      return;
    }

    const selectedPlanet = stateRef.current.planets.find((p) => p.id === currentSelected);
    if (!selectedPlanet) return;

    if (selectedPlanet.orbitIndex === planet.orbitIndex) {
      setState((prev) => ({ ...prev, selectedPlanetId: planet.id }));
      return;
    }

    if (stateRef.current.swapsLeft <= 0) {
      setState((prev) => ({ ...prev, selectedPlanetId: null }));
      return;
    }

    if (!canSwapPlanets(selectedPlanet, planet, rotationAnglesRef.current)) {
      setState((prev) => ({ ...prev, selectedPlanetId: planet.id }));
      return;
    }

    // Valid cross-orbit swap!
    Sounds.swap();
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

      return {
        ...prev,
        planets,
        selectedPlanetId: null,
        swapsLeft: prev.swapsLeft - 1,
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
        Sounds.powerUp();
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
        // MAGNET: find nearest potential triple and align them
        Sounds.powerUp();
        setState((prev) => {
          const angles = rotationAnglesRef.current;
          const byType: Record<string, typeof prev.planets> = {};
          for (const p of prev.planets) {
            if (!byType[p.type]) byType[p.type] = [];
            byType[p.type].push(p);
          }

          // Find the type with planets on all 3 orbits that are closest to aligned
          let bestTriple: typeof prev.planets | null = null;
          let bestDiff = Infinity;

          for (const type of Object.keys(byType)) {
            const group = byType[type];
            const byOrbit: (typeof prev.planets)[] = [[], [], []];
            for (const p of group) byOrbit[p.orbitIndex].push(p);
            if (!byOrbit[0].length || !byOrbit[1].length || !byOrbit[2].length) continue;

            // Check all triples
            for (const p0 of byOrbit[0]) {
              const a0 = (p0.slotIndex * 360 / 6 + angles[0]) % 360;
              for (const p1 of byOrbit[1]) {
                const a1 = (p1.slotIndex * 360 / 8 + angles[1]) % 360;
                for (const p2 of byOrbit[2]) {
                  const a2 = (p2.slotIndex * 360 / 10 + angles[2]) % 360;
                  const d01 = Math.min(Math.abs(a0 - a1), 360 - Math.abs(a0 - a1));
                  const d02 = Math.min(Math.abs(a0 - a2), 360 - Math.abs(a0 - a2));
                  const d12 = Math.min(Math.abs(a1 - a2), 360 - Math.abs(a1 - a2));
                  const totalDiff = d01 + d02 + d12;
                  if (totalDiff < bestDiff) {
                    bestDiff = totalDiff;
                    bestTriple = [p0, p1, p2];
                  }
                }
              }
            }
          }

          if (!bestTriple) {
            return {
              ...prev,
              powerUps: prev.powerUps.map((p) =>
                p.type === type ? { ...p, used: true } : p
              ),
            };
          }

          // Move middle and outer planet slots to align with inner planet's angle
          const targetAngle = (bestTriple[0].slotIndex * 360 / 6 + angles[0]) % 360;

          // Find closest slot on middle orbit to targetAngle
          let bestSlot1 = 0;
          let bestSlotDiff1 = Infinity;
          for (let s = 0; s < 8; s++) {
            const sa = (s * 360 / 8 + angles[1]) % 360;
            const d = Math.min(Math.abs(sa - targetAngle), 360 - Math.abs(sa - targetAngle));
            if (d < bestSlotDiff1) { bestSlotDiff1 = d; bestSlot1 = s; }
          }

          // Find closest slot on outer orbit
          let bestSlot2 = 0;
          let bestSlotDiff2 = Infinity;
          for (let s = 0; s < 10; s++) {
            const sa = (s * 360 / 10 + angles[2]) % 360;
            const d = Math.min(Math.abs(sa - targetAngle), 360 - Math.abs(sa - targetAngle));
            if (d < bestSlotDiff2) { bestSlotDiff2 = d; bestSlot2 = s; }
          }

          // Swap planets to aligned slots
          const newPlanets = prev.planets.map((p) => {
            // Move middle orbit planet to aligned slot
            if (p.id === bestTriple![1].id) {
              const occupant = prev.planets.find(
                (o) => o.orbitIndex === 1 && o.slotIndex === bestSlot1 && o.id !== p.id
              );
              if (occupant) {
                // Will be handled below
              }
              return { ...p, slotIndex: bestSlot1 };
            }
            // Move outer orbit planet to aligned slot
            if (p.id === bestTriple![2].id) {
              return { ...p, slotIndex: bestSlot2 };
            }
            return p;
          });

          // Swap occupants to old slots
          const finalPlanets = newPlanets.map((p) => {
            if (p.orbitIndex === 1 && p.slotIndex === bestSlot1 && p.id !== bestTriple![1].id) {
              return { ...p, slotIndex: bestTriple![1].slotIndex };
            }
            if (p.orbitIndex === 2 && p.slotIndex === bestSlot2 && p.id !== bestTriple![2].id) {
              return { ...p, slotIndex: bestTriple![2].slotIndex };
            }
            return p;
          });

          return {
            ...prev,
            planets: finalPlanets,
            powerUps: prev.powerUps.map((p) =>
              p.type === type ? { ...p, used: true } : p
            ),
          };
        });
        break;
      }
      case PowerUpType.ANTIGRAVITY: {
        Sounds.shake();
        processingRef.current = true;

        // Phase 1: planets float outward
        setAntigravityActive(true);
        setState((prev) => ({
          ...prev,
          powerUps: prev.powerUps.map((p) =>
            p.type === type ? { ...p, used: true } : p
          ),
        }));

        // Phase 2: after 1.5s, shuffle slot positions within each orbit
        setTimeout(() => {
          setAntigravityActive(false);

          setState((prev) => {
            const newPlanets = [...prev.planets];
            // Shuffle slot indices within each orbit
            for (let oi = 0; oi < 3; oi++) {
              const orbitPlanets = newPlanets.filter((p) => p.orbitIndex === oi);
              const slots = orbitPlanets.map((p) => p.slotIndex);
              // Fisher-Yates shuffle slots
              for (let i = slots.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [slots[i], slots[j]] = [slots[j], slots[i]];
              }
              orbitPlanets.forEach((p, idx) => {
                const planetIdx = newPlanets.indexOf(p);
                newPlanets[planetIdx] = { ...p, slotIndex: slots[idx] };
              });
            }
            return { ...prev, planets: newPlanets };
          });

          Sounds.powerUp();
          setTimeout(() => {
            processingRef.current = false;
          }, 800);
        }, 1500);
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
    antigravityActive,
    currentLevel,
    levelStars,
    maxUnlockedLevel,
    startLevel,
    startGame,
    selectPlanet,
    onSwipeStart,
    onSwipeThrough,
    onSwipeEnd,
    usePowerUp,
    setRotationAngles,
    updateIndicators,
    tickTimer,
  };
}
