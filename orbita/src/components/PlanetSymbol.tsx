import React from 'react';
import Svg, { Rect, Polygon, Circle, Path } from 'react-native-svg';

interface Props {
  symbol: 'square' | 'triangle' | 'diamond' | 'circle' | 'pentagon' | 'star';
  size: number;
  fill?: string;
}

export const PlanetSymbol: React.FC<Props> = ({ symbol, size, fill = 'white' }) => {
  const half = size / 2;

  switch (symbol) {
    case 'square':
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Rect
            x={size * 0.2}
            y={size * 0.2}
            width={size * 0.6}
            height={size * 0.6}
            fill={fill}
            rx={1}
          />
        </Svg>
      );
    case 'triangle':
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Polygon
            points={`${half},${size * 0.15} ${size * 0.85},${size * 0.85} ${size * 0.15},${size * 0.85}`}
            fill={fill}
          />
        </Svg>
      );
    case 'diamond':
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Polygon
            points={`${half},${size * 0.1} ${size * 0.9},${half} ${half},${size * 0.9} ${size * 0.1},${half}`}
            fill={fill}
          />
        </Svg>
      );
    case 'circle':
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={half} cy={half} r={size * 0.3} fill={fill} />
        </Svg>
      );
    case 'pentagon': {
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * (Math.PI / 180);
        pts.push(`${half + size * 0.35 * Math.cos(angle)},${half + size * 0.35 * Math.sin(angle)}`);
      }
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Polygon points={pts.join(' ')} fill={fill} />
        </Svg>
      );
    }
    case 'star': {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? size * 0.35 : size * 0.15;
        const angle = (i * 36 - 90) * (Math.PI / 180);
        pts.push(`${half + r * Math.cos(angle)},${half + r * Math.sin(angle)}`);
      }
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Polygon points={pts.join(' ')} fill={fill} />
        </Svg>
      );
    }
    default:
      return null;
  }
};
