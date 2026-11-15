// Captura quadros do episódio para revisão.  node quadros.cjs <pagina.html> <t1,t2,...> <pasta>
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const [pg, ts, dir] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(pg) + '?render=1'); await p.waitForFunction(() => window.EP); await p.evaluate(() => window.EP.ready);
  for (const t of ts.split(',').map(Number)) { await p.evaluate(t => window.EP.renderAt(t), t); await p.screenshot({ path: `${dir}/q_${String(t).replace('.', '_')}.png` }); }
  console.log('erros:', errs); await b.close();
})();
