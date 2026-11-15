/* =====================================================================
   LIZ E O MUNDO DAS DESCOBERTAS — BIBLIOTECA OFICIAL DE PERSONAGENS
   Fonte única de verdade da aparência dos personagens.
   Toda cena, ficha e arte do canal desenha a partir destas funções,
   o que garante consistência visual total entre episódios.
   Coordenadas: SVG (y para baixo), origem no chão, entre os pés.
   ===================================================================== */
(function (root) {
'use strict';

/* ---------- PALETA OFICIAL ---------- */
const COR = {
  cabelo: '#C8602A', cabeloClaro: '#E8894A', cabeloEscuro: '#9A4219',
  pele: '#FFD9C4', peleSombra: '#F3B79D', bochecha: '#FF8FA6', sarda: '#D9875E',
  laco: '#FF4FA0', lacoEscuro: '#D12F7E',
  jardineira: '#FF5AA5', jardineiraEscura: '#E03C8A',
  camiseta: '#FFF0F6', botao: '#F7C744',
  iris: '#7A4724', contorno: '#4A2A1C', boca: '#8E2E35', lingua: '#FF7F8F',
  mochila: '#E8418A', mochilaEscura: '#B92A6C',
  tenis: '#FFFFFF', tenisDetalhe: '#FF7DB8',
  florPetala: '#FFFFFF', florMiolo: '#FFD23F',
  /* Pipo */
  pipoMarrom: '#C9773A', pipoMarromEscuro: '#9C5524', pipoCreme: '#FFF1DE', pipoNariz: '#2A1A14',
  coleira: '#FF4FA0', medalha: '#F7C744',
  /* Lumi */
  lumiAsa1: '#FF7BC8', lumiAsa2: '#B667F2', lumiAsaBorda: '#8B3FD1', lumiCorpo: '#FFC9A3', lumiRosto: '#FFE0C4',
  /* Robi */
  robiBranco: '#F6F9FC', robiBorda: '#C9D6E5', robiAzul: '#2D8CFF', robiTela: '#0D1626', robiBrilho: '#5FE1FF', robiMao: '#2B3445'
};

const r1 = n => Math.round(n * 10) / 10;

/* ---------- defs (gradientes e brilhos) — incluir uma vez por SVG ---------- */
function defs() {
  return `<defs>
  <radialGradient id="lz-face" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#FFE6D6"/><stop offset="1" stop-color="${COR.pele}"/></radialGradient>
  <linearGradient id="lz-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DA7236"/><stop offset="1" stop-color="${COR.cabelo}"/></linearGradient>
  <linearGradient id="lz-over" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF6DB0"/><stop offset="1" stop-color="${COR.jardineiraEscura}"/></linearGradient>
  <linearGradient id="lumi-asa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COR.lumiAsa1}"/><stop offset="1" stop-color="${COR.lumiAsa2}"/></linearGradient>
  <linearGradient id="robi-corpo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E4ECF5"/></linearGradient>
  <radialGradient id="pipo-cab" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#DA8A4C"/><stop offset="1" stop-color="${COR.pipoMarrom}"/></radialGradient>
  <filter id="brilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="brilhoForte" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="sombraSuave" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#2a1030" flood-opacity=".25"/></filter>
</defs>`;
}

/* ---------- partes reutilizáveis da Liz ---------- */
function lizCabeloTras(cx, cy, larg = 1) {
  const c = [[-118,-8,52],[-112,42,46],[-98,88,40],[118,-8,52],[112,42,46],[98,88,40],[-80,-78,62],[80,-78,62],[0,-98,72],[-132,30,40],[132,30,40],[-70,100,34],[70,100,34]];
  let s = `<g>`;
  c.forEach(([x,y,r]) => { s += `<circle cx="${r1(cx+x*larg+4)}" cy="${r1(cy+y+6)}" r="${r}" fill="${COR.cabeloEscuro}"/>`; });
  c.forEach(([x,y,r]) => { s += `<circle cx="${r1(cx+x*larg)}" cy="${r1(cy+y)}" r="${r}" fill="url(#lz-hair)"/>`; });
  return s + `</g>`;
}
function lizRabo(x, y, flip = 1) {
  const c = [[0,-14,34],[28*flip,-34,28],[46*flip,-10,24],[24*flip,6,22],[52*flip,-40,18]];
  let s = '';
  c.forEach(([dx,dy,r]) => { s += `<circle cx="${x+dx+3}" cy="${y+dy+4}" r="${r}" fill="${COR.cabeloEscuro}"/>`; });
  c.forEach(([dx,dy,r]) => { s += `<circle cx="${x+dx}" cy="${y+dy}" r="${r}" fill="url(#lz-hair)"/>`; });
  s += `<path d="M${x-10} ${y-30} q ${14*flip} -12 ${30*flip} -6" stroke="${COR.cabeloClaro}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return s;
}
function lizLaco(x, y, rot = -15) {
  return `<g transform="translate(${x} ${y}) rotate(${rot})" filter="url(#sombraSuave)">
    <path d="M0 0 C -18 -26 -52 -24 -50 0 C -52 24 -18 26 0 0 Z" fill="${COR.laco}"/>
    <path d="M0 0 C 18 -26 52 -24 50 0 C 52 24 18 26 0 0 Z" fill="${COR.laco}"/>
    <path d="M-6 2 L -22 34 L -10 30 L -4 38 Z" fill="${COR.lacoEscuro}"/>
    <path d="M6 2 L 22 34 L 10 30 L 4 38 Z" fill="${COR.lacoEscuro}"/>
    <path d="M-40 -6 Q -28 -14 -14 -6" stroke="#FF9ACB" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="0" cy="0" rx="11" ry="13" fill="${COR.lacoEscuro}"/>
    <ellipse cx="-3" cy="-4" rx="4" ry="4" fill="#FF8CC2"/>
  </g>`;
}
function lizOlho(cx, cy, o) {
  const { expr, piscar, olharX = 0, olharY = 0, lado = 1 } = o;
  const k = `stroke="${COR.contorno}" stroke-linecap="round" fill="none"`;
  if (piscar > .5 || expr === 'rindo') {
    return `<path d="M${cx-22} ${cy+2} Q ${cx} ${cy-20} ${cx+22} ${cy+2}" ${k} stroke-width="5"/>`;
  }
  const ry = expr === 'surpresa' ? 33 : 29, rx = expr === 'surpresa' ? 27 : 25;
  const ix = cx + olharX * 7, iy = cy + 3 + olharY * 6;
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" stroke="${COR.contorno}" stroke-width="3"/>
    <circle cx="${ix}" cy="${iy}" r="19" fill="${COR.iris}"/>
    <circle cx="${ix}" cy="${iy+4}" r="13" fill="#5A3016" opacity=".55"/>
    <circle cx="${ix}" cy="${iy}" r="9.5" fill="#1E0F08"/>
    <circle cx="${ix-6}" cy="${iy-8}" r="7" fill="#fff"/>
    <circle cx="${ix+7}" cy="${iy+6}" r="3" fill="#fff"/>
    <path d="M${cx+lado*16} ${cy-ry+5} l ${lado*12} -10 M${cx+lado*22} ${cy-ry+12} l ${lado*13} -6" stroke="${COR.contorno}" stroke-width="3.5" stroke-linecap="round"/>`;
}
function lizBoca(x, y, expr, falar) {
  const q = `fill="${COR.boca}"`;
  if (falar && expr !== 'surpresa') return `<path d="M${x-16} ${y-4} Q ${x} ${y+20} ${x+16} ${y-4} Q ${x} ${y+2} ${x-16} ${y-4} Z" ${q}/><ellipse cx="${x}" cy="${y+8}" rx="7" ry="4" fill="${COR.lingua}"/>`;
  switch (expr) {
    case 'surpresa': return `<ellipse cx="${x}" cy="${y+4}" rx="${falar?12:11}" ry="${falar?16:14}" ${q}/><ellipse cx="${x}" cy="${y+11}" rx="6" ry="4" fill="${COR.lingua}"/>`;
    case 'triste': return `<path d="M${x-18} ${y+8} Q ${x} ${y-8} ${x+18} ${y+8}" stroke="${COR.boca}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case 'pensativa': return `<path d="M${x-2} ${y+2} Q ${x+12} ${y-2} ${x+22} ${y+4}" stroke="${COR.boca}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case 'sorriso': return `<path d="M${x-22} ${y-4} Q ${x} ${y+16} ${x+22} ${y-4}" stroke="${COR.boca}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case 'rindo': case 'animada': default:
      return `<path d="M${x-28} ${y-6} Q ${x} ${y+34} ${x+28} ${y-6} Q ${x} ${y+2} ${x-28} ${y-6} Z" ${q}/>
        <path d="M${x-22} ${y-4} Q ${x} ${y+3} ${x+22} ${y-4} L ${x+20} ${y+2} Q ${x} ${y+8} ${x-20} ${y+2} Z" fill="#fff"/>
        <ellipse cx="${x}" cy="${y+16}" rx="12" ry="6" fill="${COR.lingua}"/>`;
  }
}
function lizSobrancelhas(expr, ox = 0) {
  const y = expr === 'surpresa' ? -378 : -366;
  const st = `stroke="${COR.cabeloEscuro}" stroke-width="6" fill="none" stroke-linecap="round"`;
  if (expr === 'triste') return `<path d="M${ox-62} ${y+4} Q ${ox-42} ${y-6} ${ox-22} ${y-8}" ${st}/><path d="M${ox+62} ${y+4} Q ${ox+42} ${y-6} ${ox+22} ${y-8}" ${st}/>`;
  if (expr === 'pensativa') return `<path d="M${ox-62} ${y} Q ${ox-42} ${y-8} ${ox-22} ${y-2}" ${st}/><path d="M${ox+22} ${y-8} Q ${ox+42} ${y-18} ${ox+62} ${y-10}" ${st}/>`;
  return `<path d="M${ox-62} ${y+2} Q ${ox-42} ${y-10} ${ox-22} ${y-2}" ${st}/><path d="M${ox+22} ${y-2} Q ${ox+42} ${y-10} ${ox+62} ${y+2}" ${st}/>`;
}
function braco(x, y, ang, lado, opts = {}) {
  const pulseira = opts.pulseira ? `<rect x="-11" y="58" width="22" height="8" rx="4" fill="${COR.laco}"/>` : '';
  const mao = opts.apontar
    ? `<circle cx="0" cy="80" r="14" fill="${COR.pele}"/><rect x="-4" y="84" width="8" height="22" rx="4" fill="${COR.pele}"/>`
    : `<circle cx="0" cy="80" r="14" fill="${COR.pele}"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${r1(ang * lado)})">
    <rect x="-10" y="4" width="20" height="74" rx="10" fill="${COR.pele}"/>
    <rect x="-10" y="4" width="7" height="70" rx="4" fill="${COR.peleSombra}" opacity=".5"/>
    ${pulseira}${mao}
    <circle cx="0" cy="0" r="21" fill="${COR.camiseta}" stroke="#F4CFE0" stroke-width="2"/>
  </g>`;
}

/* ---------- LIZ — VISTA FRONTAL ---------- */
/* o: {expr, falar, piscar, olharX, olharY, bracoE, bracoD, apontar, pulo, inclinar, sombra} */
function liz(o = {}) {
  const expr = o.expr || 'feliz', falar = !!o.falar, piscar = o.piscar || 0;
  const aE = o.bracoE ?? 14, aD = o.bracoD ?? 14, pulo = o.pulo || 0, incl = o.inclinar || 0;
  const H = -330;
  let s = `<g class="liz">`;
  if (o.sombra !== false) s += `<ellipse cx="0" cy="0" rx="${r1(92 - pulo * .15)}" ry="13" fill="#000" opacity="${r1(.18 - pulo * .0006)}"/>`;
  s += `<g transform="translate(0 ${-pulo})">`;
  /* cabelo de trás */
  s += `<g transform="rotate(${incl} 0 -245)">${lizCabeloTras(0, H)}</g>`;
  /* mochila (aparece nas laterais) */
  s += `<rect x="-82" y="-240" width="164" height="138" rx="34" fill="${COR.mochila}"/><rect x="-82" y="-150" width="164" height="14" fill="${COR.mochilaEscura}" opacity=".5"/>`;
  /* pernas e tênis */
  s += `<rect x="-31" y="-82" width="21" height="66" rx="10" fill="${COR.pele}"/><rect x="10" y="-82" width="21" height="66" rx="10" fill="${COR.pele}"/>`;
  s += `<rect x="-33" y="-40" width="25" height="10" rx="5" fill="#FFFFFF"/><rect x="8" y="-40" width="25" height="10" rx="5" fill="#FFFFFF"/>`;
  [-22, 22].forEach(x => { s += `<ellipse cx="${x + (x < 0 ? -4 : 4)}" cy="-12" rx="27" ry="15" fill="${COR.tenis}" stroke="#EBC6D7" stroke-width="2"/><path d="M${x - 20 + (x<0?-4:4)} -12 h 40" stroke="${COR.tenisDetalhe}" stroke-width="5" stroke-linecap="round"/><ellipse cx="${x + (x<0?-4:4)}" cy="-3" rx="27" ry="5" fill="${COR.tenisDetalhe}" opacity=".6"/>`; });
  /* camiseta + jardineira */
  s += `<rect x="-14" y="-262" width="28" height="26" rx="8" fill="${COR.peleSombra}"/>`;
  s += `<rect x="-60" y="-244" width="120" height="112" rx="42" fill="${COR.camiseta}"/>`;
  s += `<path d="M-62 -152 L62 -152 L67 -86 Q67 -72 54 -72 L9 -72 L5 -92 L-5 -92 L-9 -72 L-54 -72 Q-67 -72 -67 -86 Z" fill="url(#lz-over)"/>`;
  s += `<rect x="-42" y="-208" width="84" height="74" rx="16" fill="url(#lz-over)"/>`;
  s += `<path d="M-34 -204 L-50 -240 M34 -204 L50 -240" stroke="${COR.jardineira}" stroke-width="13" stroke-linecap="round"/>`;
  s += `<path d="M-58 -238 L-60 -170 M58 -238 L60 -170" stroke="${COR.mochilaEscura}" stroke-width="10" stroke-linecap="round" opacity=".9"/>`;
  s += `<circle cx="-30" cy="-198" r="7" fill="${COR.botao}" stroke="#D9A21E" stroke-width="2"/><circle cx="30" cy="-198" r="7" fill="${COR.botao}" stroke="#D9A21E" stroke-width="2"/>`;
  for (let i = 0; i < 5; i++) { const a = i * 72 * Math.PI / 180; s += `<ellipse cx="${r1(Math.sin(a) * 12)}" cy="${r1(-168 - Math.cos(a) * 12)}" rx="8" ry="10" transform="rotate(${i * 72} ${r1(Math.sin(a) * 12)} ${r1(-168 - Math.cos(a) * 12)})" fill="${COR.florPetala}"/>`; }
  s += `<circle cx="0" cy="-168" r="7.5" fill="${COR.florMiolo}"/>`;
  s += `<path d="M-50 -110 v 22 M50 -110 v 22" stroke="${COR.jardineiraEscura}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
  /* braços */
  s += braco(-57, -226, aE, 1, { apontar: o.apontarE });
  s += braco(57, -226, aD, -1, { pulseira: true, apontar: o.apontarD });
  /* cabeça */
  s += `<g transform="rotate(${incl} 0 -245)">`;
  s += `<ellipse cx="-108" cy="-318" rx="16" ry="20" fill="${COR.pele}"/><ellipse cx="108" cy="-318" rx="16" ry="20" fill="${COR.pele}"/>`;
  s += `<circle cx="-110" cy="-300" r="3.5" fill="${COR.botao}"/><circle cx="110" cy="-300" r="3.5" fill="${COR.botao}"/>`;
  s += `<ellipse cx="0" cy="-325" rx="108" ry="102" fill="url(#lz-face)"/>`;
  /* cachos laterais */
  [[-1],[1]].forEach(([d]) => { [[112,-296,26],[118,-258,22],[108,-224,18]].forEach(([x,y,r]) => { s += `<circle cx="${x*d}" cy="${y}" r="${r}" fill="url(#lz-hair)"/>`; }); });
  /* franja */
  s += `<path d="M-112 -330 Q -112 -446 0 -446 Q 112 -446 112 -330 Q 92 -380 58 -364 Q 34 -404 4 -374 Q -26 -406 -52 -366 Q -86 -392 -112 -330 Z" fill="url(#lz-hair)"/>`;
  s += `<path d="M-70 -420 Q -40 -440 -6 -432 M24 -432 Q 56 -430 80 -408" stroke="${COR.cabeloClaro}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  s += lizRabo(76, -452, 1);
  s += lizLaco(40, -442, -15);
  /* rosto */
  s += lizSobrancelhas(expr);
  s += lizOlho(-40, -322, { expr, piscar, olharX: o.olharX || 0, olharY: o.olharY || 0, lado: -1 });
  s += lizOlho(40, -322, { expr, piscar, olharX: o.olharX || 0, olharY: o.olharY || 0, lado: 1 });
  s += `<ellipse cx="-70" cy="-280" rx="20" ry="12" fill="${COR.bochecha}" opacity=".55"/><ellipse cx="70" cy="-280" rx="20" ry="12" fill="${COR.bochecha}" opacity=".55"/>`;
  [[-78,-292],[-66,-296],[-72,-284],[78,-292],[66,-296],[72,-284]].forEach(([x,y]) => { s += `<circle cx="${x}" cy="${y}" r="2.2" fill="${COR.sarda}" opacity=".8"/>`; });
  s += `<ellipse cx="0" cy="-292" rx="8" ry="6" fill="${COR.peleSombra}"/><ellipse cx="-2" cy="-294" rx="3" ry="2" fill="#fff" opacity=".7"/>`;
  s += lizBoca(0, -266, expr, falar);
  s += `</g></g></g>`;
  return s;
}

/* ---------- LIZ — VISTA LATERAL (olhando para a direita) ---------- */
function lizLado(o = {}) {
  const expr = o.expr || 'sorriso', falar = !!o.falar, pulo = o.pulo || 0, ang = o.braco ?? 10, passo = o.passo || 0;
  let s = `<g class="liz-lado"><ellipse cx="0" cy="0" rx="78" ry="12" fill="#000" opacity=".16"/><g transform="translate(0 ${-pulo})">`;
  /* cabelo de trás */
  [[-60,-300,64],[-50,-240,48],[-80,-350,58],[-20,-410,62],[-95,-280,40],[-70,-220,36]].forEach(([x,y,r]) => { s += `<circle cx="${x+3}" cy="${y+5}" r="${r}" fill="${COR.cabeloEscuro}"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#lz-hair)"/>`; });
  s += lizRabo(-70, -452, -1);
  /* mochila */
  s += `<rect x="-80" y="-236" width="44" height="128" rx="18" fill="${COR.mochila}"/><rect x="-86" y="-190" width="20" height="50" rx="8" fill="${COR.mochilaEscura}"/>`;
  /* pernas (com passo) */
  const p1 = Math.sin(passo) * 14, p2 = -p1;
  s += `<g transform="rotate(${r1(p2)} 0 -82)"><rect x="-10" y="-82" width="20" height="66" rx="10" fill="${COR.peleSombra}"/><ellipse cx="10" cy="-12" rx="28" ry="14" fill="${COR.tenis}" stroke="#EBC6D7" stroke-width="2"/><path d="M-10 -12 h 38" stroke="${COR.tenisDetalhe}" stroke-width="5" stroke-linecap="round"/></g>`;
  s += `<g transform="rotate(${r1(p1)} 0 -82)"><rect x="-10" y="-82" width="20" height="66" rx="10" fill="${COR.pele}"/><ellipse cx="10" cy="-12" rx="28" ry="14" fill="${COR.tenis}" stroke="#EBC6D7" stroke-width="2"/><path d="M-10 -12 h 38" stroke="${COR.tenisDetalhe}" stroke-width="5" stroke-linecap="round"/></g>`;
  /* tronco */
  s += `<rect x="-12" y="-262" width="24" height="26" rx="8" fill="${COR.peleSombra}"/>`;
  s += `<rect x="-42" y="-244" width="84" height="112" rx="36" fill="${COR.camiseta}"/>`;
  s += `<path d="M-44 -152 L44 -152 L46 -86 Q46 -72 34 -72 L-32 -72 Q-46 -72 -46 -86 Z" fill="url(#lz-over)"/>`;
  s += `<rect x="-6" y="-208" width="46" height="74" rx="14" fill="url(#lz-over)"/>`;
  s += `<path d="M10 -204 L-6 -240" stroke="${COR.jardineira}" stroke-width="13" stroke-linecap="round"/><circle cx="14" cy="-198" r="7" fill="${COR.botao}"/>`;
  for (let i = 0; i < 5; i++) { const a = i * 72 * Math.PI / 180; s += `<ellipse cx="${r1(22 + Math.sin(a) * 9)}" cy="${r1(-168 - Math.cos(a) * 9)}" rx="6" ry="8" transform="rotate(${i*72} ${r1(22 + Math.sin(a) * 9)} ${r1(-168 - Math.cos(a) * 9)})" fill="#fff"/>`; }
  s += `<circle cx="22" cy="-168" r="6" fill="${COR.florMiolo}"/>`;
  s += braco(0, -226, ang, -1, { pulseira: true });
  /* cabeça */
  s += `<circle cx="10" cy="-325" r="104" fill="url(#lz-face)"/>`;
  s += `<path d="M106 -312 Q 124 -302 108 -290" fill="${COR.pele}" stroke="${COR.peleSombra}" stroke-width="3"/>`;
  s += `<path d="M112 -350 Q 104 -444 4 -444 Q -108 -440 -112 -330 Q -110 -268 -78 -242 L -38 -292 Q -30 -334 -8 -360 Q 30 -372 52 -356 Q 74 -392 112 -350 Z" fill="url(#lz-hair)"/>`;
  s += `<path d="M-60 -414 Q -20 -440 30 -430" stroke="${COR.cabeloClaro}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  s += `<ellipse cx="-14" cy="-318" rx="17" ry="21" fill="${COR.pele}"/><path d="M-18 -326 q 8 6 0 14" stroke="${COR.peleSombra}" stroke-width="3" fill="none"/><circle cx="-14" cy="-298" r="3.5" fill="${COR.botao}"/>`;
  s += lizLaco(-40, -446, 15);
  s += `<path d="M44 ${expr==='surpresa'?-372:-362} Q 62 ${expr==='surpresa'?-382:-372} 82 -362" stroke="${COR.cabeloEscuro}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  if ((o.piscar || 0) > .5) s += `<path d="M48 -320 Q 64 -334 80 -320" stroke="${COR.contorno}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  else s += `<ellipse cx="66" cy="-322" rx="16" ry="27" fill="#fff" stroke="${COR.contorno}" stroke-width="3"/><circle cx="72" cy="-318" r="13" fill="${COR.iris}"/><circle cx="74" cy="-318" r="7" fill="#1E0F08"/><circle cx="69" cy="-325" r="5" fill="#fff"/><path d="M60 -348 l -10 -10 M56 -342 l -12 -5" stroke="${COR.contorno}" stroke-width="3.5" stroke-linecap="round"/>`;
  s += `<ellipse cx="72" cy="-280" rx="16" ry="10" fill="${COR.bochecha}" opacity=".55"/>`;
  [[64,-290],[76,-294],[70,-284]].forEach(([x,y]) => { s += `<circle cx="${x}" cy="${y}" r="2.2" fill="${COR.sarda}"/>`; });
  s += falar ? `<path d="M84 -270 Q 98 -250 108 -266 Z" fill="${COR.boca}"/>` : (expr === 'surpresa' ? `<ellipse cx="98" cy="-264" rx="7" ry="10" fill="${COR.boca}"/>` : `<path d="M82 -270 Q 96 -256 108 -268" stroke="${COR.boca}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`);
  s += `</g></g>`;
  return s;
}

/* ---------- LIZ — VISTA TRASEIRA ---------- */
function lizCostas(o = {}) {
  const aE = o.bracoE ?? 14, aD = o.bracoD ?? 14;
  let s = `<g class="liz-costas"><ellipse cx="0" cy="0" rx="92" ry="13" fill="#000" opacity=".16"/>`;
  s += `<rect x="-31" y="-82" width="21" height="66" rx="10" fill="${COR.peleSombra}"/><rect x="10" y="-82" width="21" height="66" rx="10" fill="${COR.peleSombra}"/>`;
  [-22, 22].forEach(x => { s += `<ellipse cx="${x}" cy="-12" rx="25" ry="15" fill="${COR.tenis}" stroke="#EBC6D7" stroke-width="2"/><ellipse cx="${x}" cy="-12" rx="11" ry="9" fill="${COR.tenisDetalhe}"/>`; });
  s += `<rect x="-14" y="-262" width="28" height="26" rx="8" fill="${COR.peleSombra}"/>`;
  s += `<rect x="-60" y="-244" width="120" height="112" rx="42" fill="${COR.camiseta}"/>`;
  s += `<path d="M-62 -152 L62 -152 L67 -86 Q67 -72 54 -72 L9 -72 L5 -92 L-5 -92 L-9 -72 L-54 -72 Q-67 -72 -67 -86 Z" fill="url(#lz-over)"/>`;
  s += `<path d="M-46 -238 L 30 -150 M46 -238 L -30 -150" stroke="${COR.jardineira}" stroke-width="13" stroke-linecap="round"/>`;
  s += braco(-57, -226, aE, 1, {});
  s += braco(57, -226, aD, -1, { pulseira: true });
  /* mochila em destaque */
  s += `<g filter="url(#sombraSuave)"><rect x="-64" y="-236" width="128" height="124" rx="30" fill="${COR.mochila}"/>
    <path d="M-64 -200 Q 0 -168 64 -200 L64 -206 Q64 -236 34 -236 L-34 -236 Q-64 -236 -64 -206 Z" fill="${COR.mochilaEscura}"/>
    <rect x="-34" y="-160" width="68" height="36" rx="12" fill="${COR.mochilaEscura}" opacity=".6"/>
    <circle cx="0" cy="-184" r="6" fill="${COR.botao}"/></g>`;
  for (let i = 0; i < 5; i++) { const a = i * 72 * Math.PI / 180; s += `<ellipse cx="${r1(-42 + Math.sin(a) * 9)}" cy="${r1(-150 - Math.cos(a) * 9)}" rx="6" ry="8" fill="#fff" transform="rotate(${i*72} ${r1(-42 + Math.sin(a) * 9)} ${r1(-150 - Math.cos(a) * 9)})"/>`; }
  s += `<circle cx="-42" cy="-150" r="6" fill="${COR.florMiolo}"/><path d="M-42 -184 v 26" stroke="#B0B8C4" stroke-width="2"/>`;
  /* cabeça de costas: só cabelo */
  s += lizCabeloTras(0, -330, 1.02);
  s += `<circle cx="0" cy="-330" r="106" fill="url(#lz-hair)"/>`;
  s += `<path d="M-60 -400 Q 0 -430 60 -400 M-80 -340 Q -60 -300 -70 -260 M80 -340 Q 60 -300 70 -260 M-20 -380 Q 0 -330 -10 -280 M30 -370 Q 40 -320 26 -270" stroke="${COR.cabeloClaro}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>`;
  s += lizRabo(-76, -452, -1);
  s += lizLaco(-40, -442, 15);
  s += `</g>`;
  return s;
}

/* ---------- PIPO — o cachorrinho ---------- */
/* o: {rabo (graus), latir (0/1), orelha (graus extras), piscar, pulo, olharX, lingua} */
function pipo(o = {}) {
  const rabo = o.rabo || 0, latir = !!o.latir, orelha = o.orelha || 0, pulo = o.pulo || 0, ox = (o.olharX || 0) * 4;
  let s = `<g class="pipo"><ellipse cx="0" cy="0" rx="${r1(64 - pulo * .12)}" ry="10" fill="#000" opacity=".16"/><g transform="translate(0 ${-pulo})">`;
  s += `<g transform="translate(40 -42) rotate(${rabo})"><path d="M0 0 Q 34 -8 38 -44 Q 40 -62 30 -64 Q 24 -40 -2 -12 Z" fill="${COR.pipoMarrom}"/><path d="M30 -64 Q 40 -60 38 -48 Q 32 -54 30 -64 Z" fill="${COR.pipoCreme}"/></g>`;
  s += `<ellipse cx="0" cy="-56" rx="50" ry="52" fill="${COR.pipoMarrom}"/>`;
  s += `<ellipse cx="0" cy="-50" rx="32" ry="42" fill="${COR.pipoCreme}"/>`;
  s += `<rect x="-30" y="-44" width="19" height="40" rx="9" fill="${COR.pipoCreme}"/><rect x="11" y="-44" width="19" height="40" rx="9" fill="${COR.pipoCreme}"/>`;
  s += `<ellipse cx="-21" cy="-5" rx="14" ry="8" fill="${COR.pipoCreme}"/><ellipse cx="21" cy="-5" rx="14" ry="8" fill="${COR.pipoCreme}"/>`;
  s += `<path d="M-26 -8 v -6 M-20 -7 v -6 M20 -7 v -6 M26 -8 v -6" stroke="#E2CDB5" stroke-width="2"/>`;
  s += `<path d="M-38 -96 Q 0 -80 38 -96 L 36 -84 Q 0 -70 -36 -84 Z" fill="${COR.coleira}"/>`;
  s += `<circle cx="0" cy="-74" r="10" fill="${COR.medalha}" stroke="#D9A21E" stroke-width="2"/><circle cx="0" cy="-72" r="3" fill="#9C5524"/><circle cx="-4" cy="-78" r="1.6" fill="#9C5524"/><circle cx="0" cy="-79" r="1.6" fill="#9C5524"/><circle cx="4" cy="-78" r="1.6" fill="#9C5524"/>`;
  /* cabeça */
  s += `<g transform="rotate(${o.inclinar || 0} 0 -96)">`;
  s += `<g transform="translate(-46 -150) rotate(${22 + orelha})"><ellipse cx="0" cy="34" rx="22" ry="42" fill="${COR.pipoMarromEscuro}"/></g>`;
  s += `<g transform="translate(46 -150) rotate(${-22 - orelha})"><ellipse cx="0" cy="34" rx="22" ry="42" fill="${COR.pipoMarromEscuro}"/></g>`;
  s += `<ellipse cx="0" cy="-132" rx="62" ry="56" fill="url(#pipo-cab)"/>`;
  s += `<path d="M-10 -186 Q 0 -190 10 -186 Q 14 -150 26 -118 L -26 -118 Q -14 -150 -10 -186 Z" fill="${COR.pipoCreme}"/>`;
  s += `<ellipse cx="0" cy="-108" rx="36" ry="25" fill="${COR.pipoCreme}"/>`;
  if ((o.piscar || 0) > .5) s += `<path d="M-34 -138 Q -22 -150 -10 -138 M10 -138 Q 22 -150 34 -138" stroke="${COR.pipoNariz}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  else [-22, 22].forEach(x => { s += `<circle cx="${x}" cy="-140" r="16" fill="#3A2214"/><circle cx="${x + ox}" cy="-139" r="12" fill="#1B0E07"/><circle cx="${x - 5 + ox}" cy="-146" r="5.5" fill="#fff"/><circle cx="${x + 5 + ox}" cy="-134" r="2.4" fill="#fff"/>`; });
  s += `<path d="M-36 -162 q 12 -8 22 -2 M14 -164 q 12 -6 22 2" stroke="${COR.pipoMarromEscuro}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  s += `<ellipse cx="0" cy="-118" rx="12" ry="8.5" fill="${COR.pipoNariz}"/><ellipse cx="-3" cy="-121" rx="4" ry="2.5" fill="#fff" opacity=".7"/>`;
  if (latir) s += `<path d="M-16 -104 Q 0 -110 16 -104 Q 14 -80 0 -78 Q -14 -80 -16 -104 Z" fill="#6E2430"/><ellipse cx="0" cy="-86" rx="9" ry="6" fill="${COR.lingua}"/>`;
  else s += `<path d="M0 -110 v 6 M-14 -100 Q -7 -94 0 -104 Q 7 -94 14 -100" stroke="${COR.pipoNariz}" stroke-width="3.5" fill="none" stroke-linecap="round"/>${o.lingua !== false ? `<path d="M2 -99 Q 4 -82 12 -84 Q 18 -90 12 -100 Z" fill="${COR.lingua}"/>` : ''}`;
  s += `<ellipse cx="-36" cy="-110" rx="8" ry="5" fill="${COR.bochecha}" opacity=".4"/><ellipse cx="36" cy="-110" rx="8" ry="5" fill="${COR.bochecha}" opacity=".4"/>`;
  s += `</g></g></g>`;
  return s;
}

/* ---------- LUMI — a borboleta mágica ---------- */
/* o: {bater (0..1, 0 = asas abertas), piscar, falar} — origem no centro do corpo */
function lumi(o = {}) {
  const sx = r1(1 - .62 * (o.bater || 0));
  const asa = (lado) => `<g transform="scale(${lado * sx} 1)">
    <path d="M0 -6 C 20 -78 96 -84 98 -36 C 100 -6 60 8 0 0 Z" fill="url(#lumi-asa)" stroke="${COR.lumiAsaBorda}" stroke-width="3"/>
    <path d="M0 4 C 16 20 70 30 70 58 C 68 84 30 76 0 12 Z" fill="url(#lumi-asa)" stroke="${COR.lumiAsaBorda}" stroke-width="3"/>
    <circle cx="62" cy="-40" r="12" fill="#FFF3A8" opacity=".9"/><circle cx="40" cy="-22" r="7" fill="#fff" opacity=".85"/><circle cx="80" cy="-18" r="6" fill="#fff" opacity=".7"/>
    <circle cx="42" cy="44" r="9" fill="#FFF3A8" opacity=".9"/><circle cx="56" cy="62" r="5" fill="#fff" opacity=".8"/>
  </g>`;
  let s = `<g class="lumi">${asa(-1)}${asa(1)}`;
  s += `<ellipse cx="0" cy="18" rx="12" ry="30" fill="${COR.lumiCorpo}"/><path d="M-11 12 h22 M-11 24 h22 M-9 36 h18" stroke="#F3A77C" stroke-width="3"/>`;
  s += `<path d="M-8 -44 Q -18 -72 -30 -74 M8 -44 Q 18 -72 30 -74" stroke="#7B3DB8" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="-30" cy="-74" r="6" fill="${COR.lumiAsa1}"/><circle cx="30" cy="-74" r="6" fill="${COR.lumiAsa1}"/>`;
  s += `<circle cx="0" cy="-24" r="25" fill="${COR.lumiRosto}"/>`;
  if ((o.piscar || 0) > .5) s += `<path d="M-16 -26 Q -9 -33 -2 -26 M2 -26 Q 9 -33 16 -26" stroke="#3a1d4a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  else [-9, 9].forEach(x => { s += `<ellipse cx="${x}" cy="-27" rx="7" ry="9" fill="#2A1638"/><circle cx="${x - 2}" cy="-31" r="3" fill="#fff"/><circle cx="${x + 2}" cy="-24" r="1.4" fill="#fff"/>`; });
  s += `<ellipse cx="-16" cy="-16" rx="5" ry="3" fill="${COR.bochecha}" opacity=".7"/><ellipse cx="16" cy="-16" rx="5" ry="3" fill="${COR.bochecha}" opacity=".7"/>`;
  s += o.falar ? `<ellipse cx="0" cy="-12" rx="5" ry="5" fill="${COR.boca}"/>` : `<path d="M-6 -14 Q 0 -8 6 -14" stroke="${COR.boca}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  s += `</g>`;
  return s;
}

/* ---------- ROBI — o robozinho ---------- */
/* o: {expr: feliz|uau|piscar|pensando, falar, bracoE, bracoD, flutuar} — origem no chão */
function robi(o = {}) {
  const expr = o.expr || 'feliz', fl = o.flutuar || 0, aE = o.bracoE ?? 20, aD = o.bracoD ?? 20;
  const olho = (x, tipo) => {
    if (tipo === 'arco') return `<path d="M${x - 14} -150 Q ${x} -170 ${x + 14} -150" stroke="${COR.robiBrilho}" stroke-width="8" fill="none" stroke-linecap="round" filter="url(#brilho)"/>`;
    if (tipo === 'linha') return `<path d="M${x - 13} -156 h 26" stroke="${COR.robiBrilho}" stroke-width="8" stroke-linecap="round" filter="url(#brilho)"/>`;
    if (tipo === 'alto') return `<ellipse cx="${x}" cy="-160" rx="10" ry="13" fill="${COR.robiBrilho}" filter="url(#brilho)"/>`;
    return `<circle cx="${x}" cy="-156" r="12" fill="${COR.robiBrilho}" filter="url(#brilho)"/><circle cx="${x - 4}" cy="-160" r="4" fill="#fff"/>`;
  };
  const braco2 = (x, a, lado) => `<g transform="translate(${x} -84) rotate(${r1(a * lado)})"><rect x="-9" y="0" width="18" height="44" rx="9" fill="url(#robi-corpo)" stroke="${COR.robiBorda}" stroke-width="2"/><circle cx="0" cy="0" r="11" fill="${COR.robiAzul}"/><circle cx="0" cy="52" r="13" fill="${COR.robiMao}"/><rect x="-12" y="54" width="7" height="12" rx="3" fill="${COR.robiMao}"/><rect x="5" y="54" width="7" height="12" rx="3" fill="${COR.robiMao}"/></g>`;
  let s = `<g class="robi"><ellipse cx="0" cy="0" rx="${r1(58 - fl * .3)}" ry="10" fill="#000" opacity="${r1(.18 - fl * .003)}"/><g transform="translate(0 ${-fl})">`;
  s += `<ellipse cx="-24" cy="-10" rx="18" ry="10" fill="${COR.robiAzul}"/><ellipse cx="24" cy="-10" rx="18" ry="10" fill="${COR.robiAzul}"/>`;
  s += braco2(-50, aE, 1) + braco2(50, aD, -1);
  s += `<ellipse cx="0" cy="-60" rx="50" ry="50" fill="url(#robi-corpo)" stroke="${COR.robiBorda}" stroke-width="3"/>`;
  s += `<path d="M-46 -42 Q 0 -22 46 -42" stroke="${COR.robiAzul}" stroke-width="6" fill="none" opacity=".8"/>`;
  s += `<path d="M0 -50 C -16 -62 -14 -80 0 -72 C 14 -80 16 -62 0 -50 Z" fill="${COR.robiBrilho}" filter="url(#brilho)"/>`;
  s += `<path d="M-20 -206 L -30 -236 M20 -206 L 30 -236" stroke="#9AA8BA" stroke-width="5" stroke-linecap="round"/><circle cx="-30" cy="-238" r="9" fill="${COR.robiAzul}" filter="url(#brilho)"/><circle cx="30" cy="-238" r="9" fill="${COR.robiAzul}" filter="url(#brilho)"/>`;
  s += `<circle cx="-74" cy="-154" r="15" fill="${COR.robiAzul}"/><circle cx="74" cy="-154" r="15" fill="${COR.robiAzul}"/>`;
  s += `<rect x="-72" y="-210" width="144" height="110" rx="52" fill="url(#robi-corpo)" stroke="${COR.robiBorda}" stroke-width="3"/>`;
  s += `<rect x="-58" y="-196" width="116" height="82" rx="38" fill="${COR.robiTela}"/><path d="M-44 -186 Q -20 -194 6 -190" stroke="#fff" stroke-width="4" opacity=".12" fill="none" stroke-linecap="round"/>`;
  const tipos = { feliz: ['arco', 'arco'], uau: ['redondo', 'redondo'], piscar: ['arco', 'linha'], pensando: ['alto', 'redondo'] }[expr] || ['arco', 'arco'];
  s += olho(-24, tipos[0]) + olho(24, tipos[1]);
  s += o.falar ? `<ellipse cx="0" cy="-130" rx="10" ry="7" fill="${COR.robiBrilho}" filter="url(#brilho)"/>` : (expr === 'uau' ? `<circle cx="0" cy="-130" r="6" fill="${COR.robiBrilho}" filter="url(#brilho)"/>` : `<path d="M-12 -134 Q 0 -122 12 -134" stroke="${COR.robiBrilho}" stroke-width="5" fill="none" stroke-linecap="round" filter="url(#brilho)"/>`);
  s += `</g></g>`;
  return s;
}


/* =====================================================================
   ANIMAIS DA FLORESTA (Episódio 2) — mesmo estilo e regras da turma.
   ===================================================================== */
Object.assign(COR, {
  coelho: '#FFFFFF', coelhoSombra: '#E9E3EE', coelhoOrelha: '#FFB3CF',
  leao: '#F2B544', leaoClaro: '#FCE3A6', juba: '#D9772B', jubaClara: '#E8933F', leaoNariz: '#8A4B2A',
  macaco: '#8B5A3C', macacoEscuro: '#6E432B', macacoRosto: '#EBCBA2', banana: '#FFD84A',
  girafa: '#F6C45B', girafaClara: '#FBDD95', girafaMancha: '#C77A33', casco: '#6E4220',
  elefante: '#9FB0CB', elefanteClaro: '#B4C3DB', elefanteOrelha: '#F6B6C8'
});
const olhoFofo = (x, y, r, piscar, ox = 0) => (piscar > .5)
  ? `<path d="M${x - r} ${y} Q ${x} ${y - r * 1.2} ${x + r} ${y}" stroke="#2A1A14" stroke-width="${r * .45}" fill="none" stroke-linecap="round"/>`
  : `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.2}" fill="#2A1A14"/><circle cx="${x - r * .35 + ox}" cy="${y - r * .45}" r="${r * .42}" fill="#fff"/><circle cx="${x + r * .35 + ox}" cy="${y + r * .35}" r="${r * .18}" fill="#fff"/>`;

/* ---------- COELHINHO ---------- o: {pulo, orelha, nariz, piscar, olharX} */
function coelho(o = {}) {
  const pulo = o.pulo || 0, orl = o.orelha || 0, nz = (o.nariz || 0) * 2;
  let s = `<g class="coelho"><ellipse cx="0" cy="0" rx="${r1(56 - pulo * .15)}" ry="9" fill="#000" opacity=".15"/><g transform="translate(0 ${-pulo})">`;
  s += `<circle cx="42" cy="-38" r="17" fill="#fff" stroke="${COR.coelhoSombra}" stroke-width="3"/>`;
  s += `<ellipse cx="0" cy="-56" rx="46" ry="50" fill="${COR.coelho}" stroke="${COR.coelhoSombra}" stroke-width="3"/><ellipse cx="0" cy="-46" rx="28" ry="34" fill="#FFF5F8"/>`;
  s += `<ellipse cx="-27" cy="-9" rx="27" ry="12" fill="#fff" stroke="${COR.coelhoSombra}" stroke-width="3"/><ellipse cx="27" cy="-9" rx="27" ry="12" fill="#fff" stroke="${COR.coelhoSombra}" stroke-width="3"/>`;
  s += `<ellipse cx="-14" cy="-36" rx="10" ry="12" fill="#fff" stroke="${COR.coelhoSombra}" stroke-width="2"/><ellipse cx="14" cy="-36" rx="10" ry="12" fill="#fff" stroke="${COR.coelhoSombra}" stroke-width="2"/>`;
  const orelha = (x, a) => `<g transform="translate(${x} -160) rotate(${r1(a)})"><ellipse cx="0" cy="-54" rx="16" ry="58" fill="#fff" stroke="${COR.coelhoSombra}" stroke-width="3"/><ellipse cx="0" cy="-50" rx="8" ry="44" fill="${COR.coelhoOrelha}"/></g>`;
  s += orelha(-18, -12 + orl) + orelha(18, 12 - orl * .6);
  s += `<circle cx="0" cy="-124" r="47" fill="#fff" stroke="${COR.coelhoSombra}" stroke-width="3"/>`;
  s += olhoFofo(-17, -130, 9, o.piscar || 0, (o.olharX || 0) * 3) + olhoFofo(17, -130, 9, o.piscar || 0, (o.olharX || 0) * 3);
  s += `<ellipse cx="-30" cy="-110" rx="9" ry="6" fill="${COR.bochecha}" opacity=".55"/><ellipse cx="30" cy="-110" rx="9" ry="6" fill="${COR.bochecha}" opacity=".55"/>`;
  s += `<path d="M-7 ${-116 + nz} h14 l -7 8 z" fill="#FF7FA8"/><path d="M0 ${-108 + nz} v6 M-9 -98 q 9 6 9 -4 q 0 10 9 4" stroke="#C9A6B4" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M-16 -110 h-26 M-16 -106 l -24 6 M16 -110 h26 M16 -106 l 24 6" stroke="#D9CCD6" stroke-width="2" stroke-linecap="round"/>`;
  s += `<rect x="-5" y="-100" width="10" height="7" rx="2" fill="#fff" stroke="#E2D8DE" stroke-width="1.5"/>`;
  return s + `</g></g>`;
}

/* ---------- LEÃO ---------- o: {rugir (0..1), juba, rabo, piscar, olharX} */
function leao(o = {}) {
  const rg = o.rugir || 0, jb = 1 + (o.juba || 0) * .06, rabo = o.rabo || 0;
  let s = `<g class="leao"><ellipse cx="0" cy="0" rx="100" ry="13" fill="#000" opacity=".15"/>`;
  s += `<g transform="translate(62 -40) rotate(${rabo})"><path d="M0 0 Q 50 -10 60 -60" stroke="${COR.leao}" stroke-width="12" fill="none" stroke-linecap="round"/><ellipse cx="62" cy="-68" rx="14" ry="18" fill="${COR.juba}"/></g>`;
  s += `<ellipse cx="-52" cy="-22" rx="32" ry="24" fill="${COR.leao}"/><ellipse cx="52" cy="-22" rx="32" ry="24" fill="${COR.leao}"/>`;
  s += `<ellipse cx="0" cy="-74" rx="72" ry="64" fill="${COR.leao}"/><ellipse cx="0" cy="-58" rx="40" ry="44" fill="${COR.leaoClaro}"/>`;
  s += `<rect x="-38" y="-86" width="26" height="78" rx="13" fill="${COR.leao}"/><rect x="12" y="-86" width="26" height="78" rx="13" fill="${COR.leao}"/>`;
  s += `<ellipse cx="-25" cy="-8" rx="19" ry="11" fill="${COR.leaoClaro}"/><ellipse cx="25" cy="-8" rx="19" ry="11" fill="${COR.leaoClaro}"/>`;
  /* juba */
  s += `<g transform="translate(0 -168) scale(${r1(jb)})">`;
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; s += `<circle cx="${r1(Math.cos(a) * 80)}" cy="${r1(Math.sin(a) * 76)}" r="36" fill="${i % 2 ? COR.juba : COR.jubaClara}"/>`; }
  s += `<circle cx="0" cy="0" r="84" fill="${COR.juba}"/></g>`;
  /* cabeça */
  s += `<circle cx="-50" cy="-218" r="19" fill="${COR.leao}"/><circle cx="-50" cy="-218" r="10" fill="${COR.juba}"/><circle cx="50" cy="-218" r="19" fill="${COR.leao}"/><circle cx="50" cy="-218" r="10" fill="${COR.juba}"/>`;
  s += `<ellipse cx="0" cy="-162" rx="64" ry="60" fill="#F5BE55"/>`;
  s += olhoFofo(-24, -176, 11, o.piscar || 0, (o.olharX || 0) * 3) + olhoFofo(24, -176, 11, o.piscar || 0, (o.olharX || 0) * 3);
  s += `<path d="M-40 -200 q 14 -8 26 -2 M14 -202 q 12 -6 26 2" stroke="${COR.juba}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  s += `<ellipse cx="-44" cy="-146" rx="12" ry="7" fill="${COR.bochecha}" opacity=".45"/><ellipse cx="44" cy="-146" rx="12" ry="7" fill="${COR.bochecha}" opacity=".45"/>`;
  s += `<ellipse cx="0" cy="${-138 + rg * 6}" rx="38" ry="${r1(26 + rg * 10)}" fill="${COR.leaoClaro}"/>`;
  if (rg > .15) s += `<ellipse cx="0" cy="${-124 + rg * 8}" rx="${r1(16 + rg * 10)}" ry="${r1(8 + rg * 18)}" fill="#7A2A2A"/><ellipse cx="0" cy="${-114 + rg * 14}" rx="${r1(8 + rg * 5)}" ry="${r1(4 + rg * 5)}" fill="${COR.lingua}"/><path d="M${-10 - rg * 6} ${-128 + rg * 2} l 4 7 l 4 -7 M${2 + rg * 6} ${-128 + rg * 2} l 4 7 l 4 -7" fill="#fff"/>`;
  else s += `<path d="M-14 -128 Q -7 -120 0 -130 Q 7 -120 14 -128" stroke="${COR.leaoNariz}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M-13 ${-152 + rg * 2} Q 0 ${-158 + rg * 2} 13 ${-152 + rg * 2} Q 6 ${-138 + rg * 2} 0 ${-138 + rg * 2} Q -6 ${-138 + rg * 2} -13 ${-152 + rg * 2} Z" fill="${COR.leaoNariz}"/>`;
  [[-22, -140], [-28, -132], [22, -140], [28, -132]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y + rg * 4}" r="2.2" fill="${COR.leaoNariz}" opacity=".6"/>`; });
  return s + `</g>`;
}

/* ---------- MACAQUINHO ---------- o: {bracoE, bracoD (graus, 0=baixo), banana, falar ('u'|'a'|false), piscar, rabo, sombra} */
function macaco(o = {}) {
  const aE = o.bracoE ?? 30, aD = o.bracoD ?? 30;
  const braco = (x, a, lado, ban) => `<g transform="translate(${x} -112) rotate(${r1(a * lado)})"><rect x="-8" y="0" width="16" height="74" rx="8" fill="${COR.macaco}"/><circle cx="0" cy="80" r="12" fill="${COR.macacoRosto}"/>${ban ? `<g transform="translate(0 84) rotate(${-a * lado})"><path d="M-6 -4 Q 6 30 34 30 Q 18 36 0 26 Q -10 14 -10 -2 Z" fill="${COR.banana}" stroke="#D9A21E" stroke-width="2.5"/><path d="M-9 -4 l 3 -6" stroke="#6E4220" stroke-width="4" stroke-linecap="round"/></g>` : ''}</g>`;
  let s = `<g class="macaco">`;
  if (o.sombra !== false) s += `<ellipse cx="0" cy="0" rx="58" ry="9" fill="#000" opacity=".15"/>`;
  s += `<path d="M28 -30 Q 96 -30 92 -90 Q 88 -120 66 -112 Q 52 -104 64 -92" transform="rotate(${o.rabo || 0} 28 -30)" stroke="${COR.macaco}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  s += `<ellipse cx="-24" cy="-20" rx="22" ry="17" fill="${COR.macaco}"/><ellipse cx="24" cy="-20" rx="22" ry="17" fill="${COR.macaco}"/><ellipse cx="-32" cy="-6" rx="15" ry="8" fill="${COR.macacoRosto}"/><ellipse cx="32" cy="-6" rx="15" ry="8" fill="${COR.macacoRosto}"/>`;
  s += braco(-34, aE, 1, false);
  s += `<ellipse cx="0" cy="-62" rx="40" ry="46" fill="${COR.macaco}"/><ellipse cx="0" cy="-56" rx="26" ry="32" fill="${COR.macacoRosto}"/>`;
  s += braco(34, aD, -1, o.banana);
  s += `<circle cx="-48" cy="-150" r="18" fill="${COR.macaco}"/><circle cx="-48" cy="-150" r="10" fill="${COR.macacoRosto}"/><circle cx="48" cy="-150" r="18" fill="${COR.macaco}"/><circle cx="48" cy="-150" r="10" fill="${COR.macacoRosto}"/>`;
  s += `<circle cx="0" cy="-150" r="46" fill="${COR.macaco}"/><path d="M-8 -194 q 6 -14 14 -4 q 4 -12 10 0" stroke="${COR.macacoEscuro}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  s += `<circle cx="-14" cy="-156" r="21" fill="${COR.macacoRosto}"/><circle cx="14" cy="-156" r="21" fill="${COR.macacoRosto}"/><ellipse cx="0" cy="-130" rx="30" ry="22" fill="${COR.macacoRosto}"/>`;
  s += olhoFofo(-14, -158, 8, o.piscar || 0) + olhoFofo(14, -158, 8, o.piscar || 0);
  s += `<circle cx="-5" cy="-138" r="2.5" fill="${COR.macacoEscuro}"/><circle cx="5" cy="-138" r="2.5" fill="${COR.macacoEscuro}"/>`;
  s += o.falar === 'u' ? `<ellipse cx="0" cy="-122" rx="7" ry="8" fill="#6E2430"/>` : o.falar === 'a' ? `<ellipse cx="0" cy="-122" rx="13" ry="10" fill="#6E2430"/><ellipse cx="0" cy="-117" rx="7" ry="4" fill="${COR.lingua}"/>` : `<path d="M-14 -126 Q 0 -114 14 -126" stroke="${COR.macacoEscuro}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  s += `<ellipse cx="-30" cy="-134" rx="7" ry="5" fill="${COR.bochecha}" opacity=".45"/><ellipse cx="30" cy="-134" rx="7" ry="5" fill="${COR.bochecha}" opacity=".45"/>`;
  return s + `</g>`;
}

/* ---------- GIRAFA (de perfil, olhando para a direita) ---------- o: {cabeca, pescoco, mastigar, folha, piscar, cauda} */
function girafa(o = {}) {
  const pc = o.pescoco || 0, cb = o.cabeca || 0, ms = (o.mastigar || 0) * 4;
  const mancha = (x, y, rx, ry, a) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${x} ${y})" fill="${COR.girafaMancha}" opacity=".9"/>`;
  let s = `<g class="girafa"><ellipse cx="-10" cy="0" rx="130" ry="13" fill="#000" opacity=".15"/>`;
  [[-96, .92], [-56, 1], [34, .92], [74, 1]].forEach(([x, k]) => { s += `<rect x="${x}" y="-420" width="24" height="410" rx="11" fill="${k < 1 ? '#E9B24A' : COR.girafa}"/><circle cx="${x + 12}" cy="-210" r="14" fill="${k < 1 ? '#E9B24A' : COR.girafa}"/><rect x="${x - 2}" y="-26" width="28" height="26" rx="6" fill="${COR.casco}"/>`; });
  s += `<g transform="rotate(${o.cauda || 0} -128 -452)"><path d="M-128 -452 Q -150 -410 -146 -350" stroke="${COR.girafa}" stroke-width="6" fill="none"/><ellipse cx="-146" cy="-342" rx="9" ry="16" fill="${COR.casco}"/></g>`;
  s += `<ellipse cx="-10" cy="-445" rx="132" ry="72" fill="${COR.girafa}"/>`;
  s += mancha(-80, -470, 22, 16, 20) + mancha(-30, -490, 20, 14, -15) + mancha(20, -470, 24, 15, 10) + mancha(-60, -420, 20, 13, -10) + mancha(0, -415, 18, 12, 25) + mancha(60, -440, 18, 13, -20) + mancha(-110, -440, 12, 10, 0);
  s += `<ellipse cx="-10" cy="-400" rx="90" ry="22" fill="${COR.girafaClara}" opacity=".6"/>`;
  /* pescoço + cabeça */
  s += `<g transform="rotate(${pc} 70 -480)">`;
  s += `<path d="M44 -490 L 70 -800 L 108 -800 L 116 -470 Z" fill="${COR.girafa}"/>`;
  s += `<path d="M48 -500 L 72 -800" stroke="${COR.casco}" stroke-width="10" stroke-linecap="round" stroke-dasharray="14 8" opacity=".75"/>`;
  s += mancha(88, -540, 14, 10, 80) + mancha(90, -610, 13, 9, 80) + mancha(92, -680, 12, 9, 80) + mancha(94, -748, 11, 8, 80) + mancha(76, -575, 9, 7, 60) + mancha(80, -715, 9, 7, 60);
  s += `<g transform="rotate(${cb} 90 -800)">`;
  s += `<path d="M78 -820 L 72 -862" stroke="${COR.girafaMancha}" stroke-width="9" stroke-linecap="round"/><circle cx="72" cy="-866" r="10" fill="${COR.casco}"/><path d="M100 -822 L 98 -862" stroke="${COR.girafaMancha}" stroke-width="9" stroke-linecap="round"/><circle cx="98" cy="-866" r="10" fill="${COR.casco}"/>`;
  s += `<ellipse cx="54" cy="-826" rx="24" ry="10" transform="rotate(-25 54 -826)" fill="${COR.girafa}" stroke="#E0A63F" stroke-width="2"/>`;
  s += `<ellipse cx="106" cy="-806" rx="50" ry="34" fill="${COR.girafa}"/><ellipse cx="146" cy="${-796 + ms * .3}" rx="28" ry="${22 + ms * .3}" fill="${COR.girafaClara}"/>`;
  s += `<ellipse cx="160" cy="-806" rx="4" ry="3" fill="${COR.casco}"/>`;
  s += (o.piscar || 0) > .5 ? `<path d="M96 -816 q 10 -10 20 0" stroke="#2A1A14" stroke-width="4" fill="none" stroke-linecap="round"/>` : `<ellipse cx="106" cy="-818" rx="10" ry="12" fill="#2A1A14"/><circle cx="103" cy="-823" r="4.5" fill="#fff"/><path d="M98 -830 l -6 -8 M104 -831 l -2 -9 M110 -830 l 2 -8" stroke="#2A1A14" stroke-width="3" stroke-linecap="round"/>`;
  s += `<path d="M132 ${-780 + ms} Q 150 ${-772 + ms} 168 ${-784 + ms}" stroke="${COR.casco}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  s += `<ellipse cx="124" cy="-798" rx="9" ry="6" fill="${COR.bochecha}" opacity=".5"/>`;
  if (o.folha) s += `<g transform="translate(168 ${-782 + ms})"><path d="M0 0 Q 18 -16 38 -6 Q 22 10 0 0 Z" fill="#5CC25A" stroke="#3F9A3F" stroke-width="2"/><path d="M0 0 L 30 -6" stroke="#3F9A3F" stroke-width="2"/></g>`;
  s += `</g></g>`;
  return s + `</g>`;
}

/* ---------- ELEFANTE ---------- o: {tromba (0 baixo .. 1 erguida), orelha, piscar, falar, olharX} */
function elefante(o = {}) {
  const tr = o.tromba || 0, fl = 1 + (o.orelha || 0) * .1;
  let s = `<g class="elefante"><ellipse cx="0" cy="0" rx="130" ry="14" fill="#000" opacity=".15"/>`;
  s += `<rect x="-96" y="-96" width="40" height="80" rx="18" fill="#8E9FBA"/><rect x="56" y="-96" width="40" height="80" rx="18" fill="#8E9FBA"/>`;
  s += `<ellipse cx="0" cy="-122" rx="112" ry="86" fill="${COR.elefante}"/>`;
  s += `<rect x="-58" y="-100" width="44" height="100" rx="20" fill="${COR.elefante}"/><rect x="14" y="-100" width="44" height="100" rx="20" fill="${COR.elefante}"/>`;
  [[-50, -8], [-36, -6], [-22, -8], [22, -8], [36, -6], [50, -8]].forEach(([x, y]) => { s += `<ellipse cx="${x}" cy="${y}" rx="6" ry="4.5" fill="#fff" opacity=".85"/>`; });
  const orelha = (lado) => `<g transform="translate(${lado * 64} -212) scale(${r1(fl * lado)} 1)"><ellipse cx="56" cy="8" rx="72" ry="82" fill="${COR.elefante}"/><ellipse cx="62" cy="10" rx="48" ry="58" fill="${COR.elefanteOrelha}"/></g>`;
  s += orelha(-1) + orelha(1);
  s += `<circle cx="0" cy="-212" r="84" fill="${COR.elefanteClaro}"/>`;
  s += olhoFofo(-32, -228, 11, o.piscar || 0, (o.olharX || 0) * 3) + olhoFofo(32, -228, 11, o.piscar || 0, (o.olharX || 0) * 3);
  s += `<ellipse cx="-56" cy="-196" rx="13" ry="8" fill="${COR.bochecha}" opacity=".5"/><ellipse cx="56" cy="-196" rx="13" ry="8" fill="${COR.bochecha}" opacity=".5"/>`;
  s += `<path d="M-34 -172 Q -24 -162 -14 -170" stroke="#5E6E8A" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  /* tromba: interpola entre caída e erguida */
  const L = (a, b) => r1(a + (b - a) * tr);
  const d = `M0 -196 C ${L(0, 20)} ${L(-150, -230)} ${L(-6, 70)} ${L(-120, -290)} ${L(12, 120)} ${L(-96, -330)}`;
  s += `<path d="${d}" stroke="${COR.elefanteClaro}" stroke-width="34" fill="none" stroke-linecap="round"/>`;
  s += `<path d="${d}" stroke="#93A4C0" stroke-width="34" fill="none" stroke-linecap="round" stroke-dasharray="3 16" opacity=".7"/>`;
  s += `<circle cx="${L(12, 120)}" cy="${L(-96, -330)}" r="${o.falar ? 19 : 16}" fill="${o.falar ? '#6E5A6E' : '#8E9FBA'}"/>`;
  return s + `</g>`;
}

root.LIZ = { COR, defs, liz, lizLado, lizCostas, pipo, lumi, robi, coelho, leao, macaco, girafa, elefante };
})(typeof window !== 'undefined' ? window : globalThis);
