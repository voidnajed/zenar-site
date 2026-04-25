/* game.js — Space Invaders Easter Egg for Zenar Family Heritage */

(function() {
  'use strict';

  // ===== GAME CONSTANTS =====
  var CANVAS_W = 640;
  var CANVAS_H = 480;
  var PLAYER_W = 40;
  var PLAYER_H = 16;
  var PLAYER_SPEED = 5;
  var BULLET_W = 3;
  var BULLET_H = 12;
  var BULLET_SPEED = 7;
  var INVADER_ROWS = 5;
  var INVADER_COLS = 11;
  var INVADER_W = 28;
  var INVADER_H = 20;
  var INVADER_PAD_X = 12;
  var INVADER_PAD_Y = 10;
  var INVADER_BULLET_SPEED = 2;
  var INVADER_SHOOT_CHANCE = 0.0008;
  var MOVE_DOWN_AMOUNT = 18;
  var SHIELD_COUNT = 4;

  // ===== COLORS (crest-inspired retro palette) =====
  var COL_BG = '#0c0c12';
  var COL_PLAYER = '#c9a84c';       // gold
  var COL_BULLET = '#ffffff';
  var COL_INVADER_1 = '#4a7abf';    // royal blue
  var COL_INVADER_2 = '#c45454';    // crimson
  var COL_INVADER_3 = '#4abf7a';    // emerald
  var COL_SHIELD = '#c9a84c';
  var COL_TEXT = '#e8e0cc';
  var COL_TEXT_DIM = '#6a6252';
  var COL_EXPLOSION = '#ff8844';
  var COL_UFO = '#d44aff';

  // ===== GAME STATE =====
  var canvas, ctx;
  var gameState = 'menu'; // menu, playing, gameover, win
  var score = 0;
  var lives = 3;
  var level = 1;
  var highScore = 0;
  var frameCount = 0;
  var isMobile = false;

  // Player
  var player = { x: 0, y: 0, w: PLAYER_W, h: PLAYER_H, alive: true, respawnTimer: 0 };

  // Input
  var keys = {};
  var shootCooldown = 0;

  // Bullets
  var playerBullets = [];
  var invaderBullets = [];

  // Invaders
  var invaders = [];
  var invaderDir = 1; // 1 = right, -1 = left
  var invaderSpeed = 0.5;
  var invaderMoveTimer = 0;
  var invaderMoveInterval = 40; // frames between moves
  var invaderStepX = 8;

  // Shields
  var shields = [];

  // Explosions
  var explosions = [];

  // UFO
  var ufo = null;
  var ufoTimer = 0;

  // Sound (simple oscillator beeps)
  var audioCtx = null;
  function beep(freq, dur, vol) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      osc.type = 'square';
      gain.gain.value = vol || 0.05;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (dur || 0.1));
      osc.stop(audioCtx.currentTime + (dur || 0.1));
    } catch(e) {}
  }

  // ===== PIXEL ART SPRITES (drawn procedurally) =====
  var sprite1a = [
    '  0    0  ',
    '   0  0   ',
    '  000000  ',
    ' 00 00 00 ',
    '0000000000',
    '0 000000 0',
    '0 0    0 0',
    '   00 00  '
  ];
  var sprite1b = [
    '  0    0  ',
    '0  0  0  0',
    '0 000000 0',
    '000 00 000',
    '0000000000',
    ' 00000000 ',
    '  0    0  ',
    ' 0      0 '
  ];

  var sprite2a = [
    ' 00     00 ',
    '  00   00  ',
    ' 000000000 ',
    ' 00 000 00 ',
    '00000000000',
    '0 000000 0 ',
    '0 0     0 0',
    '  000 000  '
  ];
  var sprite2b = [
    ' 00     00 ',
    '  00   00  ',
    ' 000000000 ',
    ' 00 000 00 ',
    '00000000000',
    '0 000000000',
    '0 0     0 0',
    '0 0     0 0'
  ];

  var sprite3a = [
    '   0000   ',
    ' 00000000 ',
    '0000000000',
    '000  00 000',
    '0000000000',
    '  00  00  ',
    ' 00 00 00 ',
    '00      00'
  ];
  var sprite3b = [
    '   0000   ',
    ' 00000000 ',
    '0000000000',
    '000  00 000',
    '0000000000',
    '  00  00  ',
    ' 0  00  0 ',
    '  0    0  '
  ];

  function drawSprite(spr, x, y, color, scale) {
    scale = scale || 2;
    ctx.fillStyle = color;
    for (var r = 0; r < spr.length; r++) {
      for (var c = 0; c < spr[r].length; c++) {
        if (spr[r][c] === '0') {
          ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
        }
      }
    }
  }

  // ===== SHIELD CREATION =====
  function createShields() {
    shields = [];
    var shieldW = 44;
    var shieldH = 32;
    var spacing = (CANVAS_W - SHIELD_COUNT * shieldW) / (SHIELD_COUNT + 1);

    for (var i = 0; i < SHIELD_COUNT; i++) {
      var sx = spacing + i * (shieldW + spacing);
      var sy = CANVAS_H - 100;
      var pixels = [];

      for (var py = 0; py < shieldH; py++) {
        for (var px = 0; px < shieldW; px++) {
          var inShield = true;
          if (py < 8) {
            var cx = shieldW / 2;
            var dist = Math.abs(px - cx);
            if (dist > shieldW / 2 - py) inShield = false;
          }
          if (py > shieldH - 12 && px > shieldW / 2 - 8 && px < shieldW / 2 + 8) {
            inShield = false;
          }
          if (inShield) {
            pixels.push({ x: sx + px, y: sy + py, alive: true });
          }
        }
      }
      shields.push({ x: sx, y: sy, w: shieldW, h: shieldH, pixels: pixels });
    }
  }

  // ===== INVADER GRID =====
  function createInvaders() {
    invaders = [];
    var startX = 60;
    var startY = 60;

    for (var row = 0; row < INVADER_ROWS; row++) {
      for (var col = 0; col < INVADER_COLS; col++) {
        var type = row < 1 ? 1 : (row < 3 ? 2 : 3);
        var points = type === 1 ? 30 : (type === 2 ? 20 : 10);
        invaders.push({
          x: startX + col * (INVADER_W + INVADER_PAD_X),
          y: startY + row * (INVADER_H + INVADER_PAD_Y),
          w: INVADER_W,
          h: INVADER_H,
          type: type,
          alive: true,
          frame: 0,
          points: points
        });
      }
    }

    invaderDir = 1;
    invaderSpeed = 0.5 + (level - 1) * 0.08;
    invaderMoveInterval = Math.max(16, 40 - (level - 1) * 3);
    invaderMoveTimer = 0;
  }

  // ===== INIT =====
  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // Keyboard input
    document.addEventListener('keydown', function(e) {
      keys[e.key] = true;
      keys[e.code] = true;
      if (gameState === 'playing' && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].indexOf(e.key) !== -1) {
        e.preventDefault();
      }
      if (gameState === 'menu' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startGame();
      }
      if ((gameState === 'gameover' || gameState === 'win') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        if (gameState === 'win') {
          level++;
          startLevel();
        } else {
          gameState = 'menu';
        }
      }
    });
    document.addEventListener('keyup', function(e) {
      keys[e.key] = false;
      keys[e.code] = false;
    });

    // Touch controls
    setupTouchControls();

    gameLoop();
  }

  // ===== TOUCH CONTROLS =====
  // Touch movement: horizontal position relative to left/right halves
  var touchState = { left: false, right: false, shoot: false, moveX: 0 };
  var activeTouches = {};

  function setupTouchControls() {
    var touchControls = document.getElementById('touch-controls');
    if (!touchControls) return;

    // Show touch controls on touch devices
    if (isMobile) {
      touchControls.style.display = 'flex';
    }

    // --- D-pad buttons ---
    var btnLeft = document.getElementById('btn-left');
    var btnRight = document.getElementById('btn-right');
    var btnFire = document.getElementById('btn-fire');

    function addBtn(el, key) {
      if (!el) return;
      el.addEventListener('touchstart', function(e) {
        e.preventDefault();
        touchState[key] = true;
        // Resume AudioContext on first touch (iOS requirement)
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        // Handle menu/gameover/win transitions
        if (gameState === 'menu') { startGame(); return; }
        if (gameState === 'gameover') { gameState = 'menu'; return; }
        if (gameState === 'win') { level++; startLevel(); return; }
      }, { passive: false });
      el.addEventListener('touchend', function(e) { e.preventDefault(); touchState[key] = false; }, { passive: false });
      el.addEventListener('touchcancel', function() { touchState[key] = false; });
    }

    addBtn(btnLeft, 'left');
    addBtn(btnRight, 'right');
    addBtn(btnFire, 'shoot');

    // --- Canvas tap to start / tap-to-fire while playing ---
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      if (gameState === 'menu') { startGame(); return; }
      if (gameState === 'gameover') { gameState = 'menu'; return; }
      if (gameState === 'win') { level++; startLevel(); return; }
    }, { passive: false });

    // Prevent default on canvas to stop scrolling / zooming while playing
    canvas.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchend', function(e) { e.preventDefault(); }, { passive: false });
  }

  function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    gameState = 'playing';
    startLevel();
    beep(520, 0.15, 0.06);
  }

  function startLevel() {
    gameState = 'playing';
    player.x = CANVAS_W / 2 - PLAYER_W / 2;
    player.y = CANVAS_H - 40;
    player.alive = true;
    player.respawnTimer = 0;
    playerBullets = [];
    invaderBullets = [];
    explosions = [];
    ufo = null;
    ufoTimer = 600;
    shootCooldown = 0;
    createInvaders();
    createShields();
  }

  // ===== UPDATE =====
  function update() {
    if (gameState !== 'playing') return;
    frameCount++;

    // --- Player movement ---
    if (player.alive) {
      if (keys['ArrowLeft'] || keys['a'] || keys['A'] || touchState.left) {
        player.x -= PLAYER_SPEED;
      }
      if (keys['ArrowRight'] || keys['d'] || keys['D'] || touchState.right) {
        player.x += PLAYER_SPEED;
      }
      player.x = Math.max(0, Math.min(CANVAS_W - PLAYER_W, player.x));

      // Shooting — on mobile auto-fire when moving
      if (shootCooldown > 0) shootCooldown--;
      var wantsShoot = keys[' '] || keys['ArrowUp'] || touchState.shoot;
      // Auto-fire on mobile: shoot continuously when any direction held
      if (isMobile && (touchState.left || touchState.right)) {
        wantsShoot = true;
      }
      if (wantsShoot && shootCooldown === 0 && playerBullets.length < 3) {
        playerBullets.push({
          x: player.x + PLAYER_W / 2 - BULLET_W / 2,
          y: player.y - BULLET_H,
          w: BULLET_W,
          h: BULLET_H
        });
        shootCooldown = 10;
        beep(880, 0.05, 0.04);
      }
    } else {
      player.respawnTimer--;
      if (player.respawnTimer <= 0) {
        if (lives > 0) {
          player.alive = true;
          player.x = CANVAS_W / 2 - PLAYER_W / 2;
        } else {
          if (score > highScore) highScore = score;
          gameState = 'gameover';
        }
      }
    }

    // --- Player bullets ---
    for (var i = playerBullets.length - 1; i >= 0; i--) {
      playerBullets[i].y -= BULLET_SPEED;
      if (playerBullets[i].y < -BULLET_H) {
        playerBullets.splice(i, 1);
        continue;
      }

      // Hit invaders
      var hitInv = false;
      for (var j = 0; j < invaders.length; j++) {
        var inv = invaders[j];
        if (!inv.alive) continue;
        if (rectsOverlap(playerBullets[i], inv)) {
          inv.alive = false;
          score += inv.points;
          explosions.push({ x: inv.x, y: inv.y, timer: 12 });
          beep(200, 0.15, 0.06);
          playerBullets.splice(i, 1);
          hitInv = true;

          var aliveCount = invaders.filter(function(a) { return a.alive; }).length;
          if (aliveCount > 0) {
            invaderMoveInterval = Math.max(2, Math.floor(40 * aliveCount / (INVADER_ROWS * INVADER_COLS)));
          }
          break;
        }
      }
      if (hitInv) continue;

      // Hit UFO
      if (ufo && !hitInv && playerBullets[i]) {
        if (rectsOverlap(playerBullets[i], ufo)) {
          var ufoPoints = [50, 100, 150, 200, 300][Math.floor(Math.random() * 5)];
          score += ufoPoints;
          explosions.push({ x: ufo.x, y: ufo.y, timer: 20, text: '' + ufoPoints });
          beep(600, 0.2, 0.07);
          ufo = null;
          playerBullets.splice(i, 1);
          continue;
        }
      }

      // Hit shields
      if (playerBullets[i]) {
        hitShield(playerBullets[i], i, playerBullets);
      }
    }

    // --- Invader movement ---
    invaderMoveTimer++;
    if (invaderMoveTimer >= invaderMoveInterval) {
      invaderMoveTimer = 0;
      var hitEdge = false;

      for (var k = 0; k < invaders.length; k++) {
        if (!invaders[k].alive) continue;
        var nextX = invaders[k].x + invaderStepX * invaderDir;
        if (nextX < 4 || nextX + invaders[k].w > CANVAS_W - 4) {
          hitEdge = true;
          break;
        }
      }

      if (hitEdge) {
        invaderDir *= -1;
        for (var k2 = 0; k2 < invaders.length; k2++) {
          if (!invaders[k2].alive) continue;
          invaders[k2].y += MOVE_DOWN_AMOUNT;
          if (invaders[k2].y + invaders[k2].h >= player.y) {
            lives = 0;
            player.alive = false;
            if (score > highScore) highScore = score;
            gameState = 'gameover';
            return;
          }
        }
      } else {
        for (var k3 = 0; k3 < invaders.length; k3++) {
          if (!invaders[k3].alive) continue;
          invaders[k3].x += invaderStepX * invaderDir;
        }
      }

      for (var k4 = 0; k4 < invaders.length; k4++) {
        invaders[k4].frame = 1 - invaders[k4].frame;
      }

      beep(120 + (frameCount % 4) * 30, 0.06, 0.03);
    }

    // --- Invader shooting ---
    var aliveInvaders = invaders.filter(function(a) { return a.alive; });
    for (var m = 0; m < aliveInvaders.length; m++) {
      if (Math.random() < INVADER_SHOOT_CHANCE + level * 0.0002) {
        invaderBullets.push({
          x: aliveInvaders[m].x + aliveInvaders[m].w / 2 - 2,
          y: aliveInvaders[m].y + aliveInvaders[m].h,
          w: 4,
          h: 10
        });
      }
    }

    // --- Invader bullets ---
    for (var n = invaderBullets.length - 1; n >= 0; n--) {
      invaderBullets[n].y += INVADER_BULLET_SPEED;
      if (invaderBullets[n].y > CANVAS_H) {
        invaderBullets.splice(n, 1);
        continue;
      }

      if (player.alive && rectsOverlap(invaderBullets[n], player)) {
        lives--;
        player.alive = false;
        player.respawnTimer = 90;
        explosions.push({ x: player.x, y: player.y, timer: 20 });
        beep(100, 0.3, 0.08);
        invaderBullets.splice(n, 1);
        continue;
      }

      hitShield(invaderBullets[n], n, invaderBullets);
    }

    // --- UFO ---
    ufoTimer--;
    if (ufoTimer <= 0 && !ufo) {
      ufo = {
        x: -40,
        y: 30,
        w: 36,
        h: 14,
        dir: 1
      };
      if (Math.random() > 0.5) {
        ufo.x = CANVAS_W + 40;
        ufo.dir = -1;
      }
      ufoTimer = 800 + Math.floor(Math.random() * 600);
    }
    if (ufo) {
      ufo.x += 2 * ufo.dir;
      if (ufo.x < -50 || ufo.x > CANVAS_W + 50) {
        ufo = null;
      }
    }

    // --- Explosions ---
    for (var e = explosions.length - 1; e >= 0; e--) {
      explosions[e].timer--;
      if (explosions[e].timer <= 0) {
        explosions.splice(e, 1);
      }
    }

    // --- Win condition ---
    if (aliveInvaders.length === 0) {
      gameState = 'win';
      beep(660, 0.1, 0.06);
      setTimeout(function() { beep(880, 0.2, 0.06); }, 120);
    }
  }

  // ===== SHIELD HIT =====
  function hitShield(bullet, bulletIdx, bulletArr) {
    for (var s = 0; s < shields.length; s++) {
      var sh = shields[s];
      for (var p = sh.pixels.length - 1; p >= 0; p--) {
        var px = sh.pixels[p];
        if (!px.alive) continue;
        if (bullet.x < px.x + 2 && bullet.x + bullet.w > px.x &&
            bullet.y < px.y + 2 && bullet.y + bullet.h > px.y) {
          var bx = px.x, by = px.y;
          for (var q = sh.pixels.length - 1; q >= 0; q--) {
            if (!sh.pixels[q].alive) continue;
            var dx = sh.pixels[q].x - bx;
            var dy = sh.pixels[q].y - by;
            if (dx * dx + dy * dy < 36) {
              sh.pixels[q].alive = false;
            }
          }
          bulletArr.splice(bulletIdx, 1);
          return;
        }
      }
    }
  }

  // ===== COLLISION =====
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ===== DRAW =====
  function draw() {
    ctx.fillStyle = COL_BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (gameState === 'menu') {
      drawMenu();
      return;
    }
    if (gameState === 'gameover') {
      drawGameplay();
      drawGameOver();
      return;
    }
    if (gameState === 'win') {
      drawGameplay();
      drawWin();
      return;
    }

    drawGameplay();
  }

  function drawGameplay() {
    // HUD
    ctx.fillStyle = COL_TEXT;
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE ' + padScore(score), 16, 20);
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL ' + level, CANVAS_W / 2, 20);
    ctx.textAlign = 'right';
    ctx.fillText('LIVES ' + lives, CANVAS_W - 16, 20);

    if (highScore > 0) {
      ctx.fillStyle = COL_TEXT_DIM;
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HI ' + padScore(highScore), CANVAS_W / 2, 36);
    }

    // Shields
    ctx.fillStyle = COL_SHIELD;
    for (var s = 0; s < shields.length; s++) {
      var sh = shields[s];
      for (var p = 0; p < sh.pixels.length; p++) {
        if (sh.pixels[p].alive) {
          ctx.fillRect(sh.pixels[p].x, sh.pixels[p].y, 2, 2);
        }
      }
    }

    // Invaders
    for (var i = 0; i < invaders.length; i++) {
      var inv = invaders[i];
      if (!inv.alive) continue;
      var color, spr;
      if (inv.type === 1) {
        color = COL_INVADER_1;
        spr = inv.frame === 0 ? sprite1a : sprite1b;
      } else if (inv.type === 2) {
        color = COL_INVADER_2;
        spr = inv.frame === 0 ? sprite2a : sprite2b;
      } else {
        color = COL_INVADER_3;
        spr = inv.frame === 0 ? sprite3a : sprite3b;
      }
      drawSprite(spr, inv.x, inv.y, color, 2);
    }

    // UFO
    if (ufo) {
      ctx.fillStyle = COL_UFO;
      ctx.beginPath();
      ctx.ellipse(ufo.x + ufo.w / 2, ufo.y + ufo.h / 2, ufo.w / 2, ufo.h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(ufo.x + ufo.w / 4, ufo.y, ufo.w / 2, ufo.h / 2);
    }

    // Player
    if (player.alive) {
      ctx.fillStyle = COL_PLAYER;
      ctx.fillRect(player.x, player.y + 4, PLAYER_W, PLAYER_H - 4);
      ctx.fillRect(player.x + PLAYER_W / 2 - 2, player.y, 4, 8);
      ctx.fillRect(player.x + 4, player.y + 2, 4, 4);
      ctx.fillRect(player.x + PLAYER_W - 8, player.y + 2, 4, 4);
    }

    // Player bullets
    ctx.fillStyle = COL_BULLET;
    for (var j = 0; j < playerBullets.length; j++) {
      ctx.fillRect(playerBullets[j].x, playerBullets[j].y, BULLET_W, BULLET_H);
    }

    // Invader bullets (zigzag style)
    for (var k = 0; k < invaderBullets.length; k++) {
      var ib = invaderBullets[k];
      ctx.fillStyle = COL_BULLET;
      var zigOff = Math.floor(ib.y / 4) % 2 === 0 ? -1 : 1;
      ctx.fillRect(ib.x + zigOff, ib.y, ib.w, 3);
      ctx.fillRect(ib.x - zigOff, ib.y + 3, ib.w, 3);
      ctx.fillRect(ib.x + zigOff, ib.y + 6, ib.w, 3);
    }

    // Explosions
    for (var e = 0; e < explosions.length; e++) {
      var ex = explosions[e];
      ctx.fillStyle = COL_EXPLOSION;
      ctx.globalAlpha = ex.timer / 20;
      for (var p2 = 0; p2 < 8; p2++) {
        var ang = (p2 / 8) * Math.PI * 2;
        var dist = (20 - ex.timer) * 2;
        ctx.fillRect(
          ex.x + 14 + Math.cos(ang) * dist,
          ex.y + 10 + Math.sin(ang) * dist,
          3, 3
        );
      }
      if (ex.text) {
        ctx.fillStyle = COL_TEXT;
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ex.text, ex.x + 18, ex.y + 8);
      }
      ctx.globalAlpha = 1;
    }

    // Bottom line
    ctx.fillStyle = COL_PLAYER;
    ctx.fillRect(0, CANVAS_H - 16, CANVAS_W, 1);
  }

  function drawMenu() {
    ctx.fillStyle = COL_TEXT;
    ctx.textAlign = 'center';

    // Title
    ctx.font = '22px "Press Start 2P", monospace';
    ctx.fillText('SPACE INVADERS', CANVAS_W / 2, 100);

    // Subtitle
    ctx.fillStyle = COL_PLAYER;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('ZENAR FAMILY ARCADE', CANVAS_W / 2, 130);

    // Draw sample invaders with point values
    drawSprite(sprite1a, CANVAS_W / 2 - 50, 160, COL_INVADER_1, 2);
    ctx.fillStyle = COL_TEXT;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('= 30 PTS', CANVAS_W / 2 - 20, 175);

    drawSprite(sprite2a, CANVAS_W / 2 - 50, 190, COL_INVADER_2, 2);
    ctx.fillStyle = COL_TEXT;
    ctx.fillText('= 20 PTS', CANVAS_W / 2 - 20, 205);

    drawSprite(sprite3a, CANVAS_W / 2 - 50, 220, COL_INVADER_3, 2);
    ctx.fillStyle = COL_TEXT;
    ctx.fillText('= 10 PTS', CANVAS_W / 2 - 20, 235);

    // UFO
    ctx.fillStyle = COL_UFO;
    ctx.beginPath();
    ctx.ellipse(CANVAS_W / 2 - 40, 260, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COL_TEXT;
    ctx.textAlign = 'left';
    ctx.fillText('= ???', CANVAS_W / 2 - 20, 264);

    // Controls — adapt to device
    ctx.textAlign = 'center';
    ctx.fillStyle = COL_TEXT_DIM;
    ctx.font = '9px "Press Start 2P", monospace';

    if (isMobile) {
      ctx.fillText('TOUCH CONTROLS', CANVAS_W / 2, 310);
      ctx.fillStyle = COL_TEXT;
      ctx.fillText('\u25C0  \u25B6  BUTTONS TO MOVE', CANVAS_W / 2, 335);
      ctx.fillText('FIRE BUTTON TO SHOOT', CANVAS_W / 2, 355);
      ctx.fillStyle = COL_TEXT_DIM;
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText('AUTO-FIRE WHILE MOVING', CANVAS_W / 2, 375);
    } else {
      ctx.fillText('KEYBOARD CONTROLS', CANVAS_W / 2, 310);
      ctx.fillStyle = COL_TEXT;
      ctx.fillText('\u2190 \u2192  or  A D  to MOVE', CANVAS_W / 2, 335);
      ctx.fillText('SPACE  or  \u2191  to FIRE', CANVAS_W / 2, 355);
    }

    // Start prompt
    ctx.fillStyle = COL_PLAYER;
    ctx.font = '12px "Press Start 2P", monospace';
    if (Math.floor(frameCount / 30) % 2 === 0) {
      ctx.fillText(isMobile ? 'TAP TO START' : 'PRESS ENTER TO START', CANVAS_W / 2, 420);
    }
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(12, 12, 18, 0.75)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = COL_INVADER_2;
    ctx.textAlign = 'center';
    ctx.font = '22px "Press Start 2P", monospace';
    ctx.fillText('GAME OVER', CANVAS_W / 2, 200);

    ctx.fillStyle = COL_TEXT;
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('SCORE: ' + padScore(score), CANVAS_W / 2, 240);

    if (highScore > 0) {
      ctx.fillStyle = COL_PLAYER;
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('HIGH SCORE: ' + padScore(highScore), CANVAS_W / 2, 270);
    }

    ctx.fillStyle = COL_TEXT_DIM;
    ctx.font = '10px "Press Start 2P", monospace';
    if (Math.floor(frameCount / 30) % 2 === 0) {
      ctx.fillText(isMobile ? 'TAP TO CONTINUE' : 'PRESS ENTER TO CONTINUE', CANVAS_W / 2, 320);
    }
  }

  function drawWin() {
    ctx.fillStyle = 'rgba(12, 12, 18, 0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = COL_INVADER_3;
    ctx.textAlign = 'center';
    ctx.font = '18px "Press Start 2P", monospace';
    ctx.fillText('WAVE ' + level + ' CLEARED!', CANVAS_W / 2, 200);

    ctx.fillStyle = COL_TEXT;
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('SCORE: ' + padScore(score), CANVAS_W / 2, 240);

    ctx.fillStyle = COL_TEXT_DIM;
    ctx.font = '10px "Press Start 2P", monospace';
    if (Math.floor(frameCount / 30) % 2 === 0) {
      ctx.fillText(isMobile ? 'TAP FOR NEXT WAVE' : 'PRESS ENTER FOR NEXT WAVE', CANVAS_W / 2, 290);
    }
  }

  function padScore(n) {
    var s = '' + n;
    while (s.length < 5) s = '0' + s;
    return s;
  }

  // ===== GAME LOOP =====
  function gameLoop() {
    frameCount++;
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  // ===== EXPOSE INIT =====
  window.initSpaceInvaders = init;

})();
