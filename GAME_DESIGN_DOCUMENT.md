# ZERO-G TACTICS: CHRONO LEGENDS
## Game Design Document (GDD) & Technical Architecture Specification
**Version:** 1.0.0  
**Genre:** 2D Action-Tactical Time-Loop Platformer / Hero Arena  
**Inspiration:** *Clone Armies* (Time-loop recording & replay loop) × Zero-Gravity Physics × *Mobile Legends: Bang Bang* (Hero archetypes, visual spectacle, and lane battle dynamics)  
**Target Platforms:** PC (Steam), Mobile (iOS / Android)  

---

## 1. EXECUTIVE SUMMARY & CORE CONCEPT

### 1.1 The Vision
*Zero-G Tactics: Chrono Legends* merges the multi-turn timeline cloning of *Clone Armies* with zero-gravity Newtonian physics and the tactical hero synergies of *Mobile Legends: Bang Bang* (MLBB). 

Instead of traditional turn-based squad combat, the player commands an army of themselves across iterative timeline loops. Every round, the player pilots a single hero champion in real-time. When that champion dies or the turn clock expires, time resets to $T=0$. The player respawns as a new hero, fighting alongside full-fidelity AI replays of all previously recorded runs.

Combat takes place in zero-G or dynamic-G 2D arenas styled after high-fantasy cosmic battlegrounds (Celestial Palaces, Abyssal Rifts, and Dawn Shrines). With directional thrusters, recoil-based weapon propulsion, gravity-inversion hazards, and MOBA-style abilities, players engineer multi-turn causal combos where past mistakes become future tactical setups.

```
+-----------------------------------------------------------------------------------+
|                              CHRONO-LOOP TIMELINE                                 |
+-----------------------------------------------------------------------------------+
| Loop 1: [Tank]      --> Hooks Defender + Deploys Grav-Anchor (Dies at T=18s)      |
| Loop 2: [Mage]      --> Drops Singularity Vortex into Tank's Anchor (T=15s-20s)   |
| Loop 3: [Marksman]  --> Snipes clumped enemies; Recoil drifts behind Tank's Cover  |
| Loop 4: [Assassin]  --> Grapple-swings off Marksman's bullet path to core base    |
| Loop 5: [Support]   --> Chrono-Tethers Loop 1 Tank, preventing his death at T=18s!|
+-----------------------------------------------------------------------------------+
```

---

## 2. LEVEL DESIGN & VISUAL AESTHETIC (MLBB ANTI-GRAVITY MAPS)

### 2.1 Visual Themes & Environmental Worldbuilding

The game reinterprets classic MLBB settings as 2D zero-gravity arenas suspended in planetary orbit or dimensional rifts:

| Map Theme | Visual Palettes & Atmospheric Effects | Architectural Features |
| :--- | :--- | :--- |
| **Celestial Sanctuary** *(Inspired by Celestial Palace)* | Radiant white marble, gold filigree trim, ethereal cyan plasma streams, floating floating cloud nebulae. | Multi-tier floating platforms with divine anti-grav glyphs; vertical light-shaft conduits; gilded defensive obelisks (turrets). |
| **Abyssal Fracture** *(Inspired by The Dark Abyss)* | Jagged obsidian stone, bioluminescent purple/crimson corruption veins, boiling dark-matter plasma vents. | Shattered zero-G rock clusters; unstable tectonic plates; hazard vents that emit thermal upward-force plumes. |
| **Land of Dawn Nexus** *(Modernized High-Tech MOBA)* | Neon-cyan hex-grids, polished titanium alloy plating, holographic lane markings, amber warning beacons. | Symmetrical dual-core bases; industrial conveyor platforms; magnetic launch rails and deployable energy shields. |

```
                       [CELESTIAL PALACE 2D ARENA LAYOUT]
+-----------------------------------------------------------------------------------+
| [PLAYER CORE]                                                       [ENEMY CORE]  |
|  [Hangar Base]                                                     [Hangar Base]  |
|     |                                                                   |         |
|     +--- [Top Lane: Anti-Grav Conveyor] -----\ /---- [Top Lane Bridge] -+         |
|     |                                         X                         |         |
|  [Turret T1]                                  |                     [Turret T1]   |
|     |           [Floating Shrines]            |        [Floating Shrines] |         |
|     +===\             /========\              |            /========\   /===+     |
|          \           | Grav-Well|             |           | Bounce   | /          |
|           \-----\     \========/     [CENTRAL RUNES]       \========/ /           |
|                  \                    /============\                 /            |
|                   \--- [Mid Lane: ---| Singularity  |--- [Mid Lane] /             |
|                        Zero-G Space]  \============/                              |
|                                                                                   |
|  [Turret T2]                                                        [Turret T2]   |
|     +--- [Bottom Lane: Heavy-G Inversion Field] ------------------------+         |
|     |                                                                   |         |
| [Hazard Pit: Dark Energy Zone]                     [Hazard Pit: Dark Energy Zone] |
+-----------------------------------------------------------------------------------+
```

### 2.2 Platform & Obstacle Layout Rules

1. **Base Structures (Spawners & Cores):**
   - Each side features a pressurized **Hero Launch Pod / Core Matrix** (similar to *Clone Armies* bases).
   - Core Bases possess hit points ($HP = 10,000$) and a protective energy barrier that lowers only when at least one defensive turret lane is cracked.
   - Forward Turrets: Automated dual-mode energy turrets that target nearest active enemy or clone. Turrets feature 360° targeting arcs in zero-G with laser line-of-sight tracking.

2. **Multi-Tiered Floating Platforms:**
   - **Solid Platforms:** Blocks projectiles and thruster exhaust; hero units can slide or anchor onto surfaces using magnetic boots (`G-Stomp`).
   - **One-Way Energy Ledges:** Allow upward/outward zero-G transit, but block return passage and enemy weapon discharges.
   - **Destructible Barricades:** Crystalline or alloy barriers with distinct durability ($HP = 500 - 1500$). When destroyed by an explosive ultimate or heavy round, they shatter into floating zero-G debris that can deflect bullets.

3. **Zero-G Environmental Hazards & Mechanics:**
   - **Gravity-Inversion Tiles:** Strips of glowing magnetic plating. Crossing them flips the hero's local gravity vector by 180° ($\vec{g}_{local} = -\vec{g}$).
   - **Singularity Wells (Grav-Wells):** Passive anomalies exerting radial Newtonian gravitational pull:
     $$\vec{F}_{grav} = G \frac{m_1 m_2}{r^2} \hat{r}$$
     Units floating near them slingshot around the periphery or risk being pulled into hazardous core damage.
   - **Repulsor / Kinetic Bumpers:** Elastic forcefields that reflect incoming heroes and projectiles with a $1.35\times$ kinetic energy multiplier ($v_{out} = -1.35 v_{in}$).
   - **Plasma Vents:** Periodic bursts of thermal energy that push objects outward at high acceleration while applying damage-over-time (Burn).

---

## 3. ANTI-GRAVITY MOVEMENT SYSTEM

### 3.1 Physics Model & Controls

The game operates on a deterministic 2D rigid-body physics model with continuous collision detection (CCD).

```
                      +-----------------------------+
                      |   RCS Directional Thrusters |
                      |           ^   ^             |
                      |          [W] [Up]           |
                      |             |               |
   [A]/[Left] <--- [Hero Body (Mass m, Inertia I)] ---> [D]/[Right]
                      |             |               |
                      |       [Space/Thrust]        |
                      |             v               |
                      |   Main Propulsion Vector    |
                      +-----------------------------+
                                     \
                                      +--> Weapon Recoil Vector (-P)
```

#### Movement Control Parameters:
- **Thrust Acceleration ($a_{thrust}$):** $18.0 \text{ m/s}^2$. Activated via directional input (`WASD` / Left Virtual Stick).
- **RCS Inertial Damping:** By default, releasing controls engages Retro-Rocket Assist, slowly bleeding drift velocity down to zero over 1.2s.
- **Drift Mode / Newton Toggle (`Shift` / Boost Key):** Disables damping entirely. The hero preserves 100% velocity vector ($\vec{v} = \text{const}$), allowing 360° aiming independent of flight trajectory (strafing/kiting in deep space).
- **Newtonian Recoil Propulsion:**
  Every weapon discharge or ability fires projectiles with linear momentum $\vec{p}_{bullet} = m_{bullet} \vec{v}_{bullet}$. By Conservation of Momentum:
  $$\Delta \vec{v}_{hero} = -\frac{m_{bullet} \vec{v}_{bullet}}{M_{hero}}$$
  Heavy marksmen and mages can leverage their weapon discharges to propel themselves backward across gaps or avoid incoming hazards without using thruster fuel!

### 3.2 The Timeline Butterfly Effect & Paradox Resolution

Because the game replays historical clone actions inside an interactive, dynamic physical environment, actions taken in *Loop $N$* can break the preconditions of *Loop $N-k$* (e.g., Loop 3 destroys a bridge that Loop 1 walked across at $T=12\text{s}$).

To balance emergent tactical gameplay with determinism, *Zero-G Tactics* uses a **Layered Causality Engine**:

```
                         [CAUSALITY CONFLICT FLOWCHART]
                                        |
                   Does Historical Path collide with new state?
                                   /         \
                             [YES]             [NO]
                              /                   \
        Is historical support destroyed?     Replay exact recorded inputs
             /                     \
       [Bridge Gone]          [Enemy Dead Early]
            |                         |
    [Switch to Adaptive       [Clone continues timeline
     Kinetic Physics]          firing at phantom sector;
            |                  bullets interact with new
   Clone drifts under          targets in that sector]
   environmental gravity /
   thruster inputs continue
            |
    Did clone survive?
        /        \
     [YES]      [NO: Temporal Desync]
       |                 |
  Clone continues   Clone disintegrates into chronal particles;
  new path          future synergies depending on clone's death trigger.
```

1. **Input-Driven Replay with Kinetic Override:**
   - Recorded clones do not follow static animation splines. They replay **Input Frames** (thrust vectors, aim angles, ability triggers).
   - If a platform is destroyed under Clone 1, Clone 1's thruster inputs are still enacted, but without the normal normal force ($F_N$) of the floor, causing Clone 1 to drift into space naturally.
2. **Temporal Anchor Shields (Support Role):**
   - Certain support abilities explicitly project temporal stasis zones onto past clones, preventing them from falling into paradoxes.
3. **Desync Handling (Paradox Elimination):**
   - If a clone suffers lethal environmental damage that did not occur in its original run, the clone enters **Paradox Collapse**, bursting into a chronal shockwave that deals minor damage to surrounding enemies.

---

## 4. HERO ROSTER (5 INITIAL MLBB-INSPIRED ADAPTATIONS)

Each hero is equipped with a **Passive Trait**, **Basic Attack**, **Tactical Ability**, and **Ultimate Ability**, all specifically calibrated for zero-gravity 2D combat.

---

### 4.1 TANK: "Vanguard Titan" — IRON WALL ARES *(Inspired by Tigreal & Franco)*

*A heavily armored cyber-paladin equipped with magnetic directional thrusters and a gravity-anchored riot shield.*

```
       [ARES: SHIELD & GRAV-HOOK TACTICAL PROFILE]
       
      +--- Shield Arc: 160 deg ---+
     /                             \
    |     [Iron Wall Ares]          | ---> Grav-Hook Projectile
     \                             /       (Pulls Target in Zero-G)
      +---------------------------+
        Mass: 180kg (Low Knockback)
```

- **Role:** Crowd Control, frontline cover, hazard displacement.
- **Attributes:**
  - Base Health: $3,200 \text{ HP}$ (Highest in game)
  - Mass: $180 \text{ kg}$ (Resistant to recoil and external knockback by 60%)
  - Speed: $8.5 \text{ m/s}$

#### Abilities:
1. **Passive: Kinetic Anchor**
   - Moving within $1.5\text{m}$ of any platform locks Ares to the surface with magnetic boots, making him completely immune to knockbacks and gravity wells. While anchored, all friendly clones behind him gain 25% damage mitigation.
2. **Basic Attack: Gauss Bludgeon**
   - Swings an overcharged hydraulic hammer in a 120° arc. Deals $180$ kinetic damage and pushes floating enemies back with an impulse of $J = 1200 \text{ N}\cdot\text{s}$.
3. **Tactical Skill (Cooldown: 7s): Grav-Harpoon *(Franco Hook)***
   - Launches a high-tensile electromagnetic hook in the aimed direction (range: 14m).
   - **Hit Enemy:** Pulls the enemy directly to Ares' current location, dragging them through any hazards (plasma vents, black holes) along the path.
   - **Hit Terrain:** Reels Ares rapidly to the terrain surface, triggering a shockwave upon impact that slows nearby targets by 50% for 2s.
4. **Ultimate (Cooldown: 24s): Singularity Bastion *(Tigreal Implosion)***
   - Ares anchors himself in space and activates a 180° frontal energy shield that absorbs all incoming projectiles. After a 1.2s charge, he generates a catastrophic gravitational implosion:
     - Sucks all enemies, floating debris, and loose projectiles within a $10\text{m}$ radius to his shield core.
     - Stuns all affected targets for $2.2\text{s}$ and deals $650$ physical damage.

---

### 4.2 ASSASSIN: "Apex Striker" — VECTRA *(Inspired by Fanny & Gusion)*

*A high-speed cyber-assassin using dual compressed-nitrogen wire cables and telemetry daggers to slingshot through zero-G at extreme velocities.*

```
       [VECTRA: DUAL-CABLE VECTOR SLINGSHOT]
       
     [Platform A]                       [Platform B]
         \                                  /
          \ [Cable 1]            [Cable 2] /
           \                            /
            \          * (Vectra)      /
             \        /                /
              \--> [Vector Trajectory: V = 24 m/s]
```

- **Role:** High-velocity burst execution, priority target assassination, turret diving.
- **Attributes:**
  - Base Health: $1,650 \text{ HP}$
  - Mass: $65 \text{ kg}$ (Extremely agile, high acceleration)
  - Speed: $14.0 \text{ m/s}$ (Up to $32.0 \text{ m/s}$ while cable-slinging)

#### Abilities:
1. **Passive: Relativistic Kinetic Energy**
   - Vectra’s damage scales with her current linear velocity:
     $$\text{Bonus Damage} = \frac{1}{2} m v^2 \times 0.08$$
   - Slashing an enemy while moving over $20 \text{ m/s}$ inflicts guaranteed critical damage and resets her cable thruster fuel.
2. **Basic Attack: Plasma Edge**
   - High-frequency dual blades. In zero-G, attacking while in flight performs a spinning vortex slash, dealing $220$ slashing damage in a $360^\circ$ circle around her.
3. **Tactical Skill (Energy-Based, No Cooldown): Steel Cable Launch *(Fanny Steel Cable)***
   - Fires a grappling cable toward the cursor. Upon contact with a wall or obstacle, Vectra is pulled with an acceleration of $35 \text{ m/s}^2$.
   - Firing a second cable while the first is attached calculates the resultant vector between both anchor points, launching her in a high-speed parabolic arc.
   - Bouncing off walls refreshes cable energy and releases an automated micro-slash.
4. **Ultimate (Cooldown: 18s): Shadowburst Matrix *(Gusion Dagger Burst)***
   - Vectra throws 5 zero-G kinetic plasma daggers in a forward cone that pierce through obstacles, dealing $160$ damage each and marking targets.
   - **Sub-Skill Activation:** Vectra immediately blinks along the timeline to the highest-priority marked target, recalling all 5 daggers directly back to her location. Returning daggers deal $240$ piercing damage to everything in their return path.

---

### 4.3 MARKSMAN: "Solar Core" — ARTEMIS-9 *(Inspired by Layla & Granger)*

*A long-range heavy artillery specialist wielding a modular antimatter pulse-cannon that generates massive reverse recoil.*

```
       [ARTEMIS-9: NEWTONIAN RECOIL PROPULSION]
       
     [Recoil Force: -P]                      [Beam: +P]
      <==== [Artemis-9] ================================> [Target Core]
       (Flies backward                      (Piercing Beam
        into safety)                         Range: Entire Map)
```

- **Role:** Long-range siege, core damage, recoil-driven kiting.
- **Attributes:**
  - Base Health: $1,500 \text{ HP}$
  - Mass: $70 \text{ kg}$
  - Speed: $9.0 \text{ m/s}$

#### Abilities:
1. **Passive: Distance Falloff & Gunner Recoil**
   - Artemis-9's shots deal up to $+80\%$ more damage the further the target is from her ($4\text{m} \to 20\text{m}$).
   - Every shot generates an opposite linear impulse $\vec{J}_{recoil} = -m_{proj} \vec{v}_{proj}$, pushing her backward in zero-G. Experienced players use this to propel themselves away from pursuers without touching thrusters.
2. **Basic Attack: Heavy Antimatter Slug**
   - Fires a supersonic railgun projectile. High velocity ($48 \text{ m/s}$), dealing $280$ kinetic damage with noticeable backward kick.
3. **Tactical Skill (Cooldown: 5s): RCS Retro-Burst / Cluster Flak**
   - Ignites forward thrusters to immediately stop all forward momentum or execute a quick directional dodge burst ($8 \text{ m/s}$ impulse), while deploying a cloud of 4 proximity mines in zero-G space.
4. **Ultimate (Cooldown: 26s): Destruction Cannon *(Layla Malefic Gunner)***
   - Artemis-9 deploys stabilizing micro-clamps in empty space (locking her position for $1.0\text{s}$) and overcharges her antimatter reactor.
   - Fires a monumental, map-spanning laser beam (width: $2.5\text{m}$, range: infinite) that pierces all platforms, enemy shields, turrets, and heroes.
   - Deals $1,250$ energy damage and obliterates destructible obstacles. Upon beam release, the clamps disengage and the residual recoil launches Artemis backward at $22 \text{ m/s}$.

---

### 4.4 MAGE: "Cosmic Architect" — ORION *(Inspired by Eudora & Cyclops)*

*A chrono-astromancer who manipulates local gravity fields, orbital projectiles, and micro-black-holes to control the zero-G battlefield.*

```
       [ORION: GRAVITY MANIPULATION & ORBIT SYSTEM]
       
                   [Orbiting Celestial Sphere]
                                 ^
                                 |
      [Platform] <--- ( * ) [Orion] ( * ) ---> [Stasis Orb Target]
                                 |
                                 v
                     [Gravity-Inversion Well]
```

- **Role:** Zone control, spatial displacement, stun lockdown.
- **Attributes:**
  - Base Health: $1,750 \text{ HP}$
  - Mass: $75 \text{ kg}$
  - Speed: $9.5 \text{ m/s}$

#### Abilities:
1. **Passive: Planetary Gravitation**
   - Up to 4 cosmic orbs passively orbit Orion in zero-G. Each orb increases his energy shield by $100\text{ HP}$. When an enemy hero approaches within $6\text{m}$, an orb breaks orbit and tracks the target automatically, dealing $140$ magic damage.
2. **Basic Attack: Quantum Pulse**
   - Fires a slow-moving, homing plasma sphere ($12 \text{ m/s}$) that bends its trajectory toward nearby gravitational anomalies or enemy units. Deals $190$ magic damage.
3. **Tactical Skill (Cooldown: 8s): Stasis Orb *(Eudora Stun)***
   - Hurls a concentrated ball of temporal lightning. Upon impact with an enemy hero or surface, it detonates into a zero-G stasis sphere:
     - All targets caught inside have their linear velocity clamped to zero ($\vec{v} = \mathbf{0}$) and are locked in place for $1.8\text{s}$.
     - Nullifies enemy thrusters and disables weapon discharges.
4. **Ultimate (Cooldown: 28s): Event Horizon *(Cyclops Planetary Sphere / Black Hole)***
   - Orion projects a micro-black-hole at target coordinates.
   - For $4.0\text{s}$, the anomaly creates an intense radial gravity vortex ($F_{pull} = 4500 \text{ N}$), sucking in all heroes, replaying clones, bullets, and destructible platform fragments.
   - Clones caught inside cannot use thrusters to escape unless aided by outside momentum.
   - After $4.0\text{s}$, the singularity collapses with a supernova detonation, dealing $850$ area magic damage and dispersing targets outward with high radial velocity.

---

### 4.5 SUPPORT: "Chrono-Anchor" — CHRONIA *(Inspired by Estes & Angela)*

*A temporal specialist capable of manipulating the past runs of clones, tethering timelines, and shielding historical actions from paradox death.*

```
       [CHRONIA: HISTORICAL TIMELINE TETHER]
       
      [Loop 1: Ares (Replaying)] <================== [Chronia (Active Player)]
      * Original Fate: Dies at T=16s                  * Emits Healing Wave & 
      * Modified Fate: Shielded & Healed                Temporal Overdrive
        --> Ares survives to tank enemy base!
```

- **Role:** Clone survival enhancement, causality preservation, timeline buffing.
- **Attributes:**
  - Base Health: $1,800 \text{ HP}$
  - Mass: $68 \text{ kg}$
  - Speed: $10.5 \text{ m/s}$

#### Abilities:
1. **Passive: Causality Resonance**
   - Chronia emits a chronal field ($8\text{m}$ radius). All past replaying friendly clones within the field gain $+20\%$ movement speed, $+15\%$ cooldown reduction on their recorded ability releases, and regenerate $3\%$ max HP per second.
2. **Basic Attack: Chrono-Dart**
   - Fires twin phase-shifted darts that pierce through friendly units. Hitting an ally heals them for $80\text{ HP}$; hitting an enemy deals $130$ magic damage.
3. **Tactical Skill (Cooldown: 6s): Temporal Stasis Barrier**
   - Projects a targeted chronal bubble around an active or historical clone for $3.5\text{s}$.
   - The bubble absorbs up to $600$ damage and makes the target immune to environmental hazards (such as falling through destroyed bridges or being pulled by enemy singularities). If a clone was scheduled to die during this window in its past life, its death is postponed or rewritten!
4. **Ultimate (Cooldown: 30s): Timeline Paradox Weave *(Angela Possession / Estes Moonlight)***
   - Chronia targets a replaying clone and establishes a **Chronal Resonance Link** for $7\text{s}$:
     - Chronia transmits 60% of her current shield capacity to the linked clone.
     - The linked clone's basic attack and ability fire rates are accelerated by $50\%$.
     - If the linked clone survives until the end of the tether without dying, its historical lifetime is permanently extended for all subsequent loops in this match!

---

## 5. CLONE COMBO & SYNERGY MECHANICS (MULTI-TURN TACTICS)

In *Zero-G Tactics*, a solo player plays all 5 positions of a MOBA team across consecutive timeline loops. Success hinges on coordinating actions across time.

### 5.1 Tactical Archetype Synergy Matrix

| Initiator Turn | Follow-up Turn | Finisher Turn | Tactical Synergy Outcome |
| :--- | :--- | :--- | :--- |
| **Loop 1: Tank (Ares)**<br>Anchors onto Mid-platform, launches Grav-Harpoon at Enemy Turret 1 guard, activates Singularity Bastion. | **Loop 2: Mage (Orion)**<br>Arrives at T=14s, casts *Event Horizon* directly onto Ares' shield location, clamping 3 enemy clones. | **Loop 3: Marksman (Artemis)**<br>Fires *Destruction Cannon* down the mid-lane axis. Beam vaporizes all clumped enemies inside the black hole. | **"The Cosmic Meatgrinder":** Wipes enemy forward defense without taking a single hit on active heroes. |
| **Loop 1: Assassin (Vectra)**<br>Flies via cables straight to Enemy Top Turret, taking agro and dying at T=8s after dealing 40% turret damage. | **Loop 2: Support (Chronia)**<br>Flies to Top Turret at T=7s, casts *Temporal Stasis Barrier* and *Timeline Weave* on Loop 1 Vectra right before lethal shot lands. | **Loop 3: Active Vectra / Ares**<br>Takes advantage of Loop 1 Vectra surviving to double-team the turret and destroy it at T=12s. | **"Timeline Rewriting":** Converts a past suicide run into a permanent frontline siege advantage. |
| **Loop 1: Mage (Orion)**<br>Casts *Stasis Orb* at the choke point and uses basic attacks to create floating debris from a destructible bridge. | **Loop 2: Tank (Ares)**<br>Pushes the floating debris cloud toward enemy base using Gauss Hammer, creating mobile zero-G cover. | **Loop 3: Marksman (Artemis)**<br>Drifts behind the floating cover, using gun recoil to match cover drift velocity while sieging enemy Core. | **"Newtonian Phalanx":** Moving bunker advance in complete zero-gravity. |

```
                       [CAUSAL TIMELINE ORCHESTRATION]

 Time   | LOOP 1 (Ares)             | LOOP 2 (Orion)            | LOOP 3 (Artemis-9)
--------+---------------------------+---------------------------+---------------------------
 T=00s  | Launch from Core Pod      | Launch from Core Pod      | Launch from Core Pod
 T=04s  | Thrusters to Mid-Choke    | Follow behind Ares' lane  | Take Top Lane High Ground
 T=08s  | Fires Grav-Hook at Base   | Pre-casts Quantum Pulse   | Anchors in Deep Space
 T=12s  | Pulls Enemy Defender      | Drops Event Horizon Vortex| Aims Destruction Cannon
 T=15s  | Activates Frontal Shield  | Stasis Orb on Choke Entry | Beam Fires -> 100% Hits!
 T=18s  | [Recorded Death in L1]    | Collects Bounty Energy    | Recoil blasts back to Pod
```

---

## 6. GAME MODES & OBJECTIVES

### 6.1 Campaign / Chrono-Puzzle Mode (PvE)

A single-player progression campaign where each level presents an intricate base assault or defense scenario:

- **Loop Budget Constraint:** Players are given a fixed number of clones (e.g., "Clear in $\le 3$ Loops").
- **Star Rating Criteria:**
  1. $\star$: Destroy Enemy Core.
  2. $\star\star$: Complete without losing more than 2 historical clones to temporal desync.
  3. $\star\star\star$: Trigger at least two 3-Hero Timeline Synergies.
- **Puzzle Modifiers:**
  - *Zero-Fuel Anomalies:* Thrusters disabled; movement possible **only** via weapon recoil and bounce pads.
  - *Inversion Labyrinths:* Gravity reverses every 5 seconds; clones must anticipate the flip to avoid spikes.
  - *VIP Escort:* An automated friendly drone flies across the map; previous loops must clear turrets, deflect bullets, and eliminate ambushes before the drone passes through.

### 6.2 1v1 Base Assault (Asymmetric & Turn-Based PvP)

The premier competitive mode, inspired by *Clone Armies* 1v1 multiplayer and MLBB lane strategies:

```
               [1v1 ASYMMETRIC CHRONO-BATTLE CYCLE]
               
     +-------------------------------------------------------+
     | Round 1: Player A records Hero 1 (e.g., Tank pushes)  |
     +-------------------------------------------------------+
                                 |
                                 v
     +-------------------------------------------------------+
     | Round 2: Player B records Hero 1                      |
     |          (Watches & counters Player A's Hero 1)       |
     +-------------------------------------------------------+
                                 |
                                 v
     +-------------------------------------------------------+
     | Round 3: Player A records Hero 2                      |
     |          (Supports Hero 1 + counters Player B's Hero 1)|
     +-------------------------------------------------------+
                                 |
                                 v
                     [Iterates up to 5 Clones]
                                 |
                                 v
     +-------------------------------------------------------+
     | Final Deciding Wave: All 10 heroes battle simultaneously|
     | Match ends when one Core Matrix reaches 0 HP!          |
     +-------------------------------------------------------+
```

1. **Match Structure:**
   - Symmetrical 2D map with Top, Mid, and Bottom floating zero-G paths.
   - Each player has 1 Home Core ($10,000\text{ HP}$) and 2 Defense Turrets ($3,500\text{ HP}$ each).
   - Round Duration: Exactly $30\text{ seconds}$ per loop.
   - Maximum Loops: 5 Loops per player (Total 5v5 team showdown).
2. **Drafting / Hero Selection:**
   - Players draft their 5-hero lineup before the match or dynamically select one hero per loop based on the opponent's recorded strategy.
3. **Victory Condition:**
   - The first player whose clones breach the enemy perimeter and reduce the opposing Core to $0\text{ HP}$ wins. If neither core is destroyed after Loop 5, the player with the highest remaining base HP wins.

---

## 7. TECHNICAL ARCHITECTURE & SYSTEMS SPECIFICATION

To ensure seamless execution of time-loop replays inside a continuous physics environment, the engine must resolve non-deterministic floating-point divergence and dynamic entity interactions.

### 7.1 Recording Data Schema

Instead of recording heavy frame-by-frame transforms (which break when the physical environment changes), the system uses a **Hybrid Deterministic Input + Telemetry Log**:

```json
{
  "heroId": "hero_tank_ares",
  "loopIndex": 1,
  "tickRate": 60,
  "totalTicks": 1800,
  "initialState": {
    "posX": 12.5000,
    "posY": 3.2000,
    "velX": 0.0000,
    "velY": 0.0000,
    "rot": 0.0000
  },
  "inputFrames": [
    {
      "tick": 0,
      "thrustVector": [0.0, 1.0],
      "aimAngleDeg": 45.2,
      "buttons": {
        "driftMode": false,
        "basicAttack": false,
        "tacticalSkill": false,
        "ultimate": false
      }
    },
    {
      "tick": 72,
      "thrustVector": [0.85, 0.52],
      "aimAngleDeg": 82.1,
      "buttons": {
        "driftMode": true,
        "basicAttack": true,
        "tacticalSkill": false,
        "ultimate": false
      }
    }
  ],
  "telemetrySnapshots": [
    {
      "tick": 60,
      "checkPos": [14.21, 5.88],
      "checkHP": 3200
    }
  ]
}
```

### 7.2 Deterministic Physics & Simulation Pipeline

```
                               [TICK UPDATE PIPELINE (60 Hz)]
                                              |
                   +--------------------------+--------------------------+
                   |                                                     |
        [Active Hero Input]                                  [Clone Manager]
                   |                                                     |
        Sample Hardware State                                 Fetch recorded Tick(N)
                   |                                          Inject to Clone Controller
                   +--------------------------+--------------------------+
                                              |
                                              v
                              [Causality & Collision Layer]
                     - Check environmental state (Destruction check)
                     - Query local Gravity Wells & Hazard Fields
                                              |
                                              v
                              [Deterministic Physics Solver]
                     - Compute Thrust: F_thrust = a * m
                     - Compute Recoil: Delta_V = - (m_p * v_p) / M
                     - Integrate Velocity & Position (Verlet Integration)
                                              |
                                              v
                               [Telemetry Reconciliation]
                     - If Clone position deviates > epsilon from snapshot:
                       Apply smoothing impulse (Adaptive Drift Correction)
                                              |
                                              v
                               [Render & Particle Presentation]
```

### 7.3 Step-by-Step Logic Outline for Engine Implementation

1. **Fixed-Delta Physics Loop (Fixed Timestep 60Hz):**
   - Physics must never run on variable `deltaTime`. It must lock strictly to $\Delta t = \frac{1}{60} = 0.016667\text{s}$ using deterministic fixed-point math or IEEE-754 compliant arithmetic with compiler flags preventing fused multiply-add non-determinism.
2. **Adaptive Drift Correction (Reconciliation Algorithm):**
   - If a clone experiences unexpected collision (e.g. an enemy hero from Loop 3 gets in its way that was not there in Loop 1), the engine does **not** hard teleport the clone (which breaks immersion).
   - Instead, the controller calculates an Error Vector:
     $$\vec{e} = \vec{p}_{recorded} - \vec{p}_{actual}$$
   - A corrective steering force $\vec{F}_{steer} = k_p \vec{e} - k_d \vec{v}$ is applied to nudge the clone back toward its intended path while honoring Newton's laws.
3. **Platform Destruction State Tree:**
   - Platforms and barricades maintain unique GUIDs and an Destruction Tick Table:
     `{"platform_id": "bridge_mid_04", "destroyedAtTick": 842, "destroyedBy": "nova_beam"}`.
   - When a clone replays:
     - If `currentTick < 842`, the platform exists with its static collider active.
     - At `currentTick >= 842`, the platform collider fractures into rigid dynamic chunks with zero-G drift velocities.
4. **Ability Hitscan & Projectile Rollback:**
   - When a replaying Marksman fires an antimatter slug, the bullet is instantiated as a live physical projectile in the current loop.
   - If an enemy hero from a newer loop crosses that bullet's historical path, that enemy **takes damage and is affected**, creating dynamic cross-timeline interactions!

---

## 8. SOUND DESIGN & VISUAL FX SPECIFICATION

1. **Acoustic Environment (Zero-G Audio Styling):**
   - **Muffled Kinetic Audio:** Sound in deep space is filtered through a low-pass shelf filter ($400\text{Hz}$ cutoff), simulating bone-conducted vibrations through the hero's cyber-suit.
   - **Muzzle Blasts:** Sharp, bass-heavy thumps with no atmospheric reverb, followed immediately by the high-pitch whine of suit thruster compensation.
   - **Time-Reset SFX:** At the end of each round, a reverse tape-stop effect combined with a rising crystal shimmer signifies the rewinding timeline.
2. **Visual FX (VFX):**
   - **Clone Hologram Shimmer:** Replaying clones render with a chromatic aberration rim-light (cyan for friendly past clones, crimson for enemy past clones).
   - **Trajectory Ghosts:** During hero aiming, a faint particle ribbon projects the recoil flight path, showing the player where their shot will propel them before they pull the trigger.
   - **Gravity Distortion Shaders:** Gravity wells, black holes, and heavy thrusters utilize 2D screen-space refraction shaders that bend background nebulae and platforms.

---

## 9. USER INTERFACE (UI) & HUD LAYOUT

```
+-----------------------------------------------------------------------------------+
| [HP: 3200/3200] [Fuel: 100%]                                   [TIME REMAINING]   |
| [Hero: Iron Wall Ares]                                             [00:18.42]     |
| [Passive: ANCHORED]                                            [LOOP: 3 of 5]     |
|                                                                                   |
|                                                                                   |
|                                ( BATTLEFIELD VIEW )                               |
|                                                                                   |
|                                                                                   |
|                                                                                   |
|                                                                                   |
| [TIMELINE TRACKER]                                                                |
| L1 [Ares]      ===[Harpoon]===================[Death X]                           |
| L2 [Orion]     ============[Vortex]===================>                           |
| L3 [Artemis]   ======>[Active Gunner] (Recoil: -12 m/s)                           |
|-----------------------------------------------------------------------------------|
| [Skill 1: Ready]       [Ult: 82%]          [Shift: Drift Mode ON]  [G-Stomp: M-Boot]
+-----------------------------------------------------------------------------------+
```

- **Dynamic Timeline Scroller:** Displays all active and recorded loops simultaneously on the bottom HUD, indicating when specific abilities will trigger in the current run so the player can time their combos down to the split-second.
- **RCS Fuel & Thrust Vector Arrow:** A dynamic HUD reticle around the hero indicating current velocity vector, facing direction, and estimated recoil impulse.

---

## 10. CONCLUSION & IMPLEMENTATION ROADMAP

*Zero-G Tactics: Chrono Legends* uniquely bridges the cerebral satisfaction of puzzle-planning with the exhilarating twitch-reflexes of 2D physics combat. By fusing *Clone Armies'* temporal loops with MLBB's hero design philosophy and frictionless zero-gravity mechanics, every match tells an evolving emergent story of tactical setup, sacrifice, and causal triumphs.

### Immediate Prototyping Roadmap:
- **Phase 1 (Core Physics):** Implement 2D zero-G rigid body controller with WASD thrusters, recoil impulse, and surface magnetic lock (`G-Stomp`).
- **Phase 2 (Record & Replay Engine):** Build the 60Hz tick input recording system and validate multi-clone playback without physics desync.
- **Phase 3 (Hero Archetypes):** Implement Ares (Tank) and Artemis-9 (Marksman) to test frontline hook-and-cover vs long-range recoil gunplay.
- **Phase 4 (Causality & Hazards):** Introduce destructible bridges and gravity wells; refine adaptive drift correction.
- **Phase 5 (Arena & Base Objectives):** Build Celestial Palace 2D map with forward turrets and core bases to test the complete 1v1 loop.
