export default async (H) => {
  await H.eval(() => { const g = __fh.game; g.start(false); });
  console.log('touch-ui:', await H.eval(() => document.body.classList.contains('touch-ui') + ' buttons=' + document.querySelectorAll('#touch .tb').length));
  await H.sim(5); await H.shot('/tmp/touch.png');
  // joystick sürükle
  const box = await H.page.$eval('#touch .joy', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const cdp = await H.page.createCDPSession();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x, y: box.y - 55 }] });
  const mv = await H.eval(() => JSON.stringify(__fh.game.input.touchMove)); console.log('joystick move:', mv);
  const p0 = await H.eval(() => __fh.game.z); await H.sim(30); const p1 = await H.eval(() => __fh.game.z);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  console.log('joystick yürütme: z', p0.toFixed(2), '->', p1.toFixed(2), p0 !== p1 ? 'PASS' : 'FAIL');
};
