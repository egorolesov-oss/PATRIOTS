import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { ORBIT_CONFIGS } from '../types/game';

const AnimatedLine = Animated.createAnimatedComponent(Line);

interface Props {
  spokeAngle: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export const ConjunctionBeam: React.FC<Props> = ({
  spokeAngle,
  centerX,
  centerY,
  width,
  height,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
  }, []);

  const rad = (spokeAngle * Math.PI) / 180;
  const outerRadius = ORBIT_CONFIGS[ORBIT_CONFIGS.length - 1].radius + 20;
  const endX = centerX + outerRadius * Math.cos(rad);
  const endY = centerY + outerRadius * Math.sin(rad);

  const animatedProps = useAnimatedProps(() => ({
    strokeOpacity: 1 - progress.value * 0.3,
    strokeWidth: 3 * (1 - progress.value * 0.5) + 1,
  }));

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <AnimatedLine
        x1={centerX}
        y1={centerY}
        x2={endX}
        y2={endY}
        stroke="#ffd700"
        animatedProps={animatedProps}
      />
    </Svg>
  );
};
