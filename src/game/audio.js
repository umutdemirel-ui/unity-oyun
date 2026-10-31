// Tamamen WebAudio ile sentezlenen ses: depoda ses varlığı yok, bu yüzden dış dosya kullanılmaz.
export class GameAudio {
  constructor() { this.ctx = null; this.muted = false; this.master = null; this.birdT = 2; this.cricketGain = null; this.rainGain = null; this.windGain = null; this.stepT = 0; }
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC(); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7; this.master.connect(ctx.destination);
    // gürültü tamponu
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    const loopNoise = (type, freq, q) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(this.master); s.start(); return { g, f }; };
    const wind = loopNoise('lowpass', 420, 0.7); this.windGain = wind.g; this.windFilter = wind.f;
    this.rainGain = loopNoise('highpass', 2200, 0.3).g;
    // cırcır böceği: genlik modülasyonlu yüksek ton
    const o = ctx.createOscillator(); o.frequency.value = 4300; const am = ctx.createOscillator(); am.frequency.value = 14; const amg = ctx.createGain(); amg.gain.value = 0.5; am.connect(amg);
    const cg = ctx.createGain(); cg.gain.value = 0; const base = ctx.createGain(); base.gain.value = 0.5; amg.connect(base.gain); o.connect(base); base.connect(cg); cg.connect(this.master); o.start(); am.start(); this.cricketGain = cg;
  }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.7; return this.muted; }
  // ortam: gündüz/gece/yağmur seviyelerine göre
  ambient(dt, { night, rain, cloud, inVillage }) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(0.05 + cloud * 0.07 + rain * 0.03, t, 0.5); this.windFilter.frequency.setTargetAtTime(350 + cloud * 300, t, 0.5);
    this.rainGain.gain.setTargetAtTime(rain * 0.06, t, 0.5); this.cricketGain.gain.setTargetAtTime(night * (1 - rain) * 0.012, t, 1.0);
    this.birdT -= dt; if (this.birdT <= 0) { this.birdT = 2 + Math.random() * 5; if (night < 0.4 && rain < 0.3) this.bird(); }
  }
  bird() {
    const ctx = this.ctx, t0 = ctx.currentTime, n = 2 + Math.floor(Math.random() * 3), base = 2200 + Math.random() * 1500;
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; const st = t0 + i * 0.12;
      o.frequency.setValueAtTime(base, st); o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), st + 0.08);
      g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.025, st + 0.02); g.gain.exponentialRampToValueAtTime(0.0005, st + 0.1); o.connect(g); g.connect(this.master); o.start(st); o.stop(st + 0.12);
    }
  }
  _noise(dur, freq, q, vol, type = 'bandpass', sweepTo = null) {
    if (!this.ctx) return; const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noiseBuf; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(ctx.currentTime, Math.random()); s.stop(ctx.currentTime + dur);
  }
  _tone(freq, dur, vol, type = 'sine', slide = null, delay = 0) {
    if (!this.ctx) return; const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + delay; o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  swing(heavy) { this._noise(heavy ? 0.3 : 0.18, 900, 1.2, heavy ? 0.35 : 0.22, 'bandpass', heavy ? 300 : 500); }
  hit(heavy) { this._noise(0.12, 300, 0.8, 0.5, 'lowpass'); this._tone(heavy ? 90 : 130, 0.14, 0.5, 'triangle', 50); }
  hurt() { this._tone(180, 0.22, 0.4, 'sawtooth', 70); this._noise(0.1, 500, 1, 0.3, 'lowpass'); }
  block() { this._tone(1600, 0.18, 0.25, 'square', 1200); this._tone(2400, 0.1, 0.12, 'sine'); }
  dodge() { this._noise(0.25, 600, 0.6, 0.15, 'highpass', 2500); }
  step(surface = 'grass', rate = 1) { this._noise(0.07, surface === 'water' ? 900 : 260 + Math.random() * 120, 1.5, surface === 'water' ? 0.18 : 0.12, surface === 'water' ? 'highpass' : 'lowpass'); }
  jump() { this._tone(220, 0.12, 0.1, 'sine', 330); }
  pickup() { this._tone(880, 0.1, 0.18, 'sine'); this._tone(1320, 0.15, 0.15, 'sine', null, 0.07); }
  coin() { this._tone(1400, 0.08, 0.14, 'square'); this._tone(2100, 0.2, 0.1, 'square', null, 0.06); }
  levelUp() { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.35, 0.2, 'triangle', null, i * 0.1)); }
  quest() { [392, 523, 659].forEach((f, i) => this._tone(f, 0.3, 0.2, 'triangle', null, i * 0.12)); }
  talk() { this._tone(300 + Math.random() * 60, 0.06, 0.08, 'square'); }
  enemyAlert() { this._tone(140, 0.3, 0.3, 'sawtooth', 220); }
  slam() { this._tone(70, 0.5, 0.6, 'sine', 30); this._noise(0.4, 200, 0.7, 0.5, 'lowpass'); }
  die() { this._tone(200, 0.6, 0.35, 'sawtooth', 40); }
  ui() { this._tone(700, 0.05, 0.08, 'sine'); }
}
