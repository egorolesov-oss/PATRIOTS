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
import { STAR_SIZE } from '../types/game';

interface Props {
  centerX: number;
  centerY: number;
}

export const StarCore: React.FC<Props> = ({ centerX, centerY }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: centerX - STAR_SIZE / 2 },
      { translateY: centerY - STAR_SIZE / 2 },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Svg width={STAR_SIZE} height={STAR_SIZE}>
        <Defs>
          <RadialGradient id="starGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="40%" stopColor="#ffd700" stopOpacity="0.9" />
            <Stop offset="70%" stopColor="#ffaa00" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#ff8800" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={STAR_SIZE / 2} cy={STAR_SIZE / 2} r={STAR_SIZE / 2} fill="url(#starGrad)" />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: STAR_SIZE,
    height: STAR_SIZE,
  },
});
