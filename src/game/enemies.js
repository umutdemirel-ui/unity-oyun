import * as THREE from 'three';
import { buildHumanoid, animate, flash } from './characters.js';
import { heightAt, waterDepth, mulberry32 } from '../core/worldgen.js';
import { tryMove, turnToward } from './physics.js';

// Düşman türleri. Davranış: devriye -> algıla (alert) -> takip -> saldırı -> (menzil kaybı) geri dönüş -> devriye
export const ENEMY_TYPES = {
  goblin: {
    name: 'Goblin Akıncı', hp: 45, patrolSpeed: 1.4, chaseSpeed: 3.9, aggro: 13, leash: 32, range: 1.9, windup: 0.55, strike: 0.15, recover: 0.55, cooldown: 1.1,
    damage: 9, xp: 25, radius: 0.4, knockResist: 0, poise: false, patrolRadius: 6, scale: 0.82,
    look: { skin: 0x5f8f3a, tunic: 0x6d4a2a, pants: 0x3a2f22, hair: 0x222018, ears: true, weapon: 'club', scale: 0.82, bald: true },
    loot: { gold: [3, 8], items: [{ id: 'goblin_fang', chance: 0.65 }, { id: 'bread', chance: 0.2 }, { id: 'health_potion', chance: 0.1 }] },
  },
  moss_troll: {
    name: 'Yosun Trolü', hp: 240, patrolSpeed: 1.1, chaseSpeed: 3.1, aggro: 16, leash: 40, range: 3.6, windup: 1.0, strike: 0.2, recover: 0.85, cooldown: 1.5,
    damage: 18, slamDamage: 26, slamRadius: 5.2, xp: 150, radius: 0.9, knockResist: 0.75, poise: true, patrolRadius: 4, scale: 2.2, boss: true,
    look: { skin: 0x6f7b58, tunic: 0x4a3a28, pants: 0x3a3226, hair: 0x2a4a1a, weapon: 'treeclub', scale: 2.2, moss: true, fat: 1.3 },
    loot: { gold: [70, 90], items: [{ id: 'wardens_sigil', chance: 1 }, { id: 'health_potion', chance: 1 }] },
  },
};

export class Enemy {
  constructor(game, spawn) {
    this.g = game; this.id = spawn.id; this.type = spawn.type; this.def = ENEMY_TYPES[spawn.type]; this.radius = this.def.radius * (this.def.scale > 1.5 ? 1 : 1);
    this.ch = buildHumanoid(this.def.look); this.root = this.ch.root; game.scene.add(this.root);
    this.home = { x: spawn.x, z: spawn.z }; this.pos = { x: spawn.x, y: heightAt(spawn.x, spawn.z), z: spawn.z }; this.yaw = Math.random() * 6.28;
    this.hp = this.def.hp; this.maxHp = this.def.hp; this.state = 'patrol'; this.t = 0; this.dead = false; this.deadT = 0; this.knock = { x: 0, z: 0 };
    this.rng = mulberry32(spawn.x * 13 + spawn.z * 7 + 1); this.waypoint = null; this.wait = 1 + this.rng() * 2; this.attackCd = 0.5; this.attack = null; this.flashT = 0; this.staggerT = 0; this.attackCount = 0; this.telegraph = 0; this.walk = 0; this.removed = false; this.stepAcc = 0;
    this.root.position.set(this.pos.x, this.pos.y, this.pos.z);
  }
  get boss() { return !!this.def.boss; }
  distTo(p) { return Math.hypot(p.x - this.pos.x, p.z - this.pos.z); }

  hit(dmg, dir, knock, heavy, crit) {
    if (this.dead) return;
    this.hp -= dmg; this.flashT = 1; const kb = knock * (1 - this.def.knockResist); this.knock.x = dir.x * kb; this.knock.z = dir.z * kb;
    const g = this.g; const p = new THREE.Vector3(this.pos.x, this.pos.y + 1.6 * this.def.scale * 0.7, this.pos.z);
    g.fx.burst(p, 0xffe9a0, heavy ? 16 : 9, heavy ? 6 : 4); g.fx.text(p, crit ? `${dmg}!` : String(dmg), crit ? 'crit' : (heavy ? 'heavy' : ''));
    if (this.hp <= 0) { this.die(); return; }
    // tepki: yürüyen takibe geç, hafifçe sersemle
    if (this.state === 'patrol' || this.state === 'return' || this.state === 'alert') this.setState('chase');
    if (!this.def.poise || heavy) { if (!(this.def.poise && this.state === 'attack' && this.attack.phase === 'strike')) { this.setState('stagger'); this.staggerT = this.def.poise ? 0.5 : (heavy ? 0.55 : 0.35); this.attack = null; } }
  }
  die() {
    this.dead = true; this.deadT = 0; this.state = 'dead'; this.g.onEnemyDefeated(this);
  }
  setState(s) { this.state = s; this.t = 0; if (s !== 'attack') this.telegraph = 0; }

  update(dt) {
    const g = this.g, P = g.player, def = this.def;
    if (this.dead) {
      this.deadT += dt; animate(this.ch, { dead: this.deadT }, dt); flash(this.ch, 0, 0); this.sync();
      if (this.deadT > 4) { this.root.position.y -= dt * 0.4; if (this.deadT > 7) { this.root.visible = false; this.removed = true; } } return;
    }
    this.t += dt; this.attackCd -= dt; this.flashT = Math.max(0, this.flashT - dt * 5);
    const d = this.distTo(P.pos); const homeD = this.distTo(this.home); let moveDx = 0, moveDz = 0, speed = 0, face = null;
    const playerAlive = !P.dead;
    switch (this.state) {
      case 'patrol': {
        if (playerAlive && d < def.aggro * (g.env.isNight ? 0.8 : 1) * (P.blocking ? 1 : 1) && this.canSee(P)) { this.setState('alert'); g.audio.enemyAlert(); break; }
        if (this.wait > 0) { this.wait -= dt; break; }
        if (!this.waypoint) { const a = this.rng() * 6.28, r = this.rng() * def.patrolRadius; this.waypoint = { x: this.home.x + Math.cos(a) * r, z: this.home.z + Math.sin(a) * r }; }
        const wd = Math.hypot(this.waypoint.x - this.pos.x, this.waypoint.z - this.pos.z);
        if (wd < 0.6) { this.waypoint = null; this.wait = 1.5 + this.rng() * 3; break; }
        face = Math.atan2(this.waypoint.x - this.pos.x, this.waypoint.z - this.pos.z); speed = def.patrolSpeed; moveDx = Math.sin(face); moveDz = Math.cos(face); break;
      }
      case 'alert': { // kısa şaşkınlık
        face = Math.atan2(P.pos.x - this.pos.x, P.pos.z - this.pos.z); if (this.t > (this.boss ? 0.9 : 0.4)) this.setState('chase'); break;
      }
      case 'chase': {
        if (!playerAlive || d > def.leash * 0.8 || homeD > def.leash) { this.setState('return'); break; }
        face = Math.atan2(P.pos.x - this.pos.x, P.pos.z - this.pos.z);
        if (d <= def.range - 0.2 && this.attackCd <= 0) { this.startAttack(); break; }
        if (d > def.range * 0.8) { speed = def.chaseSpeed; moveDx = Math.sin(face); moveDz = Math.cos(face); }
        break;
      }
      case 'attack': this.updateAttack(dt, d); break;
      case 'stagger': if (this.t >= this.staggerT) this.setState('chase'); break;
      case 'return': {
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.15 * dt);
        if (homeD < 1.5) { this.hp = this.maxHp; this.setState('patrol'); this.wait = 1; break; }
        face = Math.atan2(this.home.x - this.pos.x, this.home.z - this.pos.z); speed = def.chaseSpeed * 0.8; moveDx = Math.sin(face); moveDz = Math.cos(face);
        if (playerAlive && d < def.aggro * 0.6 && homeD < def.leash * 0.6) this.setState('chase');
        break;
      }
    }
    if (face != null) this.yaw = turnToward(this.yaw, face, dt * (this.state === 'chase' ? 7 : 4));
    if (speed > 0) { tryMove(this.pos, moveDx * speed * dt, moveDz * speed * dt, this.radius, g.world, { maxDeep: 0.6 }); }
    if (Math.abs(this.knock.x) + Math.abs(this.knock.z) > 0.05) { tryMove(this.pos, this.knock.x * dt, this.knock.z * dt, this.radius, g.world, { maxDeep: 0.6 }); const f = Math.max(0, 1 - dt * 8); this.knock.x *= f; this.knock.z *= f; }
    // düşmanlar birbirinin içine girmesin
    for (const o of g.enemies) { if (o === this || o.dead) continue; const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, dd = Math.hypot(dx, dz), m = this.radius + o.radius; if (dd < m && dd > 0.001) { this.pos.x += (dx / dd) * (m - dd) * 0.5; this.pos.z += (dz / dd) * (m - dd) * 0.5; } }
    this.pos.y = heightAt(this.pos.x, this.pos.z); this.walk = speed > 0 ? speed / 3.5 : 0;
    this.stepAcc += dt * speed; if (this.boss && speed > 0 && this.stepAcc > 2.2) { this.stepAcc = 0; g.fx.addShakeNear && g.fx.addShakeNear(this.pos); }
    // animasyon
    const pose = { walk: this.walk, stagger: this.state === 'stagger' };
    if (this.attack) pose.attack = { phase: this.attack.phase, p: Math.min(1, this.attack.t / this.attack[this.attack.phase]), heavy: this.attack.slam };
    animate(this.ch, pose, dt);
    const tele = this.attack && this.attack.phase === 'windup' ? 0.35 + 0.4 * Math.sin(this.t * 30) : 0;
    if (this.flashT > 0) flash(this.ch, this.flashT * 0.8, 0xffffff); else flash(this.ch, Math.max(0, tele), 0xff2a10);
    this.sync();
  }
  canSee(P) { return true; } // basit sürüm: engel/görüş açısı yok (ileride)
  startAttack() {
    const def = this.def; this.attackCount++;
    const slam = this.boss && this.attackCount % 3 === 0;
    this.attack = { phase: 'windup', t: 0, windup: def.windup * (slam ? 1.25 : 1) * (this.boss && this.hp < this.maxHp * 0.5 ? 0.8 : 1), strike: def.strike, recover: def.recover, slam, done: false };
    this.setState('attack'); this.attackCd = def.cooldown * (this.boss && this.hp < this.maxHp * 0.5 ? 0.75 : 1);
  }
  updateAttack(dt, d) {
    const a = this.attack, def = this.def, P = this.g.player; a.t += dt;
    if (a.phase === 'windup') { // windup sırasında hedefe doğru dön
      this.yaw = turnToward(this.yaw, Math.atan2(P.pos.x - this.pos.x, P.pos.z - this.pos.z), dt * 3);
      if (a.t >= a.windup) { a.phase = 'strike'; a.t = 0; this.resolveStrike(a); }
    } else if (a.phase === 'strike') { if (a.t >= a.strike) { a.phase = 'recover'; a.t = 0; } }
    else if (a.t >= a.recover) { this.attack = null; this.setState(this.distTo(P.pos) > def.leash ? 'return' : 'chase'); }
  }
  resolveStrike(a) {
    const def = this.def, P = this.g.player, d = this.distTo(P.pos);
    if (a.slam) {
      this.g.audio.slam(); this.g.fx.addShake(0.35); const p = new THREE.Vector3(this.pos.x + Math.sin(this.yaw) * 2.6, this.pos.y + 0.2, this.pos.z + Math.cos(this.yaw) * 2.6); this.g.fx.burst(p, 0x8a7a5a, 22, 8);
      const sx = this.pos.x + Math.sin(this.yaw) * 2.6, sz = this.pos.z + Math.cos(this.yaw) * 2.6;
      if (Math.hypot(P.pos.x - sx, P.pos.z - sz) < def.slamRadius && P.pos.y < this.pos.y + 1.2) P.takeHit(def.slamDamage, this.pos, { slam: true });
      return;
    }
    const ang = Math.atan2(P.pos.x - this.pos.x, P.pos.z - this.pos.z); let diff = Math.abs(((ang - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (d <= def.range + 0.4 && diff < 1.0) {
      const r = P.takeHit(def.damage * (0.9 + Math.random() * 0.2), this.pos);
      if (r === 'parried') { this.setState('stagger'); this.staggerT = 1.0; this.attack = null; }
    }
    this.g.audio.swing(this.boss);
  }
  sync() { this.root.position.set(this.pos.x, this.pos.y, this.pos.z); this.root.rotation.y = this.yaw; }
}
