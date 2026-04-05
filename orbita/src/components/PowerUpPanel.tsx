import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Polygon, Line, Circle, Path } from 'react-native-svg';
import { PowerUpType, PowerUpState } from '../types/game';

interface Props {
  powerUps: PowerUpState[];
  onUsePowerUp: (type: PowerUpType) => void;
}

const PowerUpIcon: React.FC<{ type: PowerUpType; size: number }> = ({ type, size }) => {
  const half = size / 2;
  switch (type) {
    case PowerUpType.STAR_FREEZE: {
      // Snowflake / freeze icon
      return (
        <Svg width={size} height={size}>
          {[0, 60, 120].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const len = half * 0.8;
            return (
              <React.Fragment key={angle}>
                <Line
                  x1={half - len * cos} y1={half - len * sin}
                  x2={half + len * cos} y2={half + len * sin}
                  stroke="#3498db" strokeWidth={2}
                />
                <Line
                  x1={half + len * 0.5 * cos} y1={half + len * 0.5 * sin}
                  x2={half + len * 0.5 * cos + 4 * Math.cos(rad + 0.8)}
                  y2={half + len * 0.5 * sin + 4 * Math.sin(rad + 0.8)}
                  stroke="#3498db" strokeWidth={1.5}
                />
              </React.Fragment>
            );
          })}
          <Circle cx={half} cy={half} r={2} fill="#3498db" />
        </Svg>
      );
    }
    case PowerUpType.NOVA_PULSE: {
      // Magnet U-shape
      return (
        <Svg width={size} height={size}>
          <Path
            d={`M ${half - 7} ${size * 0.2}
                L ${half - 7} ${size * 0.55}
                Q ${half - 7} ${size * 0.8} ${half} ${size * 0.8}
                Q ${half + 7} ${size * 0.8} ${half + 7} ${size * 0.55}
                L ${half + 7} ${size * 0.2}`}
            stroke="#f1c40f"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
          <Line x1={half - 9} y1={size * 0.2} x2={half - 5} y2={size * 0.2} stroke="#e74c3c" strokeWidth={3} />
          <Line x1={half + 5} y1={size * 0.2} x2={half + 9} y2={size * 0.2} stroke="#3498db" strokeWidth={3} />
        </Svg>
      );
    }
    case PowerUpType.ANTIGRAVITY: {
      // Shake / swirl arrows
      return (
        <Svg width={size} height={size}>
          <Path
            d={`M ${half - 6} ${half - 8}
                Q ${half + 8} ${half - 12} ${half + 6} ${half - 2}
                L ${half + 9} ${half - 5} L ${half + 3} ${half - 6} L ${half + 6} ${half - 2}`}
            stroke="#2ecc71"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={`M ${half + 6} ${half + 8}
                Q ${half - 8} ${half + 12} ${half - 6} ${half + 2}
                L ${half - 9} ${half + 5} L ${half - 3} ${half + 6} L ${half - 6} ${half + 2}`}
            stroke="#2ecc71"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      );
    }
  }
};

const PowerUpButton: React.FC<{
  powerUp: PowerUpState;
  onPress: () => void;
}> = ({ powerUp, onPress }) => {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (!powerUp.used && !powerUp.active) {
      pulseScale.value = withRepeat(
        withTiming(1.05, { duration: 1000 }),
        -1,
        true
      );
    }
  }, [powerUp.used, powerUp.active]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const label = {
    [PowerUpType.STAR_FREEZE]: 'FREEZE',
    [PowerUpType.NOVA_PULSE]: 'MAGNET',
    [PowerUpType.ANTIGRAVITY]: 'ANTI-G',
  }[powerUp.type];

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={[
          styles.button,
          powerUp.used && styles.buttonUsed,
          powerUp.active && styles.buttonActive,
        ]}
        onPress={onPress}
        disabled={powerUp.used}
        activeOpacity={0.7}
      >
        <PowerUpIcon type={powerUp.type} size={28} />
        <Text style={[styles.label, powerUp.used && styles.labelUsed]}>
          {powerUp.used
            ? powerUp.active
              ? `${powerUp.remainingTime}s`
              : 'USED'
            : label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const PowerUpPanel: React.FC<Props> = ({ powerUps, onUsePowerUp }) => {
  return (
    <View style={styles.container}>
      {powerUps.map((pu) => (
        <PowerUpButton
          key={pu.type}
          powerUp={pu}
          onPress={() => onUsePowerUp(pu.type)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 8,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  buttonUsed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.08)',
    opacity: 0.5,
  },
  buttonActive: {
    borderColor: '#3498db',
    borderWidth: 2,
    opacity: 1,
  },
  label: {
    color: '#f5e6c8',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  labelUsed: {
    color: 'rgba(255,255,255,0.3)',
  },
});
