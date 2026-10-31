import fs from 'node:fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
THREE.TextureLoader.prototype.load = function(){ return new THREE.Texture(); };
const buf = fs.readFileSync('PolyHaven/TreeSmall02/tree_small_02_2k.fbx');
const root = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset+buf.byteLength), '');
let mesh; root.traverse(o=>{ if(o.isMesh) mesh=o; });
const g = mesh.geometry;
console.log('groups', JSON.stringify(g.groups), 'verts', g.attributes.position.count, 'indexed', !!g.index);
const pos = g.attributes.position;
g.computeBoundingBox(); console.log(g.boundingBox.min.toArray(), g.boundingBox.max.toArray());
// connected components per group (via vertex position hash)
for (const grp of g.groups) {
  const idx = g.index ? g.index.array : null;
  const parent = new Map();
  const find = x => { while (parent.get(x)!==x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x);} return x; };
  const key = i => `${Math.round(pos.getX(i)*1e4)},${Math.round(pos.getY(i)*1e4)},${Math.round(pos.getZ(i)*1e4)}`;
  const vk = new Array(3);
  const triKeys = [];
  for (let t=grp.start; t<grp.start+grp.count; t+=3) {
    const ks = [0,1,2].map(j=>key(idx?idx[t+j]:t+j));
    ks.forEach(k=>{ if(!parent.has(k)) parent.set(k,k); });
    ks.forEach(k=>{ const a=find(ks[0]), b=find(k); if(a!==b) parent.set(a,b); });
    triKeys.push(ks[0]);
  }
  const comps = new Map(); for (const k of triKeys){ const r=find(k); comps.set(r,(comps.get(r)||0)+1); }
  const sizes=[...comps.values()].sort((a,b)=>a-b);
  console.log('group mat', grp.materialIndex, 'tris', grp.count/3, 'components', comps.size, 'min/med/max', sizes[0], sizes[sizes.length>>1], sizes[sizes.length-1]);
}
