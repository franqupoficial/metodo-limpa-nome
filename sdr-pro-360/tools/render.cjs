// Renderiza o animatic da SDR PRO 360 em MP4 (vídeo + trilha/sound design).
// Uso:  node sdr-pro-360/tools/render.cjs [169-60|916-60|169-15|916-15|all] [--fps 30] [--no-caps]
// Requer: Playwright (Chromium) e ffmpeg no PATH.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'videos');
const NAMES = { '169-60': '60s_16x9', '916-60': '60s_9x16', '169-15': '15s_16x9', '916-15': '15s_9x16' };

const args = process.argv.slice(2);
const which = args.find(a => !a.startsWith('--')) || 'all';
const fps = Number((args[args.indexOf('--fps') + 1]) || 30) || 30;
const caps = !args.includes('--no-caps');
const list = which === 'all' ? Object.keys(NAMES) : [which];

function run(cmd, a, stdinWriter) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, a, { stdio: [stdinWriter ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
    let err = ''; p.stderr.on('data', d => { err += d; });
    p.on('close', c => c === 0 ? res() : rej(new Error(`${cmd} saiu com ${c}\n${err.slice(-2000)}`)));
    if (stdinWriter) stdinWriter(p.stdin);
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const fmt of list) {
    const v = fmt.startsWith('916'); const W = v ? 1080 : 1920, H = v ? 1920 : 1080;
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await page.goto('file://' + path.join(ROOT, 'index.html') + `?render=1&f=${fmt}${caps ? '' : '&caps=0'}`);
    await page.waitForFunction(() => window.SDR);
    await page.evaluate(() => window.SDR.ready);
    await page.waitForTimeout(400);
    const D = await page.evaluate(k => window.SDR.duration(k), fmt);

    // 1) trilha + sound design (OfflineAudioContext, determinístico)
    const wav = path.join(OUT, `.tmp_${fmt}.wav`);
    const b64 = await page.evaluate(k => window.SDR.renderAudioWav(k), fmt);
    fs.writeFileSync(wav, Buffer.from(b64, 'base64'));

    // 2) vídeo quadro a quadro
    const tmpVideo = path.join(OUT, `.tmp_${fmt}.mp4`);
    const frames = Math.round(D * fps);
    const t0 = Date.now();
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmpVideo], async stdin => {
      for (let i = 0; i < frames; i++) {
        await page.evaluate(t => window.SDR.renderAt(t), i / fps);
        const buf = await page.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: W, height: H } });
        if (!stdin.write(buf)) await new Promise(r => stdin.once('drain', r));
        if (i % (fps * 5) === 0) process.stdout.write(`\r${fmt}: ${(i / fps).toFixed(0)}s / ${D}s`);
      }
      stdin.end();
    });

    // 3) mux
    const final = path.join(OUT, `sdr-pro-360_${NAMES[fmt]}.mp4`);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmpVideo, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final]);
    fs.unlinkSync(tmpVideo); fs.unlinkSync(wav);
    console.log(`\r${fmt}: ok → ${path.relative(process.cwd(), final)} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
