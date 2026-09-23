// Zero-G Tactics: Chrono Legends - Particle & Visual Effects Engine
// High-performance canvas particle system for zero-G thrusters, laser beams, singularities, and chrono-shimmer.

class Particle {
  constructor(opt = {}) {
    this.x = opt.x || 0;
    this.y = opt.y || 0;
    this.vx = opt.vx || 0;
    this.vy = opt.vy || 0;
    this.life = opt.life || 1.0;
    this.maxLife = this.life;
    this.size = opt.size || 3;
    this.color = opt.color || '#00e5ff';
    this.fade = opt.fade !== undefined ? opt.fade : true;
    this.glow = opt.glow || false;
    this.shrink = opt.shrink !== undefined ? opt.shrink : true;
    this.rotation = opt.rotation || 0;
    this.vRot = opt.vRot || 0;
    this.isDead = false;
  }

  update(dt = 1 / 60) {
    this.life -= dt;
    if (this.life <= 0) {
      this.isDead = true;
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.vRot * dt;
  }

  render(ctx) {
    const progress = Math.max(0, this.life / this.maxLife);
    const alpha = this.fade ? progress : 1.0;
    const currentSize = this.shrink ? this.size * progress : this.size;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    if (this.rotation !== 0) ctx.rotate(this.rotation);

    if (this.glow) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
    }

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0.5, currentSize), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class LaserBeam {
  constructor(opt = {}) {
    this.x1 = opt.x1 || 0;
    this.y1 = opt.y1 || 0;
    this.x2 = opt.x2 || 0;
    this.y2 = opt.y2 || 0;
    this.width = opt.width || 8;
    this.color = opt.color || '#ff0055';
    this.coreColor = opt.coreColor || '#ffffff';
    this.life = opt.life || 0.35;
    this.maxLife = this.life;
    this.isDead = false;
  }

  update(dt = 1 / 60) {
    this.life -= dt;
    if (this.life <= 0) this.isDead = true;
  }

  render(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;

    // Outer glow
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width * (this.life / this.maxLife);
    ctx.shadowBlur = 18;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();

    // Inner bright beam core
    ctx.strokeStyle = this.coreColor;
    ctx.lineWidth = Math.max(1, this.width * 0.35 * (this.life / this.maxLife));
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();

    ctx.restore();
  }
}

class ParticleSystem {
  constructor(maxParticles = 1200) {
    this.particles = [];
    this.beams = [];
    this.maxParticles = maxParticles;
  }

  add(opt) {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push(new Particle(opt));
  }

  addBeam(opt) {
    this.beams.push(new LaserBeam(opt));
  }

  emitThruster(x, y, angle, color = '#00f3ff') {
    const spread = (Math.random() - 0.5) * 0.5;
    const speed = -(80 + Math.random() * 120);
    const vx = Math.cos(angle + spread) * speed;
    const vy = Math.sin(angle + spread) * speed;

    this.add({
      x,
      y,
      vx,
      vy,
      size: 3 + Math.random() * 3,
      life: 0.2 + Math.random() * 0.25,
      color: Math.random() > 0.4 ? color : '#ffffff',
      glow: true,
    });
  }

  emitChronoTrail(x, y, color = '#00ffc2') {
    this.add({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      size: 4 + Math.random() * 3,
      life: 0.45,
      color,
      glow: true,
      shrink: true,
    });
  }

  emitExplosion(x, y, count = 25, color = '#ff5500') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 260;
      this.add({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 6,
        life: 0.3 + Math.random() * 0.5,
        color: i % 2 === 0 ? color : '#ffd700',
        glow: true,
      });
    }
  }

  emitSparks(x, y, count = 8, color = '#00ffff') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      this.add({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        life: 0.15 + Math.random() * 0.2,
        color,
        glow: true,
      });
    }
  }

  emitDebris(x, y, count = 6, color = '#78909c') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 120;
      this.add({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 5,
        life: 1.0 + Math.random() * 1.5,
        color,
        shrink: false,
        fade: true,
        vRot: (Math.random() - 0.5) * 8,
      });
    }
  }

  update(dt = 1 / 60) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].isDead) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].update(dt);
      if (this.beams[i].isDead) {
        this.beams.splice(i, 1);
      }
    }
  }

  render(ctx) {
    for (const b of this.beams) {
      b.render(ctx);
    }
    for (const p of this.particles) {
      p.render(ctx);
    }
  }

  clear() {
    this.particles = [];
    this.beams = [];
  }
}

// Module export
if (typeof window !== 'undefined') {
  window.Particle = Particle;
  window.LaserBeam = LaserBeam;
  window.ParticleSystem = ParticleSystem;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Particle, LaserBeam, ParticleSystem };
}
