// Zero-G Tactics: Chrono Legends - Deterministic 2D Physics Engine
// Fixed 60Hz Verlet/Euler integration with zero-gravity Newtonian dynamics, recoil impulse, and hazards.

class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  copy() {
    return new Vec2(this.x, this.y);
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  mag() {
    return Math.sqrt(this.magSq());
  }

  normalize() {
    const m = this.mag();
    if (m > 0.00001) {
      this.x /= m;
      this.y /= m;
    }
    return this;
  }

  dist(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  heading() {
    return Math.atan2(this.y, this.x);
  }

  static fromAngle(rad, length = 1) {
    return new Vec2(Math.cos(rad) * length, Math.sin(rad) * length);
  }
}

class RigidBody {
  constructor(options = {}) {
    this.pos = new Vec2(options.x || 0, options.y || 0);
    this.vel = new Vec2(options.vx || 0, options.vy || 0);
    this.acc = new Vec2(0, 0);
    this.mass = options.mass || 70; // kg
    this.radius = options.radius || 18;
    this.restitution = options.restitution !== undefined ? options.restitution : 0.4;
    this.driftMode = false; // Shift key toggle: 0 damping
    this.damping = options.damping || 0.985; // RCS Retro-Rocket damping
    this.isAnchored = false; // Magnetic boots locked to surface
    this.isDead = false;
  }

  applyForce(f) {
    if (this.isAnchored) return;
    this.acc.x += f.x / this.mass;
    this.acc.y += f.y / this.mass;
  }

  applyImpulse(impulse) {
    if (this.isAnchored) return;
    this.vel.x += impulse.x / this.mass;
    this.vel.y += impulse.y / this.mass;
  }

  applyRecoil(bulletImpulse) {
    // Delta_V = - (m_bullet * v_bullet) / M_hero
    if (this.isAnchored) return;
    this.vel.x -= bulletImpulse.x / this.mass;
    this.vel.y -= bulletImpulse.y / this.mass;
  }

  update(dt = 1 / 60) {
    if (this.isDead) return;

    if (this.isAnchored) {
      this.vel.set(0, 0);
      this.acc.set(0, 0);
      return;
    }

    // Velocity update
    this.vel.x += this.acc.x * dt;
    this.vel.y += this.acc.y * dt;

    // RCS inertial damping if not in Drift Mode
    if (!this.driftMode) {
      this.vel.x *= Math.pow(this.damping, dt * 60);
      this.vel.y *= Math.pow(this.damping, dt * 60);
    }

    // Velocity clamp to prevent tunneling
    const speed = this.vel.mag();
    const maxSpeed = 1200; // pixels per sec
    if (speed > maxSpeed) {
      this.vel.normalize().mult(maxSpeed);
    }

    // Position update
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    // Reset accumulated acceleration
    this.acc.set(0, 0);
  }
}

class PhysicsWorld {
  constructor(width = 2400, height = 1100) {
    this.width = width;
    this.height = height;
    this.fixedDelta = 1 / 60;
    this.bodies = [];
    this.platforms = [];
    this.gravityWells = [];
    this.repulsors = [];
  }

  addBody(body) {
    this.bodies.push(body);
    return body;
  }

  removeBody(body) {
    const idx = this.bodies.indexOf(body);
    if (idx !== -1) this.bodies.splice(idx, 1);
  }

  addPlatform(p) {
    this.platforms.push(p);
    return p;
  }

  addGravityWell(gw) {
    this.gravityWells.push(gw);
    return gw;
  }

  addRepulsor(r) {
    this.repulsors.push(r);
    return r;
  }

  step() {
    const dt = this.fixedDelta;

    // 1. Process Gravity Wells
    for (const gw of this.gravityWells) {
      if (!gw.active) continue;
      for (const b of this.bodies) {
        if (b.isDead || b.isAnchored) continue;
        const dx = gw.x - b.pos.x;
        const dy = gw.y - b.pos.y;
        const distSq = dx * dx + dy * dy + 400; // Softening parameter
        const dist = Math.sqrt(distSq);
        if (dist < gw.radius) {
          const forceMag = (gw.strength * b.mass) / distSq;
          const fx = (dx / dist) * forceMag;
          const fy = (dy / dist) * forceMag;
          b.applyForce(new Vec2(fx, fy));
        }
      }
    }

    // 2. Update bodies
    for (const b of this.bodies) {
      b.update(dt);
    }

    // 3. Platform & Obstacle Collisions
    for (const b of this.bodies) {
      if (b.isDead) continue;
      this.resolvePlatformCollisions(b);
      this.resolveRepulsorCollisions(b);
      this.resolveArenaBounds(b);
    }
  }

  resolvePlatformCollisions(b) {
    for (const p of this.platforms) {
      if (!p.active) continue;

      // Solid AABB platform collision
      const nearestX = Math.max(p.x, Math.min(b.pos.x, p.x + p.w));
      const nearestY = Math.max(p.y, Math.min(b.pos.y, p.y + p.h));

      const dx = b.pos.x - nearestX;
      const dy = b.pos.y - nearestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < b.radius * b.radius) {
        const dist = Math.sqrt(distSq) || 0.0001;
        const overlap = b.radius - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        // Push out of platform
        b.pos.x += nx * overlap;
        b.pos.y += ny * overlap;

        // Ares or G-Stomp platform magnetic anchor check
        if (b.tryAnchor && Math.abs(ny) > 0.5) {
          b.isAnchored = true;
          b.vel.set(0, 0);
          return;
        }

        // Elastic / damped bounce
        const dot = b.vel.x * nx + b.vel.y * ny;
        if (dot < 0) {
          b.vel.x -= (1 + b.restitution) * dot * nx;
          b.vel.y -= (1 + b.restitution) * dot * ny;
        }
      }
    }
  }

  resolveRepulsorCollisions(b) {
    for (const r of this.repulsors) {
      if (!r.active) continue;
      const d = b.pos.dist(new Vec2(r.x, r.y));
      if (d < b.radius + r.radius) {
        const nx = (b.pos.x - r.x) / (d || 1);
        const ny = (b.pos.y - r.y) / (d || 1);
        const overlap = b.radius + r.radius - d;

        b.pos.x += nx * overlap;
        b.pos.y += ny * overlap;

        // 1.35x Kinetic Multiplier as in GDD
        const speed = Math.max(b.vel.mag(), 250);
        b.vel.x = nx * speed * 1.35;
        b.vel.y = ny * speed * 1.35;
        b.isAnchored = false;

        if (r.onTrigger) r.onTrigger(b);
      }
    }
  }

  resolveArenaBounds(b) {
    const pad = b.radius;
    if (b.pos.x < pad) {
      b.pos.x = pad;
      b.vel.x = Math.abs(b.vel.x) * b.restitution;
    } else if (b.pos.x > this.width - pad) {
      b.pos.x = this.width - pad;
      b.vel.x = -Math.abs(b.vel.x) * b.restitution;
    }

    if (b.pos.y < pad) {
      b.pos.y = pad;
      b.vel.y = Math.abs(b.vel.y) * b.restitution;
    } else if (b.pos.y > this.height - pad) {
      b.pos.y = this.height - pad;
      b.vel.y = -Math.abs(b.vel.y) * b.restitution;
    }
  }
}

// Module export
if (typeof window !== 'undefined') {
  window.Vec2 = Vec2;
  window.RigidBody = RigidBody;
  window.PhysicsWorld = PhysicsWorld;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Vec2, RigidBody, PhysicsWorld };
}
