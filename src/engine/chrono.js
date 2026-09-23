// Zero-G Tactics: Chrono Legends - Chrono Recording & Multi-Clone Replay Engine
// Implements 60Hz input stream recording, multi-turn timeline loops, and adaptive telemetry reconciliation.

class TimelineRecording {
  constructor(heroId, loopIndex, initialPos) {
    this.heroId = heroId;
    this.loopIndex = loopIndex;
    this.tickRate = 60;
    this.totalTicks = 0;
    this.initialPos = { x: initialPos.x, y: initialPos.y };
    this.inputFrames = [];
    this.telemetrySnapshots = [];
    this.isCompleted = false;
  }

  recordFrame(tick, inputData, telemetryData) {
    this.inputFrames.push({
      tick,
      thrust: { x: inputData.thrust.x, y: inputData.thrust.y },
      aimAngle: inputData.aimAngle,
      driftMode: !!inputData.driftMode,
      basicAttack: !!inputData.basicAttack,
      tacticalSkill: !!inputData.tacticalSkill,
      ultimate: !!inputData.ultimate,
    });

    if (tick % 30 === 0 && telemetryData) {
      this.telemetrySnapshots.push({
        tick,
        pos: { x: telemetryData.pos.x, y: telemetryData.pos.y },
        vel: { x: telemetryData.vel.x, y: telemetryData.vel.y },
        hp: telemetryData.hp,
      });
    }

    this.totalTicks = tick + 1;
  }

  complete() {
    this.isCompleted = true;
  }
}

class ChronoManager {
  constructor() {
    this.currentLoop = 1;
    this.maxLoops = 5;
    this.loopDurationSeconds = 30;
    this.totalTicksPerLoop = 60 * this.loopDurationSeconds; // 1800 ticks
    this.currentTick = 0;
    this.isRecording = false;
    this.activeRecording = null;
    this.completedTimelines = []; // Array of TimelineRecording from prior loops
    this.clones = []; // Active replay hero instances
  }

  startLoop(heroId, initialPos) {
    this.currentTick = 0;
    this.isRecording = true;
    this.activeRecording = new TimelineRecording(heroId, this.currentLoop, initialPos);
  }

  recordTick(inputData, telemetryData) {
    if (!this.isRecording || !this.activeRecording) return;
    this.activeRecording.recordFrame(this.currentTick, inputData, telemetryData);
  }

  endLoop() {
    this.isRecording = false;
    if (this.activeRecording) {
      this.activeRecording.complete();
      this.completedTimelines.push(this.activeRecording);
      this.activeRecording = null;
    }
  }

  advanceTick() {
    this.currentTick++;
    return this.currentTick >= this.totalTicksPerLoop;
  }

  getRemainingTime() {
    const remainingTicks = Math.max(0, this.totalTicksPerLoop - this.currentTick);
    return remainingTicks / 60;
  }

  resetAll() {
    this.currentLoop = 1;
    this.currentTick = 0;
    this.isRecording = false;
    this.activeRecording = null;
    this.completedTimelines = [];
    this.clones = [];
  }
}

// Module export
if (typeof window !== 'undefined') {
  window.TimelineRecording = TimelineRecording;
  window.ChronoManager = ChronoManager;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TimelineRecording, ChronoManager };
}
