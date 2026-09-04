# 🔮 The Spire of the Archon: First-Person Online Co-Op RPG

A complete, story-driven 3D first-person multiplayer co-operative action RPG. Trapped in the celestial Spire of Aethelgard by Corrupted Archmage Valerius, your covenant of wizards must master Holy Trinity combat roles, manage gear and attributes, solve synchronized puzzles & arcane riddles, and defeat the archon to escape!

---

## 🌐 Live Online Hosting (Play with Anyone in the World)

### Server-authoritative co-op
Gameplay truth runs through the Socket.io relay; PeerJS is optional for proximity voice signalling. This keeps solo and 2–4 player sessions deterministic and prevents clients from choosing their own damage or position.
1. Start the server (`npm start`) or visit the hosted site.
2. Enter your sorcerer name and choose your **Holy Trinity Role**.
3. Click **HOST ONLINE SPIRE**.
4. The lobby will generate a global Room Code (e.g. `SPIRE-XXXXX`).
5. Share the code with your friends anywhere across the internet — they simply enter it into **JOIN ONLINE PARTY** to connect with zero lag!

---

## 🎮 Controls

| Action | Key / Input |
|---|---|
| **Move** | `W`, `A`, `S`, `D` |
| **Aim** | `Mouse Cursor` (Pointer Lock) |
| **Basic Attack** | `Left Mouse Button (LMB)` |
| **Skill 1** | `Q` |
| **Skill 2** | `E` |
| **Ultimate Ability** | `R` |
| **Jump** | `Spacebar` |
| **Dash / Blink** | `Shift` |
| **Interact (Prisms, Cauldrons, Lecterns, Riddles)** | `F` |
| **Inventory & Equipment Paperdoll** | `I` or `C` |
| **Spell Grimoire (Unlock Spells)** | `K` |
| **Talent Specialization Tree** | `T` |
| **Party Chat** | `Enter` |

---

## 🧙 The Holy Trinity Magic Classes

### 1. Pyromancer (Ranged Burst / AoE DPS)
- **Basic (LMB)**: *Ember Bolt* - Rapid flame projectiles.
- **Skill 1 (Q)**: *Fireball* - Explosive projectile dealing massive area fire damage.
- **Skill 2 (E)**: *Flame Wave* - Knocks back approaching monsters.
- **Ultimate (R)**: *Infernal Fire Tornado* - Rips through a wide area with a persistent flame vortex.

### 2. Cryomancer (Tank & Crowd Control)
- **Basic (LMB)**: *Frost Shard* - Chilling ice projectile.
- **Skill 1 (Q)**: *Ice Lance* - Piercing lance that slows target speed by 50%.
- **Skill 2 (E)**: *Glacial Bulwark* - Taunts nearby monsters and grants a 120-damage absorption shield.
- **Ultimate (R)**: *Frost Nova* - Freezes all nearby enemies solid for 3 seconds.

### 3. Luminary (Dedicated Holy Healer)
- **Basic (LMB)**: *Sacred Spark* - Holy jolt dealing light damage or minor healing.
- **Skill 1 (Q)**: *Radiant Heal* - Restores 90 HP directly to self or targeted teammate.
- **Skill 2 (E)**: *Cleansing Wave* - Cleanses debuffs and heals covenant party for 55 HP.
- **Ultimate (R)**: *Divine Sanctuary* - Golden celestial aura granting continuous health regeneration and 30% damage reduction.

### 4. Chronomancer (Support / Speed / Time Warp)
- **Basic (LMB)**: *Chrono Dart* - Temporal displacement projectile.
- **Skill 1 (Q)**: *Temporal Rewind* - Reverses recent damage.
- **Skill 2 (E)**: *Time Dilation* - Drastically slows enemy projectiles and movement by 60%.
- **Ultimate (R)**: *Temporal Stasis* - Freezes enemies in place while hasting allies.

---

## 🎒 RPG Inventory & 5 Core Attributes

Press **`I`** or **`C`** to open your Character Sheet:
- **8 Equipment Slots**: Helm, Amulet, Chest, Main Hand, Off Hand, Hands, Boots, Ring.
- **24-Slot Satchel**: Loot weapons, robes, potions, and accessories dropped by monsters and chests.
- **5 Attributes**: Vitality (health/mitigation), Arcana (spell power), Focus (mana/healing), Haste (speed/cooldown), Mastery (crit/class scaling).

## Cloud campaigns and difficulty

Create a free account in the lobby to persist level, gear, unlocks, settings and floor checkpoints. Story, Standard and Archon modes scale for 1–4 players. Local development persists accounts to `.data/accounts.json` (override with `ACCOUNT_STORE_FILE`). Production can set `DB_USERNAME`, `DB_PASSWORD` and `DB_CONNECT_STRING` to enable the bundled thin-mode Oracle adapter; the server fails closed if that configured database cannot initialize.

Apply `server/schema.oracle.sql` before enabling Oracle persistence. Sessions are stored as token hashes, campaign saves use optimistic revisions, and recovery codes are single-use.

## Local asset and animation pipeline

`npm run assets:validate` checks runtime GLB budgets and attribution. `npm run assets:report` prints bundle sizes and optimization targets. `npm run assets:generate -- <args>` delegates to the local 3D generator, `npm run assets:motion -- <prompt>` delegates motion generation to the configured Kimodo.cpp build, `npm run assets:blender -- <args>` runs Blender retarget/cleanup/export, and `npm run assets:optimize -- <args>` delegates Draco/Meshopt/KTX2 optimization to gltf-transform. Set `LOCAL_3D_GEN_CMD`, `KIMODO_CMD`, `KIMODO_OUTPUT_DIR`, `BLENDER_BIN` and `GLTF_TRANSFORM_CMD` in your local environment; source files, prompts and optimized GLBs are tracked through `tools/asset-manifest.json`.

Optimized GLBs can use Draco (`/draco/`), Meshopt, and KTX2/Basis (`/basis/`) at runtime. Keep the decoder files generated by the Three.js distribution in those public folders when publishing compressed exports.
