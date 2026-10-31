export default async (H) => {
  const ok = (name, cond, extra='') => console.log(cond ? 'PASS' : 'FAIL', name, extra);
  await H.eval(() => { const g = __fh.game; localStorage.clear(); g.start(false); g.env.setWeather('clear', true); g.quests.start('shadows_road'); g.quests.notify('kill','goblin'); g.quests.notify('kill','goblin'); g.quests.notify('kill','goblin'); g.quests.notify('kill','goblin'); g.progression.addXp(100); g.player.hp = g.player.maxHp; g.player.place(-66, -66); g.player.yaw = -2; });
  const log = await H.eval(async () => {
    const g = __fh.game, P = g.player; const out = { res: {}, states: new Set(), slams: 0, time: 0 };
    const orig = P.takeHit.bind(P); P.takeHit = (d, f, o) => { const r = orig(d, f, o); out.res[r + (o && o.slam ? '_slam' : '')] = (out.res[r + (o && o.slam ? '_slam' : '')] || 0) + 1; return r; };
    const boss = g.enemies.find(e => e.boss); out.bossHp0 = boss.hp;
    let minHp = 999;
    for (let i = 0; i < 6000 && !boss.dead && !P.dead; i++) {
      const d = boss.distTo(P.pos); out.states.add(boss.state);
      if (P.hp < 45) { const q = g.quickItem(); if (q) g.useItem(q.id); }
      g.cam.yaw = Math.atan2(-(boss.pos.x - P.pos.x), -(boss.pos.z - P.pos.z));
      const winding = boss.state === 'attack' && boss.attack && boss.attack.phase === 'windup';
      g.input.keys.delete('KeyW'); g.input.setHeld('block', false);
      if (winding && boss.attack.slam && d < 6) { if (P.state === 'idle' && boss.attack.t > boss.attack.windup - 0.3) g.input.press('dodge'); }
      else if (winding && d < 4.5) { if (boss.attack.t > boss.attack.windup - 0.45) g.input.setHeld('block', true); }
      else if (d > 3.0) g.input.keys.add('KeyW');
      else if (d < 3.2 && P.state === 'idle' && boss.state !== 'attack') g.input.press('light');
      g.step(0.033); minHp = Math.min(minHp, P.hp);
    }
    g.input.keys.clear(); g.input.held.clear();
    out.states = [...out.states]; out.bossHp = Math.round(boss.hp); out.playerHp = Math.round(P.hp); out.playerDead = P.dead; out.minHp = Math.round(minHp); out.bossDead = boss.dead;
    return out;
  });
  console.log('BOSS:', JSON.stringify(log));
  ok('boss saldırı çeşitleri (blok/savuşturma/kaçınma/darbe)', Object.keys(log.res).length >= 2, JSON.stringify(log.res));
  ok('boss hasar aldı', log.bossHp < log.bossHp0);
  // Bot ölmediyse/boss yenilmediyse zorla bitir (görev akışı testi için)
  await H.eval(() => { const g = __fh.game; const b = g.enemies.find(e => e.boss); if (!b.dead) { g.player.respawn(); b.hit(9999, { x: 0, z: 1 }, 0, true, false); } });
  await H.sim(5);
  let r = await H.eval(() => { const g = __fh.game; return { st: g.quests.status('shadows_road'), sigil: g.inventory.count('wardens_sigil'), level: g.progression.level, gold: g.inventory.gold }; });
  ok('boss yenildi → görev teslim edilebilir + mühür düştü', r.st === 'ready' && r.sigil === 1, JSON.stringify(r));
  // Maren'e teslim
  await H.eval(() => { const g = __fh.game; g.player.respawn(); g.player.place(-3, -3); }); await H.sim(3);
  await H.eval(() => { __fh.game.input.press('interact'); }); await H.sim(2);
  await H.eval(() => { __fh.game.ui.dialogueKey(1); }); // Ödülü al
  r = await H.eval(() => { const g = __fh.game; return { st: g.quests.status('shadows_road'), sigil: g.inventory.count('wardens_sigil'), iron: g.inventory.count('iron_sword'), gold: g.inventory.gold, lvl: g.progression.level, xp: g.progression.xp }; });
  ok('görev tamamlandı + ödül', r.st === 'completed' && r.sigil === 0 && r.iron === 1, JSON.stringify(r));
  await H.eval(() => { __fh.game.ui.closePanels(); __fh.game.openPause && 0; });
  // Kuşan ve kaydet
  await H.eval(() => { const g = __fh.game; g.equipItem('iron_sword'); g.save(true); });
  const saved = await H.eval(() => { const g = __fh.game; return { raw: localStorage.getItem('fellhaven.save.v1').length, weapon: g.inventory.equipment.weapon, pos: [g.x.toFixed(1), g.z.toFixed(1)], lvl: g.progression.level, gold: g.inventory.gold, hp: g.hp }; });
  console.log('KAYIT:', JSON.stringify(saved));
  await H.shot('/tmp/p_after.png');
  // Envanter paneli ekran görüntüsü
  await H.eval(() => { __fh.game.ui.openInventory(); }); await H.eval(() => { const g = __fh.game; g.ui.selected = 0; g.ui.renderInventory(); });
  await H.page.screenshot({ path: '/tmp/p_inv.png' });
  await H.eval(() => { __fh.game.ui.closePanels(); __fh.game.ui.openJournal(); }); await H.page.screenshot({ path: '/tmp/p_journal.png' });
  // Yeniden yükle ve devam et
  await H.page.reload({ waitUntil: 'load' }); await H.page.waitForFunction('document.body.dataset.ready==="1"', { timeout: 120000 });
  await H.eval(() => { __fh.game.start(true); });
  const loaded = await H.eval(() => { const g = __fh.game; return { weapon: g.inventory.equipment.weapon, pos: [g.x.toFixed(1), g.z.toFixed(1)], lvl: g.progression.level, gold: g.inventory.gold, quest: g.quests.status('shadows_road'), bossAlive: g.enemies.some(e => e.boss), spawned: g.enemies.length, defeated: g.defeated.size, hp: g.hp }; });
  console.log('YÜKLENEN:', JSON.stringify(loaded));
  ok('kayıt geri yüklendi', loaded.weapon === 'iron_sword' && loaded.quest === 'completed' && loaded.lvl === saved.lvl && loaded.gold === saved.gold && !loaded.bossAlive && loaded.spawned === 5 - loaded.defeated && loaded.pos.join() === saved.pos.join());
  // Bozuk kayıt
  await H.page.reload({ waitUntil: 'load' }); await H.page.waitForFunction('document.body.dataset.ready==="1"', { timeout: 120000 });
  await H.eval(() => { localStorage.setItem('fellhaven.save.v1', '{bozuk'); __fh.game.start(true); });
  console.log('bozuk kayıt toast:', await H.eval(() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ')));

  // Gerçek klavye olayları
  await H.page.reload({ waitUntil: 'load' }); await H.page.waitForFunction('document.body.dataset.ready==="1"', { timeout: 120000 });
  await H.eval(() => { localStorage.clear(); __fh.game.start(false); });
  await H.page.keyboard.press('KeyI'); await H.sim(1);
  ok('I envanteri açar', await H.eval(() => __fh.game.ui.panel === 'inv'));
  await H.page.keyboard.press('KeyI'); await H.page.keyboard.press('KeyJ');
  ok('J günlüğü açar', await H.eval(() => __fh.game.ui.panel === 'journal'));
  await H.page.keyboard.press('Escape'); await new Promise(r => setTimeout(r, 400));
  ok('Esc paneli kapatır', await H.eval(() => !__fh.game.ui.panel && !__fh.game.ui.paused));
  await H.page.keyboard.press('Escape'); await new Promise(r => setTimeout(r, 400));
  ok('Esc duraklatır', await H.eval(() => __fh.game.ui.paused));
  await H.page.keyboard.press('Escape'); await new Promise(r => setTimeout(r, 400));
  ok('Esc devam ettirir', await H.eval(() => !__fh.game.ui.paused));
  const before = await H.eval(() => [__fh.game.x, __fh.game.z]);
  await H.page.keyboard.down('KeyW'); await H.sim(30); await H.page.keyboard.up('KeyW');
  const after = await H.eval(() => [__fh.game.x, __fh.game.z]);
  ok('W ile yürüme', Math.hypot(after[0]-before[0], after[1]-before[1]) > 2, JSON.stringify([before, after]));
  // ölüm ekranı
  await H.sim(80); await H.eval(() => { const g = __fh.game; g.player.takeHit(9999, {x: g.x+1, z: g.z}); }); await new Promise(r => setTimeout(r, 1900));
  ok('ölüm ekranı', await H.eval(() => !document.getElementById('deathScreen').classList.contains('hidden')));
  await H.page.screenshot({ path: '/tmp/p_death.png' });
  await H.eval(() => document.getElementById('btnRespawn').click()); await H.sim(2);
  ok('yeniden doğma', await H.eval(() => { const g = __fh.game; return !g.player.dead && g.hp === g.player.maxHp && g.simulating; }));
};
