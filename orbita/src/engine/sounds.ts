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

// --- AMBIENT BACKGROUND MUSIC ---

let musicNodes: {
  oscs: OscillatorNode[];
  gains: GainNode[];
  masterGain: GainNode | null;
  interval: ReturnType<typeof setInterval> | null;
  playing: boolean;
} = { oscs: [], gains: [], masterGain: null, interval: null, playing: false };

export function startMusic() {
  if (musicNodes.playing) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  musicNodes.playing = true;

  // Master volume
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  master.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);
  musicNodes.masterGain = master;

  // Drone layer — deep space hum
  const droneFreqs = [55, 82.5, 110]; // A1, E2, A2
  for (const freq of droneFreqs) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = freq === 55 ? 0.4 : 0.2;
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    musicNodes.oscs.push(osc);
    musicNodes.gains.push(gain);
  }

  // Pad layer — slow evolving chords
  const padNotes = [
    [220, 277, 330],  // Am
    [196, 247, 294],  // Gm-ish
    [175, 220, 262],  // F
    [165, 208, 247],  // E
  ];
  let chordIndex = 0;

  const padOscs: OscillatorNode[] = [];
  const padGains: GainNode[] = [];
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = padNotes[0][i];
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    padOscs.push(osc);
    padGains.push(gain);
    musicNodes.oscs.push(osc);
    musicNodes.gains.push(gain);
  }

  // Shimmer layer — high twinkle
  const shimmer = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  shimmer.type = 'sine';
  shimmer.frequency.value = 880;
  shimmerGain.gain.value = 0.02;
  shimmer.connect(shimmerGain);
  shimmerGain.connect(master);
  shimmer.start();
  musicNodes.oscs.push(shimmer);
  musicNodes.gains.push(shimmerGain);

  // Evolve chords every 8 seconds
  musicNodes.interval = setInterval(() => {
    if (!musicNodes.playing) return;
    chordIndex = (chordIndex + 1) % padNotes.length;
    const chord = padNotes[chordIndex];
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      padOscs[i].frequency.linearRampToValueAtTime(chord[i], now + 3);
    }
    // Shimmer follows root
    shimmer.frequency.linearRampToValueAtTime(chord[0] * 4, now + 3);
  }, 8000);
}

export function stopMusic() {
  if (!musicNodes.playing) return;
  musicNodes.playing = false;

  if (musicNodes.interval) {
    clearInterval(musicNodes.interval);
    musicNodes.interval = null;
  }

  const ctx = getAudioContext();
  if (ctx && musicNodes.masterGain) {
    musicNodes.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
  }

  // Stop oscillators after fadeout
  setTimeout(() => {
    for (const osc of musicNodes.oscs) {
      try { osc.stop(); } catch {}
    }
    musicNodes.oscs = [];
    musicNodes.gains = [];
    musicNodes.masterGain = null;
  }, 1200);
}

/** Shift music mood based on star health (0-1) */
export function setMusicUrgency(timeRatio: number) {
  const ctx = getAudioContext();
  if (!ctx || !musicNodes.masterGain || !musicNodes.playing) return;

  // Volume increases as star dies
  const vol = 0.04 + (1 - timeRatio) * 0.06;
  musicNodes.masterGain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.5);

  // Drone gets louder and slightly detuned as star dies
  if (musicNodes.oscs.length > 0 && timeRatio < 0.3) {
    const detune = (1 - timeRatio) * 30;
    for (let i = 0; i < Math.min(3, musicNodes.oscs.length); i++) {
      musicNodes.oscs[i].detune.linearRampToValueAtTime(detune, ctx.currentTime + 1);
    }
  }
}
