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
    this.maxLife = this.life;
    this.color = opt.color || '#00ffff';
    this.source = opt.source || null;
    this.type = opt.type || 'bullet'; // 'bullet', 'mine', 'stasis', 'dagger', 'harpoon', 'chrono_dart'
    this.homing = opt.homing || false;
    this.returning = false;
    this.isDead = false;
    this.extra = opt.extra || {};
  }

  update(dt, world, enemies) {
    this.life -= dt;
    if (this.life <= 0) {
      this.isDead = true;
      return;
    }

    // Vectra dagger recall mechanic
    if (this.type === 'dagger' && this.source && !this.source.isDead) {
      if (this.life < this.maxLife * 0.55 && !this.returning) {
        this.returning = true;
      }
      if (this.returning) {
        const dx = this.source.pos.x - this.x;
        const dy = this.source.pos.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        const returnSpeed = 1000;
        this.vx = (dx / d) * returnSpeed;
        this.vy = (dy / d) * returnSpeed;
        if (d < 25) {
          this.isDead = true;
          return;
        }
      }
    }

    // Homing behavior for Orion or special projectiles
    if (this.homing && enemies && enemies.length > 0) {
      let nearest = null;
      let minDist = 450;
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
        const newAngle = curAngle + diff * Math.min(1, dt * 7);
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
            if (p.hp <= 0) p.active = false;
          }

          // Ares terrain grappling hook: pulls Ares to platform!
          if (this.type === 'harpoon' && this.source && !this.source.isDead && this.source.id === 'ares') {
            const pullDir = new Vec2(this.x - this.source.pos.x, this.y - this.source.pos.y).normalize();
            this.source.applyImpulse(new Vec2(pullDir.x * 32000, pullDir.y * 32000));
            if (window.soundEngine) window.soundEngine.playHook();
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
      ctx.shadowBlur = 10;
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
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#d500f9';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-9, -5);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-9, 5);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'harpoon') {
      const angle = Math.atan2(this.vy, this.vx);
      ctx.rotate(angle);
      ctx.fillStyle = '#ffea00';
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#ffbb00';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-7, -7);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, 7);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 14;
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

    this.thrustForce = heroConfig.thrust || 19000;
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
    this.color = heroConfig.color || '#00e5ff';
    this.secondaryColor = heroConfig.secondaryColor || '#ffffff';

    // Hero-specific states
    this.cables = []; // For Vectra
    this.orbitAngle = 0; // For Orion
    this.bastionShieldActive = false; // For Ares
    this.bastionTimer = 0;
    this.auraPulse = 0; // For Chronia
  }

  isStunned() {
    return this.stunTimer > 0;
  }

  takeDamage(amount, source) {
    if (this.isDead) return 0;

    // Check Ares bastion shield absorption
    if (this.bastionShieldActive) {
      amount *= 0.3; // 70% damage reduction
    }

    let actualDamage = amount;
    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
        return actualDamage;
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
    return actualDamage;
  }

  heal(amount) {
    if (this.isDead) return 0;
    const prev = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - prev;
  }

  updateHero(dt, input, world, projectiles, particleSystem, allies) {
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
    const isThrustInput = input && input.thrust && (input.thrust.x !== 0 || input.thrust.y !== 0);
    if (isThrustInput) {
      this.fuel = Math.max(0, this.fuel - 14 * dt);
    } else {
      this.fuel = Math.min(this.maxFuel, this.fuel + 28 * dt);
    }

    // Toggle drift mode (Shift key)
    this.driftMode = input ? !!input.driftMode : false;

    // Aim angle update
    if (input && input.aimAngle !== undefined) {
      this.aimAngle = input.aimAngle;
    }

    // Apply thrust if fuel is available
    if (this.fuel > 0 && isThrustInput) {
      const thrustVec = new Vec2(input.thrust.x, input.thrust.y).normalize();
      const fx = thrustVec.x * this.thrustForce;
      const fy = thrustVec.y * this.thrustForce;
      this.applyForce(new Vec2(fx, fy));

      if (this.isAnchored) {
        this.isAnchored = false; // Thrust breaks anchor
      }

      // Visual thruster particles
      if (particleSystem) {
        const backAngle = thrustVec.heading() + Math.PI;
        particleSystem.emitThruster(this.pos.x, this.pos.y, backAngle, this.color);
      }
    }

    // Clones generate temporal trails
    if (this.isClone && particleSystem && Math.random() < 0.35) {
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
            radius: 360,
            strength: 950000,
            active: true,
            timer: 0.9,
          });
        }
      }
    }

    // Chronia Causality Aura: Heals and buffs nearby friendly clones
    if (this.id === 'chronia' && allies) {
      this.auraPulse += dt * 3;
      for (const ally of allies) {
        if (ally.isDead || ally === this || ally.team !== this.team) continue;
        const d = Math.hypot(ally.pos.x - this.pos.x, ally.pos.y - this.pos.y);
        if (d < 220) {
          ally.heal(55 * dt);
          if (particleSystem && Math.random() < 0.1) {
            particleSystem.emitSparks(ally.pos.x, ally.pos.y, 2, '#00ffc2');
          }
        }
      }
    }

    // Orion orbiting spheres animation
    if (this.id === 'orion') {
      this.orbitAngle += dt * 2.8;
    }

    // Deterministic Cable physics for Vectra (tick delta based, no setTimeout)
    for (let i = this.cables.length - 1; i >= 0; i--) {
      const cable = this.cables[i];
      cable.life -= dt;
      if (cable.life <= 0) {
        this.cables.splice(i, 1);
        continue;
      }
      const dx = cable.anchor.x - this.pos.x;
      const dy = cable.anchor.y - this.pos.y;
      const d = Math.hypot(dx, dy);
      if (d > 25) {
        const pull = 28000;
        this.applyForce(new Vec2((dx / d) * pull, (dy / d) * pull));
      }
    }

    // Perform hero abilities based on input
    if (input) {
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
  }

  executeBasicAttack(projectiles, particleSystem, world) {
    const aimVec = Vec2.fromAngle(this.aimAngle);

    if (this.id === 'ares') {
      // Gauss Hammer: Melee arc shockwave
      if (window.soundEngine) window.soundEngine.playRecoil();
      const slashX = this.pos.x + aimVec.x * 38;
      const slashY = this.pos.y + aimVec.y * 38;
      projectiles.push(new Projectile({
        x: slashX,
        y: slashY,
        vx: aimVec.x * 320,
        vy: aimVec.y * 320,
        radius: 30,
        damage: 260,
        team: this.team,
        life: 0.18,
        color: '#ffbb00',
        source: this,
      }));
      if (particleSystem) particleSystem.emitSparks(slashX, slashY, 14, '#ffbb00');
    } else if (this.id === 'vectra') {
      // Plasma Edge: Spinning 360 blades
      if (window.soundEngine) window.soundEngine.playDagger();
      const speed = this.vel.mag();
      const bonusDmg = speed > 280 ? 160 : 0;
      projectiles.push(new Projectile({
        x: this.pos.x,
        y: this.pos.y,
        vx: aimVec.x * 220,
        vy: aimVec.y * 220,
        radius: 38,
        damage: 230 + bonusDmg,
        team: this.team,
        life: 0.16,
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
      const pSpeed = 1150;
      projectiles.push(new Projectile({
        x: this.pos.x + aimVec.x * 25,
        y: this.pos.y + aimVec.y * 25,
        vx: aimVec.x * pSpeed,
        vy: aimVec.y * pSpeed,
        radius: 6,
        damage: 340,
        team: this.team,
        life: 2.2,
        color: '#00f3ff',
        source: this,
      }));

      // NEWTONIAN RECOIL: kicks Artemis backward!
      this.applyRecoil(new Vec2(aimVec.x * 26000, aimVec.y * 26000));
      if (particleSystem) {
        particleSystem.emitThruster(this.pos.x, this.pos.y, this.aimAngle, '#00f3ff');
      }
    } else if (this.id === 'orion') {
      // Quantum Pulse: Homing plasma orb
      if (window.soundEngine) window.soundEngine.playLaser(0.75);
      projectiles.push(new Projectile({
        x: this.pos.x + aimVec.x * 22,
        y: this.pos.y + aimVec.y * 22,
        vx: aimVec.x * 480,
        vy: aimVec.y * 480,
        radius: 9,
        damage: 210,
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
        vx: aimVec.x * 680,
        vy: aimVec.y * 680,
        radius: 7,
        damage: 170,
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
        vx: aimVec.x * 900,
        vy: aimVec.y * 900,
        radius: 12,
        damage: 190,
        team: this.team,
        life: 0.85,
        color: '#ffea00',
        type: 'harpoon',
        source: this,
      }));
    } else if (this.id === 'vectra') {
      // Steel Cable: Launches wire toward obstacle/platform
      if (window.soundEngine) window.soundEngine.playCable();
      let hitPoint = null;
      for (let r = 30; r < 650; r += 20) {
        const testX = this.pos.x + aimVec.x * r;
        const testY = this.pos.y + aimVec.y * r;
        for (const p of world.platforms) {
          if (!p.active) continue;
          if (testX >= p.x && testX <= p.x + p.w && testY >= p.y && testY <= p.y + p.h) {
            hitPoint = { x: testX, y: testY };
            break;
          }
        }
        if (hitPoint) break;
      }
      if (!hitPoint) {
        hitPoint = { x: this.pos.x + aimVec.x * 480, y: this.pos.y + aimVec.y * 480 };
      }
      this.cables.push({ anchor: hitPoint, life: 1.1 });
      this.applyImpulse(new Vec2(aimVec.x * 24000, aimVec.y * 24000));
    } else if (this.id === 'artemis') {
      // RCS Retro-Burst & Mines
      if (window.soundEngine) window.soundEngine.playRecoil();
      this.applyImpulse(new Vec2(-aimVec.x * 20000, -aimVec.y * 20000));
      for (let i = 0; i < 3; i++) {
        const spread = (i - 1) * 0.45;
        const angle = this.aimAngle + Math.PI + spread;
        projectiles.push(new Projectile({
          x: this.pos.x,
          y: this.pos.y,
          vx: Math.cos(angle) * 130,
          vy: Math.sin(angle) * 130,
          radius: 8,
          damage: 280,
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
        vx: aimVec.x * 620,
        vy: aimVec.y * 620,
        radius: 14,
        damage: 160,
        team: this.team,
        life: 2.0,
        color: '#00e5ff',
        type: 'stasis',
        source: this,
      }));
    } else if (this.id === 'chronia') {
      // Temporal Stasis Barrier
      if (window.soundEngine) window.soundEngine.playHeal();
      this.shield = Math.min(this.maxShield, this.shield + 650);
      if (particleSystem) particleSystem.emitSparks(this.pos.x, this.pos.y, 22, '#00ffc2');
    }
  }

  executeUltimate(projectiles, particleSystem, world) {
    const aimVec = Vec2.fromAngle(this.aimAngle);

    if (this.id === 'ares') {
      // Singularity Bastion (Tigreal Implosion)
      this.bastionShieldActive = true;
      this.bastionTimer = 1.0;
      if (window.soundEngine) window.soundEngine.playSingularity();
      if (particleSystem) particleSystem.emitSparks(this.pos.x, this.pos.y, 28, '#ffd700');
    } else if (this.id === 'vectra') {
      // Shadowburst Matrix: 5 kinetic daggers
      if (window.soundEngine) window.soundEngine.playDagger();
      for (let i = -2; i <= 2; i++) {
        const daggerAngle = this.aimAngle + i * 0.16;
        projectiles.push(new Projectile({
          x: this.pos.x,
          y: this.pos.y,
          vx: Math.cos(daggerAngle) * 780,
          vy: Math.sin(daggerAngle) * 780,
          radius: 8,
          damage: 190,
          team: this.team,
          life: 2.0,
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
      const x2 = this.pos.x + aimVec.x * 2400;
      const y2 = this.pos.y + aimVec.y * 2400;

      if (particleSystem) {
        particleSystem.addBeam({
          x1, y1, x2, y2,
          width: 24,
          color: '#00f3ff',
          coreColor: '#ffffff',
          life: 0.55,
        });
      }

      this.applyRecoil(new Vec2(aimVec.x * 52000, aimVec.y * 52000));

      projectiles.push(new Projectile({
        x: x1,
        y: y1,
        vx: aimVec.x * 2600,
        vy: aimVec.y * 2600,
        radius: 24,
        damage: 1050,
        team: this.team,
        life: 0.45,
        color: '#00f3ff',
        source: this,
      }));
    } else if (this.id === 'orion') {
      // Event Horizon: Gravitational Black Hole
      if (window.soundEngine) window.soundEngine.playSingularity();
      const targetX = this.pos.x + aimVec.x * 360;
      const targetY = this.pos.y + aimVec.y * 360;

      world.gravityWells.push({
        x: targetX,
        y: targetY,
        radius: 420,
        strength: 1300000,
        active: true,
        timer: 3.8,
      });

      if (particleSystem) {
        particleSystem.emitExplosion(targetX, targetY, 40, '#7c4dff');
      }
    } else if (this.id === 'chronia') {
      // Timeline Paradox Weave: Supercharge self & all friendly clones
      if (window.soundEngine) window.soundEngine.playVictory();
      this.shield += 850;
      this.heal(600);
      if (particleSystem) {
        particleSystem.emitExplosion(this.pos.x, this.pos.y, 32, '#00ffc2');
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
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(cable.anchor.x - this.pos.x, cable.anchor.y - this.pos.y);
        ctx.stroke();
      }
    }

    // Draw Chronia's Causality Aura
    if (this.id === 'chronia') {
      ctx.strokeStyle = 'rgba(0, 255, 194, 0.28)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 220 + Math.sin(this.auraPulse) * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Orion's Orbiting Spheres
    if (this.id === 'orion') {
      for (let i = 0; i < 3; i++) {
        const ang = this.orbitAngle + (i * Math.PI * 2) / 3;
        const ox = Math.cos(ang) * 34;
        const oy = Math.sin(ang) * 34;
        ctx.fillStyle = '#b388ff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#d500f9';
        ctx.beginPath();
        ctx.arc(ox, oy, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Holographic shimmer / Chromatic aberration rim-light for replaying clones
    if (this.isClone) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = this.team === 'player' ? '#00e5ff' : '#ff0055';
    }

    // Hero Outer Hull
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
    ctx.lineTo(Math.cos(this.aimAngle) * (this.radius + 15), Math.sin(this.aimAngle) * (this.radius + 15));
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
    const barW = 48;
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
    thrust: 19500,
    tacticalCd: 6.5,
    ultimateCd: 22.0,
    basicAttackRate: 0.48,
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
    thrust: 27000,
    tacticalCd: 4.0,
    ultimateCd: 17.0,
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
    thrust: 21500,
    tacticalCd: 5.0,
    ultimateCd: 25.0,
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
    thrust: 20500,
    tacticalCd: 7.0,
    ultimateCd: 26.0,
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
    thrust: 22500,
    tacticalCd: 5.5,
    ultimateCd: 28.0,
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
