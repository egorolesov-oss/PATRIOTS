import React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import { ORBIT_CONFIGS } from '../types/game';

interface Props {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  activeSpokeAngle?: number | null;
}

export const OrbitalRings: React.FC<Props> = ({
  centerX,
  centerY,
  width,
  height,
  activeSpokeAngle,
}) => {
  // Generate spoke angles: union of all slot angles at base (no rotation)
  // We draw spokes for every unique angle across all orbits
  const spokeAngles = new Set<number>();
  for (const config of ORBIT_CONFIGS) {
    for (let i = 0; i < config.slotCount; i++) {
      spokeAngles.add((i * 360) / config.slotCount);
    }
  }

  const outerRadius = ORBIT_CONFIGS[ORBIT_CONFIGS.length - 1].radius + 30;

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {/* Spokes */}
      {Array.from(spokeAngles).map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const isActive =
          activeSpokeAngle != null &&
          Math.abs(angle - activeSpokeAngle) < 6;
        return (
          <Line
            key={`spoke-${angle}`}
            x1={centerX}
            y1={centerY}
            x2={centerX + outerRadius * Math.cos(rad)}
            y2={centerY + outerRadius * Math.sin(rad)}
            stroke={isActive ? '#ffd700' : 'rgba(255, 215, 0, 0.1)'}
            strokeWidth={isActive ? 2 : 0.5}
          />
        );
      })}

      {/* Orbital rings */}
      {ORBIT_CONFIGS.map((config, i) => (
        <Circle
          key={`orbit-${i}`}
          cx={centerX}
          cy={centerY}
          r={config.radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={1}
        />
      ))}
    </Svg>
  );
};
