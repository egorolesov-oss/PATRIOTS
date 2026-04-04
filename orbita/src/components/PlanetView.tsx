import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Planet, PLANET_CONFIGS, PLANET_SIZE, ORBIT_CONFIGS } from '../types/game';
import { getSlotPosition, normalizeAngle } from '../engine/board';
import { PlanetSymbol } from './PlanetSymbol';

interface Props {
  planet: Planet;
  centerX: number;
  centerY: number;
  rotationAngle: number;
  isSelected: boolean;
  isMatching: boolean;
  isRemoving: boolean;
  isNew: boolean;
  onTap: (planet: Planet) => void;
  onDragStart: (planet: Planet) => void;
  onDragUpdate: (planet: Planet, angle: number) => void;
  onDragEnd: (planet: Planet) => void;
  swapTarget?: { x: number; y: number } | null;
  onSwapComplete?: () => void;
}

export const PlanetView: React.FC<Props> = ({
  planet,
  centerX,
  centerY,
  rotationAngle,
  isSelected,
  isMatching,
  isRemoving,
  isNew,
  onTap,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  swapTarget,
  onSwapComplete,
}) => {
  const config = PLANET_CONFIGS[planet.type];
  const pos = getSlotPosition(planet.orbitIndex, planet.slotIndex, centerX, centerY, rotationAngle);

  const translateX = useSharedValue(pos.x - PLANET_SIZE / 2);
  const translateY = useSharedValue(pos.y - PLANET_SIZE / 2);
  const scaleVal = useSharedValue(isNew ? 0 : 1);
  const opacityVal = useSharedValue(isRemoving ? 1 : 1);
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

  // Matching animation
  useEffect(() => {
    if (isMatching) {
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0.3, { duration: 200 }),
        withTiming(1, { duration: 200 }),
        withTiming(0.3, { duration: 200 })
      );
      scaleVal.value = withSequence(
        withTiming(1.2, { duration: 200 }),
        withTiming(1, { duration: 200 }),
        withTiming(1.2, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );
    }
  }, [isMatching]);

  // Removal animation
  useEffect(() => {
    if (isRemoving) {
      scaleVal.value = withDelay(
        400,
        withTiming(1.5, { duration: 200, easing: Easing.out(Easing.ease) })
      );
      opacityVal.value = withDelay(
        400,
        withTiming(0, { duration: 300 })
      );
    }
  }, [isRemoving]);

  // New planet spawn
  useEffect(() => {
    if (isNew) {
      scaleVal.value = withDelay(
        600,
        withSpring(1, { damping: 10, stiffness: 120 })
      );
    }
  }, [isNew]);

  // Swap animation - animate along arc
  useEffect(() => {
    if (swapTarget && onSwapComplete) {
      // For POC, animate along a slight arc using intermediate points
      const orbitRadius = ORBIT_CONFIGS[planet.orbitIndex].radius;
      const startAngle = Math.atan2(
        pos.y - centerY,
        pos.x - centerX
      );
      const endX = swapTarget.x;
      const endY = swapTarget.y;
      const endAngle = Math.atan2(
        endY - centerY,
        endX - centerX
      );

      // Compute midpoint along the arc
      const midAngle = (startAngle + endAngle) / 2;
      // If the arc is very small, just adjust slightly outward
      const midX = centerX + orbitRadius * Math.cos(midAngle) - PLANET_SIZE / 2;
      const midY = centerY + orbitRadius * Math.sin(midAngle) - PLANET_SIZE / 2;

      const halfDuration = 150;
      translateX.value = withSequence(
        withTiming(midX, { duration: halfDuration, easing: Easing.in(Easing.ease) }),
        withTiming(endX - PLANET_SIZE / 2, {
          duration: halfDuration,
          easing: Easing.out(Easing.ease),
        })
      );
      translateY.value = withSequence(
        withTiming(midY, { duration: halfDuration, easing: Easing.in(Easing.ease) }),
        withTiming(endY - PLANET_SIZE / 2, {
          duration: halfDuration,
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

  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(onDragStart)(planet);
    })
    .onUpdate((event) => {
      // Calculate angle from center based on gesture position
      const touchX = pos.x + event.translationX;
      const touchY = pos.y + event.translationY;
      const angle =
        (Math.atan2(touchY - centerY, touchX - centerX) * 180) / Math.PI;
      runOnJS(onDragUpdate)(planet, normalizeAngle(angle));

      // Constrain to orbit
      const orbitRadius = ORBIT_CONFIGS[planet.orbitIndex].radius;
      const rad = Math.atan2(touchY - centerY, touchX - centerX);
      translateX.value = centerX + orbitRadius * Math.cos(rad) - PLANET_SIZE / 2;
      translateY.value = centerY + orbitRadius * Math.sin(rad) - PLANET_SIZE / 2;
    })
    .onEnd(() => {
      runOnJS(onDragEnd)(planet);
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

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

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[styles.planetContainer, animatedStyle]}
        entering={isNew ? FadeIn.delay(600).duration(400) : undefined}
      >
        <Animated.View
          style={[
            styles.glow,
            { backgroundColor: config.color, shadowColor: config.color },
            glowStyle,
          ]}
        />
        <Animated.View
          style={[styles.planet, { backgroundColor: config.color }]}
        >
          <PlanetSymbol symbol={config.symbol} size={20} fill="white" />
        </Animated.View>
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
  planet: {
    width: PLANET_SIZE,
    height: PLANET_SIZE,
    borderRadius: PLANET_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
