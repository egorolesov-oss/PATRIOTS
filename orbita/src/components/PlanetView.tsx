import React, { useEffect, useRef } from 'react';
import { StyleSheet, Image, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { Planet, PLANET_CONFIGS, PLANET_SIZE } from '../types/game';
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
}) => {
  const config = PLANET_CONFIGS[planet.type];
  const pSize = config.size;
  const pos = getSlotPosition(planet.orbitIndex, planet.slotIndex, centerX, centerY, rotationAngle);

  const translateX = useSharedValue(pos.x - pSize / 2);
  const translateY = useSharedValue(pos.y - pSize / 2);
  const scaleVal = useSharedValue(isNew ? 0 : 1);
  const opacityVal = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  // Each planet spins at its own speed based on id
  const spinRotation = useSharedValue(0);

  useEffect(() => {
    // Unique spin speed per planet: 8-15 seconds per rotation
    const idNum = parseInt(planet.id.replace('p', ''), 10) || 1;
    const duration = 8000 + (idNum % 7) * 1000;
    const direction = idNum % 2 === 0 ? 360 : -360;
    spinRotation.value = withRepeat(
      withTiming(direction, { duration, easing: Easing.linear }),
      -1,
      false
    );
  }, [planet.id]);

  // Track previous orbit+slot to detect swaps
  const prevOrbitRef = useRef(planet.orbitIndex);
  const prevSlotRef = useRef(planet.slotIndex);

  useEffect(() => {
    const wasSwapped =
      prevOrbitRef.current !== planet.orbitIndex ||
      prevSlotRef.current !== planet.slotIndex;

    prevOrbitRef.current = planet.orbitIndex;
    prevSlotRef.current = planet.slotIndex;

    const targetX = pos.x - pSize / 2;
    const targetY = pos.y - pSize / 2;

    if (wasSwapped) {
      // Smooth swap animation: glow up → fly → bounce land → glow down
      // Glow bright during flight
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(1, { duration: 400 }),
        withTiming(0, { duration: 200 })
      );
      // Scale: shrink slightly → grow during flight → bounce land
      scaleVal.value = withSequence(
        withTiming(0.7, { duration: 100, easing: Easing.in(Easing.ease) }),
        withTiming(1.2, { duration: 300, easing: Easing.out(Easing.ease) }),
        withSpring(1, { damping: 8, stiffness: 150 })
      );
      // Fly to new position with smooth easing
      translateX.value = withTiming(targetX, {
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      translateY.value = withTiming(targetY, {
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    } else {
      // Normal rotation update — instant
      translateX.value = targetX;
      translateY.value = targetY;
    }
  }, [pos.x, pos.y, planet.orbitIndex, planet.slotIndex]);

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

  // Reset glow when not selected/collected
  useEffect(() => {
    if (!isSelected && !isCollected && !isRemoving) {
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isSelected, isCollected, isRemoving]);

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

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinRotation.value}deg` }],
  }));

  const sprite = PLANET_SPRITES[config.sprite];

  // Calculate lighting direction: gradient points FROM star center TO planet
  // So the sun-facing side (toward center) is bright, far side is dark
  const angleToCenter = Math.atan2(centerY - pos.y, centerX - pos.x);
  // SVG gradient coordinates: (x1,y1) = lit side (toward star), (x2,y2) = dark side
  const gradX1 = 50 + Math.cos(angleToCenter) * 50;
  const gradY1 = 50 + Math.sin(angleToCenter) * 50;
  const gradX2 = 50 - Math.cos(angleToCenter) * 50;
  const gradY2 = 50 - Math.sin(angleToCenter) * 50;

  return (
    <Animated.View style={[styles.planetContainer, animatedStyle, { width: pSize, height: pSize }]}>
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: config.color,
            shadowColor: config.color,
            width: pSize + 16,
            height: pSize + 16,
            borderRadius: (pSize + 16) / 2,
          },
          glowStyle,
        ]}
      />
      <Animated.View style={spinStyle}>
        <Image source={sprite} style={{ width: pSize, height: pSize, borderRadius: pSize / 2 }} resizeMode="cover" />
      </Animated.View>
      <View style={[styles.lightingOverlay, { width: pSize, height: pSize }]} pointerEvents="none">
        <Svg width={pSize} height={pSize}>
          <Defs>
            <LinearGradient
              id={`light-${planet.id}`}
              x1={`${gradX1}%`} y1={`${gradY1}%`}
              x2={`${gradX2}%`} y2={`${gradY2}%`}
            >
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
              <Stop offset="40%" stopColor="#000000" stopOpacity="0" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
            </LinearGradient>
          </Defs>
          <Circle cx={pSize / 2} cy={pSize / 2} r={pSize / 2 - 1} fill={`url(#light-${planet.id})`} />
        </Svg>
      </View>
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
  lightingOverlay: {
    position: 'absolute',
    width: PLANET_SIZE,
    height: PLANET_SIZE,
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
