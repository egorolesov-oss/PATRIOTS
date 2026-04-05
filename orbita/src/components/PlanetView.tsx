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
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
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
  isFloating: boolean;
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
  isFloating,
  onTap,
}) => {
  const config = PLANET_CONFIGS[planet.type];
  // Random size per planet based on ID (36-48px range)
  const idNum = parseInt(planet.id.replace('p', ''), 10) || 1;
  const pSize = 32 + ((idNum * 7 + 3) % 11); // deterministic pseudo-random 32-42
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

  // Track previous position to detect and animate swaps
  const prevOrbitRef = useRef(planet.orbitIndex);
  const prevSlotRef = useRef(planet.slotIndex);
  const prevPosRef = useRef({ x: pos.x, y: pos.y });

  useEffect(() => {
    const wasSwapped =
      prevOrbitRef.current !== planet.orbitIndex ||
      prevSlotRef.current !== planet.slotIndex;

    const oldPos = prevPosRef.current;
    prevOrbitRef.current = planet.orbitIndex;
    prevSlotRef.current = planet.slotIndex;
    prevPosRef.current = { x: pos.x, y: pos.y };

    const targetX = pos.x - pSize / 2;
    const targetY = pos.y - pSize / 2;

    if (wasSwapped) {
      // Start from OLD position (where planet was before swap)
      const startX = oldPos.x - pSize / 2;
      const startY = oldPos.y - pSize / 2;
      translateX.value = startX;
      translateY.value = startY;

      // Glow bright during flight
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 200 })
      );
      // Scale: shrink → fly big → bounce land
      scaleVal.value = withSequence(
        withTiming(0.6, { duration: 100, easing: Easing.in(Easing.ease) }),
        withTiming(1.3, { duration: 350, easing: Easing.out(Easing.ease) }),
        withSpring(1, { damping: 8, stiffness: 150 })
      );
      // Fly from old position to new — smooth arc
      translateX.value = withTiming(targetX, {
        duration: 600,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      translateY.value = withTiming(targetY, {
        duration: 600,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    } else {
      // Normal rotation update — instant
      translateX.value = targetX;
      translateY.value = targetY;
    }
  }, [pos.x, pos.y, planet.orbitIndex, planet.slotIndex]);

  // Antigravity floating — planets drift outward randomly
  useEffect(() => {
    if (isFloating) {
      const idNum = parseInt(planet.id.replace('p', ''), 10) || 1;
      // Random drift direction unique to each planet
      const driftAngle = ((idNum * 137.5) % 360) * (Math.PI / 180);
      const driftDist = 25 + (idNum % 5) * 8;
      const driftX = Math.cos(driftAngle) * driftDist;
      const driftY = Math.sin(driftAngle) * driftDist;

      translateX.value = withTiming(translateX.value + driftX, {
        duration: 800, easing: Easing.out(Easing.ease),
      });
      translateY.value = withTiming(translateY.value + driftY, {
        duration: 800, easing: Easing.out(Easing.ease),
      });
      scaleVal.value = withTiming(0.7, { duration: 600 });
      opacityVal.value = withTiming(0.5, { duration: 600 });
    } else {
      // Reassemble — snap back to current orbit position
      const targetX = pos.x - pSize / 2;
      const targetY = pos.y - pSize / 2;
      translateX.value = withTiming(targetX, {
        duration: 600, easing: Easing.inOut(Easing.ease),
      });
      translateY.value = withTiming(targetY, {
        duration: 600, easing: Easing.inOut(Easing.ease),
      });
      scaleVal.value = withSpring(1, { damping: 8 });
      opacityVal.value = withTiming(1, { duration: 400 });
    }
  }, [isFloating]);

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

  // Lighting: sun-facing side bright, far side dark
  const angleToCenter = Math.atan2(centerY - pos.y, centerX - pos.x);
  const half = pSize / 2;
  // Highlight center shifted toward the star (30% offset)
  const highlightCx = 50 + Math.cos(angleToCenter) * 30;
  const highlightCy = 50 + Math.sin(angleToCenter) * 30;
  // Shadow center shifted away from star (25% offset)
  const shadowCx = 50 - Math.cos(angleToCenter) * 25;
  const shadowCy = 50 - Math.sin(angleToCenter) * 25;

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
      {/* Realistic spherical lighting */}
      <View style={[styles.lightingOverlay, { width: pSize, height: pSize }]} pointerEvents="none">
        <Svg width={pSize} height={pSize}>
          <Defs>
            {/* Specular highlight — shifted radial glow toward star */}
            <RadialGradient
              id={`highlight-${planet.id}`}
              cx={`${highlightCx}%`} cy={`${highlightCy}%`} r="45%"
            >
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
              <Stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
            {/* Shadow — shifted radial darkness away from star */}
            <RadialGradient
              id={`shadow-${planet.id}`}
              cx={`${shadowCx}%`} cy={`${shadowCy}%`} r="55%"
            >
              <Stop offset="0%" stopColor="#000000" stopOpacity="0.5" />
              <Stop offset="60%" stopColor="#000000" stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {/* Shadow layer first */}
          <Circle cx={half} cy={half} r={half - 1} fill={`url(#shadow-${planet.id})`} />
          {/* Highlight layer on top */}
          <Circle cx={half} cy={half} r={half - 1} fill={`url(#highlight-${planet.id})`} />
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
