import { getItem, isConsumable, isEquippable, slotOf } from './items.js';

// Slot tabanlı envanter + ekipman. Saf mantık: DOM/Three.js bağımlılığı yok.
export class Inventory {
  constructor(capacity = 24) {
    this.capacity = capacity;
    this.slots = []; // { id, qty }
    this.equipment = { weapon: null, armor: null };
    this.gold = 0;
  }
  count(id) { return this.slots.reduce((n, s) => n + (s.id === id ? s.qty : 0), 0); }
  has(id, qty = 1) { return this.count(id) >= qty; }
  canAdd(id, qty = 1) {
    const it = getItem(id); if (!it) return false;
    let room = 0;
    for (const s of this.slots) if (s.id === id) room += it.stack - s.qty;
    room += (this.capacity - this.slots.length) * it.stack;
    return room >= qty;
  }
  // Eklenemeyen miktarı döndürür (0 = tamamı eklendi)
  add(id, qty = 1) {
    const it = getItem(id); if (!it) return qty;
    for (const s of this.slots) {
      if (s.id !== id || qty <= 0) continue;
      const put = Math.min(it.stack - s.qty, qty); s.qty += put; qty -= put;
    }
    while (qty > 0 && this.slots.length < this.capacity) {
      const put = Math.min(it.stack, qty); this.slots.push({ id, qty: put }); qty -= put;
    }
    return qty;
  }
  remove(id, qty = 1) {
    if (!this.has(id, qty)) return false;
    for (let i = this.slots.length - 1; i >= 0 && qty > 0; i--) {
      const s = this.slots[i]; if (s.id !== id) continue;
      const take = Math.min(s.qty, qty); s.qty -= take; qty -= take;
      if (s.qty === 0) this.slots.splice(i, 1);
    }
    return true;
  }
  // Envanterdeki eşyayı kuşan; eski ekipman envantere döner.
  equip(id) {
    const it = getItem(id);
    if (!isEquippable(it) || !this.has(id)) return { ok: false, reason: 'Kuşanılamaz' };
    const slot = slotOf(it); const prev = this.equipment[slot];
    this.remove(id, 1);
    if (prev) { const left = this.add(prev, 1); if (left) { this.add(id, 1); return { ok: false, reason: 'Envanter dolu' }; } }
    this.equipment[slot] = id;
    return { ok: true, slot, previous: prev };
  }
  unequip(slot) {
    const cur = this.equipment[slot]; if (!cur) return { ok: false, reason: 'Boş' };
    if (this.add(cur, 1)) return { ok: false, reason: 'Envanter dolu' };
    this.equipment[slot] = null; return { ok: true };
  }
  weapon() { return getItem(this.equipment.weapon); }
  armor() { return getItem(this.equipment.armor); }
  consumables() { return this.slots.filter(s => isConsumable(getItem(s.id))); }
  addGold(n) { this.gold = Math.max(0, this.gold + n); }
  serialize() { return { slots: this.slots.map(s => ({ ...s })), equipment: { ...this.equipment }, gold: this.gold }; }
  load(d) {
    this.slots = []; this.equipment = { weapon: null, armor: null }; this.gold = 0;
    if (!d || typeof d !== 'object') return;
    for (const s of Array.isArray(d.slots) ? d.slots : []) {
      if (s && getItem(s.id) && Number.isInteger(s.qty) && s.qty > 0) this.add(s.id, s.qty);
    }
    for (const k of ['weapon', 'armor']) {
      const id = d.equipment && d.equipment[k]; const it = getItem(id);
      if (it && slotOf(it) === k) this.equipment[k] = id;
    }
    this.gold = Number.isFinite(d.gold) ? Math.max(0, Math.floor(d.gold)) : 0;
  }
}
