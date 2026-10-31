// Klavye/fare + dokunmatik girişi tek bir arayüzde toplar.
const KEYMAP = {
  ShiftLeft: 'sprint', ShiftRight: 'sprint', KeyF: 'block', Space: 'jump', KeyV: 'dodge', ControlLeft: 'dodge', KeyE: 'interact',
  KeyX: 'heavy', KeyI: 'inventory', Tab: 'inventory', KeyJ: 'journal', KeyQ: 'use', KeyR: 'cycle', KeyM: 'mute', KeyH: 'help',
};
export class Input {
  constructor(canvas) {
    this.canvas = canvas; this.keys = new Set(); this.held = new Set(); this.once = new Set(); this.lookDX = 0; this.lookDY = 0; this.wheel = 0;
    this.locked = false; this.enabled = false; this.touchMove = { x: 0, y: 0 }; this.rmb = false; this.onUiKey = null; this.numberKeys = [];
    addEventListener('keydown', e => {
      if (e.repeat) { if (e.code in KEYMAP || e.code.startsWith('Arrow')) e.preventDefault(); return; }
      if (this.onUiKey && this.onUiKey(e)) { e.preventDefault(); return; }
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      this.keys.add(e.code); const a = KEYMAP[e.code]; if (a) { this.held.add(a); this.once.add(a); }
      if (/^Digit[1-9]$/.test(e.code)) this.numberKeys.push(+e.code.slice(5));
    });
    addEventListener('keyup', e => { this.keys.delete(e.code); const a = KEYMAP[e.code]; if (a && !(a === 'sprint' && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'))) && !(a === 'dodge' && (this.keys.has('ControlLeft') || this.keys.has('KeyV')))) this.held.delete(a); });
    addEventListener('blur', () => { this.keys.clear(); this.held.clear(); });
    canvas.addEventListener('mousedown', e => {
      if (!this.enabled) return;
      if (!this.locked && e.button === 0 && !this.lockFailed) { this.requestLock(); return; }
      if (e.button === 0) { this.once.add('light'); } else if (e.button === 2) { this.rmb = true; if (this.locked) this.once.add('heavy'); }
    });
    addEventListener('mouseup', e => { if (e.button === 2) this.rmb = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('mousemove', e => {
      if (!this.enabled) return;
      if (this.locked) { this.lookDX += e.movementX; this.lookDY += e.movementY; }
      else if (this.rmb) { this.lookDX += e.movementX; this.lookDY += e.movementY; }
    });
    canvas.addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; this.onLockChange && this.onLockChange(this.locked); });
    document.addEventListener('pointerlockerror', () => { this.lockFailed = true; });
  }
  requestLock() { try { const p = this.canvas.requestPointerLock && this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { this.lockFailed = true; }); } catch { this.lockFailed = true; } }
  releaseLock() { if (document.pointerLockElement) document.exitPointerLock(); }
  get move() {
    let x = 0, y = 0; const k = this.keys;
    if (k.has('KeyW')) y += 1; if (k.has('KeyS')) y -= 1; if (k.has('KeyD')) x += 1; if (k.has('KeyA')) x -= 1;
    return { x: x || this.touchMove.x, y: y || this.touchMove.y };
  }
  look() { // ok tuşları da kamerayı döndürür (kilitsiz mod için)
    let dx = this.lookDX, dy = this.lookDY; this.lookDX = this.lookDY = 0; const k = this.keys;
    if (k.has('ArrowLeft')) dx -= 6; if (k.has('ArrowRight')) dx += 6; if (k.has('ArrowUp')) dy -= 4; if (k.has('ArrowDown')) dy += 4; return { dx, dy };
  }
  pressed(a) { return this.once.has(a); }
  down(a) { return this.held.has(a); }
  press(a) { this.once.add(a); }            // dokunmatik düğmeler
  setHeld(a, v) { if (v) this.held.add(a); else this.held.delete(a); }
  popWheel() { const w = this.wheel; this.wheel = 0; return w; }
  endFrame() { this.once.clear(); this.numberKeys.length = 0; }
  clear() { this.once.clear(); this.held.clear(); this.keys.clear(); this.lookDX = this.lookDY = 0; this.touchMove = { x: 0, y: 0 }; }
}
