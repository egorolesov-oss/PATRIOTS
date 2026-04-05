import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { STAR_SIZE, getStarPhase } from '../types/game';

interface Props {
  centerX: number;
  centerY: number;
  timeRatio: number; // 1 = full, 0 = dead
}

export const StarCore: React.FC<Props> = ({ centerX, centerY, timeRatio }) => {
  const scale = useSharedValue(1);
  const phase = getStarPhase(timeRatio);

  // Star shrinks as it dies: 1.3x at full → 0.6x at death
  const baseScale = 0.6 + timeRatio * 0.7;

  useEffect(() => {
    // Pulse faster as star dies
    const pulseAmount = timeRatio > 0.4 ? 0.05 : timeRatio > 0.2 ? 0.08 : 0.12;
    const duration = timeRatio > 0.4 ? 1000 : timeRatio > 0.2 ? 400 : 200;
    scale.value = withRepeat(
      withTiming(baseScale + pulseAmount, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [timeRatio > 0.8, timeRatio > 0.6, timeRatio > 0.4, timeRatio > 0.2, timeRatio > 0.1]);

  // Update base scale smoothly
  useEffect(() => {
    scale.value = withTiming(baseScale, { duration: 500 });
  }, [Math.round(baseScale * 20)]); // update every 5% change

  const displaySize = STAR_SIZE * 1.4; // larger canvas for glow

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: centerX - displaySize / 2 },
      { translateY: centerY - displaySize / 2 },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle, { width: displaySize, height: displaySize }]}>
      <Svg width={displaySize} height={displaySize}>
        <Defs>
          <RadialGradient id="starGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={phase.color} stopOpacity="1" />
            <Stop offset="30%" stopColor={phase.color} stopOpacity="0.9" />
            <Stop offset="50%" stopColor={phase.glowColor} stopOpacity="0.7" />
            <Stop offset="75%" stopColor={phase.glowColor} stopOpacity="0.2" />
            <Stop offset="100%" stopColor={phase.glowColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={displaySize / 2} cy={displaySize / 2} r={displaySize / 2} fill="url(#starGrad)" />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
});
