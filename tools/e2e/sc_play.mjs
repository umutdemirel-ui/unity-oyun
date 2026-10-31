export default async (H) => {
  const ok = (name, cond, extra='') => console.log(cond ? 'PASS' : 'FAIL', name, extra);
  await H.eval(() => { const g = __fh.game; g.start(false); g.env.setWeather('clear', true); });
  // --- Etkileşim + diyalog + görev kabulü ---
  await H.eval(() => { const g = __fh.game; g.player.place(-3, -3); });
  await H.sim(3);
  let r = await H.eval(() => { const g = __fh.game; return { t: g.interactTarget && g.interactTarget.label, prompt: document.getElementById('prompt').textContent }; });
  ok('etkileşim ipucu (Maren)', /Maren/.test(r.t || ''), JSON.stringify(r));
  await H.eval(() => { const g = __fh.game; g.input.press('interact'); }); await H.sim(2);
  r = await H.eval(() => { const g = __fh.game; return { open: !!g.ui.dialogue, choices: g.ui.dialogue?.node.choices.length, sim: g.simulating }; });
  ok('diyalog açıldı, sim duraklar', r.open && !r.sim, JSON.stringify(r));
  await H.eval(() => { const g = __fh.game; g.ui.dialogueKey(1); }); // Görevi kabul et
  r = await H.eval(() => { const g = __fh.game; return { st: g.quests.status('shadows_road'), dlg: !!g.ui.dialogue, text: g.ui.dialogue?.node.text.slice(0, 30) }; });
  ok('görev aktif', r.st === 'active', JSON.stringify(r));
  await H.eval(() => { __fh.game.ui.dialogueKey(1); }); await H.sim(2);
  ok('diyalog kapandı', await H.eval(() => !__fh.game.ui.dialogue));
  console.log('tracker:', await H.eval(() => document.getElementById('tracker').innerText.replace(/\n/g, ' | ')));
  // --- Torin ile alışveriş ---
  await H.eval(() => { const g = __fh.game; g.player.place(11, -9); g.inventory.addGold(50); }); await H.sim(3);
  await H.eval(() => { __fh.game.input.press('interact'); }); await H.sim(2);
  await H.eval(() => { __fh.game.ui.dialogueKey(1); });
  const shop = await H.eval(() => { const g = __fh.game; const before = g.inventory.gold; g.buyItem('health_potion'); return { before, after: g.inventory.gold, potions: g.inventory.count('health_potion'), panel: g.ui.panel }; });
  ok('dükkân: satın alma', shop.after === shop.before - 20 && shop.potions === 3, JSON.stringify(shop));
  await H.eval(() => { __fh.game.ui.closePanels(); });
  // --- Savaş: bot, gerçek kurallarla ---
  await H.eval(() => { const g = __fh.game; g.player.place(-46, -48); g.player.yaw = -2; g.cam.yaw = 1; });
  const log = await H.eval(async () => {
    const g = __fh.game; const out = { hitsTaken: 0, blocked: 0, parried: 0, alerted: false, states: new Set(), dmgDealt: 0, dead: 0, maxHpSeen: g.player.hp };
    const orig = g.player.takeHit.bind(g.player); g.player.takeHit = (d, f, o) => { const r = orig(d, f, o); if (r === 'hit') out.hitsTaken++; if (r === 'blocked') out.blocked++; if (r === 'parried') out.parried++; return r; };
    const gobs = g.enemies.filter(e => e.type === 'goblin');
    for (let i = 0; i < 4000 && gobs.some(e => !e.dead); i++) {
      const P = g.player; const e = g.nearestEnemy(P.pos, 40);
      if (P.hp < 40) { const q = g.quickItem(); if (q) g.useItem(q.id); }
      gobs.forEach(x => out.states.add(x.state));
      if (e) {
        const d = e.distTo(P.pos);
        if (d > 2.0) { g.input.keys.add('KeyW'); g.cam.yaw = Math.atan2(-(e.pos.x - P.pos.x), -(e.pos.z - P.pos.z)) + Math.PI + Math.PI; } else g.input.keys.delete('KeyW');
        if (d < 2.4 && P.state === 'idle') g.input.press(i % 7 === 0 ? 'heavy' : 'light');
      }
      g.step(0.033);
    }
    g.input.keys.clear();
    out.states = [...out.states]; out.dead = gobs.filter(x => x.dead).length; out.hp = g.player.hp; out.level = g.progression.level; out.xp = g.progression.xp; out.quest = g.quests.describe('shadows_road').map(o => o.done + '/' + o.count).join(' ');
    out.inv = g.inventory.slots.map(s => s.id + 'x' + s.qty).join(','); out.gold = g.inventory.gold;
    return out;
  });
  console.log('SAVAŞ:', JSON.stringify(log));
  ok('goblinler yenildi', log.dead >= 3, `dead=${log.dead}`);
  ok('düşman durumları devriye→takip→saldırı', ['patrol', 'chase', 'attack'].every(s => log.states.includes(s)), log.states.join(','));
  await H.shot('/tmp/p_combat.png');
};
