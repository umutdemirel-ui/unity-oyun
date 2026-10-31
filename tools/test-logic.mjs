// Çekirdek mantık testleri (tarayıcı gerekmez): npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { Inventory } from '../src/core/inventory.js';
import { Progression, xpForNext, mitigate, MAX_LEVEL } from '../src/core/progression.js';
import { QuestLog } from '../src/core/quests.js';
import { SaveStore, buildSave, SAVE_KEY } from '../src/core/save.js';
import { ITEMS } from '../src/core/items.js';
import { PATHS, slopeAt, heightAt, waterDepth, scatter, LOCATIONS, ENEMY_SPAWNS, HOUSES, NPCS } from '../src/core/worldgen.js';
import { mareDialogue } from '../src/core/dialogue.js';

const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k), _m: m }; };

test('envanter: yığınlama, kapasite, kaldırma', () => {
  const inv = new Inventory(3);
  assert.equal(inv.add('health_potion', 12), 0); assert.equal(inv.slots.length, 2); // stack 10
  assert.equal(inv.count('health_potion'), 12);
  assert.equal(inv.add('iron_sword'), 0); assert.equal(inv.add('chain_shirt'), 1); // dolu: 1 eklenemedi
  assert.ok(inv.remove('health_potion', 11)); assert.equal(inv.count('health_potion'), 1);
  assert.equal(inv.remove('health_potion', 5), false);
});
test('ekipman: kuşan/değiştir/çıkar', () => {
  const inv = new Inventory(); inv.add('rusty_sword'); inv.add('iron_sword');
  assert.ok(inv.equip('rusty_sword').ok); assert.equal(inv.weapon().id, 'rusty_sword');
  assert.ok(inv.equip('iron_sword').ok); assert.equal(inv.count('rusty_sword'), 1); assert.equal(inv.weapon().id, 'iron_sword');
  assert.equal(inv.equip('health_potion').ok, false);
  assert.ok(inv.unequip('weapon').ok); assert.equal(inv.weapon(), null); assert.equal(inv.count('iron_sword'), 1);
});
test('eşya türleri: silah, zırh, iksir, yiyecek, malzeme, görev', () => {
  const types = new Set(Object.values(ITEMS).map(i => i.type)); for (const t of ['weapon', 'armor', 'potion', 'food', 'material', 'quest']) assert.ok(types.has(t), t);
});
test('ilerleme: seviye atlama ve üst sınır', () => {
  const p = new Progression(); assert.equal(p.addXp(99), 0); assert.equal(p.addXp(1), 1); assert.equal(p.level, 2); assert.equal(p.xp, 0);
  assert.equal(p.addXp(xpForNext(2) + xpForNext(3)), 2); assert.equal(p.level, 4);
  p.addXp(1e7); assert.equal(p.level, MAX_LEVEL);
  assert.ok(p.maxHp() > 100);
});
test('hasar azaltma', () => { assert.equal(mitigate(10, { defense: 3 }), 7); assert.equal(mitigate(2, { defense: 9 }), 1); assert.equal(mitigate(20, { blocking: true, blockFactor: 0.2 }), 4); });
test('görev: kabul → ilerleme → hazır → teslim', () => {
  const q = new QuestLog(); assert.equal(q.status('shadows_road'), 'available');
  assert.ok(q.start('shadows_road')); assert.equal(q.start('shadows_road'), false);
  for (let i = 0; i < 6; i++) q.notify('kill', 'goblin'); assert.equal(q.state.shadows_road.progress.goblins, 4); // üst sınır
  assert.equal(q.status('shadows_road'), 'active');
  assert.equal(q.complete('shadows_road'), null);
  q.notify('kill', 'moss_troll'); assert.equal(q.status('shadows_road'), 'ready');
  const r = q.complete('shadows_road'); assert.ok(r.gold > 0 && r.items.length); assert.equal(q.status('shadows_road'), 'completed'); assert.equal(q.complete('shadows_road'), null);
});
test('diyalog: duruma göre değişir', () => {
  const q = new QuestLog(); assert.match(mareDialogue({ quests: q }).choices[0].text, /kabul/i);
  q.start('shadows_road'); assert.match(mareDialogue({ quests: q }).text, /işin bitmedi/);
  for (let i = 0; i < 4; i++) q.notify('kill', 'goblin'); q.notify('kill', 'moss_troll'); assert.equal(mareDialogue({ quests: q }).choices[0].action.type, 'completeQuest');
});
const fakeGame = () => {
  const inv = new Inventory(); inv.add('iron_sword'); inv.equip('iron_sword'); inv.add('health_potion', 3); inv.addGold(77);
  const pr = new Progression(); pr.addXp(150); const q = new QuestLog(); q.start('shadows_road'); q.notify('kill', 'goblin');
  return { x: 12.5, y: 0.3, z: -8, yaw: 1.2, hp: 66, stamina: 40, progression: pr, inventory: inv, quests: q, time: 0.6, defeated: new Set(['g1']), collected: new Set(['pk1']) };
};
test('kayıt: gidiş-dönüş', () => {
  const st = new SaveStore(memStore()); const g = fakeGame(); assert.ok(st.save(g).ok); const r = st.load(); assert.ok(r.ok);
  const inv = new Inventory(); inv.load(r.data.inventory); assert.equal(inv.equipment.weapon, 'iron_sword'); assert.equal(inv.gold, 77); assert.equal(inv.count('health_potion'), 3);
  const pr = new Progression(); pr.load(r.data.progression); assert.equal(pr.level, g.progression.level); assert.equal(pr.xp, g.progression.xp);
  const q = new QuestLog(); q.load(r.data.quests); assert.equal(q.state.shadows_road.progress.goblins, 1);
  assert.deepEqual(r.data.world.defeated, ['g1']); assert.equal(r.data.player.hp, 66);
});
test('kayıt: bozuk/uyumsuz/eksik/depolama hatası', () => {
  const s = memStore(); const st = new SaveStore(s);
  assert.deepEqual(st.load(), { ok: false, error: null });
  s.setItem(SAVE_KEY, '{bozuk'); assert.match(st.load().error, /bozuk/);
  s.setItem(SAVE_KEY, JSON.stringify({ version: 99 })); assert.match(st.load().error, /sürüm/);
  s.setItem(SAVE_KEY, JSON.stringify({ version: 1, player: { x: 'a' } })); assert.match(st.load().error, /Oyuncu/);
  const full = { getItem() { return null; }, setItem() { const e = new Error('q'); e.name = 'QuotaExceededError'; throw e; }, removeItem() {} };
  const r = new SaveStore(full).save(fakeGame()); assert.equal(r.ok, false); assert.match(r.error, /dolu/);
  // sahte eşya/negatif miktar temizlenir
  const inv = new Inventory(); inv.load({ slots: [{ id: 'yok', qty: 3 }, { id: 'bread', qty: -1 }, { id: 'bread', qty: 2 }], equipment: { weapon: 'bread', armor: 'chain_shirt' }, gold: -5 });
  assert.equal(inv.count('bread'), 2); assert.equal(inv.equipment.weapon, null); assert.equal(inv.equipment.armor, 'chain_shirt'); assert.equal(inv.gold, 0);
});
test('dünya: deterministik arazi, yerleşim kuralları', () => {
  assert.equal(heightAt(10, 10), heightAt(10, 10));
  const a = scatter(), b = scatter(); assert.equal(a.trees.length, b.trees.length); assert.equal(a.trees[5].x, b.trees[5].x);
  for (const k of ['village', 'camp', 'bossArena', 'stones']) assert.ok(waterDepth(LOCATIONS[k].x, LOCATIONS[k].z) < -0.5, k + ' suda olmamalı');
  assert.ok(waterDepth(LOCATIONS.lake.x, LOCATIONS.lake.z) > 1.5);
  for (const e of ENEMY_SPAWNS) assert.ok(waterDepth(e.x, e.z) < -0.5, e.id);
  for (const n of Object.values(NPCS)) assert.ok(waterDepth(n.x, n.z) < -0.5);
  for (const t of a.trees) assert.ok(Math.hypot(t.x, t.z) > 27, 'ağaç köyün içinde');
  for (const h of HOUSES) assert.ok(Number.isFinite(h.y));
});

test('dünya: yollar boyunca su yok, görev noktalarına yürünebilir', () => {
  for (const path of PATHS) for (let i = 0; i < path.length - 1; i++) for (let t = 0; t <= 1; t += 0.05) {
    const x = path[i][0] + (path[i + 1][0] - path[i][0]) * t, z = path[i][1] + (path[i + 1][1] - path[i][1]) * t;
    if (x === 42 && z === 32) continue; // göl kıyısı yolun bilinçli ucu
    assert.ok(waterDepth(x, z) < 0.2, `yol suda: ${x.toFixed(1)},${z.toFixed(1)} derinlik ${waterDepth(x, z).toFixed(2)}`);
    assert.ok(slopeAt(x, z) < 0.9, `yol çok dik: ${x.toFixed(1)},${z.toFixed(1)}`);
  }
});
