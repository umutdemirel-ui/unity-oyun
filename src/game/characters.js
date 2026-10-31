import * as THREE from 'three';

// GEÇİCİ karakter modelleri: depoda karakter/hayvan varlığı yok. Basit low-poly parçalardan oluşan,
// iskelet gerektirmeyen hiyerarşik insansı model. Tüm oyuncu/düşman/NPC bunu kullanır.
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });

export function buildHumanoid(o = {}) {
  const { skin = 0xd9a77a, tunic = 0x3d5a80, pants = 0x4a3a2a, hair = 0x3a2a1a, scale = 1, ears = false, robe = false, beard = 0, weapon = 'sword', weaponColor = 0xc0c8d0, shield = false, moss = false, fat = 1, bald = false, apron = false } = o;
  const root = new THREE.Group(); const pivot = new THREE.Group(); pivot.position.y = 0.9; root.add(pivot); const body = new THREE.Group(); body.position.y = -0.9; pivot.add(body); const mats = [];
  const M = (c, e) => { const m = mat(c, e); mats.push(m); return m; };
  const add = (parent, geo, material, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const tunicM = M(tunic), skinM = M(skin), pantsM = M(pants);
  // gövde
  const torso = new THREE.Group(); torso.position.y = 1.2; body.add(torso);
  add(torso, new THREE.BoxGeometry(0.52 * fat, 0.66, 0.3 * fat), tunicM);
  if (robe) { const r = add(body, new THREE.CylinderGeometry(0.3 * fat, 0.5 * fat, 1.0, 8), tunicM, 0, 0.62, 0); r.rotation.y = 0.4; }
  if (apron) add(torso, new THREE.BoxGeometry(0.4 * fat, 0.8, 0.05), M(0x6b4b30), 0, -0.15, 0.17 * fat);
  const belt = add(torso, new THREE.BoxGeometry(0.54 * fat, 0.08, 0.32 * fat), M(0x2a1a10), 0, -0.3, 0);
  void belt;
  // baş
  const head = new THREE.Group(); head.position.set(0, 0.55, 0); torso.add(head);
  add(head, new THREE.SphereGeometry(0.17, 10, 8), skinM, 0, 0.1, 0);
  if (!bald) add(head, new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), M(hair), 0, 0.13, -0.01);
  if (beard) { const b = add(head, new THREE.ConeGeometry(0.13, 0.35, 6), M(beard), 0, -0.1, 0.1); b.rotation.x = Math.PI; }
  for (const s of [-1, 1]) add(head, new THREE.SphereGeometry(0.025, 5, 4), M(0x111111), s * 0.065, 0.13, 0.15);
  if (ears) for (const s of [-1, 1]) { const e = add(head, new THREE.ConeGeometry(0.07, 0.3, 4), skinM, s * 0.22, 0.12, 0); e.rotation.z = -s * 1.35; }
  // kollar
  const mkArm = s => {
    const g = new THREE.Group(); g.position.set(s * 0.33 * fat, 0.27, 0); torso.add(g);
    add(g, new THREE.BoxGeometry(0.15, 0.58, 0.15), tunicM, 0, -0.27, 0); add(g, new THREE.SphereGeometry(0.085, 6, 5), skinM, 0, -0.6, 0); return g;
  };
  const armL = mkArm(-1), armR = mkArm(1);
  // silah (sağ el)
  const wp = new THREE.Group(); wp.position.set(0, -0.6, 0.05); armR.add(wp);
  if (weapon === 'sword') { add(wp, new THREE.BoxGeometry(0.05, 0.2, 0.05), M(0x4a3222), 0, 0, 0); add(wp, new THREE.BoxGeometry(0.22, 0.04, 0.06), M(0x6a5a40), 0, 0.11, 0); const bl = add(wp, new THREE.BoxGeometry(0.07, 0.9, 0.025), M(weaponColor, { metalness: 0.7, roughness: 0.35 }), 0, 0.58, 0); wp.userData.blade = bl; }
  else if (weapon === 'club') { add(wp, new THREE.CylinderGeometry(0.05, 0.1, 0.8, 6), M(0x5a3a22), 0, 0.35, 0); add(wp, new THREE.SphereGeometry(0.12, 6, 5), M(0x5a3a22), 0, 0.8, 0); }
  else if (weapon === 'staff') add(wp, new THREE.CylinderGeometry(0.03, 0.04, 1.7, 5), M(0x5a3a22), 0, 0.5, 0);
  else if (weapon === 'hammer') { add(wp, new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5), M(0x5a3a22), 0, 0.2, 0); add(wp, new THREE.BoxGeometry(0.28, 0.16, 0.16), M(0x555560, { metalness: 0.6 }), 0, 0.5, 0); }
  else if (weapon === 'treeclub') { add(wp, new THREE.CylinderGeometry(0.1, 0.22, 1.7, 6), M(0x4a3626), 0, 0.7, 0); add(wp, new THREE.IcosahedronGeometry(0.28, 0), M(0x3d6a2a), 0, 1.5, 0); }
  if (shield) { const sh = add(armL, new THREE.CylinderGeometry(0.28, 0.28, 0.05, 10), M(0x7a5a3a), 0, -0.55, 0.12); sh.rotation.x = Math.PI / 2; add(sh, new THREE.CylinderGeometry(0.07, 0.07, 0.08, 8), M(0xaaaaaa, { metalness: 0.8 }), 0, 0.04, 0); }
  // bacaklar
  const mkLeg = s => { const g = new THREE.Group(); g.position.set(s * 0.14 * fat, 0.9, 0); body.add(g); add(g, new THREE.BoxGeometry(0.18 * fat, 0.82, 0.2), pantsM, 0, -0.41, 0); add(g, new THREE.BoxGeometry(0.2 * fat, 0.1, 0.3), M(0x2a1a10), 0, -0.86, 0.04); return g; };
  const legL = mkLeg(-1), legR = mkLeg(1);
  if (moss) { for (const [x, y, z, r] of [[-0.3, 0.35, 0, 0.2], [0.28, 0.3, -0.05, 0.17], [0, 0.2, -0.22, 0.25], [0.15, 0.55, 0.1, 0.12]]) add(torso, new THREE.IcosahedronGeometry(r, 0), M(0x3f7a2e), x * fat, y, z); }
  root.scale.setScalar(scale);
  return { root, pivot, body, torso, head, armL, armR, legL, legR, weaponGroup: wp, mats, tunicM, skinM, phase: 0, weaponKind: weapon, scale, baseEmissive: mats.map(() => 0) };
}

// Kıyafet/silah görünümünü ekipmana göre güncelle
export function applyEquipmentLook(ch, { armorId, weaponId }) {
  const col = { leather_vest: 0x6a4a2a, chain_shirt: 0x80868f }[armorId] ?? 0x3d5a80; ch.tunicM.color.setHex(col); ch.tunicM.metalness = armorId === 'chain_shirt' ? 0.5 : 0;
  const blade = ch.weaponGroup.userData.blade; if (blade) blade.material.color.setHex({ rusty_sword: 0x8a6a50, iron_sword: 0xc0c8d0, wardens_blade: 0xe0c870 }[weaponId] ?? 0xc0c8d0);
  if (blade) blade.scale.set(1, weaponId === 'wardens_blade' ? 1.15 : weaponId === 'iron_sword' ? 1.05 : 0.95, 1);
  ch.weaponGroup.visible = !!weaponId || ch.weaponKind !== 'sword';
}

export function flash(ch, k, color = 0xffffff) { // k:0..1
  for (const m of ch.mats) { m.emissive.setHex(color); m.emissiveIntensity = k; }
}

const lerp = THREE.MathUtils.lerp;
// pose: { walk: 0..1 hızı, dt, attack: {phase:'windup'|'strike'|'recover', p, heavy}, blocking, roll: 0..1|null, dead: 0..1, stagger }
export function animate(ch, pose, dt) {
  const walk = pose.walk || 0; ch.phase += dt * (4 + walk * 5) * (walk > 0.02 ? 1 : 0);
  const sw = Math.sin(ch.phase) * 0.9 * Math.min(1, walk);
  const rest = (a, v) => { a.rotation.x = lerp(a.rotation.x, v, Math.min(1, dt * 14)); };
  rest(ch.legL, sw); rest(ch.legR, -sw);
  ch.armL.rotation.z = lerp(ch.armL.rotation.z, 0, Math.min(1, dt * 12)); ch.armR.rotation.z = lerp(ch.armR.rotation.z, 0, Math.min(1, dt * 12));
  let armRx = -sw * 0.8, armLx = sw * 0.8, torsoY = 0, torsoX = 0;
  const a = pose.attack;
  if (a) {
    const heavy = a.heavy; const up = heavy ? -2.9 : -2.2, down = heavy ? 0.5 : 0.2;
    if (a.phase === 'windup') { armRx = lerp(-0.2, up, a.p); torsoY = lerp(0, 0.5, a.p); torsoX = heavy ? lerp(0, -0.15, a.p) : 0; }
    else if (a.phase === 'strike') { armRx = lerp(up, down, Math.min(1, a.p * 1.4)); torsoY = lerp(0.5, -0.5, a.p); torsoX = heavy ? lerp(-0.15, 0.3, a.p) : 0; }
    else { armRx = lerp(down, 0, a.p); torsoY = lerp(-0.5, 0, a.p); torsoX = lerp(heavy ? 0.3 : 0, 0, a.p); }
    armLx = -0.5;
  }
  if (pose.blocking) { armLx = -1.35; ch.armL.rotation.z = -0.55; armRx = -1.0; ch.armR.rotation.z = 0.4; }
  ch.armR.rotation.x = armRx; ch.armL.rotation.x = armLx; ch.torso.rotation.y = lerp(ch.torso.rotation.y, torsoY, Math.min(1, dt * 20)); ch.torso.rotation.x = lerp(ch.torso.rotation.x, torsoX + (pose.stagger ? -0.35 : 0), Math.min(1, dt * 18));
  ch.pivot.position.y = lerp(ch.pivot.position.y, 0.9 + Math.abs(Math.sin(ch.phase)) * 0.04 * walk, Math.min(1, dt * 12));
  ch.pivot.rotation.x = 0;
  if (pose.roll != null) { ch.pivot.rotation.x = pose.roll * Math.PI * 2; ch.pivot.position.y = 0.7 + Math.sin(pose.roll * Math.PI) * 0.15; ch.legL.rotation.x = ch.legR.rotation.x = -1.2; ch.armL.rotation.x = ch.armR.rotation.x = -1.6; }
  if (pose.dead != null && pose.dead > 0) { const k = Math.min(1, pose.dead * 3); ch.pivot.rotation.x = -k * Math.PI / 2 * 0.98; ch.pivot.position.y = lerp(0.9, 0.22, k); }
}
