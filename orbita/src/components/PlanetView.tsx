import React, { useEffect } from 'react';
import { StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Planet, PLANET_CONFIGS, PLANET_SIZE, ORBIT_CONFIGS } from '../types/game';
import { getSlotPosition } from '../engine/board';

const PLANET_SPRITES: Record<string, any> = {
  planet_red: require('../../assets/planet_red.png'),
  planet_green: require('../../assets/planet_green.png'),
  planet_blue: require('../../assets/planet_blue.png'),
  planet_gold: require('../../assets/planet_gold.png'),
  planet_pink: require('../../assets/planet_pink.png'),
  planet_purple: require('../../assets/planet_purple.png'),
};

interface Props {
  planet: Planet;
  centerX: number;
  centerY: number;
  rotationAngle: number;
  isSelected: boolean;
  isRemoving: boolean;
  isNew: boolean;
  isMatchable: boolean;
  isCollected: boolean;
  onTap: (planet: Planet) => void;
  swapTarget?: { x: number; y: number } | null;
  onSwapComplete?: () => void;
}

export const PlanetView: React.FC<Props> = ({
  planet,
  centerX,
  centerY,
  rotationAngle,
  isSelected,
  isRemoving,
  isNew,
  isMatchable,
  isCollected,
  onTap,
  swapTarget,
  onSwapComplete,
}) => {
  const config = PLANET_CONFIGS[planet.type];
  const pos = getSlotPosition(planet.orbitIndex, planet.slotIndex, centerX, centerY, rotationAngle);

  const translateX = useSharedValue(pos.x - PLANET_SIZE / 2);
  const translateY = useSharedValue(pos.y - PLANET_SIZE / 2);
  const scaleVal = useSharedValue(isNew ? 0 : 1);
  const opacityVal = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (!swapTarget) {
      translateX.value = pos.x - PLANET_SIZE / 2;
      translateY.value = pos.y - PLANET_SIZE / 2;
    }
  }, [pos.x, pos.y, swapTarget]);

  // Selected
  useEffect(() => {
    if (isSelected) {
      scaleVal.value = withSpring(1.15, { damping: 12 });
      glowOpacity.value = withTiming(0.8, { duration: 200 });
    } else if (!isRemoving && !isNew && !isCollected) {
      scaleVal.value = withSpring(1, { damping: 12 });
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isSelected]);

  // Matchable — subtle pulse
  useEffect(() => {
    if (isMatchable && !isSelected && !isCollected && !isRemoving) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 600 }),
          withTiming(0.1, { duration: 600 })
        ),
        -1,
        true
      );
    } else if (!isSelected && !isCollected && !isRemoving) {
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isMatchable, isSelected, isCollected, isRemoving]);

  // Collected by swipe — bright highlight
  useEffect(() => {
    if (isCollected) {
      scaleVal.value = withSpring(1.25, { damping: 10 });
      glowOpacity.value = withTiming(1, { duration: 100 });
    }
  }, [isCollected]);

  // Removal
  useEffect(() => {
    if (isRemoving) {
      scaleVal.value = withTiming(1.5, { duration: 300, easing: Easing.out(Easing.ease) });
      opacityVal.value = withTiming(0, { duration: 400 });
    }
  }, [isRemoving]);

  // New planet spawn
  useEffect(() => {
    if (isNew) {
      opacityVal.value = 0;
      scaleVal.value = 0;
      opacityVal.value = withDelay(400, withTiming(1, { duration: 300 }));
      scaleVal.value = withDelay(400, withSpring(1, { damping: 10, stiffness: 120 }));
    }
  }, [isNew]);

  // Swap animation
  useEffect(() => {
    if (swapTarget && onSwapComplete) {
      const orbitRadius = ORBIT_CONFIGS[planet.orbitIndex].radius;
      const startAngle = Math.atan2(pos.y - centerY, pos.x - centerX);
      const endAngle = Math.atan2(swapTarget.y - centerY, swapTarget.x - centerX);
      const midAngle = (startAngle + endAngle) / 2;
      const midX = centerX + orbitRadius * Math.cos(midAngle) - PLANET_SIZE / 2;
      const midY = centerY + orbitRadius * Math.sin(midAngle) - PLANET_SIZE / 2;

      translateX.value = withSequence(
        withTiming(midX, { duration: 150, easing: Easing.in(Easing.ease) }),
        withTiming(swapTarget.x - PLANET_SIZE / 2, { duration: 150, easing: Easing.out(Easing.ease) })
      );
      translateY.value = withSequence(
        withTiming(midY, { duration: 150, easing: Easing.in(Easing.ease) }),
        withTiming(swapTarget.y - PLANET_SIZE / 2, { duration: 150, easing: Easing.out(Easing.ease) }, () => {
          runOnJS(onSwapComplete)();
        })
      );
    }
  }, [swapTarget]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scaleVal.value },
    ],
    opacity: opacityVal.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const sprite = PLANET_SPRITES[config.sprite];

  return (
    <Animated.View style={[styles.planetContainer, animatedStyle]}>
      <Animated.View
        style={[
          styles.glow,
          { backgroundColor: config.color, shadowColor: config.color },
          glowStyle,
        ]}
      />
      <Image source={sprite} style={styles.planetImage} resizeMode="cover" />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  planetContainer: {
    position: 'absolute',
    width: PLANET_SIZE,
    height: PLANET_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planetImage: {
    width: PLANET_SIZE,
    height: PLANET_SIZE,
    borderRadius: PLANET_SIZE / 2,
  },
  glow: {
    position: 'absolute',
    width: PLANET_SIZE + 16,
    height: PLANET_SIZE + 16,
    borderRadius: (PLANET_SIZE + 16) / 2,
    opacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
});
