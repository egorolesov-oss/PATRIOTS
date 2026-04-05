import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  centerX: number;
  centerY: number;
}

export const SupernovaExplosion: React.FC<Props> = ({ centerX, centerY }) => {
  // Core flash
  const coreScale = useSharedValue(1);
  const coreOpacity = useSharedValue(1);
  // Shockwave ring
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  // Second ring
  const ring2Scale = useSharedValue(0);
  const ring2Opacity = useSharedValue(0);
  // Screen flash
  const flashOpacity = useSharedValue(0);
  // Text
  const textOpacity = useSharedValue(0);
  const textScale = useSharedValue(0.5);

  useEffect(() => {
    // Phase 1: Bright core flash (0-0.5s)
    coreScale.value = withSequence(
      withTiming(3, { duration: 300, easing: Easing.out(Easing.ease) }),
      withTiming(8, { duration: 500, easing: Easing.out(Easing.ease) }),
      withTiming(15, { duration: 1500, easing: Easing.out(Easing.ease) })
    );
    coreOpacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(500, withTiming(0, { duration: 1500 }))
    );

    // Phase 2: First shockwave ring (0.2s)
    ringScale.value = withDelay(200,
      withTiming(12, { duration: 1500, easing: Easing.out(Easing.ease) })
    );
    ringOpacity.value = withSequence(
      withDelay(200, withTiming(0.8, { duration: 200 })),
      withDelay(800, withTiming(0, { duration: 500 }))
    );

    // Phase 3: Second shockwave (0.6s)
    ring2Scale.value = withDelay(600,
      withTiming(15, { duration: 2000, easing: Easing.out(Easing.ease) })
    );
    ring2Opacity.value = withSequence(
      withDelay(600, withTiming(0.6, { duration: 200 })),
      withDelay(1000, withTiming(0, { duration: 800 }))
    );

    // Screen flash
    flashOpacity.value = withSequence(
      withTiming(0.9, { duration: 150 }),
      withTiming(0, { duration: 800 })
    );

    // Text appears after explosion
    textOpacity.value = withDelay(1500, withTiming(1, { duration: 800 }));
    textScale.value = withDelay(1500, withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }));
  }, []);

  const coreStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: centerX - 25,
    top: centerY - 25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    transform: [{ scale: coreScale.value }],
    opacity: coreOpacity.value,
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: centerX - 30,
    top: centerY - 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#ffd700',
    backgroundColor: 'transparent',
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: centerX - 30,
    top: centerY - 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#ff6600',
    backgroundColor: 'transparent',
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    opacity: flashOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: centerY - 50,
    alignItems: 'center' as const,
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));

  return (
    <>
      {/* Screen flash */}
      <Animated.View style={flashStyle} pointerEvents="none" />
      {/* Shockwave rings */}
      <Animated.View style={ringStyle} pointerEvents="none" />
      <Animated.View style={ring2Style} pointerEvents="none" />
      {/* Core explosion */}
      <Animated.View style={coreStyle} pointerEvents="none" />
      {/* Text */}
      <Animated.View style={textStyle} pointerEvents="none">
        <Animated.Text style={styles.title}>STAR EXPLODED</Animated.Text>
        <Animated.Text style={styles.subtitle}>
          The system is lost...
        </Animated.Text>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ff4400',
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: '#ff0000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 150, 100, 0.7)',
    letterSpacing: 2,
    marginTop: 8,
    textAlign: 'center',
  },
});
