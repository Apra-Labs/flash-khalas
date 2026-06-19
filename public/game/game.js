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
const NPC_SPAWN_INTERVAL = 90;

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
  gold:      '#ffd700',
  hud:       '#ffd700',
  flash:     '#ffffaa',
};

// --- Dubai skyline (simple shapes) ---
const BUILDINGS = [
  { x: 15,  w: 20, h: 90,  style: 'block' },
  { x: 45,  w: 14, h: 140, style: 'block' },
  { x: 68,  w: 8,  h: 220, style: 'spire' },   // Burj Khalifa
  { x: 90,  w: 24, h: 100, style: 'block' },
  { x: 125, w: 18, h: 70,  style: 'block' },
  { x: 155, w: 30, h: 60,  style: 'sail' },     // Burj Al Arab
  { x: 200, w: 16, h: 110, style: 'block' },
  { x: 230, w: 12, h: 160, style: 'spire' },
  { x: 255, w: 22, h: 80,  style: 'block' },
  { x: 290, w: 28, h: 120, style: 'block' },
  { x: 330, w: 10, h: 180, style: 'frame' },    // Dubai Frame
  { x: 355, w: 20, h: 90,  style: 'block' },
  { x: 390, w: 16, h: 70,  style: 'block' },
  { x: 420, w: 24, h: 100, style: 'block' },
  { x: 450, w: 18, h: 60,  style: 'block' },
];

// --- State ---
let state = 'title';  // title | playing | gameover
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

// --- NPC types: regular, cop, patrol ---
function spawnNPC() {
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const roll = Math.random();
  let type = 'regular';
  if (roll > 0.85) type = 'cop';
  else if (roll > 0.7) type = 'patrol';

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

function laneToX(lane) {
  return SHOULDER + lane * LANE_WIDTH + (LANE_WIDTH - CAR_W) / 2;
}

// --- Input ---
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (state === 'title' && (e.key === ' ' || e.key === 'Enter')) {
    startGame();
  }
  if (state === 'gameover' && (e.key === ' ' || e.key === 'Enter')) {
    resetGame();
  }
  if (state === 'playing' && e.key === 'ArrowLeft') {
    if (playerLane > 0) playerLane--;
  }
  if (state === 'playing' && e.key === 'ArrowRight') {
    if (playerLane < LANE_COUNT - 1) playerLane++;
  }
  if (state === 'playing' && (e.key === ' ' || e.key === 'f')) {
    doFlash();
  }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// --- Touch controls ---
let touchStartX = null;
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  touchStartX = e.touches[0].clientX;
  if (state === 'title' || state === 'gameover') {
    state === 'title' ? startGame() : resetGame();
  }
});
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); });
canvas.addEventListener('touchend', (e) => {
  if (touchStartX === null || state !== 'playing') return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 30) {
    if (dx < 0 && playerLane > 0) playerLane--;
    if (dx > 0 && playerLane < LANE_COUNT - 1) playerLane++;
  } else {
    doFlash();
  }
  touchStartX = null;
});

function startGame() {
  state = 'playing';
  score = 0;
  distance = 0;
  speed = 4;
  npcs = [];
  npcTimer = 0;
  playerLane = 1;
  playerX = laneToX(1);
}

function resetGame() {
  startGame();
}

function doFlash() {
  if (flashTimer > 0) return;
  flashTimer = 15;

  const ahead = npcs.find(
    (n) => n.lane === playerLane && n.y > PLAYER_Y - 250 && n.y < PLAYER_Y && !n.flashed
  );
  if (!ahead) return;

  ahead.flashed = true;
  if (ahead.type === 'regular') {
    ahead.fleeing = true;
    score += 10;
  } else if (ahead.type === 'cop') {
    state = 'gameover';
  } else if (ahead.type === 'patrol') {
    ahead.speed = speed * 2;
    ahead.fleeing = true;
  }
}

// --- Update ---
function update() {
  if (state !== 'playing') return;

  frameTick++;
  distance += speed;
  if (frameTick % 300 === 0) speed = Math.min(speed + 0.3, 12);

  const targetX = laneToX(playerLane);
  playerX += (targetX - playerX) * 0.2;

  roadOffset = (roadOffset + speed) % (DASH_LEN + DASH_GAP);

  npcTimer++;
  if (npcTimer >= NPC_SPAWN_INTERVAL) {
    spawnNPC();
    npcTimer = 0;
  }

  for (const npc of npcs) {
    const relSpeed = npc.fleeing ? -speed * 0.5 : speed - npc.speed;
    npc.y += relSpeed;

    if (npc.fleeing) {
      const targetNpcX = laneToX(Math.min(npc.lane + 1, LANE_COUNT - 1));
      npc.x += (targetNpcX - npc.x) * 0.1;
    }
  }

  npcs = npcs.filter((n) => n.y < canvas.height + 100 && n.y > -200);

  for (const npc of npcs) {
    if (npc.flashed || npc.fleeing) continue;
    if (
      Math.abs(npc.x - playerX) < CAR_W * 0.8 &&
      Math.abs(npc.y - PLAYER_Y) < CAR_H * 0.8
    ) {
      state = 'gameover';
    }
  }

  if (flashTimer > 0) flashTimer--;
}

// --- Draw helpers ---
function drawSkyline() {
  const baseline = 130;
  for (const b of BUILDINGS) {
    ctx.fillStyle = '#0a1628';
    if (b.style === 'spire') {
      ctx.beginPath();
      ctx.moveTo(b.x, baseline);
      ctx.lineTo(b.x + b.w / 2, baseline - b.h);
      ctx.lineTo(b.x + b.w, baseline);
      ctx.fill();
      ctx.fillRect(b.x + b.w / 2 - 1, baseline - b.h - 15, 2, 15);
    } else if (b.style === 'sail') {
      ctx.beginPath();
      ctx.moveTo(b.x, baseline);
      ctx.quadraticCurveTo(b.x + b.w * 0.3, baseline - b.h * 1.2, b.x + b.w, baseline - b.h);
      ctx.lineTo(b.x + b.w, baseline);
      ctx.fill();
    } else if (b.style === 'frame') {
      ctx.strokeStyle = '#0a1628';
      ctx.lineWidth = 4;
      ctx.strokeRect(b.x, baseline - b.h, b.w, b.h);
    } else {
      ctx.fillRect(b.x, baseline - b.h, b.w, b.h);
      if (b.h > 80) {
        ctx.fillStyle = '#142640';
        for (let wy = baseline - b.h + 8; wy < baseline - 4; wy += 12) {
          for (let wx = b.x + 3; wx < b.x + b.w - 3; wx += 6) {
            ctx.fillRect(wx, wy, 3, 6);
          }
        }
      }
    }
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

function drawCar(x, y, type) {
  const colors = {
    player:  [COL.player, COL.playerAcc],
    regular: ['#95a5a6', '#7f8c8d'],
    cop:     ['#2c3e50', '#1a5276'],
    patrol:  ['#f39c12', '#e67e22'],
  };
  const [body, accent] = colors[type] || colors.regular;

  ctx.fillStyle = body;
  ctx.fillRect(x + 4, y + 6, CAR_W - 8, CAR_H - 12);

  ctx.fillStyle = accent;
  ctx.fillRect(x + 8, y + 14, CAR_W - 16, 18);

  ctx.fillStyle = '#222';
  ctx.fillRect(x, y + 10, 5, 14);
  ctx.fillRect(x + CAR_W - 5, y + 10, 5, 14);
  ctx.fillRect(x, y + CAR_H - 24, 5, 14);
  ctx.fillRect(x + CAR_W - 5, y + CAR_H - 24, 5, 14);

  if (type === 'player') {
    ctx.fillStyle = '#ff6';
    ctx.fillRect(x + 8, y + 2, 8, 4);
    ctx.fillRect(x + CAR_W - 16, y + 2, 8, 4);
  }

  if (type === 'cop') {
    ctx.fillStyle = frameTick % 20 < 10 ? '#e74c3c' : '#3498db';
    ctx.fillRect(x + 10, y + 4, 10, 4);
    ctx.fillRect(x + CAR_W - 20, y + 4, 10, 4);
  }

  if (type === 'patrol') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 6, y + 32, CAR_W - 12, 3);
  }
}

function drawHUD() {
  ctx.fillStyle = COL.hud;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${score}`, 10, 20);
  ctx.textAlign = 'right';
  ctx.fillText(`SPD: ${Math.floor(speed * 20)}km/h`, canvas.width - 10, 20);

  ctx.textAlign = 'center';
  ctx.fillStyle = flashTimer > 0 ? COL.flash : '#555';
  ctx.fillText(playerLane === LANE_COUNT - 1 ? '[SPACE] FLASH!' : 'get in fast lane to flash', canvas.width / 2, canvas.height - 20);
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
  ctx.globalAlpha = flashTimer / 15 * 0.6;
  ctx.fillRect(beamX, 130, beamW, PLAYER_Y - 130);
  ctx.globalAlpha = 1;
}

function drawTitle() {
  ctx.fillStyle = COL.sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawSkyline();

  ctx.fillStyle = COL.gold;
  ctx.font = '24px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FLASH', canvas.width / 2, 250);
  ctx.fillText('KHALAS', canvas.width / 2, 290);

  ctx.fillStyle = COL.sand;
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillText('Sheikh Zayed Highway', canvas.width / 2, 330);

  ctx.fillStyle = '#888';
  ctx.fillText('Arrow keys to switch lanes', canvas.width / 2, 400);
  ctx.fillText('Space/F to flash headlights', canvas.width / 2, 420);
  ctx.fillText('Flash slowpokes to pass them!', canvas.width / 2, 450);
  ctx.fillText('But watch out for cops...', canvas.width / 2, 470);

  ctx.fillStyle = COL.gold;
  ctx.font = '10px "Press Start 2P", monospace';
  if (Math.floor(Date.now() / 500) % 2) {
    ctx.fillText('PRESS ENTER / TAP TO START', canvas.width / 2, 550);
  }

  ctx.fillStyle = '#444';
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillText('YALLA!', canvas.width / 2, 620);
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#e74c3c';
  ctx.font = '20px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('KHALAS!', canvas.width / 2, 280);

  ctx.fillStyle = COL.gold;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText(`SCORE: ${score}`, canvas.width / 2, 330);
  ctx.fillText(`DIST: ${Math.floor(distance / 10)}m`, canvas.width / 2, 355);

  ctx.fillStyle = '#888';
  ctx.font = '8px "Press Start 2P", monospace';
  if (Math.floor(Date.now() / 500) % 2) {
    ctx.fillText('PRESS ENTER / TAP TO RETRY', canvas.width / 2, 430);
  }
}

// --- Main loop ---
function gameLoop() {
  update();

  if (state === 'title') {
    drawTitle();
  } else {
    ctx.fillStyle = COL.sky;
    ctx.fillRect(0, 0, canvas.width, 130);
    drawSkyline();
    drawRoad();

    for (const npc of npcs) {
      drawCar(npc.x, npc.y, npc.type);
    }

    drawCar(playerX, PLAYER_Y, 'player');
    drawFlashEffect();
    drawHUD();

    if (state === 'gameover') {
      drawGameOver();
    }
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
