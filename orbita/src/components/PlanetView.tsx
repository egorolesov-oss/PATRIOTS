import React, { useEffect } from 'react';
import { StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Planet, PLANET_CONFIGS, PLANET_SIZE, ORBIT_CONFIGS } from '../types/game';
import { getSlotPosition, normalizeAngle } from '../engine/board';

// Planet sprite map
const PLANET_SPRITES: Record<string, any> = {
  planet_red: require('../../assets/planet_red.png'),
  planet_green: require('../../assets/planet_green.png'),
  planet_blue: require('../../assets/planet_blue.png'),
  planet_gold: require('../../assets/planet_gold.png'),
  planet_pink: require('../../assets/planet_pink.png'),
  planet_purple: require('../../assets/planet_purple.png'),
  planet_teal: require('../../assets/planet_teal.png'),
  planet_volcanic: require('../../assets/planet_volcanic.png'),
};

interface Props {
  planet: Planet;
  centerX: number;
  centerY: number;
  rotationAngle: number;
  isSelected: boolean;
  isRemoving: boolean;
  isNew: boolean;
  isRayHit: boolean;
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
  isRayHit,
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

  // Update position when rotation changes
  useEffect(() => {
    if (!swapTarget) {
      translateX.value = pos.x - PLANET_SIZE / 2;
      translateY.value = pos.y - PLANET_SIZE / 2;
    }
  }, [pos.x, pos.y, swapTarget]);

  // Selection highlight
  useEffect(() => {
    if (isSelected) {
      scaleVal.value = withSpring(1.15, { damping: 12 });
      glowOpacity.value = withTiming(0.8, { duration: 200 });
    } else if (!isRemoving && !isNew) {
      scaleVal.value = withSpring(1, { damping: 12 });
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isSelected]);

  // Ray hit highlight
  useEffect(() => {
    if (isRayHit) {
      scaleVal.value = withSpring(1.3, { damping: 10 });
      glowOpacity.value = withTiming(1, { duration: 100 });
    } else if (!isSelected && !isRemoving) {
      scaleVal.value = withSpring(1, { damping: 12 });
      glowOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isRayHit]);

  // Removal animation
  useEffect(() => {
    if (isRemoving) {
      scaleVal.value = withTiming(1.5, { duration: 300, easing: Easing.out(Easing.ease) });
      opacityVal.value = withTiming(0, { duration: 400 });
    }
  }, [isRemoving]);

  // New planet spawn
  useEffect(() => {
    if (isNew) {
      scaleVal.value = withDelay(400, withSpring(1, { damping: 10, stiffness: 120 }));
      opacityVal.value = withDelay(400, withTiming(1, { duration: 300 }));
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
        withTiming(swapTarget.x - PLANET_SIZE / 2, {
          duration: 150,
          easing: Easing.out(Easing.ease),
        })
      );
      translateY.value = withSequence(
        withTiming(midY, { duration: 150, easing: Easing.in(Easing.ease) }),
        withTiming(swapTarget.y - PLANET_SIZE / 2, {
          duration: 150,
          easing: Easing.out(Easing.ease),
        }, () => {
          runOnJS(onSwapComplete)();
        })
      );
    }
  }, [swapTarget]);

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(onTap)(planet);
  });

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
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={[styles.planetContainer, animatedStyle]}>
        <Animated.View
          style={[
            styles.glow,
            { backgroundColor: config.color, shadowColor: config.color },
            glowStyle,
          ]}
        />
        <Image
          source={sprite}
          style={styles.planetImage}
          resizeMode="cover"
        />
      </Animated.View>
    </GestureDetector>
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
