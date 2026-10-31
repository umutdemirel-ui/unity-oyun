import * as THREE from 'three';
import { heightAt, WATER_Y } from '../core/worldgen.js';
export class ThirdPersonCamera {
  constructor(camera) { this.camera = camera; this.yaw = 0; this.pitch = 0.35; this.dist = 6; this.targetDist = 6; this.look = new THREE.Vector3(); this.smoothPos = new THREE.Vector3(); this.init = false; this.world = null; }
  // bina (OBB) ve büyük kaya/çadır dairelerinin içine girme
  blocked(x, y, z) {
    const w = this.world; if (!w) return false;
    for (const b of w.boxes) { const c = Math.cos(b.rot), s = Math.sin(b.rot), dx = x - b.x, dz = z - b.z; const lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < b.hw + 1.1 && Math.abs(lz) < b.hd + 1.1 && y < b.y0 + 7.5) return true; }
    return false;
  }
  update(dt, target, { dx, dy, wheel }, shake = 0) {
    this.yaw -= dx * 0.0032; this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.0028, -0.2, 1.25);
    this.targetDist = THREE.MathUtils.clamp(this.targetDist + wheel * 0.7, 2.6, 11); this.dist += (this.targetDist - this.dist) * Math.min(1, dt * 8);
    const cp = Math.cos(this.pitch), focus = new THREE.Vector3(target.x, target.y + 1.55, target.z);
    const off = new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    // kamera çarpışması: araziye girmesin; yakınlaştırmayı dene
    let d = this.dist; for (let i = 0; i < 6; i++) { const x = focus.x + off.x * d, z = focus.z + off.z * d, y = focus.y + off.y * d; if (y > Math.max(heightAt(x, z), WATER_Y) + 0.45 && !this.blocked(x, y, z)) break; d *= 0.85; }
    const want = focus.clone().addScaledVector(off, d);
    if (!this.init) { this.smoothPos.copy(want); this.init = true; } else this.smoothPos.lerp(want, Math.min(1, dt * 18));
    this.camera.position.copy(this.smoothPos);
    if (shake > 0) this.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake).multiplyScalar(0.5));
    this.camera.lookAt(focus);
  }
}
