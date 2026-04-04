import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideOutUp } from 'react-native-reanimated';

interface Props {
  level: number;
  centerX: number;
  centerY: number;
}

export const CascadePopup: React.FC<Props> = ({ level, centerX, centerY }) => {
  if (level < 2) return null;

  return (
    <Animated.Text
      entering={FadeIn.duration(300)}
      exiting={SlideOutUp.duration(500).springify()}
      style={[
        styles.text,
        {
          left: centerX - 80,
          top: centerY - 40,
        },
      ]}
    >
      CASCADE x{level}!
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    width: 160,
    textAlign: 'center',
    color: '#ffd700',
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: '#ff8800',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
