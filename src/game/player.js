import * as THREE from 'three';
import { buildHumanoid, applyEquipmentLook, animate, flash } from './characters.js';
import { heightAt, waterDepth, LOCATIONS } from '../core/worldgen.js';
import { tryMove, turnToward, angleDiff } from './physics.js';
import { mitigate } from '../core/progression.js';

export const ATTACKS = {
  light: { windup: 0.14, strike: 0.12, recover: 0.26, cost: 14, mult: 1.0, knock: 3.5, arc: 0.55, reachBonus: 0, lunge: 2.0 },
  heavy: { windup: 0.42, strike: 0.16, recover: 0.46, cost: 30, mult: 1.9, knock: 7, arc: 0.3, reachBonus: 0.35, lunge: 3.2 },
};
const WALK = 4.2, RUN = 7.2, ROLL_SPEED = 9, ROLL_TIME = 0.5, GRAV = 22, JUMP_V = 7.0;

export class Player {
  constructor(game) {
    this.g = game; this.ch = buildHumanoid({ shield: false, weapon: 'sword' }); this.root = this.ch.root; game.scene.add(this.root);
    this.pos = { x: 0, y: 0, z: 0 }; this.vy = 0; this.yaw = 0; this.grounded = true; this.radius = 0.4;
    this.hp = 100; this.stamina = 100; this.state = 'idle'; this.stateT = 0; this.attack = null; this.queued = null;
    this.blocking = false; this.blockT = 0; this.invuln = 0; this.regenDelay = 0; this.exhausted = false; this.knock = { x: 0, z: 0 };
    this.rollDir = { x: 0, z: 1 }; this.moveSpeed = 0; this.stepT = 0; this.hurtFlash = 0; this.deadT = 0; this.stagger = 0; this.cooldown = 0;
  }
  get dead() { return this.state === 'dead'; }
  get maxHp() { return this.g.progression.maxHp(); }
  get maxStamina() { return this.g.progression.maxStamina(); }
  place(x, z, y) { this.pos.x = x; this.pos.z = z; this.pos.y = y ?? heightAt(x, z); this.vy = 0; this.sync(); }
  sync() { this.root.position.set(this.pos.x, this.pos.y, this.pos.z); this.root.rotation.y = this.yaw; }
  refreshLook() { applyEquipmentLook(this.ch, { armorId: this.g.inventory.equipment.armor, weaponId: this.g.inventory.equipment.weapon }); }
  respawn() { this.state = 'idle'; this.deadT = 0; this.hp = this.maxHp; this.stamina = this.maxStamina; this.attack = null; this.invuln = 2; this.ch.pivot.rotation.x = 0; }

  useStamina(n) { if (this.stamina < n) return false; this.stamina -= n; this.regenDelay = 0.9; return true; }

  startAttack(kind) {
    const A = ATTACKS[kind];
    if (this.state === 'attack' || this.state === 'roll' || this.state === 'stagger' || this.dead) { if (this.state === 'attack') this.queued = kind; return; }
    if (!this.useStamina(A.cost)) { this.g.ui.flashStamina(); return; }
    // yardım: yakın düşmana dön
    const target = this.g.nearestEnemy(this.pos, 5.5);
    if (target) this.yaw = Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
    else if (this.g.cam) this.yaw = this.g.cam.yaw + Math.PI; // kamera bakış yönü
    this.state = 'attack'; this.attack = { kind, phase: 'windup', t: 0, hit: false, ...A }; this.blocking = false;
    this.g.audio.swing(kind === 'heavy');
  }
  startRoll(dirX, dirZ) {
    if (this.state !== 'idle' || this.cooldown > 0) return; if (!this.useStamina(22)) { this.g.ui.flashStamina(); return; }
    const l = Math.hypot(dirX, dirZ); this.rollDir = l > 0.1 ? { x: dirX / l, z: dirZ / l } : { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
    this.yaw = Math.atan2(this.rollDir.x, this.rollDir.z); this.state = 'roll'; this.stateT = 0; this.invuln = 0.38; this.blocking = false; this.g.audio.dodge();
  }

  // Düşmandan hasar. Dönüş: 'hit' | 'blocked' | 'parried' | 'dodged' | 'guardbreak' | 'dead'
  takeHit(damage, from, { slam = false } = {}) {
    if (this.dead || this.g.godMode) return 'dodged';
    if (this.invuln > 0) return 'dodged';
    const dx = from.x - this.pos.x, dz = from.z - this.pos.z, ang = Math.atan2(dx, dz);
    const frontal = Math.abs(angleDiff(this.yaw, ang)) < Math.PI * 0.45;
    const def = this.g.inventory.armor()?.defense || 0;
    if (this.blocking && frontal && !slam) {
      if (this.blockT < 0.2) { this.g.fx.burst(this.headPos(), 0xfff0a0, 14, 6); this.g.audio.block(); this.g.fx.text(this.headPos(), 'SAVUŞTURMA!', 'parry'); return 'parried'; }
      const cost = damage * 1.1;
      if (this.stamina >= cost) { this.stamina -= cost; this.regenDelay = 1.1; const d = mitigate(damage, { defense: def, blocking: true, blockFactor: 0.12 }); this.hp -= d; this.g.audio.block(); this.g.fx.burst(this.headPos(), 0xffe0a0, 8, 4); this.g.fx.text(this.headPos(), d > 0 ? `-${d}` : 'BLOK', 'blocked'); this.knockFrom(from, 3); this.afterDamage(d); return 'blocked'; }
      this.stamina = 0; this.blocking = false; this.stagger = 0.6; this.state = 'stagger'; this.stateT = 0; this.g.ui.toast('Savunman kırıldı!', 'warn');
    }
    const d = mitigate(damage, { defense: def }); this.hp -= d; this.hurtFlash = 1; this.g.audio.hurt(); this.g.fx.burst(this.headPos(), 0xcc2222, 12, 5); this.g.fx.text(this.headPos(), `-${d}`, 'hurt'); this.g.fx.addShake(slam ? 0.4 : 0.25); this.g.ui.hurtVignette();
    this.knockFrom(from, slam ? 8 : 5);
    if (this.state !== 'roll') { this.attack = null; this.state = 'stagger'; this.stateT = 0; this.stagger = 0.3; }
    this.afterDamage(d); return this.dead ? 'dead' : 'hit';
  }
  afterDamage() { if (this.hp <= 0) { this.hp = 0; this.state = 'dead'; this.deadT = 0; this.blocking = false; this.attack = null; this.g.audio.die(); this.g.onPlayerDeath(); } }
  knockFrom(from, force) { const dx = this.pos.x - from.x, dz = this.pos.z - from.z, l = Math.hypot(dx, dz) || 1; this.knock.x = (dx / l) * force; this.knock.z = (dz / l) * force; }
  headPos() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.9, this.pos.z); }

  update(dt, input, camYaw) {
    const prog = this.g.progression; this.hp = Math.min(this.hp, this.maxHp);
    this.cooldown = Math.max(0, this.cooldown - dt); this.invuln = Math.max(0, this.invuln - dt); this.hurtFlash = Math.max(0, this.hurtFlash - dt * 4);
    if (this.dead) { this.deadT += dt; animate(this.ch, { dead: this.deadT }, dt); this.sync(); return; }
    // --- giriş ---
    let mx = input.move.x, mz = input.move.y; const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    // kameraya göre dünya yönü (kamera yaw: bakış yönü = -sin,-cos)
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = -fz, rz = fx; // sağ vektör
    let wx = fx * mz + rx * mx, wz = fz * mz + rz * mx; const moving = ml > 0.1;
    const inWater = waterDepth(this.pos.x, this.pos.z);
    // --- durumlar ---
    if (this.state === 'stagger') { this.stateT += dt; if (this.stateT >= this.stagger) this.state = 'idle'; }
    if (this.state === 'idle') {
      if (input.pressed('light')) this.startAttack('light'); else if (input.pressed('heavy')) this.startAttack('heavy');
      else if (input.pressed('dodge')) this.startRoll(wx, wz);
    } else if (this.state === 'attack') { if (input.pressed('light')) this.queued = 'light'; if (input.pressed('heavy')) this.queued = 'heavy'; }
    const wantBlock = input.down('block') && this.state === 'idle' && this.stamina > 1;
    if (wantBlock && !this.blocking) this.blockT = 0; this.blocking = wantBlock; if (this.blocking) this.blockT += dt;
    // --- hareket ---
    let speed = 0;
    if (this.state === 'idle') {
      const sprint = input.down('sprint') && moving && !this.exhausted && !this.blocking && this.stamina > 0;
      speed = moving ? (sprint ? RUN : WALK) : 0; if (this.blocking) speed *= 0.45; if (inWater > 0.3) speed *= 0.6;
      if (sprint) { this.stamina = Math.max(0, this.stamina - 14 * dt); this.regenDelay = 0.7; if (this.stamina <= 0) this.exhausted = true; }
      if (moving) { const target = Math.atan2(wx, wz); if (!this.blocking) this.yaw = turnToward(this.yaw, target, dt * 14); }
      else if (this.blocking && this.g.cam) this.yaw = turnToward(this.yaw, this.g.cam.yaw + Math.PI, dt * 8);
      tryMove(this.pos, (moving ? Math.sin(Math.atan2(wx, wz)) : 0) * speed * dt, (moving ? Math.cos(Math.atan2(wx, wz)) : 0) * speed * dt, this.radius, this.g.world);
      if (input.pressed('jump') && this.grounded && this.stamina >= 8 && !this.blocking) { this.vy = JUMP_V; this.grounded = false; this.useStamina(8); this.g.audio.jump(); }
    } else if (this.state === 'roll') {
      this.stateT += dt; const k = this.stateT / ROLL_TIME; tryMove(this.pos, this.rollDir.x * ROLL_SPEED * (1 - k * 0.5) * dt, this.rollDir.z * ROLL_SPEED * (1 - k * 0.5) * dt, this.radius, this.g.world);
      if (this.stateT >= ROLL_TIME) { this.state = 'idle'; this.cooldown = 0.25; }
    } else if (this.state === 'attack') {
      const a = this.attack; a.t += dt;
      const dur = a[a.phase]; const lunge = a.phase === 'strike' ? a.lunge : 0;
      if (lunge) tryMove(this.pos, Math.sin(this.yaw) * lunge * dt, Math.cos(this.yaw) * lunge * dt, this.radius, this.g.world);
      if (a.phase === 'windup' && a.t >= dur) { a.phase = 'strike'; a.t = 0; this.doHit(a); }
      else if (a.phase === 'strike' && a.t >= dur) { a.phase = 'recover'; a.t = 0; }
      else if (a.phase === 'recover' && a.t >= dur) { this.state = 'idle'; this.attack = null; if (this.queued) { const q = this.queued; this.queued = null; this.startAttack(q); } }
      if (this.state === 'idle') this.queued = null;
    }
    // geri tepme
    if (Math.abs(this.knock.x) + Math.abs(this.knock.z) > 0.05) { tryMove(this.pos, this.knock.x * dt, this.knock.z * dt, this.radius, this.g.world); const f = Math.max(0, 1 - dt * 9); this.knock.x *= f; this.knock.z *= f; }
    // dikey
    const gy = heightAt(this.pos.x, this.pos.z), floor = Math.max(gy, inWater > 0 ? gy : gy);
    this.vy -= GRAV * dt; this.pos.y += this.vy * dt;
    if (this.pos.y <= floor) { if (!this.grounded && this.vy < -9) this.g.audio.step(); this.pos.y = floor; this.vy = 0; this.grounded = true; } else if (this.pos.y > floor + 0.08) this.grounded = false;
    // dayanıklılık yenilenmesi
    this.regenDelay -= dt;
    if (this.regenDelay <= 0 && !this.blocking) { this.stamina = Math.min(this.maxStamina, this.stamina + (moving ? 20 : 28) * dt); if (this.exhausted && this.stamina > 20) this.exhausted = false; }
    this.stamina = Math.min(this.stamina, this.maxStamina);
    this.moveSpeed = speed; this.moving = moving && this.state === 'idle';
    // adım sesi
    if (this.moving && this.grounded) { this.stepT -= dt * (speed / WALK); if (this.stepT <= 0) { this.stepT = 0.46; this.g.audio.step(inWater > 0.2 ? 'water' : 'grass'); } }
    // --- animasyon ---
    const pose = { walk: this.moving ? Math.min(1.4, speed / WALK) : 0, blocking: this.blocking, stagger: this.state === 'stagger' };
    if (this.attack) pose.attack = { phase: this.attack.phase, p: Math.min(1, this.attack.t / this.attack[this.attack.phase]), heavy: this.attack.kind === 'heavy' };
    if (this.state === 'roll') pose.roll = Math.min(1, this.stateT / ROLL_TIME);
    animate(this.ch, pose, dt);
    flash(this.ch, this.hurtFlash * 0.7, 0xff2020);
    this.root.visible = !(this.invuln > 0 && this.state !== 'roll' && Math.floor(this.invuln * 14) % 2 === 0 && this.g.respawnBlink);
    this.sync();
  }

  doHit(a) {
    const g = this.g, w = g.inventory.weapon(); const reach = (w?.reach ?? 1.6) + a.reachBonus; const base = (w?.damage ?? 4) + g.progression.bonusDamage();
    let any = false;
    for (const e of g.enemies) {
      if (e.dead) continue; const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > reach + e.radius) continue;
      const dirx = Math.sin(this.yaw), dirz = Math.cos(this.yaw); const cos = (dx * dirx + dz * dirz) / (d || 1);
      if (d > 0.9 && cos < a.arc) continue;
      const crit = Math.random() < 0.1; const dmg = Math.max(1, Math.round(base * a.mult * (0.9 + Math.random() * 0.2) * (crit ? 1.5 : 1)));
      e.hit(dmg, { x: dirx, z: dirz }, a.knock, a.kind === 'heavy', crit); any = true;
    }
    if (any) { g.audio.hit(a.kind === 'heavy'); g.fx.addShake(a.kind === 'heavy' ? 0.3 : 0.15); }
  }
}
