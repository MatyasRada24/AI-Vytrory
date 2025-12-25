const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Permanent Upgrades
let permState = {
    damage: 0,
    range: 0,
    speed: 0,
    money: 0,
    discount: 0
};

// Load from LocalStorage
try {
    const savedPerms = localStorage.getItem('tds_perms');
    if (savedPerms) {
        const parsed = JSON.parse(savedPerms);
        permState = { ...permState, ...parsed }; // Merge to handle new keys
    }
} catch (e) { }

function savePerms() {
    localStorage.setItem('tds_perms', JSON.stringify(permState));
}

// UI Elements
const waveEl = document.getElementById('wave-display');
const nextWaveEl = document.getElementById('next-wave-timer');
const moneyEl = document.getElementById('money-display');
const gemsEl = document.getElementById('gems-display');
const healthEl = document.getElementById('health-display');
const killsEl = document.getElementById('kills-display');

const dmgBtn = document.getElementById('upgrade-damage');
const rangeBtn = document.getElementById('upgrade-range');
const speedBtn = document.getElementById('upgrade-speed');

const dmgCostEl = document.getElementById('cost-damage');
const rangeCostEl = document.getElementById('cost-range');
const speedCostEl = document.getElementById('cost-speed');

const dmgLvlEl = document.getElementById('level-damage');
const rangeLvlEl = document.getElementById('level-range');
const speedLvlEl = document.getElementById('level-speed');

// Shop Elements
const shopIcon = document.getElementById('shop-icon');
const shopModal = document.getElementById('shop-modal');
const closeShopBtn = document.getElementById('close-shop');
const pDmgBtn = document.getElementById('p-upgrade-damage');
const pRangeBtn = document.getElementById('p-upgrade-range');
const pSpeedBtn = document.getElementById('p-upgrade-speed');
const pMoneyBtn = document.getElementById('p-upgrade-money');
const pDiscountBtn = document.getElementById('p-upgrade-discount');

const pDmgLvl = document.getElementById('p-level-damage');
const pRangeLvl = document.getElementById('p-level-range');
const pSpeedLvl = document.getElementById('p-level-speed');
const pMoneyLvl = document.getElementById('p-level-money');
const pDiscountLvl = document.getElementById('p-level-discount');

const pDmgBonusEl = document.getElementById('p-bonus-damage');
const pRangeBonusEl = document.getElementById('p-bonus-range');
const pSpeedBonusEl = document.getElementById('p-bonus-speed');
const pMoneyBonusEl = document.getElementById('p-bonus-money');
const pDiscountBonusEl = document.getElementById('p-bonus-discount');

const statDmgEl = document.getElementById('stat-damage');
const statRangeEl = document.getElementById('stat-range');
const statSpeedEl = document.getElementById('stat-speed');

const topUi = document.getElementById('top-ui');
const bottomUi = document.getElementById('ui-panel');

// Settings Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const toggleMusicBtn = document.getElementById('toggle-music-setting');
const toggleBgBtn = document.getElementById('toggle-bg-setting');
const resetPermsBtn = document.getElementById('reset-perms-btn');

// Game State
let gameState = {
    wave: 1,
    money: 50,
    gems: Number(localStorage.getItem('tds_gems')) || 0,
    health: 100,
    kills: 0,
    lastTime: 0,
    spawnTimer: 0,
    enemies: [],
    projectiles: [],
    particles: [],
    // Wave Control
    inWave: false,
    enemiesToSpawn: 0,
    waveDelay: 3000,
    waveTimer: 0,
    spawnInterval: 1200,
    timeScale: 1,
    baseDeltaTime: 16.67, // Target ms for 60fps
    stars: [], // Background stars
    // UI Cache to prevent redundant DOM updates
    lastUI: {
        wave: -1,
        money: -1,
        gems: -1,
        health: -1,
        kills: -1,
        dmgCost: -1,
        rangeCost: -1,
        speedCost: -1,
        dmgLvl: -1,
        rangeLvl: -1,
        speedLvl: -1,
        dmgBtnDisabled: null,
        rangeBtnDisabled: null,
        speedBtnDisabled: null,
        pDmgBtnDisabled: null,
        pRangeBtnDisabled: null,
        pSpeedBtnDisabled: null,
        pMoneyBtnDisabled: null,
        pDiscountBtnDisabled: null,
        pMoneyLvl: -1,
        pDiscountLvl: -1,
        pDmgBonus: '',
        pRangeBonus: '',
        pSpeedBonus: '',
        pMoneyBonus: '',
        pDiscountBonus: '',
        lastUpdate: 0
    },
    fps: {
        lastTime: 0,
        frames: 0,
        current: 0
    },
    musicMuted: localStorage.getItem('tds_music_muted') === 'true',
    bgEffects: true,
    uiVisible: true
};

// Tower Object
const tower = {
    x: 0,
    y: 0,
    size: 50,
    damage: 10 * (1 + permState.damage * 0.01),
    range: 200 * (1 + permState.range * 0.01),
    attackSpeed: 1 * (1 + permState.speed * 0.01), // attacks per second
    lastAttack: 0,
    levels: {
        damage: 1,
        range: 1,
        speed: 1
    },
    costs: {
        damage: 0,
        range: 0,
        speed: 0
    }
};

function updateTowerCosts() {
    tower.costs.damage = Math.floor((5 * Math.pow(1.45, tower.levels.damage - 1)) * (1 - permState.discount * 0.01));
    tower.costs.range = Math.floor((10 * Math.pow(1.4, tower.levels.range - 1)) * (1 - permState.discount * 0.01));
    tower.costs.speed = Math.floor((15 * Math.pow(1.55, tower.levels.speed - 1)) * (1 - permState.discount * 0.01));
    updateUI();
}

// Initialize Canvas
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight; // Fully screen canvas
    tower.x = canvas.width / 2;
    tower.y = canvas.height / 2;
}

window.addEventListener('resize', () => {
    resize();
    initStars(); // Re-init stars on resize to match new center
});

// Shop Logic
shopIcon.onclick = () => shopModal.classList.remove('hidden');
closeShopBtn.onclick = () => shopModal.classList.add('hidden');

pDmgBtn.onclick = () => {
    if (gameState.gems >= 1) {
        gameState.gems--;
        permState.damage++;
        savePerms();
        updateUI();
    }
};

pRangeBtn.onclick = () => {
    if (gameState.gems >= 1) {
        gameState.gems--;
        permState.range++;
        savePerms();
        updateUI();
    }
};

pSpeedBtn.onclick = () => {
    if (gameState.gems >= 1) {
        gameState.gems--;
        permState.speed++;
        savePerms();
        updateUI();
    }
};

pMoneyBtn.onclick = () => {
    if (gameState.gems >= 1) {
        gameState.gems--;
        permState.money++;
        savePerms();
        updateUI();
    }
};

pDiscountBtn.onclick = () => {
    if (gameState.gems >= 1) {
        gameState.gems--;
        permState.discount++;
        savePerms();
        updateTowerCosts(); // This now calls updateUI()
    }
};

// --- CHIPTUNE ENGINE (8-BIT SYNTHESIZER V3 - POLYPHONIC & POLISHED) ---
class ChiptuneEngine {
    constructor() {
        this.ctx = null;
        this.gainNode = null;
        this.isPlaying = false;
        this.step = 0;
        this.tempo = 150;
        this.interval = null;

        this.notes = {
            C2: 65.41, G2: 98.00, Bb2: 116.54, C3: 130.81, Eb3: 155.56, F3: 174.61, G3: 196.00, Bb3: 233.08,
            C4: 261.63, D4: 293.66, Eb4: 311.13, F4: 349.23, G4: 392.00, Bb4: 466.16, C5: 523.25
        };

        this.melodies = {
            verse: ['C4', 0, 'Bb3', 'C4', 0, 'Eb4', 'F4', 'G4', 'Bb4', 0, 'G4', 'Eb4', 0, 'C4', 0, 0],
            heroic: ['C4', 'G4', 'F4', 'Eb4', 'F4', 'G4', 'C5', 'Bb4', 'G4', 'F4', 'Eb4', 'Bb3', 'C4', 0, 0, 0],
            bass: ['C2', 'C2', 'G2', 'G2', 'Bb2', 'Bb2', 'C2', 'C2']
        };

        this.sections = ['verse', 'verse', 'heroic', 'heroic'];
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.ctx.createGain();
        this.gainNode.connect(this.ctx.destination);
        this.gainNode.gain.value = 0.12;
    }

    // Authentic 8-bit Noise (for Snare/Hats)
    playNoise(duration = 0.1, vol = 0.3, lowPass = 2000) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = lowPass;

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(g);
        g.connect(this.gainNode);
        noise.start();
    }

    playOsc(freq, type, duration, vol, startFreq = null) {
        if (!this.ctx || freq <= 0) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;

        const now = this.ctx.currentTime;
        if (startFreq) {
            osc.frequency.setValueAtTime(startFreq, now);
            osc.frequency.exponentialRampToValueAtTime(freq, now + 0.05);
        } else {
            osc.frequency.setValueAtTime(freq, now);
        }

        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(g);
        g.connect(this.gainNode);
        osc.start();
        osc.stop(now + duration);
    }

    // Classic "SID" Arpeggio (Fast flipping notes)
    playArp(freqs, duration, vol) {
        const now = this.ctx.currentTime;
        const speed = 0.05; // 1/32 notes or so
        freqs.forEach((f, i) => {
            if (f <= 0) return;
            setTimeout(() => {
                if (this.isPlaying) this.playOsc(f, 'square', speed, vol);
            }, i * speed * 1000);
        });
    }

    tick() {
        if (!this.isPlaying) return;

        const sec = this.sections[Math.floor(this.step / 16) % this.sections.length];
        const beat = this.step % 16;
        const subBeat = this.step % 8;

        // --- LAYER 1: DRUMS (Authentic Noise) ---
        if (beat % 4 === 0) this.playOsc(60, 'triangle', 0.2, 0.8, 120); // Deep Kick
        if (beat % 8 === 4) {
            this.playNoise(0.15, 0.4, 1500); // Gritty Snare
            this.playOsc(200, 'triangle', 0.1, 0.2); // Snare body
        }
        if (beat % 2 === 1) this.playNoise(0.02, 0.1, 8000); // Hi-hats

        // --- LAYER 2: BASS (Walking / Pulse) ---
        const bassNote = this.notes[this.melodies.bass[subBeat]];
        this.playOsc(bassNote, 'sawtooth', 0.15, 0.25);
        this.playOsc(bassNote / 2, 'triangle', 0.2, 0.4); // Sub-bass

        // --- LAYER 3: MELODY (Heroic Lead) ---
        const melodyNote = this.notes[this.melodies[sec][beat]];
        if (melodyNote > 0) {
            // Heroic Lead with "Portamento" (glide)
            const prevNote = this.notes[this.melodies[sec][(beat - 1 + 16) % 16]] || melodyNote;
            this.playOsc(melodyNote, 'square', 0.25, 0.35, prevNote);

            // Harmony / Arp Layer
            if (sec === 'heroic') {
                this.playArp([melodyNote, melodyNote * 1.25, melodyNote * 1.5], 0.2, 0.1);
            }
        }

        // --- LAYER 4: INCIDENTAL CHIPS (Random ear candy) ---
        if (beat === 15 && Math.random() > 0.7) {
            const highFreq = 1000 + Math.random() * 2000;
            this.playOsc(highFreq, 'square', 0.05, 0.1, highFreq * 1.5);
        }

        this.step++;
    }

    start() {
        this.init();
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.ctx.resume();
        this.interval = setInterval(() => this.tick(), (60 / this.tempo / 2) * 1000);
    }

    stop() {
        this.isPlaying = false;
        if (this.interval) clearInterval(this.interval);
    }
}
const audioEngine = new ChiptuneEngine();

// Music Logic
// Music Logic
function updateMusicUI() {
    toggleMusicBtn.textContent = gameState.musicMuted ? 'OFF' : 'ON';
    toggleMusicBtn.classList.toggle('active', !gameState.musicMuted);
}

function updateBgUI() {
    toggleBgBtn.textContent = gameState.bgEffects ? 'ON' : 'OFF'; // Assuming bgEffects is added to gameState
    toggleBgBtn.classList.toggle('active', !!gameState.bgEffects);
}

function playMusic() {
    if (gameState.musicMuted || audioEngine.isPlaying) return;
    audioEngine.start();
}

// Settings Controls
settingsBtn.onclick = () => settingsModal.classList.remove('hidden');
closeSettingsBtn.onclick = () => settingsModal.classList.add('hidden');

toggleMusicBtn.onclick = () => {
    gameState.musicMuted = !gameState.musicMuted;
    localStorage.setItem('tds_music_muted', gameState.musicMuted);
    updateMusicUI();

    if (gameState.musicMuted) {
        audioEngine.stop();
    } else {
        playMusic();
    }
};

// Background Effects Toggle (Placeholder for now, just logic)
toggleBgBtn.onclick = () => {
    // We need to add bgEffects to gameState first or just toggle a class
    // For now, let's assuming we just toggle the star drawing
    // But first, let's just make the button toggle visually
    if (gameState.bgEffects === undefined) gameState.bgEffects = true;
    gameState.bgEffects = !gameState.bgEffects;
    updateBgUI();
};

resetPermsBtn.onclick = () => {
    const confirmed = confirm("Are you sure you want to WIPEOUT ALL PROGRESS? This includes Gems and Permanent Upgrades. This cannot be undone.");
    if (confirmed) {
        localStorage.removeItem('tds_perms');
        localStorage.removeItem('tds_gems');
        // Reload to reset everything cleanly
        location.reload();
    }
};


// Start music on first interaction (required by browsers)
window.addEventListener('click', () => {
    playMusic();
}, { once: true });

// Also try on keydown for extra reliability
window.addEventListener('keydown', () => {
    playMusic();
}, { once: true });

updateMusicUI();

// Enemy Types
const ENEMY_TYPES = {
    BASIC: {
        color: '#ef4444',
        shape: 'circle',
        health: 20,
        speed: 0.09, // Pixels per ms at 1.5 baseline
        value: 2,
        damage: 5,
        radius: 15
    },
    TANK: {
        color: '#fbbf24',
        shape: 'triangle',
        health: 70,
        speed: 0.048, // Pixels per ms at 0.8 baseline
        value: 5,
        damage: 15,
        radius: 20
    },
    FAST: {
        color: '#3b82f6',
        shape: 'rectangle',
        health: 15,
        speed: 0.168, // Pixels per ms at 2.8 baseline
        value: 3,
        damage: 10,
        radius: 12
    },
    OCTAGON: {
        color: '#a855f7',
        shape: 'octagon',
        health: 50,
        speed: 0.072, // Pixels per ms at 1.2 baseline
        value: 10,
        damage: 1, // Continuous damage
        radius: 18,
        rotationSpeed: 0.003
    }
};

// UI Stat Elements


// Classes
class Enemy {
    constructor(type = ENEMY_TYPES.BASIC) {
        // Random spawn outside view
        const side = Math.floor(Math.random() * 4);
        this.type = type;
        this.radius = type.radius;
        this.speed = type.speed;
        this.health = type.health;
        this.maxHealth = this.health;
        this.value = type.value;
        this.damage = type.damage;
        this.color = type.color;
        this.shape = type.shape;
        this.isBoss = type.isBoss || false;
        this.angle = 0;
        this.rotationSpeed = type.rotationSpeed || 0;
        this.docked = false;

        if (this.isBoss) {
            this.radius *= 3;
            // Additional boss logic if needed
        }

        if (side === 0) { // Top
            this.x = Math.random() * canvas.width;
            this.y = -this.radius;
        } else if (side === 1) { // Right
            this.x = canvas.width + this.radius;
            this.y = Math.random() * canvas.height;
        } else if (side === 2) { // Bottom
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + this.radius;
        } else { // Left
            this.x = -this.radius;
            this.y = Math.random() * canvas.height;
        }
    }

    update(dt) {
        if (this.docked) {
            gameState.health -= this.damage * (dt / 1000) * 60; // Scale damage per frame
            this.angle += this.rotationSpeed * dt;
            return;
        }

        const dx = tower.x - this.x;
        const dy = tower.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Move towards tower
        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;

        // Rotation for regular enemies if they have it
        this.angle += this.rotationSpeed * dt;

        // Check tower collision
        if (dist < tower.size / 2 + this.radius) {
            if (this.isBoss) {
                gameState.health = 0; // INSTAKILL
                return;
            }

            if (this.shape === 'octagon') {
                this.docked = true;
            } else {
                gameState.health -= this.damage;
                this.health = 0; // Destroy enemy on hit
                createExplosion(this.x, this.y, this.color);
            }
        }
    }

    draw() {
        ctx.fillStyle = this.color;

        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.shape === 'triangle') {
            ctx.beginPath();
            const angle = Math.atan2(tower.y - this.y, tower.x - this.x);
            ctx.moveTo(this.x + Math.cos(angle) * this.radius * 1.5, this.y + Math.sin(angle) * this.radius * 1.5);
            ctx.lineTo(this.x + Math.cos(angle + 2.5) * this.radius, this.y + Math.sin(angle + 2.5) * this.radius);
            ctx.lineTo(this.x + Math.cos(angle - 2.5) * this.radius, this.y + Math.sin(angle - 2.5) * this.radius);
            ctx.closePath();
            ctx.fill();
        } else if (this.shape === 'rectangle') {
            ctx.save();
            ctx.translate(this.x, this.y);
            const angle = Math.atan2(tower.y - this.y, tower.x - this.x);
            ctx.rotate(angle);
            ctx.fillRect(-this.radius, -this.radius / 2, this.radius * 2, this.radius);
            ctx.restore();
        } else if (this.shape === 'octagon') {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                const px = Math.cos(a) * this.radius;
                const py = Math.sin(a) * this.radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Health bar
        const barWidth = 30;
        const barHeight = 4;
        ctx.fillStyle = '#334155';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 12, barWidth, barHeight);
        ctx.fillStyle = '#22c55e';
        const hProgress = Math.max(0, this.health / this.maxHealth);
        ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 12, barWidth * hProgress, barHeight);
    }
}

class Projectile {
    constructor(target) {
        this.x = tower.x;
        this.y = tower.y;
        this.target = target;
        this.speed = 0.42; // Pixels per ms
        this.radius = 5;
    }

    update(dt) {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const moveDist = this.speed * dt;

        if (dist < moveDist) {
            this.target.health -= tower.damage;
            createExplosion(this.target.x, this.target.y, '#38bdf8');
            return true; // Hit
        }

        this.x += (dx / dist) * moveDist;
        this.y += (dy / dist) * moveDist;
        return false;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#38bdf8';
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

class Star {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = (Math.random() - 0.5) * canvas.width * 2;
        this.y = (Math.random() - 0.5) * canvas.height * 2;
        this.z = Math.random() * canvas.width;
        this.prevZ = this.z;
    }

    update(dt) {
        this.prevZ = this.z;
        const speedMultiplier = gameState.timeScale * 0.8; // Reduced from 1.2
        this.z -= 0.1 * dt * speedMultiplier; // Reduced from 0.2

        if (this.z <= 0) {
            this.reset();
        }
    }

    draw() {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        const x = cx + (this.x / this.z) * 100;
        const y = cy + (this.y / this.z) * 100;

        const px = cx + (this.x / this.prevZ) * 100;
        const py = cy + (this.y / this.prevZ) * 100;

        // Visual fade-in from the center
        const alpha = Math.min(1, (canvas.width - this.z) / 400);

        ctx.strokeStyle = `rgba(186, 230, 253, ${alpha})`; // Sky blue-ish
        ctx.lineWidth = 1 + (1 - this.z / canvas.width) * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(px, py);
        ctx.stroke();
    }
}

function initStars() {
    gameState.stars = [];
    for (let i = 0; i < 200; i++) {
        gameState.stars.push(new Star());
    }
}

class Particle {
    constructor() {
        this.reset(0, 0, '#fff');
    }

    reset(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.decay = 0.02 + Math.random() * 0.02;
        this.active = true;
    }

    update(dt) {
        if (!this.active) return;
        this.x += this.vx * (dt / gameState.baseDeltaTime);
        this.y += this.vy * (dt / gameState.baseDeltaTime);
        this.life -= this.decay * (dt / gameState.baseDeltaTime);
        if (this.life <= 0) this.active = false;
    }

    draw() {
        if (!this.active) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.globalAlpha = 1;
    }
}

// Particle Pool
const particlePool = {
    pool: [],
    get(x, y, color) {
        let p;
        if (this.pool.length > 0) {
            p = this.pool.pop();
            p.reset(x, y, color);
        } else {
            p = new Particle();
            p.reset(x, y, color);
        }
        return p;
    },
    recycle(p) {
        p.active = false;
        this.pool.push(p);
    }
};

function createExplosion(x, y, color) {
    for (let i = 0; i < 8; i++) {
        gameState.particles.push(particlePool.get(x, y, color));
    }
}

// Logic functions
function findNearestEnemy() {
    let nearest = null;
    let minDistSq = tower.range * tower.range; // Use squared distance

    for (let i = 0; i < gameState.enemies.length; i++) {
        const enemy = gameState.enemies[i];
        const dx = tower.x - enemy.x;
        const dy = tower.y - enemy.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
            minDistSq = distSq;
            nearest = enemy;
        }
    }
    return nearest;
}

// Start Wave function
function startWave() {
    gameState.inWave = true;
    const isBossWave = gameState.wave % 5 === 0;

    if (isBossWave) {
        gameState.enemiesToSpawn = 1;
    } else {
        gameState.enemiesToSpawn = 5 + (gameState.wave * 3);
    }

    gameState.spawnInterval = Math.max(300, 1500 - (gameState.wave * 100));
    updateUI();
}

function updateUI() {
    const ui = gameState.lastUI;
    const currentMoney = Math.floor(gameState.money);

    if (ui.wave !== gameState.wave) {
        waveEl.textContent = gameState.wave;
        ui.wave = gameState.wave;
    }
    if (ui.money !== currentMoney) {
        moneyEl.textContent = currentMoney;
        ui.money = currentMoney;
    }
    if (ui.gems !== gameState.gems) {
        gemsEl.textContent = gameState.gems;
        ui.gems = gameState.gems;
        localStorage.setItem('tds_gems', gameState.gems);
    }
    const currentHealth = Math.ceil(Math.max(0, gameState.health));
    if (ui.health !== currentHealth) {
        healthEl.textContent = currentHealth;
        ui.health = currentHealth;
    }
    if (ui.kills !== gameState.kills) {
        killsEl.textContent = gameState.kills;
        ui.kills = gameState.kills;
    }

    if (ui.dmgCost !== tower.costs.damage) {
        dmgCostEl.textContent = `${tower.costs.damage}$`;
        ui.dmgCost = tower.costs.damage;
    }
    if (ui.rangeCost !== tower.costs.range) {
        rangeCostEl.textContent = `${tower.costs.range}$`;
        ui.rangeCost = tower.costs.range;
    }
    if (ui.speedCost !== tower.costs.speed) {
        speedCostEl.textContent = `${tower.costs.speed}$`;
        ui.speedCost = tower.costs.speed;
    }

    if (ui.dmgLvl !== tower.levels.damage) {
        dmgLvlEl.textContent = `Lvl ${tower.levels.damage}`;
        statDmgEl.textContent = tower.damage.toFixed(1);
        ui.dmgLvl = tower.levels.damage;
    }
    if (ui.rangeLvl !== tower.levels.range) {
        rangeLvlEl.textContent = `Lvl ${tower.levels.range}`;
        statRangeEl.textContent = tower.range.toFixed(1);
        ui.rangeLvl = tower.levels.range;
    }
    const currentAttackSpeed = tower.attackSpeed.toFixed(1);
    if (ui.speedLvl !== tower.levels.speed) {
        speedLvlEl.textContent = `Lvl ${tower.levels.speed}`;
        statSpeedEl.textContent = currentAttackSpeed;
        ui.speedLvl = tower.levels.speed;
    }

    const canAffordDmg = gameState.money >= tower.costs.damage;
    if (ui.dmgBtnDisabled !== !canAffordDmg) {
        dmgBtn.disabled = !canAffordDmg;
        ui.dmgBtnDisabled = !canAffordDmg;
    }
    const canAffordRange = gameState.money >= tower.costs.range;
    if (ui.rangeBtnDisabled !== !canAffordRange) {
        rangeBtn.disabled = !canAffordRange;
        ui.rangeBtnDisabled = !canAffordRange;
    }
    const canAffordSpeed = gameState.money >= tower.costs.speed;
    if (ui.speedBtnDisabled !== !canAffordSpeed) {
        speedBtn.disabled = !canAffordSpeed;
        ui.speedBtnDisabled = !canAffordSpeed;
    }



    const canAffordPGem = gameState.gems >= 1;
    if (ui.pDmgBtnDisabled !== !canAffordPGem) {
        pDmgBtn.disabled = !canAffordPGem;
        ui.pDmgBtnDisabled = !canAffordPGem;
    }
    if (ui.pRangeBtnDisabled !== !canAffordPGem) {
        pRangeBtn.disabled = !canAffordPGem;
        ui.pRangeBtnDisabled = !canAffordPGem;
    }
    if (ui.pSpeedBtnDisabled !== !canAffordPGem) {
        pSpeedBtn.disabled = !canAffordPGem;
        ui.pSpeedBtnDisabled = !canAffordPGem;
    }
    if (ui.pMoneyBtnDisabled !== !canAffordPGem) {
        pMoneyBtn.disabled = !canAffordPGem;
        ui.pMoneyBtnDisabled = !canAffordPGem;
    }
    if (ui.pDiscountBtnDisabled !== !canAffordPGem) {
        pDiscountBtn.disabled = !canAffordPGem;
        ui.pDiscountBtnDisabled = !canAffordPGem;
    }

    if (ui.pDmgLvl !== permState.damage) {
        pDmgLvl.textContent = `Lvl ${permState.damage}`;
        ui.pDmgLvl = permState.damage;
    }
    if (ui.pRangeLvl !== permState.range) {
        pRangeLvl.textContent = `Lvl ${permState.range}`;
        ui.pRangeLvl = permState.range;
    }
    if (ui.pSpeedLvl !== permState.speed) {
        pSpeedLvl.textContent = `Lvl ${permState.speed}`;
        ui.pSpeedLvl = permState.speed;
    }
    if (ui.pMoneyLvl !== permState.money) {
        pMoneyLvl.textContent = `Lvl ${permState.money}`;
        ui.pMoneyLvl = permState.money;
    }
    if (ui.pDiscountLvl !== permState.discount) {
        pDiscountLvl.textContent = `Lvl ${permState.discount}`;
        ui.pDiscountLvl = permState.discount;
    }

    // Update Bonus Texts
    const dCur = permState.damage; const dNext = dCur + 1;
    const rCur = permState.range; const rNext = rCur + 1;
    const sCur = permState.speed; const sNext = sCur + 1;
    const mCur = (permState.money * 2.5).toFixed(1); const mNext = ((permState.money + 1) * 2.5).toFixed(1);
    const dcCur = permState.discount; const dcNext = dcCur + 1;

    const bDmg = `Bonus: ${dCur}% → ${dNext}%`;
    if (ui.pDmgBonus !== bDmg) { pDmgBonusEl.textContent = bDmg; ui.pDmgBonus = bDmg; }

    const bRange = `Bonus: ${rCur}% → ${rNext}%`;
    if (ui.pRangeBonus !== bRange) { pRangeBonusEl.textContent = bRange; ui.pRangeBonus = bRange; }

    const bSpeed = `Bonus: ${sCur}% → ${sNext}%`;
    if (ui.pSpeedBonus !== bSpeed) { pSpeedBonusEl.textContent = bSpeed; ui.pSpeedBonus = bSpeed; }

    const bMoney = `Bonus: ${mCur}% → ${mNext}%`;
    if (ui.pMoneyBonus !== bMoney) { pMoneyBonusEl.textContent = bMoney; ui.pMoneyBonus = bMoney; }

    const bDiscount = `Bonus: ${dcCur}% → ${dcNext}%`;
    if (ui.pDiscountBonus !== bDiscount) { pDiscountBonusEl.textContent = bDiscount; ui.pDiscountBonus = bDiscount; }
}

// Upgrades - New Scale
dmgBtn.onclick = () => {
    if (gameState.money >= tower.costs.damage) {
        gameState.money -= tower.costs.damage;
        const upgradeVal = 10 * (1 + permState.damage * 0.01);
        tower.damage = Math.round((tower.damage + upgradeVal) * 100) / 100;
        tower.levels.damage++;
        updateTowerCosts();
    }
};

rangeBtn.onclick = () => {
    if (gameState.money >= tower.costs.range) {
        gameState.money -= tower.costs.range;
        const upgradeVal = 40 * (1 + permState.range * 0.01);
        tower.range = Math.round((tower.range + upgradeVal) * 100) / 100;
        tower.levels.range++;
        updateTowerCosts();
    }
};

speedBtn.onclick = () => {
    if (gameState.money >= tower.costs.speed) {
        gameState.money -= tower.costs.speed;
        const upgradeVal = 1.25 * (1 + permState.speed * 0.01);
        tower.attackSpeed = Math.round((tower.attackSpeed * upgradeVal) * 100) / 100;
        tower.levels.speed++;
        updateTowerCosts();
    }
};



// Main Game Loop
function loop(timestamp) {
    if (!gameState.lastTime) gameState.lastTime = timestamp;
    const realDeltaTime = timestamp - gameState.lastTime;
    const deltaTime = realDeltaTime * gameState.timeScale;
    gameState.lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update & Draw Stars (Background)
    // Update & Draw Stars (Background)
    if (gameState.bgEffects !== false) { // Default to true if undefined
        gameState.stars.forEach(star => {
            star.update(deltaTime);
            star.draw();
        });
    }

    if (gameState.health > 0) {
        topUi.style.display = 'flex';
        bottomUi.style.display = 'flex';
        // Wave Spawning Logic
        if (gameState.inWave) {
            if (gameState.enemiesToSpawn > 0) {
                gameState.spawnTimer += deltaTime;
                if (gameState.spawnTimer > gameState.spawnInterval) {
                    const roll = Math.random();
                    const tankChance = Math.min(0.4, (gameState.wave - 2) * 0.1); // Tanks after wave 2
                    const fastChance = Math.min(0.3, (gameState.wave - 4) * 0.1); // Fast after wave 4

                    let enemyType = ENEMY_TYPES.BASIC;
                    const isBossWave = gameState.wave % 5 === 0;

                    if (isBossWave) {
                        // Boss selection
                        const bossIndex = (gameState.wave / 5) % 3;
                        if (bossIndex === 1) enemyType = { ...ENEMY_TYPES.BASIC };
                        else if (bossIndex === 2) enemyType = { ...ENEMY_TYPES.TANK };
                        else enemyType = { ...ENEMY_TYPES.FAST };

                        enemyType.health *= 15 * (gameState.wave / 5);
                        enemyType.isBoss = true;
                        enemyType.speed *= 0.5; // Bosses are a bit slower
                    } else {
                        const octagonChance = Math.min(0.2, (gameState.wave - 6) * 0.05); // Octagons after wave 6

                        if (gameState.wave > 6 && roll < octagonChance) {
                            enemyType = ENEMY_TYPES.OCTAGON;
                        } else if (gameState.wave > 2 && roll < tankChance) {
                            enemyType = ENEMY_TYPES.TANK;
                        } else if (gameState.wave > 4 && roll < tankChance + fastChance) {
                            enemyType = ENEMY_TYPES.FAST;
                        }
                    }

                    gameState.enemies.push(new Enemy(enemyType));
                    gameState.enemiesToSpawn--;
                    gameState.spawnTimer = 0;
                }
            } else if (gameState.enemies.length === 0) {
                // Wave finished
                gameState.inWave = false;
                gameState.wave++;
                gameState.waveTimer = 0;
            }
        }
        // Wave Spawning Logic
        if (!gameState.inWave) {
            gameState.waveTimer += deltaTime;

            // Update Next Wave Countdown
            const remaining = Math.max(0, (gameState.waveDelay - gameState.waveTimer) / 1000);
            nextWaveEl.textContent = `Next in ${remaining.toFixed(1)}s`;

            if (gameState.waveTimer >= gameState.waveDelay) {
                gameState.waveTimer = 0;
                startWave();
            }
        } else {
            nextWaveEl.textContent = ''; // Clear during wave
            gameState.spawnTimer += deltaTime;
        }

        // Shooting
        const attackInterval = 1000 / tower.attackSpeed;
        if (timestamp - tower.lastAttack > attackInterval / gameState.timeScale) {
            const target = findNearestEnemy();
            if (target) {
                gameState.projectiles.push(new Projectile(target));
                tower.lastAttack = timestamp;
            }
        }

        // Draw Range
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.stroke();

        // Update & Draw Tower
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(tower.x - tower.size / 2, tower.y - tower.size / 2, tower.size, tower.size);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(tower.x - tower.size / 2, tower.y - tower.size / 2, tower.size, tower.size);

        // Update & Draw Enemies
        for (let i = gameState.enemies.length - 1; i >= 0; i--) {
            const enemy = gameState.enemies[i];
            enemy.update(deltaTime);
            enemy.draw();
            if (enemy.health <= 0) {
                if (enemy.isBoss) {
                    gameState.gems += 1;
                }
                gameState.money += enemy.value * (1 + permState.money * 0.025);
                gameState.kills++;
                gameState.enemies.splice(i, 1);
            }
        }

        // Update & Draw Projectiles
        for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
            const p = gameState.projectiles[i];
            if (p.update(deltaTime)) {
                gameState.projectiles.splice(i, 1);
            } else {
                p.draw();
            }
        }

        // Update & Draw Particles
        for (let i = gameState.particles.length - 1; i >= 0; i--) {
            const p = gameState.particles[i];
            p.update(deltaTime);
            if (!p.active) {
                particlePool.recycle(p);
                gameState.particles.splice(i, 1);
            } else {
                p.draw();
            }
        }

        // Optimization: Throttle UI updates to every 100ms
        if (timestamp - gameState.lastUI.lastUpdate > 100) {
            updateUI();
            gameState.lastUI.lastUpdate = timestamp;
        }
    } else {
        // Game Over Screen
        topUi.style.display = 'none';
        bottomUi.style.display = 'none';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 48px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = 'white';
        ctx.font = '24px Outfit';
        ctx.fillText(`Kills: ${gameState.kills}`, canvas.width / 2, canvas.height / 2 + 50);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('Press Enter to Reset', canvas.width / 2, canvas.height / 2 + 90);
    }

    requestAnimationFrame(loop);
}

function resetGame() {
    // Reset Game State
    gameState.wave = 1;
    gameState.money = 50;
    // gameState.gems remains (permanent)
    gameState.health = 100;
    gameState.kills = 0;
    gameState.spawnTimer = 0;
    gameState.enemies = [];
    gameState.projectiles = [];
    gameState.particles = [];
    gameState.inWave = false;
    gameState.waveTimer = 0;
    gameState.timeScale = 1;

    // Reset Tower with Permanent Buffs
    tower.damage = 10 * (1 + permState.damage * 0.01);
    tower.range = 200 * (1 + permState.range * 0.01);
    tower.attackSpeed = 1 * (1 + permState.speed * 0.01);
    tower.levels = { damage: 1, range: 1, speed: 1 };
    updateTowerCosts();

    // Reset UI Cache
    gameState.lastUI = {
        wave: -1, money: -1, gems: -1, health: -1, kills: -1,
        dmgCost: -1, rangeCost: -1, speedCost: -1,
        dmgLvl: -1, rangeLvl: -1, speedLvl: -1,
        dmgBtnDisabled: null, rangeBtnDisabled: null, speedBtnDisabled: null,
        pDmgBtnDisabled: null, pRangeBtnDisabled: null, pSpeedBtnDisabled: null,
        pMoneyBtnDisabled: null, pDiscountBtnDisabled: null,
        pMoneyLvl: -1, pDiscountLvl: -1,
        pDmgBonus: '', pRangeBonus: '', pSpeedBonus: '', pMoneyBonus: '', pDiscountBonus: '',
        fps: -1, lastUpdate: 0
    };

    // Show UI
    topUi.style.display = 'flex';
    bottomUi.style.display = 'flex';

    // Reset Speed Control Buttons UI
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.speed === "1") btn.classList.add('active');
    });

    updateUI();
}

// Keybindings for Upgrades
window.addEventListener('keydown', (e) => {
    if (gameState.health <= 0) {
        if (e.key === 'Enter') resetGame();
        return;
    }
    if (e.key === '1' || e.key === '+') dmgBtn.click();
    if (e.key === '2' || e.key === 'ě') rangeBtn.click();
    if (e.key === '3' || e.key === 'š') speedBtn.click();
});

// Shop Controls
shopIcon.onclick = () => shopModal.classList.remove('hidden');
closeShopBtn.onclick = () => shopModal.classList.add('hidden');

// Speed Controls
document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.timeScale = parseFloat(btn.dataset.speed);
    };
});

// Start game
resize();
initStars();
updateTowerCosts();
updateUI();
updateBgUI();
requestAnimationFrame(loop);