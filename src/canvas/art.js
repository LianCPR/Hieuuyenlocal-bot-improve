// =============================================
// ART.JS — Bộ "cọ vẽ" cho mọi card của Hiểu Uyên
// Phong cách: anime · genZ · hiphop poster
// =============================================

const { HEX } = require('../ui/theme');
const { font } = require('./engine');

// ── Random có seed (kết quả ổn định cho cùng 1 user) ──
function hashStr(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Texture ───────────────────────────────────
function halftone(ctx, { x = 0, y = 0, w, h, step = 14, radius = 2.4, color = '#ffffff', alpha = 0.07 }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let gy = y; gy < y + h; gy += step) {
    for (let gx = x; gx < x + w; gx += step) {
      ctx.beginPath();
      ctx.arc(gx, gy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function speedLines(ctx, { w, h, count = 26, color = '#ffffff', alpha = 0.05, seed = 7 }) {
  const r = rng(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i++) {
    const y = r() * h;
    const len = 80 + r() * (w * 0.5);
    ctx.lineWidth = 0.6 + r() * 2.4;
    ctx.beginPath();
    ctx.moveTo(-40, y);
    ctx.lineTo(-40 + len, y - 30 - r() * 60);
    ctx.stroke();
  }
  ctx.restore();
}

function grain(ctx, { w, h, count = 2600, seed = 11, alpha = 0.05 }) {
  const r = rng(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.3 + r());
    ctx.fillStyle = r() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(r() * w, r() * h, 1, 1);
  }
  ctx.restore();
}

function sparkles(ctx, { w, h, count = 26, seed = 3, color = '#ffffff', alpha = 0.9 }) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = r() * w;
    const y = r() * h;
    const size = 2 + r() * 6;
    star4(ctx, x, y, size, color, alpha * (0.35 + r() * 0.65));
  }
}

function vignette(ctx, w, h, strength = 0.55) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function splatter(ctx, { cx, cy, count = 40, seed = 5, color = HEX.hot, maxR = 90, alpha = 0.5 }) {
  const r = rng(seed);
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.pow(r(), 0.6) * maxR;
    ctx.globalAlpha = alpha * (0.2 + r() * 0.8);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, 1 + r() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Hiphop textures ───────────────────────────
/** Tường gạch / bê tông sau lớp poster */
function bricks(ctx, { x = 0, y = 0, w, h, step = 68, rowH = 30, color = '#ffffff', alpha = 0.045 }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const rows = Math.ceil(h / rowH);
  for (let r = 0; r <= rows; r++) {
    const yy = y + r * rowH;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
    const shift = r % 2 ? step / 2 : 0;
    for (let xx = x + shift; xx < x + w; xx += step) {
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy + rowH);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Mây sơn xịt (spray can) */
function spray(ctx, { cx, cy, r = 160, color = HEX.lime, count = 180, seed = 7, alpha = 0.35 }) {
  const rnd = rng(seed);
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, rgba(color, alpha * 0.45));
  g.addColorStop(0.6, rgba(color, alpha * 0.18));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.pow(rnd(), 0.55) * r;
    ctx.globalAlpha = alpha * (0.12 + rnd() * 0.8);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.5 + rnd() * 2.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Vệt sơn ch�ảy nhỏ giọt dưới băng dính */
function drips(ctx, { x, y, w, color = HEX.hot, count = 7, seed = 5, alpha = 0.85, maxLen = 64, thickness = 7 }) {
  const rnd = rng(seed);
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fillRect(x, y, w, thickness);

  for (let i = 0; i < count; i++) {
    const dx = x + 8 + rnd() * Math.max(1, w - 16);
    const len = 10 + rnd() * maxLen;
    const rad = 2 + rnd() * 4.2;
    ctx.beginPath();
    ctx.moveTo(dx - rad, y + thickness);
    ctx.quadraticCurveTo(dx - rad * 1.5, y + thickness + len * 0.62, dx, y + thickness + len);
    ctx.quadraticCurveTo(dx + rad * 1.5, y + thickness + len * 0.62, dx + rad, y + thickness);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dx, y + thickness + len, rad * 0.82, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Gạch chân kiểu bút marker */
function tagLine(ctx, { x, y, w, color = HEX.lime, width = 6, seed = 9, alpha = 0.9 }) {
  const rnd = rng(seed);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  const seg = 6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 1; i <= seg; i++) {
    const px = x + (w / seg) * i;
    ctx.quadraticCurveTo(px - (w / seg) * 0.5, y + (rnd() - 0.5) * width * 1.8, px, y + (rnd() - 0.5) * width);
  }
  ctx.stroke();

  ctx.globalAlpha = alpha * 0.45;
  ctx.lineWidth = width * 0.42;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + width * 1.1);
  ctx.lineTo(x + w * 0.64, y + width * 0.85);
  ctx.stroke();
  ctx.restore();
}

/** Burst comic kiểu sticker hiphop */
function burst(ctx, { cx, cy, r = 80, points = 14, fill = HEX.gold, stroke = '#08070C', rotate = 0, alpha = 1, lineWidth = 3 }) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotate);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 ? r * 0.7 : r;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

/** Băng cassette mixtape */
function cassette(ctx, { x, y, w = 180, rotate = -0.06, color = HEX.lime, label = 'MIXTAPE' }) {
  const h = w * 0.6;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rotate);

  roundRect(ctx, -w / 2, -h / 2, w, h, 10);
  ctx.fillStyle = '#100E18';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  roundRect(ctx, -w * 0.38, -h * 0.3, w * 0.76, h * 0.3, 5);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = '#08070C';
  ctx.font = font(h * 0.15, 'bold', 'mono');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, -h * 0.15);

  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(dir * w * 0.2, h * 0.16, h * 0.11, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dir * w * 0.2, h * 0.16, h * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = '#08070C';
    ctx.fill();
  }

  ctx.strokeStyle = rgba(color, 0.55);
  ctx.lineWidth = 1.4;
  roundRect(ctx, -w * 0.42, -h * 0.42, w * 0.84, h * 0.84, 6);
  ctx.stroke();
  ctx.restore();
  return { w, h };
}

// ── Background poster ─────────────────────────
function bgPoster(ctx, {
  w, h, seed = 1, accent = HEX.hot, accent2 = HEX.neon, accent3 = HEX.cyber,
  base = '#07060D', dots = true, lines = true, noise = true
}) {
  // base
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, base);
  g.addColorStop(0.55, '#0C0A16');
  g.addColorStop(1, '#05040A');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // big diagonal colour slabs
  ctx.save();
  ctx.globalAlpha = 0.22;
  const glow1 = ctx.createLinearGradient(0, 0, w * 0.8, h);
  glow1.addColorStop(0, accent);
  glow1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow1;
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, h * 0.05);
  ctx.lineTo(w * 0.55, -h * 0.1);
  ctx.lineTo(w * 0.28, h * 1.05);
  ctx.lineTo(-w * 0.1, h * 0.85);
  ctx.closePath();
  ctx.fill();

  const glow2 = ctx.createLinearGradient(w, h, w * 0.3, 0);
  glow2.addColorStop(0, accent2);
  glow2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow2;
  ctx.beginPath();
  ctx.moveTo(w * 1.05, h * 0.15);
  ctx.lineTo(w * 0.72, -h * 0.1);
  ctx.lineTo(w * 0.9, h * 1.05);
  ctx.lineTo(w * 1.05, h * 0.95);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // soft aura orbs
  ctx.save();
  ctx.globalAlpha = 0.3;
  const orb = ctx.createRadialGradient(w * 0.82, h * 0.22, 0, w * 0.82, h * 0.22, w * 0.32);
  orb.addColorStop(0, accent3);
  orb.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  if (dots) halftone(ctx, { x: 0, y: 0, w, h, step: 16, radius: 2.1, color: '#ffffff', alpha: 0.045 });
  if (lines) speedLines(ctx, { w, h, count: 22, color: '#ffffff', alpha: 0.045, seed });
  if (noise) grain(ctx, { w, h, count: Math.round((w * h) / 900), seed });
  vignette(ctx, w, h, 0.62);
}

// ── Text helpers ──────────────────────────────
function textFit(ctx, text, maxWidth, startSize, weight = 'bold', family = 'display') {
  let size = startSize;
  ctx.font = font(size, weight, family);
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 1;
    ctx.font = font(size, weight, family);
  }
  return size;
}

/** Chữ neon: nhiều lớp glow + viền */
function neonText(ctx, {
  text, x, y, size = 40, color = HEX.hot, fill = '#FFFFFF',
  align = 'left', weight = 'bold', family = 'display', glow = 22, stroke = 0, baseline = 'alphabetic'
}) {
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.font = font(size, weight, family);
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  if (stroke > 0) {
    ctx.lineWidth = stroke;
    ctx.strokeStyle = color;
    ctx.strokeText(text, x, y);
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Chữ offset kiểu graffiti sticker */
function outlineText(ctx, { text, x, y, size, fill = '#fff', stroke = HEX.ink, offset = 4, align = 'left', family = 'display' }) {
  ctx.save();
  ctx.textAlign = align;
  ctx.font = font(size, 'bold', family);
  ctx.lineJoin = 'round';
  ctx.fillStyle = stroke;
  ctx.fillText(text, x + offset, y + offset);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(3, size * 0.12);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ── Shapes ────────────────────────────────────
function star4(ctx, cx, cy, r, color = '#fff', alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + r * 0.16, cy - r * 0.16, cx + r, cy);
  ctx.quadraticCurveTo(cx + r * 0.16, cy + r * 0.16, cx, cy + r);
  ctx.quadraticCurveTo(cx - r * 0.16, cy + r * 0.16, cx - r, cy);
  ctx.quadraticCurveTo(cx - r * 0.16, cy - r * 0.16, cx, cy - r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function heart(ctx, cx, cy, size, color = HEX.hot, alpha = 1) {
  const s = size / 30;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 12 * s);
  ctx.bezierCurveTo(cx - 34 * s, cy - 8 * s, cx - 22 * s, cy - 28 * s, cx, cy - 12 * s);
  ctx.bezierCurveTo(cx + 22 * s, cy - 28 * s, cx + 34 * s, cy - 8 * s, cx, cy + 12 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Sticker nghiêng — dùng cho badge/tag */
function sticker(ctx, {
  x, y, text, size = 22, fill = HEX.hot, color = '#FFFFFF',
  rotate = -0.05, padX = 18, padY = 10, family = 'display', border = 'rgba(0,0,0,0.35)', shadow = true
}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotate);
  ctx.font = font(size, 'bold', family);
  const w = ctx.measureText(text).width + padX * 2;
  const h = size + padY * 2;

  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
  }
  // sticker body
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, fill);
  g.addColorStop(1, mixHex(fill, '#000000', 0.25));
  ctx.fillStyle = g;
  roundRect(ctx, -w / 2, -h / 2, w, h, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  roundRect(ctx, -w / 2, -h / 2, w, h, 8);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
  return { w, h };
}

/** Dải băng chạy chữ kiểu băng dính / marquee */
function tape(ctx, { x, y, w, h, text, fill = HEX.hot, color = HEX.ink, size = 18, rotate = 0, repeat = 3 }) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rotate);
  ctx.fillStyle = fill;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // mép răng cưa nhẹ
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = color;
  for (let i = -w / 2; i < w / 2; i += 18) {
    ctx.fillRect(i, -h / 2, 9, h);
  }
  ctx.globalAlpha = 1;

  ctx.font = font(size, 'bold', 'display');
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const unit = text + '   //   ';
  const one = ctx.measureText(unit).width;
  let draw = '';
  while (ctx.measureText(draw).width < w) draw += unit;
  ctx.save();
  roundRect(ctx, -w / 2, -h / 2, w, h, 4);
  ctx.clip();
  ctx.fillText(draw.repeat(Math.max(1, repeat)), -w / 2 + 8, 1);
  ctx.restore();
  ctx.restore();
}

/** Khung viền poster với góc cắt */
function frame(ctx, { w, h, color = HEX.hot, inset = 18, alpha = 0.85, width = 2, corners = true }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);

  if (corners) {
    const l = Math.min(56, w * 0.06);
    ctx.lineWidth = width * 3;
    const pts = [
      [inset, inset, 1, 1], [w - inset, inset, -1, 1],
      [inset, h - inset, 1, -1], [w - inset, h - inset, -1, -1]
    ];
    for (const [px, py, sx, sy] of pts) {
      ctx.beginPath();
      ctx.moveTo(px, py + sy * l);
      ctx.lineTo(px, py);
      ctx.lineTo(px + sx * l, py);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Thanh tiến độ sọc chéo */
function bar(ctx, {
  x, y, w, h, pct = 0, from = HEX.hot, to = HEX.neon,
  track = 'rgba(255,255,255,0.09)', radius = null, stripes = true, glow = true
}) {
  const r = radius === null ? h / 2 : radius;
  ctx.save();
  // track
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = track;
  ctx.fill();

  const fillW = Math.max(h, Math.min(w, w * Math.max(0, Math.min(1, pct))));

  ctx.save();
  roundRect(ctx, x, y, fillW, h, r);
  ctx.clip();

  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, from);
  grad.addColorStop(1, to);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, fillW, h);

  if (stripes) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000000';
    for (let i = -h; i < fillW + h; i += 14) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + h);
      ctx.lineTo(x + i + 7, y + h);
      ctx.lineTo(x + i + 7 + h, y);
      ctx.lineTo(x + i + h, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  // glossy highlight
  ctx.globalAlpha = 0.22;
  roundRect(ctx, x, y, fillW, h * 0.45, r);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  if (glow) {
    ctx.globalAlpha = 1;
    ctx.shadowColor = to;
    ctx.shadowBlur = 16;
    roundRect(ctx, x, y, fillW, h, r);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

/** Con dấu tròn kiểu rank stamp */
function stamp(ctx, { x, y, r = 62, top = 'RANK', big = 'SSR', bottom = 'ERA', color = HEX.gold, rotate = -0.16 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotate);

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10,8,16,0.72)';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(0, 0, r - 9, 0, Math.PI * 2);
  ctx.setLineDash([4, 7]);
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 0.7;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = font(r * 0.2, 'bold', 'mono');
  ctx.fillText(top, 0, -r * 0.42);

  ctx.fillStyle = '#ffffff';
  ctx.font = font(r * 0.62, 'bold', 'display');
  ctx.fillText(big, 0, r * 0.16);

  ctx.fillStyle = color;
  ctx.font = font(r * 0.18, 'bold', 'mono');
  ctx.fillText(bottom, 0, r * 0.52);
  ctx.restore();
}

/** Hoa văn holographic cho card gacha */
function holo(ctx, { x, y, w, h, alpha = 0.12, seed = 4, colors = ['#FF2D95', '#22D3EE', '#A855F7', '#FACC15'] }) {
  const r = rng(seed);
  ctx.save();
  roundRect(ctx, x, y, w, h, 14);
  ctx.clip();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = colors[i % colors.length];
    const sx = x - h + r() * (w + h);
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(sx + 26 + r() * 40, y);
    ctx.lineTo(sx + 60 + r() * 40, y);
    ctx.lineTo(sx + 34, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ── Anime chibi portrait ──────────────────────
/**
 * Vẽ chân dung chibi cho card gacha.
 * palette: { skin, hair, eye, aura }
 */
function chibi(ctx, { cx, cy, r, palette = {}, accessory = 'none', seed = 9 }) {
  const { skin = '#FFE0C9', hair = '#FF6FA8', eye = '#7C4DFF', aura = '#22D3EE' } = palette;
  const rnd = rng(seed);
  const hairDark = mixHex(hair, '#000000', 0.42);
  const hairLight = mixHex(hair, '#ffffff', 0.3);
  const skinShadow = mixHex(skin, '#E29A86', 0.35);

  ctx.save();

  // aura glow behind
  const auraGrad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.7);
  auraGrad.addColorStop(0, aura);
  auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // shoulders
  ctx.fillStyle = mixHex(hair, '#120C18', 0.55);
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 1.34, r * 1.1, r * 0.62, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // back hair
  ctx.fillStyle = hairDark;
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.16, r * 1.03, r * 1.24, 0, 0, Math.PI * 2);
  ctx.fill();

  // neck
  ctx.fillStyle = skinShadow;
  roundRect(ctx, cx - r * 0.17, cy + r * 0.5, r * 0.34, r * 0.42, r * 0.1);
  ctx.fill();

  // face
  const faceY = cy + r * 0.02;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(cx, faceY, r * 0.84, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();

  // cheek shading
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = skinShadow;
  ctx.beginPath();
  ctx.ellipse(cx, faceY + r * 0.66, r * 0.56, r * 0.14, 0, 0, Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;

  // bangs (zigzag mái ngố)
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.88, cy + r * 0.04);
  ctx.quadraticCurveTo(cx - r * 0.98, cy - r * 0.86, cx, cy - r * 0.92);
  ctx.quadraticCurveTo(cx + r * 0.98, cy - r * 0.86, cx + r * 0.88, cy + r * 0.04);
  ctx.quadraticCurveTo(cx + r * 0.6, cy - r * 0.16, cx + r * 0.38, cy - r * 0.2);
  ctx.quadraticCurveTo(cx + r * 0.16, cy + r * 0.02, cx - r * 0.02, cy - r * 0.24);
  ctx.quadraticCurveTo(cx - r * 0.24, cy + r * 0.02, cx - r * 0.46, cy - r * 0.2);
  ctx.quadraticCurveTo(cx - r * 0.68, cy - r * 0.16, cx - r * 0.88, cy + r * 0.04);
  ctx.closePath();
  ctx.fill();

  // side locks
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * r * 0.8, cy - r * 0.24);
    ctx.quadraticCurveTo(cx + dir * r * 1.02, cy + r * 0.6, cx + dir * r * 0.82, cy + r * 1.0);
    ctx.quadraticCurveTo(cx + dir * r * 0.66, cy + r * 0.44, cx + dir * r * 0.62, cy - r * 0.12);
    ctx.closePath();
    ctx.fillStyle = hair;
    ctx.fill();
  }

  // hair highlight + rim light
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = hairLight;
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.08, r * 0.62, Math.PI * 1.18, Math.PI * 1.55);
  ctx.stroke();

  ctx.globalAlpha = 0.32;
  ctx.lineWidth = r * 0.035;
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.16, r * 1.02, Math.PI * 1.65, Math.PI * 2.15);
  ctx.stroke();
  ctx.restore();

  // eyes
  const eyeY = cy + r * 0.12;
  for (const dir of [-1, 1]) {
    const ex = cx + dir * r * 0.33;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, r * 0.19, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    const iris = ctx.createLinearGradient(ex, eyeY - r * 0.24, ex, eyeY + r * 0.24);
    iris.addColorStop(0, mixHex(eye, '#ffffff', 0.45));
    iris.addColorStop(1, mixHex(eye, '#1A0B20', 0.3));
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY + r * 0.02, r * 0.15, r * 0.21, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1A1020';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY + r * 0.03, r * 0.07, r * 0.115, 0, 0, Math.PI * 2);
    ctx.fill();

    // highlights
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ex - r * 0.055, eyeY - r * 0.075, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + r * 0.05, eyeY + r * 0.06, r * 0.026, 0, Math.PI * 2);
    ctx.fill();

    // lash + lid
    ctx.strokeStyle = '#241528';
    ctx.lineWidth = r * 0.05;
    ctx.beginPath();
    ctx.arc(ex, eyeY - r * 0.01, r * 0.19, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();

    // brows
    ctx.lineWidth = r * 0.035;
    ctx.strokeStyle = mixHex(hairDark, '#000000', 0.2);
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.12, eyeY - r * 0.38);
    ctx.quadraticCurveTo(ex, eyeY - r * 0.46, ex + r * 0.13, eyeY - r * 0.36);
    ctx.stroke();

    // blush
    ctx.fillStyle = 'rgba(255,110,150,0.42)';
    ctx.beginPath();
    ctx.ellipse(ex + dir * r * 0.08, eyeY + r * 0.33, r * 0.12, r * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // nose + mouth
  ctx.strokeStyle = 'rgba(120,60,70,0.45)';
  ctx.lineWidth = r * 0.025;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.02, cy + r * 0.31);
  ctx.lineTo(cx + r * 0.035, cy + r * 0.31);
  ctx.stroke();

  ctx.strokeStyle = '#8A3248';
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.39, r * 0.1, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // accessory
  if (accessory === 'catEars') {
    ctx.fillStyle = hair;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * r * 0.52, cy - r * 0.78);
      ctx.lineTo(cx + dir * r * 0.9, cy - r * 1.32);
      ctx.lineTo(cx + dir * r * 0.98, cy - r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,120,170,0.6)';
      ctx.beginPath();
      ctx.moveTo(cx + dir * r * 0.62, cy - r * 0.82);
      ctx.lineTo(cx + dir * r * 0.86, cy - r * 1.14);
      ctx.lineTo(cx + dir * r * 0.88, cy - r * 0.76);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hair;
    }
  } else if (accessory === 'horns') {
    for (const dir of [-1, 1]) {
      const hornGrad = ctx.createLinearGradient(
        cx + dir * r * 0.4, cy - r * 0.8,
        cx + dir * r * 0.7, cy - r * 1.36
      );
      hornGrad.addColorStop(0, mixHex(eye, '#ffffff', 0.15));
      hornGrad.addColorStop(1, mixHex(eye, '#ffffff', 0.55));
      ctx.fillStyle = hornGrad;
      ctx.beginPath();
      ctx.moveTo(cx + dir * r * 0.46, cy - r * 0.82);
      ctx.quadraticCurveTo(cx + dir * r * 0.86, cy - r * 1.18, cx + dir * r * 0.58, cy - r * 1.36);
      ctx.quadraticCurveTo(cx + dir * r * 0.7, cy - r * 1.05, cx + dir * r * 0.34, cy - r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = r * 0.02;
      ctx.stroke();
    }
  } else if (accessory === 'halo') {
    ctx.strokeStyle = '#FACC15';
    ctx.shadowColor = '#FACC15';
    ctx.shadowBlur = 26;
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 1.22, r * 0.62, r * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (accessory === 'headphones') {
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.1, r * 1.02, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    ctx.fillStyle = '#22D3EE';
    for (const dir of [-1, 1]) {
      roundRect(ctx, cx + dir * r * 1.02 - r * 0.14, cy - r * 0.18, r * 0.28, r * 0.46, r * 0.1);
      ctx.fill();
    }
  } else if (accessory === 'bunnyEars') {
    ctx.fillStyle = hair;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + dir * r * 0.38, cy - r * 1.28, r * 0.2, r * 0.5, dir * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,150,190,0.55)';
      ctx.beginPath();
      ctx.ellipse(cx + dir * r * 0.38, cy - r * 1.28, r * 0.09, r * 0.32, dir * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hair;
    }
  }

  // sparkles quanh mặt
  for (let i = 0; i < 5; i++) {
    const a = rnd() * Math.PI * 2;
    const d = r * (1.1 + rnd() * 0.6);
    star4(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 4 + rnd() * 7, '#ffffff', 0.5 + rnd() * 0.5);
  }

  ctx.restore();
}

// ── Color utils ───────────────────────────────
function hexToRgb(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixHex(a, b, t = 0.5) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(A.r, B.r)}${c(A.g, B.g)}${c(A.b, B.b)}`;
}

function rgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── roundRect (không phụ thuộc ctx.roundRect) ──
function roundRect(ctx, x, y, w, h, r = 12) {
  const radius = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

module.exports = {
  hashStr, rng, hexToRgb, mixHex, rgba, roundRect,
  halftone, speedLines, grain, sparkles, vignette, splatter, holo,
  bricks, spray, drips, tagLine, burst, cassette,
  bgPoster, textFit, neonText, outlineText,
  star4, heart, sticker, tape, frame, bar, stamp, chibi
};
