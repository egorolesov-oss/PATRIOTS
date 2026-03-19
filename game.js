// ============================================
// PATRIOTS: AIR DEFENSE - Game Engine v2.0
// ============================================

const Game = {
    // Canvas & rendering
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,

    // Game state
    state: 'title', // title, operator, modeSelect, playing, wavePause, upgrade, gameover
    score: 0,
    wave: 0,
    baseHP: 100,
    maxHP: 100,
    combo: 0,
    bestCombo: 0,
    totalKills: 0,
    totalShots: 0,
    totalHits: 0,

    // Ammo & weapons
    ammo: 20,
    maxAmmo: 20,
    cooldown: 0,
    cooldownMax: 400,
    selectedWeapon: 0, // 0=standard, 1=fast, 2=aoe

    // Weapon definitions
    weapons: [
        { name: 'STANDARD', speed: 4.8, blast: 30, cost: 1, color: '#00ff41', key: '1' },
        { name: 'FAST', speed: 8.0, blast: 18, cost: 1, color: '#00ffff', key: '2' },
        { name: 'AoE BURST', speed: 3.5, blast: 55, cost: 3, color: '#ffaa00', key: '3' },
    ],

    // Targets & missiles
    targets: [],
    missiles: [],
    explosions: [],
    particles: [],

    // Radar
    radarAngle: 0,
    radarSpeed: 0.015,
    lastRadarPing: 0,

    // Base position
    baseX: 0,
    baseY: 0,

    // Wave management
    waveTargets: [],
    spawnTimer: 0,
    spawnIndex: 0,
    waveActive: false,

    // Upgrades
    missileSpeedMult: 1,
    blastMult: 1,
    reloadSpeed: 1,

    // Timing
    lastTime: 0,
    deltaTime: 0,

    // Grid
    gridRings: 5,

    // Slow motion
    slowMotion: false,
    slowMotionTimer: 0,

    // Blackout
    blackout: false,
    blackoutTimer: 0,
    blackoutCooldown: 0,

    // Screen flash
    screenFlash: 0,
    screenFlashColor: '#ffffff',

    // Game mode
    gameMode: 'survival', // survival, mission, hardcore, panic
    missionIndex: 0,

    // Operator
    operator: null,
    operators: [
        { id: 'falcon', name: 'FALCON', desc: 'Fast reload specialist', color: '#00ff41',
          bonus: 'RELOAD +30%', apply: (g) => { g.reloadSpeed = 1.3; } },
        { id: 'mara', name: 'MARA', desc: 'Enhanced radar tracking', color: '#00ffff',
          bonus: 'RADAR RANGE +', apply: (g) => { g.radarSpeed = 0.02; } },
        { id: 'grim', name: 'GRIM', desc: 'Heavy ordnance expert', color: '#ff6600',
          bonus: 'BLAST +25%', apply: (g) => { g.blastMult = 1.25; } },
        { id: 'volt', name: 'VOLT', desc: 'Emergency systems override', color: '#ffaa00',
          bonus: '+5 MAX AMMO, +15 HP', apply: (g) => { g.maxAmmo = 25; g.ammo = 25; g.maxHP = 115; g.baseHP = 115; } },
    ],

    // City skyline
    buildings: [],

    // Leaderboard
    leaderboard: [],

    // Missions
    missions: [
        { name: 'POWER STATION', desc: 'Defend the power grid', waves: 5, hp: 80,
          sub: 'Light resistance expected', types: ['scout', 'scout', 'heavy'] },
        { name: 'RIVER BRIDGE', desc: 'Hold the crossing point', waves: 6, hp: 100,
          sub: 'Mixed aerial assault', types: ['scout', 'heavy', 'zigzag', 'swarm'] },
        { name: 'CITY BLOCK', desc: 'Protect civilian zone', waves: 7, hp: 120,
          sub: 'Heavy drone presence', types: ['scout', 'heavy', 'zigzag', 'swarm', 'decoy'] },
        { name: 'RADAR ARRAY', desc: 'Keep sensors online', waves: 8, hp: 90,
          sub: 'Stealth threats detected', types: ['scout', 'zigzag', 'nightrunner', 'decoy'] },
        { name: 'COMMAND HQ', desc: 'Last line of defense', waves: 10, hp: 150,
          sub: 'Full scale assault', types: ['scout', 'heavy', 'zigzag', 'swarm', 'decoy', 'nightrunner'] },
    ],

    init() {
        this.canvas = document.getElementById('radar-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Sound init
        Sound.init();

        // Load leaderboard
        this.loadLeaderboard();

        // Title screen click
        document.getElementById('title-screen').addEventListener('click', () => {
            Sound.resume();
            this.showOperatorSelect();
        });

        // Game area click
        this.canvas.addEventListener('click', (e) => {
            if (this.state === 'playing') {
                this.handleClick(e);
            }
        });

        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (this.state === 'playing') {
                if (e.key === '1') { this.selectedWeapon = 0; Sound.switchWeapon(); this.updateHUD(); }
                if (e.key === '2') { this.selectedWeapon = 1; Sound.switchWeapon(); this.updateHUD(); }
                if (e.key === '3') { this.selectedWeapon = 2; Sound.switchWeapon(); this.updateHUD(); }
            }
        });

        // Game over click
        document.getElementById('gameover-screen').addEventListener('click', () => {
            if (this.state === 'gameover') {
                this.showOperatorSelect();
            }
        });

        // Generate city
        this.generateCity();

        // Render leaderboard on title
        this.renderLeaderboard();

        // Start render loop
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    },

    resize() {
        const area = document.getElementById('game-area');
        if (!area) return;
        this.width = area.clientWidth;
        this.height = area.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.baseX = this.width / 2;
        this.baseY = this.height * 0.85;
        this.generateCity();
    },

    // ========== CITY SKYLINE ==========

    generateCity() {
        this.buildings = [];
        const w = this.width || 1400;
        const baseY = this.baseY || this.height * 0.85;
        let x = 0;
        while (x < w) {
            const bw = 15 + Math.random() * 40;
            const bh = 20 + Math.random() * 80;
            this.buildings.push({
                x, w: bw, h: bh,
                y: baseY + 15 - bh,
                windows: Math.random() > 0.3,
                lit: true,
                flash: 0,
            });
            x += bw + 2 + Math.random() * 5;
        }
    },

    // ========== OPERATOR SELECT ==========

    showOperatorSelect() {
        document.getElementById('title-screen').classList.add('hidden');
        document.getElementById('gameover-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.add('hidden');
        const screen = document.getElementById('operator-screen');
        screen.classList.remove('hidden');

        const grid = document.getElementById('operator-grid');
        grid.innerHTML = '';

        this.operators.forEach(op => {
            const card = document.createElement('div');
            card.className = 'operator-card';
            card.style.borderColor = op.color;
            card.innerHTML = `
                <div class="op-name" style="color:${op.color}">${op.name}</div>
                <div class="op-desc">${op.desc}</div>
                <div class="op-bonus" style="color:${op.color}">${op.bonus}</div>
            `;
            card.addEventListener('click', () => {
                this.operator = op;
                screen.classList.add('hidden');
                this.showModeSelect();
            });
            grid.appendChild(card);
        });
    },

    // ========== MODE SELECT ==========

    showModeSelect() {
        const screen = document.getElementById('mode-screen');
        screen.classList.remove('hidden');

        const grid = document.getElementById('mode-grid');
        grid.innerHTML = '';

        const modes = [
            { id: 'survival', name: 'SURVIVAL', desc: 'Endless waves. How long can you hold?', icon: '∞' },
            { id: 'mission', name: 'MISSION', desc: '5 tactical operations', icon: '◆' },
            { id: 'hardcore', name: 'HARDCORE', desc: '1 HP. Few missiles. No mercy.', icon: '☠' },
            { id: 'panic', name: 'PANIC MODE', desc: '90 seconds of pure chaos', icon: '⚡' },
        ];

        modes.forEach(mode => {
            const card = document.createElement('div');
            card.className = 'mode-card';
            card.innerHTML = `
                <div class="mode-icon">${mode.icon}</div>
                <div class="mode-name">${mode.name}</div>
                <div class="mode-desc">${mode.desc}</div>
            `;
            card.addEventListener('click', () => {
                this.gameMode = mode.id;
                screen.classList.add('hidden');
                if (mode.id === 'mission') {
                    this.showMissionSelect();
                } else {
                    this.startGame();
                }
            });
            grid.appendChild(card);
        });
    },

    // ========== MISSION SELECT ==========

    showMissionSelect() {
        const screen = document.getElementById('mission-screen');
        screen.classList.remove('hidden');

        const list = document.getElementById('mission-list');
        list.innerHTML = '';

        this.missions.forEach((m, i) => {
            const card = document.createElement('div');
            card.className = 'mission-card';
            card.innerHTML = `
                <div class="mission-num">MISSION ${i + 1}</div>
                <div class="mission-name">${m.name}</div>
                <div class="mission-desc">${m.desc}</div>
                <div class="mission-sub">${m.sub}</div>
            `;
            card.addEventListener('click', () => {
                this.missionIndex = i;
                screen.classList.add('hidden');
                this.startGame();
            });
            list.appendChild(card);
        });
    },

    // ========== GAME START ==========

    startGame() {
        document.getElementById('title-screen').classList.add('hidden');
        document.getElementById('gameover-screen').classList.add('hidden');
        document.getElementById('operator-screen').classList.add('hidden');
        document.getElementById('mode-screen').classList.add('hidden');
        document.getElementById('mission-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        // Reset state
        this.score = 0;
        this.wave = 0;
        this.baseHP = 100;
        this.maxHP = 100;
        this.combo = 0;
        this.bestCombo = 0;
        this.totalKills = 0;
        this.totalShots = 0;
        this.totalHits = 0;
        this.ammo = 20;
        this.maxAmmo = 20;
        this.cooldown = 0;
        this.selectedWeapon = 0;
        this.targets = [];
        this.missiles = [];
        this.explosions = [];
        this.particles = [];
        this.missileSpeedMult = 1;
        this.blastMult = 1;
        this.reloadSpeed = 1;
        this.radarSpeed = 0.015;
        this.blackout = false;
        this.blackoutTimer = 0;
        this.blackoutCooldown = 0;
        this.screenFlash = 0;
        this.panicTimer = 0;

        // Apply operator bonus
        if (this.operator) {
            this.operator.apply(this);
        }

        // Mode-specific setup
        if (this.gameMode === 'hardcore') {
            this.baseHP = 1;
            this.maxHP = 1;
            this.ammo = 10;
            this.maxAmmo = 10;
        } else if (this.gameMode === 'panic') {
            this.panicTimer = 90000; // 90 seconds
            this.ammo = 50;
            this.maxAmmo = 50;
        } else if (this.gameMode === 'mission') {
            const m = this.missions[this.missionIndex];
            this.baseHP = m.hp;
            this.maxHP = m.hp;
        }

        // Reset city lighting
        this.buildings.forEach(b => { b.lit = true; b.flash = 0; });

        this.state = 'playing';
        this.resize();
        Sound.startAmbient();
        this.startWave();
    },

    // ========== WAVE MANAGEMENT ==========

    startWave() {
        this.wave++;
        this.waveTargets = this.generateWave(this.wave);
        this.spawnIndex = 0;
        this.spawnTimer = 0;
        this.waveActive = true;

        // Refill ammo
        if (this.gameMode !== 'hardcore') {
            this.ammo = Math.min(this.maxAmmo, this.ammo + 10 + this.wave * 2);
        } else {
            this.ammo = Math.min(this.maxAmmo, this.ammo + 3);
        }

        // Show wave briefing
        const intro = document.getElementById('wave-intro');
        document.getElementById('wave-intro-num').textContent = String(this.wave).padStart(2, '0');

        // Count target types for briefing
        const typeCounts = {};
        this.waveTargets.forEach(t => {
            const def = this.getTargetDef(t.type);
            typeCounts[def.label] = (typeCounts[def.label] || 0) + 1;
        });
        const briefing = Object.entries(typeCounts).map(([k, v]) => `${v}x ${k}`).join('  ·  ');
        document.getElementById('wave-intro-sub').textContent = briefing;

        intro.classList.remove('hidden');
        Sound.waveStart();
        setTimeout(() => intro.classList.add('hidden'), 2500);

        this.updateHUD();
    },

    generateWave(waveNum) {
        const targets = [];

        if (this.gameMode === 'panic') {
            // Panic: tons of targets, all types
            const count = 30 + waveNum * 10;
            for (let i = 0; i < count; i++) {
                const types = ['scout', 'heavy', 'zigzag', 'swarm', 'swarm', 'swarm', 'decoy', 'nightrunner'];
                targets.push({
                    type: types[Math.floor(Math.random() * types.length)],
                    delay: i * 200 + Math.random() * 300,
                });
            }
            return targets;
        }

        if (this.gameMode === 'mission') {
            const m = this.missions[this.missionIndex];
            const count = Math.min(4 + waveNum * 3, 20);
            const spawnDelay = Math.max(500, 1800 - waveNum * 120);
            for (let i = 0; i < count; i++) {
                targets.push({
                    type: m.types[Math.floor(Math.random() * m.types.length)],
                    delay: i * spawnDelay + Math.random() * 400,
                });
            }
            return targets;
        }

        // Survival / Hardcore
        const count = Math.min(3 + waveNum * 2, 25);
        const spawnDelay = Math.max(600, 2000 - waveNum * 100);

        for (let i = 0; i < count; i++) {
            targets.push({
                type: this.pickTargetType(waveNum),
                delay: i * spawnDelay + Math.random() * 400,
            });
        }
        return targets;
    },

    pickTargetType(waveNum) {
        const types = ['scout'];
        if (waveNum >= 2) types.push('scout', 'heavy');
        if (waveNum >= 3) types.push('zigzag');
        if (waveNum >= 4) types.push('swarm', 'swarm', 'swarm');
        if (waveNum >= 5) types.push('decoy');
        if (waveNum >= 6) types.push('nightrunner');
        return types[Math.floor(Math.random() * types.length)];
    },

    // ========== TARGET DEFINITIONS ==========

    getTargetDef(type) {
        const defs = {
            scout: { speed: 1.44, hp: 1, size: 8, color: '#00ff41', points: 100, label: 'SCOUT DRONE', droneType: 'scout' },
            heavy: { speed: 0.64, hp: 3, size: 14, color: '#ff6600', points: 200, label: 'STRIKE UAV', droneType: 'heavy' },
            zigzag: { speed: 1.12, hp: 1, size: 9, color: '#ffaa00', points: 150, label: 'EVASION DRONE', zigzag: true, droneType: 'zigzag' },
            swarm: { speed: 1.76, hp: 1, size: 5, color: '#00ffff', points: 50, label: 'FPV', droneType: 'swarm' },
            decoy: { speed: 0.96, hp: 1, size: 10, color: '#888888', points: -50, label: 'DECOY', decoy: true, droneType: 'decoy' },
            nightrunner: { speed: 1.28, hp: 2, size: 9, color: '#6622cc', points: 250, label: 'STEALTH UAV', stealth: true, droneType: 'nightrunner' },
        };
        return defs[type] || defs.scout;
    },

    // ========== SPAWNING ==========

    spawnTarget(typeName) {
        const def = this.getTargetDef(typeName);
        const waveSpeedMult = 1 + (this.wave - 1) * 0.06;
        const modeSpeedMult = this.gameMode === 'panic' ? 1.3 : (this.gameMode === 'hardcore' ? 1.15 : 1);

        const side = Math.floor(Math.random() * 3);
        let x, y;
        if (side === 0) { x = Math.random() * this.width; y = -20; }
        else if (side === 1) { x = -20; y = Math.random() * this.height * 0.5; }
        else { x = this.width + 20; y = Math.random() * this.height * 0.5; }

        const dx = this.baseX + (Math.random() - 0.5) * 150 - x;
        const dy = this.baseY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.targets.push({
            x, y,
            vx: (dx / dist) * def.speed * waveSpeedMult * modeSpeedMult,
            vy: (dy / dist) * def.speed * waveSpeedMult * modeSpeedMult,
            hp: def.hp, maxHp: def.hp, size: def.size, color: def.color,
            type: typeName, droneType: def.droneType || 'scout',
            points: def.points, label: def.label,
            decoy: def.decoy || false, stealth: def.stealth || false,
            zigzag: def.zigzag || false, zigzagTimer: 0,
            alive: true, trail: [], spawnTime: performance.now(),
        });
    },

    // ========== CLICK HANDLING ==========

    handleClick(e) {
        const weapon = this.weapons[this.selectedWeapon];
        if (this.cooldown > 0 || this.ammo < weapon.cost) return;

        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const dx = clickX - this.baseX;
        const dy = clickY - this.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20) return;

        const speed = weapon.speed * this.missileSpeedMult;

        this.missiles.push({
            x: this.baseX, y: this.baseY,
            targetX: clickX, targetY: clickY,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            alive: true, trail: [],
            weaponIndex: this.selectedWeapon,
            blast: weapon.blast * this.blastMult,
            color: weapon.color,
        });

        this.ammo -= weapon.cost;
        this.totalShots++;
        this.cooldown = this.cooldownMax / this.reloadSpeed;

        Sound.launch();

        // Launch particles
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: this.baseX, y: this.baseY,
                vx: (dx / dist) * -1 + (Math.random() - 0.5) * 2,
                vy: (dy / dist) * -1 + (Math.random() - 0.5) * 2,
                life: 150 + Math.random() * 100,
                color: '#ffaa00', size: 1 + Math.random() * 2,
            });
        }

        this.updateHUD();
    },

    // ========== MAIN LOOP ==========

    loop(time) {
        this.deltaTime = Math.min(time - this.lastTime, 50);
        this.lastTime = time;

        if (this.slowMotion) {
            this.deltaTime *= 0.25;
            this.slowMotionTimer -= this.deltaTime * 4;
            if (this.slowMotionTimer <= 0) this.slowMotion = false;
        }

        if (this.state === 'playing') {
            this.update(this.deltaTime);
        }

        this.render();
        requestAnimationFrame((t) => this.loop(t));
    },

    update(dt) {
        // Radar sweep
        this.radarAngle += this.radarSpeed * dt * 0.06;
        if (this.radarAngle > Math.PI * 2) {
            this.radarAngle -= Math.PI * 2;
            // Radar ping sound on each full sweep
            if (performance.now() - this.lastRadarPing > 2000) {
                Sound.radarPing();
                this.lastRadarPing = performance.now();
            }
        }

        // Cooldown
        if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);

        // Screen flash decay
        if (this.screenFlash > 0) this.screenFlash = Math.max(0, this.screenFlash - dt * 0.005);

        // Panic timer
        if (this.gameMode === 'panic' && this.panicTimer > 0) {
            this.panicTimer -= dt;
            if (this.panicTimer <= 0 && this.targets.length === 0) {
                this.waveActive = false;
                this.waveComplete();
            }
        }

        // Blackout logic
        if (this.blackoutCooldown > 0) this.blackoutCooldown -= dt;
        if (this.blackout) {
            this.blackoutTimer -= dt;
            if (this.blackoutTimer <= 0) this.blackout = false;
        } else if (this.wave >= 4 && !this.blackout && this.blackoutCooldown <= 0 && Math.random() < 0.0001 * dt) {
            this.blackout = true;
            this.blackoutTimer = 3000 + Math.random() * 2000;
            this.blackoutCooldown = 20000;
            Sound.blackoutAlarm();
        }

        // Spawn targets
        if (this.waveActive && this.spawnIndex < this.waveTargets.length) {
            this.spawnTimer += dt;
            while (this.spawnIndex < this.waveTargets.length &&
                   this.spawnTimer >= this.waveTargets[this.spawnIndex].delay) {
                this.spawnTarget(this.waveTargets[this.spawnIndex].type);
                this.spawnIndex++;
            }
        }

        // Update targets
        this.targets.forEach(t => {
            if (!t.alive) return;

            if (t.zigzag) {
                t.zigzagTimer += dt * 0.003;
                const perpX = -t.vy;
                const perpY = t.vx;
                t.x += (t.vx + perpX * Math.sin(t.zigzagTimer * 4) * 0.6) * dt * 0.06;
                t.y += (t.vy + perpY * Math.sin(t.zigzagTimer * 4) * 0.6) * dt * 0.06;
            } else {
                t.x += t.vx * dt * 0.06;
                t.y += t.vy * dt * 0.06;
            }

            t.trail.push({ x: t.x, y: t.y, age: 0 });
            if (t.trail.length > 15) t.trail.shift();
            t.trail.forEach(p => p.age += dt);

            const distToBase = Math.sqrt((t.x - this.baseX) ** 2 + (t.y - this.baseY) ** 2);

            if (distToBase < 30) {
                t.alive = false;
                if (!t.decoy) {
                    const damage = t.type === 'heavy' ? 15 : 8;
                    this.baseHP = Math.max(0, this.baseHP - damage);
                    this.combo = 0;
                    this.screenShake('heavy');
                    this.showMessage(t.x, t.y - 20, 'BREACH!', 'breach');
                    this.spawnExplosion(t.x, t.y, '#ff3333', 25);
                    this.screenFlash = 0.4;
                    this.screenFlashColor = '#ff3333';
                    Sound.breach();

                    // Damage nearby buildings
                    this.buildings.forEach(b => {
                        if (Math.abs(b.x + b.w / 2 - t.x) < 60) {
                            b.lit = false;
                            b.flash = 300;
                        }
                    });

                    if (this.baseHP <= 0) {
                        this.gameOver();
                        return;
                    }
                }
            }

            if (t.y > this.height + 50 || t.x < -100 || t.x > this.width + 100) {
                t.alive = false;
            }
        });

        // Update missiles
        this.missiles.forEach(m => {
            if (!m.alive) return;

            m.x += m.vx * dt * 0.06;
            m.y += m.vy * dt * 0.06;

            m.trail.push({ x: m.x, y: m.y, age: 0 });
            if (m.trail.length > 25) m.trail.shift();
            m.trail.forEach(p => p.age += dt);

            const speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
            const distToTarget = Math.sqrt((m.x - m.targetX) ** 2 + (m.y - m.targetY) ** 2);

            if (distToTarget < speed * 1.5) {
                m.alive = false;
                this.detonation(m.targetX, m.targetY, m.blast, m.color);
            }

            if (m.x < -50 || m.x > this.width + 50 || m.y < -50 || m.y > this.height + 50) {
                m.alive = false;
            }
        });

        // Update explosions
        this.explosions.forEach(e => {
            e.age += dt;
            e.radius = e.maxRadius * Math.min(1, e.age / 200);
        });
        this.explosions = this.explosions.filter(e => e.age < 500);

        // Update particles
        this.particles.forEach(p => {
            p.x += p.vx * dt * 0.06;
            p.y += p.vy * dt * 0.06;
            p.vy += 0.01 * dt * 0.06; // gravity
            p.life -= dt;
        });
        this.particles = this.particles.filter(p => p.life > 0);

        // Update building flash
        this.buildings.forEach(b => {
            if (b.flash > 0) b.flash -= dt;
        });

        // Clean up
        this.targets = this.targets.filter(t => t.alive);
        this.missiles = this.missiles.filter(m => m.alive);

        // Check wave complete
        if (this.waveActive && this.spawnIndex >= this.waveTargets.length &&
            this.targets.length === 0 && this.missiles.length === 0) {
            this.waveActive = false;
            this.waveComplete();
        }

        this.updateHUD();
    },

    detonation(x, y, radius, color) {
        this.spawnExplosion(x, y, color || '#00ff41', radius);
        Sound.explosion(radius > 40 ? 'big' : 'normal');
        this.screenFlash = 0.15;
        this.screenFlashColor = color || '#00ff41';

        let hits = 0;
        this.targets.forEach(t => {
            if (!t.alive) return;
            const dist = Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2);

            if (dist < radius + t.size) {
                t.hp--;
                if (t.hp <= 0) {
                    t.alive = false;
                    hits++;

                    if (t.decoy) {
                        this.score = Math.max(0, this.score + t.points);
                        this.showMessage(t.x, t.y - 15, 'DECOY! -50', 'miss');
                        Sound.miss();
                    } else {
                        const distToBase = Math.sqrt((t.x - this.baseX) ** 2 + (t.y - this.baseY) ** 2);
                        this.combo++;
                        if (this.combo > this.bestCombo) this.bestCombo = this.combo;
                        this.totalKills++;
                        this.totalHits++;

                        let points = t.points;
                        let msgType = 'hit';
                        let msg = '+' + points;

                        if (dist < 10) {
                            points = Math.floor(points * 2.5);
                            msg = 'PERFECT +' + points;
                            msgType = 'perfect';
                            Sound.perfectHit();
                        } else {
                            Sound.hit();
                        }

                        if (this.combo > 2) {
                            points += this.combo * 25;
                            msg += ' x' + this.combo;
                        }

                        if (distToBase < 120) {
                            points += 200;
                            msg = 'CLUTCH SAVE +' + points;
                            msgType = 'clutch';
                            this.slowMotion = true;
                            this.slowMotionTimer = 400;
                            this.screenShake('normal');
                            this.screenFlash = 0.5;
                            this.screenFlashColor = '#ffaa00';
                            Sound.clutchSave();
                        }

                        this.score += points;
                        this.showMessage(t.x, t.y - 15, msg, msgType);
                    }

                    // Kill particles
                    for (let i = 0; i < 12; i++) {
                        const angle = (Math.PI * 2 * i) / 12;
                        this.particles.push({
                            x: t.x, y: t.y,
                            vx: Math.cos(angle) * (1.5 + Math.random() * 3),
                            vy: Math.sin(angle) * (1.5 + Math.random() * 3),
                            life: 400 + Math.random() * 300,
                            color: t.color, size: 2 + Math.random() * 3,
                        });
                    }
                }
            }
        });

        if (hits >= 2) {
            this.score += hits * 100;
            this.showMessage(x, y - 40, 'CHAIN x' + hits + '!', 'perfect');
            Sound.perfectHit();
        }

        if (hits === 0) {
            this.combo = 0;
            this.showMessage(x, y - 15, 'MISS', 'miss');
            Sound.miss();
        }
    },

    spawnExplosion(x, y, color, radius) {
        this.explosions.push({ x, y, color, radius: 0, maxRadius: radius, age: 0 });
    },

    waveComplete() {
        const sectorBonus = this.baseHP === this.maxHP ? 500 : 0;
        const efficiencyBonus = Math.floor((this.totalHits / Math.max(1, this.totalShots)) * 200);
        this.score += sectorBonus + efficiencyBonus;

        Sound.sectorClear();
        this.showMessage(this.baseX, this.baseY - 80, 'SECTOR CLEAR', 'clutch');

        // Check mission win
        if (this.gameMode === 'mission') {
            const m = this.missions[this.missionIndex];
            if (this.wave >= m.waves) {
                setTimeout(() => this.gameWin(), 2000);
                return;
            }
        }

        // Panic mode: only 1 wave
        if (this.gameMode === 'panic') {
            setTimeout(() => this.gameWin(), 2000);
            return;
        }

        setTimeout(() => {
            if (this.state !== 'playing') return;
            this.showUpgrades();
        }, 2000);
    },

    gameWin() {
        this.state = 'gameover';
        this.saveScore();
        Sound.stopAmbient();

        setTimeout(() => {
            document.getElementById('game-screen').classList.add('hidden');
            document.getElementById('upgrade-screen').classList.add('hidden');
            const go = document.getElementById('gameover-screen');
            go.classList.remove('hidden');
            document.getElementById('gameover-title').textContent = 'MISSION COMPLETE';
            document.getElementById('gameover-title').style.color = '#00ff41';
            this.fillGameOverStats();
        }, 500);
    },

    showUpgrades() {
        this.state = 'upgrade';
        const screen = document.getElementById('upgrade-screen');
        const options = document.getElementById('upgrade-options');
        screen.classList.remove('hidden');

        const allUpgrades = [
            { name: 'FAST RELOAD', desc: 'Reload 20% faster', icon: '⚡', apply: () => { this.reloadSpeed *= 1.2; } },
            { name: 'MISSILE SPEED', desc: 'Missiles 15% faster', icon: '»', apply: () => { this.missileSpeedMult *= 1.15; } },
            { name: 'BLAST RADIUS', desc: 'Explosions 20% bigger', icon: '◎', apply: () => { this.blastMult *= 1.2; } },
            { name: 'EXTRA AMMO', desc: '+8 max missiles', icon: '▲', apply: () => { this.maxAmmo += 8; this.ammo += 8; } },
            { name: 'REPAIR BASE', desc: 'Restore 25 HP', icon: '✚', apply: () => { this.baseHP = Math.min(this.maxHP, this.baseHP + 25); } },
            { name: 'REINFORCE', desc: '+15 max base HP', icon: '■', apply: () => { this.maxHP += 15; this.baseHP += 15; } },
        ];

        const shuffled = allUpgrades.sort(() => Math.random() - 0.5);
        const picks = shuffled.slice(0, 3);

        options.innerHTML = '';
        picks.forEach(upg => {
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `
                <div class="upgrade-icon">${upg.icon}</div>
                <div class="upgrade-name">${upg.name}</div>
                <div class="upgrade-desc">${upg.desc}</div>
            `;
            card.addEventListener('click', () => {
                upg.apply();
                screen.classList.add('hidden');
                this.state = 'playing';
                Sound.switchWeapon();
                this.startWave();
            });
            options.appendChild(card);
        });
    },

    gameOver() {
        this.state = 'gameover';
        this.screenShake('heavy');
        this.saveScore();
        Sound.gameOverSound();
        Sound.stopAmbient();

        setTimeout(() => {
            document.getElementById('game-screen').classList.add('hidden');
            document.getElementById('upgrade-screen').classList.add('hidden');
            const go = document.getElementById('gameover-screen');
            go.classList.remove('hidden');
            document.getElementById('gameover-title').textContent = 'SECTOR LOST';
            document.getElementById('gameover-title').style.color = '#ff3333';
            this.fillGameOverStats();
        }, 800);
    },

    fillGameOverStats() {
        document.getElementById('final-score').textContent = String(this.score).padStart(6, '0');
        document.getElementById('final-waves').textContent = this.wave;
        document.getElementById('final-kills').textContent = this.totalKills;
        document.getElementById('final-accuracy').textContent =
            this.totalShots > 0 ? Math.round((this.totalHits / this.totalShots) * 100) + '%' : '0%';
        document.getElementById('final-combo').textContent = 'x' + this.bestCombo;
    },

    // ========== LEADERBOARD ==========

    loadLeaderboard() {
        try {
            this.leaderboard = JSON.parse(localStorage.getItem('patriots_leaderboard') || '[]');
        } catch { this.leaderboard = []; }
    },

    saveScore() {
        this.leaderboard.push({
            score: this.score,
            wave: this.wave,
            mode: this.gameMode,
            operator: this.operator ? this.operator.name : '?',
            date: new Date().toLocaleDateString(),
        });
        this.leaderboard.sort((a, b) => b.score - a.score);
        this.leaderboard = this.leaderboard.slice(0, 10);
        try { localStorage.setItem('patriots_leaderboard', JSON.stringify(this.leaderboard)); } catch {}
        this.renderLeaderboard();
    },

    renderLeaderboard() {
        const el = document.getElementById('leaderboard-list');
        if (!el) return;
        if (this.leaderboard.length === 0) {
            el.innerHTML = '<div class="lb-empty">NO RECORDS YET</div>';
            return;
        }
        el.innerHTML = this.leaderboard.map((e, i) =>
            `<div class="lb-row"><span class="lb-rank">#${i + 1}</span><span class="lb-score">${String(e.score).padStart(6, '0')}</span><span class="lb-meta">W${e.wave} ${e.operator} ${e.mode.toUpperCase()}</span></div>`
        ).join('');
    },

    // ========== RENDERING ==========

    render() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        if (!w || !h) return;

        ctx.fillStyle = '#0a0e0a';
        ctx.fillRect(0, 0, w, h);

        if (this.state === 'title' || this.state === 'gameover') return;

        // Blackout overlay opacity
        const hudOpacity = this.blackout ? 0.15 : 1;

        // Draw sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#050814');
        skyGrad.addColorStop(0.7, '#0a1020');
        skyGrad.addColorStop(1, '#0a0e0a');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Grid (dim during blackout)
        ctx.globalAlpha = this.blackout ? 0.05 : 1;
        this.drawRadarBG(ctx, w, h);
        ctx.globalAlpha = 1;

        // City skyline
        this.drawCity(ctx);

        // Base
        this.drawBase(ctx);

        // Radar sweep
        ctx.globalAlpha = this.blackout ? 0.3 : 1;
        this.drawRadarSweep(ctx);
        ctx.globalAlpha = 1;

        // Targets - always visible even during blackout (they're on radar)
        this.targets.forEach(t => this.drawTargetTrail(ctx, t));
        this.targets.forEach(t => this.drawTarget(ctx, t));

        // Missiles
        this.missiles.forEach(m => this.drawMissileTrail(ctx, m));
        this.missiles.forEach(m => this.drawMissile(ctx, m));

        // Explosions
        this.explosions.forEach(e => this.drawExplosion(ctx, e));

        // Particles
        this.particles.forEach(p => this.drawParticle(ctx, p));

        // Screen flash
        if (this.screenFlash > 0) {
            ctx.globalAlpha = this.screenFlash * 0.3;
            ctx.fillStyle = this.screenFlashColor;
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;
        }

        // Blackout overlay
        if (this.blackout) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, w, h);

            // Warning text
            ctx.save();
            ctx.globalAlpha = 0.5 + Math.sin(performance.now() * 0.008) * 0.3;
            ctx.fillStyle = '#ff3333';
            ctx.font = '20px "Orbitron"';
            ctx.textAlign = 'center';
            ctx.fillText('⚠ BLACKOUT ⚠', w / 2, 80);
            ctx.restore();
        }

        // Panic timer
        if (this.gameMode === 'panic' && this.panicTimer > 0) {
            ctx.save();
            ctx.fillStyle = '#ff3333';
            ctx.font = '24px "Orbitron"';
            ctx.textAlign = 'center';
            ctx.globalAlpha = 0.8;
            ctx.fillText(Math.ceil(this.panicTimer / 1000) + 's', w / 2, h / 2 - 50);
            ctx.restore();
        }
    },

    drawCity(ctx) {
        this.buildings.forEach(b => {
            // Building body
            if (b.flash > 0) {
                ctx.fillStyle = `rgba(255, 50, 0, ${b.flash / 300 * 0.5})`;
            } else {
                ctx.fillStyle = b.lit ? '#0a1a10' : '#080808';
            }
            ctx.fillRect(b.x, b.y, b.w, b.h);

            // Building outline
            ctx.strokeStyle = b.lit ? 'rgba(0, 255, 65, 0.08)' : 'rgba(100, 100, 100, 0.05)';
            ctx.lineWidth = 1;
            ctx.strokeRect(b.x, b.y, b.w, b.h);

            // Windows
            if (b.windows && b.w > 12) {
                const winSize = 3;
                const gap = 7;
                const cols = Math.floor((b.w - 4) / gap);
                const rows = Math.floor((b.h - 4) / gap);
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        if (Math.random() > 0.6 && b.lit) {
                            ctx.fillStyle = 'rgba(255, 200, 50, 0.15)';
                        } else {
                            ctx.fillStyle = 'rgba(0, 255, 65, 0.03)';
                        }
                        ctx.fillRect(b.x + 3 + c * gap, b.y + 3 + r * gap, winSize, winSize);
                    }
                }
            }
        });
    },

    drawRadarBG(ctx, w, h) {
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.06)';
        ctx.lineWidth = 1;
        const gridSize = 60;
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.08)';
        for (let i = 1; i <= this.gridRings; i++) {
            const r = (Math.min(w, h) * 0.15) * i;
            ctx.beginPath(); ctx.arc(this.baseX, this.baseY, r, 0, Math.PI * 2); ctx.stroke();
        }
    },

    drawRadarSweep(ctx) {
        const sweepLen = Math.max(this.width, this.height);
        const endX = this.baseX + Math.cos(this.radarAngle) * sweepLen;
        const endY = this.baseY + Math.sin(this.radarAngle) * sweepLen;

        ctx.strokeStyle = 'rgba(0, 255, 65, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.baseX, this.baseY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        const trailAngle = 0.4;
        const grad = ctx.createLinearGradient(
            this.baseX, this.baseY,
            this.baseX + Math.cos(this.radarAngle) * sweepLen * 0.5,
            this.baseY + Math.sin(this.radarAngle) * sweepLen * 0.5
        );
        grad.addColorStop(0, 'rgba(0, 255, 65, 0.15)');
        grad.addColorStop(1, 'rgba(0, 255, 65, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(this.baseX, this.baseY);
        ctx.arc(this.baseX, this.baseY, sweepLen * 0.7, this.radarAngle - trailAngle, this.radarAngle);
        ctx.closePath();
        ctx.fill();
    },

    drawBase(ctx) {
        const bx = this.baseX;
        const by = this.baseY;

        ctx.fillStyle = '#003300';
        ctx.strokeStyle = '#00ff41';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx, by - 15);
        ctx.lineTo(bx + 18, by - 5);
        ctx.lineTo(bx + 12, by + 12);
        ctx.lineTo(bx - 12, by + 12);
        ctx.lineTo(bx - 18, by - 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00ff41';
        ctx.font = '8px "Share Tech Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('HQ', bx, by + 4);

        ctx.strokeStyle = 'rgba(255, 51, 51, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(bx, by, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(0, 255, 65, 0.4)';
        ctx.font = '10px "Share Tech Mono"';
        ctx.fillText('DEFENSE HQ', bx, by + 28);
    },

    drawTarget(ctx, t) {
        if (!t.alive) return;
        const now = performance.now();
        const visible = !t.stealth || (Math.sin(now * 0.005) > 0.3);
        if (!visible) return;

        const alpha = t.stealth ? 0.4 + Math.sin(now * 0.008) * 0.3 : 1;

        ctx.save();
        ctx.globalAlpha = alpha;
        const angle = Math.atan2(t.vy, t.vx);
        ctx.translate(t.x, t.y);
        ctx.rotate(angle + Math.PI / 2);

        ctx.fillStyle = t.color;
        ctx.strokeStyle = t.color;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.5;
        const s = t.size;

        switch (t.droneType) {
            case 'scout':
                ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-s, -s); ctx.lineTo(s, s);
                ctx.moveTo(s, -s); ctx.lineTo(-s, s);
                ctx.stroke();
                const rotorR = s * 0.3;
                [[-s, -s], [s, -s], [s, s], [-s, s]].forEach(([rx, ry]) => {
                    ctx.beginPath(); ctx.arc(rx, ry, rotorR, 0, Math.PI * 2); ctx.stroke();
                });
                break;
            case 'heavy':
                ctx.beginPath();
                ctx.moveTo(0, -s * 1.4);
                ctx.lineTo(s * 1.2, s * 0.3); ctx.lineTo(s * 0.8, s * 0.5);
                ctx.lineTo(s * 0.2, s * 0.4); ctx.lineTo(s * 0.5, s * 1.3);
                ctx.lineTo(s * 0.15, s * 0.9); ctx.lineTo(0, s * 1.1);
                ctx.lineTo(-s * 0.15, s * 0.9); ctx.lineTo(-s * 0.5, s * 1.3);
                ctx.lineTo(-s * 0.2, s * 0.4); ctx.lineTo(-s * 0.8, s * 0.5);
                ctx.lineTo(-s * 1.2, s * 0.3);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ff3300';
                ctx.globalAlpha = alpha * (0.5 + Math.sin(now * 0.01) * 0.3);
                ctx.beginPath(); ctx.arc(0, s * 0.9, s * 0.2, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = alpha;
                break;
            case 'zigzag':
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI * 2 * i) / 6 - Math.PI / 6;
                    if (i === 0) ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s);
                    else ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
                }
                ctx.closePath(); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2); ctx.fill();
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI * 2 * i) / 6 - Math.PI / 6;
                    ctx.beginPath(); ctx.arc(Math.cos(a) * s, Math.sin(a) * s, s * 0.2, 0, Math.PI * 2); ctx.stroke();
                }
                break;
            case 'swarm':
                ctx.beginPath();
                ctx.moveTo(0, -s * 1.2); ctx.lineTo(s * 0.8, s * 0.6);
                ctx.lineTo(0, s * 0.3); ctx.lineTo(-s * 0.8, s * 0.6);
                ctx.closePath(); ctx.fill();
                ctx.shadowBlur = 0; ctx.globalAlpha = alpha * 0.4;
                ctx.beginPath();
                ctx.arc(s * 0.5, s * 0.3, s * 0.4, 0, Math.PI * 2);
                ctx.arc(-s * 0.5, s * 0.3, s * 0.4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = alpha;
                break;
            case 'decoy':
                ctx.setLineDash([3, 3]);
                ctx.beginPath(); ctx.rect(-s * 0.8, -s, s * 1.6, s * 2); ctx.stroke();
                ctx.setLineDash([]);
                ctx.shadowBlur = 0; ctx.fillStyle = '#888888';
                ctx.font = `${s}px "Share Tech Mono"`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('?', 0, 0);
                break;
            case 'nightrunner':
                ctx.beginPath();
                ctx.moveTo(0, -s * 1.0);
                ctx.quadraticCurveTo(s * 0.3, -s * 0.3, s * 1.5, s * 0.2);
                ctx.lineTo(s * 1.2, s * 0.5);
                ctx.quadraticCurveTo(s * 0.4, s * 0.2, 0, s * 0.6);
                ctx.quadraticCurveTo(-s * 0.4, s * 0.2, -s * 1.2, s * 0.5);
                ctx.lineTo(-s * 1.5, s * 0.2);
                ctx.quadraticCurveTo(-s * 0.3, -s * 0.3, 0, -s * 1.0);
                ctx.closePath(); ctx.fill();
                ctx.shadowBlur = 0; ctx.strokeStyle = t.color;
                ctx.globalAlpha = alpha * (0.2 + Math.sin(now * 0.006) * 0.15);
                ctx.lineWidth = 1; ctx.stroke();
                ctx.globalAlpha = alpha;
                break;
        }
        ctx.restore();

        // HP & label (no rotation)
        ctx.save();
        ctx.globalAlpha = alpha;
        if (t.maxHp > 1 && t.hp > 0) {
            ctx.strokeStyle = t.color; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (t.hp / t.maxHp));
            ctx.stroke();
        }
        ctx.shadowBlur = 0; ctx.fillStyle = t.color;
        ctx.font = '8px "Share Tech Mono"'; ctx.textAlign = 'center';
        ctx.fillText(t.label, t.x, t.y - t.size - 8);

        ctx.strokeStyle = t.color; ctx.globalAlpha = alpha * 0.25;
        ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x + t.vx * 18, t.y + t.vy * 18); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    },

    drawTargetTrail(ctx, t) {
        if (!t.alive || t.trail.length < 2) return;
        ctx.strokeStyle = t.color; ctx.lineWidth = 1;
        for (let i = 1; i < t.trail.length; i++) {
            ctx.globalAlpha = (i / t.trail.length) * 0.2;
            ctx.beginPath();
            ctx.moveTo(t.trail[i - 1].x, t.trail[i - 1].y);
            ctx.lineTo(t.trail[i].x, t.trail[i].y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    },

    drawMissile(ctx, m) {
        if (!m.alive) return;
        const color = m.color || '#00ff41';

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(m.x, m.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Crosshair
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        const s = 8;
        ctx.beginPath();
        ctx.moveTo(m.targetX - s, m.targetY); ctx.lineTo(m.targetX + s, m.targetY);
        ctx.moveTo(m.targetX, m.targetY - s); ctx.lineTo(m.targetX, m.targetY + s);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(m.targetX, m.targetY, s, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
    },

    drawMissileTrail(ctx, m) {
        if (m.trail.length < 2) return;
        const color = m.color || '0, 255, 65';
        const r = parseInt(m.color?.slice(1, 3) || 'ff', 16);
        const g = parseInt(m.color?.slice(3, 5) || 'ff', 16);
        const b = parseInt(m.color?.slice(5, 7) || 'ff', 16);

        for (let i = 1; i < m.trail.length; i++) {
            const alpha = (i / m.trail.length) * 0.5;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(m.trail[i - 1].x, m.trail[i - 1].y);
            ctx.lineTo(m.trail[i].x, m.trail[i].y);
            ctx.stroke();
        }
    },

    drawExplosion(ctx, e) {
        const progress = e.age / 500;
        const alpha = 1 - progress;

        ctx.strokeStyle = e.color;
        ctx.globalAlpha = alpha * 0.8;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); ctx.stroke();

        ctx.fillStyle = e.color;
        ctx.globalAlpha = alpha * 0.15;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * 0.8, 0, Math.PI * 2); ctx.fill();

        if (e.age < 100) {
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = (1 - e.age / 100) * 0.8;
            ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * 0.3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    drawParticle(ctx, p) {
        const alpha = p.life / 500;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(alpha, 1);
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1;
    },

    // ========== UI ==========

    updateHUD() {
        document.getElementById('wave-display').textContent = 'WAVE ' + String(this.wave).padStart(2, '0');
        document.getElementById('score-display').textContent = String(this.score).padStart(6, '0');

        const hpPct = (this.baseHP / this.maxHP) * 100;
        const hpFill = document.getElementById('health-fill');
        hpFill.style.width = hpPct + '%';
        hpFill.className = hpPct <= 25 ? 'critical' : hpPct <= 50 ? 'warning' : '';
        document.getElementById('health-text').textContent = Math.round(hpPct) + '%';

        document.getElementById('ammo-count').textContent = this.ammo;
        document.getElementById('ammo-max').textContent = this.maxAmmo;
        document.getElementById('combo-display').textContent = 'x' + this.combo;

        const cdPct = this.cooldownMax > 0
            ? (1 - this.cooldown / (this.cooldownMax / this.reloadSpeed)) * 100 : 100;
        document.getElementById('cooldown-fill').style.width = Math.min(100, cdPct) + '%';

        document.getElementById('targets-count').textContent = this.targets.filter(t => t.alive).length;

        // Weapon selector
        const weaponEl = document.getElementById('weapon-display');
        if (weaponEl) {
            const w = this.weapons[this.selectedWeapon];
            weaponEl.textContent = w.name;
            weaponEl.style.color = w.color;
        }
    },

    showMessage(x, y, text, type) {
        const container = document.getElementById('status-messages');
        const el = document.createElement('div');
        el.className = 'status-msg ' + type;
        el.textContent = text;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.transform = 'translateX(-50%)';
        container.appendChild(el);
        setTimeout(() => el.remove(), 1500);
    },

    screenShake(type) {
        const container = document.getElementById('game-container');
        container.classList.remove('screen-shake', 'screen-shake-heavy');
        void container.offsetWidth;
        container.classList.add(type === 'heavy' ? 'screen-shake-heavy' : 'screen-shake');
        setTimeout(() => container.classList.remove('screen-shake', 'screen-shake-heavy'), 500);
    },
};

// ========== BOOT ==========
window.addEventListener('DOMContentLoaded', () => Game.init());
