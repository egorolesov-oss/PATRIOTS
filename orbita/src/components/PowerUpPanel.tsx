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
  selectedPlanetId: string | null;
  onUsePowerUp: (type: PowerUpType) => void;
}

const PowerUpIcon: React.FC<{ type: PowerUpType; size: number }> = ({ type, size }) => {
  const half = size / 2;
  switch (type) {
    case PowerUpType.NOVA_BURST: {
      // Starburst
      const pts = [];
      for (let i = 0; i < 12; i++) {
        const r = i % 2 === 0 ? half * 0.9 : half * 0.4;
        const angle = (i * 30 - 90) * (Math.PI / 180);
        pts.push(`${half + r * Math.cos(angle)},${half + r * Math.sin(angle)}`);
      }
      return (
        <Svg width={size} height={size}>
          <Polygon points={pts.join(' ')} fill="#e67e22" />
        </Svg>
      );
    }
    case PowerUpType.CRYO_FREEZE: {
      // Snowflake
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
                  x1={half - len * cos}
                  y1={half - len * sin}
                  x2={half + len * cos}
                  y2={half + len * sin}
                  stroke="#3498db"
                  strokeWidth={2}
                />
                {/* Small branches */}
                <Line
                  x1={half + len * 0.5 * cos}
                  y1={half + len * 0.5 * sin}
                  x2={half + len * 0.5 * cos + 4 * Math.cos(rad + 0.8)}
                  y2={half + len * 0.5 * sin + 4 * Math.sin(rad + 0.8)}
                  stroke="#3498db"
                  strokeWidth={1.5}
                />
                <Line
                  x1={half + len * 0.5 * cos}
                  y1={half + len * 0.5 * sin}
                  x2={half + len * 0.5 * cos + 4 * Math.cos(rad - 0.8)}
                  y2={half + len * 0.5 * sin + 4 * Math.sin(rad - 0.8)}
                  stroke="#3498db"
                  strokeWidth={1.5}
                />
              </React.Fragment>
            );
          })}
          <Circle cx={half} cy={half} r={2} fill="#3498db" />
        </Svg>
      );
    }
    case PowerUpType.GRAVITY_WELL: {
      // Spiral
      return (
        <Svg width={size} height={size}>
          <Path
            d={`M ${half} ${half}
                Q ${half + 8} ${half - 8} ${half} ${half - 10}
                Q ${half - 12} ${half - 12} ${half - 10} ${half}
                Q ${half - 8} ${half + 14} ${half + 4} ${half + 12}
                Q ${half + 16} ${half + 8} ${half + 14} ${half - 4}`}
            stroke="#9b59b6"
            strokeWidth={2}
            fill="none"
          />
          <Circle cx={half} cy={half} r={2} fill="#9b59b6" />
        </Svg>
      );
    }
  }
};

const PowerUpButton: React.FC<{
  powerUp: PowerUpState;
  selectedPlanetId: string | null;
  onPress: () => void;
}> = ({ powerUp, selectedPlanetId, onPress }) => {
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

  const disabled =
    powerUp.used ||
    (powerUp.type === PowerUpType.GRAVITY_WELL && !selectedPlanetId);

  const label = {
    [PowerUpType.NOVA_BURST]: 'NOVA',
    [PowerUpType.CRYO_FREEZE]: 'CRYO',
    [PowerUpType.GRAVITY_WELL]: 'GRAV',
  }[powerUp.type];

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={[
          styles.button,
          powerUp.used && styles.buttonUsed,
          powerUp.active && styles.buttonActive,
          disabled && styles.buttonDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <PowerUpIcon type={powerUp.type} size={28} />
        <Text style={[styles.label, powerUp.used && styles.labelUsed]}>
          {powerUp.used ? 'USED' : powerUp.active ? `${powerUp.remainingTime}s` : label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const PowerUpPanel: React.FC<Props> = ({ powerUps, selectedPlanetId, onUsePowerUp }) => {
  return (
    <View style={styles.container}>
      {powerUps.map((pu) => (
        <PowerUpButton
          key={pu.type}
          powerUp={pu}
          selectedPlanetId={selectedPlanetId}
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
  },
  buttonActive: {
    borderColor: '#3498db',
    borderWidth: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  label: {
    color: '#f5e6c8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  labelUsed: {
    color: 'rgba(255,255,255,0.3)',
  },
});
