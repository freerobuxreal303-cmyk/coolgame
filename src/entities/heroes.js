// Zero-G Tactics: Chrono Legends - Hero Roster & Ability Systems
// Implementations for Iron Wall Ares, Vectra, Artemis-9, Orion, and Chronia.

class Projectile {
  constructor(opt = {}) {
    this.x = opt.x || 0;
    this.y = opt.y || 0;
    this.vx = opt.vx || 0;
    this.vy = opt.vy || 0;
    this.radius = opt.radius || 5;
    this.damage = opt.damage || 150;
    this.team = opt.team || 'player'; // 'player' or 'enemy'
    this.life = opt.life || 2.5;
    this.color = opt.color || '#00ffff';
    this.source = opt.source || null;
    this.type = opt.type || 'bullet'; // 'bullet', 'mine', 'stasis', 'dagger', 'harpoon', 'heal'
    this.homing = opt.homing || false;
    this.homingTarget = null;
    this.isDead = false;
    this.extra = opt.extra || {};
  }

  update(dt, world, enemies) {
    this.life -= dt;
    if (this.life <= 0) {
      this.isDead = true;
      return;
    }

    // Homing behavior for Orion or special projectiles
    if (this.homing && enemies && enemies.length > 0) {
      let nearest = null;
      let minDist = 400;
      for (const e of enemies) {
        if (e.isDead || e.team === this.team) continue;
        const d = Math.hypot(e.pos.x - this.x, e.pos.y - this.y);
        if (d < minDist) {
          minDist = d;
          nearest = e;
        }
      }
      if (nearest) {
        const targetAngle = Math.atan2(nearest.pos.y - this.y, nearest.pos.x - this.x);
        const curAngle = Math.atan2(this.vy, this.vx);
        const diff = Math.atan2(Math.sin(targetAngle - curAngle), Math.cos(targetAngle - curAngle));
        const newAngle = curAngle + diff * Math.min(1, dt * 6);
        const speed = Math.hypot(this.vx, this.vy);
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Platform collision for regular bullets
    if (world && this.type !== 'stasis_well') {
      for (const p of world.platforms) {
        if (!p.active) continue;
        if (this.x >= p.x && this.x <= p.x + p.w && this.y >= p.y && this.y <= p.y + p.h) {
          if (p.isDestructible) {
            p.hp -= this.damage;
            if (p.hp <= 0) p.destroy(world);
          }
          this.isDead = true;
          return;
        }
      }
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.type === 'mine') {
      ctx.fillStyle = '#ffaa00';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff5500';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (this.type === 'dagger') {
      const angle = Math.atan2(this.vy, this.vx);
      ctx.rotate(angle);
      ctx.fillStyle = '#b388ff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#d500f9';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -4);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 4);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'harpoon') {
      const angle = Math.atan2(this.vy, this.vx);
      ctx.rotate(angle);
      ctx.fillStyle = '#ffcc00';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffbb00';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-6, -6);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

class Hero extends RigidBody {
  constructor(heroConfig, x, y, team = 'player', isClone = false) {
    super({
      x,
      y,
      mass: heroConfig.mass || 70,
      radius: heroConfig.radius || 20,
      restitution: 0.35,
      damping: 0.985,
    });

    this.id = heroConfig.id;
    this.name = heroConfig.name;
    this.role = heroConfig.role;
    this.team = team;
    this.isClone = isClone;

    this.maxHp = heroConfig.hp || 2000;
    this.hp = this.maxHp;
    this.shield = 0;
    this.maxShield = heroConfig.shield || 400;

    this.thrustForce = heroConfig.thrust || 18000;
    this.aimAngle = 0;
    this.fuel = 100;
    this.maxFuel = 100;

    // Cooldowns
    this.tacticalCd = 0;
    this.maxTacticalCd = heroConfig.tacticalCd || 6.0;
    this.ultimateCd = 0;
    this.maxUltimateCd = heroConfig.ultimateCd || 22.0;
    this.basicAttackCd = 0;
    this.basicAttackRate = heroConfig.basicAttackRate || 0.35;

    // Status effects
    this.stunTimer = 0;
    this.tetherTarget = null;
    this.color = heroConfig.color || '#00e5ff';
    this.secondaryColor = heroConfig.secondaryColor || '#ffffff';

    // Hero-specific states
    this.cables = []; // For Vectra
    this.daggers = []; // For Vectra
    this.orbitingSpheres = 3; // For Orion
    this.bastionShieldActive = false; // For Ares
    this.bastionTimer = 0;
  }

  isStunned() {
    return this.stunTimer > 0;
  }

  takeDamage(amount, source) {
    if (this.isDead) return;

    // Check Ares bastion shield absorption
    if (this.bastionShieldActive) {
      amount *= 0.3; // 70% damage reduction
    }

    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
        return;
      } else {
        amount -= this.shield;
        this.shield = 0;
      }
    }

    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      if (window.soundEngine) window.soundEngine.playExplosion(true);
    }
  }

  heal(amount) {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    if (window.soundEngine) window.soundEngine.playHeal();
  }

  updateHero(dt, input, world, projectiles, particleSystem) {
    if (this.isDead) return;

    // Tick cooldowns
    if (this.tacticalCd > 0) this.tacticalCd -= dt;
    if (this.ultimateCd > 0) this.ultimateCd -= dt;
    if (this.basicAttackCd > 0) this.basicAttackCd -= dt;
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return; // Stun disables actions
    }

    // Regulate fuel
    if (input.thrust.x !== 0 || input.thrust.y !== 0) {
      this.fuel = Math.max(0, this.fuel - 12 * dt);
    } else {
      this.fuel = Math.min(this.maxFuel, this.fuel + 25 * dt);
    }

    // Toggle drift mode (Shift key)
    this.driftMode = input.driftMode;

    // Aim angle update
    this.aimAngle = input.aimAngle;

    // Apply thrust if fuel is available
    if (this.fuel > 0 && (input.thrust.x !== 0 || input.thrust.y !== 0)) {
      const thrustVec = new Vec2(input.thrust.x, input.thrust.y).normalize();
      const fx = thrustVec.x * this.thrustForce;
      const fy = thrustVec.y * this.thrustForce;
      this.applyForce(new Vec2(fx, fy));

      if (this.isAnchored && (input.thrust.x !== 0 || input.thrust.y !== 0)) {
        this.isAnchored = false; // Thrust breaks anchor
      }

      // Visual thruster particles
      if (particleSystem) {
        const backAngle = thrustVec.heading() + Math.PI;
        particleSystem.emitThruster(this.pos.x, this.pos.y, backAngle, this.color);
      }
    }

    // Clones generate temporal trails
    if (this.isClone && particleSystem && Math.random() < 0.4) {
      particleSystem.emitChronoTrail(this.pos.x, this.pos.y, this.color);
    }

    // Ares Bastion timer
    if (this.bastionShieldActive) {
      this.bastionTimer -= dt;
      if (this.bastionTimer <= 0) {
        this.bastionShieldActive = false;
        // Trigger gravitational implosion
        if (world && window.soundEngine) {
          window.soundEngine.playSingularity();
          world.gravityWells.push({
            x: this.pos.x,
            y: this.pos.y,
            radius: 350,
            strength: 900000,
            active: true,
            timer: 0.8,
          });
        }
      }
    }

    // Cable physics for Vectra
    if (this.cables.length > 0) {
      for (const cable of this.cables) {
        const dx = cable.anchor.x - this.pos.x;
        const dy = cable.anchor.y - this.pos.y;
        const d = Math.hypot(dx, dy);
        if (d > 20) {
          const pull = 26000;
          this.applyForce(new Vec2((dx / d) * pull, (dy / d) * pull));
        }
      }
    }

    // Perform hero abilities based on input
    if (input.basicAttack && this.basicAttackCd <= 0) {
      this.executeBasicAttack(projectiles, particleSystem, world);
      this.basicAttackCd = this.basicAttackRate;
    }

    if (input.tacticalSkill && this.tacticalCd <= 0) {
      this.executeTacticalSkill(projectiles, particleSystem, world);
      this.tacticalCd = this.maxTacticalCd;
    }

    if (input.ultimate && this.ultimateCd <= 0) {
      this.executeUltimate(projectiles, particleSystem, world);
      this.ultimateCd = this.maxUltimateCd;
    }
  }

  executeBasicAttack(projectiles, particleSystem, world) {
    const aimVec = Vec2.fromAngle(this.aimAngle);

    if (this.id === 'ares') {
      // Gauss Hammer: Melee arc shockwave
      if (window.soundEngine) window.soundEngine.playRecoil();
      const slashX = this.pos.x + aimVec.x * 35;
      const slashY = this.pos.y + aimVec.y * 35;
      projectiles.push(new Projectile({
        x: slashX,
        y: slashY,
        vx: aimVec.x * 300,
        vy: aimVec.y * 300,
        radius: 28,
        damage: 240,
        team: this.team,
        life: 0.18,
        color: '#ffbb00',
        source: this,
      }));
      if (particleSystem) particleSystem.emitSparks(slashX, slashY, 12, '#ffbb00');
    } else if (this.id === 'vectra') {
      // Plasma Edge: Spinning 360 blades
      if (window.soundEngine) window.soundEngine.playDagger();
      const speed = this.vel.mag();
      const bonusDmg = speed > 300 ? 150 : 0;
      projectiles.push(new Projectile({
        x: this.pos.x,
        y: this.pos.y,
        vx: aimVec.x * 200,
        vy: aimVec.y * 200,
        radius: 36,
        damage: 220 + bonusDmg,
        team: this.team,
        life: 0.15,
        color: '#d500f9',
        source: this,
      }));
      if (particleSystem) particleSystem.emitSparks(this.pos.x, this.pos.y, 16, '#e040fb');
    } else if (this.id === 'artemis') {
      // Antimatter Slug: Railgun shot with massive reverse recoil!
      if (window.soundEngine) {
        window.soundEngine.playLaser(1.1);
        window.soundEngine.playRecoil();
      }
      const pSpeed = 1100;
      projectiles.push(new Projectile({
        x: this.pos.x + aimVec.x * 25,
        y: this.pos.y + aimVec.y * 25,
        vx: aimVec.x * pSpeed,
        vy: aimVec.y * pSpeed,
        radius: 6,
        damage: 320,
        team: this.team,
        life: 2.2,
        color: '#00f3ff',
        source: this,
      }));

      // NEWTONIAN RECOIL: kicks Artemis backward!
      this.applyRecoil(new Vec2(aimVec.x * 24000, aimVec.y * 24000));
      if (particleSystem) {
        particleSystem.emitThruster(this.pos.x, this.pos.y, this.aimAngle, '#00f3ff');
      }
    } else if (this.id === 'orion') {
      // Quantum Pulse: Homing plasma orb
      if (window.soundEngine) window.soundEngine.playLaser(0.7);
      projectiles.push(new Projectile({
        x: this.pos.x + aimVec.x * 20,
        y: this.pos.y + aimVec.y * 20,
        vx: aimVec.x * 450,
        vy: aimVec.y * 450,
        radius: 9,
        damage: 200,
        team: this.team,
        life: 3.0,
        color: '#7c4dff',
        homing: true,
        source: this,
      }));
    } else if (this.id === 'chronia') {
      // Chrono-Dart: Heals friendly, harms enemy
      if (window.soundEngine) window.soundEngine.playLaser(1.4);
      projectiles.push(new Projectile({
        x: this.pos.x + aimVec.x * 20,
        y: this.pos.y + aimVec.y * 20,
        vx: aimVec.x * 650,
        vy: aimVec.y * 650,
        radius: 7,
        damage: 160,
        team: this.team,
        life: 2.0,
        color: '#00ffc2',
        type: 'chrono_dart',
        source: this,
      }));
    }
  }

  executeTacticalSkill(projectiles, particleSystem, world) {
    const aimVec = Vec2.fromAngle(this.aimAngle);

    if (this.id === 'ares') {
      // Grav-Harpoon (Franco Hook)
      if (window.soundEngine) window.soundEngine.playHook();
      projectiles.push(new Projectile({
        x: this.pos.x + aimVec.x * 25,
        y: this.pos.y + aimVec.y * 25,
        vx: aimVec.x * 850,
        vy: aimVec.y * 850,
        radius: 12,
        damage: 180,
        team: this.team,
        life: 0.8,
        color: '#ffea00',
        type: 'harpoon',
        source: this,
      }));
    } else if (this.id === 'vectra') {
      // Steel Cable: Launches wire toward obstacle/platform
      if (window.soundEngine) window.soundEngine.playCable();
      // Raycast to find nearest platform
      let hitPoint = null;
      let minRayDist = 600;
      for (let r = 20; r < 600; r += 20) {
        const testX = this.pos.x + aimVec.x * r;
        const testY = this.pos.y + aimVec.y * r;
        for (const p of world.platforms) {
          if (!p.active) continue;
          if (testX >= p.x && testX <= p.x + p.w && testY >= p.y && testY <= p.y + p.h) {
            hitPoint = { x: testX, y: testY };
            minRayDist = r;
            break;
          }
        }
        if (hitPoint) break;
      }
      if (!hitPoint) {
        hitPoint = { x: this.pos.x + aimVec.x * 450, y: this.pos.y + aimVec.y * 450 };
      }
      this.cables.push({ anchor: hitPoint, life: 1.2 });
      setTimeout(() => { this.cables = []; }, 1100);
      this.applyImpulse(new Vec2(aimVec.x * 22000, aimVec.y * 22000));
    } else if (this.id === 'artemis') {
      // RCS Retro-Burst & Mines
      if (window.soundEngine) window.soundEngine.playRecoil();
      this.applyImpulse(new Vec2(-aimVec.x * 18000, -aimVec.y * 18000));
      for (let i = 0; i < 3; i++) {
        const spread = (i - 1) * 0.4;
        const angle = this.aimAngle + Math.PI + spread;
        projectiles.push(new Projectile({
          x: this.pos.x,
          y: this.pos.y,
          vx: Math.cos(angle) * 120,
          vy: Math.sin(angle) * 120,
          radius: 8,
          damage: 260,
          team: this.team,
          life: 8.0,
          type: 'mine',
          source: this,
        }));
      }
    } else if (this.id === 'orion') {
      // Stasis Orb (Eudora Stun)
      if (window.soundEngine) window.soundEngine.playStasis();
      projectiles.push(new Projectile({
        x: this.pos.x + aimVec.x * 25,
        y: this.pos.y + aimVec.y * 25,
        vx: aimVec.x * 600,
        vy: aimVec.y * 600,
        radius: 14,
        damage: 150,
        team: this.team,
        life: 2.0,
        color: '#00e5ff',
        type: 'stasis',
        source: this,
      }));
    } else if (this.id === 'chronia') {
      // Temporal Stasis Barrier
      if (window.soundEngine) window.soundEngine.playHeal();
      this.shield = Math.min(this.maxShield, this.shield + 600);
      if (particleSystem) particleSystem.emitSparks(this.pos.x, this.pos.y, 20, '#00ffc2');
    }
  }

  executeUltimate(projectiles, particleSystem, world) {
    const aimVec = Vec2.fromAngle(this.aimAngle);

    if (this.id === 'ares') {
      // Singularity Bastion (Tigreal Implosion)
      this.bastionShieldActive = true;
      this.bastionTimer = 1.0;
      if (window.soundEngine) window.soundEngine.playSingularity();
      if (particleSystem) particleSystem.emitSparks(this.pos.x, this.pos.y, 25, '#ffd700');
    } else if (this.id === 'vectra') {
      // Shadowburst Matrix: 5 kinetic daggers
      if (window.soundEngine) window.soundEngine.playDagger();
      for (let i = -2; i <= 2; i++) {
        const daggerAngle = this.aimAngle + i * 0.16;
        projectiles.push(new Projectile({
          x: this.pos.x,
          y: this.pos.y,
          vx: Math.cos(daggerAngle) * 750,
          vy: Math.sin(daggerAngle) * 750,
          radius: 8,
          damage: 180,
          team: this.team,
          life: 2.2,
          type: 'dagger',
          color: '#e040fb',
          source: this,
        }));
      }
    } else if (this.id === 'artemis') {
      // Destruction Cannon: Full-screen piercing death beam!
      if (window.soundEngine) {
        window.soundEngine.playLaser(0.5);
        window.soundEngine.playExplosion(false);
      }
      const x1 = this.pos.x + aimVec.x * 25;
      const y1 = this.pos.y + aimVec.y * 25;
      const x2 = this.pos.x + aimVec.x * 2200;
      const y2 = this.pos.y + aimVec.y * 2200;

      if (particleSystem) {
        particleSystem.addBeam({
          x1, y1, x2, y2,
          width: 22,
          color: '#00f3ff',
          coreColor: '#ffffff',
          life: 0.5,
        });
      }

      // Massive backward recoil!
      this.applyRecoil(new Vec2(aimVec.x * 48000, aimVec.y * 48000));

      // Instant piercing damage raycast to enemies and destructible platforms
      projectiles.push(new Projectile({
        x: x1,
        y: y1,
        vx: aimVec.x * 2400,
        vy: aimVec.y * 2400,
        radius: 20,
        damage: 950,
        team: this.team,
        life: 0.4,
        color: '#00f3ff',
        source: this,
      }));
    } else if (this.id === 'orion') {
      // Event Horizon: Gravitational Black Hole
      if (window.soundEngine) window.soundEngine.playSingularity();
      const targetX = this.pos.x + aimVec.x * 350;
      const targetY = this.pos.y + aimVec.y * 350;

      world.gravityWells.push({
        x: targetX,
        y: targetY,
        radius: 400,
        strength: 1200000,
        active: true,
        timer: 3.5,
      });

      if (particleSystem) {
        particleSystem.emitExplosion(targetX, targetY, 35, '#7c4dff');
      }
    } else if (this.id === 'chronia') {
      // Timeline Paradox Weave: Supercharge self & all friendly clones
      if (window.soundEngine) window.soundEngine.playVictory();
      this.shield += 800;
      this.heal(500);
      if (particleSystem) {
        particleSystem.emitExplosion(this.pos.x, this.pos.y, 30, '#00ffc2');
      }
    }
  }

  render(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    // Draw active cables for Vectra
    if (this.cables.length > 0) {
      for (const cable of this.cables) {
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(cable.anchor.x - this.pos.x, cable.anchor.y - this.pos.y);
        ctx.stroke();
      }
    }

    // Holographic shimmer / Chromatic aberration rim-light for replaying clones
    if (this.isClone) {
      ctx.shadowBlur = 18;
      ctx.shadowColor = this.team === 'player' ? '#00e5ff' : '#ff0055';
    }

    // Hero Outer Hull / Shield
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner Cyber Core
    ctx.fillStyle = this.secondaryColor;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Aim Indicator Line & Reticle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(this.aimAngle) * (this.radius + 14), Math.sin(this.aimAngle) * (this.radius + 14));
    ctx.stroke();

    // Shield Aura if active
    if (this.shield > 0 || this.bastionShieldActive) {
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Health Bar
    const barW = 46;
    const barH = 6;
    const hpRatio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#222222';
    ctx.fillRect(-barW / 2, -this.radius - 16, barW, barH);
    ctx.fillStyle = this.team === 'player' ? '#00ff66' : '#ff2255';
    ctx.fillRect(-barW / 2, -this.radius - 16, barW * hpRatio, barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barW / 2, -this.radius - 16, barW, barH);

    // Hero Label
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    const tag = this.isClone ? `[CLONE] ${this.name}` : this.name;
    ctx.fillText(tag, 0, -this.radius - 20);

    ctx.restore();
  }
}

const HERO_ROSTER = {
  ares: {
    id: 'ares',
    name: 'Iron Wall Ares',
    role: 'Tank (Tigreal / Franco)',
    desc: 'Heavy cyber-paladin with magnetic anchor boots, lethal Grav-Harpoon, and Singularity Bastion implosion.',
    hp: 3200,
    shield: 600,
    mass: 180,
    radius: 24,
    thrust: 19000,
    tacticalCd: 7.0,
    ultimateCd: 24.0,
    basicAttackRate: 0.5,
    color: '#ff9800',
    secondaryColor: '#fff3e0',
  },
  vectra: {
    id: 'vectra',
    name: 'Vectra',
    role: 'Assassin (Fanny / Gusion)',
    desc: 'Velocity-scaling cyber-ninja slinging dual steel cables, spinning plasma edges, and dagger burst matrix.',
    hp: 1650,
    shield: 200,
    mass: 65,
    radius: 17,
    thrust: 26000,
    tacticalCd: 4.5,
    ultimateCd: 18.0,
    basicAttackRate: 0.28,
    color: '#e040fb',
    secondaryColor: '#f3e5f5',
  },
  artemis: {
    id: 'artemis',
    name: 'Artemis-9',
    role: 'Marksman (Layla / Granger)',
    desc: 'Heavy artillery marksman using massive antimatter railgun recoil for Newtonian kiting and map-piercing laser.',
    hp: 1500,
    shield: 150,
    mass: 70,
    radius: 18,
    thrust: 21000,
    tacticalCd: 5.0,
    ultimateCd: 26.0,
    basicAttackRate: 0.35,
    color: '#00e5ff',
    secondaryColor: '#e0f7fa',
  },
  orion: {
    id: 'orion',
    name: 'Orion',
    role: 'Mage (Eudora / Cyclops)',
    desc: 'Chrono-astromancer with orbiting defense spheres, velocity-freezing Stasis Orb, and gravitational black hole.',
    hp: 1750,
    shield: 300,
    mass: 75,
    radius: 18,
    thrust: 20000,
    tacticalCd: 7.5,
    ultimateCd: 28.0,
    basicAttackRate: 0.4,
    color: '#7c4dff',
    secondaryColor: '#ede7f6',
  },
  chronia: {
    id: 'chronia',
    name: 'Chronia',
    role: 'Support (Estes / Angela)',
    desc: 'Timeline specialist whose chrono-auras heal allies, prevent paradox deaths, and supercharge clone lifespans.',
    hp: 1800,
    shield: 400,
    mass: 68,
    radius: 18,
    thrust: 22000,
    tacticalCd: 6.0,
    ultimateCd: 30.0,
    basicAttackRate: 0.35,
    color: '#00ffc2',
    secondaryColor: '#e0f2f1',
  },
};

// Module export
if (typeof window !== 'undefined') {
  window.Projectile = Projectile;
  window.Hero = Hero;
  window.HERO_ROSTER = HERO_ROSTER;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Projectile, Hero, HERO_ROSTER };
}
