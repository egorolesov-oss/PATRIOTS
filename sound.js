// ============================================
// PATRIOTS: AIR DEFENSE - Sound Engine
// Web Audio API Synthesizer (no external files)
// ============================================

const Sound = {
    ctx: null,
    masterGain: null,
    enabled: true,
    volume: 0.3,

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {
            this.enabled = false;
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // ---- SOUND EFFECTS ----

    launch() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        // Whoosh + click
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(2000, t + 0.15);
        filter.Q.value = 2;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);

        // Click transient
        this._noise(t, 0.03, 0.4, 3000, 5000);
    },

    explosion(size) {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        const dur = size === 'big' ? 0.6 : 0.35;
        const vol = size === 'big' ? 0.5 : 0.3;

        // Low rumble
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + dur);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + dur);

        // Noise burst
        this._noise(t, dur * 0.7, vol * 0.6, 200, 2000);
    },

    hit() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        // Satisfying ping
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.setValueAtTime(1100, t + 0.05);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.3);
    },

    perfectHit() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        // Rising chime
        [880, 1100, 1320].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.2, t + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.3);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.3);
        });
    },

    clutchSave() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        // Dramatic rising tone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.3);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.setValueAtTime(0.2, t + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.6);

        this.perfectHit();
    },

    breach() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        // Alarm buzz
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = 200;
            gain.gain.setValueAtTime(0, t + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.25, t + i * 0.15 + 0.02);
            gain.gain.setValueAtTime(0.25, t + i * 0.15 + 0.08);
            gain.gain.linearRampToValueAtTime(0, t + i * 0.15 + 0.12);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + i * 0.15);
            osc.stop(t + i * 0.15 + 0.15);
        }
        this.explosion('big');
    },

    miss() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        // Dull thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
    },

    radarPing() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1800;
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);
    },

    waveStart() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        // Alert siren
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.3);
        osc.frequency.linearRampToValueAtTime(400, t + 0.6);
        osc.frequency.linearRampToValueAtTime(600, t + 0.9);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.setValueAtTime(0.15, t + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 1.0);
    },

    sectorClear() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        // Victory fanfare
        [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.15, t + i * 0.12 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.12 + 0.4);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + i * 0.12);
            osc.stop(t + i * 0.12 + 0.4);
        });
    },

    gameOverSound() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        // Descending doom
        [400, 350, 300, 200].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t + i * 0.2);
            gain.gain.linearRampToValueAtTime(0.12, t + i * 0.2 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.2 + 0.35);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + i * 0.2);
            osc.stop(t + i * 0.2 + 0.4);
        });
    },

    switchWeapon() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.setValueAtTime(800, t + 0.04);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.08);
    },

    blackoutAlarm() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        for (let i = 0; i < 5; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = i % 2 === 0 ? 300 : 250;
            gain.gain.setValueAtTime(0, t + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.15, t + i * 0.1 + 0.02);
            gain.gain.setValueAtTime(0.15, t + i * 0.1 + 0.06);
            gain.gain.linearRampToValueAtTime(0, t + i * 0.1 + 0.09);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + i * 0.1);
            osc.stop(t + i * 0.1 + 0.1);
        }
    },

    // Ambient radar hum (looping)
    _ambientOsc: null,
    startAmbient() {
        if (!this.enabled || this._ambientOsc) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        osc.type = 'sawtooth';
        osc.frequency.value = 60;
        gain.gain.value = 0.04;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        this._ambientOsc = osc;
        this._ambientGain = gain;
    },

    stopAmbient() {
        if (this._ambientOsc) {
            this._ambientOsc.stop();
            this._ambientOsc = null;
        }
    },

    // ---- HELPERS ----

    _noise(startTime, duration, volume, freqLow, freqHigh) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = (freqLow + freqHigh) / 2;
        filter.Q.value = 0.5;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start(startTime);
        source.stop(startTime + duration);
    },
};
