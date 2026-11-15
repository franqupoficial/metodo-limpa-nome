/* LIZ E O MUNDO DAS DESCOBERTAS — logotipo oficial (SVG).
   logoSVG({subtitulo:true}) devolve um <g> centrado em (0,0), ~900 x 560.
   Requer a fonte Fredoka (Google Fonts) carregada na página. */
(function (root) {
function logoDefs() {
  return `<defs>
    <linearGradient id="lg-rosa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8BC6"/><stop offset=".55" stop-color="#FF4FA0"/><stop offset="1" stop-color="#D72F80"/></linearGradient>
    <linearGradient id="lg-madeira" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2A566"/><stop offset="1" stop-color="#B9763C"/></linearGradient>
    <linearGradient id="lg-ouro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE27A"/><stop offset="1" stop-color="#F2AE1C"/></linearGradient>
    <filter id="lg-sombra" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#5A1A60" flood-opacity=".35"/></filter>
  </defs>`;
}
function estrela(x, y, r, rot = 0) {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = (i * 36 - 90 + rot) * Math.PI / 180, rr = i % 2 ? r * .48 : r; d += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1); }
  return `<path d="${d}Z" fill="url(#lg-ouro)" stroke="#E09A10" stroke-width="3" stroke-linejoin="round"/>`;
}
function folha(x, y, rot) { return `<path transform="translate(${x} ${y}) rotate(${rot})" d="M0 0 C 14 -22 40 -22 52 0 C 40 14 14 14 0 0 Z" fill="#5CC25A" stroke="#3F9A3F" stroke-width="3"/>`; }
function logoSVG(o = {}) {
  const sub = o.subtitulo !== false;
  let s = `<g class="logo" filter="url(#lg-sombra)">`;
  if (sub) {
    s += `<g transform="translate(0 150)">
      <path d="M-380 -86 Q -390 -96 -370 -100 L 370 -110 Q 392 -110 390 -88 L 400 80 Q 402 104 378 104 L -372 112 Q -398 112 -396 88 Z" fill="url(#lg-madeira)" stroke="#8C5226" stroke-width="7" stroke-linejoin="round"/>
      <path d="M-350 -56 Q 0 -70 350 -64 M-350 28 Q 0 16 352 26 M-340 70 Q -100 64 120 70" stroke="#A5672F" stroke-width="3" fill="none" opacity=".55"/>
      <circle cx="-360" cy="-78" r="7" fill="#8C5226"/><circle cx="362" cy="-86" r="7" fill="#8C5226"/><circle cx="-358" cy="86" r="7" fill="#8C5226"/><circle cx="366" cy="82" r="7" fill="#8C5226"/>
      ${folha(-410, -70, -150)}${folha(-418, -40, 170)}${folha(400, 60, 20)}${folha(392, 96, -20)}
      <text x="0" y="-18" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="600" font-size="62" fill="#6A2C9E">e o Mundo das</text>
      <text x="0" y="72" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="92" fill="#6A2C9E" stroke="#fff" stroke-width="6" paint-order="stroke">Descobertas</text>
      ${estrela(-350, 100, 34, 10)}${estrela(352, -104, 30, -8)}
    </g>`;
  }
  /* "Liz" */
  s += `<g transform="translate(0 ${sub ? -60 : 0})">
    <text x="0" y="70" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="300" letter-spacing="6" fill="#7A2A72" transform="translate(6 10)">Liz</text>
    <text x="0" y="70" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="300" letter-spacing="6" fill="url(#lg-rosa)" stroke="#fff" stroke-width="16" paint-order="stroke" stroke-linejoin="round">Liz</text>
    <path d="M-150 -100 Q -110 -150 -40 -142" stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round" opacity=".6"/>
    <g transform="translate(-118 -150) rotate(-14)">
      <path d="M-62 30 L -70 -30 L -32 0 L 0 -46 L 32 0 L 70 -30 L 62 30 Z" fill="url(#lg-ouro)" stroke="#E09A10" stroke-width="5" stroke-linejoin="round"/>
      <rect x="-64" y="26" width="128" height="18" rx="8" fill="url(#lg-ouro)" stroke="#E09A10" stroke-width="5"/>
      <circle cx="0" cy="-46" r="9" fill="#FF4FA0"/><circle cx="-70" cy="-30" r="7" fill="#5FE1FF"/><circle cx="70" cy="-30" r="7" fill="#5FE1FF"/><circle cx="0" cy="12" r="8" fill="#FF4FA0"/>
    </g>
    ${estrela(210, -120, 26, 12)}${estrela(250, -60, 14, 0)}
  </g>`;
  return s + `</g>`;
}
root.LOGO = { logoDefs, logoSVG, estrela };
})(typeof window !== 'undefined' ? window : globalThis);
