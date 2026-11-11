// =============================================
// STARMAP — Bản tin tri kỷ (anime night sky)
// =============================================

const { createCanvas, drawAvatar, font } = require('./engine');
const art = require('./art');
const { HEX, fmtNum } = require('../ui/theme');

const LEVEL_NAMES = ['', 'Người Lạ Quen Mặt', 'Người Bạn', 'Bạn Thân', 'Đôi Tri Kỷ', 'Tri Kỷ Tuyệt Vời'];
const LEVEL_COLORS = ['', '#9CA3AF', '#60A5FA', '#A855F7', '#FF2D95', '#FACC15'];

const fit = (ctx, text, maxWidth, start) => {
  let size = start;
  ctx.font = font(size, 'bold', 'display');
  while (ctx.measureText(text).width > maxWidth && size > 12) {
    size -= 1;
    ctx.font = font(size, 'bold', 'display');
  }
  return size;
};

/**
 * @param {string} name1
 * @param {string} name2
 * @param {number} lovePoints
 * @param {number} level 1..5
 * @param {{avatar1?:string, avatar2?:string}} opts
 */
async function generateStarmap(name1 = 'A', name2 = 'B', lovePoints = 0, level = 1, opts = {}) {
  const W = 1100, H = 620;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const seed = art.hashStr(name1 + name2);
  const color = LEVEL_COLORS[level] || HEX.hot;

  // deep space
  const sky = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.8);
  sky.addColorStop(0, '#141033');
  sky.addColorStop(0.55, '#0A081A');
  sky.addColorStop(1, '#04030A');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // star field
  const rnd = art.rng(seed);
  for (let i = 0; i < 220; i++) {
    ctx.globalAlpha = 0.25 + rnd() * 0.7;
    ctx.fillStyle = rnd() > 0.75 ? color : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H, 0.4 + rnd() * 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // nebula wash
  const neb = ctx.createRadialGradient(W / 2, H * 0.52, 20, W / 2, H * 0.52, 420);
  neb.addColorStop(0, art.rgba(color, 0.28));
  neb.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = neb;
  ctx.fillRect(0, 0, W, H);

  const c1x = 250, c2x = 850, cy = 300;

  // constellation clusters
  const drawCluster = (cx, cy, tint) => {
    const stars = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rnd() * 0.5;
      const d = 110 + rnd() * 90;
      stars.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.75 });
    }
    ctx.strokeStyle = art.rgba(tint, 0.25);
    ctx.lineWidth = 1;
    for (let i = 0; i < stars.length; i++) {
      const a = stars[i], b = stars[(i + 3) % stars.length];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const s of stars) {
      ctx.save();
      ctx.shadowColor = tint;
      ctx.shadowBlur = 14;
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  drawCluster(c1x, cy, HEX.neon);
  drawCluster(c2x, cy, HEX.cyber);
  art.sparkles(ctx, { w: W, h: H, count: 18, seed: seed + 4, color: '#FFFFFF' });

  // connections to heart
  const midX = W / 2, midY = cy;
  ctx.save();
  ctx.strokeStyle = art.rgba(color, 0.55);
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 9]);
  ctx.beginPath();
  ctx.moveTo(c1x + 105, cy - 30);
  ctx.quadraticCurveTo(midX - 120, cy - 140, midX - 46, midY - 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(c2x - 105, cy - 30);
  ctx.quadraticCurveTo(midX + 120, cy - 140, midX + 46, midY - 18);
  ctx.stroke();
  ctx.restore();

  // avatars
  await drawAvatar(ctx, {
    url: opts.avatar1 || null, cx: c1x, cy, r: 74,
    ring: HEX.neon, ring2: HEX.hot, label: name1
  });
  await drawAvatar(ctx, {
    url: opts.avatar2 || null, cx: c2x, cy, r: 74,
    ring: HEX.cyber, ring2: HEX.neon, label: name2
  });

  // heart
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 55;
  art.heart(ctx, midX, midY - 6, 92, color, 0.92);
  ctx.restore();
  art.star4(ctx, midX, midY - 12, 24, '#FFFFFF', 0.9);

  // labels
  ctx.textAlign = 'center';
  ctx.fillStyle = HEX.cyber;
  ctx.font = font(13, 'bold', 'mono');
  ctx.fillText('MEMBER 01', c1x, cy - 118);
  ctx.fillText('MEMBER 02', c2x, cy - 118);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(fit(ctx, name1, 330, 30), 'bold', 'display');
  ctx.fillText(name1, c1x, cy + 138);
  ctx.font = font(fit(ctx, name2, 330, 30), 'bold', 'display');
  ctx.fillText(name2, c2x, cy + 138);

  // score panel
  const scoreY = 470;
  art.roundRect(ctx, 250, scoreY - 44, 600, 92, 14);
  ctx.fillStyle = 'rgba(9,7,18,0.72)';
  ctx.fill();
  ctx.strokeStyle = art.rgba(color, 0.5);
  ctx.lineWidth = 1.6;
  art.roundRect(ctx, 250, scoreY - 44, 600, 92, 14);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = font(12, 'bold', 'mono');
  ctx.fillText(`SYNC LEVEL ${level} · ${LEVEL_NAMES[level] || ''}`, W / 2, scoreY - 20);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(34, 'bold', 'display');
  ctx.fillText(`${fmtNum(lovePoints)} LOVE POINTS`, W / 2, scoreY + 18);

  // level pips
  for (let i = 1; i <= 5; i++) {
    const px = W / 2 - 48 + (i - 1) * 24;
    art.roundRect(ctx, px, scoreY + 28, 16, 5, 3);
    ctx.fillStyle = i <= level ? color : 'rgba(255,255,255,0.14)';
    ctx.fill();
  }

  // footer tape
  art.tape(ctx, {
    x: -30, y: H - 30, w: W + 60, h: 26,
    text: 'HIỂU UYÊN · STARMAP · HAI NGƯỜI, MỘT BẦU TRỜI',
    fill: color, color: '#0B0A12', size: 12, rotate: -0.005
  });

  return canvas.toBuffer('image/png');
}

module.exports = { generateStarmap, LEVEL_NAMES };
