// Simple synthesized sounds using Web Audio API
// No audio files needed — generates tones programmatically

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15,
  detune: number = 0
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  osc.detune.value = detune;

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playChord(frequencies: number[], duration: number, volume: number = 0.08) {
  for (const freq of frequencies) {
    playTone(freq, duration, 'sine', volume);
  }
}

export const Sounds = {
  /** Soft click when selecting a planet */
  select() {
    playTone(660, 0.12, 'sine', 0.1);
  },

  /** Deselect / cancel */
  deselect() {
    playTone(440, 0.08, 'sine', 0.06);
  },

  /** Whoosh when planets swap positions */
  swap() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  },

  /** Pleasant chime when 3 planets are collected */
  match() {
    playChord([523, 659, 784], 0.5, 0.1); // C5, E5, G5 major chord
    setTimeout(() => playTone(1047, 0.4, 'sine', 0.06), 150); // C6 sparkle
  },

  /** Higher pitched match for combos */
  comboMatch(combo: number) {
    const baseFreq = 523 + combo * 50;
    playChord([baseFreq, baseFreq * 1.26, baseFreq * 1.5], 0.6, 0.1);
    setTimeout(() => playTone(baseFreq * 2, 0.5, 'sine', 0.07), 150);
  },

  /** Soft pop when new planets appear */
  spawn() {
    playTone(880, 0.08, 'sine', 0.04);
    setTimeout(() => playTone(1100, 0.06, 'sine', 0.03), 50);
  },

  /** Gravity lines appearing — subtle hum */
  gravity() {
    playTone(220, 0.3, 'sine', 0.03);
    playTone(330, 0.3, 'sine', 0.02);
  },

  /** Power-up activation */
  powerUp() {
    playTone(440, 0.15, 'triangle', 0.1);
    setTimeout(() => playTone(660, 0.15, 'triangle', 0.1), 100);
    setTimeout(() => playTone(880, 0.3, 'triangle', 0.08), 200);
  },

  /** Shake / shuffle */
  shake() {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        playTone(200 + Math.random() * 400, 0.06, 'sine', 0.05);
      }, i * 40);
    }
  },

  /** Game over — descending notes */
  gameOver() {
    playTone(523, 0.3, 'sine', 0.1);
    setTimeout(() => playTone(440, 0.3, 'sine', 0.1), 300);
    setTimeout(() => playTone(349, 0.3, 'sine', 0.1), 600);
    setTimeout(() => playTone(262, 0.6, 'sine', 0.08), 900);
  },

  /** Game start — ascending arpeggio */
  gameStart() {
    playTone(262, 0.2, 'sine', 0.08);
    setTimeout(() => playTone(330, 0.2, 'sine', 0.08), 150);
    setTimeout(() => playTone(392, 0.2, 'sine', 0.08), 300);
    setTimeout(() => playTone(523, 0.4, 'sine', 0.1), 450);
  },
};

// --- BACKGROUND MUSIC (MP3 file) ---

import { Audio } from 'expo-av';

let musicSound: Audio.Sound | null = null;
let musicPlaying = false;

export async function startMusic() {
  if (musicPlaying) return;
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/**hull-silence**.mp3'),
      {
        isLooping: true,
        volume: 0.3,
        shouldPlay: true,
      }
    );
    musicSound = sound;
    musicPlaying = true;
  } catch (e) {
    // Silently fail if audio not available
  }
}

export async function stopMusic() {
  if (!musicPlaying || !musicSound) return;
  musicPlaying = false;
  try {
    await musicSound.stopAsync();
    await musicSound.unloadAsync();
    musicSound = null;
  } catch {}
}

export async function setMusicUrgency(timeRatio: number) {
  if (!musicSound || !musicPlaying) return;
  try {
    // Volume increases as star dies: 0.3 → 0.6
    const vol = 0.3 + (1 - timeRatio) * 0.3;
    await musicSound.setVolumeAsync(vol);
    // Speed up slightly as star dies: 1.0 → 1.15
    const rate = 1.0 + (1 - timeRatio) * 0.15;
    await musicSound.setRateAsync(rate, false);
  } catch {}
}
