// Renderiza o episódio em MP4 1920x1080 (vídeo quadro a quadro + trilha sintetizada) e gera legendas .srt e a música do tema.
// Uso: node FERRAMENTAS/render_episodio.cjs EPISODIO_01/episodio01.html EPISODIO_01/saida.mp4 [--fps 30] [--sem-legendas]
const { chromium } = require('playwright'); const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path');
const a = process.argv.slice(2); const page = path.resolve(a[0]); const out = path.resolve(a[1]);
const fps = a.includes('--fps') ? +a[a.indexOf('--fps') + 1] : 30; const caps = !a.includes('--sem-legendas');
const run = (cmd, args, w) => new Promise((res, rej) => { const p = spawn(cmd, args, { stdio: [w ? 'pipe' : 'ignore', 'ignore', 'pipe'] }); let e = ''; p.stderr.on('data', d => e += d); p.on('close', c => c ? rej(new Error(e.slice(-1500))) : res()); if (w) w(p.stdin); });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + page + '?render=1' + (caps ? '' : '&caps=0')); await p.waitForFunction(() => window.EP); await p.evaluate(() => window.EP.ready); await p.waitForTimeout(400);
  const D = await p.evaluate(() => window.EP.D);
  const base = out.replace(/\.mp4$/, '');
  fs.writeFileSync(base + '.srt', await p.evaluate(() => window.EP.srt()));
  const wav = base + '.tmp.wav'; fs.writeFileSync(wav, Buffer.from(await p.evaluate(() => window.EP.renderAudioWav()), 'base64'));
  const vid = base + '.tmp.mp4'; const n = Math.round(D * fps); const t0 = Date.now();
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', vid], async st => {
    for (let i = 0; i < n; i++) { await p.evaluate(t => window.EP.renderAt(t), i / fps); const buf = await p.screenshot({ type: 'jpeg', quality: 92 }); if (!st.write(buf)) await new Promise(r => st.once('drain', r)); if (i % (fps * 10) === 0) console.log(`${(i / fps).toFixed(0)}s / ${D}s`); }
    st.end(); });
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', vid, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  fs.unlinkSync(vid); fs.renameSync(wav, base + '_trilha.wav');
  console.log(`ok → ${out} (${((Date.now() - t0) / 1000).toFixed(0)}s)`); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
