// Kayıt sistemi. Depolama enjekte edilebilir (tarayıcıda localStorage, testte sahte).
export const SAVE_KEY = 'fellhaven.save.v1';
export const SAVE_VERSION = 1;

export function buildSave(game) {
  return {
    version: SAVE_VERSION, savedAt: Date.now(),
    player: { x: game.x, y: game.y, z: game.z, yaw: game.yaw, hp: game.hp, stamina: game.stamina },
    progression: game.progression.serialize(),
    inventory: game.inventory.serialize(),
    quests: game.quests.serialize(),
    world: { time: game.time, defeated: [...game.defeated], collected: [...game.collected] },
  };
}
export function validateSave(d) {
  if (!d || typeof d !== 'object') return 'Kayıt biçimi geçersiz';
  if (d.version !== SAVE_VERSION) return `Kayıt sürümü desteklenmiyor (${d.version})`;
  const p = d.player; if (!p || ![p.x, p.y, p.z, p.hp].every(Number.isFinite)) return 'Oyuncu verisi bozuk';
  return null;
}
export class SaveStore {
  constructor(storage) { this.storage = storage; }
  save(game) {
    try { this.storage.setItem(SAVE_KEY, JSON.stringify(buildSave(game))); return { ok: true }; }
    catch (e) { return { ok: false, error: e && e.name === 'QuotaExceededError' ? 'Depolama dolu' : (e && e.message) || 'Bilinmeyen hata' }; }
  }
  has() { try { return !!this.storage.getItem(SAVE_KEY); } catch { return false; } }
  load() {
    let raw;
    try { raw = this.storage.getItem(SAVE_KEY); } catch (e) { return { ok: false, error: 'Depolamaya erişilemiyor' }; }
    if (!raw) return { ok: false, error: null };
    try {
      const d = JSON.parse(raw); const err = validateSave(d);
      return err ? { ok: false, error: err } : { ok: true, data: d };
    } catch { return { ok: false, error: 'Kayıt dosyası okunamadı (bozuk JSON)' }; }
  }
  clear() { try { this.storage.removeItem(SAVE_KEY); return true; } catch { return false; } }
}
