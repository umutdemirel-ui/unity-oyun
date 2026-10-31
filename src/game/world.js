import * as THREE from 'three';
import { heightAt, waterDepth, pathDist, scatter, smoothstep, WATER_Y, WORLD_HALF, LOCATIONS, HOUSES, NPCS, VILLAGE_PROPS, CHESTS, pickupSpawns, MINE_ENTRANCE, mulberry32 } from '../core/worldgen.js';
import { geomOf, missing } from './assets.js';

// Mesafeye göre LOD ve hücre bazlı görünürlük kullanan örnekli (instanced) dağılım kümesi.
class ScatterSet {
  constructor(parent, { placements, near, far = null, cell = 50, nearDist = 70, farDist = 190, tint = null }) {
    this.cells = new Map(); this.nearDist = nearDist; this.farDist = farDist;
    for (const p of placements) {
      const k = Math.floor(p.x / cell) + ',' + Math.floor(p.z / cell);
      if (!this.cells.has(k)) this.cells.set(k, { cx: (Math.floor(p.x / cell) + 0.5) * cell, cz: (Math.floor(p.z / cell) + 0.5) * cell, items: [], nearMeshes: [], farMeshes: [] });
      this.cells.get(k).items.push(p);
    }
    this.cellR = cell * 0.75; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
    for (const c of this.cells.values()) {
      for (const [parts, list, isNear] of [[near, c.nearMeshes, true], [far, c.farMeshes, false]]) {
        if (!parts) continue;
        for (const part of parts) {
          const im = new THREE.InstancedMesh(part.geometry, part.material, c.items.length);
          c.items.forEach((p, i) => {
            e.set(0, p.rot, 0); q.setFromEuler(e); s.setScalar(p.s); pos.set(p.x, p.y, p.z); m4.compose(pos, q, s); im.setMatrixAt(i, m4);
            if (part.tint) { const t = (p.x * 7.13 + p.z * 3.7) % 1; col.copy(part.tint(Math.abs(t))); im.setColorAt(i, col); }
          });
          im.instanceMatrix.needsUpdate = true; im.castShadow = isNear && part.shadow !== false; im.receiveShadow = true; im.visible = false;
          parent.add(im); list.push(im);
        }
      }
    }
  }
  update(cx, cz) {
    for (const c of this.cells.values()) {
      const d = Math.hypot(c.cx - cx, c.cz - cz) - this.cellR;
      const near = d < this.nearDist, far = !near && d < this.farDist;
      for (const m of c.nearMeshes) m.visible = near || (!c.farMeshes.length && d < this.farDist);
      for (const m of c.farMeshes) m.visible = far;
    }
  }
}

// Basit procedural doku (GEÇİCİ köy malzemeleri için)
function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 4; return t;
}
const planks = (base, dark) => canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h); const r = mulberry32(5);
  for (let i = 0; i < 8; i++) { g.fillStyle = dark; g.fillRect(0, i * 16, w, 2); }
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 1 + r() * 22, 1); }
});
const plaster = tint => canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = tint; g.fillRect(0, 0, w, h); const r = mulberry32(9);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '60,40,20'},${r() * 0.09})`; g.fillRect(r() * w, r() * h, 2 + r() * 8, 2 + r() * 8); }
});
const shingles = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#6b3b2a'; g.fillRect(0, 0, w, h); const r = mulberry32(3);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = `hsl(${12 + r() * 10},${35 + r() * 10}%,${22 + r() * 10}%)`; g.fillRect(x * 16 + (y % 2) * 8 - 8, y * 16, 15, 14); }
}, [3, 2]);

export async function buildWorld(scene, loader, quality = 'high') {
  const world = { colliders: [], boxes: [], interactables: [], pickups: [], updaters: [], lights: [], nightEmissive: [], scatterSets: [], campfires: [] };
  const T = loader.tex;
  // ------- Zemin (ambientCG Ground037) -------
  const gT = {
    map: T('ground037/color.jpg', { srgb: true, repeat: true }), normalMap: T('ground037/normal_gl.jpg', { repeat: true }),
    roughnessMap: T('ground037/rough.jpg', { repeat: true }), aoMap: T('ground037/ao.jpg', { repeat: true }),
  };
  const SEG = quality === 'low' ? 160 : 260, SIZE = WORLD_HALF * 2, TILE = 5;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const P = tg.attributes.position, uv = tg.attributes.uv, colors = new Float32Array(P.count * 3), c = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), h = heightAt(x, z); P.setY(i, h); uv.setXY(i, x / TILE, z / TILE);
    const rockiness = smoothstep(9, 24, h), snow = smoothstep(30, 42, h), pd = 1 - smoothstep(1.2, 3.4, pathDist(x, z)), v = THREE.MathUtils.lerp;
    c.setRGB(1, 1, 1);
    c.r = v(c.r, 0.62, rockiness); c.g = v(c.g, 0.6, rockiness); c.b = v(c.b, 0.58, rockiness);
    c.r = v(c.r, 1.7, snow); c.g = v(c.g, 1.75, snow); c.b = v(c.b, 1.85, snow);
    c.r = v(c.r, 1.05, pd * 0.8); c.g = v(c.g, 0.72, pd * 0.8); c.b = v(c.b, 0.5, pd * 0.8); // yol: toprak
    if (h < WATER_Y + 0.5) { c.r *= 0.7; c.g *= 0.75; c.b *= 0.7; } // ıslak kıyı
    colors.set([c.r, c.g, c.b], i * 3);
  }
  tg.setAttribute('color', new THREE.BufferAttribute(colors, 3)); tg.computeVertexNormals();
  tg.setAttribute('uv1', uv.clone()); // aoMap için
  const groundMat = new THREE.MeshStandardMaterial({ ...gT, vertexColors: true, roughness: 1, aoMapIntensity: 0.8 });
  for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap']) groundMat[k].channel = 0;
  groundMat.normalScale.set(0.9, 0.9);
  groundMat.onBeforeCompile = sh => { // tekrar kırıcı: ikinci, büyük ölçekli örnekleme ile renk modülasyonu
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `
      vec4 s1 = texture2D( map, vMapUv ); vec4 s2 = texture2D( map, vMapUv * 0.113 + vec2(0.37, 0.61) );
      float macro = clamp( dot( s2.rgb, vec3(0.333) ) / 0.18, 0.55, 1.6 );
      diffuseColor *= vec4( s1.rgb * mix( 1.0, macro, 0.55 ), 1.0 );`);
  };
  const ground = new THREE.Mesh(tg, groundMat); ground.receiveShadow = true; scene.add(ground); world.ground = ground;

  // ------- Su -------
  const wn = T('ground037/normal_gl.jpg', { repeat: true }); wn.repeat.set(60, 60);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshStandardMaterial({ color: 0x2d6f86, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.78, normalMap: wn, normalScale: new THREE.Vector2(0.35, 0.35) }));
  water.rotation.x = -Math.PI / 2; water.position.y = WATER_Y; scene.add(water); world.water = water;
  world.updaters.push((dt, t) => { wn.offset.set(t * 0.004, t * 0.0027); });

  // ------- Poly Haven dağılımı -------
  const [treeG, treeFarG, rockG0, rockG2, stumpG] = await Promise.all([
    loader.glb('tree_small02/tree_game.glb'), loader.glb('tree_small02/tree_far.glb'), loader.glb('rock09/rock_lod0.glb'), loader.glb('rock09/rock_lod2.glb'), loader.glb('stump01/stump_low.glb'),
  ]);
  const sc = scatter();
  const PBR = (dir, pre = '') => ({ map: T(`${dir}/${pre}diff.jpg`, { srgb: true }), normalMap: T(`${dir}/${pre}normal_gl.jpg`), roughnessMap: T(`${dir}/${pre}rough.jpg`) });
  const trunkMat = new THREE.MeshStandardMaterial({ ...PBR('tree_small02', 'trunk_'), roughness: 1 });
  const branchMat = new THREE.MeshStandardMaterial({ map: T('tree_small02/branch_diff.webp', { srgb: true }), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.85 });
  const leafMat = new THREE.MeshStandardMaterial({ map: T('tree_small02/leaves_rgba.webp', { srgb: true }), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
  // Ekim ayı sonu: yapraklara hafif sonbahar tonu
  const autumn = t => new THREE.Color().setRGB(1 + t * 0.25, 1 - t * 0.12, 1 - t * 0.6 * (t > 0.6 ? 1 : 0.3));
  const treeParts = (g) => g && [
    { geometry: geomOf(g, 'trunk'), material: trunkMat },
    ...(geomOf(g, 'branches') ? [{ geometry: geomOf(g, 'branches'), material: branchMat, shadow: false }] : []),
    { geometry: geomOf(g, 'leaves'), material: leafMat, tint: autumn },
  ];
  if (treeG && treeFarG) {
    world.scatterSets.push(new ScatterSet(scene, { placements: sc.trees, near: treeParts(treeG), far: treeParts(treeFarG), cell: 50, nearDist: 65, farDist: 230 }));
  } else for (const t of sc.trees) placeholderTree(scene, t);
  const rockMat = new THREE.MeshStandardMaterial({ ...PBR('rock09'), roughness: 1 });
  if (rockG0 && rockG2) world.scatterSets.push(new ScatterSet(scene, { placements: sc.rocks, near: [{ geometry: geomOf(rockG0, 'lod0'), material: rockMat }], far: [{ geometry: geomOf(rockG2, 'lod2'), material: rockMat }], cell: 60, nearDist: 55, farDist: 230 }));
  else for (const r of sc.rocks) placeholderRock(scene, r);
  const stumpMat = new THREE.MeshStandardMaterial({ ...PBR('stump01'), roughness: 1 });
  if (stumpG) world.scatterSets.push(new ScatterSet(scene, { placements: sc.stumps, near: [{ geometry: geomOf(stumpG, 'stump'), material: stumpMat }], cell: 80, nearDist: 140, farDist: 140 }));
  else for (const s of sc.stumps) placeholderRock(scene, s, 0x6b4a2b);
  // Çarpışma: ağaç gövdesi, kaya, kütük
  for (const t of sc.trees) world.colliders.push({ x: t.x, z: t.z, r: t.r });
  for (const r of sc.rocks) world.colliders.push({ x: r.x, z: r.z, r: Math.max(0.6, r.r) });
  for (const s of sc.stumps) world.colliders.push({ x: s.x, z: s.z, r: 0.75 * s.s });

  buildVillage(scene, world);
  buildCamp(scene, world);
  buildStones(scene, world);
  buildMine(scene, world);
  buildPickups(scene, world);
  world.updateScatter = (x, z) => world.scatterSets.forEach(s => s.update(x, z));
  world.missing = missing;
  return world;
}

// ---- Eksik varlık için açıkça geçici geometri ----
function placeholderTree(scene, t) { const m = new THREE.Mesh(new THREE.ConeGeometry(1.4 * t.s, 5 * t.s, 6), new THREE.MeshStandardMaterial({ color: 0xff00ff, flatShading: true })); m.position.set(t.x, t.y + 2.5 * t.s, t.z); scene.add(m); }
function placeholderRock(scene, r, color = 0xff00ff) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 * r.s, 0), new THREE.MeshStandardMaterial({ color, flatShading: true })); m.position.set(r.x, r.y + 0.4 * r.s, r.z); scene.add(m); }

// ---------------- KÖY (GEÇİCİ procedural geometri) ----------------
function buildVillage(scene, world) {
  const wallTex = [plaster('#d8c9a8'), plaster('#cdb892'), plaster('#bfae95')];
  const beamMat = new THREE.MeshStandardMaterial({ map: planks('#4a3222', '#2a1a10'), roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ map: shingles, roughness: 0.9 });
  const doorMat = new THREE.MeshStandardMaterial({ map: planks('#5a3a22', '#2a1a10'), roughness: 0.85 });
  const winMat = new THREE.MeshStandardMaterial({ color: 0x1b2a3a, emissive: 0xffb050, emissiveIntensity: 0, roughness: 0.3 });
  world.nightEmissive.push(winMat);
  for (const H of HOUSES) {
    const g = new THREE.Group(); g.position.set(H.x, H.y - 0.3, H.z); g.rotation.y = H.rot;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(H.w, H.h + 0.3, H.d), new THREE.MeshStandardMaterial({ map: wallTex[H.tint], roughness: 0.95 })); wall.position.y = (H.h + 0.3) / 2; g.add(wall);
    const rise = H.d * 0.42, run = H.d / 2 + 0.5, len = Math.hypot(run, rise), ang = Math.atan2(rise, run);
    for (const s of [-1, 1]) { const slab = new THREE.Mesh(new THREE.BoxGeometry(H.w + 1, 0.22, len), roofMat); slab.position.set(0, H.h + 0.3 + rise / 2 + 0.1, s * (H.d / 4 + 0.25)); slab.rotation.x = -s * ang; slab.castShadow = true; g.add(slab); }
    for (const sx of [-1, 1]) { const tri = new THREE.BufferGeometry(); const y0 = H.h + 0.3, hd = H.d / 2;
      tri.setAttribute('position', new THREE.Float32BufferAttribute(sx > 0 ? [0, y0, -hd, 0, y0, hd, 0, y0 + rise, 0] : [0, y0, hd, 0, y0, -hd, 0, y0 + rise, 0], 3)); tri.computeVertexNormals();
      const m = new THREE.Mesh(tri, new THREE.MeshStandardMaterial({ map: wallTex[H.tint], side: THREE.DoubleSide })); m.position.x = sx * (H.w / 2 - 0.02); g.add(m); }
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, H.h + 0.4, 0.28), beamMat); b.position.set(cx * H.w / 2, (H.h + 0.4) / 2, cz * H.d / 2); g.add(b); }
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 0.12), doorMat); door.position.set(0, 1.05 + 0.3, H.d / 2 + 0.03); g.add(door);
    for (const wx of [-H.w * 0.3, H.w * 0.3]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.1), winMat); w.position.set(wx, 1.9, H.d / 2 + 0.03); g.add(w); }
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.7), new THREE.MeshStandardMaterial({ color: 0x77706a, roughness: 1 })); ch.position.set(H.w * 0.28, H.h + rise + 0.2, -H.d * 0.15); g.add(ch);
    wall.castShadow = wall.receiveShadow = true; scene.add(g);
    world.boxes.push({ x: H.x, z: H.z, hw: H.w / 2 + 0.1, hd: H.d / 2 + 0.1, rot: H.rot });
  }
  // Kuyu
  const W = VILLAGE_PROPS.well, wy = heightAt(W.x, W.z); const wg = new THREE.Group(); wg.position.set(W.x, wy, W.z);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a8780, roughness: 1, flatShading: true });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.45, 1.0, 12, 1, true), stoneMat); ring.material.side = THREE.DoubleSide; ring.position.y = 0.5; wg.add(ring);
  const wtr = new THREE.Mesh(new THREE.CircleGeometry(1.25, 12), new THREE.MeshStandardMaterial({ color: 0x1f5566, roughness: 0.1 })); wtr.rotation.x = -Math.PI / 2; wtr.position.y = 0.55; wg.add(wtr);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 0.15), beamMat); p.position.set(s * 1.2, 1.5, 0); wg.add(p); }
  const wr = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 0.8), roofMat); wr.position.y = 2.6; wg.add(wr); scene.add(wg);
  world.colliders.push({ x: W.x, z: W.z, r: 1.6 });
  // Demirhane
  const F = VILLAGE_PROPS.forge, fy = heightAt(F.x, F.z); const fg = new THREE.Group(); fg.position.set(F.x, fy, F.z); fg.rotation.y = Math.atan2(-F.x, -F.z);
  for (const [px, pz] of [[-1.8, -1.5], [1.8, -1.5], [-1.8, 1.5], [1.8, 1.5]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3, 0.22), beamMat); p.position.set(px, 1.5, pz); p.castShadow = true; fg.add(p); }
  const fr = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.2, 4), roofMat); fr.position.y = 3.1; fr.rotation.x = 0.12; fr.castShadow = true; fg.add(fr);
  const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: 0x2c2c30, metalness: 0.7, roughness: 0.4 })); anvil.position.set(-0.8, 0.5, 0.2); fg.add(anvil);
  const coals = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 1.1), new THREE.MeshStandardMaterial({ color: 0x331100, emissive: 0xff4a10, emissiveIntensity: 1.6 })); coals.position.set(1.0, 0.45, -0.6); fg.add(coals);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.6), stoneMat); base.position.set(1.0, 0.25, -0.6); fg.add(base); scene.add(fg);
  const fl = new THREE.PointLight(0xff7a30, 6, 14, 2); fl.position.set(F.x, fy + 1.4, F.z); scene.add(fl);
  world.updaters.push((dt, t) => { fl.intensity = 5 + Math.sin(t * 17) * 0.8 + Math.sin(t * 7.3) * 0.7; });
  world.colliders.push({ x: F.x, z: F.z, r: 1.0 });
  // Meydan feneri (geceleri yanar)
  const lamp = lantern(scene, world, 4.5, 4.5); lantern(scene, world, -6, 6); void lamp;
  // NPC'ler etkileşim noktası olarak world'e eklenir (modeller main.js'de)
  world.npcs = NPCS;
  // Sandıklar
  for (const C of CHESTS) {
    const y = heightAt(C.x, C.z); const g = new THREE.Group(); g.position.set(C.x, y, C.z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.7), new THREE.MeshStandardMaterial({ map: planks('#6a4326', '#2a1a10'), roughness: 0.8 })); body.position.y = 0.3; g.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 8, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ map: planks('#6a4326', '#2a1a10'), roughness: 0.8 })); lid.rotation.z = Math.PI / 2; lid.rotation.y = Math.PI / 2; lid.position.y = 0.6; lid.rotation.order = 'YXZ'; g.add(lid);
    const glow = new THREE.PointLight(0x88ffcc, 1.2, 7, 2); glow.position.y = 1; g.add(glow); scene.add(g);
    world.chestMeshes = world.chestMeshes || {}; world.chestMeshes[C.id] = { group: g, glow, lid };
  }
}
function lantern(scene, world, x, z) {
  const y = heightAt(x, z); const g = new THREE.Group(); g.position.set(x, y, z);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3, 6), new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 1 })); post.position.y = 1.5; g.add(post);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0xffb050, emissiveIntensity: 0 }); world.nightEmissive.push(bulbMat);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), bulbMat); bulb.position.y = 3.1; g.add(bulb);
  const l = new THREE.PointLight(0xffb060, 0, 16, 2); l.position.y = 3.1; g.add(l); world.lights.push(l); scene.add(g); world.colliders.push({ x, z, r: 0.2 }); return l;
}

// ---------------- Goblin kampı (GEÇİCİ) ----------------
function buildCamp(scene, world) {
  const C = LOCATIONS.camp, y = heightAt(C.x, C.z);
  const hide = new THREE.MeshStandardMaterial({ color: 0x6d5a3a, roughness: 1, flatShading: true, side: THREE.DoubleSide });
  const tents = [[-6, 5, 0.5], [6, 6, -0.6], [0, -9, 2.5]];
  for (const [dx, dz, r] of tents) { const x = C.x + dx, z = C.z + dz; const t = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.2, 5, 1, true), hide); t.position.set(x, heightAt(x, z) + 1.6, z); t.rotation.y = r; t.castShadow = true; scene.add(t); world.colliders.push({ x, z, r: 2.0 }); }
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a }); const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 6), fireMat); flame.position.set(C.x, y + 0.7, C.z); scene.add(flame);
  const logs = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0x2a1a10 })); logs.position.set(C.x, y + 0.1, C.z); scene.add(logs);
  const l = new THREE.PointLight(0xff8030, 8, 22, 2); l.position.set(C.x, y + 1.3, C.z); scene.add(l); world.colliders.push({ x: C.x, z: C.z, r: 0.9 });
  world.updaters.push((dt, t) => { l.intensity = 7 + Math.sin(t * 19) * 1.2 + Math.sin(t * 9.1) * 1.0; flame.scale.y = 0.9 + Math.sin(t * 15) * 0.2; });
  // Kazıklar / uyarı işaretleri
  const sp = new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 1 });
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3, x = C.x + Math.cos(a) * 14, z = C.z + Math.sin(a) * 14; const s = new THREE.Mesh(new THREE.ConeGeometry(0.12, 2.6, 5), sp); s.position.set(x, heightAt(x, z) + 1.3, z); s.rotation.z = 0.12; scene.add(s); world.colliders.push({ x, z, r: 0.2 }); }
}
function buildStones(scene, world) { // gizli alanda hafif parlama
  const S = LOCATIONS.stones; const l = new THREE.PointLight(0x7fffd0, 1.5, 16, 2); l.position.set(S.x, heightAt(S.x, S.z) + 2, S.z); scene.add(l);
  world.updaters.push((dt, t) => { l.intensity = 1.3 + Math.sin(t * 1.3) * 0.5; });
}
function buildMine(scene, world) { // maden girişi: karanlık kapı (GEÇİCİ)
  const M = MINE_ENTRANCE, y = heightAt(M.x, M.z);
  const dark = new THREE.Mesh(new THREE.BoxGeometry(4, 4.4, 0.3), new THREE.MeshBasicMaterial({ color: 0x050505 })); dark.position.set(M.x, y + 2.2, M.z); dark.rotation.y = Math.atan2(-M.x, -M.z); scene.add(dark);
  const beam = new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 1 });
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.6, 0.35), beam); b.position.set(M.x + s * 2.1 * Math.cos(dark.rotation.y), y + 2.3, M.z - s * 2.1 * Math.sin(dark.rotation.y)); scene.add(b); }
  world.colliders.push({ x: M.x, z: M.z, r: 2.4 });
}
function buildPickups(scene, world) {
  const herb = new THREE.MeshStandardMaterial({ color: 0x55c060, emissive: 0x1a6a2a, emissiveIntensity: 0.9, flatShading: true });
  const apple = new THREE.MeshStandardMaterial({ color: 0xd03030, emissive: 0x601010, emissiveIntensity: 0.6 });
  for (const p of pickupSpawns()) {
    const y = heightAt(p.x, p.z); const m = p.item === 'apple' ? new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), apple) : new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 5), herb);
    m.position.set(p.x, y + 0.5, p.z); scene.add(m); world.pickups.push({ ...p, mesh: m, baseY: y + 0.5, taken: false });
  }
  world.updaters.push((dt, t) => { for (const p of world.pickups) if (!p.taken) { p.mesh.rotation.y = t * 1.5; p.mesh.position.y = p.baseY + Math.sin(t * 2 + p.x) * 0.08; } });
}
