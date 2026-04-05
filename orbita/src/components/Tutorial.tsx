import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

type TutorialStep = 'look' | 'swipe_demo' | 'your_turn' | 'done';

interface Props {
  onComplete: () => void;
  setPaused: (paused: boolean) => void;
  firstMatchDone: boolean;
}

export const Tutorial: React.FC<Props> = ({ onComplete, setPaused, firstMatchDone }) => {
  const [step, setStep] = useState<TutorialStep>('look');

  // Hand animation
  const handY = useSharedValue(0);
  const handOpacity = useSharedValue(0);
  // Pulse for "look" step
  const pulseOpacity = useSharedValue(0.5);

  // Pause orbits during teaching steps
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
      // Pulse animation for "watch" step
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.3, { duration: 800 })
        ),
        -1,
        true
      );
      const timer = setTimeout(() => setStep('swipe_demo'), 3500);
      return () => clearTimeout(timer);
    } else if (step === 'swipe_demo') {
      // Show animated hand swiping downward (from inner orbit to outer)
      handOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
      handY.value = withDelay(800,
        withRepeat(
          withSequence(
            withTiming(-50, { duration: 0 }),
            withTiming(50, { duration: 700, easing: Easing.inOut(Easing.ease) }),
            withTiming(50, { duration: 600 }),
          ),
          3,
          false
        )
      );
      const timer = setTimeout(() => {
        handOpacity.value = withTiming(0, { duration: 300 });
        setStep('your_turn');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Detect first match → complete tutorial
  useEffect(() => {
    if (step === 'your_turn' && firstMatchDone) {
      setTimeout(() => {
        setStep('done');
        onComplete();
      }, 1000);
    }
  }, [firstMatchDone, step, onComplete]);

  // Fallback: auto-complete after 30s on your_turn
  useEffect(() => {
    if (step === 'your_turn') {
      const timer = setTimeout(() => {
        setStep('done');
        onComplete();
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [step, onComplete]);

  const handStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: handY.value }],
    opacity: handOpacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  if (step === 'done') return null;

  const isBlocking = step === 'look' || step === 'swipe_demo';

  return (
    <View
      style={styles.overlay}
      pointerEvents={isBlocking ? 'box-only' : 'box-none'}
    >
      {/* Dim overlay during teaching */}
      {isBlocking && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={styles.dimOverlay}
          pointerEvents="none"
        />
      )}

      {/* Indicator arrow pointing at game area */}
      {step === 'look' && (
        <Animated.View style={[styles.lookIndicator, pulseStyle]} pointerEvents="none">
          <Text style={styles.arrowText}>↕</Text>
          <Text style={styles.indicatorLabel}>Watch the lines</Text>
        </Animated.View>
      )}

      {/* Hand gesture demo */}
      {step === 'swipe_demo' && (
        <Animated.View style={[styles.hand, handStyle]} pointerEvents="none">
          <Text style={styles.handEmoji}>👆</Text>
        </Animated.View>
      )}

      {/* Tutorial text */}
      <View style={styles.textContainer}>
        <Animated.View entering={FadeIn.duration(400)} key={step}>
          {step === 'look' && (
            <>
              <Text style={styles.mainText}>Same-color planets are aligning!</Text>
              <Text style={styles.subText}>Watch for glowing lines between them</Text>
            </>
          )}
          {step === 'swipe_demo' && (
            <>
              <Text style={styles.mainText}>Swipe through all three!</Text>
              <Text style={styles.subText}>Drag your finger across the 3 planets</Text>
            </>
          )}
          {step === 'your_turn' && (
            <>
              <Text style={styles.mainText}>Your turn!</Text>
              <Text style={styles.subText}>Swipe when the lines appear between 3 planets</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
  lookIndicator: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 36,
    color: '#ffd700',
    textShadowColor: '#ff8800',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  indicatorLabel: {
    fontSize: 14,
    color: '#ffd700',
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
  },
  hand: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
  },
  handEmoji: {
    fontSize: 44,
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
