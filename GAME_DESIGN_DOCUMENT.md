# ZERO-G TACTICS: CHRONO LEGENDS
## Game Design Document (GDD) & Systems Architecture Specification
**Genre:** 2D Action-Tactical Time-Loop Side-Scroller / Hero Arena  
**Perspective:** Strict 2D Orthographic Side-Scrolling (X/Y Plane, Left-to-Right Base Assault)  
**Core Inspiration:** *Clone Armies* (Synchronous frame-by-frame time-loop replay) × 2D Zero-Gravity Newtonian Physics × *Mobile Legends: Bang Bang* (Hero archetypes, visual spectacle, and lane battle dynamics)  
**Target Platforms:** PC (Standalone Windows Executable & WebGL/HTML5), Mobile Web  

---

## 🚨 MANDATORY GAMEPLAY & PERSPECTIVE CONSTRAINTS

1. **STRICT 2D SIDE-SCROLLING PERSPECTIVE:**
   - The game operates exclusively on an orthographic 2D plane ($X$: horizontal distance, $Y$: vertical height).
   - Camera follows action strictly from the side, exactly like *Clone Armies*, *Super Mario*, or *Metal Slug*.
   - **No top-down, isometric, or 3D angles.** Gameplay progression flows horizontally from the **Player Launch Base on the far-left ($X = 140$)** across floating multi-tiered orbital structures toward the **Enemy Nexus Base on the far-right ($X = 2260$)**.

2. **STRICT CLONE ARMIES TIME-LOOP MECHANIC:**
   - **Run 1 (Loop 1):** The player spawns at the left-side launch hangar as Hero #1. The player thrusts horizontally, fires weapons, triggers tactical skills, and battles forward until dying or until the strict 30-second turn clock reaches $T=0$. Every single input vector, aim angle, and button actuation is captured frame-by-frame at 60 Hz.
   - **Run 2 (Loop 2):** Time rewinds to $T=0$. The player respawns at the left base as Hero #2. Simultaneously, the recorded Hero #1 clone spawns in the 2D arena beside the player and executes its exact recorded trajectory and weapon discharges in real-time.
   - **Run N (Loops 3–5):** The player builds an escalating, fully synchronized squad army where all past clones battle side-by-side on the same 2D side-scrolling screen, enabling emergent multi-turn combos where earlier loops lay down suppressive fire, tank turret lasers, or deploy cover for subsequent heroes.

3. **ANTI-GRAVITY & ZERO-G PHYSICS:**
   - Units operate under 2D zero-gravity or localized micro-gravity.
   - Movement utilizes 2D directional RCS thrusters, wall-bouncing off platforms, and **Newtonian Recoil Propulsion** (firing heavy weapons pushes the hero backward with impulse $\Delta \vec{v} = -\vec{p}_{shot} / M$).
   - Environmental elements feature multi-tiered floating platforms, gravity-inversion zones, elastic kinetic repulsors ($1.35\times$ velocity bounce), and destructible terrain.

4. **MLBB-INSPIRED VISUALS & HERO ARCHETYPES:**
   - 2D side-scrolling environments are styled after legendary MLBB realms (Celestial Palace, Land of Dawn Nexus, and Dark Abyss).
   - 5 dedicated hero archetypes adapted for 2D side-scrolling: Tank (Franco/Tigreal), Assassin (Fanny/Gusion), Marksman (Layla/Granger), Mage (Eudora/Cyclops), and Support (Angela/Estes).

---

## SECTION 1: 2D SIDE-SCROLLING LEVEL DESIGN & MLBB AESTHETICS

### 1.1 Arena Architecture & Symmetrical Layout

The combat arena is a wide 2D orthographic canvas ($2400 \times 1100\text{ px}$) engineered for intense left-to-right horizontal lane warfare:

```
+====================================================================================================================+
| [CELESTIAL PALACE: 2D SIDE-SCROLLING ARENA LAYOUT]                                                                |
+====================================================================================================================+
| Y=0 (Deep Space Ceiling)                                                                                           |
|                                                                                                                    |
| [PLAYER BASE]                [Top Lane: Floating Light-Bridges]                          [ENEMY BASE]              |
|  Launch Pod                   =================      =================                    Launch Pod               |
|  (X=140, Y=550)                     \                               /                     (X=2260, Y=550)          |
|                                [Top Turret T1]              [Enemy Turret T1]                                      |
|     +---------------+          (X=550, Y=320)               (X=1850, Y=320)         +---------------+              |
|     |  HOME NEXUS   |                                                               | ENEMY MATRIX  |              |
|     |     CORE      |             [Mid Lane: Destructible Crystal Barricades]       |     CORE      |              |
|     |  (10,000 HP)  |             ====== [Crystal 1]    [Crystal 2] ======          |  (10,000 HP)  |              |
|     +---------------+                       \                  /                    +---------------+              |
|                                           ( * ) GRAVITY WELL ( * )                                                 |
|                                                (X=1200, Y=550)                                                     |
|                                                                                                                    |
|                                [Bot Turret T2]              [Enemy Turret T2]                                      |
|                                (X=550, Y=780)               (X=1850, Y=780)                                        |
|                                     /                               \                                              |
|                              =================      =================                                              |
|                             [Bottom Lane: Heavy-G Magnetic Plating]                                                |
|                                                                                                                    |
| Y=1100 (Abyssal Void Floor)                                                                                        |
+====================================================================================================================+
```

### 1.2 Structure & Objective Properties

1. **Base Cores (Player Nexus Core vs. Enemy Matrix Core):**
   - **Position:** Far-left ($X = 140, Y = 550$) vs. Far-right ($X = 2260, Y = 550$).
   - **Hit Points:** $10,000\text{ HP}$ each.
   - **Lane Barrier Defense Shield:** Both cores possess a heavy invulnerability shield that grants **80% direct damage reduction** as long as forward defense turrets remain operational. Destroying at least one turret deactivates the barrier, making the core vulnerable to siege assaults.

2. **Automated Defense Turrets (Top & Bottom Lanes):**
   - **Positions:** Top Lane ($Y = 320$) and Bottom Lane ($Y = 780$) at $X = 550$ (Friendly) and $X = 1850$ (Hostile).
   - **Hit Points:** $3,500\text{ HP}$ each.
   - **360° Tracking Lasers:** Automated targeting system scans a 580px radius in 2D space, locking onto the closest enemy hero or replaying clone and discharging $280$-damage plasma bolts at 1.05s intervals.

3. **Multi-Tiered Floating Platforms:**
   - **Top Lane Light-Bridges:** Series of radiant marble platforms allowing horizontal zero-G sprinting and cover from turret lasers.
   - **Mid Lane Choke & Destructible Crystals:** High-durability crystalline barricades ($HP = 600$). When shattered by heavy railgun fire or ultimate beams, they break into floating zero-G debris that deflect incoming projectile trajectories.
   - **Bottom Lane Heavy-G Runway:** Solid titanium platforms lined with magnetic plating for magnetic boot anchoring (`G-Stomp`).

### 1.3 2D Interactive Hazards

- **Singularity Gravity Wells (Grav-Wells):** Positioned at the central mid-lane axis ($X = 1200, Y = 550$). Exerts continuous Newtonian gravitational force pulling all nearby floating heroes, bullets, and platform debris toward the center:
  $$F_{pull} = \frac{G \cdot M}{r^2 + \epsilon}$$
- **Kinetic Repulsor Bumpers:** 4 elastic energy bumpers placed between lanes ($X = 1000, 1400$ at $Y = 350, 750$). Reflect heroes and kinetic rounds with a **$1.35\times$ kinetic multiplier** ($v_{out} = -1.35 v_{in}$), allowing high-speed slingshots across lanes.
- **Gravity-Inversion Strips:** Glowing neon floor tiles that instantly reverse the local vertical gravity vector ($\vec{g}_{local} = -\vec{g}$), launching walking heroes into zero-G flight.

---

## SECTION 2: ZERO-G SIDE-SCROLLING MOVEMENT & CONTROLS

### 2.1 2D Physics Model & Control Scheme

In contrast to top-down MOBAs, *Zero-G Tactics* uses an orthographic 2D physical engine governed by Newtonian mechanics:

```
                        [2D RCS THRUSTER SYSTEM]
                                    ^  [W] Vertical Up-Thrust
                                    |
          [A] Left Thruster <--- [HERO] ---> [D] Right Thruster
                                    |
                                    v  [S] Vertical Down-Thrust
                 \
                  +---> Weapon Discharges Fired Right (+X)
                        Newtonian Recoil Propels Hero Left (-X)
```

#### Movement Control Specification:
- **Horizontal & Vertical RCS Thrust (`WASD` / Arrows):** Applies continuous force ($F_{thrust} = 19,500\text{ N}$) to the hero body. In zero-G, this accelerates the unit smoothly across the 2D plane.
- **Mouse Aiming Reticle (360° Cursor Tracking):** The hero's weapon and vision swivel smoothly around the body center, enabling independent directional firing while drifting horizontally or vertically.
- **RCS Inertial Damping:** Releasing movement keys automatically engages retro-rocket stabilization, bleeding velocity down to zero over $1.2\text{s}$.
- **Newtonian Drift Mode (`Shift` Key):** Disables RCS damping completely ($\text{damping} = 1.0$). The hero preserves 100% velocity vector ($\vec{v} = \text{const}$), allowing players to drift backwards while firing forwards (kiting).
- **Magnetic Boot Anchor (`Space` / `G` Key):** When colliding with any floating platform, engaging magnetic boots clamps linear velocity to zero ($\vec{v} = \mathbf{0}$) and grants complete immunity to knockback and gravity wells.
- **Newtonian Recoil Propulsion:**
  Every weapon shot ejects momentum:
  $$\Delta \vec{v}_{hero} = -\frac{m_{bullet} \vec{v}_{bullet}}{M_{hero}}$$
  Heavy marksmen can fly entirely via weapon kickback without expending suit fuel!

### 2.2 Environmental Changes & The Timeline Butterfly Effect

Because recorded clones from Run 1 replay inside a physical 2D environment modified by Run 2, the engine handles causality conflicts through **Adaptive Kinetic Reconciliation**:

1. **Destroyed Platform Under Replaying Clone:**
   - If Clone #1 walked across a destructible bridge in Run 1, but Hero #2 blows up that bridge at $T=8\text{s}$ in Run 2:
   - Clone #1 continues executing its recorded horizontal inputs, but without the normal force ($F_N$) of the floor, causing Clone #1 to drift into deep space naturally according to Newton's first law.
2. **Dynamic Projectile Interaction:**
   - Projectiles fired by past clones are instantiated as real physical entities in the current run.
   - If an enemy in Run 3 walks into the historical flight path of a sniper shot recorded in Run 1, that enemy **takes full damage and is knocked back**, rewarding pre-emptive suppression fire!
3. **Paradox Collapse Handling:**
   - If a recorded clone takes unexpected lethal damage that it survived in its initial run, the clone enters **Paradox Collapse**, releasing a chronal pulse that damages nearby enemies before evaporating.

---

## SECTION 3: 5 MLBB-INSPIRED 2D HERO ADAPTATIONS

Each hero features a **Passive Trait**, **Basic Attack**, **Tactical Ability**, and **Ultimate Ability**, all customized for 2D side-scrolling zero-G combat:

---

### 3.1 🛡️ TANK: "Iron Wall Ares" *(Inspired by Franco & Tigreal)*

*A heavily armored cyber-paladin acting as the frontline vanguard, bullet sponge, and spatial anchor.*

```
             [ARES: 2D HORIZONTAL HOOK & SHIELD]
             
       +--- Frontal Shield Arc ---+
      /                            \
     |      [Iron Wall Ares]        | ======> Grav-Harpoon Hook (2D Plane)
      \                            /          (Pulls Target in 2D Space)
       +--------------------------+
```

- **Base Stats:** $3,200\text{ HP}$ (Highest) | Mass: $180\text{ kg}$ (Low knockback) | Thruster Force: $19,500\text{ N}$
- **Passive - Kinetic Anchor:** Locking magnetic boots onto any platform grants $25\%$ damage resistance to all friendly clones positioned behind him in the 2D lane.
- **Basic Attack - Gauss Bludgeon:** Swings an electromagnetic warhammer in a 120° frontal arc. Deals $260$ kinetic damage and delivers an impulse of $J = 1,400\text{ N}\cdot\text{s}$, batting floating enemies backward.
- **Tactical Skill (CD: 6.5s) - Grav-Harpoon *(Franco Hook)*:**
  - Fires a high-tensile magnetic hook along the 2D cursor ray.
  - **Hit Enemy:** Replaces enemy velocity and drags them across the 2D arena directly into Ares' melee range or into gravity wells.
  - **Hit Platform:** Pulls Ares rapidly to the terrain surface, acting as a rapid terrain gap-closer.
- **Ultimate (CD: 22s) - Singularity Bastion *(Tigreal Implosion)*:**
  - Projects a frontal barrier absorbing 70% of all incoming rounds for $1.0\text{s}$, then unleashes a gravitational implosion that sucks all enemies within $360\text{px}$ to his core, dealing $650$ physical damage and stunning them for $2.0\text{s}$.

---

### 3.2 ⚡ ASSASSIN: "Vectra" *(Inspired by Fanny & Gusion)*

*An ultra-high-speed cyber-ninja slinging dual pneumatic cables across 2D platforms to build devastating kinetic momentum.*

```
           [VECTRA: 2D PLATFORM CABLE SLINGSHOT]
           
     [Top Platform]                      [Mid Platform]
         \                                  /
          \ [Cable 1]            [Cable 2] /
           \                            /
            \          * (Vectra)      /
             \        /                /
              \--> [2D Velocity Vector: V = 28 m/s]
```

- **Base Stats:** $1,650\text{ HP}$ | Mass: $65\text{ kg}$ | Thruster Force: $27,000\text{ N}$ (Highest agility)
- **Passive - Relativistic Kinetic Energy:** Deals bonus damage scaling directly with linear 2D speed ($E_k = \frac{1}{2} m v^2$). Slashing an enemy while flying over $25\text{ m/s}$ inflicts guaranteed critical damage.
- **Basic Attack - Plasma Edge:** Spinning dual blades. Attacking in mid-air performs a full 360° circular slash dealing $230 + \text{Velocity Bonus}$ damage.
- **Tactical Skill (CD: 4.0s) - Steel Cable *(Fanny Cable Sling)*:**
  - Fires a high-velocity wire toward any platform or ceiling. Upon contact, reels Vectra toward the anchor point with an acceleration of $38\text{ m/s}^2$. Firing two cables calculates the resultant vector, launching her across the 2D screen in high-speed parabolic arcs.
- **Ultimate (CD: 17s) - Shadowburst Matrix *(Gusion Dagger Burst)*:**
  - Throws 5 zero-G plasma daggers in a forward cone dealing $190$ piercing damage.
  - After $0.8\text{s}$, daggers reverse direction and fly back toward Vectra's live position, piercing through all enemies in their return path.

---

### 3.3 🎯 MARKSMAN: "Artemis-9" *(Inspired by Layla & Granger)*

*A long-range heavy railgun gunner who uses weapon recoil as an agile zero-G flight mechanic.*

```
             [ARTEMIS-9: 2D NEWTONIAN RECOIL PROPULSION]
             
     [Reverse Recoil Flight: -X]             [Antimatter Laser: +X]
      <==== [Artemis-9] ==============================================> [Enemy Core]
```

- **Base Stats:** $1,500\text{ HP}$ | Mass: $70\text{ kg}$ | Thruster Force: $21,500\text{ N}$
- **Passive - Gunner Recoil & Distance Falloff:** Shots deal up to $+80\%$ more damage at maximum range ($>600\text{px}$). Every weapon discharge kicks Artemis backward in the opposite direction ($-\vec{P}$).
- **Basic Attack - Antimatter Slug:** Supersonic railgun slug ($v = 1,150\text{ px/s}$). Deals $340$ kinetic damage and generates a backward impulse of $26,000\text{ N}\cdot\text{s}$.
- **Tactical Skill (CD: 5.0s) - RCS Retro-Burst & Mines:**
  - Fires forward thrusters to execute a sudden backward evasive dodge while seeding a cluster of 3 proximity flak mines floating in 2D space.
- **Ultimate (CD: 25s) - Destruction Cannon *(Layla Malefic Gunner)*:**
  - Charges for $0.4\text{s}$, then fires a screen-spanning, 24px-wide antimatter laser beam across the entire horizontal length of the arena ($X = 0 \to 2400$).
  - Deals $1,050$ energy damage, pierces all platforms and enemy shields, and launches Artemis backward at extreme velocity ($52,000\text{ N}\cdot\text{s}$ recoil kick).

---

### 3.4 🔮 MAGE: "Orion" *(Inspired by Eudora & Cyclops)*

*A cosmic astromancer manipulating localized gravity fields, orbiting defense orbs, and singularity traps.*

```
           [ORION: ORBITING DEFENSE & BLACK HOLE]
           
                    ( * ) Orbiting Sphere
                              ^
                              |
     [Enemy] <--- ( * ) [Orion (Mage)] ( * ) ---> [Homing Plasma]
                              |
                              v
                   [Event Horizon Vortex]
```

- **Base Stats:** $1,750\text{ HP}$ | Mass: $75\text{ kg}$ | Thruster Force: $20,500\text{ N}$
- **Passive - Planetary Gravitation:** 3 cosmic energy spheres passively orbit Orion. When enemies enter within $350\text{px}$, spheres break orbit and home onto the target, dealing $140$ magic damage.
- **Basic Attack - Quantum Pulse:** Homing plasma sphere ($480\text{ px/s}$) that bends its 2D flight path toward enemy heroes. Deals $210$ magic damage.
- **Tactical Skill (CD: 7.0s) - Stasis Orb *(Eudora Stun)*:**
  - Hurls a temporal lightning sphere that detonates on impact:
  - Freezes the target's linear velocity to zero ($\vec{v} = \mathbf{0}$) and stuns them for $1.8\text{s}$, shutting down thrusters and weapons.
- **Ultimate (CD: 26s) - Event Horizon *(Cyclops Black Hole)*:**
  - Creates a micro-black-hole at target coordinates ($r = 420\text{px}$) lasting $3.8\text{s}$.
  - Sucks in enemy heroes, past clones, platform debris, and bullets with $1,300,000\text{ N}$ gravitational force, culminating in a supernova detonation dealing $850$ area damage.

---

### 3.5 ⏳ SUPPORT: "Chronia" *(Inspired by Angela & Estes)*

*A timeline specialist capable of tethering to replaying clones, granting causality shields, and preventing paradox death.*

```
           [CHRONIA: HISTORICAL CLONE TETHER]
           
     [Run 1: Tank Ares (Replaying)] <================== [Chronia (Active Hero)]
     * Original Fate: Dies at T=16s                      * Emits Causality Healing
     * Modified Fate: Shielded & Healed                    Wave + Speed Boost
       --> Ares survives to destroy Turret!
```

- **Base Stats:** $1,800\text{ HP}$ | Mass: $68\text{ kg}$ | Thruster Force: $22,500\text{ N}$
- **Passive - Causality Resonance:** Projects an aura ($r = 220\text{px}$) around Chronia. All friendly past clones within the field gain $+20\%$ velocity and regenerate $55\text{ HP/s}$.
- **Basic Attack - Chrono-Dart:** Twin energy darts that pierce allies and foes: heals friendly clones for $140\text{ HP}$ and damages enemies for $170\text{ HP}$.
- **Tactical Skill (CD: 5.5s) - Temporal Stasis Barrier:**
  - Projects a $650\text{ HP}$ chronal shield bubble around herself or a targeted replaying clone for $3.5\text{s}$.
  - If a clone was scheduled to die during this window in its past run, its death is rewritten, allowing it to continue fighting!
- **Ultimate (CD: 28s) - Timeline Paradox Weave *(Angela Possession / Estes Moonlight)*:**
  - Channels chronal overdrive into all active and replaying friendly clones:
  - Grants $850$ shield, boosts basic attack fire-rate by $+50\%$, and immediately heals $600\text{ HP}$.

---

## SECTION 4: MULTI-CLONE TACTICAL COMBOS (STEP-BY-STEP)

In *Zero-G Tactics*, a solo player executes all roles of a MOBA team across 5 consecutive time-loops. The game rewards orchestrating synergistic actions across time:

### Step-by-Step 3-Turn Combo: "The Cosmic Meatgrinder"

```
+-------------------------------------------------------------------------------------------------------------+
|                                    3-TURN TIMELINE EXECUTION TIMETABLE                                      |
+-------------------------------------------------------------------------------------------------------------+
| TIME   | RUN 1: TANK (Ares)             | RUN 2: MAGE (Orion)            | RUN 3: MARKSMAN (Artemis-9)      |
+--------+--------------------------------+--------------------------------+----------------------------------+
| T=00s  | Launch from Left Pod           | Launch from Left Pod           | Launch from Left Pod             |
| T=04s  | Thrust horizontal along Mid    | Follow behind Ares' trajectory | Thrust along Top Lane High-Ground|
| T=08s  | Fires Grav-Hook at Enemy Guard | Pre-casts Quantum Pulse        | Anchors Mag-Boots to Ceiling     |
| T=12s  | Pulls enemy to Mid Grav-Well   | Drops Event Horizon Black Hole | Aims Destruction Cannon down Mid |
| T=15s  | Activates Singularity Bastion  | Stasis Orb on Choke Entry      | Fires Laser Beam: Wipes 4 Foes!  |
| T=18s  | Dies to Turret Overcharge (X)  | Gathers Bounty Energy          | Recoil kicks back to safety      |
+-------------------------------------------------------------------------------------------------------------+
```

1. **Turn 1 (Initiator: Tank Ares):**
   - The player launches from the left pod and thrusts horizontally down Mid Lane.
   - At $T=8\text{s}$, Ares fires his *Grav-Harpoon* at the Enemy Forward Turret defender, pulling him into the central *Singularity Well*.
   - At $T=15\text{s}$, Ares activates *Singularity Bastion*, creating an implosion that clusters incoming defenders together. Ares dies under heavy turret fire at $T=18\text{s}$.
2. **Turn 2 (Follow-up: Mage Orion):**
   - Time rewinds to $T=0$. Ares spawns alongside Orion and begins executing his exact run toward Mid Lane.
   - Orion flies directly behind the ghost of Ares.
   - Knowing Ares will pull and cluster the defenders at $T=12\text{s}-15\text{s}$, Orion pre-casts *Event Horizon* (Black Hole) at the exact coordinates of Ares' implosion.
   - The enemies are sucked in and immobilized by the black hole.
3. **Turn 3 (Finisher: Marksman Artemis-9):**
   - Time resets. Now both Ares and Orion replay their synchronized runs.
   - The player spawns as Artemis-9 and thrusts along the Top Lane high ground.
   - At $T=14.5\text{s}$, Artemis locks magnetic boots to the top bridge and charges her *Destruction Cannon*.
   - At $T=15\text{s}$, the screen-spanning laser beam discharges horizontally down the mid-lane axis.
   - The laser pierces the clumped enemies held by Ares' hook and Orion's black hole, vaporizing the entire enemy defense in a single synchronized strike!

---

## SECTION 5: TECHNICAL ARCHITECTURE (INPUT RECORDING SYSTEM)

To guarantee flawless playback of recorded clones without physics drift or desynchronization over multiple loops, the engine utilizes a **Deterministic Fixed-Timestep Input Stream Architecture**:

```
                              [60 HZ TICK UPDATE PIPELINE]
                                            |
              +-----------------------------+-----------------------------+
              |                                                           |
   [Active Hero Hardware Input]                                 [Clone Replay Manager]
              |                                                           |
   Capture WASD, Aim, Buttons                                  Fetch Frame at Tick(N)
              |                                                Check if Frame Exists (EOF check)
              +-----------------------------+-----------------------------+
                                            |
                                            v
                             [Deterministic Physics Solver]
                           - Apply Thrust: F_thrust = m * a
                           - Apply Recoil: Delta_V = -(m_b * v_b) / M
                           - Step Verlet Position (dt = 1/60s fixed)
                                            |
                                            v
                              [Telemetry Error Reconciliation]
                           - Compare Live Pos vs. Recorded Snapshot
                           - Apply PD Corrective Steering Force (No Hard TP)
                                            |
                                            v
                             [Combat & Particle Presentation]
```

### 5.1 Telemetry Data Schema (Per-Tick Serialization)

```json
{
  "heroId": "ares",
  "loopIndex": 1,
  "tickRate": 60,
  "totalTicks": 1800,
  "initialPos": { "x": 140.0, "y": 550.0 },
  "inputFrames": [
    {
      "tick": 72,
      "thrust": { "x": 1.0, "y": -0.2 },
      "aimAngle": 0.428,
      "driftMode": false,
      "basicAttack": true,
      "tacticalSkill": false,
      "ultimate": false
    }
  ],
  "telemetrySnapshots": [
    {
      "tick": 60,
      "pos": { "x": 285.4, "y": 520.1 },
      "vel": { "x": 142.0, "y": -12.5 },
      "hp": 3200
    }
  ]
}
```

### 5.2 Deterministic Rules for Zero Desynchronization

1. **Strict Fixed-Timestep Integration ($\Delta t = \frac{1}{60}\text{s}$):**
   - Physics must never use variable `requestAnimationFrame` `deltaTime`. The simulation runs strictly on an accumulator with $\Delta t = 0.016667\text{s}$ fixed delta ticks.
2. **Safe Boundary Retrieval (`getFrame(tick)`):**
   - When a clone reaches the end of its recorded lifetime (`tick >= totalTicks`), the replay manager handles end-of-stream cleanly by transitioning the clone to chronal stasis, eliminating null pointer or undefined property exceptions.
3. **Adaptive Drift Correction (Reconciliation Algorithm):**
   - If an obstacle or hero collision alters a clone's path in later runs, the controller applies a corrective steering impulse rather than a hard teleport:
     $$\vec{F}_{correct} = k_p (\vec{p}_{recorded} - \vec{p}_{actual}) - k_d \vec{v}_{actual}$$
   - This smoothly pulls the clone back toward its intended flight path while respecting Newton's laws.
4. **Cross-Timeline Projectile Realization:**
   - Weapons fired by historical clones instantiate live physical projectiles that actively collide with new entities in the current loop.
