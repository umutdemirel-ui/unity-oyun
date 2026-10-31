// Fellhaven varlık hazırlama: ham CC0 varlıkları (PolyHaven / ambientCG) web için optimize eder.
// Çalıştır: npm run assets   (ham dosyalar depoda PolyHaven/ ve ambientCG/ altında durur, değişmez)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const OUT = 'public/assets';
const STUMP_SIZE = { scale: 0.01 }; // FBX birimi cm gibi görünüyor -> ~1.4 m
const TEX = 1024; // hedef doku çözünürlüğü
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log('[assets]', ...a);

// ---- Node polyfills (GLTFExporter FileReader ister; FBXLoader doku yüklemesin) ----
globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then(r => { this.result = r; this.onloadend?.(); }); }
  readAsDataURL(b) { b.arrayBuffer().then(r => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend?.(); }); }
};
THREE.TextureLoader.prototype.load = () => new THREE.Texture();

// ---- Doku yardımcıları ----
function magick(args) { execFileSync('convert', args, { stdio: 'inherit' }); }
function writePPM(file, w, h, rgb8) {
  fs.writeFileSync(file, Buffer.concat([Buffer.from(`P6\n${w} ${h}\n255\n`), Buffer.from(rgb8.buffer, rgb8.byteOffset, rgb8.byteLength)]));
}
function exrToJpg(src, dst, { channel = 'rgb' } = {}) {
  const buf = fs.readFileSync(src);
  const loader = new EXRLoader(); loader.type = THREE.FloatType;
  const { width, height, data } = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const stride = data.length / (width * height);
  const rgb = new Uint8Array(width * height * 3);
  const q = v => Math.max(0, Math.min(255, Math.round(v * 255)));
  for (let i = 0; i < width * height; i++) {
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = q(data[i * stride + (channel === 'r' ? 0 : c)]);
  }
  const tmp = dst + '.ppm'; writePPM(tmp, width, height, rgb);
  // EXRLoader satırları alttan üste verir -> JPG için çevir
  magick([tmp, '-flip', '-resize', `${TEX}x${TEX}`, ...(channel === 'r' ? ['-colorspace', 'Gray'] : []), '-quality', '88', dst]);
  fs.unlinkSync(tmp);
}
function jpg(src, dst, extra = []) { magick([src, '-resize', `${TEX}x${TEX}`, ...extra, '-quality', '86', dst]); }

// ---- Zemin: ambientCG Ground037 ----
function prepGround() {
  const d = 'ambientCG/Ground037/Ground037_2K-JPG_'; const o = `${OUT}/ground037`;
  fs.mkdirSync(o, { recursive: true });
  jpg(`${d}Color.jpg`, `${o}/color.jpg`);
  jpg(`${d}Roughness.jpg`, `${o}/rough.jpg`, ['-colorspace', 'Gray']);
  jpg(`${d}AmbientOcclusion.jpg`, `${o}/ao.jpg`, ['-colorspace', 'Gray']);
  // ambientCG normalleri DirectX (Y-); three.js OpenGL (Y+) bekler -> yeşil kanalı ters çevir
  jpg(`${d}NormalDX.jpg`, `${o}/normal_gl.jpg`, ['-channel', 'G', '-negate', '+channel']);
  log('Ground037 tamam');
}

// ---- FBX yükleme ----
function loadFBX(file) {
  const buf = fs.readFileSync(file);
  const root = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
  root.updateMatrixWorld(true);
  const meshes = []; root.traverse(o => { if (o.isMesh) meshes.push(o); });
  return meshes;
}
function bake(mesh) { const g = mesh.geometry.clone(); g.applyMatrix4(mesh.matrixWorld); return g; }
function bbox(g) { g.computeBoundingBox(); return g.boundingBox; }
// Yüksekliği 'height' metre olacak, tabanı y=0, xz merkezli normalize et. Bounding box'ı ortak verilir.
function normalize(geoms, upAxis, size, refCount = geoms.length) { // size: {height} veya {scale}
    const m = new THREE.Matrix4();
  if (upAxis === 'z') m.makeRotationX(-Math.PI / 2); // Z-up -> Y-up
  geoms.forEach(g => g.applyMatrix4(m));
  const b2 = new THREE.Box3(); geoms.slice(0, refCount).forEach(g => b2.union(bbox(g)));
  const s = size.scale ?? size.height / (b2.max.y - b2.min.y);
  const c = b2.getCenter(new THREE.Vector3());
  geoms.forEach(g => { g.translate(-c.x, -b2.min.y, -c.z); g.scale(s, s, s); g.computeBoundingBox(); g.computeBoundingSphere(); });
  return s;
}
function finalize(g) {
  // glTF standardı: v ekseni yukarıdan aşağı
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  g.computeVertexNormals && !g.attributes.normal && g.computeVertexNormals();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  return g;
}
async function exportGLB(named, file) {
  const scene = new THREE.Scene();
  for (const [name, g] of Object.entries(named)) { const m = new THREE.Mesh(finalize(g), new THREE.MeshStandardMaterial({ name })); m.name = name; scene.add(m); }
  const ab = await new GLTFExporter().parseAsync(scene, { binary: true });
  fs.writeFileSync(file, Buffer.from(ab));
  const tris = Object.entries(named).map(([n, g]) => `${n}:${(g.index ? g.index.count : g.attributes.position.count) / 3}`).join(' ');
  log(path.basename(file), (ab.byteLength / 1024).toFixed(0) + ' KB', tris);
}
function simplify(g, targetTris) {
  let m = g.clone(); for (const k of Object.keys(m.attributes)) if (!['position', 'normal', 'uv'].includes(k)) m.deleteAttribute(k);
  m = mergeVertices(m, 1e-4);
  const tris = m.index.count / 3;
  const remove = Math.max(0, Math.floor(m.attributes.position.count * (1 - targetTris / tris)));
  const s = new SimplifyModifier().modify(m, remove);
  s.computeVertexNormals();
  return s;
}

// ---- Rock09 ----
async function prepRock() {
  const meshes = loadFBX('PolyHaven/Rock09/rock_09_2k.fbx');
  const by = n => meshes.find(m => m.name.endsWith(n));
  const lod0 = bake(by('LOD0')), lod2 = bake(by('LOD2'));
  log('Rock09 ham bbox', bbox(lod0).getSize(new THREE.Vector3()).toArray().map(v => v.toFixed(3)));
  // En uzun eksen yukarı (Y) varsayılıyor; render ile doğrulanır
  const s = normalize([lod0, lod2], 'y', { scale: 0.1 });
  log('Rock09 ölçek', s);
  const o = `${OUT}/rock09`; fs.mkdirSync(o, { recursive: true });
  await exportGLB({ lod0 }, `${o}/rock_lod0.glb`); await exportGLB({ lod2 }, `${o}/rock_lod2.glb`);
  const t = 'PolyHaven/Rock09/textures/rock_09_';
  jpg(`${t}diff_2k.jpg`, `${o}/diff.jpg`);
  exrToJpg(`${t}nor_gl_2k.exr`, `${o}/normal_gl.jpg`);
  exrToJpg(`${t}rough_2k.exr`, `${o}/rough.jpg`, { channel: 'r' });
}

// ---- TreeStump01 ----
async function prepStump() {
  const [mesh] = loadFBX('PolyHaven/TreeStump01/tree_stump_01_2k.fbx');
  const g = bake(mesh);
  log('Stump ham bbox', bbox(g).getSize(new THREE.Vector3()).toArray().map(v => v.toFixed(3)));
  const lowRes = simplify(g, 6000);
  normalize([lowRes], 'y', STUMP_SIZE);
  const o = `${OUT}/stump01`; fs.mkdirSync(o, { recursive: true });
  await exportGLB({ stump: lowRes }, `${o}/stump_low.glb`);
  const t = 'PolyHaven/TreeStump01/textures/tree_stump_01_';
  jpg(`${t}diff_2k.jpg`, `${o}/diff.jpg`);
  exrToJpg(`${t}nor_gl_2k.exr`, `${o}/normal_gl.jpg`);
  exrToJpg(`${t}rough_2k.exr`, `${o}/rough.jpg`, { channel: 'r' });
}

// ---- TreeSmall02: 2M üçgenli tek LOD0 -> oyun için ucuz sürüm ----
function subGeom(src, triIdx) {
  const pos = src.attributes.position, nor = src.attributes.normal, uv = src.attributes.uv;
  const n = triIdx.length * 3;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2);
  let k = 0;
  for (const t of triIdx) for (let j = 0; j < 3; j++, k++) {
    const i = t * 3 + j;
    P.set([pos.getX(i), pos.getY(i), pos.getZ(i)], k * 3); N.set([nor.getX(i), nor.getY(i), nor.getZ(i)], k * 3); U.set([uv.getX(i), uv.getY(i)], k * 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  return g;
}
function components(g, start, count) { // pozisyona göre bağlı parçalar
  const pos = g.attributes.position; const parent = new Map();
  const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const key = i => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  const tk = [];
  for (let t = start / 3; t < (start + count) / 3; t++) {
    const ks = [0, 1, 2].map(j => key(t * 3 + j)); ks.forEach(k => { if (!parent.has(k)) parent.set(k, k); });
    ks.forEach(k => { const a = find(ks[0]), b = find(k); if (a !== b) parent.set(a, b); }); tk.push([t, ks[0]]);
  }
  const comps = new Map(); for (const [t, k] of tk) { const r = find(k); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(t); }
  return [...comps.values()].sort((a, b) => a[0] - b[0]);
}
function solve3(A, b) { // 3x3 Cramer
  const det = M => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  const d = det(A); if (Math.abs(d) < 1e-12) return null;
  return [0, 1, 2].map(c => det(A.map((r, i) => r.map((v, j) => (j === c ? b[i] : v)))) / d);
}
// Her yaprak parçasını (≈19 üçgen) UV->3B afin uyumu ile 2 üçgenlik karta indirger
function leafCards(src, comps, keepEvery, grow) {
  const pos = src.attributes.position, nor = src.attributes.normal, uv = src.attributes.uv;
  const P = [], N = [], U = [];
  comps.forEach((tris, ci) => {
    if (ci % keepEvery) return;
    let umin = 9, umax = -9, vmin = 9, vmax = -9; const AtA = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; const Atb = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const nrm = new THREE.Vector3(), cen = new THREE.Vector3(); let cnt = 0;
    for (const t of tris) for (let j = 0; j < 3; j++) {
      const i = t * 3 + j, u = uv.getX(i), v = uv.getY(i), r = [u, v, 1];
      umin = Math.min(umin, u); umax = Math.max(umax, u); vmin = Math.min(vmin, v); vmax = Math.max(vmax, v);
      for (let a = 0; a < 3; a++) { for (let b = 0; b < 3; b++) AtA[a][b] += r[a] * r[b]; for (let c = 0; c < 3; c++) Atb[a][c] += r[a] * [pos.getX(i), pos.getY(i), pos.getZ(i)][c]; }
      nrm.add(new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i))); cen.add(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))); cnt++;
    }
    const cols = [0, 1, 2].map(c => solve3(AtA, Atb.map(r => r[c]))); if (cols.some(x => !x)) return;
    const at = (u, v) => new THREE.Vector3(...cols.map(c => c[0] * u + c[1] * v + c[2]));
    cen.divideScalar(cnt); nrm.normalize();
    const corner = [[umin, vmin], [umax, vmin], [umax, vmax], [umin, vmax]].map(([u, v]) => { const p = at(u, v); p.sub(cen).multiplyScalar(grow).add(cen); return { p, u, v }; });
    for (const k of [0, 1, 2, 0, 2, 3]) { const c = corner[k]; P.push(c.p.x, c.p.y, c.p.z); N.push(nrm.x, nrm.y, nrm.z); U.push(c.u, c.v); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  return g;
}
async function prepTree() {
  const [mesh] = loadFBX('PolyHaven/TreeSmall02/tree_small_02_2k.fbx');
  const src = bake(mesh);
  log('Tree ham üçgen', src.attributes.position.count / 3, 'bbox', bbox(src).getSize(new THREE.Vector3()).toArray().map(v => v.toFixed(2)));
  const [gBranch, gLeaf, gTrunk] = src.groups; // materialIndex 0=branches 1=leaves 2=trunk
  const bc = components(src, gBranch.start, gBranch.count), lc = components(src, gLeaf.start, gLeaf.count);
  const branches = subGeom(src, bc.filter((_, i) => i % 8 === 0).flat());
  const trunkFull = subGeom(src, Array.from({ length: gTrunk.count / 3 }, (_, i) => gTrunk.start / 3 + i));
  const trunk = simplify(trunkFull, 5000);
  const leaves = leafCards(src, lc, 3, 1.7);
  // Uzak LOD: sadeleştirilmiş gövde + daha az, daha büyük yaprak kartı
  const trunkFar = simplify(trunkFull, 700);
  const leavesFar = leafCards(src, lc, 7, 2.3);
  normalize([trunk, branches, leaves, trunkFar, leavesFar], 'y', { height: 5.5 }, 3);
  const o = `${OUT}/tree_small02`; fs.mkdirSync(o, { recursive: true });
  await exportGLB({ trunk, branches, leaves }, `${o}/tree_game.glb`);
  await exportGLB({ trunk: trunkFar, leaves: leavesFar }, `${o}/tree_far.glb`);
  const t = 'PolyHaven/TreeSmall02/textures/tree_small_02_';
  jpg(`${t}diff_2k.jpg`, `${o}/trunk_diff.jpg`);
  exrToJpg(`${t}nor_gl_2k.exr`, `${o}/trunk_normal_gl.jpg`);
  exrToJpg(`${t}rough_2k.exr`, `${o}/trunk_rough.jpg`, { channel: 'r' });
  magick([`${t}branch_diff_2k.png`, '-resize', '512x512', '-quality', '85', `${o}/branch_diff.webp`]);
  // yaprak: renk + alfa -> tek RGBA webp
  magick([`${t}leaves_diff_2k.png`, `${t}leaves_alpha_2k.png`, '-resize', '1024x1024!', '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', '-quality', '85', `${o}/leaves_rgba.webp`]);
}

const which = process.argv[2] || 'all';
if (which === 'all' || which === 'ground') prepGround();
if (which === 'all' || which === 'rock') await prepRock();
if (which === 'all' || which === 'stump') await prepStump();
if (which === 'all' || which === 'tree') await prepTree();
log('bitti');
