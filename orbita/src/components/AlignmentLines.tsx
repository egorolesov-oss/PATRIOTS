import React from 'react';
import Svg, { Line } from 'react-native-svg';
import {
  AlignmentIndicator,
  ALIGNMENT_CLOSE,
  ALIGNMENT_PERFECT,
  ORBIT_CONFIGS,
  PLANET_CONFIGS,
} from '../types/game';
import { getPlanetAngle, normalizeAngle } from '../engine/board';

interface Props {
  alignments: AlignmentIndicator[];
  rotationAngles: number[];
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export const AlignmentLines: React.FC<Props> = ({
  alignments,
  rotationAngles,
  centerX,
  centerY,
  width,
  height,
}) => {
  if (alignments.length === 0) return null;

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {alignments.map((alignment, idx) => {
        const isPerfect = alignment.angleDiff <= ALIGNMENT_PERFECT;
        const isClose = alignment.angleDiff <= ALIGNMENT_CLOSE;

        const color = isPerfect
          ? '#ffd700'
          : isClose
          ? '#ffffff'
          : '#ffcc00';
        const opacity = isPerfect ? 0.9 : isClose ? 0.6 : 0.25;
        const strokeWidth = isPerfect ? 2.5 : isClose ? 1.5 : 0.8;
        const dashArray = isClose ? undefined : '4,4';

        // Draw lines between aligned planets
        return alignment.planets.map((planet, pi) => {
          if (pi === 0) return null;
          const prevPlanet = alignment.planets[pi - 1];
          const angle1 = getPlanetAngle(prevPlanet, rotationAngles);
          const angle2 = getPlanetAngle(planet, rotationAngles);

          const r1 = ORBIT_CONFIGS[prevPlanet.orbitIndex].radius;
          const r2 = ORBIT_CONFIGS[planet.orbitIndex].radius;
          const rad1 = (angle1 * Math.PI) / 180;
          const rad2 = (angle2 * Math.PI) / 180;

          return (
            <Line
              key={`${idx}-${pi}`}
              x1={centerX + r1 * Math.cos(rad1)}
              y1={centerY + r1 * Math.sin(rad1)}
              x2={centerX + r2 * Math.cos(rad2)}
              y2={centerY + r2 * Math.sin(rad2)}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
              strokeDasharray={dashArray}
            />
          );
        });
      })}
    </Svg>
  );
};
