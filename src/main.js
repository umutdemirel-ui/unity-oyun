import * as THREE from 'three';
import './style.css';
import { createLoader, missing } from './game/assets.js';
import { buildWorld } from './game/world.js';
import { Environment, WEATHER_LABEL } from './game/environment.js';
import { GameAudio } from './game/audio.js';
import { FX } from './game/fx.js';
import { Input } from './game/input.js';
import { ThirdPersonCamera } from './game/camera.js';
import { Player } from './game/player.js';
import { Enemy, ENEMY_TYPES } from './game/enemies.js';
import { buildHumanoid } from './game/characters.js';
import { animate } from './game/characters.js';
import { UI } from './ui/ui.js';
import { setupTouch, isTouchDevice } from './ui/touch.js';
import { Inventory } from './core/inventory.js';
import { Progression } from './core/progression.js';
import { QuestLog, QUESTS } from './core/quests.js';
import { SaveStore } from './core/save.js';
import { getItem, isConsumable, sellPrice } from './core/items.js';
import { mareDialogue, torinDialogue } from './core/dialogue.js';
import { heightAt, LOCATIONS, ENEMY_SPAWNS, NPCS, CHESTS, PLAY_RADIUS, waterDepth } from './core/worldgen.js';

const params = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);

class Game {
  constructor() {
    const canvas = $('game');
    const lowQ = params.get('q') === 'low';
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowQ, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, lowQ ? 1 : 1.75)); this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.shadowMap.enabled = !lowQ; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.quality = lowQ ? 'low' : 'high';
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1400);
    this.env = new Environment(this.scene, this.renderer); this.audio = new GameAudio(); this.ui = new UI(); this.ui.bind(this);
    this.fx = new FX(this.scene, this.camera, $('fxlayer')); this.input = new Input(canvas); this.cam = new ThirdPersonCamera(this.camera);
    this.store = new SaveStore(window.localStorage); this.progression = new Progression(); this.inventory = new Inventory(24); this.quests = new QuestLog();
    this.defeated = new Set(); this.collected = new Set(); this.enemies = []; this.npcs = []; this.state = 'loading'; this.godMode = params.get('god') === '1';
    this.quickIdx = 0; this.autosaveT = 30; this.regionName = null; this.regionT = 0; this.saveFailedOnce = false; this.interactTarget = null; this.touch = isTouchDevice(); this.elapsed = 0; this.scatterT = 0; this.respawnBlink = true;
    addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); });
  }
  // --- Kayıt için görünüm ---
  get x() { return this.player.pos.x; } get y() { return this.player.pos.y; } get z() { return this.player.pos.z; } get yaw() { return this.player.yaw; }
  get hp() { return this.player.hp; } get stamina() { return this.player.stamina; } get time() { return this.env.time; }
  get weatherLabel() { return WEATHER_LABEL[this.env.weather] + (this.env.rain > 0.5 && this.env.weather !== 'rain' ? '' : ''); }

  async init() {
    const loader = createLoader(this.renderer);
    this.world = await buildWorld(this.scene, loader, this.quality);
    this.player = new Player(this); this.player.refreshLook();
    // Oyuncuya gece mesalesi (yakın aydınlatma)
    this.torch = new THREE.PointLight(0xffc880, 0, 14, 2); this.torch.position.set(0, 2.4, 0.4); this.player.root.add(this.torch);
    this.buildNPCs(); this.pickupFlags();
    this.ui.showStart(true, { hasSave: this.store.has(), msg: this.world.missing.length ? '' : '' });
    this.state = 'menu'; this.wireUI(); this.setupTouchIfNeeded();
    this.newGame(true); // arka planda görünür bir dünya olsun
    this.renderOnce();
    $('loadMsg').textContent = '';
    if (this.world.missing.length) $('loadMsg').textContent = '⚠ Eksik varlıklar: ' + this.world.missing.join(', ');
    document.body.dataset.ready = '1';
    if (params.get('autostart') === '1') this.start(false);
    if (params.get('manual') !== '1') requestAnimationFrame(t => this.frame(t)); // manual=1: test için döngü elle sürülür
  }

  // ---------- Kurulum ----------
  buildNPCs() {
    const mk = (def, look) => {
      const ch = buildHumanoid(look); const y = heightAt(def.x, def.z); ch.root.position.set(def.x, y, def.z); ch.root.rotation.y = Math.atan2(-def.x, -def.z); this.scene.add(ch.root);
      this.world.colliders.push({ x: def.x, z: def.z, r: 0.55 }); return { ...def, ch, y, yaw: ch.root.rotation.y };
    };
    this.npcs.push(mk(NPCS.maren, { skin: 0xd8a98a, tunic: 0x5b3f7a, robe: true, hair: 0xeeeeee, beard: 0xeeeeee, weapon: 'staff' }));
    this.npcs.push(mk(NPCS.torin, { skin: 0xc9906a, tunic: 0x7a3b2a, apron: true, hair: 0x2a1a10, beard: 0x2a1a10, weapon: 'hammer', fat: 1.25, bald: true }));
    const sprite = (txt, color) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.font = 'bold 56px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.strokeStyle = '#000'; g.lineWidth = 6; g.strokeText(txt, 32, 34); g.fillText(txt, 32, 34); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true })); s.scale.setScalar(0.9); s.renderOrder = 20; return s; };
    const maren = this.npcs[0]; maren.markA = sprite('!', '#ffd54a'); maren.markR = sprite('?', '#ffd54a'); for (const m of [maren.markA, maren.markR]) { m.position.set(0, 2.5, 0); maren.ch.root.add(m); }
  }
  pickupFlags() { for (const p of this.world.pickups) if (this.collected.has(p.id)) { p.taken = true; p.mesh.visible = false; } for (const c of CHESTS) if (this.collected.has(c.id)) this.openChestVisual(c.id); }
  spawnEnemies() {
    for (const e of this.enemies) { this.scene.remove(e.root); } this.enemies = [];
    for (const s of ENEMY_SPAWNS) if (!this.defeated.has(s.id)) this.enemies.push(new Enemy(this, s));
  }
  newGame(silent = false) {
    this.progression = new Progression(); this.inventory = new Inventory(24); this.quests = new QuestLog(); this.defeated = new Set(); this.collected = new Set();
    this.inventory.add('rusty_sword'); this.inventory.equip('rusty_sword'); this.inventory.add('health_potion', 2); this.inventory.add('bread', 2); this.inventory.addGold(15);
    this.player.respawn(); this.player.place(LOCATIONS.spawn.x, LOCATIONS.spawn.z); this.player.yaw = Math.PI; this.player.hp = this.player.maxHp;
    this.cam.yaw = 0; this.cam.init = false; this.env.time = 0.33;
    this.world.pickups.forEach(p => { p.taken = false; p.mesh.visible = true; }); for (const c of CHESTS) this.resetChestVisual(c.id);
    this.spawnEnemies(); this.player.refreshLook(); this.quickIdx = 0;
    if (!silent) this.ui.toast('Yeni oyun başladı', 'good');
  }
  loadGame(d) {
    this.progression.load(d.progression); this.inventory.load(d.inventory); this.quests.load(d.quests);
    this.defeated = new Set(Array.isArray(d.world?.defeated) ? d.world.defeated : []); this.collected = new Set(Array.isArray(d.world?.collected) ? d.world.collected : []);
    if (!this.inventory.equipment.weapon && !this.inventory.has('rusty_sword') && this.inventory.slots.length === 0 && this.progression.level === 1) { /* boş kayıt: olduğu gibi */ }
    this.player.respawn(); const p = d.player; const r = Math.hypot(p.x, p.z);
    let x = p.x, z = p.z; if (!(r < PLAY_RADIUS) || waterDepth(x, z) > 1.3) { x = LOCATIONS.spawn.x; z = LOCATIONS.spawn.z; this.ui.toast('Kayıtlı konum geçersizdi, köye taşındın', 'warn'); }
    this.player.place(x, z); this.player.yaw = Number.isFinite(p.yaw) ? p.yaw : 0; this.cam.yaw = this.player.yaw + Math.PI; this.cam.init = false;
    this.player.hp = Math.min(this.player.maxHp, Math.max(1, p.hp)); this.player.stamina = Number.isFinite(p.stamina) ? Math.min(p.stamina, this.player.maxStamina) : this.player.maxStamina;
    if (Number.isFinite(d.world?.time)) this.env.time = d.world.time % 1;
    this.world.pickups.forEach(pk => { pk.taken = this.collected.has(pk.id); pk.mesh.visible = !pk.taken; }); for (const c of CHESTS) { this.resetChestVisual(c.id); if (this.collected.has(c.id)) this.openChestVisual(c.id); }
    this.spawnEnemies(); this.player.refreshLook();
  }
  wireUI() {
    const ui = this.ui, input = this.input;
    $('btnContinue').onclick = () => this.start(true); $('btnNew').onclick = () => this.start(false);
    $('pResume').onclick = () => this.resume(); $('pSave').onclick = () => this.save(true); $('pMute').onclick = () => { this.audio.start(); this.audio.toggleMute(); ui.showPause(true, this.pauseInfo()); };
    $('pNew').onclick = () => { if (confirm('Kayıt silinecek ve yeni oyun başlayacak. Emin misin?')) { this.store.clear(); this.newGame(); ui.showPause(false); this.state = 'playing'; this.resume(); } };
    $('btnRespawn').onclick = () => this.respawn();
    input.onUiKey = e => this.uiKey(e);
    input.onLockChange = locked => { if (!locked && this.state === 'playing' && !ui.modalOpen && !this.player.dead && performance.now() - ui.lastPause > 300) this.openPause(); if (!locked) setTimeout(() => { input.lockFailed = false; }, 1200); };
    addEventListener('beforeunload', () => { if (this.state === 'playing' && !this.player.dead) this.store.save(this); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'playing' && !ui.modalOpen && !ui.paused && !this.player.dead) this.openPause(); });
  }
  setupTouchIfNeeded() {
    if (!this.touch) return;
    setupTouch(this.input, { inventory: () => this.state === 'playing' && this.ui.toggle('inv'), journal: () => this.state === 'playing' && this.ui.toggle('journal'), pause: () => this.state === 'playing' && (this.ui.paused ? this.resume() : this.openPause()) });
    $('touch').classList.add('hidden');
  }
  uiKey(e) {
    const ui = this.ui; if (this.state !== 'playing') return false; if (this.player.dead) return true;
    if (e.code === 'Escape') { if (performance.now() - ui.lastPause < 300) return true; if (ui.paused) this.resume(); else if (ui.modalOpen) ui.closePanels(); else this.openPause(); return true; }
    if (ui.paused) return true;
    if (ui.dialogue) { if (/^Digit[1-9]$/.test(e.code)) ui.dialogueKey(+e.code.slice(5)); else if (['KeyE', 'Enter', 'Space'].includes(e.code) && ui.dialogue.node.choices.length === 1) ui.dialogueKey(1); return true; }
    if (e.code === 'KeyI' || e.code === 'Tab') { ui.toggle('inv'); return true; }
    if (e.code === 'KeyJ') { ui.toggle('journal'); return true; }
    if (e.code === 'KeyH') { ui.toggle('help'); return true; }
    if (e.code === 'KeyM') { this.audio.start(); ui.toast(this.audio.toggleMute() ? 'Ses kapalı' : 'Ses açık'); return true; }
    if (ui.modalOpen) return true; return false;
  }
  start(cont) {
    this.audio.start();
    if (cont) { const r = this.store.load(); if (r.ok) { this.loadGame(r.data); this.ui.toast('Kayıt yüklendi', 'good'); } else { this.ui.toast(r.error ? `Kayıt yüklenemedi: ${r.error}. Yeni oyun başlatıldı.` : 'Kayıt bulunamadı, yeni oyun başlatıldı.', 'warn'); this.newGame(true); } }
    else { this.store.clear(); this.newGame(); }
    this.ui.showStart(false); this.ui.showHUD(true); $('touch').classList.toggle('hidden', !this.touch); this.state = 'playing'; this.input.enabled = true; this.input.clear();
    if (!this.touch) this.input.requestLock(); this.regionName = null;
    if (!cont || !this.quests.state.shadows_road) this.ui.toast('Fellhaven’a hoş geldin! Köy ihtiyarı Maren ile konuş (E).', 'quest');
    this.save(false);
  }
  openPause() { if (this.state !== 'playing' || this.ui.paused) return; this.ui.lastPause = performance.now(); this.ui.showPause(true, this.pauseInfo()); this.input.releaseLock(); this.input.clear(); }
  pauseInfo() { return this.input.lockFailed ? 'Fare kilitlenemedi: kamera için sağ tuşla sürükle veya ok tuşlarını kullan.' : 'Oyuna dönmek için Devam’a tıkla.'; }
  resume() { this.ui.lastPause = performance.now(); this.ui.showPause(false); if (!this.touch) this.input.requestLock(); this.input.clear(); }
  onModalOpened() { this.input.releaseLock(); this.input.clear(); this.ui.lastPause = performance.now(); }
  onModalClosed() { this.input.clear(); }
  respawn() {
    this.ui.showDeath(false); this.player.respawn(); this.player.place(LOCATIONS.spawn.x, LOCATIONS.spawn.z); this.cam.init = false; this.state = 'playing';
    for (const e of this.enemies) if (!e.dead) { e.hp = e.maxHp; e.setState('return'); }
    this.save(false); if (!this.touch) this.input.requestLock();
  }
  onPlayerDeath() { setTimeout(() => { if (this.player.dead) { this.ui.showDeath(true); this.input.releaseLock(); } }, 1600); }

  // ---------- Envanter / ekonomi ----------
  quickItem() { const c = this.inventory.consumables(); if (!c.length) return null; const s = c[this.quickIdx % c.length]; return { item: getItem(s.id), qty: s.qty, id: s.id }; }
  cycleQuick() { const c = this.inventory.consumables(); if (c.length) { this.quickIdx = (this.quickIdx + 1) % c.length; this.audio.ui(); } }
  useItem(id) {
    const it = getItem(id), P = this.player; if (!isConsumable(it) || !this.inventory.has(id)) return false;
    const needHp = it.heal && P.hp < P.maxHp, needSt = it.stamina && P.stamina < P.maxStamina;
    if (!needHp && !needSt) { this.ui.toast(it.heal ? 'Canın zaten dolu' : 'Dayanıklılığın dolu', 'warn'); return false; }
    this.inventory.remove(id, 1); if (it.heal) P.hp = Math.min(P.maxHp, P.hp + it.heal); if (it.stamina) { P.stamina = P.maxStamina; P.exhausted = false; }
    this.audio.pickup(); this.fx.text(P.headPos(), it.heal ? `+${it.heal}` : 'Dayanıklılık', 'blocked'); this.ui.toast(`${it.name} kullanıldı`, 'good'); this.onInventoryChanged(); return true;
  }
  equipItem(id) { const r = this.inventory.equip(id); if (!r.ok) { this.ui.toast(r.reason, 'warn'); return; } this.audio.ui(); this.ui.toast(`${getItem(id).name} kuşanıldı`, 'good'); this.onEquipmentChanged(); }
  onEquipmentChanged() { this.player.refreshLook(); this.onInventoryChanged(); }
  onInventoryChanged() { this.save(false, true); }
  giveItem(id, qty = 1, quiet = false) { const left = this.inventory.add(id, qty); if (left) this.ui.toast(`Envanter dolu! ${getItem(id).name} alınamadı`, 'bad'); else if (!quiet) this.ui.toast(`+ ${getItem(id).name}${qty > 1 ? ' ×' + qty : ''}`, 'good'); return !left; }
  buyItem(id) { const it = getItem(id); if (this.inventory.gold < it.value) return this.ui.toast('Yeterli altının yok', 'warn'); if (!this.inventory.canAdd(id)) return this.ui.toast('Envanter dolu', 'warn'); this.inventory.addGold(-it.value); this.inventory.add(id, 1); this.audio.coin(); this.ui.toast(`${it.name} satın alındı`, 'good'); this.save(false, true); }
  sellItem(id) { const it = getItem(id); if (!this.inventory.remove(id, 1)) return; this.inventory.addGold(sellPrice(it)); this.audio.coin(); this.ui.toast(`${it.name} satıldı (+${sellPrice(it)} 🪙)`, 'good'); this.save(false, true); }

  // ---------- Olaylar ----------
  onEnemyDefeated(e) {
    const def = e.def; this.defeated.add(e.id);
    const ups = this.progression.addXp(def.xp); this.ui.toast(`${def.name} yenildi · +${def.xp} XP`, 'good'); this.fx.text(new THREE.Vector3(e.pos.x, e.pos.y + 2.5, e.pos.z), `+${def.xp} XP`, 'crit');
    const gold = def.loot.gold[0] + Math.floor(Math.random() * (def.loot.gold[1] - def.loot.gold[0] + 1)); this.inventory.addGold(gold); this.audio.coin(); this.ui.toast(`+${gold} 🪙`, 'good');
    for (const l of def.loot.items) if (Math.random() < l.chance) this.giveItem(l.id, 1);
    if (ups) this.levelUp();
    const changed = this.quests.notify('kill', e.type);
    for (const id of changed) { const st = this.quests.status(id); if (st === 'ready') { this.ui.toast('Görev hedefleri tamamlandı — Maren’e dön!', 'quest'); this.audio.quest(); } else { const o = this.quests.describe(id).find(o => !o.complete); if (o) this.ui.toast(`${QUESTS[id].title}: ${o.text} (${o.done}/${o.count})`, 'quest'); } }
    this.save(false, true);
  }
  levelUp() { const P = this.player; P.hp = P.maxHp; P.stamina = P.maxStamina; this.audio.levelUp(); this.ui.toast(`SEVİYE ${this.progression.level}! Can ve dayanıklılık arttı`, 'level'); this.fx.burst(new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z), 0x7aa5f0, 24, 7); }
  nearestEnemy(pos, range) { let best = null, bd = range; for (const e of this.enemies) { if (e.dead) continue; const d = e.distTo(pos); if (d < bd) { bd = d; best = e; } } return best; }

  // ---------- Etkileşim ----------
  findInteractable() {
    const P = this.player.pos; let best = null, bd = 1e9; const consider = (obj, d, max) => { if (d < max && d < bd) { bd = d; best = obj; } };
    for (const n of this.npcs) consider({ kind: 'npc', npc: n, label: `Konuş — ${n.name}` }, Math.hypot(n.x - P.x, n.z - P.z), 3.2);
    for (const c of CHESTS) if (!this.collected.has(c.id)) consider({ kind: 'chest', chest: c, label: 'Sandığı aç' }, Math.hypot(c.x - P.x, c.z - P.z), 2.6);
    return best;
  }
  interact(t) {
    if (!t) return;
    if (t.kind === 'npc') this.talk(t.npc);
    else if (t.kind === 'chest') this.openChest(t.chest);
  }
  talk(npc) {
    const n = npc.id === 'maren' ? mareDialogue({ quests: this.quests }) : torinDialogue();
    npc.facePlayer = true; this.player.yaw = Math.atan2(npc.x - this.player.pos.x, npc.z - this.player.pos.z);
    const handle = ch => {
      const a = ch.action;
      if (a && a.type === 'startQuest') { if (this.quests.start(a.id)) { this.audio.quest(); this.ui.toast(`Görev alındı: ${QUESTS[a.id].title}`, 'quest'); this.save(false, true); } }
      else if (a && a.type === 'completeQuest') this.completeQuest(a.id);
      else if (a && a.type === 'openShop') { this.ui.openShop(a.id); return; }
      if (ch.next && n.nodes && n.nodes[ch.next]) this.ui.setDialogueNode(n.nodes[ch.next]); else this.ui.closePanels();
    };
    this.ui.openDialogue(n, handle);
  }
  completeQuest(id) {
    const r = this.quests.complete(id); if (!r) return;
    this.inventory.remove('wardens_sigil', 1);
    const ups = this.progression.addXp(r.xp); this.inventory.addGold(r.gold); for (const i of r.items) this.giveItem(i.id, i.qty);
    this.audio.quest(); this.ui.toast(`Görev tamamlandı: ${QUESTS[id].title}`, 'quest'); this.ui.toast(`Ödül: ${r.xp} XP, ${r.gold} 🪙`, 'good'); if (ups) this.levelUp(); this.save(false, true);
  }
  openChest(c) {
    this.collected.add(c.id); this.openChestVisual(c.id); this.audio.pickup(); this.ui.toast('Gizli sandık bulundu!', 'quest');
    if (c.loot.gold) { this.inventory.addGold(c.loot.gold); this.ui.toast(`+${c.loot.gold} 🪙`, 'good'); } for (const i of c.loot.items) this.giveItem(i.id, i.qty);
    const ups = this.progression.addXp(40); this.ui.toast('+40 XP (keşif)', 'good'); if (ups) this.levelUp(); this.save(false, true);
  }
  openChestVisual(id) { const m = this.world.chestMeshes?.[id]; if (m) { m.glow.intensity = 0; m.lid.position.y = 0.75; m.lid.rotation.x = -0.8; } }
  resetChestVisual(id) { const m = this.world.chestMeshes?.[id]; if (m) { m.glow.intensity = 1.2; m.lid.position.y = 0.6; m.lid.rotation.x = 0; } }

  // ---------- Kayıt ----------
  save(manual, auto = false) {
    if (this.player.dead) return;
    const r = this.store.save(this);
    if (r.ok) { if (manual) { this.ui.toast('Oyun kaydedildi', 'good'); if (this.ui.paused) this.ui.showPause(true, 'Kaydedildi: ' + new Date().toLocaleTimeString('tr-TR')); } this.saveFailedOnce = false; }
    else if (manual || !this.saveFailedOnce) { this.ui.toast(`Kayıt başarısız: ${r.error}`, 'bad'); this.saveFailedOnce = true; if (manual && this.ui.paused) this.ui.showPause(true, 'Kayıt başarısız: ' + r.error); }
    return r;
  }

  // ---------- Döngü ----------
  frame(t) {
    const dt = Math.min(0.05, (t - (this.last || t)) / 1000); this.last = t; this.step(dt); this.render();
    requestAnimationFrame(t => this.frame(t));
  }
  get simulating() { return this.state === 'playing' && !this.ui.modalOpen && !this.ui.paused; }
  step(dt) {
    this.elapsed += dt; const P = this.player, input = this.input;
    if (this.state === 'menu') { this.cam.yaw += dt * 0.08; this.cam.update(dt, P.pos, { dx: 0, dy: 0, wheel: 0 }); this.env.update(dt * 4, P.pos, this.camera); this.worldTick(dt); return; }
    if (this.state !== 'playing') return;
    const look = input.look(), wheel = input.popWheel();
    if (this.simulating) {
      if (!P.dead) {
        if (input.pressed('use')) { const q = this.quickItem(); if (q) this.useItem(q.id); else this.ui.toast('Kullanacak eşya yok', 'warn'); }
        if (input.pressed('cycle')) this.cycleQuick();
        if (input.pressed('interact') && this.interactTarget && !P.attack) this.interact(this.interactTarget);
      }
      this.cam.update(dt, P.pos, { dx: look.dx, dy: look.dy, wheel }, this.fx.shake);
      P.update(dt, input, this.cam.yaw);
      for (const e of this.enemies) e.update(dt); this.enemies = this.enemies.filter(e => !e.removed || (this.scene.remove(e.root), false));
      this.env.update(dt, P.pos, this.camera); this.worldTick(dt);
      this.updateNPCs(dt); this.collectPickups();
      this.interactTarget = P.dead ? null : this.findInteractable(); this.ui.setPrompt(this.interactTarget ? `<kbd>${this.touch ? '✋' : 'E'}</kbd> ${this.interactTarget.label}` : null);
      this.updateRegion(dt);
      this.autosaveT -= dt; if (this.autosaveT <= 0) { this.autosaveT = 30; this.save(false, true); }
    } else { this.cam.update(0, P.pos, { dx: 0, dy: 0, wheel: 0 }); this.ui.setPrompt(null); }
    this.fx.update(this.simulating ? dt : 0); this.audio.ambient(dt, { night: this.env.nightFactor, rain: this.env.rain, cloud: this.env.cloud });
    this.ui.update(this, this.camera); input.endFrame();
  }
  worldTick(dt) {
    for (const u of this.world.updaters) u(dt, this.elapsed);
    const n = this.env.nightFactor; for (const m of this.world.nightEmissive) m.emissiveIntensity = n * 1.8; for (const l of this.world.lights) l.intensity = n * 16;
    this.torch.intensity = n * 4.5; this.scatterT -= dt; if (this.scatterT <= 0) { this.scatterT = 0.25; this.world.updateScatter(this.camera.position.x, this.camera.position.z); }
  }
  updateNPCs(dt) {
    for (const n of this.npcs) {
      const d = Math.hypot(n.x - this.player.pos.x, n.z - this.player.pos.z); let target = n.yaw; if (d < 9) target = Math.atan2(this.player.pos.x - n.x, this.player.pos.z - n.z);
      let diff = target - n.ch.root.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); n.ch.root.rotation.y += diff * Math.min(1, dt * 3);
      animate(n.ch, { walk: 0 }, dt); n.ch.torso.rotation.x = Math.sin(this.elapsed * 1.6 + n.x) * 0.02;
      if (n.markA) { const st = this.quests.status('shadows_road'); n.markA.visible = st === 'available'; n.markR.visible = st === 'ready'; n.markA.position.y = n.markR.position.y = 2.5 + Math.sin(this.elapsed * 3) * 0.08; }
    }
  }
  collectPickups() {
    const P = this.player.pos; for (const p of this.world.pickups) { if (p.taken) continue; if (Math.hypot(p.x - P.x, p.z - P.z) < 1.3) { if (this.inventory.canAdd(p.item)) { p.taken = true; p.mesh.visible = false; this.collected.add(p.id); this.inventory.add(p.item, 1); this.audio.pickup(); this.ui.toast(`+ ${getItem(p.item).name}`, 'good'); } else if (!this._fullToast || this.elapsed - this._fullToast > 3) { this._fullToast = this.elapsed; this.ui.toast('Envanter dolu', 'warn'); } } }
  }
  updateRegion(dt) {
    this.regionT -= dt; if (this.regionT > 0) return; this.regionT = 0.6; const P = this.player.pos; let name = null;
    const R = { village: 32, camp: 24, bossArena: 18, stones: 14, lake: 34 }; for (const [k, r] of Object.entries(R)) { const l = LOCATIONS[k]; if (Math.hypot(P.x - l.x, P.z - l.z) < r) { name = l.name; break; } }
    if (name !== this.regionName) { this.regionName = name; if (name) this.ui.region(name); }
  }
  render() { this.renderer.render(this.scene, this.camera); }
  renderOnce() { this.cam.update(0.016, this.player.pos, { dx: 0, dy: 0, wheel: 0 }); this.env.update(0, this.player.pos, this.camera); this.worldTick(0.3); this.render(); }
}

const game = new Game();
window.__fh = { game, THREE };
game.init().catch(err => { console.error(err); $('loadMsg').textContent = 'Başlatma hatası: ' + err.message; });
