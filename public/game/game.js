const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

canvas.width = 480;
canvas.height = 700;

// --- Constants ---
const LANE_COUNT = 4;
const LANE_WIDTH = 72;
const ROAD_WIDTH = LANE_COUNT * LANE_WIDTH;
const SHOULDER = (canvas.width - ROAD_WIDTH) / 2;
const CAR_W = 48;
const CAR_H = 80;
const PLAYER_Y = canvas.height - 140;
const DASH_LEN = 40;
const DASH_GAP = 30;
const BASE_NPC_INTERVAL = 90;
const TOUCH_BTN_H = 60;
const HAS_TOUCH = 'ontouchstart' in window;
const LIVES_MAX = 3;
const INVINCIBLE_FRAMES = 120; // 2 seconds at 60fps
const HEART_LOSS_FRAMES = 30;

// --- Colors ---
const COL = {
  sky:       '#0f3460',
  sand:      '#d4a574',
  road:      '#2c2c2c',
  lane:      '#ffffff',
  player:    '#e74c3c',
  playerAcc: '#c0392b',
  npc:       '#7f8c8d',
  cop:       '#1a5276',
  patrol:    '#f39c12',
  gold:      '#94BA33',
  hud:       '#94BA33',
  flash:     '#ffffaa',
};

// --- Road building templates (#4) ---
const LANDMARK_TEMPLATES = [
  { name: 'burjKhalifa',  w: 26, h: 160 },
  { name: 'burjAlArab',   w: 36, h: 90  },
  { name: 'dubaiFrame',   w: 32, h: 100 },
  { name: 'cayanTower',   w: 22, h: 120 },
  { name: 'museumFuture', w: 56, h: 58  },
  { name: 'camel',        w: 28, h: 45  },
];

// --- Speed milestone messages (#8, #13) ---
const MILESTONE_MSGS = {
  80:  ['YALLA!',        'SHEIKH ZAYED APPROVED'],
  100: ['YALLA HABIBI!', '100 KM/H - MASHALLAH!'],
  120: ['YALLA YALLA!',  'DUBAI SPEED UNLOCKED'],
  140: ['KHALLAS SLOW!',  '140 KM/H - WALLAH!'],
  160: ['MAXIMUM YALLA!','BURJ KHALIFA FAST!'],
};
const MILESTONE_SPEEDS = Object.keys(MILESTONE_MSGS).map(Number);

// --- Audio system (#6) ---
let audioCtx = null;
let audioMuted = (() => { try { return JSON.parse(localStorage.getItem('fk_muted') || 'false'); } catch { return false; } })();
let engineOsc = null;
let engineGain = null;
let audioStarted = false;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  engineGain = audioCtx.createGain();
  engineGain.gain.value = audioMuted ? 0 : 0.08;
  engineGain.connect(audioCtx.destination);
  engineOsc = audioCtx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 80;
  engineOsc.connect(engineGain);
  engineOsc.start();
  audioStarted = true;
}

function playTone(freq, duration, type, vol) {
  if (!audioCtx || audioMuted) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type || 'square';
  osc.frequency.value = freq;
  g.gain.value = vol || 0.15;
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start();
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
  osc.stop(audioCtx.currentTime + duration / 1000 + 0.05);
}

function playNoise(duration, vol) {
  if (!audioCtx || audioMuted) return;
  const bufSize = audioCtx.sampleRate * duration / 1000;
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const g = audioCtx.createGain();
  g.gain.value = vol || 0.1;
  src.connect(g);
  g.connect(audioCtx.destination);
  src.start();
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
}

function soundFlash() { playTone(440, 200, 'square', 0.12); }
function soundLaneSwitch() { playNoise(50, 0.08); }
function soundScoreDing() { playTone(880, 100, 'sine', 0.1); }
function soundCollision() { playTone(100, 200, 'sine', 0.2); }

function soundSiren() {
  if (!audioCtx || audioMuted) return;
  for (let i = 0; i < 4; i++) {
    const t = audioCtx.currentTime + i * 0.3;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.setValueAtTime(800, t + 0.15);
    g.gain.value = 0.08;
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }
}

function updateEngine() {
  if (!engineOsc || !engineGain) return;
  engineOsc.frequency.value = 80 + speed * 8;
  engineGain.gain.value = (audioMuted || state !== 'playing') ? 0 : 0.08;
}

function toggleMute() {
  audioMuted = !audioMuted;
  try { localStorage.setItem('fk_muted', JSON.stringify(audioMuted)); } catch {}
  if (engineGain) engineGain.gain.value = audioMuted ? 0 : 0.08;
}

// --- Leaderboard (#11) ---
function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem('fk_leaderboard') || '[]'); }
  catch { return []; }
}

function saveLeaderboard(lb) {
  try { localStorage.setItem('fk_leaderboard', JSON.stringify(lb.slice(0, 10))); } catch {}
}

function isHighScore(s) {
  const lb = loadLeaderboard();
  return lb.length < 10 || s > lb[lb.length - 1].score;
}

function addLeaderboardEntry(initials, s) {
  const lb = loadLeaderboard();
  const today = new Date();
  const dateStr = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
  lb.push({ initials, score: s, date: dateStr });
  lb.sort((a, b) => b.score - a.score);
  saveLeaderboard(lb.slice(0, 10));
}

// --- High score (#5) ---
function loadHighScore() {
  try { return parseInt(localStorage.getItem('fk_highscore') || '0', 10); }
  catch { return 0; }
}

function saveHighScore(s) {
  try { if (s > loadHighScore()) localStorage.setItem('fk_highscore', String(s)); } catch {}
}

// --- State ---
let state = 'title';  // title | playing | gameover | initials | leaderboard
let playerLane = 1;
let playerX = laneToX(1);
let score = 0;
let distance = 0;
let roadOffset = 0;
let speed = 4;
let npcTimer = 0;
let flashTimer = 0;
let npcs = [];
let keys = {};
let frameTick = 0;
let lives = LIVES_MAX;
let invincibleTimer = 0;
let heartLossTimer = 0;


// Combo system (#5)
let comboCount = 0;
let comboMultiplier = 1;
let lastFlashTime = 0;
let comboPulse = 0;
let distScoreAccum = 0;

// Road buildings (#4)
let roadBuildings = [];
let buildingDistAccum = 0;
let nextBuildingDist = 200;

// Parallax background scroll offsets
let bgScrollX = 0;
let midScrollX = 0;

// Difficulty (#8)
let npcSpawnInterval = BASE_NPC_INTERVAL;
let speedMilestones = [];
let yallaText = '';
let yallaSubText = '';
let yallaTimer = 0;
let yallaFlashTimer = 0;
let rushCooldown = 0;

// Power-ups (#9)
let powerUps = [];
let powerUpDistAccum = 0;
let nextPowerUpDist = 800;
let shieldActive = false;
let turboTimer = 0;
let doubleFlashActive = false;

// Leaderboard initials entry (#11)
let initialsArr = [0, 0, 0]; // A=0, B=1, ...
let initialsPos = 0;
let showLeaderboardOnTitle = false;

// --- NPC types: regular, cop, patrol ---
function spawnNPC() {
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const roll = Math.random();

  // Difficulty-adjusted chances (#8)
  const copChance = Math.min(0.15 + Math.floor(distance / 1000) * 0.02, 0.35);
  const patrolChance = 0.15;

  let type = 'regular';
  if (roll > 1 - copChance) type = 'cop';
  else if (roll > 1 - copChance - patrolChance) type = 'patrol';

  npcs.push({
    lane,
    x: laneToX(lane),
    y: -CAR_H,
    type,
    speed: type === 'patrol' ? speed * 0.6 : speed * 0.7,
    flashed: false,
    fleeing: false,
  });
}

function spawnRush() {
  const lanes = [];
  while (lanes.length < 3) {
    const l = Math.floor(Math.random() * LANE_COUNT);
    if (!lanes.includes(l)) lanes.push(l);
  }
  for (const lane of lanes) {
    npcs.push({
      lane, x: laneToX(lane), y: -CAR_H,
      type: 'regular',
      speed: speed * 0.7,
      flashed: false, fleeing: false,
    });
  }
}

function laneToX(lane) {
  return SHOULDER + lane * LANE_WIDTH + (LANE_WIDTH - CAR_W) / 2;
}

// --- Road building spawner (#4) ---
function spawnRoadBuilding() {
  const tmpl = LANDMARK_TEMPLATES[Math.floor(Math.random() * LANDMARK_TEMPLATES.length)];
  const side = Math.random() < 0.5 ? 'left' : 'right';
  const x = side === 'left'
    ? Math.random() * (SHOULDER - tmpl.w - 4) + 2
    : SHOULDER + ROAD_WIDTH + 4 + Math.random() * (SHOULDER - tmpl.w - 6);
  roadBuildings.push({
    x, y: -tmpl.h, w: tmpl.w, h: tmpl.h, name: tmpl.name,
  });
}

// --- Power-up spawner (#9) ---
function spawnPowerUp() {
  const types = ['shield', 'turbo', 'doubleFlash'];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * LANE_COUNT);
  powerUps.push({
    type,
    lane,
    x: laneToX(lane) + CAR_W / 2,
    y: -30,
    bobOffset: Math.random() * Math.PI * 2,
  });
}

// --- Input ---
window.addEventListener('keydown', (e) => {
  if (!audioStarted && (e.key === ' ' || e.key === 'Enter' || e.key.startsWith('Arrow'))) {
    initAudio();
  }
  keys[e.key] = true;

  if (state === 'title') {
    if (e.key === 'l' || e.key === 'L') {
      showLeaderboardOnTitle = !showLeaderboardOnTitle;
      return;
    }
    if (showLeaderboardOnTitle) {
      if (e.key === 'Escape') showLeaderboardOnTitle = false;
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') startGame();
    return;
  }

  if (state === 'gameover') {
    if (e.key === ' ' || e.key === 'Enter') resetGame();
    return;
  }

  if (state === 'initials') {
    if (e.key === 'ArrowUp') {
      initialsArr[initialsPos] = (initialsArr[initialsPos] + 1) % 26;
    } else if (e.key === 'ArrowDown') {
      initialsArr[initialsPos] = (initialsArr[initialsPos] + 25) % 26;
    } else if (e.key === 'ArrowRight') {
      initialsPos = Math.min(initialsPos + 1, 2);
    } else if (e.key === 'ArrowLeft') {
      initialsPos = Math.max(initialsPos - 1, 0);
    } else if (e.key === 'Enter') {
      const initials = initialsArr.map(i => String.fromCharCode(65 + i)).join('');
      addLeaderboardEntry(initials, score);
      state = 'gameover';
    }
    return;
  }

  if (state === 'leaderboard') {
    if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
      state = 'title';
    }
    return;
  }

  if (state === 'playing') {
    if (e.key === 'ArrowLeft') {
      if (playerLane > 0) { playerLane--; soundLaneSwitch(); }
    }
    if (e.key === 'ArrowRight') {
      if (playerLane < LANE_COUNT - 1) { playerLane++; soundLaneSwitch(); }
    }
    if (e.key === ' ' || e.key === 'f') {
      doFlash();
    }
  }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// --- Touch controls ---
let touchStartX = null;
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (!audioStarted) initAudio();
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  const scaleX = canvas.width / rect.width;
  const ty = (e.touches[0].clientY - rect.top) * scaleY;
  const tx = (e.touches[0].clientX - rect.left) * scaleX;

  if (state === 'title') {
    if (showLeaderboardOnTitle) { showLeaderboardOnTitle = false; return; }
    startGame();
    return;
  }
  if (state === 'gameover') { resetGame(); return; }
  if (state === 'initials') {
    handleInitialsTouch(tx, ty);
    return;
  }

  // Check if touch is in button area (bottom of canvas)
  if (HAS_TOUCH && state === 'playing' && ty > canvas.height - TOUCH_BTN_H) {
    if (tx < canvas.width / 3) {
      if (playerLane > 0) { playerLane--; soundLaneSwitch(); }
    } else if (tx > canvas.width * 2 / 3) {
      if (playerLane < LANE_COUNT - 1) { playerLane++; soundLaneSwitch(); }
    } else {
      doFlash();
    }
    return;
  }

  // Check mute button
  if (tx > canvas.width - 36 && ty < 30) {
    toggleMute();
    return;
  }

  touchStartX = e.touches[0].clientX;
});

canvas.addEventListener('touchmove', (e) => { e.preventDefault(); });

canvas.addEventListener('touchend', (e) => {
  if (touchStartX === null || state !== 'playing') return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 30) {
    if (dx < 0 && playerLane > 0) { playerLane--; soundLaneSwitch(); }
    if (dx > 0 && playerLane < LANE_COUNT - 1) { playerLane++; soundLaneSwitch(); }
  } else {
    doFlash();
  }
  touchStartX = null;
});

// Mute button click (for non-touch)
canvas.addEventListener('click', (e) => {
  if (!audioStarted) initAudio();
  const rect = canvas.getBoundingClientRect();
  const tx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const ty = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (tx > canvas.width - 36 && ty < 30) {
    toggleMute();
  }
});

function handleInitialsTouch(tx, ty) {
  const cx = canvas.width / 2;
  const baseY = 340;
  // Up area
  if (ty > baseY - 40 && ty < baseY) {
    const pos = tx < cx - 30 ? 0 : tx > cx + 30 ? 2 : 1;
    initialsArr[pos] = (initialsArr[pos] + 1) % 26;
    initialsPos = pos;
  }
  // Down area
  if (ty > baseY + 20 && ty < baseY + 50) {
    const pos = tx < cx - 30 ? 0 : tx > cx + 30 ? 2 : 1;
    initialsArr[pos] = (initialsArr[pos] + 25) % 26;
    initialsPos = pos;
  }
  // Confirm
  if (ty > baseY + 60 && ty < baseY + 90) {
    const initials = initialsArr.map(i => String.fromCharCode(65 + i)).join('');
    addLeaderboardEntry(initials, score);
    state = 'gameover';
  }
}

function startGame() {
  state = 'playing';
  score = 0;
  distance = 0;
  speed = 4;
  npcs = [];
  npcTimer = 0;
  playerLane = 1;
  playerX = laneToX(1);
  comboCount = 0;
  comboMultiplier = 1;
  lastFlashTime = 0;
  comboPulse = 0;
  distScoreAccum = 0;
  roadBuildings = [];
  buildingDistAccum = 0;
  nextBuildingDist = 200;
  npcSpawnInterval = BASE_NPC_INTERVAL;
  speedMilestones = [];
  yallaText = '';
  yallaSubText = '';
  yallaTimer = 0;
  yallaFlashTimer = 0;
  rushCooldown = 0;
  powerUps = [];
  powerUpDistAccum = 0;
  nextPowerUpDist = 800;
  shieldActive = false;
  turboTimer = 0;
  doubleFlashActive = false;
  showLeaderboardOnTitle = false;
  frameTick = 0;
  lives = LIVES_MAX;
  invincibleTimer = 0;
  heartLossTimer = 0;
}

function resetGame() {
  startGame();
}

function doFlash() {
  if (flashTimer > 0) return;
  flashTimer = 15;
  soundFlash();

  if (doubleFlashActive) {
    // Double flash: clear ALL cars ahead in the lane
    const targets = npcs.filter(
      (n) => n.lane === playerLane && n.y > PLAYER_Y - 300 && n.y < PLAYER_Y && !n.flashed
    );
    doubleFlashActive = false;
    if (!targets.length) return;
    let flashedCop = false;
    for (const t of targets) {
      t.flashed = true;
      if (t.type === 'regular') {
        t.fleeing = true;
        comboCount++;
        comboMultiplier = Math.min(comboCount, 5);
        score += 10 * comboMultiplier;
        lastFlashTime = frameTick;
        soundScoreDing();
      } else if (t.type === 'cop') {
        flashedCop = true;
      } else if (t.type === 'patrol') {
        t.speed = speed * 2;
        t.fleeing = true;
      }
    }
    if (flashedCop) { soundSiren(); if (invincibleTimer <= 0) takeHit(); }
    return;
  }

  const ahead = npcs.find(
    (n) => n.lane === playerLane && n.y > PLAYER_Y - 250 && n.y < PLAYER_Y && !n.flashed
  );
  if (!ahead) return;

  ahead.flashed = true;
  if (ahead.type === 'regular') {
    ahead.fleeing = true;
    comboCount++;
    comboMultiplier = Math.min(comboCount, 5);
    score += 10 * comboMultiplier;
    lastFlashTime = frameTick;
    soundScoreDing();
  } else if (ahead.type === 'cop') {
    soundSiren();
    if (invincibleTimer <= 0) takeHit();
  } else if (ahead.type === 'patrol') {
    ahead.speed = speed * 2;
    ahead.fleeing = true;
  }
}

function triggerGameOver() {
  saveHighScore(score);
  if (isHighScore(score) && score > 0) {
    state = 'initials';
    initialsArr = [0, 0, 0];
    initialsPos = 0;
  } else {
    state = 'gameover';
  }
}

function takeHit() {
  // Shield consumed by collision loop for NPC hits; check here for cop-flash case
  if (shieldActive) {
    shieldActive = false;
    soundCollision();
    return;
  }
  comboCount = 0;
  comboMultiplier = 1;
  soundCollision();
  lives--;
  heartLossTimer = HEART_LOSS_FRAMES;
  if (lives <= 0) {
    triggerGameOver();
  } else {
    invincibleTimer = INVINCIBLE_FRAMES;
  }
}

// --- Update ---
function update() {
  if (state !== 'playing') return;

  frameTick++;
  const effectiveSpeed = turboTimer > 0 ? speed * 1.5 : speed;
  distance += effectiveSpeed;
  distScoreAccum += effectiveSpeed;

  // Distance-based score (#5)
  while (distScoreAccum >= 100) {
    score += 1;
    distScoreAccum -= 100;
  }

  // Speed increase
  if (frameTick % 300 === 0) speed = Math.min(speed + 0.3, 12);

  // Difficulty: spawn interval (#8)
  npcSpawnInterval = Math.max(30, BASE_NPC_INTERVAL - Math.floor(distance / 500));

  // Speed milestones (#8, #13)
  const kmh = Math.floor(speed * 20);
  for (const m of MILESTONE_SPEEDS) {
    if (kmh >= m && !speedMilestones.includes(m)) {
      speedMilestones.push(m);
      [yallaText, yallaSubText] = MILESTONE_MSGS[m];
      yallaTimer = 120;
      yallaFlashTimer = 12;
    }
  }
  if (yallaTimer > 0) yallaTimer--;
  if (yallaFlashTimer > 0) yallaFlashTimer--;

  // Rush spawns (#8)
  if (distance > 3000) {
    rushCooldown--;
    if (rushCooldown <= 0 && Math.random() < 0.003) {
      spawnRush();
      rushCooldown = 300;
    }
  }

  // Combo timeout (#5)
  comboPulse++;
  if (comboCount > 0 && frameTick - lastFlashTime > 300) {
    comboCount = 0;
    comboMultiplier = 1;
  }

  // Turbo timer (#9)
  if (turboTimer > 0) turboTimer--;

  // Player movement
  const targetX = laneToX(playerLane);
  playerX += (targetX - playerX) * 0.2;

  roadOffset = (roadOffset + effectiveSpeed) % (DASH_LEN + DASH_GAP);

  // NPC spawning
  npcTimer++;
  if (npcTimer >= npcSpawnInterval) {
    spawnNPC();
    npcTimer = 0;
  }

  // NPC update
  for (const npc of npcs) {
    const relSpeed = npc.fleeing ? -effectiveSpeed * 0.5 : effectiveSpeed - npc.speed;
    npc.y += relSpeed;
    if (npc.fleeing) {
      const targetNpcX = laneToX(Math.min(npc.lane + 1, LANE_COUNT - 1));
      npc.x += (targetNpcX - npc.x) * 0.1;
    }
  }
  npcs = npcs.filter((n) => n.y < canvas.height + 100 && n.y > -200);

  // Collision detection
  for (const npc of npcs) {
    if (npc.flashed || npc.fleeing) continue;
    if (
      Math.abs(npc.x - playerX) < CAR_W * 0.8 &&
      Math.abs(npc.y - PLAYER_Y) < CAR_H * 0.8
    ) {
      if (invincibleTimer > 0) continue;
      if (turboTimer > 0) continue;
      if (shieldActive) {
        shieldActive = false;
        npc.flashed = true;
        npc.fleeing = true;
        soundCollision();
        continue;
      }
      takeHit();
      if (state !== 'playing') return;
      break;
    }
  }

  // Power-up spawning (#9)
  powerUpDistAccum += effectiveSpeed;
  if (powerUpDistAccum >= nextPowerUpDist) {
    spawnPowerUp();
    powerUpDistAccum = 0;
    nextPowerUpDist = 800 + Math.random() * 400;
  }

  // Power-up movement & pickup
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const pu = powerUps[i];
    pu.y += effectiveSpeed;
    if (pu.y > canvas.height + 50) { powerUps.splice(i, 1); continue; }
    // Pickup check
    if (
      Math.abs(pu.x - (playerX + CAR_W / 2)) < 28 &&
      Math.abs(pu.y - (PLAYER_Y + CAR_H / 2)) < 40
    ) {
      if (pu.type === 'shield') shieldActive = true;
      else if (pu.type === 'turbo') turboTimer = 180; // 3 seconds at 60fps
      else if (pu.type === 'doubleFlash') doubleFlashActive = true;
      soundScoreDing();
      powerUps.splice(i, 1);
    }
  }

  // Road buildings (#4)
  buildingDistAccum += effectiveSpeed;
  if (buildingDistAccum >= nextBuildingDist) {
    spawnRoadBuilding();
    buildingDistAccum = 0;
    nextBuildingDist = 200 + Math.random() * 200;
  }
  for (const b of roadBuildings) {
    b.y += effectiveSpeed * 0.3;
  }
  roadBuildings = roadBuildings.filter(b => b.y < canvas.height + 50);

  if (flashTimer > 0) flashTimer--;
  if (invincibleTimer > 0) invincibleTimer--;
  if (heartLossTimer > 0) heartLossTimer--;

  updateEngine();
}

// ============================================================
// DRAW HELPERS
// ============================================================

// ============================================================
// DUBAI PARALLAX BACKGROUND HELPERS
// ============================================================

function drawPalmSilhouette(ox) {
  const px = ox + 120;
  const groundY = 130;
  ctx.fillStyle = '#050d1a';
  ctx.strokeStyle = '#050d1a';

  // Artificial crescent island base
  ctx.beginPath();
  ctx.arc(px, groundY - 4, 55, Math.PI, 0);
  ctx.fill();

  // Palm trunk
  ctx.fillRect(px - 2, groundY - 42, 4, 38);

  // Fronds fanning out
  ctx.lineWidth = 2;
  const fronds = [
    [-75, 30], [-55, 35], [-38, 38], [-20, 36], [-5, 33],
    [5, 33], [20, 36], [38, 38], [55, 35], [75, 30],
  ];
  for (const [angle, len] of fronds) {
    const rad = (angle - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(px, groundY - 42);
    ctx.lineTo(px + Math.cos(rad) * len, groundY - 42 + Math.sin(rad) * len);
    ctx.stroke();
  }
}

function drawBurjKhalifaBg(cx, baseline) {
  ctx.fillStyle = '#0e2245';
  ctx.fillRect(cx - 11, baseline - 62,  22, 62);
  ctx.fillRect(cx - 8,  baseline - 90,  16, 28);
  ctx.fillRect(cx - 5,  baseline - 108, 10, 18);
  ctx.fillRect(cx - 3,  baseline - 118,  6, 10);
  ctx.fillRect(cx - 1,  baseline - 130,  2, 30);
  ctx.fillStyle = '#2a1a00';
  ctx.fillRect(cx - 1,  baseline - 130,  2,  6);
  // Tiny crane silhouette (meme: always under construction)
  ctx.strokeStyle = '#0e2245';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, baseline - 130);
  ctx.lineTo(cx, baseline - 137);
  ctx.lineTo(cx + 9, baseline - 137);
  ctx.stroke();
}

function drawDubaiFrameBg(cx, baseline) {
  ctx.fillStyle = '#3d2a04';
  ctx.fillRect(cx - 16, baseline - 75,  5, 75);
  ctx.fillRect(cx + 11, baseline - 75,  5, 75);
  ctx.fillRect(cx - 16, baseline - 75, 32,  6);
  ctx.fillStyle = '#050e1e';
  ctx.fillRect(cx - 11, baseline - 69, 22, 69);
}

function drawSkyline() {
  // Layer 1: Far — Palm Jumeirah silhouette (very slow scroll)
  const palmTW = 240;
  const palmOff = bgScrollX % palmTW;
  for (let i = 0; i <= Math.ceil(canvas.width / palmTW); i++) {
    drawPalmSilhouette(i * palmTW - palmOff);
  }

  // Layer 2: Mid — Dubai city skyline (medium scroll, 480px tile)
  const midTW = 480;
  const midOff = midScrollX % midTW;
  for (let rep = 0; rep <= 1; rep++) {
    const ox = rep * midTW - midOff;

    ctx.fillStyle = '#0e2245';
    ctx.fillRect(ox + 5,   130 - 38, 14, 38);
    ctx.fillRect(ox + 22,  130 - 50, 10, 50);
    ctx.fillRect(ox + 38,  130 - 42, 16, 42);

    drawBurjKhalifaBg(ox + 90, 130);

    ctx.fillStyle = '#0e2245';
    ctx.fillRect(ox + 140, 130 - 45, 12, 45);
    ctx.fillRect(ox + 162, 130 - 33, 18, 33);
    ctx.fillRect(ox + 188, 130 - 52, 10, 52);
    ctx.fillRect(ox + 210, 130 - 38, 14, 38);

    drawDubaiFrameBg(ox + 260, 130);

    ctx.fillStyle = '#0e2245';
    ctx.fillRect(ox + 305, 130 - 40, 16, 40);
    ctx.fillRect(ox + 330, 130 - 55, 12, 55);
    ctx.fillRect(ox + 352, 130 - 35, 20, 35);
    ctx.fillRect(ox + 388, 130 - 45, 10, 45);
    ctx.fillRect(ox + 412, 130 - 42, 14, 42);
    ctx.fillRect(ox + 435, 130 - 60,  8, 60);
    ctx.fillRect(ox + 455, 130 - 35, 16, 35);
  }
}

function drawRoad() {
  ctx.fillStyle = COL.sand;
  ctx.fillRect(0, 130, canvas.width, canvas.height - 130);

  ctx.fillStyle = COL.road;
  ctx.fillRect(SHOULDER, 130, ROAD_WIDTH, canvas.height - 130);

  ctx.fillStyle = '#444';
  ctx.fillRect(SHOULDER - 4, 130, 4, canvas.height - 130);
  ctx.fillRect(SHOULDER + ROAD_WIDTH, 130, 4, canvas.height - 130);

  ctx.strokeStyle = COL.lane;
  ctx.lineWidth = 2;
  ctx.setLineDash([DASH_LEN, DASH_GAP]);
  ctx.lineDashOffset = -roadOffset;
  for (let i = 1; i < LANE_COUNT; i++) {
    const x = SHOULDER + i * LANE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(x, 130);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

// --- Speed lines (#8) ---
function drawSpeedLines() {
  const kmh = Math.floor(speed * 20);
  if (kmh <= 120) return;
  const intensity = Math.min((kmh - 120) / 40, 1);
  ctx.save();
  ctx.globalAlpha = intensity * 0.4;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  const lineCount = Math.floor(4 + intensity * 6);
  for (let i = 0; i < lineCount; i++) {
    const offsetY = (frameTick * (6 + i * 2) + i * 97) % (canvas.height - 130);
    const x = i % 2 === 0 ? SHOULDER - 8 : SHOULDER + ROAD_WIDTH + 5;
    ctx.beginPath();
    ctx.moveTo(x, 130 + offsetY);
    ctx.lineTo(x, 130 + offsetY + 20 + intensity * 15);
    ctx.stroke();
  }
  ctx.restore();
}

// --- Road buildings drawing (#4) — Dubai landmarks in meme pixel art ---
function drawRoadBuilding(b) {
  const bx = b.x;
  const by = b.y;
  const cx = bx + b.w / 2;
  const bot = by + b.h;

  if (b.name === 'burjKhalifa') {
    // Comically tall stepped tower — exaggerated proportions
    ctx.fillStyle = '#0d2244';
    ctx.fillRect(cx - 13, bot - 96, 26, 96);     // wide base (60%)
    ctx.fillStyle = '#102850';
    ctx.fillRect(cx - 10, bot - 120, 20, 24);    // tier 2
    ctx.fillStyle = '#122a54';
    ctx.fillRect(cx - 7,  bot - 136, 14, 16);    // tier 3
    ctx.fillStyle = '#1a3868';
    ctx.fillRect(cx - 4,  bot - 147,  8, 11);    // tier 4
    ctx.fillStyle = '#0e2244';
    ctx.fillRect(cx - 1,  by,          2, 13);   // spire
    ctx.fillStyle = '#94BA33';
    ctx.fillRect(cx - 1,  by,          2,  3);   // gold needle tip

    // Gold accent bands at tier steps
    ctx.fillStyle = '#5a7a1a';
    ctx.fillRect(cx - 13, bot - 97,  26, 2);
    ctx.fillRect(cx - 10, bot - 121, 20, 2);
    ctx.fillRect(cx - 7,  bot - 137, 14, 2);
    ctx.fillRect(cx - 4,  bot - 148,  8, 2);

    // Amber window grid
    ctx.fillStyle = 'rgba(200, 150, 40, 0.55)';
    for (let wy = bot - 92; wy < bot - 4; wy += 9) {
      for (let wx = cx - 11; wx < cx + 11; wx += 6) {
        ctx.fillRect(wx, wy, 2, 5);
      }
    }

    // Meme: permanent construction crane at the very top
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 1, by + 12);
    ctx.lineTo(cx + 1, by - 8);      // vertical mast
    ctx.lineTo(cx + 15, by - 8);     // horizontal boom
    ctx.lineTo(cx - 5,  by - 8);     // counter-weight arm
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 12, by - 8);
    ctx.lineTo(cx + 12, by - 2);     // hanging cable
    ctx.stroke();
    ctx.fillStyle = '#666';
    ctx.fillRect(cx + 10, by - 2, 5, 4); // load block

  } else if (b.name === 'burjAlArab') {
    // Iconic sail shape — convex right side, helipad, tiny yacht
    // Platform stilt on artificial island
    ctx.fillStyle = '#0d2244';
    ctx.fillRect(cx - 5, bot - 10,  10,  10);
    ctx.fillRect(bx - 4, bot - 15, b.w + 8, 6);

    // Main sail (left nearly straight, right bulges outward)
    ctx.fillStyle = '#102850';
    ctx.beginPath();
    ctx.moveTo(bx + 4,       bot - 15);
    ctx.lineTo(bx + b.w - 4, bot - 15);
    ctx.quadraticCurveTo(bx + b.w + 14, by + b.h * 0.45, bx + b.w - 4, by + 8);
    ctx.lineTo(bx + 4,       by + 8);
    ctx.closePath();
    ctx.fill();

    // Horizontal floor striations
    ctx.fillStyle = '#0a1c3a';
    for (let wy = by + 12; wy < bot - 18; wy += 6) {
      ctx.fillRect(bx + 5, wy, b.w - 10, 3);
    }

    // Helipad platform
    ctx.fillStyle = '#1a3060';
    ctx.fillRect(bx, by, b.w, 8);
    ctx.strokeStyle = '#94BA33';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, by + 4, 7, 0, Math.PI * 2);
    ctx.stroke();
    // H marking
    ctx.fillStyle = '#94BA33';
    ctx.fillRect(cx - 4, by + 1, 2, 6);
    ctx.fillRect(cx + 2, by + 1, 2, 6);
    ctx.fillRect(cx - 4, by + 3, 8, 2);

    // Meme: tiny helicopter on the helipad
    ctx.fillStyle = '#bbb';
    ctx.fillRect(cx + 3, by + 1, 7, 3);
    ctx.fillRect(cx + 1, by + 1, 2, 2);
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 2, by);
    ctx.lineTo(cx + 13, by);
    ctx.stroke();

    // Meme: tiny luxury yacht below
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx - 14, bot - 10, 12, 5);
    ctx.fillStyle = '#94BA33';
    ctx.fillRect(bx - 9, bot - 16,  1,  6);
    ctx.beginPath();
    ctx.moveTo(bx - 9, bot - 16);
    ctx.lineTo(bx - 4, bot - 11);
    ctx.lineTo(bx - 9, bot - 11);
    ctx.fillStyle = '#fff';
    ctx.fill();

  } else if (b.name === 'dubaiFrame') {
    // Giant gold picture frame — two towers + sky bridge
    const colW = 5;
    const gold = '#5a7a1a';

    ctx.fillStyle = gold;
    ctx.fillRect(bx,            by, colW,  b.h);     // left column
    ctx.fillRect(bx + b.w - colW, by, colW,  b.h);  // right column
    ctx.fillRect(bx,            by, b.w,    8);       // top bridge
    ctx.fillRect(bx,            by + b.h - 6, b.w, 6); // base

    // Glass inner panel
    ctx.fillStyle = '#061018';
    ctx.fillRect(bx + colW, by + 8, b.w - colW * 2, b.h - 14);

    // Observation deck glare (top portion)
    ctx.fillStyle = 'rgba(100, 150, 220, 0.18)';
    ctx.fillRect(bx + colW, by + 8, b.w - colW * 2, 14);

    // Mini-Dubai skyline painted inside the glass
    ctx.fillStyle = '#0a1e3a';
    ctx.fillRect(bx + colW + 2, by + b.h - 22, 3, 14);
    ctx.fillRect(bx + colW + 7, by + b.h - 28, 2, 20);
    ctx.fillRect(bx + colW + 11, by + b.h - 18, 4, 10);
    ctx.fillRect(bx + b.w - colW - 7, by + b.h - 22, 3, 14);

    // Gold accent lines
    ctx.fillStyle = '#94BA33';
    ctx.fillRect(bx + 1, by + 1, b.w - 2, 2);
    ctx.fillRect(bx + 1, by + b.h - 3, b.w - 2, 2);

    // Column rivet detail
    ctx.fillStyle = '#3a5a0a';
    for (let wy = by + 12; wy < by + b.h - 8; wy += 12) {
      ctx.fillRect(bx, wy, colW, 2);
      ctx.fillRect(bx + b.w - colW, wy, colW, 2);
    }

  } else if (b.name === 'cayanTower') {
    // Twisted tower — each floor band is progressively rotated
    const numFloors = 12;
    const floorH = b.h / numFloors;

    for (let i = 0; i < numFloors; i++) {
      const t = (numFloors - 1 - i) / (numFloors - 1); // 1=bottom, 0=top
      const twist = (t - 0.5) * 10;
      const fy = by + i * floorH;
      const r = Math.round(13 + i * 2);
      const g = Math.round(34 + i * 3);
      const bl = Math.round(68 + i * 4);
      ctx.fillStyle = `rgb(${r},${g},${bl})`;
      ctx.fillRect(cx - b.w / 2 + twist, fy, b.w, floorH + 1);
      // Window band
      ctx.fillStyle = 'rgba(80,130,220,0.30)';
      ctx.fillRect(cx - b.w / 2 + twist + 2, fy + 1, b.w - 4, floorH - 2);
      // Floor divider
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(cx - b.w / 2 + twist, fy + floorH - 1, b.w, 1);
    }

    // Gold twist stripe running up the building
    ctx.strokeStyle = '#5a7a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= numFloors; i++) {
      const t = (numFloors - i) / numFloors;
      const twist = (t - 0.5) * 10;
      const fy = by + i * (b.h / numFloors);
      if (i === 0) ctx.moveTo(cx + twist, fy);
      else ctx.lineTo(cx + twist, fy);
    }
    ctx.stroke();

    // Rooftop antenna + red blinker
    ctx.fillStyle = '#888';
    ctx.fillRect(cx - 1, by - 5, 2, 5);
    ctx.fillStyle = (frameTick % 40 < 20) ? '#e74c3c' : '#333';
    ctx.fillRect(cx - 1, by - 5, 2, 2);

  } else if (b.name === 'museumFuture') {
    // Iconic torus / ring shape with calligraphy suggestion
    const mcx = bx + b.w / 2;
    const mcy = by + b.h / 2;
    const rx  = b.w / 2;
    const ry  = b.h / 2;
    const hrx = rx * 0.52;
    const hry = ry * 0.52;

    // Outer ring fill
    ctx.fillStyle = '#0a2040';
    ctx.beginPath();
    ctx.ellipse(mcx, mcy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // Inner hole
    ctx.fillStyle = '#061018';
    ctx.beginPath();
    ctx.ellipse(mcx, mcy, hrx, hry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Gold outer rim
    ctx.strokeStyle = '#5a7a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(mcx, mcy, rx - 1, ry - 1, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Calligraphy suggestion — gold lines in the ring band
    ctx.strokeStyle = '#94BA33';
    ctx.lineWidth = 1;
    for (let row = 0; row < 3; row++) {
      const gy = mcy - ry * 0.25 + row * ry * 0.25;
      const dyN = (gy - mcy) / ry;
      const xOut = rx  * Math.sqrt(Math.max(0, 1 - dyN * dyN));
      const dyNH = (gy - mcy) / hry;
      const xIn  = Math.abs(dyNH) < 1 ? hrx * Math.sqrt(Math.max(0, 1 - dyNH * dyNH)) : 0;
      if (xOut > xIn + 3) {
        ctx.beginPath();
        ctx.moveTo(mcx - xOut + 2, gy);
        ctx.lineTo(mcx - xIn  - 2, gy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mcx + xIn  + 2, gy);
        ctx.lineTo(mcx + xOut - 2, gy);
        ctx.stroke();
      }
    }

    // Inner hole edge highlight
    ctx.strokeStyle = '#0d3060';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(mcx, mcy, hrx - 1, hry - 1, 0, 0, Math.PI * 2);
    ctx.stroke();

  } else if (b.name === 'camel') {
    // Pixel-art camel strutting through the desert — meme energy
    ctx.fillStyle = '#c8a450';
    // Body
    ctx.fillRect(bx + 2, by + 8, 18, 8);
    // Hump
    ctx.fillRect(bx + 4, by + 4,  6, 6);
    ctx.fillRect(bx + 5, by + 3,  4, 2);
    // Neck
    ctx.fillRect(bx + 18, by + 5, 4, 8);
    // Head
    ctx.fillRect(bx + 20, by + 2, 6, 5);
    // Snout / camel lip (exaggerated)
    ctx.fillRect(bx + 25, by + 5, 2, 3);
    // Eye
    ctx.fillStyle = '#222';
    ctx.fillRect(bx + 22, by + 3, 1, 1);
    // Legs (4)
    ctx.fillStyle = '#b89040';
    ctx.fillRect(bx + 4,  by + 15, 2, 5);
    ctx.fillRect(bx + 9,  by + 15, 2, 5);
    ctx.fillRect(bx + 14, by + 15, 2, 5);
    ctx.fillRect(bx + 18, by + 15, 2, 5);
    // Tail
    ctx.fillStyle = '#c8a450';
    ctx.fillRect(bx,      by + 9,  3, 2);
    ctx.fillRect(bx,      by + 11, 2, 2);

  } else {
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(bx, by, b.w, b.h);
  }
}

function drawRoadBuildings() {
  for (const b of roadBuildings) {
    drawRoadBuilding(b);
  }
}

// ============================================================
// PIXEL ART CAR SPRITES (#10)
// ============================================================

function drawCarSprite(x, y, type) {
  const px = 4; // pixel cell size

  if (type === 'player') {
    // Red sports car — sleek body
    ctx.fillStyle = '#e74c3c';
    // Main body
    ctx.fillRect(x + 8, y + 8, 32, 64);
    // Nose taper
    ctx.fillRect(x + 12, y + 4, 24, 8);
    // Rear taper
    ctx.fillRect(x + 12, y + 68, 24, 8);
    // Darker accent
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x + 12, y + 16, 24, 12);
    // Windshield
    ctx.fillStyle = '#5dade2';
    ctx.fillRect(x + 14, y + 18, 20, 8);
    // Rear window
    ctx.fillStyle = '#3498db';
    ctx.fillRect(x + 16, y + 56, 16, 6);
    // Side mirrors
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x + 4, y + 20, 4, 6);
    ctx.fillRect(x + 40, y + 20, 4, 6);
    // Rear spoiler
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 10, y + 72, 28, 4);
    ctx.fillRect(x + 8, y + 72, 4, 4);
    ctx.fillRect(x + 36, y + 72, 4, 4);
    // Headlights
    ctx.fillStyle = '#ff6';
    ctx.fillRect(x + 12, y + 4, 6, 4);
    ctx.fillRect(x + 30, y + 4, 6, 4);
    // Taillights
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x + 12, y + 72, 6, 2);
    ctx.fillRect(x + 30, y + 72, 6, 2);
    // Wheels
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 4, y + 12, 6, 12);
    ctx.fillRect(x + 38, y + 12, 6, 12);
    ctx.fillRect(x + 4, y + 58, 6, 12);
    ctx.fillRect(x + 38, y + 58, 6, 12);

    // Shield indicator (#9)
    if (shieldActive) {
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, CAR_W - 4, CAR_H - 4);
    }

  } else if (type === 'regular') {
    // Grey sedan — boxy
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(x + 8, y + 8, 32, 64);
    ctx.fillRect(x + 10, y + 4, 28, 8);
    ctx.fillRect(x + 10, y + 68, 28, 8);
    // Accent
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(x + 10, y + 20, 28, 16);
    // Windows
    ctx.fillStyle = '#5dade2';
    ctx.fillRect(x + 12, y + 22, 10, 10);
    ctx.fillRect(x + 26, y + 22, 10, 10);
    // Rear window
    ctx.fillStyle = '#3498db';
    ctx.fillRect(x + 14, y + 54, 20, 8);
    // Wheels
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 4, y + 12, 6, 12);
    ctx.fillRect(x + 38, y + 12, 6, 12);
    ctx.fillRect(x + 4, y + 58, 6, 12);
    ctx.fillRect(x + 38, y + 58, 6, 12);
    // Headlights
    ctx.fillStyle = '#f0e68c';
    ctx.fillRect(x + 12, y + 4, 6, 3);
    ctx.fillRect(x + 30, y + 4, 6, 3);

  } else if (type === 'cop') {
    // Dark blue cop car
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x + 8, y + 8, 32, 64);
    ctx.fillRect(x + 10, y + 4, 28, 8);
    ctx.fillRect(x + 10, y + 68, 28, 8);
    // Accent
    ctx.fillStyle = '#1a5276';
    ctx.fillRect(x + 10, y + 20, 28, 16);
    // Windows
    ctx.fillStyle = '#5dade2';
    ctx.fillRect(x + 12, y + 22, 10, 10);
    ctx.fillRect(x + 26, y + 22, 10, 10);
    // Roof light bar (animated)
    const flash = frameTick % 20 < 10;
    ctx.fillStyle = flash ? '#e74c3c' : '#3498db';
    ctx.fillRect(x + 12, y + 4, 10, 4);
    ctx.fillStyle = flash ? '#3498db' : '#e74c3c';
    ctx.fillRect(x + 26, y + 4, 10, 4);
    // Light bar base
    ctx.fillStyle = '#eee';
    ctx.fillRect(x + 22, y + 4, 4, 4);
    // "POLICE" stripe
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 10, y + 40, 28, 3);
    // Wheels
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 4, y + 12, 6, 12);
    ctx.fillRect(x + 38, y + 12, 6, 12);
    ctx.fillRect(x + 4, y + 58, 6, 12);
    ctx.fillRect(x + 38, y + 58, 6, 12);

  } else if (type === 'patrol') {
    // Gold Nissan Patrol SUV — taller, wider stance
    ctx.fillStyle = '#f39c12';
    // Main body (wider)
    ctx.fillRect(x + 6, y + 6, 36, 68);
    ctx.fillRect(x + 8, y + 2, 32, 8);
    ctx.fillRect(x + 8, y + 70, 32, 6);
    // Accent
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(x + 8, y + 18, 32, 16);
    // Windshield
    ctx.fillStyle = '#5dade2';
    ctx.fillRect(x + 12, y + 20, 24, 10);
    // Bull bar
    ctx.fillStyle = '#bbb';
    ctx.fillRect(x + 10, y + 2, 4, 6);
    ctx.fillRect(x + 34, y + 2, 4, 6);
    ctx.fillRect(x + 10, y + 2, 28, 2);
    // Roof rack
    ctx.fillStyle = '#888';
    ctx.fillRect(x + 12, y + 38, 24, 2);
    ctx.fillRect(x + 12, y + 42, 24, 2);
    // Rear window
    ctx.fillStyle = '#3498db';
    ctx.fillRect(x + 14, y + 56, 20, 8);
    // Stripe
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 8, y + 46, 32, 3);
    // Wheels (wider stance)
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 2, y + 10, 6, 14);
    ctx.fillRect(x + 40, y + 10, 6, 14);
    ctx.fillRect(x + 2, y + 56, 6, 14);
    ctx.fillRect(x + 40, y + 56, 6, 14);
    // Headlights
    ctx.fillStyle = '#ff6';
    ctx.fillRect(x + 10, y + 2, 6, 3);
    ctx.fillRect(x + 32, y + 2, 6, 3);
  }
}

// --- Power-up drawing (#9) ---
function drawPowerUp(pu) {
  const bob = Math.sin(frameTick * 0.06 + pu.bobOffset) * 4;
  const py = pu.y + bob;
  const r = 12;

  ctx.beginPath();
  ctx.arc(pu.x, py, r, 0, Math.PI * 2);
  if (pu.type === 'shield') ctx.fillStyle = '#2ecc71';
  else if (pu.type === 'turbo') ctx.fillStyle = '#e74c3c';
  else ctx.fillStyle = COL.gold;
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (pu.type === 'shield') ctx.fillText('S', pu.x, py);
  else if (pu.type === 'turbo') ctx.fillText('T', pu.x, py);
  else ctx.fillText('2x', pu.x, py - 1);
  ctx.textBaseline = 'alphabetic';
}

function drawPowerUps() {
  for (const pu of powerUps) drawPowerUp(pu);
}

// --- Pixel-art heart sprite ---
function drawPixelHeart(x, y, color, scale) {
  ctx.fillStyle = color;
  const pixels = [
    [0,1,0,1,0],
    [1,1,1,1,1],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [0,0,1,0,0],
  ];
  for (let row = 0; row < pixels.length; row++) {
    for (let col = 0; col < pixels[row].length; col++) {
      if (pixels[row][col]) ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

// --- HUD (#5, #9) ---
function drawHUD() {
  ctx.fillStyle = COL.hud;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${score}`, 10, 20);

  // Combo multiplier display (#5)
  if (comboMultiplier > 1) {
    ctx.save();
    const pulse = 1 + Math.sin(comboPulse * 0.15) * 0.15;
    ctx.font = `${Math.floor(16 * pulse)}px "Press Start 2P", monospace`;
    ctx.fillStyle = COL.gold;
    ctx.fillText(`x${comboMultiplier}`, 140, 22);
    ctx.restore();
  }

  ctx.textAlign = 'right';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = COL.hud;
  ctx.fillText(`${Math.floor(speed * 20)}km/h`, canvas.width - 40, 20);

  // Mute button (#6)
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(audioMuted ? '🔇' : '🔊', canvas.width - 8, 18);

  // Power-up indicators (#9)
  let indicatorX = 10;
  const indicatorY = 36;
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  if (shieldActive) {
    ctx.fillStyle = '#2ecc71';
    ctx.fillText('🛡 SHIELD', indicatorX, indicatorY);
    indicatorX += 80;
  }
  if (turboTimer > 0) {
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('🔥 TURBO', indicatorX, indicatorY);
    indicatorX += 80;
  }
  if (doubleFlashActive) {
    ctx.fillStyle = COL.gold;
    ctx.fillText('⚡ 2xFLASH', indicatorX, indicatorY);
  }

  // Flash hint at bottom
  ctx.textAlign = 'center';
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = flashTimer > 0 ? COL.flash : '#555';
  if (!HAS_TOUCH) {
    ctx.fillText('[SPACE] FLASH!', canvas.width / 2, canvas.height - 10);
  }

  // Lives (hearts)
  const heartScale = 2;
  const heartW = 5 * heartScale;
  const heartGap = 4;
  const heartTotalW = LIVES_MAX * heartW + (LIVES_MAX - 1) * heartGap;
  const livesX = canvas.width - heartTotalW - 8;
  const livesY = 28;
  for (let i = 0; i < LIVES_MAX; i++) {
    const hx = livesX + i * (heartW + heartGap);
    if (heartLossTimer > 0 && i === lives) {
      ctx.save();
      const pulse = 1 + Math.sin((1 - heartLossTimer / 30) * Math.PI) * 0.7;
      const cx = hx + heartW / 2;
      const cy = livesY + (5 * heartScale) / 2;
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);
      ctx.translate(-cx, -cy);
      drawPixelHeart(hx, livesY, '#ff6666', heartScale);
      ctx.restore();
    } else {
      drawPixelHeart(hx, livesY, i < lives ? '#e74c3c' : '#555', heartScale);
    }
  }

}

// --- Turbo edge glow (#9) ---
function drawTurboGlow() {
  if (turboTimer <= 0) return;
  ctx.save();
  const pulse = 0.15 + Math.sin(frameTick * 0.2) * 0.1;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(0, 0, 10, canvas.height);
  ctx.fillRect(canvas.width - 10, 0, 10, canvas.height);
  ctx.restore();
}

function drawYallaFlash() {
  if (yallaFlashTimer <= 0) return;
  ctx.save();
  ctx.globalAlpha = (yallaFlashTimer / 12) * 0.45;
  ctx.fillStyle = COL.gold;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawYallaPopup() {
  if (yallaTimer <= 0) return;
  ctx.save();
  // Fade in for first 20 frames, hold, fade out last 40 frames
  const alpha = yallaTimer > 100 ? (120 - yallaTimer) / 20
              : yallaTimer < 40  ? yallaTimer / 40
              : 1;
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // Scale: ease-out pop from 0.6→1.0 over the 20-frame intro, hold at 1.0 after
  const introT = Math.min((120 - yallaTimer) / 20, 1); // 0→1 over first 20 frames
  const scale = 0.6 + 0.4 * (1 - Math.pow(1 - introT, 3)); // cubic ease-out
  ctx.translate(canvas.width / 2, canvas.height / 2 - 60);
  ctx.scale(scale, scale);

  // Background pill
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(-130, -36, 260, 80, 10);
  ctx.fill();

  // Gold border
  ctx.strokeStyle = COL.gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Main text
  ctx.fillStyle = COL.gold;
  ctx.font = 'bold 22px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(yallaText, 0, -10);

  // Sub text
  ctx.fillStyle = '#fff';
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillText(yallaSubText, 0, 22);

  ctx.restore();
}

function drawFlashEffect() {
  if (flashTimer <= 0) return;
  ctx.save();
  ctx.globalAlpha = flashTimer / 15 * 0.3;
  ctx.fillStyle = COL.flash;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.fillStyle = COL.flash;
  const beamW = 20;
  const beamX = playerX + CAR_W / 2 - beamW / 2;
  ctx.save();
  ctx.globalAlpha = flashTimer / 15 * 0.6;
  ctx.fillRect(beamX, 130, beamW, PLAYER_Y - 130);
  ctx.restore();
}

// --- Touch buttons (#7) ---
function drawTouchButtons() {
  if (!HAS_TOUCH || state !== 'playing') return;
  const y = canvas.height - TOUCH_BTN_H;
  const w3 = canvas.width / 3;

  ctx.save();
  ctx.globalAlpha = 0.6;

  // Left button
  ctx.fillStyle = '#333';
  ctx.fillRect(0, y, w3, TOUCH_BTN_H);
  ctx.strokeStyle = '#555';
  ctx.strokeRect(0, y, w3, TOUCH_BTN_H);
  ctx.fillStyle = '#ddd';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('◀', w3 / 2, y + 40);

  // Flash button (center, gold)
  ctx.fillStyle = '#554400';
  ctx.fillRect(w3, y, w3, TOUCH_BTN_H);
  ctx.strokeStyle = COL.gold;
  ctx.strokeRect(w3, y, w3, TOUCH_BTN_H);
  ctx.fillStyle = COL.gold;
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillText('FLASH', canvas.width / 2, y + 38);

  // Right button
  ctx.fillStyle = '#333';
  ctx.fillRect(w3 * 2, y, w3, TOUCH_BTN_H);
  ctx.strokeStyle = '#555';
  ctx.strokeRect(w3 * 2, y, w3, TOUCH_BTN_H);
  ctx.fillStyle = '#ddd';
  ctx.font = '24px sans-serif';
  ctx.fillText('▶', w3 * 2 + w3 / 2, y + 40);

  ctx.restore();
}

// --- Title screen ---
function drawTitle() {
  ctx.fillStyle = COL.sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawSkyline();

  ctx.fillStyle = COL.gold;
  ctx.font = '24px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FLASH', canvas.width / 2, 250);
  ctx.fillText('KHALLAS', canvas.width / 2, 290);

  ctx.fillStyle = COL.sand;
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillText('Sheikh Zayed Highway', canvas.width / 2, 330);

  // High score (#5)
  const hi = loadHighScore();
  if (hi > 0) {
    ctx.fillStyle = COL.gold;
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText(`HIGH SCORE: ${hi}`, canvas.width / 2, 360);
  }

  ctx.fillStyle = '#888';
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillText('Arrow keys to switch lanes', canvas.width / 2, 400);
  ctx.fillText('Space/F to flash headlights', canvas.width / 2, 420);
  ctx.fillText('Flash slowpokes to pass them!', canvas.width / 2, 450);
  ctx.fillText('But watch out for cops...', canvas.width / 2, 470);

  ctx.fillStyle = COL.gold;
  ctx.font = '10px "Press Start 2P", monospace';
  if (Math.floor(Date.now() / 500) % 2) {
    ctx.fillText('PRESS ENTER / TAP TO START', canvas.width / 2, 530);
  }

  ctx.fillStyle = '#666';
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillText('L - LEADERBOARD', canvas.width / 2, 560);

  ctx.fillStyle = '#444';
  ctx.fillText('YALLA!', canvas.width / 2, 620);
}

// --- Game over screen ---
function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#e74c3c';
  ctx.font = '20px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('KHALLAS!', canvas.width / 2, 220);

  ctx.fillStyle = COL.gold;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 270);
  ctx.fillText(`DIST: ${Math.floor(distance / 10)}m`, canvas.width / 2, 295);

  const hi = loadHighScore();
  if (hi > 0) {
    ctx.fillStyle = '#aaa';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(`HIGH SCORE: ${hi}`, canvas.width / 2, 320);
  }

  // Leaderboard on game over (#11)
  const lb = loadLeaderboard();
  if (lb.length > 0) {
    ctx.fillStyle = COL.gold;
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('— TOP SCORES —', canvas.width / 2, 355);
    ctx.font = '7px "Press Start 2P", monospace';
    for (let i = 0; i < Math.min(lb.length, 5); i++) {
      const entry = lb[i];
      ctx.fillStyle = i === 0 ? COL.gold : '#aaa';
      ctx.fillText(
        `${i + 1}. ${entry.initials}  ${entry.score}`,
        canvas.width / 2, 375 + i * 16
      );
    }
  }

  ctx.fillStyle = '#888';
  ctx.font = '8px "Press Start 2P", monospace';
  if (Math.floor(Date.now() / 500) % 2) {
    ctx.fillText('PRESS ENTER / TAP TO RETRY', canvas.width / 2, 500);
  }
}

// --- Initials entry screen (#11) ---
function drawInitialsEntry() {
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = COL.gold;
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NEW HIGH SCORE!', canvas.width / 2, 260);

  ctx.fillStyle = '#fff';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 295);

  ctx.fillStyle = '#aaa';
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillText('ENTER YOUR INITIALS', canvas.width / 2, 325);

  // Draw initials
  const cx = canvas.width / 2;
  const spacing = 40;
  ctx.font = '20px "Press Start 2P", monospace';
  for (let i = 0; i < 3; i++) {
    const lx = cx + (i - 1) * spacing;
    const letter = String.fromCharCode(65 + initialsArr[i]);
    ctx.fillStyle = i === initialsPos ? COL.gold : '#888';
    ctx.fillText(letter, lx, 370);

    // Cursor underline
    if (i === initialsPos && Math.floor(Date.now() / 400) % 2) {
      ctx.fillRect(lx - 10, 378, 20, 3);
    }
  }

  // Up/Down arrows hint
  ctx.fillStyle = '#666';
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillText('↑↓ CHANGE  ←→ MOVE  ENTER OK', cx, 410);
}

// --- Leaderboard overlay for title (#11) ---
function drawLeaderboardOverlay() {
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = COL.gold;
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LEADERBOARD', canvas.width / 2, 180);

  const lb = loadLeaderboard();
  if (lb.length === 0) {
    ctx.fillStyle = '#666';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('NO SCORES YET', canvas.width / 2, 300);
  } else {
    ctx.font = '8px "Press Start 2P", monospace';
    // Headers
    ctx.fillStyle = COL.gold;
    ctx.textAlign = 'left';
    ctx.fillText('RK', 100, 220);
    ctx.fillText('NAME', 150, 220);
    ctx.fillText('SCORE', 250, 220);
    ctx.fillText('DATE', 330, 220);

    for (let i = 0; i < lb.length; i++) {
      const entry = lb[i];
      ctx.fillStyle = i === 0 ? COL.gold : '#ccc';
      ctx.textAlign = 'left';
      const y = 245 + i * 20;
      ctx.fillText(`${i + 1}.`, 100, y);
      ctx.fillText(entry.initials, 150, y);
      ctx.fillText(String(entry.score), 250, y);
      ctx.fillStyle = '#888';
      ctx.fillText(entry.date || '', 330, y);
    }
  }

  ctx.fillStyle = '#666';
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PRESS ANY KEY TO CLOSE', canvas.width / 2, 500);
}

// ============================================================
// MAIN LOOP
// ============================================================

function gameLoop() {
  update();

  // Scroll parallax background (animates on title too at idle rate)
  const bgSpd = state === 'playing' ? speed * (turboTimer > 0 ? 1.5 : 1) : 1.5;
  bgScrollX  = (bgScrollX  + bgSpd * 0.010) % 240;
  midScrollX = (midScrollX + bgSpd * 0.028) % 480;

  if (state === 'title') {
    if (showLeaderboardOnTitle) {
      drawTitle();
      drawLeaderboardOverlay();
    } else {
      drawTitle();
    }
  } else if (state === 'leaderboard') {
    drawLeaderboardOverlay();
  } else {
    ctx.fillStyle = COL.sky;
    ctx.fillRect(0, 0, canvas.width, 130);
    drawSkyline();
    drawRoad();
    drawSpeedLines();
    drawRoadBuildings();
    drawPowerUps();

    for (const npc of npcs) {
      drawCarSprite(npc.x, npc.y, npc.type);
    }

    if (invincibleTimer <= 0 || frameTick % 8 < 4) {
      drawCarSprite(playerX, PLAYER_Y, 'player');
    }
    drawFlashEffect();
    drawTurboGlow();
    drawYallaFlash();
    drawHUD();
    drawYallaPopup();
    drawTouchButtons();

    if (state === 'gameover') {
      drawGameOver();
    } else if (state === 'initials') {
      drawInitialsEntry();
    }
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
