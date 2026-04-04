import React, { useMemo, useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STAR_COUNT = 50;

interface StarData {
  x: number;
  y: number;
  size: number;
  twinkle: boolean;
  delay: number;
}

const TwinkleStar: React.FC<{ star: StarData }> = ({ star }) => {
  const opacity = useSharedValue(star.twinkle ? 0.3 : 0.5);

  useEffect(() => {
    if (star.twinkle) {
      opacity.value = withDelay(
        star.delay,
        withRepeat(
          withSequence(
            withTiming(0.9, { duration: 1500 }),
            withTiming(0.2, { duration: 1500 })
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
    backgroundColor: '#ffffff',
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
};

export const StarField: React.FC = () => {
  const stars = useMemo<StarData[]>(() => {
    return Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * SCREEN_W,
      y: Math.random() * SCREEN_H,
      size: Math.random() * 2 + 0.5,
      twinkle: Math.random() > 0.5,
      delay: Math.random() * 3000,
    }));
  }, []);

  return (
    <>
      {stars.map((star, i) => (
        <TwinkleStar key={i} star={star} />
      ))}
    </>
  );
};

const styles = StyleSheet.create({});
