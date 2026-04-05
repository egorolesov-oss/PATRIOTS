import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle as SvgCircle, Line } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');

type TutStep =
  | 'welcome'
  | 'swipe_explain'
  | 'swipe_demo'
  | 'swipe_try'
  | 'swap_explain'
  | 'swap_try'
  | 'freeze_explain'
  | 'freeze_try'
  | 'magnet_explain'
  | 'magnet_try'
  | 'antigrav_explain'
  | 'antigrav_try'
  | 'go'
  | 'done';

interface PlanetPos {
  x: number;
  y: number;
  color: string;
}

interface Props {
  onComplete: () => void;
  setPaused: (paused: boolean) => void;
  rescued: number;
  swapsUsed: boolean; // has player used a swap
  freezeUsed: boolean;
  magnetUsed: boolean;
  antigravUsed: boolean;
  alignedPlanets: PlanetPos[];
  boardOffsetY: number;
}

const STEPS_CONFIG: Record<TutStep, {
  title: string;
  subtitle: string;
  pauseOrbits: boolean;
  blockInput: boolean;
  autoAdvance?: number; // ms to auto-advance
  showHand?: boolean;
  highlightPlanets?: boolean;
  highlightButton?: 'freeze' | 'magnet' | 'antigrav';
}> = {
  welcome: {
    title: 'Welcome to ORBITA!',
    subtitle: 'Save planets from the dying star',
    pauseOrbits: true,
    blockInput: true,
    autoAdvance: 3000,
  },
  swipe_explain: {
    title: 'Same-color planets align...',
    subtitle: 'See the glowing lines between them?',
    pauseOrbits: true,
    blockInput: true,
    autoAdvance: 3500,
    highlightPlanets: true,
  },
  swipe_demo: {
    title: 'Swipe through all three!',
    subtitle: 'Drag your finger across them',
    pauseOrbits: true,
    blockInput: true,
    autoAdvance: 4000,
    showHand: true,
    highlightPlanets: true,
  },
  swipe_try: {
    title: 'Your turn — swipe!',
    subtitle: 'Wait for lines, then swipe through 3 planets',
    pauseOrbits: false,
    blockInput: false,
  },
  swap_explain: {
    title: 'Cross-orbit SWAP',
    subtitle: 'Tap a planet, then tap one on the next orbit when close',
    pauseOrbits: true,
    blockInput: true,
    autoAdvance: 4000,
  },
  swap_try: {
    title: 'Try a swap!',
    subtitle: 'Tap 2 planets on adjacent orbits when they\'re near',
    pauseOrbits: false,
    blockInput: false,
  },
  freeze_explain: {
    title: 'FREEZE power-up',
    subtitle: 'Stops all orbits for 8 seconds — press it!',
    pauseOrbits: true,
    blockInput: true,
    autoAdvance: 3000,
    highlightButton: 'freeze',
  },
  freeze_try: {
    title: 'Press FREEZE!',
    subtitle: 'It will stop orbits so you can aim easily',
    pauseOrbits: false,
    blockInput: false,
    highlightButton: 'freeze',
  },
  magnet_explain: {
    title: 'MAGNET power-up',
    subtitle: 'Pulls the nearest triple into alignment — press it!',
    pauseOrbits: true,
    blockInput: true,
    autoAdvance: 3000,
    highlightButton: 'magnet',
  },
  magnet_try: {
    title: 'Press MAGNET!',
    subtitle: 'It will align 3 planets for you',
    pauseOrbits: false,
    blockInput: false,
    highlightButton: 'magnet',
  },
  antigrav_explain: {
    title: 'ANTI-G power-up',
    subtitle: 'Reshuffles all planets to new positions — press it!',
    pauseOrbits: true,
    blockInput: true,
    autoAdvance: 3000,
    highlightButton: 'antigrav',
  },
  antigrav_try: {
    title: 'Press ANTI-G!',
    subtitle: 'Use when you\'re stuck — it creates new opportunities',
    pauseOrbits: false,
    blockInput: false,
    highlightButton: 'antigrav',
  },
  go: {
    title: 'You\'re ready!',
    subtitle: 'Rescue 9 planets before the star dies!',
    pauseOrbits: false,
    blockInput: true,
    autoAdvance: 2500,
  },
  done: {
    title: '',
    subtitle: '',
    pauseOrbits: false,
    blockInput: false,
  },
};

const STEP_ORDER: TutStep[] = [
  'welcome',
  'swipe_explain', 'swipe_demo', 'swipe_try',
  'swap_explain', 'swap_try',
  'freeze_explain', 'freeze_try',
  'magnet_explain', 'magnet_try',
  'antigrav_explain', 'antigrav_try',
  'go', 'done',
];

export const Tutorial: React.FC<Props> = ({
  onComplete,
  setPaused,
  rescued,
  swapsUsed,
  freezeUsed,
  magnetUsed,
  antigravUsed,
  alignedPlanets,
  boardOffsetY,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEP_ORDER[stepIndex] || 'done';
  const config = STEPS_CONFIG[step];
  const prevRescued = React.useRef(rescued);

  const handProgress = useSharedValue(0);
  const handOpacity = useSharedValue(0);
  const pulseVal = useSharedValue(0.4);

  // Pause/unpause orbits
  useEffect(() => {
    setPaused(config.pauseOrbits);
  }, [step, config.pauseOrbits, setPaused]);

  // Auto-advance steps
  useEffect(() => {
    if (config.autoAdvance) {
      const timer = setTimeout(() => advance(), config.autoAdvance);
      return () => clearTimeout(timer);
    }
  }, [stepIndex]);

  // Detect player actions to advance "try" steps
  useEffect(() => {
    if (step === 'swipe_try' && rescued > prevRescued.current) {
      prevRescued.current = rescued;
      setTimeout(() => advance(), 1000);
    }
  }, [rescued, step]);

  useEffect(() => {
    if (step === 'swap_try' && swapsUsed) {
      setTimeout(() => advance(), 1000);
    }
  }, [swapsUsed, step]);

  useEffect(() => {
    if (step === 'freeze_try' && freezeUsed) {
      setTimeout(() => advance(), 1500);
    }
  }, [freezeUsed, step]);

  useEffect(() => {
    if (step === 'magnet_try' && magnetUsed) {
      setTimeout(() => advance(), 1500);
    }
  }, [magnetUsed, step]);

  useEffect(() => {
    if (step === 'antigrav_try' && antigravUsed) {
      setTimeout(() => advance(), 1500);
    }
  }, [antigravUsed, step]);

  // Hand animation for swipe demo
  useEffect(() => {
    if (step === 'swipe_demo' && alignedPlanets.length >= 3) {
      handOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
      handProgress.value = withDelay(800,
        withRepeat(
          withSequence(
            withTiming(0, { duration: 0 }),
            withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 500 }),
          ),
          3, false
        )
      );
    } else {
      handOpacity.value = 0;
    }
  }, [step]);

  // Pulse for highlights
  useEffect(() => {
    pulseVal.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.3, { duration: 600 })
      ),
      -1, true
    );
  }, []);

  const advance = () => {
    const next = stepIndex + 1;
    if (next >= STEP_ORDER.length || STEP_ORDER[next] === 'done') {
      onComplete();
    } else {
      setStepIndex(next);
    }
  };

  const p0 = alignedPlanets[0];
  const p2 = alignedPlanets[2] || alignedPlanets[alignedPlanets.length - 1];
  const hasPositions = alignedPlanets.length >= 3 && p0 && p2;

  const handStyle = useAnimatedStyle(() => {
    if (!hasPositions) return { opacity: 0 };
    const x = p0.x + (p2.x - p0.x) * handProgress.value - 18;
    const y = p0.y + (p2.y - p0.y) * handProgress.value + boardOffsetY - 18;
    return {
      transform: [{ translateX: x }, { translateY: y }],
      opacity: handOpacity.value,
    };
  });

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseVal.value,
  }));

  if (step === 'done') return null;

  return (
    <View style={styles.overlay} pointerEvents={config.blockInput ? 'box-only' : 'box-none'}>
      {/* Dim during blocking steps */}
      {config.blockInput && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.dimOverlay}
          pointerEvents="none"
        />
      )}

      {/* Planet highlights */}
      {config.highlightPlanets && hasPositions && (
        <Animated.View style={[styles.highlightContainer, pulseStyle]} pointerEvents="none">
          <Svg width={SCREEN_W} height={500} style={{ position: 'absolute', top: boardOffsetY }}>
            <Line x1={p0.x} y1={p0.y} x2={p2.x} y2={p2.y}
              stroke={p0.color} strokeWidth={3} strokeOpacity={0.6} />
            {alignedPlanets.map((p, i) => (
              <React.Fragment key={i}>
                <SvgCircle cx={p.x} cy={p.y} r={24} stroke={p.color} strokeWidth={3} fill="none" />
                <SvgCircle cx={p.x} cy={p.y} r={28} stroke={p.color} strokeWidth={1} fill="none" strokeOpacity={0.4} />
              </React.Fragment>
            ))}
          </Svg>
        </Animated.View>
      )}

      {/* Hand gesture */}
      {config.showHand && hasPositions && (
        <Animated.View style={[styles.hand, handStyle]} pointerEvents="none">
          <Text style={styles.handEmoji}>👆</Text>
        </Animated.View>
      )}

      {/* Text */}
      <View style={styles.textContainer}>
        <Animated.View entering={FadeIn.duration(300)} key={stepIndex}>
          <Text style={styles.mainText}>{config.title}</Text>
          <Text style={styles.subText}>{config.subtitle}</Text>
          {/* Step indicator */}
          <View style={styles.stepDots}>
            {STEP_ORDER.filter((s) => s !== 'done').map((_, i) => (
              <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Skip */}
      <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
        <Text style={styles.skipText}>Skip tutorial</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: 'flex-end',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  highlightContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  textContainer: {
    paddingHorizontal: 24,
    paddingBottom: 220,
    alignItems: 'center',
    backgroundColor: 'rgba(6, 8, 24, 0.75)',
    paddingTop: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  mainText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  subText: {
    fontSize: 14,
    color: 'rgba(245, 230, 200, 0.7)',
    textAlign: 'center',
    marginTop: 8,
  },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: '#ffd700',
    width: 16,
  },
  hand: {
    position: 'absolute',
    width: 36,
    height: 36,
  },
  handEmoji: {
    fontSize: 32,
  },
  skipButton: {
    position: 'absolute',
    bottom: 185,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
  },
});
