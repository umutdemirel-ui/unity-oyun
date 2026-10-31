import { heightAt, waterDepth, PLAY_RADIUS } from '../core/worldgen.js';

// Daire ve yönlü kutu (OBB) çarpışmalarından çıkar. pos: {x,z}
export function pushOut(pos, radius, world) {
  for (const c of world.colliders) {
    const dx = pos.x - c.x, dz = pos.z - c.z, min = radius + c.r;
    if (dx > min || dx < -min || dz > min || dz < -min) continue;
    const d2 = dx * dx + dz * dz; if (d2 >= min * min) continue;
    const d = Math.sqrt(d2) || 0.0001; pos.x = c.x + (dx / d) * min; pos.z = c.z + (dz / d) * min;
  }
  for (const b of world.boxes) {
    const cos = Math.cos(b.rot), sin = Math.sin(b.rot); const dx = pos.x - b.x, dz = pos.z - b.z;
    const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos; // yerel koordinat
    const ox = b.hw + radius - Math.abs(lx), oz = b.hd + radius - Math.abs(lz);
    if (ox > 0 && oz > 0) {
      let nx = lx, nz = lz; if (ox < oz) nx = Math.sign(lx || 1) * (b.hw + radius); else nz = Math.sign(lz || 1) * (b.hd + radius);
      pos.x = b.x + nx * cos + nz * sin; pos.z = b.z - nx * sin + nz * cos;
    }
  }
  const r = Math.hypot(pos.x, pos.z); if (r > PLAY_RADIUS) { pos.x *= PLAY_RADIUS / r; pos.z *= PLAY_RADIUS / r; }
}

// Hareketi dene: derin suya ve çok dik yamaca girme
export function tryMove(pos, dx, dz, radius, world, { maxDeep = 1.5, maxSlope = 1.3 } = {}) {
  const nx = pos.x + dx, nz = pos.z + dz;
  const len = Math.hypot(dx, dz) || 1e-6;
  const ok = (x, z) => waterDepth(x, z) < maxDeep && (heightAt(x, z) - heightAt(pos.x, pos.z)) / len < maxSlope;
  if (ok(nx, nz)) { pos.x = nx; pos.z = nz; }
  else if (dx && ok(nx, pos.z)) pos.x = nx;
  else if (dz && ok(pos.x, nz)) pos.z = nz;
  pushOut(pos, radius, world);
}
export const groundAt = (x, z) => heightAt(x, z);
export function angleDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
export function turnToward(cur, target, maxStep) { const d = angleDiff(cur, target); return Math.abs(d) <= maxStep ? target : cur + Math.sign(d) * maxStep; }
