import React from 'react';
import Svg, { Line, Circle } from 'react-native-svg';
import { SwipeRayState, PLANET_CONFIGS, ORBIT_CONFIGS } from '../types/game';

interface Props {
  swipeRay: SwipeRayState;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export const SwipeRayBeam: React.FC<Props> = ({
  swipeRay,
  centerX,
  centerY,
  width,
  height,
}) => {
  if (!swipeRay.active) return null;

  const rad = (swipeRay.angle * Math.PI) / 180;
  const outerRadius = ORBIT_CONFIGS[ORBIT_CONFIGS.length - 1].radius + 40;
  const endX = centerX + outerRadius * Math.cos(rad);
  const endY = centerY + outerRadius * Math.sin(rad);

  const hasMatch = swipeRay.matchType !== null;
  const color = hasMatch
    ? PLANET_CONFIGS[swipeRay.matchType!].color
    : 'rgba(255,255,255,0.3)';

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {/* Main beam */}
      <Line
        x1={centerX}
        y1={centerY}
        x2={endX}
        y2={endY}
        stroke={color}
        strokeWidth={hasMatch ? 4 : 2}
        strokeOpacity={hasMatch ? 0.9 : 0.4}
        strokeLinecap="round"
      />
      {/* Glow beam */}
      {hasMatch && (
        <Line
          x1={centerX}
          y1={centerY}
          x2={endX}
          y2={endY}
          stroke={color}
          strokeWidth={12}
          strokeOpacity={0.15}
          strokeLinecap="round"
        />
      )}
      {/* Hit indicators on matched planets */}
      {swipeRay.hitPlanets
        .filter((p) => swipeRay.matchType && p.type === swipeRay.matchType)
        .map((p) => {
          const config = ORBIT_CONFIGS[p.orbitIndex];
          // We'd need rotation angles here, but approximate with swipe angle
          const px = centerX + config.radius * Math.cos(rad);
          const py = centerY + config.radius * Math.sin(rad);
          return (
            <Circle
              key={p.id}
              cx={px}
              cy={py}
              r={28}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeOpacity={0.8}
            />
          );
        })}
    </Svg>
  );
};
