import fs from 'node:fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
const f = process.argv[2];
const buf = fs.readFileSync(f);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
THREE.TextureLoader.prototype.load = function(){ return new THREE.Texture(); };
const loader = new FBXLoader();
const root = loader.parse(ab, '');
root.updateMatrixWorld(true);
root.traverse(o => {
  if (o.isMesh) {
    const g = o.geometry; const tri = (g.index ? g.index.count : g.attributes.position.count) / 3;
    g.computeBoundingBox();
    const s = new THREE.Vector3(); g.boundingBox.getSize(s);
    const mats = [].concat(o.material).map(m => m.name);
    console.log(o.name, 'tris', tri, 'size', s.toArray().map(v=>v.toFixed(2)).join(','), 'mats', mats.join('|'), 'scale', o.scale.toArray().join(','), 'uv', !!g.attributes.uv);
  } else console.log('node', o.type, o.name);
});
