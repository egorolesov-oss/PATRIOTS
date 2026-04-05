import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { StarField } from './src/components/StarField';
import { GameBoard } from './src/components/GameBoard';
import { PowerUpPanel } from './src/components/PowerUpPanel';
import { SupernovaExplosion } from './src/components/SupernovaExplosion';
import { useGameState } from './src/hooks/useGameState';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function GameScreen() {
  const insets = useSafeAreaInsets();
  const game = useGameState();
  const { state, startGame, usePowerUp } = game;

  const [showTitle, setShowTitle] = useState(true);

  // Very slow background rotation
  const bgRotation = useSharedValue(0);
  useEffect(() => {
    bgRotation.value = withRepeat(
      withTiming(360, { duration: 240000, easing: Easing.linear }), // 4 minutes per rotation
      -1,
      false
    );
  }, []);
  const bgAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${bgRotation.value}deg` },
    ],
  }));

  // Board size: 70% of available height or width, whichever is smaller
  const availableHeight = SCREEN_H - insets.top - insets.bottom - 180;
  const boardSize = Math.min(SCREEN_W - 20, availableHeight * 0.7, 500);

  const handleTitleTap = useCallback(() => {
    if (showTitle) {
      setShowTitle(false);
      startGame();
    }
  }, [showTitle, startGame]);

  const progressWidth = (state.timeLeft / state.totalTime) * 100;
  const timeRatio = state.timeLeft / state.totalTime;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.bgWrapper} pointerEvents="none">
        <Animated.Image
          source={require('./src/../assets/space-bg.png')}
          style={[styles.bgImage, bgAnimStyle]}
          resizeMode="cover"
        />
      </View>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e27" />
      <StarField />

      {/* Title Screen */}
      {showTitle && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleTitleTap}
          style={styles.titleContainer}
        >
          <Animated.View
            entering={FadeIn.duration(800)}
            exiting={FadeOut.duration(500)}
            style={styles.titleInner}
          >
            <Text style={styles.titleText}>ORBITA</Text>
            <Text style={styles.subtitleText}>Rescue the planets</Text>
            <Text style={styles.tapText}>Tap to start</Text>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Game UI */}
      {(state.phase === 'playing' || state.phase === 'won' || state.phase === 'exploding') && !showTitle && (
        <Animated.View entering={FadeIn.delay(200).duration(500)} style={styles.gameContainer}>
          {/* Top: Rescued + Timer + Swaps */}
          <View style={styles.topBar}>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>RESCUED</Text>
              <Text style={styles.scoreValue}>{state.rescued}/{state.rescueTarget}</Text>
            </View>
            <View style={styles.comboContainer}>
              <Text style={[
                styles.timerValue,
                state.timeLeft <= 30 && styles.movesLow,
              ]}>
                {Math.ceil(state.timeLeft)}s
              </Text>
              {state.combo >= 2 && (
                <Text style={styles.comboLabel}>COMBO x{
                  state.combo >= 5 ? '3' :
                  state.combo >= 4 ? '2.5' :
                  state.combo >= 3 ? '2' : '1.5'
                }</Text>
              )}
            </View>
            <View style={styles.movesContainer}>
              <Text style={styles.movesLabel}>SWAPS</Text>
              <Text style={[styles.movesValue, state.swapsLeft <= 2 && styles.movesLow]}>
                {state.swapsLeft}
              </Text>
            </View>
          </View>

          {/* Center: Game Board */}
          <View style={styles.boardWrapper}>
            <GameBoard game={game} boardSize={boardSize} />
          </View>

          {/* Bottom: Power-ups + Progress */}
          <View style={styles.bottomPanel}>
            {/* Gradient fade effect using layered Views */}
            <View style={styles.gradientTop} pointerEvents="none" />
            <View style={styles.gradientMid} pointerEvents="none" />
            <PowerUpPanel
              powerUps={state.powerUps}
              onUsePowerUp={usePowerUp}
            />
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.max(0, Math.min(100, progressWidth))}%`,
                    backgroundColor: timeRatio > 0.5 ? '#ffd700' : timeRatio > 0.25 ? '#ff6600' : '#cc2200',
                  },
                ]}
              />
            </View>
          </View>
        </Animated.View>
      )}

      {/* Supernova Explosion Animation */}
      {state.phase === 'exploding' && (
        <SupernovaExplosion
          centerX={SCREEN_W / 2}
          centerY={SCREEN_H * 0.4}
        />
      )}

      {/* Won Screen */}
      {state.phase === 'won' && (
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.gameOverContainer}
        >
          <View style={styles.gameOverCard}>
            <Text style={styles.wonTitle}>SYSTEM SAVED!</Text>
            <Text style={styles.finalScore}>{state.rescued}</Text>
            <Text style={styles.finalScoreLabel}>PLANETS RESCUED</Text>
            <Text style={styles.newBest}>Star stabilized!</Text>
            <TouchableOpacity
              style={styles.playAgainButton}
              onPress={() => { setShowTitle(false); startGame(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.playAgainText}>NEXT SYSTEM</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Game Over Screen — Supernova */}
      {state.phase === 'gameover' && (
        <Animated.View
          entering={FadeIn.duration(500)}
          style={[styles.gameOverContainer, { backgroundColor: 'rgba(80, 10, 0, 0.85)' }]}
        >
          <View style={styles.gameOverCard}>
            <Text style={styles.gameOverTitle}>SUPERNOVA</Text>
            <Text style={styles.finalScore}>{state.rescued}/{state.rescueTarget}</Text>
            <Text style={styles.finalScoreLabel}>PLANETS RESCUED</Text>
            {state.rescued > 0 && (
              <Text style={styles.bestScore}>So close! {state.rescueTarget - state.rescued} more needed</Text>
            )}
            <TouchableOpacity
              style={styles.playAgainButton}
              onPress={() => {
                setShowTitle(false);
                startGame();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.playAgainText}>PLAY AGAIN</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <GameScreen />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  bgWrapper: {
    position: 'absolute',
    width: SCREEN_W,
    height: SCREEN_H,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgImage: {
    width: Math.hypot(SCREEN_W, SCREEN_H),
    height: Math.hypot(SCREEN_W, SCREEN_H),
  },
  titleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  titleInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapText: {
    fontSize: 14,
    color: 'rgba(245, 230, 200, 0.4)',
    letterSpacing: 3,
    marginTop: 24,
  },
  titleText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#ffd700',
    letterSpacing: 12,
    textShadowColor: '#ff8800',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitleText: {
    fontSize: 16,
    color: 'rgba(245, 230, 200, 0.6)',
    letterSpacing: 4,
    marginTop: 8,
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  scoreContainer: {
    alignItems: 'flex-start',
  },
  scoreLabel: {
    color: 'rgba(245, 230, 200, 0.5)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  scoreValue: {
    color: '#f5e6c8',
    fontSize: 32,
    fontWeight: '900',
  },
  comboContainer: {
    alignItems: 'center',
  },
  timerValue: {
    color: '#f5e6c8',
    fontSize: 28,
    fontWeight: '900',
  },
  comboValue: {
    color: '#ffd700',
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: '#ff8800',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  comboLabel: {
    color: 'rgba(255, 215, 0, 0.6)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  movesContainer: {
    alignItems: 'flex-end',
  },
  movesLabel: {
    color: 'rgba(245, 230, 200, 0.5)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  movesValue: {
    color: '#f5e6c8',
    fontSize: 32,
    fontWeight: '900',
  },
  movesLow: {
    color: '#e74c3c',
  },
  boardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomPanel: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#060818',
  },
  gradientTop: {
    position: 'absolute',
    top: -30,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(6, 8, 24, 0.0)',
    borderTopWidth: 0,
    // Fake gradient: shadow trick
    shadowColor: '#060818',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 20,
  },
  gradientMid: {
    position: 'absolute',
    top: -15,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: 'rgba(6, 8, 24, 0.6)',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffd700',
    borderRadius: 2,
  },
  gameOverContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 14, 39, 0.85)',
    zIndex: 100,
  },
  gameOverCard: {
    alignItems: 'center',
    padding: 40,
  },
  wonTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2ecc71',
    letterSpacing: 4,
    marginBottom: 20,
    textShadowColor: '#27ae60',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  gameOverTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#f5e6c8',
    letterSpacing: 6,
    marginBottom: 20,
  },
  finalScore: {
    fontSize: 56,
    fontWeight: '900',
    color: '#ffd700',
    textShadowColor: '#ff8800',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  finalScoreLabel: {
    fontSize: 12,
    color: 'rgba(245, 230, 200, 0.5)',
    letterSpacing: 3,
    marginTop: 4,
  },
  newBest: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2ecc71',
    marginTop: 12,
    letterSpacing: 2,
  },
  bestScore: {
    fontSize: 14,
    color: 'rgba(245, 230, 200, 0.4)',
    marginTop: 8,
  },
  playAgainButton: {
    marginTop: 32,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#ffd700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  playAgainText: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
  },
});
