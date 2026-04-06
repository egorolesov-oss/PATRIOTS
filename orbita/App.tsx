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
import { GravityBoard } from './src/components/GravityBoard';
import { Tutorial } from './src/components/Tutorial';
import { useGameState } from './src/hooks/useGameState';
import { LEVELS } from './src/types/levels';
import { ARCHITECT_LEVELS } from './src/types/architect';
import { getSlotPosition } from './src/engine/board';
import { stopMusic, startMusic } from './src/engine/sounds';
import { PLANET_CONFIGS } from './src/types/game';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function GameScreen() {
  const insets = useSafeAreaInsets();
  const game = useGameState();
  const { state, startGame, startLevel, usePowerUp, currentLevel, levelStars, maxUnlockedLevel, alignedTriples, rotationAngles } = game;

  const [showTitle, setShowTitle] = useState(true);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [gameMode, setGameMode] = useState<'supernova' | 'architect' | 'gravity'>('supernova');
  const [showLevelIntro, setShowLevelIntro] = useState(false);
  const [pendingLevelId, setPendingLevelId] = useState(1);
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [tutorialPaused, setTutorialPaused] = useState(false);

  // Very slow background rotation
  const bgRotation = useSharedValue(0);
  useEffect(() => {
    bgRotation.value = withRepeat(
      withTiming(360, { duration: 480000, easing: Easing.linear }), // 8 minutes per rotation
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
      setShowModeSelect(true);
    }
  }, [showTitle]);

  const [showGravity, setShowGravity] = useState(false);

  const handleSelectMode = useCallback((mode: 'supernova' | 'architect' | 'gravity') => {
    setGameMode(mode);
    setShowModeSelect(false);
    if (mode === 'gravity') {
      setShowGravity(true);
      startMusic();
    } else {
      setShowLevelSelect(true);
    }
  }, []);

  const handleSelectLevel = useCallback((levelId: number) => {
    setShowLevelSelect(false);
    setPendingLevelId(levelId);
    setShowLevelIntro(true);
  }, [gameMode]);

  const handleStartFromIntro = useCallback(() => {
    setShowLevelIntro(false);
    if (gameMode === 'architect') {
      const archLevel = ARCHITECT_LEVELS.find((l) => l.id === pendingLevelId);
      if (archLevel) {
        // Convert architect level to LevelConfig with long timer
        startLevel(pendingLevelId, {
          id: archLevel.id,
          name: archLevel.name,
          time: 9999,
          rescueTarget: 999,
          swaps: archLevel.swaps,
          planetTypes: archLevel.planetTypes,
          slots: archLevel.slots,
          speedMultiplier: archLevel.speedMultiplier,
          alignmentTolerance: 25,
          powerUps: [],
        }, archLevel.targets);
      }
    } else {
      startLevel(pendingLevelId);
    }
  }, [startLevel, pendingLevelId, gameMode]);

  const progressWidth = (state.timeLeft / state.totalTime) * 100;
  const timeRatio = state.timeLeft / state.totalTime;

  // Compute aligned planet positions for tutorial
  const boardCenterX = boardSize / 2;
  const boardCenterY = boardSize / 2;
  // Approximate board Y offset (top bar ~80px + centering)
  const boardTopOffset = insets.top + 80;

  const tutorialPlanets = (() => {
    if (!alignedTriples || alignedTriples.length === 0) return [];
    const triple = alignedTriples[0];
    return triple.planets.map((p) => {
      const pos = getSlotPosition(p.orbitIndex, p.slotIndex, boardCenterX, boardCenterY, rotationAngles[p.orbitIndex]);
      return { x: pos.x, y: pos.y, color: PLANET_CONFIGS[triple.type]?.color || '#fff' };
    });
  })();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bgWrapper} pointerEvents="none">
        {!showTitle && (
          <Animated.View style={bgAnimStyle}>
            <Image
              source={require('./src/../assets/space-bg.png')}
              style={styles.bgImage}
              resizeMode="cover"
            />
            <StarField />
          </Animated.View>
        )}
      </View>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e27" />

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

      {/* Mode Select Screen */}
      {showModeSelect && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.modeSelectContainer}>
          <Text style={styles.modeSelectTitle}>CHOOSE MODE</Text>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => handleSelectMode('supernova')}
            activeOpacity={0.8}
          >
            <Text style={styles.modeCardIcon}>💥</Text>
            <View style={styles.modeCardContent}>
              <Text style={styles.modeCardTitle}>SUPERNOVA</Text>
              <Text style={styles.modeCardDesc}>Rescue planets before the star explodes!</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => handleSelectMode('architect')}
            activeOpacity={0.8}
          >
            <Text style={styles.modeCardIcon}>✨</Text>
            <View style={styles.modeCardContent}>
              <Text style={styles.modeCardTitle}>ARCHITECT</Text>
              <Text style={styles.modeCardDesc}>Build the target constellation pattern</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => handleSelectMode('gravity')}
            activeOpacity={0.8}
          >
            <Text style={styles.modeCardIcon}>🌌</Text>
            <View style={styles.modeCardContent}>
              <Text style={styles.modeCardTitle}>ORBIT BUILDER</Text>
              <Text style={styles.modeCardDesc}>Launch planets into orbit with real gravity!</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Gravity Mode */}
      {showGravity && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.gameContainer}>
          <View style={styles.levelBarRow}>
            <Text style={styles.levelBar}>Orbit Builder</Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                stopMusic();
                setShowGravity(false);
                setShowModeSelect(true);
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.menuButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.boardWrapper}>
            <GravityBoard
              boardSize={boardSize}
              targetPlanets={5}
              onWin={(count) => {
                setTimeout(() => {
                  stopMusic();
                  setShowGravity(false);
                  setShowModeSelect(true);
                }, 3000);
              }}
              onLose={(reason) => {
                setTimeout(() => {
                  stopMusic();
                  setShowGravity(false);
                  setShowModeSelect(true);
                }, 2000);
              }}
            />
          </View>
        </Animated.View>
      )}

      {/* Level Select Screen */}
      {showLevelSelect && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.levelSelectContainer}>
          <TouchableOpacity onPress={() => { setShowLevelSelect(false); setShowModeSelect(true); }}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.levelSelectTitle}>
            {gameMode === 'supernova' ? '💥 SUPERNOVA' : '✨ ARCHITECT'}
          </Text>
          <View style={styles.levelGrid}>
            {(gameMode === 'supernova' ? LEVELS : ARCHITECT_LEVELS).map((level) => {
              const unlocked = gameMode === 'architect' || level.id <= maxUnlockedLevel;
              const stars = gameMode === 'supernova' ? (levelStars[level.id - 1] || 0) : 0;
              return (
                <TouchableOpacity
                  key={level.id}
                  style={[styles.levelButton, !unlocked && styles.levelLocked]}
                  onPress={() => unlocked && handleSelectLevel(level.id)}
                  disabled={!unlocked}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.levelNumber, !unlocked && { color: 'rgba(255,255,255,0.2)' }]}>
                    {level.id}
                  </Text>
                  <Text style={styles.levelName} numberOfLines={1}>
                    {unlocked ? level.name : '???'}
                  </Text>
                  {stars > 0 && (
                    <Text style={styles.levelStars}>
                      {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* Level Intro — tap to start */}
      {showLevelIntro && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleStartFromIntro}
          style={styles.levelIntroContainer}
        >
          <Animated.Text
            entering={FadeIn.delay(200).duration(500)}
            style={styles.levelIntroNumber}
          >
            LEVEL {pendingLevelId}
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.delay(600).duration(500)}
            style={styles.levelIntroName}
          >
            {gameMode === 'supernova'
              ? (LEVELS.find((l) => l.id === pendingLevelId)?.name || '')
              : (ARCHITECT_LEVELS.find((l) => l.id === pendingLevelId)?.name || '')}
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.delay(1000).duration(500)}
            style={styles.levelIntroTarget}
          >
            {gameMode === 'supernova'
              ? `Rescue ${LEVELS.find((l) => l.id === pendingLevelId)?.rescueTarget || 0} planets`
              : `Build the pattern (${ARCHITECT_LEVELS.find((l) => l.id === pendingLevelId)?.swaps || 0} swaps)`}
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.delay(1400).duration(500)}
            style={styles.tapToStartText}
          >
            Tap to start
          </Animated.Text>
        </TouchableOpacity>
      )}

      {/* Game UI */}
      {(state.phase === 'playing' || state.phase === 'won' || state.phase === 'exploding') && !showTitle && !showLevelSelect && (
        <Animated.View entering={FadeIn.delay(200).duration(500)} style={styles.gameContainer}>
          {/* Top: Rescued + Timer + Swaps */}
          {/* Level name + menu button */}
          <View style={styles.levelBarRow}>
            <Text style={styles.levelBar}>Level {currentLevel.id}: {currentLevel.name}</Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                stopMusic();
                setShowModeSelect(true);
                setShowLevelSelect(false);
                setShowLevelIntro(false);
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.menuButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
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
                {gameMode === 'architect' ? '∞' : `${Math.ceil(state.timeLeft)}s`}
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
            <GameBoard game={game} boardSize={boardSize} tutorialPaused={tutorialPaused} />
          </View>

          {/* Red vignette when time is running out */}
          {state.phase === 'playing' && timeRatio < 0.25 && (
            <View style={[styles.urgencyOverlay, { opacity: (1 - timeRatio * 4) * 0.3 }]} pointerEvents="none" />
          )}

          {/* Bottom: Power-ups + Progress with gradient fade */}
          <View style={styles.bottomGradient} pointerEvents="none">
            {[0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 1].map((opacity, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: `rgba(6, 8, 24, ${opacity})`,
                }}
              />
            ))}
          </View>
          <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 50 }]}>
            <PowerUpPanel
              powerUps={state.powerUps}
              onUsePowerUp={usePowerUp}
              suppressTooltips={currentLevel.id === 0 && showTutorial}
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

      {/* Tutorial overlay on Level 0 */}
      {state.phase === 'playing' && currentLevel.id === 0 && !tutorialCompleted && showTutorial && (
        <Tutorial
          onComplete={() => {
            setShowTutorial(false);
            setTutorialCompleted(true);
            setTutorialPaused(false);
          }}
          setPaused={setTutorialPaused}
          rescued={state.rescued}
          swapsUsed={state.swapsLeft < currentLevel.swaps}
          freezeUsed={state.powerUps.some((p) => p.type === 'STAR_FREEZE' && p.used)}
          magnetUsed={state.powerUps.some((p) => p.type === 'NOVA_PULSE' && p.used)}
          antigravUsed={state.powerUps.some((p) => p.type === 'ANTIGRAVITY' && p.used)}
          alignedPlanets={tutorialPlanets}
          boardOffsetY={boardTopOffset}
        />
      )}

      {/* Supernova Explosion Animation */}
      {state.phase === 'exploding' && (
        <SupernovaExplosion
          centerX={SCREEN_W / 2}
          centerY={SCREEN_H * 0.4}
        />
      )}

      {/* Won Screen */}
      {state.phase === 'won' && !showLevelIntro && !showLevelSelect && (
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.gameOverContainer}
        >
          <View style={styles.gameOverCard}>
            <Text style={styles.wonTitle}>
              {gameMode === 'architect' ? 'PATTERN COMPLETE!' : 'SYSTEM SAVED!'}
            </Text>
            {gameMode === 'supernova' ? (
              <>
                <Text style={styles.finalScore}>{state.rescued}</Text>
                <Text style={styles.finalScoreLabel}>PLANETS RESCUED</Text>
              </>
            ) : (
              <Text style={styles.finalScoreLabel}>Constellation built perfectly!</Text>
            )}
            {/* Animated star rating */}
            <View style={styles.starRatingRow}>
              {[1, 2, 3].map((starNum) => {
                const earned = (levelStars[currentLevel.id - 1] || 0) >= starNum;
                return (
                  <Animated.Text
                    key={starNum}
                    entering={FadeIn.delay(starNum * 400).duration(400)}
                    style={[styles.starRatingIcon, !earned && styles.starRatingEmpty]}
                  >
                    {earned ? '★' : '☆'}
                  </Animated.Text>
                );
              })}
            </View>
            <Text style={styles.levelNameResult}>Level {currentLevel.id}: {currentLevel.name}</Text>
            {currentLevel.id < LEVELS.length ? (
              <TouchableOpacity
                style={styles.playAgainButton}
                onPress={() => handleSelectLevel(currentLevel.id + 1)}
                activeOpacity={0.8}
              >
                <Text style={styles.playAgainText}>NEXT SYSTEM</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.newBest}>All systems saved!</Text>
            )}
            <TouchableOpacity
              style={[styles.playAgainButton, { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.3)' }]}
              onPress={() => setShowLevelSelect(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.playAgainText, { color: 'rgba(255,255,255,0.6)' }]}>LEVEL SELECT</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Game Over Screen — Supernova */}
      {state.phase === 'gameover' && !showLevelIntro && !showLevelSelect && (
        <Animated.View
          entering={FadeIn.duration(500)}
          style={[styles.gameOverContainer, { backgroundColor: 'rgba(80, 10, 0, 0.85)' }]}
        >
          <View style={styles.gameOverCard}>
            <Text style={styles.gameOverTitle}>
              {gameMode === 'architect' ? 'OUT OF SWAPS' : 'SUPERNOVA'}
            </Text>
            {gameMode === 'supernova' ? (
              <>
                <Text style={styles.finalScore}>{state.rescued}/{state.rescueTarget}</Text>
                <Text style={styles.finalScoreLabel}>PLANETS RESCUED</Text>
                {state.rescued > 0 && (
                  <Text style={styles.bestScore}>So close! {state.rescueTarget - state.rescued} more needed</Text>
                )}
              </>
            ) : (
              <Text style={styles.finalScoreLabel}>Pattern incomplete — try again!</Text>
            )}
            <Text style={styles.levelNameResult}>Level {currentLevel.id}: {currentLevel.name}</Text>
            <TouchableOpacity
              style={styles.playAgainButton}
              onPress={() => startLevel(currentLevel.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.playAgainText}>TRY AGAIN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.playAgainButton, { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.3)' }]}
              onPress={() => setShowLevelSelect(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.playAgainText, { color: 'rgba(255,255,255,0.6)' }]}>LEVEL SELECT</Text>
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
  levelBarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  levelBar: {
    flex: 1,
    color: 'rgba(245, 230, 200, 0.4)',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
  },
  menuButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '700',
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
  bottomGradient: {
    height: 40,
    flexDirection: 'column',
  },
  bottomPanel: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#060818',
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
  levelIntroContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 95,
    backgroundColor: 'rgba(6, 8, 24, 0.9)',
  },
  levelIntroNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(245, 230, 200, 0.5)',
    letterSpacing: 6,
  },
  levelIntroName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffd700',
    letterSpacing: 3,
    marginTop: 8,
    textShadowColor: '#ff8800',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  levelIntroTarget: {
    fontSize: 16,
    color: 'rgba(245, 230, 200, 0.6)',
    marginTop: 16,
    letterSpacing: 2,
  },
  tapToStartText: {
    fontSize: 14,
    color: 'rgba(245, 230, 200, 0.35)',
    marginTop: 32,
    letterSpacing: 3,
  },
  starRatingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 4,
    gap: 8,
  },
  starRatingIcon: {
    fontSize: 40,
    color: '#ffd700',
    textShadowColor: '#ff8800',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  starRatingEmpty: {
    color: 'rgba(255, 255, 255, 0.2)',
    textShadowRadius: 0,
  },
  urgencyOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 8,
    borderColor: '#ff0000',
    borderRadius: 0,
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
  },
  modeSelectContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 90,
    backgroundColor: 'rgba(6, 8, 24, 0.95)',
    paddingHorizontal: 24,
  },
  modeSelectTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffd700',
    letterSpacing: 6,
    marginBottom: 32,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 20,
    marginBottom: 16,
  },
  modeCardIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  modeCardContent: {
    flex: 1,
  },
  modeCardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#f5e6c8',
    letterSpacing: 2,
  },
  modeCardDesc: {
    fontSize: 12,
    color: 'rgba(245, 230, 200, 0.5)',
    marginTop: 4,
  },
  levelSelectContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 90,
    backgroundColor: 'rgba(6, 8, 24, 0.95)',
    paddingHorizontal: 20,
  },
  backText: {
    color: 'rgba(245, 230, 200, 0.5)',
    fontSize: 14,
    alignSelf: 'flex-start',
    marginBottom: 12,
    letterSpacing: 1,
  },
  levelSelectTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffd700',
    letterSpacing: 6,
    marginBottom: 24,
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  levelButton: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  levelLocked: {
    opacity: 0.3,
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f5e6c8',
  },
  levelName: {
    fontSize: 8,
    color: 'rgba(245,230,200,0.5)',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  levelStars: {
    fontSize: 12,
    color: '#ffd700',
    marginTop: 2,
  },
  levelNameResult: {
    fontSize: 14,
    color: 'rgba(245,230,200,0.5)',
    letterSpacing: 2,
    marginTop: 8,
    marginBottom: 16,
  },
});
