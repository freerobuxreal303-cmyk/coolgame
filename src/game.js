// Zero-G Tactics: Chrono Legends - Master Game Loop & State Manager
// Coordinates physics, recording, replays, camera, floating combat text, minimap, and victory/defeat cycles.

const GAME_STATES = {
  MENU: 'MENU',
  HERO_SELECT: 'HERO_SELECT',
  PLAYING: 'PLAYING',
  REWIND: 'REWIND',
  GAME_OVER: 'GAME_OVER',
};

class FloatingText {
  constructor(x, y, text, color = '#ffffff', isCrit = false) {
    this.x = x + (Math.random() - 0.5) * 20;
    this.y = y;
    this.text = text;
    this.color = color;
    this.isCrit = isCrit;
    this.life = 0.85;
    this.maxLife = this.life;
    this.vy = isCrit ? -60 : -40;
    this.isDead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.isDead = true;
      return;
    }
    this.y += this.vy * dt;
  }

  render(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = this.isCrit ? 'bold 18px monospace' : 'bold 13px monospace';
    ctx.fillStyle = this.color;
    ctx.shadowBlur = this.isCrit ? 12 : 6;
    ctx.shadowColor = this.color;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = GAME_STATES.MENU;

    // Simulation systems
    this.world = new PhysicsWorld(2400, 1100);
    this.arena = new Arena(2400, 1100);
    this.chrono = new ChronoManager();
    this.particles = new ParticleSystem(1500);
    this.floatingTexts = [];

    // Populate world platforms and repulsors
    for (const p of this.arena.platforms) this.world.addPlatform(p);
    for (const gw of this.arena.gravityWells) this.world.addGravityWell(gw);
    for (const r of this.arena.repulsors) this.world.addRepulsor(r);

    // Active entities
    this.activeHero = null;
    this.clones = []; // Friendly replaying clones
    this.enemyClones = []; // Enemy AI defenders
    this.projectiles = [];

    // Camera & Screen
    this.camera = { x: 0, y: 0, shake: 0 };
    this.keys = {};
    this.mouse = { x: 0, y: 0, isDown: false, rightDown: false };
    this.rewindTimer = 0;
    this.gameOverResult = null; // 'VICTORY' or 'DEFEAT'
    this.selectedHeroId = 'ares';

    // Announcement banner
    this.announcement = { text: '', timer: 0 };

    // Minimap canvas
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    // Event hooks
    this.bindEvents();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Performance timer
    this.lastTime = performance.now();
    this.fixedDelta = 1 / 60;
    this.accumulator = 0;

    // Start render loop
    requestAnimationFrame((t) => this.loop(t));
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (window.soundEngine) window.soundEngine.init();

      if (e.key === ' ' || e.key.toLowerCase() === 'g') {
        if (this.activeHero) this.activeHero.tryAnchor = true;
      }

      if (e.key.toLowerCase() === 'h') {
        const helpOverlay = document.getElementById('help-overlay');
        if (helpOverlay) {
          helpOverlay.style.display = helpOverlay.style.display === 'flex' ? 'none' : 'flex';
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      if (e.key === ' ' || e.key.toLowerCase() === 'g') {
        if (this.activeHero) this.activeHero.tryAnchor = false;
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (window.soundEngine) {
        window.soundEngine.init();
        window.soundEngine.resume();
      }
      if (e.button === 0) this.mouse.isDown = true;
      if (e.button === 2) this.mouse.rightDown = true;
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.isDown = false;
      if (e.button === 2) this.mouse.rightDown = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  showAnnouncement(text, duration = 3.0) {
    this.announcement = { text, timer: duration };
  }

  addCombatText(x, y, text, color = '#ffffff', isCrit = false) {
    this.floatingTexts.push(new FloatingText(x, y, text, color, isCrit));
  }

  startMatch() {
    this.chrono.resetAll();
    this.arena = new Arena(2400, 1100);
    this.world = new PhysicsWorld(2400, 1100);
    for (const p of this.arena.platforms) this.world.addPlatform(p);
    for (const gw of this.arena.gravityWells) this.world.addGravityWell(gw);
    for (const r of this.arena.repulsors) this.world.addRepulsor(r);

    this.state = GAME_STATES.HERO_SELECT;
    this.showHeroSelectUI();
  }

  selectHero(heroId) {
    this.selectedHeroId = heroId;
    this.startLoopRun();
  }

  startLoopRun() {
    this.state = GAME_STATES.PLAYING;
    this.hideHeroSelectUI();

    // Clean reset physics bodies to avoid accumulating stale instances
    this.world.bodies = [];
    this.projectiles = [];
    this.floatingTexts = [];

    const startX = 220;
    const startY = 550 + (Math.random() - 0.5) * 80;

    // Instantiate active hero
    const config = HERO_ROSTER[this.selectedHeroId];
    this.activeHero = new Hero(config, startX, startY, 'player', false);
    this.world.addBody(this.activeHero);

    // Setup friendly clones from prior timelines
    this.clones = [];
    for (const recording of this.chrono.completedTimelines) {
      const cloneConfig = HERO_ROSTER[recording.heroId];
      const clone = new Hero(cloneConfig, recording.initialPos.x, recording.initialPos.y, 'player', true);
      clone.recordingData = recording;
      this.clones.push(clone);
      this.world.addBody(clone);
    }

    // Setup enemy AI defenders
    this.spawnEnemyDefenders();

    // Start recording for current loop
    this.chrono.startLoop(this.selectedHeroId, { x: startX, y: startY });

    // Announce loop deployment
    if (this.chrono.currentLoop === 1) {
      this.showAnnouncement('LOOP 1: INITIATING ZERO-G ASSAULT', 3.2);
    } else {
      this.showAnnouncement(`LOOP ${this.chrono.currentLoop}: ${this.clones.length} CHRONO CLONES DEPLOYED!`, 3.5);
    }
  }

  spawnEnemyDefenders() {
    this.enemyClones = [];
    const enemyTypes = ['ares', 'vectra', 'artemis', 'orion', 'chronia'];
    const count = Math.min(5, this.chrono.currentLoop + 1);

    for (let i = 0; i < count; i++) {
      const type = enemyTypes[i % enemyTypes.length];
      const cfg = HERO_ROSTER[type];
      const ex = 2160;
      const ey = 300 + i * 140;
      const enemy = new Hero(cfg, ex, ey, 'enemy', true);
      this.enemyClones.push(enemy);
      this.world.addBody(enemy);
    }
  }

  handlePlayerInput() {
    const input = {
      thrust: { x: 0, y: 0 },
      aimAngle: 0,
      driftMode: !!this.keys['shift'],
      basicAttack: this.mouse.isDown || !!this.keys['j'],
      tacticalSkill: this.mouse.rightDown || !!this.keys['q'] || !!this.keys['k'],
      ultimate: !!this.keys['e'] || !!this.keys['r'] || !!this.keys['l'],
    };

    if (this.keys['w'] || this.keys['arrowup']) input.thrust.y -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) input.thrust.y += 1;
    if (this.keys['a'] || this.keys['arrowleft']) input.thrust.x -= 1;
    if (this.keys['d'] || this.keys['arrowright']) input.thrust.x += 1;

    // Convert mouse screen position to world coordinates
    const worldMouseX = this.mouse.x + this.camera.x;
    const worldMouseY = this.mouse.y + this.camera.y;

    if (this.activeHero) {
      input.aimAngle = Math.atan2(worldMouseY - this.activeHero.pos.y, worldMouseX - this.activeHero.pos.x);
    }

    if (window.soundEngine) {
      const isThrusting = input.thrust.x !== 0 || input.thrust.y !== 0;
      window.soundEngine.setThrust(isThrusting);
    }

    return input;
  }

  triggerTimeRewind() {
    this.state = GAME_STATES.REWIND;
    this.rewindTimer = 1.3;
    if (window.soundEngine) window.soundEngine.playRewind();
    this.chrono.endLoop();

    this.world.bodies = [];
    this.projectiles = [];
  }

  stepSimulation() {
    if (this.state !== GAME_STATES.PLAYING) return;

    // Advance announcement banner timer
    if (this.announcement.timer > 0) {
      this.announcement.timer -= this.fixedDelta;
    }

    const allAllies = [
      ...(this.activeHero ? [this.activeHero] : []),
      ...this.clones,
    ];

    // 1. Active Player Input & Recording
    const playerInput = this.handlePlayerInput();
    if (this.activeHero && !this.activeHero.isDead) {
      this.chrono.recordTick(playerInput, {
        pos: this.activeHero.pos,
        vel: this.activeHero.vel,
        hp: this.activeHero.hp,
      });

      this.activeHero.updateHero(this.fixedDelta, playerInput, this.world, this.projectiles, this.particles, allAllies);
    }

    // 2. Friendly Replay Clones with safe boundary handling
    const curTick = this.chrono.currentTick;
    for (const clone of this.clones) {
      if (clone.isDead) continue;
      const rec = clone.recordingData;
      const frame = rec ? rec.getFrame(curTick) : null;
      if (!frame) {
        // Timeline completed for this clone
        clone.isDead = true;
        this.particles.emitChronoTrail(clone.pos.x, clone.pos.y, clone.color);
        continue;
      }
      clone.updateHero(this.fixedDelta, frame, this.world, this.projectiles, this.particles, allAllies);
    }

    // 3. Smart Enemy AI Defenders
    for (const enemy of this.enemyClones) {
      if (enemy.isDead) continue;

      // Target selection: active player > nearest clone > core
      let target = null;
      let minTargetDist = 800;
      if (this.activeHero && !this.activeHero.isDead) {
        target = this.activeHero;
        minTargetDist = Math.hypot(target.pos.x - enemy.pos.x, target.pos.y - enemy.pos.y);
      } else {
        for (const c of this.clones) {
          if (c.isDead) continue;
          const d = Math.hypot(c.pos.x - enemy.pos.x, c.pos.y - enemy.pos.y);
          if (d < minTargetDist) {
            minTargetDist = d;
            target = c;
          }
        }
      }

      let dx = -1;
      let dy = 0;
      let dist = 600;

      if (target) {
        dx = target.pos.x - enemy.pos.x;
        dy = target.pos.y - enemy.pos.y;
        dist = Math.hypot(dx, dy);
      } else {
        // Push toward player core
        dx = this.arena.playerCore.x - enemy.pos.x;
        dy = this.arena.playerCore.y - enemy.pos.y;
        dist = Math.hypot(dx, dy);
      }

      // Lead aiming calculation
      const leadTime = dist / 850;
      const aimTargetX = target ? target.pos.x + (target.vel ? target.vel.x * leadTime * 0.5 : 0) : enemy.pos.x + dx;
      const aimTargetY = target ? target.pos.y + (target.vel ? target.vel.y * leadTime * 0.5 : 0) : enemy.pos.y + dy;
      const aimAngle = Math.atan2(aimTargetY - enemy.pos.y, aimTargetX - enemy.pos.x);

      const aiInput = {
        thrust: {
          x: dist > 380 ? Math.sign(dx) * 0.8 : -Math.sign(dx) * 0.4,
          y: Math.sign(dy) * 0.6,
        },
        aimAngle,
        driftMode: false,
        basicAttack: dist < 550 && Math.random() < 0.1,
        tacticalSkill: dist < 420 && enemy.tacticalCd <= 0,
        ultimate: dist < 360 && enemy.ultimateCd <= 0,
      };

      enemy.updateHero(this.fixedDelta, aiInput, this.world, this.projectiles, this.particles, this.enemyClones);
    }

    // 4. Update Physics World
    this.world.step();

    // 5. Update Arena & Turrets
    const allHeroes = [
      ...(this.activeHero ? [this.activeHero] : []),
      ...this.clones,
      ...this.enemyClones,
    ];
    this.arena.update(this.fixedDelta, allHeroes, this.projectiles, window.soundEngine);

    // 6. Update Projectiles & Combat Interactions
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(this.fixedDelta, this.world, allHeroes);

      // Hit heroes check
      for (const h of allHeroes) {
        if (h.isDead) continue;
        if (p.team === h.team) {
          // Friendly Chronia heal dart
          if (p.type === 'chrono_dart' && p.source !== h) {
            const d = Math.hypot(p.x - h.pos.x, p.y - h.pos.y);
            if (d < p.radius + h.radius) {
              const healed = h.heal(140);
              if (healed > 0) this.addCombatText(h.pos.x, h.pos.y - 20, `+${Math.ceil(healed)}`, '#00ffc2');
              p.isDead = true;
              break;
            }
          }
          continue;
        }

        const d = Math.hypot(p.x - h.pos.x, p.y - h.pos.y);
        if (d < p.radius + h.radius) {
          const dmg = h.takeDamage(p.damage, p.source);
          const isCrit = p.damage > 300;
          this.addCombatText(h.pos.x, h.pos.y - 15, `-${Math.ceil(dmg)}`, isCrit ? '#ff1744' : '#ff9100', isCrit);
          this.particles.emitSparks(p.x, p.y, 8, p.color);
          this.camera.shake = Math.min(12, this.camera.shake + 3.5);

          if (p.type === 'stasis') {
            h.stunTimer = 1.8;
            h.vel.set(0, 0);
            this.addCombatText(h.pos.x, h.pos.y - 30, 'STUNNED!', '#00e5ff', true);
          } else if (p.type === 'harpoon') {
            if (p.source && !p.source.isDead) {
              h.pos.x = p.source.pos.x + 45;
              h.pos.y = p.source.pos.y;
              h.vel.set(0, 0);
              this.addCombatText(h.pos.x, h.pos.y - 30, 'HOOKED!', '#ffea00', true);
            }
          }

          p.isDead = true;
          break;
        }
      }

      // Hit enemy turrets or cores
      if (!p.isDead) {
        // Turrets
        for (const t of this.arena.turrets) {
          if (t.isDead || t.team === p.team) continue;
          if (Math.hypot(p.x - t.x, p.y - t.y) < p.radius + t.radius) {
            const dmg = t.takeDamage(p.damage);
            this.addCombatText(t.x, t.y - 20, `-${Math.ceil(dmg)}`, '#ff9100');
            this.particles.emitSparks(p.x, p.y, 10, '#ffffff');
            if (t.isDead) {
              this.showAnnouncement(t.team === 'enemy' ? 'ENEMY DEFENSE TURRET DESTROYED!' : 'OUR DEFENSE TURRET HAS FALLEN!', 3.0);
            }
            p.isDead = true;
            break;
          }
        }

        // Cores
        const targetCore = p.team === 'player' ? this.arena.enemyCore : this.arena.playerCore;
        if (!targetCore.isDead && Math.hypot(p.x - targetCore.x, p.y - targetCore.y) < p.radius + targetCore.radius) {
          const dmg = targetCore.takeDamage(p.damage);
          this.addCombatText(targetCore.x, targetCore.y - 30, `-${Math.ceil(dmg)}`, targetCore.shieldActive ? '#78909c' : '#ff1744', true);
          this.particles.emitSparks(p.x, p.y, 14, '#ffffff');
          p.isDead = true;
        }
      }

      if (p.isDead) {
        this.projectiles.splice(i, 1);
      }
    }

    // 7. Update Particles & Floating Text
    this.particles.update(this.fixedDelta);
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].update(this.fixedDelta);
      if (this.floatingTexts[i].isDead) this.floatingTexts.splice(i, 1);
    }

    // 8. Check Victory / Defeat Conditions
    if (this.arena.enemyCore.isDead) {
      this.state = GAME_STATES.GAME_OVER;
      this.gameOverResult = 'VICTORY';
      if (window.soundEngine) window.soundEngine.playVictory();
      this.showGameOverUI();
      return;
    }

    if (this.arena.playerCore.isDead) {
      this.state = GAME_STATES.GAME_OVER;
      this.gameOverResult = 'DEFEAT';
      if (window.soundEngine) window.soundEngine.playExplosion(true);
      this.showGameOverUI();
      return;
    }

    // 9. Advance timeline tick
    const loopFinished = this.chrono.advanceTick();
    const heroDead = this.activeHero && this.activeHero.isDead;

    if (loopFinished || heroDead) {
      if (this.chrono.currentLoop < this.chrono.maxLoops) {
        this.chrono.currentLoop++;
        this.triggerTimeRewind();
      } else {
        this.state = GAME_STATES.GAME_OVER;
        this.gameOverResult = this.arena.enemyCore.hp < this.arena.playerCore.hp ? 'VICTORY' : 'DEFEAT';
        if (this.gameOverResult === 'VICTORY') {
          if (window.soundEngine) window.soundEngine.playVictory();
        }
        this.showGameOverUI();
      }
    }
  }

  updateCamera() {
    if (this.activeHero) {
      const targetX = this.activeHero.pos.x - this.canvas.width / 2;
      const targetY = this.activeHero.pos.y - this.canvas.height / 2;
      this.camera.x += (targetX - this.camera.x) * 0.1;
      this.camera.y += (targetY - this.camera.y) * 0.1;
    }

    // Clamp camera within arena
    this.camera.x = Math.max(0, Math.min(this.arena.width - this.canvas.width, this.camera.x));
    this.camera.y = Math.max(0, Math.min(this.arena.height - this.canvas.height, this.camera.y));

    // Screen shake
    if (this.camera.shake > 0) {
      this.camera.x += (Math.random() - 0.5) * this.camera.shake;
      this.camera.y += (Math.random() - 0.5) * this.camera.shake;
      this.camera.shake = Math.max(0, this.camera.shake - 0.6);
    }
  }

  loop(timestamp) {
    const elapsed = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    this.accumulator += Math.min(0.2, elapsed);

    while (this.accumulator >= this.fixedDelta) {
      if (this.state === GAME_STATES.PLAYING) {
        this.stepSimulation();
      } else if (this.state === GAME_STATES.REWIND) {
        this.rewindTimer -= this.fixedDelta;
        this.particles.update(this.fixedDelta);
        if (this.rewindTimer <= 0) {
          this.state = GAME_STATES.HERO_SELECT;
          this.showHeroSelectUI();
        }
      }
      this.accumulator -= this.fixedDelta;
    }

    this.updateCamera();
    this.render();
    this.renderMinimap();
    this.updateHUD();

    requestAnimationFrame((t) => this.loop(t));
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Deep cosmic background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    // Subtle cosmic grid lines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.arena.width; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.arena.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.arena.height; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.arena.width, y);
      ctx.stroke();
    }

    // Render Arena
    this.arena.render(ctx);

    // Render Clones & Active Hero
    for (const c of this.clones) c.render(ctx);
    for (const e of this.enemyClones) e.render(ctx);
    if (this.activeHero) this.activeHero.render(ctx);

    // Render Projectiles
    for (const p of this.projectiles) p.render(ctx);

    // Render Particles
    this.particles.render(ctx);

    // Render Floating Damage Numbers
    for (const ft of this.floatingTexts) ft.render(ctx);

    ctx.restore();

    // Render Announcement Banner
    if (this.announcement.timer > 0) {
      ctx.save();
      const alpha = Math.min(1, this.announcement.timer * 2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(10, 25, 47, 0.85)';
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      const boxW = 540;
      const boxH = 46;
      const boxX = (this.canvas.width - boxW) / 2;
      const boxY = 82;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f3ff';
      ctx.fillText(this.announcement.text, this.canvas.width / 2, boxY + 28);
      ctx.restore();
    }

    // Render Time-Rewind Effect overlay
    if (this.state === GAME_STATES.REWIND) {
      const alpha = Math.sin((this.rewindTimer / 1.3) * Math.PI) * 0.65;
      ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('<< TEMPORAL REWIND: RESETTING TO T=0 <<', this.canvas.width / 2, this.canvas.height / 2);
    }
  }

  renderMinimap() {
    if (!this.minimapCtx || this.state !== GAME_STATES.PLAYING) return;
    const mctx = this.minimapCtx;
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;

    mctx.clearRect(0, 0, mw, mh);
    mctx.fillStyle = 'rgba(6, 12, 24, 0.88)';
    mctx.fillRect(0, 0, mw, mh);

    const scaleX = mw / this.arena.width;
    const scaleY = mh / this.arena.height;

    // Draw Cores
    mctx.fillStyle = '#00e5ff';
    mctx.beginPath();
    mctx.arc(this.arena.playerCore.x * scaleX, this.arena.playerCore.y * scaleY, 4, 0, Math.PI * 2);
    mctx.fill();

    mctx.fillStyle = '#ff1744';
    mctx.beginPath();
    mctx.arc(this.arena.enemyCore.x * scaleX, this.arena.enemyCore.y * scaleY, 4, 0, Math.PI * 2);
    mctx.fill();

    // Draw Turrets
    for (const t of this.arena.turrets) {
      if (t.isDead) continue;
      mctx.fillStyle = t.team === 'player' ? '#00e676' : '#d50000';
      mctx.fillRect(t.x * scaleX - 2.5, t.y * scaleY - 2.5, 5, 5);
    }

    // Draw Friendly Clones
    mctx.fillStyle = '#80d8ff';
    for (const c of this.clones) {
      if (c.isDead) continue;
      mctx.fillRect(c.pos.x * scaleX - 1.5, c.pos.y * scaleY - 1.5, 3, 3);
    }

    // Draw Active Hero
    if (this.activeHero && !this.activeHero.isDead) {
      mctx.fillStyle = '#ffffff';
      mctx.shadowBlur = 6;
      mctx.shadowColor = '#00f3ff';
      mctx.beginPath();
      mctx.arc(this.activeHero.pos.x * scaleX, this.activeHero.pos.y * scaleY, 3, 0, Math.PI * 2);
      mctx.fill();
    }

    // Draw Enemy Heroes
    mctx.fillStyle = '#ff5252';
    for (const e of this.enemyClones) {
      if (e.isDead) continue;
      mctx.fillRect(e.pos.x * scaleX - 1.5, e.pos.y * scaleY - 1.5, 3, 3);
    }

    // Draw Viewport Camera Box
    mctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    mctx.lineWidth = 1;
    mctx.strokeRect(this.camera.x * scaleX, this.camera.y * scaleY, this.canvas.width * scaleX, this.canvas.height * scaleY);
  }

  updateHUD() {
    const hud = document.getElementById('game-hud');
    if (!hud) return;

    if (this.state === GAME_STATES.PLAYING) {
      hud.style.display = 'block';

      // HP & Fuel
      if (this.activeHero) {
        const hpEl = document.getElementById('hud-hp-bar');
        const hpText = document.getElementById('hud-hp-text');
        const fuelEl = document.getElementById('hud-fuel-bar');
        const driftEl = document.getElementById('hud-drift-status');
        const heroNameEl = document.getElementById('hud-hero-name');

        if (hpEl) hpEl.style.width = `${Math.max(0, (this.activeHero.hp / this.activeHero.maxHp) * 100)}%`;
        if (hpText) hpText.innerText = `${Math.ceil(this.activeHero.hp)} / ${this.activeHero.maxHp} HP`;
        if (fuelEl) fuelEl.style.width = `${this.activeHero.fuel}%`;
        if (driftEl) driftEl.innerText = this.activeHero.driftMode ? 'DRIFT MODE [ACTIVE - 0 DAMPING]' : 'RCS DAMPING [ACTIVE]';
        if (heroNameEl) heroNameEl.innerText = `${this.activeHero.name} (${this.activeHero.role})`;

        // Cooldowns
        const skill1 = document.getElementById('skill1-cd');
        const ult = document.getElementById('ult-cd');
        if (skill1) skill1.innerText = this.activeHero.tacticalCd > 0 ? this.activeHero.tacticalCd.toFixed(1) + 's' : 'READY';
        if (ult) ult.innerText = this.activeHero.ultimateCd > 0 ? this.activeHero.ultimateCd.toFixed(1) + 's' : 'READY';
      }

      // Loop & Timer
      const timerEl = document.getElementById('hud-timer');
      const loopEl = document.getElementById('hud-loop');
      if (timerEl) timerEl.innerText = `00:${Math.ceil(this.chrono.getRemainingTime()).toString().padStart(2, '0')}`;
      if (loopEl) loopEl.innerText = `LOOP ${this.chrono.currentLoop} / ${this.chrono.maxLoops}`;

      // Timeline tracker scroller
      const playhead = document.getElementById('timeline-playhead');
      if (playhead) {
        const ratio = (this.chrono.currentTick / this.chrono.totalTicksPerLoop) * 100;
        playhead.style.left = `${ratio}%`;
      }
    } else {
      hud.style.display = 'none';
    }
  }

  showHeroSelectUI() {
    const el = document.getElementById('hero-select-modal');
    if (el) {
      el.style.display = 'flex';
      const loopTitle = document.getElementById('hero-select-loop-title');
      if (loopTitle) {
        loopTitle.innerText = `CHOOSE HERO CHAMPION FOR LOOP ${this.chrono.currentLoop} OF ${this.chrono.maxLoops}`;
      }
    }
  }

  hideHeroSelectUI() {
    const el = document.getElementById('hero-select-modal');
    if (el) el.style.display = 'none';
  }

  showGameOverUI() {
    const el = document.getElementById('game-over-modal');
    if (el) {
      el.style.display = 'flex';
      const title = document.getElementById('game-over-title');
      const desc = document.getElementById('game-over-desc');
      if (title) title.innerText = this.gameOverResult === 'VICTORY' ? '🏆 VICTORY: CORE DESTROYED! 🏆' : '💀 DEFEAT: BASE BREACHED 💀';
      if (desc) {
        desc.innerText = this.gameOverResult === 'VICTORY'
          ? 'You engineered a flawless multi-turn causal timeline combo! Enemy nexus matrix has been pulverized.'
          : 'Your base cores were overwhelmed by enemy forces. Time-loop fractured.';
      }
    }
  }
}

window.Game = Game;
window.GAME_STATES = GAME_STATES;
