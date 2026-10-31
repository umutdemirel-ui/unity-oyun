// Seviye / deneyim / türetilmiş istatistikler.
export const MAX_LEVEL = 20;
export const xpForNext = level => 60 + level * level * 40; // 1->2: 100, 2->3: 220 ...

export class Progression {
  constructor() { this.level = 1; this.xp = 0; }
  // Seviye atlanan sayısını döndürür
  addXp(n) {
    let ups = 0; this.xp += Math.max(0, Math.floor(n));
    while (this.level < MAX_LEVEL && this.xp >= xpForNext(this.level)) { this.xp -= xpForNext(this.level); this.level++; ups++; }
    if (this.level >= MAX_LEVEL) this.xp = 0;
    return ups;
  }
  get next() { return xpForNext(this.level); }
  maxHp() { return 100 + (this.level - 1) * 12; }
  maxStamina() { return 100 + (this.level - 1) * 6; }
  bonusDamage() { return (this.level - 1) * 2; }
  serialize() { return { level: this.level, xp: this.xp }; }
  load(d) {
    this.level = 1; this.xp = 0; if (!d) return;
    const l = Math.floor(d.level), x = Math.floor(d.xp);
    if (l >= 1 && l <= MAX_LEVEL) this.level = l;
    if (x >= 0 && x < xpForNext(this.level)) this.xp = x;
  }
}

// Gelen hasarı zırh ve blok ile azaltır.
export function mitigate(damage, { defense = 0, blocking = false, blockFactor = 0.2 } = {}) {
  let d = Math.max(1, damage - defense);
  if (blocking) d = Math.max(0, Math.round(d * blockFactor));
  return d;
}
