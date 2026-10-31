import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
// kullanım: node run.mjs <url> <senaryo.js>   — senaryo: async (page, helpers) => {...}
const [url, scenario] = process.argv.slice(2);
const browser = await puppeteer.launch({ protocolTimeout: 600000, args: [...chromium.args, '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'], executablePath: await chromium.executablePath(), headless: 'shell', defaultViewport: { width: +(process.env.VW||800), height: +(process.env.VH||450), hasTouch: process.env.TOUCH==='1', isMobile: process.env.TOUCH==='1' } });
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (!/AudioContext|vite\]/.test(t)) console.log('[console]', m.type(), t); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction('document.body.dataset.ready==="1"', { timeout: 120000 });
const H = {
  eval: (fn, ...a) => page.evaluate(fn, ...a),
  sim: (n, dt = 0.033) => page.evaluate((n, dt) => { const g = __fh.game; for (let i = 0; i < n; i++) g.step(dt); }, n, dt),
  shot: async (name) => { await page.evaluate(() => { __fh.game.render(); }); await page.screenshot({ path: name, timeout: 120000 }); console.log('shot', name); },
  page,
};
const mod = await import(scenario); await mod.default(H);
await browser.close();
