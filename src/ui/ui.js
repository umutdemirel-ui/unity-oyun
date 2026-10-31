import * as THREE from 'three';
import { getItem, TYPE_LABEL, isConsumable, isEquippable, sellPrice } from '../core/items.js';
import { SHOPS } from '../core/dialogue.js';
import { QUESTS } from '../core/quests.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// DOM tabanlı arayüz. Oyun mantığı game nesnesinde; burası yalnızca gösterir ve olayları iletir.
export class UI {
  constructor() {
    this.game = null; this.panel = null; this.selected = null; this.dialogue = null; this.shop = null; this.lastPause = 0; this.bars = new Map(); this.prev = {};
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => this.closePanels()));
  }
  bind(game) { this.game = game; }
  get modalOpen() { return !!this.panel || !!this.dialogue; }
  get paused() { return !$('pauseMenu').classList.contains('hidden'); }

  // ---------- HUD ----------
  update(game, camera) {
    const P = game.player, pr = game.progression, inv = game.inventory, set = (id, v) => { if (this.prev[id] !== v) { this.prev[id] = v; $(id).textContent = v; } };
    $('hpFill').style.width = (100 * P.hp / P.maxHp) + '%'; set('hpText', `${Math.ceil(P.hp)} / ${P.maxHp}`);
    $('stFill').style.width = (100 * P.stamina / P.maxStamina) + '%'; $('stFill').parentElement.classList.toggle('low', P.exhausted);
    $('xpFill').style.width = (100 * pr.xp / pr.next) + '%'; set('xpText', `${pr.xp} / ${pr.next} XP`); set('lvl', String(pr.level));
    set('gold', `🪙 ${inv.gold}`); set('clock', `${game.env.sunElev > 0 ? '☀' : '☾'} ${game.env.hourText} · ${game.weatherLabel}`);
    const w = inv.weapon(), a = inv.armor(), q = game.quickItem();
    this.slot('slotWeapon', w ? `${w.icon}` : '✊', w ? `${w.name} (${w.damage + pr.bonusDamage()})` : 'Silahsız'); this.slot('slotArmor', a ? a.icon : '👕', a ? `${a.name} (+${a.defense})` : 'Zırhsız');
    this.slot('slotQuick', q ? q.item.icon : '—', q ? `${q.item.name} ×${q.qty}` : 'Eşya yok · Q'); $('slotQuick').classList.toggle('active', !!q);
    this.tracker(game);
    this.enemyBars(game, camera);
  }
  slot(id, icon, label) { const k = icon + '|' + label; if (this.prev['s_' + id] === k) return; this.prev['s_' + id] = k; $(id).innerHTML = `<b>${esc(icon)}</b><small>${esc(label)}</small>`; }
  tracker(game) {
    const ids = game.quests.active(); const html = ids.map(id => { const d = QUESTS[id]; return `<b>${esc(d.title)}</b>` + game.quests.describe(id).map(o => `<div class="${o.complete ? 'done' : ''}">${o.complete ? '✔' : '•'} ${esc(o.text)}${o.count > 1 ? ` (${o.done}/${o.count})` : ''}</div>`).join(''); }).join('');
    if (this.prev.trk !== html) { this.prev.trk = html; $('tracker').innerHTML = html; }
  }
  enemyBars(game, camera) {
    const v = new THREE.Vector3(); const seen = new Set(); let boss = null;
    for (const e of game.enemies) {
      if (e.dead || e.removed) continue; const d = e.distTo(game.player.pos);
      if (e.boss && (e.state === 'chase' || e.state === 'attack' || e.state === 'stagger' || e.state === 'alert') && d < 50) boss = e;
      if (e.boss || d > 22 || e.state === 'patrol' && e.hp >= e.maxHp) continue;
      v.set(e.pos.x, e.pos.y + 2.2 * e.def.scale * 0.65, e.pos.z).project(camera); if (v.z > 1) continue;
      let b = this.bars.get(e); if (!b) { const el = document.createElement('div'); el.className = 'ebar'; el.innerHTML = '<i></i>'; $('enemyBars').appendChild(el); b = { el, fill: el.firstChild }; this.bars.set(e, b); }
      b.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth - 27}px, ${(-v.y * 0.5 + 0.5) * innerHeight}px)`; b.fill.style.width = (100 * e.hp / e.maxHp) + '%'; seen.add(e); b.el.style.display = '';
    }
    for (const [e, b] of this.bars) if (!seen.has(e)) { if (e.removed || e.dead) { b.el.remove(); this.bars.delete(e); } else b.el.style.display = 'none'; }
    $('bossbar').classList.toggle('hidden', !boss); if (boss) { $('bossName').textContent = boss.def.name.toUpperCase(); $('bossFill').style.width = (100 * boss.hp / boss.maxHp) + '%'; }
  }
  setPrompt(html) { const el = $('prompt'); if (!html) { el.classList.add('hidden'); this.prev.prompt = null; return; } if (this.prev.prompt !== html) { this.prev.prompt = html; el.innerHTML = html; } el.classList.remove('hidden'); }
  toast(msg, kind = '') { const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg; $('toasts').appendChild(el); setTimeout(() => el.remove(), 3500); while ($('toasts').children.length > 5) $('toasts').firstChild.remove(); }
  flashStamina() { const b = $('stFill').parentElement; b.style.outline = '2px solid #e0553f'; clearTimeout(this._fs); this._fs = setTimeout(() => { b.style.outline = ''; }, 250); }
  hurtVignette() { const h = $('hurt'); h.style.transition = 'none'; h.style.opacity = '1'; requestAnimationFrame(() => { h.style.transition = 'opacity .5s'; h.style.opacity = '0'; }); }
  region(name) { const el = $('region'); el.textContent = name; el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; clearTimeout(this._rg); this._rg = setTimeout(() => el.classList.add('hidden'), 4000); }
  showHUD(on) { $('hud').classList.toggle('hidden', !on); }

  // ---------- Paneller ----------
  closePanels() {
    for (const id of ['invPanel', 'journalPanel', 'shopPanel', 'helpPanel']) $(id).classList.add('hidden');
    $('dialoguePanel').classList.add('hidden'); this.panel = null; this.dialogue = null; this.shop = null; this.game && this.game.onModalClosed();
  }
  _open(id, kind) { this.closePanelsSilently(); $(id).classList.remove('hidden'); this.panel = kind; this.game.onModalOpened(); }
  closePanelsSilently() { for (const id of ['invPanel', 'journalPanel', 'shopPanel', 'helpPanel']) $(id).classList.add('hidden'); $('dialoguePanel').classList.add('hidden'); this.panel = null; this.dialogue = null; this.shop = null; }
  toggle(kind) { if (this.panel === kind) this.closePanels(); else if (kind === 'inv') this.openInventory(); else if (kind === 'journal') this.openJournal(); else if (kind === 'help') this.openHelp(); }

  openInventory() { this._open('invPanel', 'inv'); this.selected = null; this.renderInventory(); }
  renderInventory() {
    const g = this.game, inv = g.inventory, grid = $('invGrid'); grid.innerHTML = '';
    for (let i = 0; i < inv.capacity; i++) {
      const s = inv.slots[i]; const b = document.createElement('button'); b.className = 'cell' + (this.selected === i ? ' sel' : '');
      if (s) { const it = getItem(s.id); b.innerHTML = `${esc(it.icon)}<span class="nm">${esc(it.name.split(' ').pop())}</span>${s.qty > 1 ? `<span class="q">${s.qty}</span>` : ''}`; b.title = it.name; b.onclick = () => { this.selected = i; this.renderInventory(); }; } else b.disabled = true;
      grid.appendChild(b);
    }
    $('invGold').textContent = `🪙 ${inv.gold}`;
    for (const [slot, id] of [['weapon', 'eqWeapon'], ['armor', 'eqArmor']]) {
      const it = getItem(inv.equipment[slot]); const el = $(id); el.innerHTML = it ? `<div style="font-size:26px">${esc(it.icon)}</div>${esc(it.name)}<br><small>${it.damage ? 'Hasar ' + it.damage : 'Savunma ' + it.defense} · çıkarmak için tıkla</small>` : `<small>${slot === 'weapon' ? 'Silah' : 'Zırh'} yok</small>`;
      el.onclick = () => { if (it) { const r = inv.unequip(slot); if (!r.ok) this.toast(r.reason, 'warn'); else g.onEquipmentChanged(); this.renderInventory(); } };
    }
    const pr = g.progression, w = inv.weapon(), a = inv.armor();
    $('invStats').innerHTML = `Seviye <b>${pr.level}</b> · Can <b>${Math.ceil(g.player.hp)}/${g.player.maxHp}</b> · Dayanıklılık <b>${g.player.maxStamina}</b><br>Saldırı <b>${(w?.damage ?? 4) + pr.bonusDamage()}</b> · Savunma <b>${a?.defense ?? 0}</b>`;
    const s = inv.slots[this.selected], d = $('invDetail');
    if (!s) { d.textContent = 'Bir eşya seç.'; return; }
    const it = getItem(s.id); const stat = it.damage ? `Hasar ${it.damage} · Menzil ${it.reach}` : it.defense ? `Savunma ${it.defense}` : it.heal ? `Can +${it.heal}` : it.stamina ? 'Dayanıklılığı doldurur' : '';
    d.innerHTML = `<h3>${esc(it.icon)} ${esc(it.name)}</h3><div class="tag">${TYPE_LABEL[it.type]} · değer ${it.value} 🪙</div><p>${esc(it.desc)}</p><div>${stat}</div><div class="row"></div>`;
    const row = d.querySelector('.row');
    const mk = (t, fn, dis) => { const b = document.createElement('button'); b.textContent = t; b.disabled = !!dis; b.onclick = fn; row.appendChild(b); };
    if (isConsumable(it)) mk('Kullan', () => { g.useItem(s.id); this.renderInventory(); });
    if (isEquippable(it)) mk('Kuşan', () => { g.equipItem(s.id); this.selected = null; this.renderInventory(); });
    mk('At', () => { if (it.type === 'quest') this.toast('Görev eşyası atılamaz', 'warn'); else { inv.remove(s.id, 1); if (!inv.slots[this.selected]) this.selected = null; g.onInventoryChanged(); this.renderInventory(); } }, it.type === 'quest');
  }
  openJournal() {
    this._open('journalPanel', 'journal'); const g = this.game; let html = '';
    for (const [id, d] of Object.entries(QUESTS)) {
      const st = g.quests.status(id); if (st === 'available') continue;
      html += `<h3>${esc(d.title)} <span class="tag">(${{ active: 'Aktif', ready: 'Teslim edilebilir', completed: 'Tamamlandı' }[st]})</span></h3><div class="tag">${esc(d.summary)}</div>`;
      html += g.quests.describe(id).map(o => `<div class="obj ${o.complete ? 'done' : ''}">${o.complete ? '✔' : '○'} ${esc(o.text)}${o.count > 1 ? ` (${o.done}/${o.count})` : ''}</div>`).join('');
      if (st === 'ready') html += `<div class="obj">➜ Köy ihtiyarı Maren’e dön.</div>`;
      if (st !== 'completed') { const r = d.reward; html += `<div class="tag" style="margin-top:4px">Ödül: ${r.xp} XP, ${r.gold} 🪙, ${r.items.map(i => getItem(i.id).name + (i.qty > 1 ? ' ×' + i.qty : '')).join(', ')}</div>`; }
    }
    $('journalBody').innerHTML = html || '<p class="muted">Henüz görev yok. Köydeki insanlarla konuş (E).</p>';
  }
  openHelp() {
    this._open('helpPanel', 'help');
    $('helpBody').innerHTML = `<b>Hedef:</b> Maren ile konuş, Gözcü Yolu’ndaki goblinleri ve Yosun Trolü’nü yen, mührü köye getir.<br>
      <b>Savaş:</b> Hafif saldırı hızlı, ağır saldırı güçlü ama yavaştır. Blok (F) hasarı azaltır; saldırı tam vurmadan hemen önce bloklarsan savuşturursun. Kaçış (V/Ctrl) kısa süre dokunulmaz yapar. Her eylem dayanıklılık harcar.<br>
      <b>Kayıt:</b> Otomatik (30 sn ve önemli olaylarda) + Esc menüsünden elle. Tarayıcı depolaması (localStorage) kullanılır.<br>
      <b>Ekonomi:</b> Demirci Torin’den alışveriş yap; goblin dişi vb. malzemeleri satabilirsin.<br><b>Not:</b> At/binek sistemi ilk sürümde ertelenmiştir.`;
  }
  openDialogue(node, onChoice) {
    this.closePanelsSilently(); this.dialogue = { node, onChoice }; $('dialoguePanel').classList.remove('hidden'); this.game.onModalOpened(); this.renderDialogue();
  }
  renderDialogue() {
    const { node, onChoice } = this.dialogue; $('dlgWho').textContent = node.speaker; $('dlgText').textContent = node.text; const c = $('dlgChoices'); c.innerHTML = '';
    node.choices.forEach((ch, i) => { const b = document.createElement('button'); b.textContent = `${i + 1}. ${ch.text}`; b.onclick = () => onChoice(ch); c.appendChild(b); });
    this.game.audio.talk();
  }
  dialogueKey(n) { if (!this.dialogue) return false; const ch = this.dialogue.node.choices[n - 1]; if (ch) this.dialogue.onChoice(ch); return true; }
  setDialogueNode(node) { this.dialogue.node = node; this.renderDialogue(); }
  openShop(shopId) {
    this._open('shopPanel', 'shop'); this.shop = shopId; this.renderShop();
  }
  renderShop() {
    const g = this.game, def = SHOPS[this.shop], inv = g.inventory; $('shopName').textContent = def.name; $('shopGold').textContent = `🪙 ${inv.gold}`;
    const buy = $('shopBuy'); buy.innerHTML = '';
    for (const id of def.stock) { const it = getItem(id); const row = document.createElement('div'); row.className = 'shoprow'; row.innerHTML = `<span>${esc(it.icon)}</span><span class="n">${esc(it.name)}<br><small>${esc(it.damage ? 'Hasar ' + it.damage : it.defense ? 'Savunma ' + it.defense : it.desc)}</small></span><span>${it.value} 🪙</span>`;
      const b = document.createElement('button'); b.textContent = 'Al'; b.disabled = inv.gold < it.value || !inv.canAdd(id); b.onclick = () => { g.buyItem(id); this.renderShop(); }; row.appendChild(b); buy.appendChild(row); }
    const sell = $('shopSell'); sell.innerHTML = '';
    const seen = new Set();
    for (const s of inv.slots) { if (seen.has(s.id)) continue; seen.add(s.id); const it = getItem(s.id); if (it.type === 'quest') continue; const row = document.createElement('div'); row.className = 'shoprow';
      row.innerHTML = `<span>${esc(it.icon)}</span><span class="n">${esc(it.name)} ×${inv.count(s.id)}</span><span>${sellPrice(it)} 🪙</span>`; const b = document.createElement('button'); b.textContent = 'Sat'; b.onclick = () => { g.sellItem(s.id); this.renderShop(); }; row.appendChild(b); sell.appendChild(row); }
    if (!sell.children.length) sell.innerHTML = '<div class="muted">Satılacak eşya yok.</div>';
  }
  showPause(on, info = '') { $('pauseMenu').classList.toggle('hidden', !on); $('pInfo').textContent = info; $('pMute').textContent = this.game && this.game.audio.muted ? 'Sesi aç' : 'Sesi kapat'; }
  showDeath(on) { $('deathScreen').classList.toggle('hidden', !on); }
  showStart(on, { hasSave = false, msg = '' } = {}) { $('startScreen').classList.toggle('hidden', !on); $('btnContinue').disabled = !hasSave; $('loadMsg').textContent = msg; }
}
