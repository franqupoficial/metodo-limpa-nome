/**
 * Extração de alfa para fotografias de estúdio com fundo claro (funções puras: rodam no navegador
 * e no Node — validadas contra todo o catálogo em scripts/validate-matte.ts e tests/unit/matte.test.ts).
 *
 * 1. Cor do fundo = mediana dos pixels da borda.
 * 2. Fundo = região CONECTADA à borda com cor próxima do fundo (inclui sombras neutras e claras).
 *    Brilhantes, pérolas e ouro branco NO INTERIOR da peça não são alcançados pelo preenchimento.
 * 3. Faixa de borda (até 3 px do fundo): alfa suave pela distância de cor (anti-aliasing) e
 *    descontaminação da cor (remove o halo branco: c = (c − (1−a)·fundo) / a).
 * 4. Componentes conectados → cada peça separada (par de brincos, colar + brincos de um conjunto).
 */
export type Piece = { x: number; y: number; w: number; h: number; area: number; cx: number };
export type MatteResult = { bg: [number, number, number]; pieces: Piece[]; labels: Int32Array };

const T_FILL = 24;          // tolerância do preenchimento do fundo (distância de Chebyshev)
const T_HOLE = 28, HOLE_MIN = 0.0015; // furos grandes: miolo de aros/elos — o fundo visto através da peça pode vir tingido pelo reflexo do ouro
const SMALL_HOLE_PX = 16;             // furos pequenos (filigrana, elos): exatamente a cor lisa do fundo
const T_EDGE_LO = 12, T_EDGE_HI = 70;

/**
 * `pearl`: modo conservador para peças com pérola/madrepérola — material claro e liso que a cor confunde com o fundo.
 * Furo só se cercado de metal ou de aro fino; preenchimento do fundo para nas silhuetas. Nas demais peças o recorte
 * é agressivo (todo miolo claro e liso fechado é fundo visto através da peça).
 */
export function matteWhite(data: Uint8ClampedArray | Uint8Array, w: number, h: number, opts: { pearl?: boolean } = {}): MatteResult {
  const pearl = !!opts.pearl;
  const n = w * h;
  // 1. fundo pela mediana da borda
  const border: number[][] = [[], [], []];
  for (let x = 0; x < w; x++) for (const y of [0, 1, h - 2, h - 1]) for (let c = 0; c < 3; c++) border[c].push(data[(y * w + x) * 4 + c]);
  for (let y = 0; y < h; y++) for (const x of [0, 1, w - 2, w - 1]) for (let c = 0; c < 3; c++) border[c].push(data[(y * w + x) * 4 + c]);
  const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1];
  const bg: [number, number, number] = [med(border[0]), med(border[1]), med(border[2])];
  const dist = new Uint8Array(n), isBg = new Uint8Array(n), grad = new Uint8Array(n);
  const lum = (i: number) => (data[i * 4] * 3 + data[i * 4 + 1] * 6 + data[i * 4 + 2]) / 10;
  for (let i = 0; i < n; i++) {
    const x = i % w;
    // textura local: metal e pedras têm bordas e reflexos; fundo e sombras de estúdio são lisos
    grad[i] = Math.min(255, Math.max(x < w - 1 ? Math.abs(lum(i) - lum(i + 1)) : 0, i < n - w ? Math.abs(lum(i) - lum(i + w)) : 0));
  }
  for (let i = 0; i < n; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    dist[i] = Math.max(Math.abs(r - bg[0]), Math.abs(g - bg[1]), Math.abs(b - bg[2]));
    // candidato a fundo: quase a cor do fundo; mais longe disso só se for liso (o preenchimento para nas
    // silhuetas). Sombra de estúdio: cinza NEUTRO, claro e liso — pérolas (creme/rosadas) e ouro branco
    // (texturizado) não passam.
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (pearl ? dist[i] < 4 || (dist[i] < T_FILL && grad[i] < 3) || (mx - mn < 6 && mx > 190 && dist[i] < 64 && grad[i] < 3)
      : dist[i] < T_FILL || (mx - mn < 12 && mx > 190 && dist[i] < 64 && grad[i] < 4)) isBg[i] = 1;
  }
  // 2. preenchimento a partir da borda (só candidatos conectados à borda viram fundo)
  const bgMask = new Uint8Array(n), q = new Int32Array(n);
  let qh = 0, qt = 0;
  const push = (i: number) => { if (isBg[i] && !bgMask[i]) { bgMask[i] = 1; q[qt++] = i; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (qh < qt) {
    const i = q[qh++], x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < n - w) push(i + w);
  }
  // Furo de verdade (fundo visto através da peça) é CERCADO DE METAL: cor forte ou escura na borda.
  // Reflexo de pérola, de brilhante ou de ouro branco é cercado de material claro — nunca vira furo.
  const ringedByMetal = (count: number) => {
    let edge = 0, strong = 0;
    for (let k = 0; k < count; k++) {
      const i = q[k], x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j < 0 || j >= n || seen[j] === 2 || bgMask[j]) continue;
        if (seen[j] === 1 && regionMark[j] === mark) continue;
        edge++;
        // a orla imediata do furo ainda é clara (borda suave); olha até 2 px além para achar o metal
        let mx = dist[j];
        const xj = j % w;
        for (const k of [xj > 0 ? j - 1 : -1, xj < w - 1 ? j + 1 : -1, j - w, j + w, xj > 1 ? j - 2 : -1, xj < w - 2 ? j + 2 : -1, j - 2 * w, j + 2 * w]) if (k >= 0 && k < n && !(seen[k] === 1 && regionMark[k] === mark) && dist[k] > mx) mx = dist[k];
        if (mx > 45) strong++;
      }
    }
    return edge > 0 && strong / edge >= 0.6;
  };
  // distância (px) ao fundo externo, até RIM: o miolo de um aro (mesmo de ouro branco, claro) fica a poucos px do
  // fundo de fora — o aro é fino. O reflexo de uma pérola fica no meio do corpo dela, longe do fundo.
  const RIM = Math.max(8, Math.round(Math.min(w, h) * 0.015));
  const outer = new Uint16Array(n).fill(65535);
  qh = 0; qt = 0;
  for (let i = 0; i < n; i++) if (bgMask[i]) { outer[i] = 0; q[qt++] = i; }
  while (qh < qt) {
    const i = q[qh++], x = i % w, d = outer[i] + 1;
    if (d > RIM) continue;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < n && outer[j] > d) { outer[j] = d; q[qt++] = j; }
  }
  // o miolo liso vem cercado de uma faixa granulada (compressão + anti-aliasing) ainda quase-fundo: ela entra na
  // região antes de medir a borda, senão a "borda" seria só grão
  const q2 = new Int32Array(n), stamp = new Int32Array(n);
  const thinRim = (count: number) => {
    const lim = Math.min(RIM, Math.max(2, Math.round(0.5 * Math.sqrt(count / Math.PI))));
    const inR = (j: number) => (seen[j] === 1 && regionMark[j] === mark) || stamp[j] === mark;
    let t = 0;
    for (let k = 0; k < count; k++) q2[t++] = q[k];
    for (let h2 = 0; h2 < t; h2++) {
      const i = q2[h2], x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < n && !bgMask[j] && !inR(j) && dist[j] < T_HOLE) { stamp[j] = mark; q2[t++] = j; }
    }
    let edge = 0, thin = 0;
    for (let k = 0; k < t; k++) {
      const i = q2[k], x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j < 0 || j >= n || bgMask[j] || inR(j)) continue;
        edge++;
        if (outer[j] <= lim) thin++;
      }
    }
    // a cabeça do anel (cravação) e a sombra de estúdio embaixo do aro engrossam parte da borda
    return edge > 0 && thin / edge >= 0.55;
  };
  const regionMark = new Int32Array(n);
  let mark = 0;
  // furos: regiões fechadas, grandes, quase da cor do fundo e lisas (miolo de anéis e elos)
  const seen = new Uint8Array(n);
  for (let s0 = 0; s0 < n; s0++) {
    if (seen[s0] || bgMask[s0] || dist[s0] >= T_HOLE || grad[s0] >= 5) continue;
    mark++;
    qh = 0; qt = 0; q[qt++] = s0; seen[s0] = 1; regionMark[s0] = mark;
    while (qh < qt) {
      const i = q[qh++], x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < n && !seen[j] && !bgMask[j] && dist[j] < T_HOLE && grad[j] < 5) { seen[j] = 1; regionMark[j] = mark; q[qt++] = j; }
    }
    if (qt >= n * HOLE_MIN && (!pearl || ringedByMetal(qt) || thinRim(qt))) for (let k = 0; k < qt; k++) bgMask[q[k]] = 1;
  }
  // furos pequenos: só pixels IDÊNTICOS ao fundo e lisos (a transição para o metal fica com a faixa de anti-aliasing)
  seen.fill(0);
  for (let s0 = 0; s0 < n; s0++) {
    if (seen[s0] || bgMask[s0] || dist[s0] >= 6 || grad[s0] >= 4) continue;
    mark++;
    qh = 0; qt = 0; q[qt++] = s0; seen[s0] = 1; regionMark[s0] = mark;
    while (qh < qt) {
      const i = q[qh++], x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < n && !seen[j] && !bgMask[j] && dist[j] < 6 && grad[j] < 4) { seen[j] = 1; regionMark[j] = mark; q[qt++] = j; }
    }
    if (qt >= SMALL_HOLE_PX && (!pearl || ringedByMetal(qt))) for (let k = 0; k < qt; k++) bgMask[q[k]] = 1;
  }
  // distância (em px, até 3) ao fundo, para a faixa de borda
  const near = new Uint8Array(n);
  qh = 0; qt = 0;
  for (let i = 0; i < n; i++) if (bgMask[i]) { near[i] = 0; q[qt++] = i; } else near[i] = 255;
  while (qh < qt) {
    const i = q[qh++], x = i % w, d = near[i] + 1;
    if (d > 3) continue;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < n && near[j] > d) { near[j] = d; q[qt++] = j; }
  }
  // 2b. sombra de contato: região lisa, quase neutra e MAIS ESCURA que o fundo, ligada ao fundo.
  //     Vira escurecimento translúcido (preto com alfa pela escuridão) — nunca uma mancha clara sobre a pele.
  const bgLum = (bg[0] * 3 + bg[1] * 6 + bg[2]) / 10;
  const shadow = new Uint8Array(n);
  qh = 0; qt = 0;
  for (let i = 0; i < n; i++) if (bgMask[i]) q[qt++] = i;
  const isShadow = (j: number) => {
    const r = data[j * 4], g = data[j * 4 + 1], b = data[j * 4 + 2];
    return !bgMask[j] && !shadow[j] && grad[j] < 3 && Math.max(r, g, b) - Math.min(r, g, b) < 14 && lum(j) < bgLum - 2 && dist[j] < 70;
  };
  while (qh < qt) {
    const i = q[qh++], x = i % w;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < n && isShadow(j)) { shadow[j] = 1; q[qt++] = j; }
  }
  // 3. alfa com anti-aliasing e descontaminação na faixa de borda
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (bgMask[i]) { data[o + 3] = 0; continue; }
    if (shadow[i]) {
      const a = Math.min(0.55, ((bgLum - lum(i)) / bgLum) * 2.4);
      data[o] = 0; data[o + 1] = 0; data[o + 2] = 0; data[o + 3] = Math.round(a * 255);
      continue;
    }
    if (near[i] <= 2 || (near[i] === 3 && dist[i] < 14)) {
      // anti-aliasing: 1º pixel pela distância de cor; 2º pixel nunca abaixo de 70% (metais claros não ficam translúcidos)
      const ad = Math.min(1, Math.max(0, (dist[i] - T_EDGE_LO) / (T_EDGE_HI - T_EDGE_LO)));
      const a = near[i] === 1 ? ad * 0.9 : dist[i] < 14 ? ad : Math.max(ad, 0.7); // cor de fundo nunca é forçada a opaca
      data[o + 3] = Math.round(a * 255);
      if (a > 0.02 && a < 1) for (let c = 0; c < 3; c++) data[o + c] = Math.min(255, Math.max(0, Math.round((data[o + c] - (1 - a) * bg[c]) / a)));
    } else data[o + 3] = 255;
  }
  return { bg, ...labelPieces(data, w, h) };
}

/** 4. componentes (8-conectados) — cada peça da fotografia, pelo canal alfa. */
export function labelPieces(data: Uint8ClampedArray | Uint8Array, w: number, h: number): { pieces: Piece[]; labels: Int32Array } {
  const n = w * h, q = new Int32Array(n);
  let qh = 0, qt = 0;
  const labels = new Int32Array(n).fill(-1);
  const raw: Piece[] = [];
  for (let s = 0; s < n; s++) {
    if (labels[s] !== -1 || data[s * 4 + 3] < 96) continue;
    const id = raw.length;
    let minX = w, minY = h, maxX = 0, maxY = 0, area = 0, sx = 0;
    qh = 0; qt = 0; q[qt++] = s; labels[s] = id;
    while (qh < qt) {
      const i = q[qh++], x = i % w, y = (i / w) | 0;
      area++; sx += x;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (labels[j] === -1 && data[j * 4 + 3] >= 96) { labels[j] = id; q[qt++] = j; }
      }
    }
    raw.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area, cx: sx / area });
  }
  const largest = Math.max(1, ...raw.map((p) => p.area));
  // fragmentos minúsculos (reflexos isolados, poeira) não são peças; ficam junto da peça mais próxima no desenho
  const pieces = raw.map((p, id) => ({ ...p, id })).filter((p) => p.area >= largest * 0.06).sort((a, b) => b.area - a.area);
  const keep = new Map(pieces.map((p, k) => [p.id, k]));
  for (let i = 0; i < n; i++) if (labels[i] >= 0) labels[i] = keep.get(labels[i]) ?? -2;
  return { pieces: pieces.map(({ id: _id, ...p }) => p), labels };
}

/** Diagnóstico usado na validação do catálogo: quanto "branco de fundo" sobrou opaco junto à peça. */
export function matteResidue(data: Uint8ClampedArray | Uint8Array, w: number, h: number, bg: [number, number, number]) {
  let opaque = 0, halo = 0, borderOpaque = 0, flatWhite = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    if (data[o + 3] < 128) continue;
    opaque++;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) borderOpaque++;
    const d = Math.max(Math.abs(data[o] - bg[0]), Math.abs(data[o + 1] - bg[1]), Math.abs(data[o + 2] - bg[2]));
    if (d >= 14) continue;
    // branco liso opaco (fundo "preso" no miolo de uma peça)
    const nb = x < w - 1 ? (y * w + x + 1) * 4 : o;
    if (d < 8 && Math.abs(data[o] - data[nb]) < 3) flatWhite++;
    // pixel quase-fundo e opaco: só é aceitável no interior da peça (brilho, pérola), nunca colado à transparência
    let touches = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && data[(ny * w + nx) * 4 + 3] < 32) touches = true; }
    if (touches) halo++;
  }
  return { opaque, halo, borderOpaque, flatWhite };
}

/**
 * Ponto de clique para o segmentador (0–1): o pixel mais INTERNO da peça (transformada de distância), não o centro
 * da caixa — o centro pode cair num reflexo que a cor tirou, no vão de um aro ou num fio fino, e o segmentador
 * devolve uma máscara ruim. O ponto mais interno cai no corpo da pérola/pedra/chapa.
 */
export function keypointFor(data: Uint8ClampedArray | Uint8Array, labels: Int32Array, idx: number, p: Piece, w: number, h: number): { x: number; y: number } {
  const bw = p.w + 2, bh = p.h + 2, dist = new Int32Array(bw * bh).fill(-1), q = new Int32Array(bw * bh);
  let qh = 0, qt = 0;
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const gx = p.x + x - 1, gy = p.y + y - 1, i = gy * w + gx;
    const inside = gx >= 0 && gy >= 0 && gx < w && gy < h && labels[i] === idx && data[i * 4 + 3] >= 250;
    if (!inside) { dist[y * bw + x] = 0; q[qt++] = y * bw + x; }
  }
  let best = -1, bd = 0;
  while (qh < qt) {
    const k = q[qh++], x = k % bw, d = dist[k] + 1;
    for (const j of [x > 0 ? k - 1 : -1, x < bw - 1 ? k + 1 : -1, k - bw, k + bw]) {
      if (j < 0 || j >= bw * bh || dist[j] !== -1) continue;
      dist[j] = d; q[qt++] = j;
      if (d > bd) { bd = d; best = j; }
    }
  }
  if (best < 0) return { x: (p.x + p.w / 2) / w, y: (p.y + p.h / 2) / h };
  return { x: (p.x + (best % bw) - 1 + 0.5) / w, y: (p.y + ((best / bw) | 0) - 1 + 0.5) / h };
}

/**
 * A máscara do segmentador (IA no aparelho) é coerente com a peça? Nítida (clique no metal fino às vezes devolve
 * uma nuvem difusa), cobre a maior parte do que a extração por cor achou (sem contar a sombra) e não vaza para o
 * fundo. Se não, é descartada e fica a extração por cor.
 */
export function maskAgrees(mask: Float32Array, data: Uint8ClampedArray | Uint8Array, labels: Int32Array, idx: number, p?: Piece, w = 0): boolean {
  let piece = 0, covered = 0, fg = 0, mid = 0, inBox = 0;
  // caixa da peça com folga de 10%: a máscara de um clique na pérola de um anel fica dentro dela
  const mx = p ? p.w * 0.1 : 0, my = p ? p.h * 0.1 : 0;
  for (let i = 0; i < mask.length; i++) {
    const m = mask[i];
    if (m >= 0.5) {
      fg++;
      if (p && w) { const x = i % w, y = (i / w) | 0; if (x >= p.x - mx && x < p.x + p.w + mx && y >= p.y - my && y < p.y + p.h + my) inBox++; }
    }
    if (m > 0.15 && m < 0.85) mid++;
    const shadow = data[i * 4] === 0 && data[i * 4 + 1] === 0 && data[i * 4 + 2] === 0;
    if (labels[i] === idx && !shadow) { piece++; if (m >= 0.5) covered++; }
  }
  // a cor pode achar só o pino de uma pérola: a máscara pode ser bem maior que a peça, mas nunca o fundo todo
  if (!(piece > 0 && fg > 0 && mid / fg <= 0.3 && fg <= mask.length * 0.35)) return false;
  // cobre a peça toda, ou é uma PARTE dela (a pérola do anel) contida na caixa da peça
  return covered / piece >= 0.6 || (covered / piece >= 0.2 && inBox / fg >= 0.92);
}

/**
 * Refino para joias claras sobre fundo branco (pérolas): onde o segmentador vê a peça, o alfa sobe e a cor original
 * volta (a extração por cor confunde pérola branca com fundo/sombra); onde ele vê fundo, restos quase brancos e
 * sombras saem. Metal que o segmentador não pegou (fios finos) fica como a extração por cor deixou.
 */
export function refineWithMask(data: Uint8ClampedArray | Uint8Array, orig: Uint8ClampedArray | Uint8Array, bg: [number, number, number], mask: Float32Array, p?: Piece, w = 0): number {
  let changed = 0;
  // a limpeza (máscara diz "fundo") vale só na caixa desta peça: fora dela a máscara nada sabe das outras peças
  const mx = p ? p.w * 0.12 : 0, my = p ? p.h * 0.12 : 0;
  const inBox = (i: number) => !p || !w || ((i % w) >= p.x - mx && (i % w) < p.x + p.w + mx && ((i / w) | 0) >= p.y - my && ((i / w) | 0) < p.y + p.h + my);
  for (let i = 0; i < mask.length; i++) {
    const o = i * 4, m = mask[i], a = data[o + 3];
    if (m >= 0.5) {
      const t = Math.min(1, (m - 0.5) / 0.4), na = Math.round(t * 255);
      if (na <= a) continue;
      for (let c = 0; c < 3; c++) data[o + c] = t >= 1 ? orig[o + c] : Math.min(255, Math.max(0, Math.round((orig[o + c] - (1 - t) * bg[c]) / t)));
      data[o + 3] = na; changed++;
    } else if (m < 0.15 && a > 0 && inBox(i)) {
      const d = Math.max(Math.abs(orig[o] - bg[0]), Math.abs(orig[o + 1] - bg[1]), Math.abs(orig[o + 2] - bg[2]));
      const shadow = data[o] === 0 && data[o + 1] === 0 && data[o + 2] === 0 && a < 150;
      if (d < 40 || shadow) { data[o + 3] = 0; changed++; }
    }
  }
  return changed;
}

/**
 * Segundo clique: o ponto mais interno da região "suspeita" junto à peça — pixels que a cor removeu, mas que não
 * são o fundo exato (creme/pérola lisa). É onde ficam as pérolas que a cor apagou inteiras. null se não houver
 * mancha suspeita grande o bastante.
 */
export function suspectPoint(orig: Uint8ClampedArray | Uint8Array, data: Uint8ClampedArray | Uint8Array, bg: [number, number, number], p: Piece, w: number, h: number): { x: number; y: number } | null {
  // a pérola apagada costuma pender ABAIXO do metal achado (fora da caixa dele): procura com folga de 3/4 da peça
  const mx = Math.round(Math.max(p.w, p.h) * 0.75), my = mx;
  const x0 = Math.max(0, p.x - mx), y0 = Math.max(0, p.y - my), x1 = Math.min(w, p.x + p.w + mx), y1 = Math.min(h, p.y + p.h + my);
  const bw = x1 - x0 + 2, bh = y1 - y0 + 2, dist = new Int32Array(bw * bh).fill(-1), q = new Int32Array(bw * bh);
  let qh = 0, qt = 0;
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const gx = x0 + x - 1, gy = y0 + y - 1, i = gy * w + gx;
    let sus = false;
    if (gx >= x0 && gy >= y0 && gx < x1 && gy < y1 && data[i * 4 + 3] < 128) {
      const d = Math.max(Math.abs(orig[i * 4] - bg[0]), Math.abs(orig[i * 4 + 1] - bg[1]), Math.abs(orig[i * 4 + 2] - bg[2]));
      sus = d >= 5 && d < 90;
    }
    if (!sus) { dist[y * bw + x] = 0; q[qt++] = y * bw + x; }
  }
  let best = -1, bd = 0;
  while (qh < qt) {
    const k = q[qh++], x = k % bw, d = dist[k] + 1;
    for (const j of [x > 0 ? k - 1 : -1, x < bw - 1 ? k + 1 : -1, k - bw, k + bw]) {
      if (j < 0 || j >= bw * bh || dist[j] !== -1) continue;
      dist[j] = d; q[qt++] = j;
      if (d > bd) { bd = d; best = j; }
    }
  }
  // mancha com raio de pelo menos 1,2% do lado da foto (uma pérola, não o halo da borda)
  if (best < 0 || bd < Math.max(4, Math.min(w, h) * 0.012)) return null;
  return { x: (x0 + (best % bw) - 1 + 0.5) / w, y: (y0 + ((best / bw) | 0) - 1 + 0.5) / h };
}

/** Máscara do 2º clique: nítida, encostada na peça, dentro da caixa dela e quase sem fundo exato. */
export function suspectMaskAgrees(mask: Float32Array, orig: Uint8ClampedArray | Uint8Array, bg: [number, number, number], labels: Int32Array, idx: number, p: Piece, w: number): boolean {
  const mx = Math.max(p.w, p.h), my = mx;
  let fg = 0, mid = 0, inBox = 0, bgLike = 0, touch = 0;
  for (let i = 0; i < mask.length; i++) {
    const m = mask[i];
    if (m > 0.15 && m < 0.85) mid++;
    if (m < 0.5) continue;
    fg++;
    const x = i % w, y = (i / w) | 0;
    if (x >= p.x - mx && x < p.x + p.w + mx && y >= p.y - my && y < p.y + p.h + my) inBox++;
    const d = Math.max(Math.abs(orig[i * 4] - bg[0]), Math.abs(orig[i * 4 + 1] - bg[1]), Math.abs(orig[i * 4 + 2] - bg[2]));
    if (d < 4) bgLike++;
    if (labels[i] === idx || (x > 0 && labels[i - 1] === idx) || (x < w - 1 && labels[i + 1] === idx) || labels[i - w] === idx || labels[i + w] === idx) touch++;
  }
  return fg > 0 && touch > 0 && mid / fg <= 0.3 && inBox / fg >= 0.85 && bgLike / fg <= 0.25 && fg <= (p.w + 2 * mx) * (p.h + 2 * my) * 0.5;
}
