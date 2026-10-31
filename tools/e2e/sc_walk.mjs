export default async (H) => {
  await H.eval(() => { const g = __fh.game; g.start(false); g.godMode = true; });
  const r = await H.eval(async () => {
    const g = __fh.game, P = g.player; const route = [[0,0],[-14,-20],[-34,-40],[-52,-52],[-60,-58],[-70,-66],[-76,-72]]; let steps = 0, reached = 0, stuck = 0;
    for (const [tx, tz] of route) {
      let last = 0;
      for (let i = 0; i < 1500; i++, steps++) {
        const dx = tx - P.pos.x, dz = tz - P.pos.z, d = Math.hypot(dx, dz); if (d < 2.5) { reached++; break; }
        g.cam.yaw = Math.atan2(-dx, -dz); g.input.keys.add('KeyW'); g.input.held.add('sprint');
        // kamera yaw'ı doğrudan bakış yönü: ileri = (-sin yaw, -cos yaw)
        g.step(0.033);
        if (i === 1499) stuck++;
      }
    }
    g.input.keys.clear(); g.input.held.clear();
    return { reached, of: route.length, stuck, steps, pos: [P.pos.x.toFixed(1), P.pos.z.toFixed(1)], hp: P.hp };
  });
  console.log('YÜRÜYÜŞ:', JSON.stringify(r), r.reached === r.of ? 'PASS' : 'FAIL');
};
