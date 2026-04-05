import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { STAR_SIZE, getStarPhase } from '../types/game';

interface Props {
  centerX: number;
  centerY: number;
  timeRatio: number;
}

export const StarCore: React.FC<Props> = ({ centerX, centerY, timeRatio }) => {
  const scale = useSharedValue(1.3);
  const glowScale = useSharedValue(1.0);
  const phase = getStarPhase(timeRatio);

  // Main breathing pulse — slower and more organic at start, faster when dying
  useEffect(() => {
    const pulseSize = timeRatio > 0.5 ? 0.12 : timeRatio > 0.2 ? 0.08 : 0.15;
    const dur1 = timeRatio > 0.5 ? 1800 : timeRatio > 0.2 ? 800 : 300;
    const dur2 = timeRatio > 0.5 ? 2200 : timeRatio > 0.2 ? 1000 : 400;

    scale.value = withRepeat(
      withSequence(
        withTiming(phase.scale + pulseSize, { duration: dur1, easing: Easing.inOut(Easing.ease) }),
        withTiming(phase.scale - pulseSize * 0.5, { duration: dur2, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
  }, [Math.round(timeRatio * 10)]); // update every 10%

  // Secondary glow pulse — offset timing for organic feel
  useEffect(() => {
    const glowAmount = timeRatio > 0.5 ? 0.15 : 0.08;
    const dur = timeRatio > 0.5 ? 3000 : 1500;

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1 + glowAmount, { duration: dur, easing: Easing.inOut(Easing.ease) }),
        withTiming(1 - glowAmount * 0.3, { duration: dur * 0.8, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
  }, [Math.round(timeRatio * 5)]);

  const displaySize = STAR_SIZE * 2; // bigger canvas for glow

  const coreStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: centerX - displaySize / 2 },
      { translateY: centerY - displaySize / 2 },
      { scale: scale.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: centerX - displaySize * 0.75,
    top: centerY - displaySize * 0.75,
    width: displaySize * 1.5,
    height: displaySize * 1.5,
    borderRadius: displaySize * 0.75,
    backgroundColor: phase.glowColor,
    opacity: 0.15,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <>
      {/* Core star */}
      <Animated.View style={[styles.container, coreStyle, { width: displaySize, height: displaySize }]} pointerEvents="none">
        <Svg width={displaySize} height={displaySize}>
          <Defs>
            <RadialGradient id="starGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="15%" stopColor={phase.color} stopOpacity="1" />
              <Stop offset="35%" stopColor={phase.color} stopOpacity="0.8" />
              <Stop offset="55%" stopColor={phase.glowColor} stopOpacity="0.4" />
              <Stop offset="75%" stopColor={phase.glowColor} stopOpacity="0.1" />
              <Stop offset="100%" stopColor={phase.glowColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={displaySize / 2} cy={displaySize / 2} r={displaySize / 2} fill="url(#starGrad)" />
        </Svg>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
});
