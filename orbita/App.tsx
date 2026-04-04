import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { StarField } from './src/components/StarField';
import { GameBoard } from './src/components/GameBoard';
import { PowerUpPanel } from './src/components/PowerUpPanel';
import { useGameState } from './src/hooks/useGameState';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function GameScreen() {
  const insets = useSafeAreaInsets();
  const game = useGameState();
  const { state, startGame, usePowerUp } = game;

  const [showTitle, setShowTitle] = useState(true);

  // Board size: 70% of available height or width, whichever is smaller
  const availableHeight = SCREEN_H - insets.top - insets.bottom - 180;
  const boardSize = Math.min(SCREEN_W - 20, availableHeight * 0.7, 500);

  useEffect(() => {
    if (showTitle) {
      const timer = setTimeout(() => {
        setShowTitle(false);
        startGame();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showTitle]);

  const progressWidth = (state.movesLeft / 30) * 100;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e27" />
      <StarField />

      {/* Title Screen */}
      {showTitle && (
        <Animated.View
          entering={FadeIn.duration(800)}
          exiting={FadeOut.duration(500)}
          style={styles.titleContainer}
        >
          <Text style={styles.titleText}>ORBITA</Text>
          <Text style={styles.subtitleText}>Align the stars</Text>
        </Animated.View>
      )}

      {/* Game UI */}
      {state.phase === 'playing' && !showTitle && (
        <Animated.View entering={FadeIn.delay(200).duration(500)} style={styles.gameContainer}>
          {/* Top: Score + Moves */}
          <View style={styles.topBar}>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={styles.scoreValue}>{state.score.toLocaleString()}</Text>
            </View>
            <View style={styles.movesContainer}>
              <Text style={styles.movesLabel}>MOVES</Text>
              <Text style={[styles.movesValue, state.movesLeft <= 5 && styles.movesLow]}>
                {state.movesLeft}
              </Text>
            </View>
          </View>

          {/* Center: Game Board */}
          <View style={styles.boardWrapper}>
            <GameBoard game={game} boardSize={boardSize} />
          </View>

          {/* Bottom: Power-ups + Progress */}
          <View style={styles.bottomPanel}>
            <PowerUpPanel
              powerUps={state.powerUps}
              selectedPlanetId={state.selectedPlanetId}
              onUsePowerUp={usePowerUp}
            />
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${Math.max(0, Math.min(100, progressWidth))}%` },
                ]}
              />
            </View>
          </View>
        </Animated.View>
      )}

      {/* Game Over Screen */}
      {state.phase === 'gameover' && (
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.gameOverContainer}
        >
          <View style={styles.gameOverCard}>
            <Text style={styles.gameOverTitle}>GAME OVER</Text>
            <Text style={styles.finalScore}>{state.score.toLocaleString()}</Text>
            <Text style={styles.finalScoreLabel}>FINAL SCORE</Text>
            {state.score >= state.bestScore && state.score > 0 && (
              <Text style={styles.newBest}>NEW BEST!</Text>
            )}
            {state.bestScore > 0 && state.score < state.bestScore && (
              <Text style={styles.bestScore}>Best: {state.bestScore.toLocaleString()}</Text>
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
  titleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
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
    paddingBottom: 8,
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
