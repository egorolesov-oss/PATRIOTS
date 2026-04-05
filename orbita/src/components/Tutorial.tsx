import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
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

interface Props {
  onComplete: () => void;
}

type TutorialStep = 'look' | 'swipe_demo' | 'your_turn' | 'wait' | 'done';

export const Tutorial: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState<TutorialStep>('look');
  const [showHand, setShowHand] = useState(false);

  // Hand animation for swipe demo
  const handX = useSharedValue(0);
  const handY = useSharedValue(0);
  const handOpacity = useSharedValue(0);

  useEffect(() => {
    // Step progression timers
    if (step === 'look') {
      setTimeout(() => setStep('swipe_demo'), 3000);
    } else if (step === 'swipe_demo') {
      setShowHand(true);
      // Animate hand swipe gesture
      handOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
      handX.value = withDelay(800,
        withRepeat(
          withSequence(
            withTiming(-40, { duration: 0 }),
            withTiming(40, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(40, { duration: 500 }),
          ),
          3,
          false
        )
      );
      handY.value = withDelay(800,
        withRepeat(
          withSequence(
            withTiming(40, { duration: 0 }),
            withTiming(-40, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(-40, { duration: 500 }),
          ),
          3,
          false
        )
      );
      setTimeout(() => {
        setShowHand(false);
        handOpacity.value = withTiming(0, { duration: 300 });
        setStep('your_turn');
      }, 5000);
    } else if (step === 'your_turn') {
      // Wait for player to make first match (handled externally)
      // Auto-advance after 15s if stuck
      setTimeout(() => setStep('wait'), 15000);
    } else if (step === 'wait') {
      setTimeout(() => setStep('done'), 8000);
    } else if (step === 'done') {
      onComplete();
    }
  }, [step]);

  // Allow skipping
  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Notify parent when player should attempt swipe
  useEffect(() => {
    if (step === 'your_turn') {
      // This is when the game should be interactive
    }
  }, [step]);

  const handStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: handX.value },
      { translateY: handY.value },
    ],
    opacity: handOpacity.value,
  }));

  const getText = () => {
    switch (step) {
      case 'look':
        return 'Three same-color planets are aligning...';
      case 'swipe_demo':
        return 'Swipe through all three to rescue them!';
      case 'your_turn':
        return 'Your turn — swipe when the lines appear!';
      case 'wait':
        return 'Wait for the alignment... then swipe!';
      case 'done':
        return '';
    }
  };

  const getSubtext = () => {
    switch (step) {
      case 'look':
        return 'Watch the glowing lines between them';
      case 'swipe_demo':
        return 'Drag your finger from one planet to another';
      case 'your_turn':
        return 'Look for glowing lines connecting 3 planets';
      case 'wait':
        return 'The orbits are rotating — timing is key!';
      default:
        return '';
    }
  };

  if (step === 'done') return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Tutorial text */}
      <Animated.View
        entering={FadeIn.duration(500)}
        style={styles.textContainer}
      >
        <Text style={styles.mainText}>{getText()}</Text>
        <Text style={styles.subText}>{getSubtext()}</Text>
      </Animated.View>

      {/* Hand gesture animation */}
      {showHand && (
        <Animated.View style={[styles.hand, handStyle]}>
          <Text style={styles.handEmoji}>👆</Text>
        </Animated.View>
      )}

      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip tutorial</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 200,
  },
  textContainer: {
    marginTop: 60,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  mainText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subText: {
    fontSize: 14,
    color: 'rgba(245, 230, 200, 0.6)',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  hand: {
    position: 'absolute',
    top: '45%',
    left: '45%',
  },
  handEmoji: {
    fontSize: 40,
  },
  skipButton: {
    marginBottom: 120,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
  },
});
