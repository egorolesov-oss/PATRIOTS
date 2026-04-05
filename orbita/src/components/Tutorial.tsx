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

type TutorialStep = 'look' | 'swipe_demo' | 'your_turn' | 'done';

interface PlanetPos {
  x: number;
  y: number;
  color: string;
}

interface Props {
  onComplete: () => void;
  setPaused: (paused: boolean) => void;
  firstMatchDone: boolean;
  alignedPlanets: PlanetPos[]; // positions of first aligned triple
  boardOffsetY: number; // board's Y offset from screen top
}

export const Tutorial: React.FC<Props> = ({
  onComplete,
  setPaused,
  firstMatchDone,
  alignedPlanets,
  boardOffsetY,
}) => {
  const [step, setStep] = useState<TutorialStep>('look');

  // Hand position animated between first and last aligned planet
  const handProgress = useSharedValue(0);
  const handOpacity = useSharedValue(0);
  const pulseVal = useSharedValue(0.4);

  // Pause orbits during teaching
  useEffect(() => {
    if (step === 'look' || step === 'swipe_demo') {
      setPaused(true);
    } else {
      setPaused(false);
    }
  }, [step, setPaused]);

  // Step progression
  useEffect(() => {
    if (step === 'look') {
      pulseVal.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.3, { duration: 600 })
        ),
        -1,
        true
      );
      const timer = setTimeout(() => setStep('swipe_demo'), 3500);
      return () => clearTimeout(timer);
    } else if (step === 'swipe_demo') {
      // Animate hand along the aligned planets
      handOpacity.value = withDelay(300, withTiming(1, { duration: 300 }));
      handProgress.value = withDelay(600,
        withRepeat(
          withSequence(
            withTiming(0, { duration: 0 }),
            withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 500 }),
          ),
          4,
          false
        )
      );
      const timer = setTimeout(() => {
        handOpacity.value = withTiming(0, { duration: 300 });
        setStep('your_turn');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Detect first match
  useEffect(() => {
    if (step === 'your_turn' && firstMatchDone) {
      setTimeout(() => { setStep('done'); onComplete(); }, 1000);
    }
  }, [firstMatchDone, step, onComplete]);

  // Fallback auto-complete
  useEffect(() => {
    if (step === 'your_turn') {
      const timer = setTimeout(() => { setStep('done'); onComplete(); }, 30000);
      return () => clearTimeout(timer);
    }
  }, [step, onComplete]);

  // Hand style: interpolate between first and last planet position
  const p0 = alignedPlanets[0];
  const p2 = alignedPlanets[2] || alignedPlanets[alignedPlanets.length - 1];
  const hasPositions = alignedPlanets.length >= 3 && p0 && p2;

  const handStyle = useAnimatedStyle(() => {
    if (!hasPositions) {
      return { opacity: 0 };
    }
    const x = p0.x + (p2.x - p0.x) * handProgress.value - 20;
    const y = p0.y + (p2.y - p0.y) * handProgress.value + boardOffsetY - 20;
    return {
      transform: [{ translateX: x }, { translateY: y }],
      opacity: handOpacity.value,
    };
  });

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseVal.value,
  }));

  if (step === 'done') return null;

  const isBlocking = step === 'look' || step === 'swipe_demo';

  return (
    <View style={styles.overlay} pointerEvents={isBlocking ? 'box-only' : 'box-none'}>
      {/* Dim during teaching */}
      {isBlocking && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={styles.dimOverlay}
          pointerEvents="none"
        />
      )}

      {/* Highlight rings around aligned planets */}
      {(step === 'look' || step === 'swipe_demo') && hasPositions && (
        <Animated.View style={[styles.highlightContainer, pulseStyle]} pointerEvents="none">
          <Svg width={SCREEN_W} height={500} style={{ position: 'absolute', top: boardOffsetY }}>
            {/* Connecting line through planets */}
            <Line
              x1={p0.x} y1={p0.y}
              x2={p2.x} y2={p2.y}
              stroke={p0.color}
              strokeWidth={3}
              strokeOpacity={0.6}
            />
            {/* Highlight circles */}
            {alignedPlanets.map((p, i) => (
              <React.Fragment key={i}>
                <SvgCircle cx={p.x} cy={p.y} r={24} stroke={p.color} strokeWidth={3} fill="none" strokeOpacity={0.9} />
                <SvgCircle cx={p.x} cy={p.y} r={28} stroke={p.color} strokeWidth={1} fill="none" strokeOpacity={0.4} />
              </React.Fragment>
            ))}
          </Svg>
        </Animated.View>
      )}

      {/* Animated hand during swipe_demo */}
      {step === 'swipe_demo' && hasPositions && (
        <Animated.View style={[styles.hand, handStyle]} pointerEvents="none">
          <Text style={styles.handEmoji}>👆</Text>
        </Animated.View>
      )}

      {/* Tutorial text */}
      <View style={styles.textContainer}>
        <Animated.View entering={FadeIn.duration(400)} key={step}>
          {step === 'look' && (
            <>
              <Text style={styles.mainText}>Same planets are aligning!</Text>
              <Text style={styles.subText}>See the glowing circles and line?</Text>
            </>
          )}
          {step === 'swipe_demo' && (
            <>
              <Text style={styles.mainText}>Swipe through all three!</Text>
              <Text style={styles.subText}>Drag your finger across them to rescue</Text>
            </>
          )}
          {step === 'your_turn' && (
            <>
              <Text style={styles.mainText}>Your turn!</Text>
              <Text style={styles.subText}>Swipe when lines appear between 3 same planets</Text>
            </>
          )}
        </Animated.View>
      </View>

      {/* Skip */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => { setStep('done'); onComplete(); }}
      >
        <Text style={styles.skipText}>Skip</Text>
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
    paddingHorizontal: 30,
    paddingBottom: 140,
    alignItems: 'center',
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
  hand: {
    position: 'absolute',
    width: 40,
    height: 40,
  },
  handEmoji: {
    fontSize: 36,
  },
  skipButton: {
    position: 'absolute',
    bottom: 130,
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
