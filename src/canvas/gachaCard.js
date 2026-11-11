// =============================================
// GACHA CARD — thẻ bài anime (720x1000)
// =============================================

const { createCanvas, font } = require('./engine');
const art = require('./art');
const { HEX, rarityMeta } = require('../ui/theme');

const fit = (ctx, text, maxWidth, start, family = 'display') => {
  let size = start;
  ctx.font = font(size, 'bold', family);
  while (ctx.measureText(text).width > maxWidth && size > 12) {
    size -= 1;
    ctx.font = font(size, 'bold', family);
  }
  return size;
};

/**
 * @param {object} card   - entry trong src/data/cards.js
 * @param {{owner?:string,isNew?:boolean}} opts
 */
async function generateGachaCard(card, { owner = '', isNew = false } = {}) {
  const W = 720, H = 1000;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const meta = rarityMeta(card.rarity);
  const accent = meta.hex;
  const palette = card.palette || {};
  const seed = art.hashStr(card.id + owner);

  // background: aura gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0B0812');
  bg.addColorStop(0.45, art.mixHex(palette.aura || HEX.neon, '#0B0812', 0.78));
  bg.addColorStop(1, '#05040A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // rays behind character
  ctx.save();
  const rnd = art.rng(seed);
  ctx.globalAlpha = 0.14;
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2;
    ctx.fillStyle = i % 2 ? accent : (palette.aura || HEX.neon);
    ctx.beginPath();
    ctx.moveTo(W / 2, 420);
    ctx.arc(W / 2, 420, 900, a, a + 0.05);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  art.bricks(ctx, { w: W, h: H, alpha: 0.05, color: '#FFFFFF', step: 66, rowH: 29 });
  art.spray(ctx, { cx: W / 2, cy: 420, r: 310, color: accent, seed: seed + 5, alpha: 0.22 });
  art.halftone(ctx, { x: 0, y: 0, w: W, h: H, step: 16, radius: 2.2, color: '#ffffff', alpha: 0.05 });
  art.holo(ctx, { x: 0, y: 0, w: W, h: H, alpha: 0.08, seed });
  art.grain(ctx, { w: W, h: H, count: 3600, seed: seed + 2, alpha: 0.05 });

  // frame
  art.frame(ctx, { w: W, h: H, color: accent, inset: 20, alpha: 0.9, width: 3 });

  // rarity + element chips
  art.sticker(ctx, {
    x: 106, y: 74, text: `// ${meta.label}`, size: 20,
    fill: accent, color: '#0B0A12', rotate: -0.04
  });
  art.sticker(ctx, {
    x: 560, y: 74, text: card.element.toUpperCase(), size: 16,
    fill: '#0B0A12', color: palette.aura || HEX.cyber, rotate: 0.05,
    border: palette.aura || HEX.cyber
  });

  if (isNew) {
    art.sticker(ctx, { x: 620, y: 152, text: 'NEW!', size: 18, fill: HEX.lime, color: '#0B0A12', rotate: 0.14 });
  }

  // character
  art.chibi(ctx, {
    cx: W / 2, cy: 420, r: 150,
    palette, accessory: card.accessory, seed
  });

  // rarity stars (vẽ shape — font canvas không có glyph ★)
  const starCount = ['N', 'R', 'SR', 'SSR', 'UR'].indexOf(card.rarity) + 1;
  for (let i = 0; i < starCount; i++) {
    const sx = W / 2 - (starCount - 1) * 16 + i * 32;
    art.star4(ctx, sx, 656, 11, accent, 1);
  }

  // name
  art.outlineText(ctx, {
    text: card.name, x: W / 2, y: 736, size: fit(ctx, card.name, 600, 52),
    fill: '#FFFFFF', stroke: '#0B0A12', offset: 4, align: 'center'
  });

  // quote
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = font(15, 'normal', 'body');
  const quote = `“${card.quote}”`;
  const words = quote.split(' ');
  let line = '';
  let ly = 774;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > 580 && line) {
      ctx.fillText(line.trim(), W / 2, ly);
      line = word + ' ';
      ly += 24;
    } else line = test;
  }
  if (line) ctx.fillText(line.trim(), W / 2, ly);

  // stats
  const stats = [
    { label: 'POWER', value: card.power, color: HEX.hot },
    { label: 'VIBE', value: card.vibe, color: HEX.cyber },
    { label: 'CHARM', value: card.charm, color: HEX.neon }
  ];
  stats.forEach((s, i) => {
    const y = 852 + i * 36;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = font(11, 'bold', 'mono');
    ctx.fillText(s.label, 92, y + 10);

    art.bar(ctx, {
      x: 178, y, w: 380, h: 12,
      pct: s.value / 100, from: s.color, to: accent, stripes: false, glow: false
    });

    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(14, 'bold', 'mono');
    ctx.fillText(String(s.value), 632, y + 11);
  });

  // footer tape
  art.tape(ctx, {
    x: -20, y: H - 56, w: W + 40, h: 30,
    text: 'HIỂU UYÊN MIXTAPE · ANIME GENZ HIPHOP',
    fill: accent, color: '#0B0A12', size: 13, rotate: -0.01
  });

  if (owner) {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = font(11, 'normal', 'mono');
    ctx.fillText(`OWNER // ${String(owner).slice(0, 22)}`, 30, 44);
  }

  return canvas.toBuffer('image/png');
}

module.exports = { generateGachaCard };
