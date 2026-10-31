import * as THREE from 'three';
import { mulberry32 } from '../core/worldgen.js';

const C = h => new THREE.Color(h);
const SKY = {
  night: { top: C(0x040815), hor: C(0x101a30) },
  dusk: { top: C(0x35467a), hor: C(0xe58a55) },
  day: { top: C(0x3a78cc), hor: C(0xa8cae6) },
  grey: { top: C(0x707a86), hor: C(0x9aa3ab) },
};
export const WEATHER_LABEL = { clear: 'Açık', cloudy: 'Bulutlu', rain: 'Yağmurlu' };

export class Environment {
  constructor(scene, renderer) {
    this.scene = scene; this.time = 0.33; this.dayLength = 600; // 10 dk'lık gün
    this.weather = 'clear'; this.cloud = 0; this.rain = 0; this.weatherTimer = 80; this.forced = false;
    this.nightFactor = 0; this.sunElev = 1;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;

    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(1, 0.9, 0.7) }, sunAmt: { value: 1 } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vDir; uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunAmt;
        void main(){ float h = clamp(vDir.y, -0.1, 1.0); vec3 c = mix(hor, top, pow(max(h,0.0), 0.55));
          float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
          c += sunCol * (pow(s, 600.0) * 2.0 + pow(s, 12.0) * 0.25) * sunAmt;
          gl_FragColor = vec4(c, 1.0); }`,
    }));
    this.sky.renderOrder = -10; this.sky.frustumCulled = false; scene.add(this.sky);

    // Yıldızlar ve ay
    const r = mulberry32(99), sp = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u); sp.set([Math.cos(a) * s * 850, Math.abs(u) * 850 + 20, Math.sin(a) * s * 850], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false; scene.add(this.stars);
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(18, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdfe6f5, fog: false })); scene.add(this.moon);

    this.sun = new THREE.DirectionalLight(0xffffff, 2); this.sun.castShadow = true;
    const sh = this.sun.shadow; sh.mapSize.set(2048, 2048); const D = 42; Object.assign(sh.camera, { left: -D, right: D, top: D, bottom: -D, near: 1, far: 220 }); sh.bias = -0.0006; sh.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x4a4030, 0.8); scene.add(this.hemi);
    scene.fog = new THREE.FogExp2(0xa8cae6, 0.004);

    // Yağmur
    const N = 1800; this.rainPos = new Float32Array(N * 6); this.rainN = N;
    for (let i = 0; i < N; i++) this._resetDrop(i, true, 0, 0, 0);
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rainMesh = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaec4d8, transparent: true, opacity: 0.0, fog: true }));
    this.rainMesh.frustumCulled = false; this.rainMesh.visible = false; scene.add(this.rainMesh);
  }
  _resetDrop(i, init, cx, cy, cz) {
    const x = cx + (Math.random() - 0.5) * 50, z = cz + (Math.random() - 0.5) * 50, y = cy + (init ? Math.random() * 25 : 18 + Math.random() * 8) - 6;
    this.rainPos.set([x, y, z, x - 0.04, y + 0.7, z + 0.02], i * 6);
  }
  setWeather(w, force = false) { this.weather = w; this.forced = force; this.weatherTimer = 80 + Math.random() * 70; }
  get hourText() { const h = (this.time * 24) % 24; return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`; }
  get isNight() { return this.nightFactor > 0.55; }

  update(dt, focus, camera) {
    this.time = (this.time + dt / this.dayLength) % 1;
    if (!this.forced) { this.weatherTimer -= dt; if (this.weatherTimer <= 0) { const r = Math.random(); this.setWeather(r < 0.5 ? 'clear' : r < 0.75 ? 'cloudy' : 'rain'); } }
    const tc = this.weather === 'clear' ? 0 : this.weather === 'cloudy' ? 0.7 : 1, tr = this.weather === 'rain' ? 1 : 0;
    this.cloud += (tc - this.cloud) * Math.min(1, dt * 0.4); this.rain += (tr - this.rain) * Math.min(1, dt * 0.3);

    const ang = (this.time - 0.25) * Math.PI * 2, e = Math.sin(ang); this.sunElev = e;
    const sunDir = new THREE.Vector3(Math.cos(ang) * 0.85, e, 0.45).normalize();
    const day = THREE.MathUtils.smoothstep(e, -0.05, 0.3), dusk = Math.max(0, 1 - Math.abs(e - 0.02) / 0.28), night = 1 - THREE.MathUtils.smoothstep(e, -0.18, 0.04);
    this.nightFactor = night;
    // Gökyüzü renkleri
    const top = SKY.night.top.clone().lerp(SKY.day.top, day).lerp(SKY.dusk.top, dusk * 0.7);
    const hor = SKY.night.hor.clone().lerp(SKY.day.hor, day).lerp(SKY.dusk.hor, dusk * 0.85);
    const grey = SKY.grey.top.clone().multiplyScalar(0.15 + 0.85 * day), greyH = SKY.grey.hor.clone().multiplyScalar(0.15 + 0.85 * day);
    top.lerp(grey, this.cloud * 0.8); hor.lerp(greyH, this.cloud * 0.85);
    const u = this.sky.material.uniforms; u.top.value.copy(top); u.hor.value.copy(hor); u.sunDir.value.copy(sunDir);
    u.sunCol.value.setRGB(1, 0.75 + 0.2 * day, 0.5 + 0.4 * day); u.sunAmt.value = (1 - this.cloud * 0.9) * (e > -0.1 ? 1 : 0);
    this.sky.position.copy(camera.position); this.stars.position.copy(camera.position);
    this.stars.material.opacity = Math.max(0, night - this.cloud * 0.8); this.stars.rotation.y = this.time * 6.28;
    this.moon.position.copy(camera.position).addScaledVector(sunDir, -700); this.moon.visible = night > 0.1 && this.cloud < 0.9; this.moon.material.opacity = 1;
    // Işık
    const dim = 1 - this.cloud * 0.55 - this.rain * 0.15;
    const moonDir = sunDir.clone().multiplyScalar(-1); moonDir.y = Math.abs(moonDir.y) * 0.8 + 0.25;
    const sunI = Math.max(0, e + 0.04) * 3.0 * dim, moonI = night * 0.4 * (1 - this.cloud * 0.6);
    const useSun = sunI >= moonI;
    const L = useSun ? sunDir : moonDir.normalize();
    this.sun.position.copy(focus).addScaledVector(L, 90); this.sun.target.position.copy(focus); this.sun.target.updateMatrixWorld();
    this.sun.intensity = Math.max(sunI, moonI); this.sun.color.setRGB(1, 0.78 + 0.22 * Math.min(1, e * 3), 0.6 + 0.4 * Math.min(1, e * 4)); if (!useSun) this.sun.color.setRGB(0.6, 0.7, 1);
    this.hemi.intensity = (0.16 + 0.75 * day) * (1 - this.cloud * 0.25) + night * 0.2 + dusk * 0.35; this.hemi.color.copy(top).lerp(new THREE.Color(1, 1, 1), 0.4); this.hemi.groundColor.setRGB(0.28, 0.24, 0.16).multiplyScalar(0.4 + day * 0.6);
    // Sis
    this.scene.fog.color.copy(hor); this.scene.fog.density = 0.0036 + this.cloud * 0.003 + this.rain * 0.007 + night * 0.0012;
    // Yağmur parçacıkları
    const rainOn = this.rain > 0.03; this.rainMesh.visible = rainOn;
    if (rainOn) {
      this.rainMesh.material.opacity = 0.45 * this.rain; const p = this.rainPos, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      for (let i = 0; i < this.rainN; i++) {
        const o = i * 6, v = 28 * dt;
        p[o + 1] -= v; p[o + 4] -= v;
        if (p[o + 1] < cy - 8 || Math.abs(p[o] - cx) > 26 || Math.abs(p[o + 2] - cz) > 26) this._resetDrop(i, false, cx, cy, cz);
      }
      this.rainMesh.geometry.attributes.position.needsUpdate = true;
      this.rainMesh.geometry.setDrawRange(0, Math.floor(this.rainN * Math.min(1, this.rain * 1.1)) * 2);
    }
  }
}
