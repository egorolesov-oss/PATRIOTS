import React, { useMemo, useEffect } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STAR_COUNT = 60;

const STAR_COLORS = [
  '#ffffff',  // white
  '#cce5ff',  // cool blue
  '#ffe4cc',  // warm peach
  '#d4ccff',  // soft purple
  '#ccffee',  // mint
  '#fff5cc',  // warm yellow
  '#ffccdd',  // soft pink
];

interface StarData {
  x: number;
  y: number;
  size: number;
  color: string;
  twinkle: boolean;
  delay: number;
  speed: number; // twinkle speed
}

const TwinkleStar: React.FC<{ star: StarData }> = ({ star }) => {
  const opacity = useSharedValue(star.twinkle ? 0.2 : 0.5);

  useEffect(() => {
    if (star.twinkle) {
      opacity.value = withDelay(
        star.delay,
        withRepeat(
          withSequence(
            withTiming(0.9, { duration: star.speed }),
            withTiming(0.1, { duration: star.speed * 1.2 })
          ),
          -1,
          true
        )
      );
    }
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: star.x,
    top: star.y,
    width: star.size,
    height: star.size,
    borderRadius: star.size / 2,
    backgroundColor: star.color,
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
};

export const StarField: React.FC = () => {
  // Stars spread over a larger area (diagonal) so they look good when bg rotates
  const fieldSize = Math.hypot(SCREEN_W, SCREEN_H);
  const offsetX = (fieldSize - SCREEN_W) / 2;
  const offsetY = (fieldSize - SCREEN_H) / 2;

  const stars = useMemo<StarData[]>(() => {
    return Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * fieldSize - offsetX,
      y: Math.random() * fieldSize - offsetY,
      size: Math.random() * 3 + 1,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      twinkle: Math.random() > 0.25,
      delay: Math.random() * 4000,
      speed: 800 + Math.random() * 2000,
    }));
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {stars.map((star, i) => (
        <TwinkleStar key={i} star={star} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});
