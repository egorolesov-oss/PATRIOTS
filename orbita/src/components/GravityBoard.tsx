import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle as SvgCircle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { PLANET_CONFIGS, STAR_SIZE, PlanetType } from '../types/game';
import {
  GravPlanet,
  createRandomGravPlanet,
  gravityStep,
  trajectoryPreview,
  resetGravIds,
  STAR_RADIUS,
  BOARD_RADIUS,
} from '../engine/gravity';
import { Sounds } from '../engine/sounds';

const PLANET_SPRITES: Record<string, any> = {
  planet_red: require('../../assets/planet_red.png'),
  planet_green: require('../../assets/planet_green.png'),
  planet_blue: require('../../assets/planet_blue.png'),
  planet_gold: require('../../assets/planet_gold.png'),
  planet_pink: require('../../assets/planet_pink.png'),
  planet_purple: require('../../assets/planet_purple.png'),
};

interface Props {
  boardWidth: number;
  boardHeight: number;
  onWin: (stableCount: number) => void;
  onLose: (reason: string) => void;
  targetPlanets: number;
}

export const GravityBoard: React.FC<Props> = ({ boardWidth, boardHeight, onWin, onLose, targetPlanets }) => {
  const centerX = boardWidth / 2;
  const centerY = boardHeight / 2; // star in center
  const launchY = boardHeight * 0.82; // planet in lower area

  const [planets, setPlanets] = useState<GravPlanet[]>([]);
  const [currentPlanet, setCurrentPlanet] = useState<GravPlanet | null>(null);
  const [stableCount, setStableCount] = useState(0);
  const [preview, setPreview] = useState<{ x: number; y: number }[]>([]);
  const [gameActive, setGameActive] = useState(true);

  const planetsRef = useRef(planets);
  planetsRef.current = planets;
  const currentPlanetRef = useRef(currentPlanet);
  currentPlanetRef.current = currentPlanet;
  const gameActiveRef = useRef(gameActive);
  gameActiveRef.current = gameActive;
  const dragVxRef = useRef(0);
  const dragVyRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Spawn first planet
  useEffect(() => {
    resetGravIds();
    spawnNext();
  }, []);

  const spawnNext = useCallback(() => {
    const p = createRandomGravPlanet(centerX, launchY);
    setCurrentPlanet(p);
  }, [centerX, launchY]);

  // Physics loop
  useEffect(() => {
    if (!gameActive) return;

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const rawDt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      const dt = Math.min(rawDt, 0.033); // cap at ~30fps equivalent

      const { planets: updated, crashed, escaped } = gravityStep(
        planetsRef.current,
        centerX,
        centerY,
        dt
      );

      if (crashed.length > 0) {
        Sounds.gameOver();
      }
      if (escaped.length > 0) {
        // Just remove — not game over
      }

      // Count stable planets
      const newStable = updated.filter((p) => p.stable).length;
      setStableCount(newStable);

      setPlanets(updated);

      // If planets were lost, allow spawning again
      if ((crashed.length > 0 || escaped.length > 0) && !currentPlanetRef.current && updated.length < targetPlanets) {
        spawnNext();
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      lastTimeRef.current = 0;
    };
  }, [gameActive, centerX, centerY, targetPlanets, onWin]);

  // Launch gesture — all via refs for gesture thread access
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      if (!currentPlanetRef.current || !gameActiveRef.current) return;
      isDraggingRef.current = true;
      startXRef.current = event.x;
      startYRef.current = event.y;
    })
    .onUpdate((event) => {
      if (!currentPlanetRef.current || !isDraggingRef.current) return;
      const dx = -(event.x - startXRef.current);
      const dy = -(event.y - startYRef.current);
      const scale = 0.8;
      dragVxRef.current = dx * scale;
      dragVyRef.current = dy * scale;

      const pts = trajectoryPreview(
        currentPlanetRef.current.x, currentPlanetRef.current.y,
        dragVxRef.current, dragVyRef.current,
        centerX, centerY,
        80
      );
      setPreview(pts);
    })
    .onEnd(() => {
      if (!currentPlanetRef.current || !isDraggingRef.current) return;
      isDraggingRef.current = false;
      setPreview([]);

      const vx = dragVxRef.current;
      const vy = dragVyRef.current;
      const speed = Math.sqrt(vx * vx + vy * vy);

      if (speed < 2) return; // too weak

      Sounds.swap();

      const launched: GravPlanet = {
        ...currentPlanetRef.current,
        vx,
        vy,
        launched: true,
      };

      setPlanets((prev) => [...prev, launched]);
      setCurrentPlanet(null);

      // Spawn next after delay — only if under limit
      setTimeout(() => {
        if (planetsRef.current.length < targetPlanets) {
          spawnNext();
        }
      }, 800);
    });

  const starDisplaySize = STAR_SIZE * 2.2;

  // Star pulse animation
  const starScale = useSharedValue(1);
  useEffect(() => {
    starScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
  }, []);
  const starAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: centerX - starDisplaySize / 2 },
      { translateY: centerY - starDisplaySize / 2 },
      { scale: starScale.value },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <View style={[styles.container, { width: boardWidth, height: boardHeight }]}>
        {/* Orbit boundary hint */}
        <Svg width={boardWidth} height={boardHeight} style={StyleSheet.absoluteFill} pointerEvents="none">
          <SvgCircle
            cx={centerX} cy={centerY} r={BOARD_RADIUS}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} strokeDasharray="4,8"
          />

          {/* Trajectory preview */}
          {preview.map((pt, i) => (
            <SvgCircle
              key={i}
              cx={pt.x} cy={pt.y} r={2}
              fill="rgba(255,255,255,0.3)"
              fillOpacity={1 - i / preview.length}
            />
          ))}

          {/* Stable orbit indicators */}
          {planets.filter((p) => p.stable).map((p) => (
            <SvgCircle
              key={`ring-${p.id}`}
              cx={p.x} cy={p.y} r={p.radius + 4}
              fill="none" stroke="#2ecc71" strokeWidth={1} strokeOpacity={0.5}
            />
          ))}
        </Svg>

        {/* Star — pulsing */}
        <Animated.View style={[styles.star, { width: starDisplaySize, height: starDisplaySize }, starAnimStyle]}>
          <Svg width={starDisplaySize} height={starDisplaySize}>
            <Defs>
              <RadialGradient id="gravStar" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <Stop offset="30%" stopColor="#ffd700" stopOpacity="0.9" />
                <Stop offset="60%" stopColor="#ffaa00" stopOpacity="0.4" />
                <Stop offset="100%" stopColor="#ff8800" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <SvgCircle cx={starDisplaySize / 2} cy={starDisplaySize / 2} r={starDisplaySize / 2} fill="url(#gravStar)" />
          </Svg>
        </Animated.View>

        {/* Orbiting planets */}
        {planets.filter((p) => p.launched).map((p) => {
          const sprite = PLANET_SPRITES[PLANET_CONFIGS[p.type]?.sprite];
          const s = p.radius * 2;
          return (
            <View
              key={p.id}
              style={[styles.planet, {
                left: p.x - p.radius,
                top: p.y - p.radius,
                width: s,
                height: s,
              }]}
            >
              <Image source={sprite} style={{ width: s, height: s, borderRadius: p.radius }} resizeMode="cover" />
            </View>
          );
        })}

        {/* Current planet to launch */}
        {currentPlanet && (
          <View style={[styles.planet, {
            left: currentPlanet.x - currentPlanet.radius,
            top: currentPlanet.y - currentPlanet.radius,
            width: currentPlanet.radius * 2,
            height: currentPlanet.radius * 2,
          }]}>
            <Image
              source={PLANET_SPRITES[PLANET_CONFIGS[currentPlanet.type]?.sprite]}
              style={{
                width: currentPlanet.radius * 2,
                height: currentPlanet.radius * 2,
                borderRadius: currentPlanet.radius,
              }}
              resizeMode="cover"
            />
          </View>
        )}

        {/* HUD */}
        <View style={styles.hud} pointerEvents="none">
          <Text style={styles.hudText}>Orbiting: {stableCount}/{targetPlanets}</Text>
          {currentPlanet && (
            <Text style={styles.hint}>Swipe up to launch!</Text>
          )}
        </View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
  },
  planet: {
    position: 'absolute',
  },
  hud: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hudText: {
    color: '#f5e6c8',
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hint: {
    color: 'rgba(245,230,200,0.5)',
    fontSize: 12,
    marginTop: 4,
  },
});
