import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Tüm gerçek varlıklar public/assets altında (npm run assets ile ham CC0 dosyalardan üretilir).
// Yüklenemeyen varlık için sessizce uydurma yapılmaz: 'missing' listesine eklenir ve geçici geometri kullanılır.
const BASE = (import.meta.env && import.meta.env.BASE_URL) || '/';
const url = p => `${BASE}assets/${p}`;
export const missing = [];

export function createLoader(renderer) {
  const tl = new THREE.TextureLoader(); const gl = new GLTFLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tex = (path, { srgb = false, repeat = false, flipY = false } = {}) => {
    const t = tl.load(url(path), undefined, undefined, () => missing.push(path));
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.flipY = flipY; t.anisotropy = aniso;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  const glb = path => new Promise(res => gl.load(url(path), g => res(g), undefined, () => { missing.push(path); res(null); }));
  return { tex, glb };
}

// GLB içindeki isimli mesh'in geometrisini ver
export function geomOf(gltf, name) {
  let g = null; gltf && gltf.scene.traverse(o => { if (o.isMesh && (o.name === name || o.material?.name === name)) g = o.geometry; });
  return g;
}
