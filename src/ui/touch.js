// Dokunmatik kontroller: sol joystick, sağda saldırı/etkileşim düğmeleri, boş alanda kamera sürükleme.
// NOT: gerçek bir mobil cihazda doğrulanmadı (yalnızca masaüstü başsız tarayıcıda yerleşim kontrolü yapıldı).
export function isTouchDevice() { return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || /[?&]touch=1/.test(location.search); }

export function setupTouch(input, handlers) {
  const root = document.getElementById('touch'); root.classList.remove('hidden'); document.body.classList.add('touch-ui'); root.innerHTML = '';
  const mk = (cls, html, style) => { const el = document.createElement('div'); el.className = cls; el.innerHTML = html || ''; Object.assign(el.style, style || {}); root.appendChild(el); return el; };
  // kamera alanı
  const look = mk('look'); let lookId = null, lx = 0, ly = 0;
  look.addEventListener('pointerdown', e => { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; look.setPointerCapture(e.pointerId); });
  look.addEventListener('pointermove', e => { if (e.pointerId !== lookId) return; input.lookDX += (e.clientX - lx) * 1.4; input.lookDY += (e.clientY - ly) * 1.4; lx = e.clientX; ly = e.clientY; });
  const endLook = e => { if (e.pointerId === lookId) lookId = null; }; look.addEventListener('pointerup', endLook); look.addEventListener('pointercancel', endLook);
  // joystick
  const joy = mk('joy', '<i></i>'); const knob = joy.firstChild; let joyId = null;
  const setJoy = e => { const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    input.touchMove = { x: Math.abs(dx) < 0.12 ? 0 : dx, y: Math.abs(dy) < 0.12 ? 0 : -dy }; knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`; input.setHeld('sprint', l > 0.92); };
  joy.addEventListener('pointerdown', e => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); setJoy(e); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) setJoy(e); });
  const endJoy = e => { if (e.pointerId !== joyId) return; joyId = null; input.touchMove = { x: 0, y: 0 }; knob.style.transform = ''; input.setHeld('sprint', false); };
  joy.addEventListener('pointerup', endJoy); joy.addEventListener('pointercancel', endJoy);
  // düğmeler (sağ alt yay)
  const btn = (icon, right, bottom, { tap, hold, size } = {}) => {
    const b = mk('tb', icon, { right: right + 'px', bottom: bottom + 'px', ...(size ? { width: size + 'px', height: size + 'px' } : {}) });
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('on'); b.setPointerCapture(e.pointerId); if (tap) input.press(tap); if (hold) input.setHeld(hold, true); handlers.onTap && !tap && !hold; });
    const up = () => { b.classList.remove('on'); if (hold) input.setHeld(hold, false); }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); return b;
  };
  btn('⚔', 20, 36, { tap: 'light', size: 74 }); btn('🔨', 104, 34, { tap: 'heavy' }); btn('🛡', 22, 126, { hold: 'block' });
  btn('💨', 100, 108, { tap: 'dodge' }); btn('⤒', 170, 40, { tap: 'jump' }); btn('✋', 170, 112, { tap: 'interact' });
  const menu = (icon, right, top, fn) => { const b = mk('tb', icon, { right: right + 'px', top: top + 'px', width: '46px', height: '46px', fontSize: '18px' }); b.addEventListener('pointerdown', e => { e.preventDefault(); fn(); }); };
  menu('🎒', 12, 120, handlers.inventory); menu('📜', 66, 120, handlers.journal); menu('⏸', 120, 120, handlers.pause); menu('🧪', 12, 174, () => input.press('use'));
}
