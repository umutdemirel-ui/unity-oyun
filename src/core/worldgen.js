// Saf (DOM'suz) dünya üretimi: arazi yüksekliği, yollar, su, yerleşim ve dağılım verisi.
// Üç.js'e bağımlı değildir; testlerde ve oyunda aynı sonuçları verir (sabit tohum).
export const WORLD_HALF = 160;      // dünya yarı genişliği (m)
export const WATER_Y = -1.0;        // su yüzeyi
export const PLAY_RADIUS = 150;     // oyuncunun gidebileceği sınır

export const LOCATIONS = {
  village: { x: 0, z: 0, name: 'Fellhaven Köyü' },
  spawn: { x: 2, z: 8 },
  camp: { x: -60, z: -58, name: 'Gözcü Yolu Kampı' },
  bossArena: { x: -76, z: -72, name: 'Yosun Mağarası Girişi' },
  stones: { x: 46, z: -74, name: 'Fısıldayan Taşlar (gizli alan)' },
  lake: { x: 62, z: 40, r: 24, name: 'Aynagöl' },
};
export const RIVER = [[112, -118], [94, -66], [82, -22], [68, 18]];
export const PATHS = [
  [[0, 0], [-14, -20], [-34, -40], [-52, -52], [-60, -58], [-70, -66], [-76, -72]],
  [[6, 6], [24, 20], [42, 32]],
  [[6, -8], [22, -36], [36, -62], [46, -74]],
];
// Düzleştirilen alanlar
const FLATS = [
  { x: 0, z: 0, r: 30, soft: 16 }, { x: -60, z: -58, r: 15, soft: 8 }, { x: -76, z: -72, r: 13, soft: 8 }, { x: 46, z: -74, r: 8, soft: 6 },
];

// --- Tohumlu RNG ve gürültü ---
export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(ix, iz) { let h = (ix * 374761393 + iz * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const sm = t => t * t * (3 - 2 * t);
export function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = sm(x - ix), fz = sm(z - iz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
export function fbm(x, z, oct = 4) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += a * vnoise(x * f, z * f); a *= 0.5; f *= 2.03; } return v; }
export const smoothstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
function distPoly(px, pz, pts) { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distSeg(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])); return d; }
export function pathDist(x, z) { let d = 1e9; for (const p of PATHS) d = Math.min(d, distPoly(x, z, p)); return d; }

function baseHeight(x, z) {
  const d = Math.hypot(x, z);
  let h = (fbm(x * 0.012 + 11, z * 0.012 + 7) - 0.45) * 12 + (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 1.6;
  h += smoothstep(105, 158, d) * (26 + fbm(x * 0.03 + 3, z * 0.03 + 9) * 22); // çevre dağlar
  return h;
}
export function heightAt(x, z) {
  let h = baseHeight(x, z);
  for (const f of FLATS) {
    const t = 1 - smoothstep(f.r, f.r + f.soft, Math.hypot(x - f.x, z - f.z));
    if (t > 0) h = mix(h, f === FLATS[0] ? 0.4 : baseHeightFlat(f), t);
  }
  const L = LOCATIONS.lake; // göl
  const dl = Math.hypot(x - L.x, z - L.z);
  h = mix(h, -3.4, 1 - smoothstep(L.r * 0.55, L.r * 1.15, dl));
  const dr = distPoly(x, z, RIVER); // nehir
  h = mix(h, -2.3, 1 - smoothstep(2.2, 7.5, dr));
  const dp = pathDist(x, z); // yollar hafif oyulur
  h -= (1 - smoothstep(0.8, 3, dp)) * 0.08;
  return h;
}
const flatCache = new Map();
function baseHeightFlat(f) { if (!flatCache.has(f)) flatCache.set(f, Math.max(0.8, baseHeight(f.x, f.z) * 0.5 + 0.3)); return flatCache.get(f); }
export const waterDepth = (x, z) => WATER_Y - heightAt(x, z); // >0 sualtı
export function slopeAt(x, z) { const e = 1; return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e); }

// --- Köy yerleşimi (GEÇİCİ procedural geometri; depoda ev varlığı yok) ---
function faceCenter(x, z) { return Math.atan2(-x, -z); }
export const HOUSES = [
  { x: -17, z: -5, w: 7, d: 6, h: 3.2, tint: 0 }, { x: -13, z: 13, w: 6, d: 6, h: 3.0, tint: 1 },
  { x: 4, z: 20, w: 7, d: 6.5, h: 3.4, tint: 2 }, { x: 18, z: 13, w: 6, d: 6, h: 3.0, tint: 0 },
  { x: 20, z: -6, w: 7, d: 6, h: 3.2, tint: 1 }, { x: -2, z: -20, w: 9, d: 7, h: 4.0, tint: 2, hall: true },
].map(h => ({ ...h, rot: faceCenter(h.x, h.z), y: heightAt(h.x, h.z) }));
export const NPCS = {
  maren: { id: 'maren', name: 'Yaşlı Maren', x: -3, z: -5, role: 'Köy İhtiyarı' },
  torin: { id: 'torin', name: 'Demirci Torin', x: 12, z: -12, role: 'Demirci' },
};
export const VILLAGE_PROPS = { well: { x: 0, z: 0, r: 1.5 }, forge: { x: 13.5, z: -13.5 } };
export const CAMPFIRES = [{ x: -60, z: -58 }, { x: 0.5, z: -3.2 + 6 }];

// --- Düşman yerleşimi ---
export const ENEMY_SPAWNS = [
  { id: 'g1', type: 'goblin', x: -52, z: -50 }, { id: 'g2', type: 'goblin', x: -66, z: -52 },
  { id: 'g3', type: 'goblin', x: -57, z: -66 }, { id: 'g4', type: 'goblin', x: -70, z: -62 },
  { id: 'boss', type: 'moss_troll', x: -76, z: -72 },
];
export const CHESTS = [{ id: 'chest_stones', x: 46, z: -74, loot: { gold: 60, items: [{ id: 'health_potion', qty: 2 }, { id: 'chain_shirt', qty: 1 }] }, label: 'Fısıldayan Taşlar’daki sandık' }];
export function pickupSpawns() {
  const rng = mulberry32(777), out = []; let tries = 0;
  while (out.length < 14 && tries++ < 2000) {
    const a = rng() * Math.PI * 2, r = 18 + rng() * 85; const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (waterDepth(x, z) > -0.4 || slopeAt(x, z) > 0.5) continue;
    out.push({ id: 'pk' + out.length, item: out.length % 3 === 0 ? 'apple' : 'wild_herb', x, z });
  }
  return out;
}

// --- Ağaç / kaya / kütük dağılımı ---
export function isClear(x, z, extra = 0) {
  if (Math.hypot(x, z) < 27 + extra) return false;
  for (const f of FLATS.slice(1)) if (Math.hypot(x - f.x, z - f.z) < f.r - 2 + extra) return false;
  if (pathDist(x, z) < 3.5 + extra) return false;
  if (waterDepth(x, z) > -0.5) return false;
  return true;
}
export function scatter(seed = 4242) {
  const rng = mulberry32(seed);
  const trees = [], rocks = [], stumps = [];
  const placed = [];
  const free = (x, z, r) => placed.every(p => Math.hypot(p.x - x, p.z - z) > p.r + r);
  let tries = 0;
  while (trees.length < 150 && tries++ < 12000) {
    const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * 146, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const forest = fbm(x * 0.02 + 40, z * 0.02 + 5); if (forest < 0.42 && rng() > 0.15) continue;
    const y = heightAt(x, z); if (y > 14 || slopeAt(x, z) > 0.7 || !isClear(x, z) || !free(x, z, 2.2)) continue;
    const s = 0.85 + rng() * 0.65; placed.push({ x, z, r: 2.2 });
    trees.push({ x, y, z, rot: rng() * Math.PI * 2, s, r: 0.45 * s });
  }
  tries = 0;
  while (rocks.length < 48 && tries++ < 8000) {
    const a = rng() * Math.PI * 2, rr = 20 + Math.sqrt(rng()) * 128, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const y = heightAt(x, z); const mountain = smoothstep(8, 30, y);
    if (rng() > 0.25 + mountain || !isClear(x, z, 1) || !free(x, z, 1.5)) continue;
    const s = 0.8 + rng() * 2.2; placed.push({ x, z, r: 1.4 });
    rocks.push({ x, y: y - 0.1, z, rot: rng() * Math.PI * 2, s, r: 0.75 * s });
  }
  tries = 0;
  while (stumps.length < 16 && tries++ < 4000) {
    const a = rng() * Math.PI * 2, rr = 28 + Math.sqrt(rng()) * 110, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (!isClear(x, z, 0.5) || !free(x, z, 1.4) || slopeAt(x, z) > 0.5) continue;
    placed.push({ x, z, r: 1.2 });
    stumps.push({ x, y: heightAt(x, z) - 0.05, z, rot: rng() * Math.PI * 2, s: 0.9 + rng() * 0.6, r: 0.6 });
  }
  // Fısıldayan Taşlar: halka biçiminde dikili kayalar (gizli alan)
  const S = LOCATIONS.stones; const ring = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, x = S.x + Math.cos(a) * 6, z = S.z + Math.sin(a) * 6; ring.push({ x, y: heightAt(x, z) - 0.1, z, rot: a + 1, s: 2.2, r: 1.5, standing: true }); }
  // Mağara girişi için kaya kemeri
  const B = LOCATIONS.bossArena; const arch = [];
  for (let i = 0; i < 6; i++) { const a = -2.5 + i * 0.45, x = B.x - 9 + Math.cos(a) * 5, z = B.z - 6 + Math.sin(a) * 5; arch.push({ x, y: heightAt(x, z) - 0.1, z, rot: i, s: 3.0, r: 2.0 }); }
  return { trees, rocks: rocks.concat(ring, arch), stumps };
}
export const MINE_ENTRANCE = { x: LOCATIONS.bossArena.x - 9, z: LOCATIONS.bossArena.z - 6 };
