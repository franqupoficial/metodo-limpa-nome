// Gera PNG de uma página HTML do projeto.
// node snapshot.cjs <arquivo.html> <largura> <altura> <saida.png> [consulta] [--transparente]
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const a = process.argv.slice(2); const [f, w, h, out] = a; const q = a[4] && !a[4].startsWith('--') ? a[4] : '';
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(f) + (q ? '?' + q : '')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  await p.screenshot({ path: out, clip: { x: 0, y: 0, width: +w, height: +h }, omitBackground: a.includes('--transparente') });
  if (errs.length) console.log('ERROS:', errs); await b.close();
})();
