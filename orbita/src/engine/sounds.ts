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
  // All sounds tuned to D minor: D E F G A Bb C
  // D4=294, E4=330, F4=349, G4=392, A4=440, Bb4=466, C5=523, D5=587

  /** Soft click — D5 */
  select() {
    playTone(587, 0.12, 'sine', 0.1);
  },

  /** Deselect — A4 */
  deselect() {
    playTone(440, 0.08, 'sine', 0.06);
  },

  /** Whoosh — D4 → A4 → F4 */
  swap() {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(294, ctx.currentTime);        // D4
    osc.frequency.exponentialRampToValueAtTime(587, ctx.currentTime + 0.15); // D5
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);  // A4
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  },

  /** Match chime — Dm chord (D F A) */
  match() {
    playChord([294, 349, 440], 0.5, 0.1); // D4, F4, A4
    setTimeout(() => playTone(587, 0.4, 'sine', 0.06), 150); // D5 sparkle
  },

  /** Combo match — ascending Dm inversions */
  comboMatch(combo: number) {
    // Dm: D-F-A, higher with each combo
    const octave = combo <= 2 ? 1 : combo <= 4 ? 2 : 4;
    playChord([294 * octave, 349 * octave, 440 * octave], 0.6, 0.08);
    setTimeout(() => playTone(587 * octave, 0.5, 'sine', 0.05), 150);
  },

  /** Spawn — A5, D6 */
  spawn() {
    playTone(880, 0.08, 'sine', 0.04);  // A5
    setTimeout(() => playTone(1174, 0.06, 'sine', 0.03), 50); // D6
  },

  /** Gravity hum — D3, A3 */
  gravity() {
    playTone(147, 0.3, 'sine', 0.03);  // D3
    playTone(220, 0.3, 'sine', 0.02);  // A3
  },

  /** Power-up — D4 → A4 → D5 ascending */
  powerUp() {
    playTone(294, 0.15, 'triangle', 0.1);  // D4
    setTimeout(() => playTone(440, 0.15, 'triangle', 0.1), 100); // A4
    setTimeout(() => playTone(587, 0.3, 'triangle', 0.08), 200);  // D5
  },

  /** Shake — random D minor scale notes */
  shake() {
    const dmScale = [294, 330, 349, 392, 440, 466, 523, 587]; // D minor
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const note = dmScale[Math.floor(Math.random() * dmScale.length)];
        playTone(note, 0.06, 'sine', 0.05);
      }, i * 40);
    }
  },

  /** Game over — descending D minor: D5 → Bb4 → F4 → D4 */
  gameOver() {
    playTone(587, 0.3, 'sine', 0.1);   // D5
    setTimeout(() => playTone(466, 0.3, 'sine', 0.1), 300);  // Bb4
    setTimeout(() => playTone(349, 0.3, 'sine', 0.1), 600);  // F4
    setTimeout(() => playTone(294, 0.6, 'sine', 0.08), 900); // D4
  },

  /** Game start — ascending D minor: D4 → F4 → A4 → D5 */
  gameStart() {
    playTone(294, 0.2, 'sine', 0.08);  // D4
    setTimeout(() => playTone(349, 0.2, 'sine', 0.08), 150); // F4
    setTimeout(() => playTone(440, 0.2, 'sine', 0.08), 300); // A4
    setTimeout(() => playTone(587, 0.4, 'sine', 0.1), 450);  // D5
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
      require('../../assets/distant-cathedral.mp3'),
      {
        isLooping: true,
        volume: 0.15,
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
    // Volume increases as star dies: 0.15 → 0.35
    const vol = 0.15 + (1 - timeRatio) * 0.2;
    await musicSound.setVolumeAsync(vol);
    // Speed up slightly as star dies: 1.0 → 1.15
    const rate = 1.0 + (1 - timeRatio) * 0.15;
    await musicSound.setRateAsync(rate, false);
  } catch {}
}
