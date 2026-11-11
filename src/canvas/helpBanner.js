// =============================================
// HELP BANNER — poster ngang cho menu /help
// =============================================

const { createCanvas, font, drawAvatar } = require('./engine');
const art = require('./art');
const { HEX } = require('../ui/theme');

const W = 1200;
const H = 380;
const FILE_NAME = 'help-banner.png';
const cache = new Map();

const hex = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? `#${n.toString(16).padStart(6, '0')}` : HEX.hot;
};

const fit = (ctx, text, maxWidth, start, family = 'display', weight = 'bold') => {
  let size = start;
  ctx.font = font(size, weight, family);
  while (ctx.measureText(text).width > maxWidth && size > 12) {
    size -= 1;
    ctx.font = font(size, weight, family);
  }
  return size;
};

async function drawAvatarSticker(ctx, { url, x, y, size = 108, accent = HEX.hot, accent2 = HEX.cyber }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.035);

  // miếng băng dính sau ảnh
  ctx.save();
  ctx.translate(-size / 2 + 10, -size / 2 - 7);
  ctx.rotate(-0.16);
  ctx.fillStyle = 'rgba(245,239,230,0.38)';
  ctx.fillRect(0, 0, 36, 15);
  ctx.restore();

  // nền giấy của photo sticker
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#F4EEE4';
  art.roundRect(ctx, -size / 2, -size / 2, size, size, 13);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(8,7,12,0.6)';
  ctx.lineWidth = 2;
  art.roundRect(ctx, -size / 2, -size / 2, size, size, 13);
  ctx.stroke();

  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2;
  art.roundRect(ctx, -size / 2 + 6, -size / 2 + 6, size - 12, size - 12, 9);
  ctx.stroke();
  ctx.globalAlpha = 1;

  await drawAvatar(ctx, {
    url,
    cx: 0,
    cy: 0,
    r: size / 2 - 11,
    ring: accent,
    ring2: accent2,
    label: 'H'
  });

  ctx.restore();
}

function drawChips(ctx, chips = [], accent = HEX.hot) {
  const fills = [accent, HEX.cyber, HEX.gold];
  const centers = [132, 334, 536];

  chips.slice(0, 3).forEach((chip, i) => {
    art.sticker(ctx, {
      x: centers[i],
      y: 308,
      text: String(chip).toUpperCase().slice(0, 18),
      size: String(chip).length > 10 ? 13 : 15,
      fill: fills[i],
      color: HEX.ink,
      rotate: i % 2 ? 0.025 : -0.02,
      shadow: true
    });
  });
}

async function render(meta = {}) {
  const key = meta.key || 'overview';
  const accent = meta.accentHex || hex(meta.accent);
  const total = Number(meta.total) || 8;
  const index = Number(meta.index) || 0;
  const number = String(index + 1).padStart(2, '0');
  const totalLabel = String(total).padStart(2, '0');
  const seed = art.hashStr(`help:${key}`);
  const poster = String(meta.poster || meta.label || 'HELP').toUpperCase();
  const tagline = meta.tagline || 'anime · genZ · hiphop';

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  art.bgPoster(ctx, {
    w: W, h: H, seed,
    accent, accent2: HEX.neon, accent3: HEX.cyber
  });
  art.bricks(ctx, { w: W, h: H, alpha: 0.045, color: '#FFFFFF', step: 70, rowH: 30 });
  art.spray(ctx, { cx: W - 170, cy: 140, r: 250, color: accent, seed: seed + 1, alpha: 0.34 });
  art.spray(ctx, { cx: 120, cy: 330, r: 190, color: HEX.cyber, seed: seed + 2, alpha: 0.16 });
  art.splatter(ctx, { cx: W - 140, cy: 180, maxR: 160, color: accent, seed: seed + 3, alpha: 0.28 });
  art.sparkles(ctx, { w: W, h: 250, count: 18, seed: seed + 4 });
  art.drips(ctx, { x: 0, y: 0, w: 150, color: accent, seed: seed + 5, count: 4, maxLen: 36, alpha: 0.45 });
  art.frame(ctx, { w: W, h: H, color: accent, inset: 14, alpha: 0.5, width: 1.5 });

  art.burst(ctx, {
    cx: 1060, cy: 190, r: 126, points: 15,
    fill: accent, stroke: HEX.ink, rotate: -0.08, alpha: 0.13, lineWidth: 2.5
  });

  // ── header ──
  ctx.textAlign = 'left';
  ctx.fillStyle = HEX.cyber;
  ctx.font = font(12, 'bold', 'mono');
  ctx.fillText('HIỂU UYÊN  //  COMMAND DECK', 64, 52);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.52)';
  ctx.font = font(11, 'normal', 'mono');
  ctx.fillText('ANIME · GENZ · HIPHOP', W - 64, 52);

  // ── brand ──
  ctx.textAlign = 'left';
  art.outlineText(ctx, {
    text: 'HIỂU UYÊN',
    x: 64, y: 142,
    size: fit(ctx, 'HIỂU UYÊN', 720, 76),
    fill: '#FFFFFF', stroke: HEX.ink, offset: 4
  });

  ctx.fillStyle = accent;
  ctx.font = font(12, 'bold', 'mono');
  ctx.fillText(`TAB ${number} / ${totalLabel}  ·  ${String(meta.label || poster).toUpperCase()}`, 66, 174);

  art.outlineText(ctx, {
    text: poster,
    x: 64, y: 226,
    size: fit(ctx, poster, 750, 54),
    fill: accent, stroke: HEX.ink, offset: 4
  });

  art.tagLine(ctx, { x: 66, y: 242, w: 420, color: HEX.lime, width: 5, seed: seed + 6, alpha: 0.8 });

  ctx.fillStyle = 'rgba(255,255,255,0.74)';
  ctx.font = font(fit(ctx, tagline, 720, 20, 'body', 'normal'), 'normal', 'body');
  ctx.fillText(tagline, 66, 278);

  drawChips(ctx, meta.chips, accent);

  // ── tab number ──
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = font(13, 'bold', 'mono');
  ctx.fillText('TAB', W - 64, 94);

  art.outlineText(ctx, {
    text: number,
    x: W - 64, y: 264,
    size: 190,
    fill: accent, stroke: HEX.ink, offset: 6, align: 'right'
  });

  ctx.textAlign = 'right';
  ctx.fillStyle = accent;
  ctx.font = font(18, 'bold', 'mono');
  ctx.fillText(`/ ${totalLabel}`, W - 64, 300);

  // ── bot identity sticker ──
  await drawAvatarSticker(ctx, {
    url: meta.avatar,
    x: 850, y: 164, size: 108,
    accent, accent2: HEX.cyber
  });
  art.sticker(ctx, {
    x: 892, y: 114,
    text: 'BOT',
    size: 9,
    fill: HEX.lime,
    color: HEX.ink,
    family: 'mono',
    rotate: 0.06,
    padX: 10,
    padY: 4,
    shadow: true
  });
  art.sticker(ctx, {
    x: 850, y: 242,
    text: 'HIỂU UYÊN',
    size: 12,
    fill: accent,
    color: HEX.ink,
    family: 'body',
    rotate: -0.03,
    shadow: true
  });

  // ── bottom tape ──
  art.tape(ctx, {
    x: -8, y: H - 34, w: W + 16, h: 28,
    text: 'HIỂU UYÊN · COMMAND DECK · 27 COMMANDS · NO SKIP',
    fill: accent, color: HEX.ink, size: 11, rotate: -0.004
  });

  return canvas.toBuffer('image/png');
}

/** Cache theo tab — banner chỉ phụ thuộc metadata tab, không cần render lại mỗi lần bấm. */
async function generateHelpBanner(meta = {}) {
  const key = meta.key || 'overview';
  const avatarKey = Buffer.isBuffer(meta.avatar)
    ? `buffer:${meta.avatar.length}`
    : String(meta.avatar || '');
  const cacheKey = `${key}|${avatarKey}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const buffer = await render({ ...meta, key });
  cache.set(cacheKey, buffer);
  return buffer;
}

module.exports = { generateHelpBanner, HELP_BANNER_FILE: FILE_NAME };
