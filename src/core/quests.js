// Görev tanımları ve görev günlüğü durum makinesi.
// Durumlar: available -> active -> ready -> completed
export const QUESTS = {
  shadows_road: {
    id: 'shadows_road',
    title: 'Eski Yolun Gölgeleri',
    giver: 'maren',
    summary: 'Köy ihtiyarı Maren, kuzeybatıdaki Gözcü Yolu’nu işgal eden goblinlerden korkuyor.',
    objectives: [
      { id: 'goblins', type: 'kill', target: 'goblin', count: 4, text: 'Goblin Akıncılarını yen' },
      { id: 'boss', type: 'kill', target: 'moss_troll', count: 1, text: 'Yosun Trolü’nü yen' },
      { id: 'return', type: 'talk', target: 'maren', count: 1, text: 'Maren’e dön' },
    ],
    reward: { xp: 150, gold: 120, items: [{ id: 'iron_sword', qty: 1 }, { id: 'health_potion', qty: 2 }] },
  },
};

export class QuestLog {
  constructor(defs = QUESTS) { this.defs = defs; this.state = {}; /* id -> { status, progress:{objId:n} } */ }
  status(id) { return (this.state[id] && this.state[id].status) || 'available'; }
  start(id) {
    if (!this.defs[id] || this.state[id]) return false;
    const progress = {}; this.defs[id].objectives.forEach(o => { progress[o.id] = 0; });
    this.state[id] = { status: 'active', progress }; return true;
  }
  // Öldürme/konuşma olayı; değişen görevlerin listesini döndürür
  notify(type, target) {
    const changed = [];
    for (const [id, st] of Object.entries(this.state)) {
      if (st.status !== 'active') continue;
      const def = this.defs[id]; let touched = false;
      for (const o of def.objectives) {
        if (o.type !== type || o.target !== target) continue;
        if (o.type === 'talk' && !this._previousDone(def, o, st)) continue; // dönüş hedefi sona kalır
        if (st.progress[o.id] < o.count) { st.progress[o.id]++; touched = true; }
      }
      if (touched) {
        const nonTalk = def.objectives.filter(o => o.type !== 'talk');
        if (nonTalk.every(o => st.progress[o.id] >= o.count)) st.status = 'ready';
        changed.push(id);
      }
    }
    return changed;
  }
  _previousDone(def, obj, st) { return def.objectives.filter(o => o !== obj && o.type !== 'talk').every(o => st.progress[o.id] >= o.count); }
  // Teslim: ödülü döndürür (uygulama tarafı verir)
  complete(id) {
    const st = this.state[id]; if (!st || st.status !== 'ready') return null;
    st.status = 'completed'; this.defs[id].objectives.forEach(o => { st.progress[o.id] = o.count; });
    return this.defs[id].reward;
  }
  active() { return Object.keys(this.state).filter(id => this.state[id].status === 'active' || this.state[id].status === 'ready'); }
  describe(id) {
    const def = this.defs[id], st = this.state[id];
    return def.objectives.map(o => ({
      text: o.text, count: o.count, done: st ? st.progress[o.id] : 0,
      complete: st ? st.progress[o.id] >= o.count : false,
    }));
  }
  serialize() { return JSON.parse(JSON.stringify(this.state)); }
  load(d) {
    this.state = {}; if (!d || typeof d !== 'object') return;
    for (const [id, st] of Object.entries(d)) {
      const def = this.defs[id]; if (!def || !st || !['active', 'ready', 'completed'].includes(st.status)) continue;
      const progress = {}; def.objectives.forEach(o => { const n = Math.floor(st.progress && st.progress[o.id]); progress[o.id] = n >= 0 ? Math.min(n, o.count) : 0; });
      this.state[id] = { status: st.status, progress };
    }
  }
}
