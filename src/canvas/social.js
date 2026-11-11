// =============================================
// SOCIAL CARDS — ship · sticker · welcome
// =============================================

const { createCanvas, drawAvatar, font } = require('./engine');
const art = require('./art');
const { HEX } = require('../ui/theme');

const spaced = (s) => s.split('').join(' ');

const fit = (ctx, text, maxWidth, start, family = 'display', weight = 'bold') => {
  let size = start;
  ctx.font = font(size, weight, family);
  while (ctx.measureText(text).width > maxWidth && size > 12) {
    size -= 1;
    ctx.font = font(size, weight, family);
  }
  return size;
};

// ── SHIP CARD ─────────────────────────────────
/**
 * @param {{name1:string,name2:string,score:number,verdict:string,line:string,avatar1?:string,avatar2?:string}} data
 */
async function generateShipCard({ name1 = 'A', name2 = 'B', score = 50, verdict = 'CHILL', line = '', avatar1 = null, avatar2 = null } = {}) {
  const W = 1000, H = 560;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const seed = art.hashStr(name1 + name2);

  art.bgPoster(ctx, { w: W, h: H, seed, accent: HEX.hot, accent2: HEX.neon, accent3: HEX.cyber });
  art.bricks(ctx, { w: W, h: H, alpha: 0.05, color: '#FFFFFF', step: 70, rowH: 30 });
  art.spray(ctx, { cx: 216, cy: 268, r: 220, color: HEX.hot, seed: seed + 3, alpha: 0.2 });
  art.spray(ctx, { cx: 784, cy: 268, r: 220, color: HEX.cyber, seed: seed + 4, alpha: 0.2 });
  art.splatter(ctx, { cx: 230, cy: 270, maxR: 210, color: HEX.hot, seed, alpha: 0.3 });
  art.splatter(ctx, { cx: 770, cy: 270, maxR: 210, color: HEX.cyber, seed: seed + 1, alpha: 0.3 });
  art.sparkles(ctx, { w: W, h: 300, count: 16, seed: seed + 2 });
  art.drips(ctx, { x: 0, y: 0, w: 150, color: HEX.hot, seed: seed + 7, count: 4, maxLen: 38, alpha: 0.45 });
  art.tape(ctx, {
    x: 620, y: 22, w: 340, h: 24,
    text: 'SHIP CYPHER · NO EDIT · HIỂU UYÊN',
    fill: HEX.lime, color: HEX.ink, size: 10, rotate: -0.024
  });

  // header
  ctx.textAlign = 'center';
  ctx.fillStyle = HEX.cyber;
  ctx.font = font(14, 'bold', 'mono');
  ctx.fillText(spaced('SHIP-O-METER'), W / 2, 60);

  art.outlineText(ctx, {
    text: 'CHEMISTRY CHECK', x: W / 2, y: 108, size: 44,
    fill: '#FFFFFF', stroke: HEX.ink, offset: 4, align: 'center'
  });

  art.tagLine(ctx, { x: 310, y: 120, w: 380, color: HEX.lime, width: 5, seed: seed + 8, alpha: 0.85 });

  // avatars
  await drawAvatar(ctx, {
    url: avatar1, cx: 216, cy: 268, r: 100,
    ring: HEX.hot, ring2: HEX.neon, label: name1
  });
  await drawAvatar(ctx, {
    url: avatar2, cx: 784, cy: 268, r: 100,
    ring: HEX.cyber, ring2: HEX.neon, label: name2
  });

  // big heart between
  art.burst(ctx, { cx: 500, cy: 236, r: 118, points: 16, fill: HEX.gold, stroke: HEX.ink, rotate: -0.08, alpha: 0.18, lineWidth: 2.5 });

  ctx.save();
  ctx.shadowColor = HEX.hot;
  ctx.shadowBlur = 60;
  art.heart(ctx, 500, 236, 88, HEX.hot, 0.9);
  ctx.restore();
  art.star4(ctx, 500, 236, 26, '#FFFFFF', 0.9);

  // score
  art.outlineText(ctx, {
    text: `${score}%`, x: 500, y: 372, size: 76,
    fill: '#FFFFFF', stroke: '#0B0A12', offset: 5, align: 'center'
  });

  // verdict sticker
  art.sticker(ctx, {
    x: 500, y: 408, text: verdict, size: 18,
    fill: HEX.gold, color: '#0B0A12', rotate: -0.03
  });

  // names
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(fit(ctx, name1, 340, 28), 'bold', 'display');
  ctx.fillText(name1, 216, 412);
  ctx.font = font(fit(ctx, name2, 340, 28), 'bold', 'display');
  ctx.fillText(name2, 784, 412);

  // meter
  art.bar(ctx, {
    x: 150, y: 444, w: 700, h: 24,
    pct: score / 100, from: HEX.hot, to: HEX.cyber
  });

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = font(15, 'normal', 'body');
  ctx.textAlign = 'center';
  ctx.fillText(line || '', W / 2, 498);

  art.tape(ctx, {
    x: -30, y: H - 34, w: W + 60, h: 28,
    text: 'HIỂU UYÊN · SHIP CYPHER · NO EDIT NO FILTER · BOOM BAP',
    fill: HEX.hot, color: HEX.ink, size: 12, rotate: 0.006
  });

  return canvas.toBuffer('image/png');
}

// ── STICKER CARD ──────────────────────────────
async function generateStickerCard({ name = 'you', avatarURL = null, tagline = 'certified vibe' } = {}) {
  const W = 900, H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const seed = art.hashStr(name);

  art.bgPoster(ctx, { w: W, h: H, seed, accent: HEX.cyber, accent2: HEX.hot, accent3: HEX.neon });
  art.bricks(ctx, { w: W, h: H, alpha: 0.05, color: '#FFFFFF', step: 72, rowH: 31 });
  art.spray(ctx, { cx: 450, cy: 440, r: 380, color: HEX.neon, seed: seed + 6, alpha: 0.18 });
  art.drips(ctx, { x: 0, y: 0, w: 170, color: HEX.hot, seed: seed + 8, count: 4, maxLen: 40, alpha: 0.45 });

  // radial burst
  ctx.save();
  const cx = 450, cy = 440;
  const rnd = art.rng(seed);
  ctx.globalAlpha = 0.09;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    ctx.fillStyle = i % 2 ? HEX.hot : '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 760, a, a + 0.045);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  art.halftone(ctx, { x: 0, y: 0, w: W, h: H, step: 18, radius: 2.2, color: '#ffffff', alpha: 0.05 });

  // sticker plate
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(cx, cy, 292, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();

  await drawAvatar(ctx, {
    url: avatarURL, cx, cy, r: 274,
    ring: HEX.ink, ring2: HEX.ink, label: name
  });

  // dashed ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 320, 0, Math.PI * 2);
  ctx.setLineDash([3, 12]);
  ctx.strokeStyle = art.rgba(HEX.cyber, 0.8);
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.restore();

  // name
  art.outlineText(ctx, {
    text: `@${name}`.slice(0, 22), x: cx, y: 154, size: fit(ctx, `@${name}`, 700, 62),
    fill: '#FFFFFF', stroke: '#0B0A12', offset: 5, align: 'center'
  });

  // tagline
  art.sticker(ctx, {
    x: cx, y: 792, text: tagline.toUpperCase().slice(0, 32), size: 18,
    fill: HEX.hot, color: '#FFFFFF', rotate: -0.03
  });

  // corner stickers
  art.sticker(ctx, {
    x: 150, y: 96, text: 'CERTIFIED', size: 14,
    fill: HEX.cyber, color: '#0B0A12', rotate: 0.16
  });
  art.burst(ctx, { cx: 792, cy: 120, r: 82, points: 14, fill: HEX.gold, stroke: HEX.ink, rotate: 0.18, alpha: 0.22, lineWidth: 2.5 });
  art.stamp(ctx, { x: 792, y: 120, r: 52, top: 'GENZ', big: 'OK', bottom: 'VIBE', color: HEX.gold, rotate: 0.18 });

  art.sparkles(ctx, { w: W, h: H, count: 22, seed: seed + 5 });
  art.grain(ctx, { w: W, h: H, count: 4000, seed: seed + 9, alpha: 0.05 });

  art.tape(ctx, {
    x: -20, y: H - 38, w: W + 40, h: 28,
    text: 'HIỂU UYÊN · CERTIFIED STICKER · BOOM BAP · NO SKIP',
    fill: HEX.lime, color: HEX.ink, size: 11, rotate: -0.008
  });

  return canvas.toBuffer('image/png');
}

// ── WELCOME CARD ──────────────────────────────
async function generateWelcomeCard({ name = 'new face', guildName = 'server', avatarURL = null, memberCount = 0 } = {}) {
  const W = 1000, H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const seed = art.hashStr(name + guildName);

  art.bgPoster(ctx, { w: W, h: H, seed, accent: HEX.hot, accent2: HEX.neon, accent3: HEX.cyber });
  art.bricks(ctx, { w: W, h: H, alpha: 0.05, color: '#FFFFFF', step: 72, rowH: 31 });
  art.spray(ctx, { cx: 200, cy: 250, r: 260, color: HEX.cyber, seed: seed + 4, alpha: 0.2 });
  art.splatter(ctx, { cx: 200, cy: 250, maxR: 190, color: HEX.neon, seed, alpha: 0.35 });
  art.burst(ctx, { cx: 872, cy: 128, r: 86, points: 15, fill: HEX.gold, stroke: HEX.ink, rotate: 0.16, alpha: 0.24, lineWidth: 3 });
  art.tape(ctx, {
    x: 580, y: 34, w: 360, h: 24,
    text: 'FRESH ON THE MIC · HIỂU UYÊN',
    fill: HEX.lime, color: HEX.ink, size: 11, rotate: -0.03
  });

  await drawAvatar(ctx, {
    url: avatarURL, cx: 200, cy: 250, r: 118,
    ring: HEX.hot, ring2: HEX.cyber, label: name
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = HEX.cyber;
  ctx.font = font(14, 'bold', 'mono');
  ctx.fillText(spaced('NEW FACE ON THE MIC'), 380, 132);

  art.outlineText(ctx, {
    text: 'WELCOME', x: 376, y: 214, size: 86,
    fill: '#FFFFFF', stroke: HEX.ink, offset: 5
  });

  art.tagLine(ctx, { x: 380, y: 224, w: 350, color: HEX.lime, width: 6, seed: seed + 9, alpha: 0.85 });

  ctx.fillStyle = HEX.hot;
  ctx.font = font(16, 'bold', 'mono');
  ctx.fillText('TO THE BOOM BAP ERA', 380, 250);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(fit(ctx, name, 540, 34), 'bold', 'display');
  ctx.fillText(String(name).slice(0, 26), 380, 296);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = font(16, 'normal', 'body');
  ctx.fillText(`vừa gia nhập ${String(guildName).slice(0, 30)}`, 380, 330);

  art.sticker(ctx, {
    x: 470, y: 380, text: `MEMBER #${memberCount || '—'}`, size: 16,
    fill: HEX.cyber, color: '#0B0A12', rotate: -0.02
  });

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = font(13, 'normal', 'mono');
  ctx.fillText('// gõ /help để xem hết chiêu', 380, 420);

  art.stamp(ctx, { x: 872, y: 128, r: 58, top: 'GENZ', big: 'HI', bottom: 'UYÊN', color: HEX.gold, rotate: 0.16 });

  art.tape(ctx, {
    x: -30, y: H - 38, w: W + 60, h: 32,
    text: 'HIỂU UYÊN · WELCOME · ANIME GENZ HIPHOP',
    fill: HEX.hot, color: '#0B0A12', size: 13, rotate: -0.006
  });

  return canvas.toBuffer('image/png');
}

module.exports = { generateShipCard, generateStickerCard, generateWelcomeCard };
