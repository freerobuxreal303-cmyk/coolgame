// Zero-G Tactics: Chrono Legends - Arena & Environmental Systems
// Implements Celestial Sanctuary map layout, Cores with barrier shields, Turrets, Grav-Wells, and Bounce Bumpers.

class CoreBase {
  constructor(x, y, team = 'player') {
    this.x = x;
    this.y = y;
    this.radius = 58;
    this.team = team;
    this.maxHp = 10000;
    this.hp = this.maxHp;
    this.isDead = false;
    this.pulse = 0;
    this.shieldActive = true; // Shielded while friendly turrets are alive
  }

  takeDamage(amount) {
    if (this.isDead) return 0;
    if (this.shieldActive) {
      // 80% damage reduction when turrets are active
      amount *= 0.2;
    }
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      if (window.soundEngine) window.soundEngine.playExplosion(true);
    }
    return amount;
  }

  render(ctx) {
    this.pulse += 0.04;
    const glow = Math.sin(this.pulse) * 5;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Protective Barrier Dome
    if (this.shieldActive) {
      ctx.strokeStyle = this.team === 'player' ? 'rgba(0, 229, 255, 0.45)' : 'rgba(255, 23, 68, 0.45)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Outer Energy Ring
    ctx.strokeStyle = this.team === 'player' ? '#00e5ff' : '#ff1744';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 22 + glow;
    ctx.shadowColor = this.team === 'player' ? '#00e5ff' : '#ff1744';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
    ctx.stroke();

    // Core Crystal Body
    ctx.fillStyle = this.team === 'player' ? '#0070ba' : '#b71c1c';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner Radiant Pulsing Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // HP Bar
    const barW = 96;
    const barH = 10;
    const ratio = this.hp / this.maxHp;
    ctx.fillStyle = '#111111';
    ctx.fillRect(-barW / 2, -this.radius - 24, barW, barH);
    ctx.fillStyle = this.team === 'player' ? '#00ff66' : '#ff3366';
    ctx.fillRect(-barW / 2, -this.radius - 24, barW * ratio, barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-barW / 2, -this.radius - 24, barW, barH);

    // Text Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.team === 'player' ? 'PLAYER NEXUS CORE' : 'ENEMY MATRIX CORE', 0, -this.radius - 30);
    ctx.fillText(`${Math.ceil(this.hp)} / ${this.maxHp} HP`, 0, -this.radius - 10);

    if (this.shieldActive) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = '10px monospace';
      ctx.fillText('[DEFENSE SHIELD: 80% REDUCTION]', 0, this.radius + 28);
    }

    ctx.restore();
  }
}

class DefenseTurret {
  constructor(x, y, team = 'player', lane = 'top') {
    this.x = x;
    this.y = y;
    this.lane = lane;
    this.radius = 32;
    this.team = team;
    this.maxHp = 3500;
    this.hp = this.maxHp;
    this.range = 580;
    this.attackCd = 0;
    this.attackRate = 1.05; // Seconds per shot
    this.isDead = false;
    this.target = null;
    this.aimAngle = 0;
  }

  update(dt, heroes, projectiles, soundEngine) {
    if (this.isDead) return;
    if (this.attackCd > 0) this.attackCd -= dt;

    // Scan for nearest hostile hero/clone
    let nearest = null;
    let minDist = this.range;
    for (const h of heroes) {
      if (h.isDead || h.team === this.team) continue;
      const d = Math.hypot(h.pos.x - this.x, h.pos.y - this.y);
      if (d < minDist) {
        minDist = d;
        nearest = h;
      }
    }

    this.target = nearest;

    if (this.target) {
      this.aimAngle = Math.atan2(this.target.pos.y - this.y, this.target.pos.x - this.x);
      if (this.attackCd <= 0) {
        this.fire(projectiles, soundEngine);
        this.attackCd = this.attackRate;
      }
    }
  }

  fire(projectiles, soundEngine) {
    if (!this.target) return;
    if (soundEngine) soundEngine.playTurretFire();

    const speed = 780;
    const vx = Math.cos(this.aimAngle) * speed;
    const vy = Math.sin(this.aimAngle) * speed;

    projectiles.push(new Projectile({
      x: this.x + Math.cos(this.aimAngle) * 36,
      y: this.y + Math.sin(this.aimAngle) * 36,
      vx,
      vy,
      radius: 8,
      damage: 280,
      team: this.team,
      life: 1.5,
      color: this.team === 'player' ? '#00e5ff' : '#ff0055',
      source: this,
    }));
  }

  takeDamage(amount) {
    if (this.isDead) return 0;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      if (window.soundEngine) window.soundEngine.playExplosion(true);
    }
    return amount;
  }

  render(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Turret Base
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.team === 'player' ? '#00e5ff' : '#ff1744';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Turret Barrel
    ctx.rotate(this.aimAngle);
    ctx.fillStyle = this.team === 'player' ? '#00b0ff' : '#d50000';
    ctx.fillRect(0, -6, 44, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(39, -4, 6, 8);

    ctx.rotate(-this.aimAngle);

    // Laser targeting beam preview
    if (this.target) {
      ctx.strokeStyle = this.team === 'player' ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255, 23, 68, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(this.target.pos.x - this.x, this.target.pos.y - this.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Health Bar
    const barW = 62;
    const barH = 6;
    const ratio = this.hp / this.maxHp;
    ctx.fillStyle = '#111111';
    ctx.fillRect(-barW / 2, -this.radius - 14, barW, barH);
    ctx.fillStyle = this.team === 'player' ? '#00e676' : '#ff1744';
    ctx.fillRect(-barW / 2, -this.radius - 14, barW * ratio, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(this.hp)} HP`, 0, -this.radius - 18);

    ctx.restore();
  }
}

class Arena {
  constructor(width = 2400, height = 1100) {
    this.width = width;
    this.height = height;

    this.playerCore = new CoreBase(140, height / 2, 'player');
    this.enemyCore = new CoreBase(width - 140, height / 2, 'enemy');

    this.turrets = [
      new DefenseTurret(550, 320, 'player', 'top'),
      new DefenseTurret(550, 780, 'player', 'bottom'),
      new DefenseTurret(width - 550, 320, 'enemy', 'top'),
      new DefenseTurret(width - 550, 780, 'enemy', 'bottom'),
    ];

    this.platforms = [
      // Top Lane Floating Bridges
      { x: 350, y: 220, w: 280, h: 24, active: true, color: '#37474f' },
      { x: 850, y: 180, w: 320, h: 24, active: true, color: '#37474f' },
      { x: 1230, y: 180, w: 320, h: 24, active: true, color: '#37474f' },
      { x: 1770, y: 220, w: 280, h: 24, active: true, color: '#37474f' },

      // Mid Lane Tactical Choke & Destructible Crystals
      { x: 720, y: 540, w: 220, h: 24, active: true, color: '#455a64' },
      { x: 1040, y: 535, w: 120, h: 32, active: true, color: '#00e5ff', isDestructible: true, hp: 600 },
      { x: 1240, y: 535, w: 120, h: 32, active: true, color: '#00e5ff', isDestructible: true, hp: 600 },
      { x: 1460, y: 540, w: 220, h: 24, active: true, color: '#455a64' },

      // Bottom Lane Floating Platforms
      { x: 350, y: 880, w: 280, h: 24, active: true, color: '#37474f' },
      { x: 850, y: 920, w: 320, h: 24, active: true, color: '#37474f' },
      { x: 1230, y: 920, w: 320, h: 24, active: true, color: '#37474f' },
      { x: 1770, y: 880, w: 280, h: 24, active: true, color: '#37474f' },
    ];

    // Central Gravitational Singularity Well
    this.gravityWells = [
      {
        x: width / 2,
        y: height / 2,
        radius: 380,
        strength: 650000,
        active: true,
      }
    ];

    // Kinetic Repulsor Bumpers (1.35x velocity multiplier)
    this.repulsors = [
      { x: 1000, y: 350, radius: 26, active: true, color: '#ffea00' },
      { x: 1400, y: 350, radius: 26, active: true, color: '#ffea00' },
      { x: 1000, y: 750, radius: 26, active: true, color: '#ffea00' },
      { x: 1400, y: 750, radius: 26, active: true, color: '#ffea00' },
    ];
  }

  update(dt, heroes, projectiles, soundEngine) {
    // Check if turrets are alive to update core shield status
    const playerTurretsAlive = this.turrets.some(t => t.team === 'player' && !t.isDead);
    const enemyTurretsAlive = this.turrets.some(t => t.team === 'enemy' && !t.isDead);

    this.playerCore.shieldActive = playerTurretsAlive;
    this.enemyCore.shieldActive = enemyTurretsAlive;

    // Update turrets
    for (const t of this.turrets) {
      t.update(dt, heroes, projectiles, soundEngine);
    }

    // Dynamic gravity wells expiration
    for (let i = this.gravityWells.length - 1; i >= 0; i--) {
      const gw = this.gravityWells[i];
      if (gw.timer !== undefined) {
        gw.timer -= dt;
        if (gw.timer <= 0) this.gravityWells.splice(i, 1);
      }
    }
  }

  render(ctx) {
    // 0. Lane markings
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(140, 320);
    ctx.lineTo(this.width - 140, 320);
    ctx.moveTo(140, this.height / 2);
    ctx.lineTo(this.width - 140, this.height / 2);
    ctx.moveTo(140, 780);
    ctx.lineTo(this.width - 140, 780);
    ctx.stroke();
    ctx.setLineDash([]);

    // 1. Draw Singularity Gravity Wells
    for (const gw of this.gravityWells) {
      if (!gw.active) continue;
      const grad = ctx.createRadialGradient(gw.x, gw.y, 10, gw.x, gw.y, gw.radius);
      grad.addColorStop(0, 'rgba(124, 77, 255, 0.45)');
      grad.addColorStop(0.5, 'rgba(49, 27, 146, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gw.x, gw.y, gw.radius, 0, Math.PI * 2);
      ctx.fill();

      // Swirling center event horizon
      ctx.fillStyle = '#0a001a';
      ctx.beginPath();
      ctx.arc(gw.x, gw.y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b388ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // 2. Draw Platforms
    for (const p of this.platforms) {
      if (!p.active) continue;
      ctx.save();
      if (p.isDestructible) {
        ctx.fillStyle = p.hp > 300 ? '#00e5ff' : '#ff9100';
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
      } else {
        ctx.fillStyle = p.color;
      }
      ctx.fillRect(p.x, p.y, p.w, p.h);

      ctx.strokeStyle = '#90a4ae';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.restore();
    }

    // 3. Draw Repulsor Bumpers
    for (const r of this.repulsors) {
      if (!r.active) continue;
      ctx.save();
      ctx.fillStyle = r.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffd600';
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Draw Turrets
    for (const t of this.turrets) {
      t.render(ctx);
    }

    // 5. Draw Cores
    this.playerCore.render(ctx);
    this.enemyCore.render(ctx);
  }
}

// Module export
if (typeof window !== 'undefined') {
  window.CoreBase = CoreBase;
  window.DefenseTurret = DefenseTurret;
  window.Arena = Arena;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CoreBase, DefenseTurret, Arena };
}
