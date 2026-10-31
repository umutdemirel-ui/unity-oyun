export default async (H) => {
  await H.eval(() => { const g = __fh.game; g.start(false); g.godMode = true; });
  // 1) Goblin kampı
  await H.eval(() => { const g = __fh.game; g.player.place(-42, -38); g.cam.yaw = 0.9; g.cam.pitch = 0.3; g.cam.init = false; g.env.time = 0.45; g.env.setWeather('clear', true); });
  await H.sim(6); await H.shot('/tmp/v_camp.png');
  // 2) Orman yolu
  await H.eval(() => { const g = __fh.game; g.player.place(-25, -22); g.cam.yaw = 2.2; g.cam.pitch = 0.2; g.cam.init = false; g.env.time = 0.3; });
  await H.sim(6); await H.shot('/tmp/v_forest.png');
  // 3) Gece + yağmur, köy
  await H.eval(() => { const g = __fh.game; g.player.place(3, 6); g.cam.yaw = 0.4; g.cam.pitch = 0.25; g.cam.init = false; g.env.time = 0.93; g.env.setWeather('rain', true); g.env.rain = 1; g.env.cloud = 1; });
  await H.sim(10); await H.shot('/tmp/v_night.png');
  console.log(await H.eval(() => JSON.stringify({ tris: __fh.game.renderer.info.render.triangles, calls: __fh.game.renderer.info.render.calls })));
};
