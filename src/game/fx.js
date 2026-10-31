import * as THREE from 'three';
// Kıvılcım parçacıkları + yüzen hasar sayıları (DOM)
export class FX {
  constructor(scene, camera, overlay) {
    this.scene = scene; this.camera = camera; this.overlay = overlay; this.sparks = []; this.texts = [];
    this.geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    this.pool = []; for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color: 0xffc060 })); m.visible = false; scene.add(m); this.pool.push({ m, v: new THREE.Vector3(), life: 0 }); }
    this.shake = 0;
  }
  burst(pos, color = 0xffc060, n = 10, speed = 4) {
    for (let i = 0; i < n; i++) { const p = this.pool.find(p => p.life <= 0); if (!p) return; p.m.material.color.setHex(color); p.m.position.copy(pos); p.v.set((Math.random() - 0.5) * speed, Math.random() * speed * 0.8, (Math.random() - 0.5) * speed); p.life = 0.45 + Math.random() * 0.2; p.m.visible = true; }
  }
  text(pos, str, cls = '') {
    const el = document.createElement('div'); el.className = 'dmg ' + cls; el.textContent = str; this.overlay.appendChild(el);
    this.texts.push({ el, pos: pos.clone(), t: 0 });
  }
  addShake(a) { this.shake = Math.min(0.6, this.shake + a); }
  update(dt) {
    for (const p of this.pool) { if (p.life <= 0) continue; p.life -= dt; p.v.y -= 12 * dt; p.m.position.addScaledVector(p.v, dt); if (p.life <= 0) p.m.visible = false; }
    const w = innerWidth, h = innerHeight, v = new THREE.Vector3();
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i]; t.t += dt; v.copy(t.pos); v.y += t.t * 1.4; v.project(this.camera);
      if (t.t > 1 || v.z > 1) { t.el.remove(); this.texts.splice(i, 1); continue; }
      t.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-50%)`; t.el.style.opacity = String(1 - t.t * t.t);
    }
    this.shake = Math.max(0, this.shake - dt * 1.6);
  }
}
