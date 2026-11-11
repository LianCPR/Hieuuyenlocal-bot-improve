// =============================================
// QUEST CARD — poster nhiệm vụ hằng ngày (1080x700)
// =============================================

const { createCanvas, font } = require('./engine');
const art = require('./art');
const { HEX } = require('../ui/theme');

const fit = (ctx, text, maxWidth, start, family = 'body', weight = 'bold') => {
  let size = start;
  ctx.font = font(size, weight, family);
  while (ctx.measureText(text).width > maxWidth && size > 11) {
    size -= 1;
    ctx.font = font(size, weight, family);
  }
  return size;
};

/**
 * @param {{username:string, dateLabel?:string, quests:Array, summary:object}} opts
 */
async function generateQuestCard({ username = 'player', dateLabel = '', quests = [], summary = {} }) {
  const W = 1080, H = 700;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const seed = art.hashStr(`quests:${username}:${dateLabel}`);
  const done = summary.done ?? quests.filter(q => q.progress >= q.target).length;
  const total = summary.total ?? quests.length;

  art.bgPoster(ctx, {
    w: W, h: H, seed,
    accent: HEX.gold, accent2: HEX.hot, accent3: HEX.cyber
  });
  art.bricks(ctx, { w: W, h: H, alpha: 0.045, color: '#FFFFFF', step: 72, rowH: 31 });
  art.spray(ctx, { cx: W - 120, cy: 110, r: 190, color: HEX.gold, seed: seed + 6, alpha: 0.2 });
  art.sparkles(ctx, { w: W, h: 420, seed: seed + 5, count: 16, color: '#ffffff' });
  art.frame(ctx, { w: W, h: H, color: HEX.hot, inset: 16, alpha: 0.55, width: 1.5 });

  // ── header ──
  ctx.textAlign = 'left';
  ctx.fillStyle = HEX.cyber;
  ctx.font = font(12, 'bold', 'mono');
  ctx.fillText('DAILY CYPHER  //  HIỂU UYÊN ERA', 62, 60);

  art.outlineText(ctx, {
    text: 'NHIỆM VỤ HÔM NAY',
    x: 60, y: 128, size: fit(ctx, 'NHIỆM VỤ HÔM NAY', 640, 54),
    fill: '#FFFFFF', stroke: HEX.ink, offset: 4, align: 'left'
  });

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = font(13, 'normal', 'mono');
  ctx.fillText(`// @${String(username).slice(0, 24)}${dateLabel ? `  ·  ${dateLabel}` : ''}`, 62, 192);

  art.drips(ctx, { x: 60, y: 200, w: 520, color: HEX.hot, seed: seed + 3, count: 7, maxLen: 18, thickness: 4, alpha: 0.5 });

  // ── stamp tổng ──
  art.burst(ctx, {
    cx: W - 118, cy: 112, r: 88, points: 15,
    fill: done >= total ? HEX.lime : HEX.gold, stroke: HEX.ink,
    rotate: -0.12, alpha: 0.28, lineWidth: 3
  });
  art.stamp(ctx, {
    x: W - 118, y: 112, r: 58,
    top: 'DAILY', big: `${done}/${total}`, bottom: 'DONE',
    color: done >= total ? HEX.lime : HEX.hot, rotate: -0.12
  });

  // ── quest rows ──
  const rowX = 62, rowW = W - 124, rowH = 112, gap = 16;
  let y = 232;

  quests.forEach((q, i) => {
    const accent = q.accent || HEX.hot;
    const pct = q.target > 0 ? Math.min(1, q.progress / q.target) : 0;
    const ready = q.progress >= q.target;
    const claimed = !!q.claimed;
    const status = claimed ? 'DONE' : ready ? 'READY' : 'IN PROGRESS';
    const statusFill = claimed ? HEX.lime : ready ? HEX.hot : HEX.cyber;

    // panel
    ctx.save();
    art.roundRect(ctx, rowX, y, rowW, rowH, 16);
    ctx.fillStyle = 'rgba(10,8,18,0.62)';
    ctx.fill();
    ctx.strokeStyle = art.rgba(accent, claimed ? 0.3 : 0.55);
    ctx.lineWidth = 1.4;
    art.roundRect(ctx, rowX, y, rowW, rowH, 16);
    ctx.stroke();
    ctx.restore();

    // vệt sơn cạnh trái
    art.roundRect(ctx, rowX + 8, y + 20, 5, rowH - 40, 3);
    ctx.fillStyle = accent;
    ctx.fill();

    // index
    ctx.textAlign = 'left';
    ctx.fillStyle = accent;
    ctx.font = font(26, 'bold', 'display');
    ctx.fillText(String(i + 1).padStart(2, '0'), rowX + 26, y + 44);

    // label
    ctx.fillStyle = claimed ? 'rgba(255,255,255,0.45)' : '#FFFFFF';
    ctx.font = font(fit(ctx, q.label, 420, 23), 'bold', 'body');
    ctx.fillText(q.label, rowX + 92, y + 42);

    ctx.fillStyle = art.rgba(accent, 0.9);
    ctx.font = font(11, 'bold', 'mono');
    ctx.fillText(q.short || 'QUEST', rowX + 92, y + 64);

    // progress
    art.bar(ctx, {
      x: rowX + 92, y: y + 78, w: 430, h: 12,
      pct, from: accent, to: HEX.cyber,
      stripes: !claimed, glow: ready
    });

    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = font(12, 'bold', 'mono');
    ctx.fillText(`${q.progress}/${q.target}`, rowX + 534, y + 89);

    // reward
    ctx.textAlign = 'right';
    ctx.fillStyle = HEX.gold;
    ctx.font = font(18, 'bold', 'mono');
    ctx.fillText(`+${q.coins} C`, rowX + rowW - 26, y + 82);

    ctx.fillStyle = HEX.cyber;
    ctx.font = font(12, 'bold', 'mono');
    ctx.fillText(`+${q.xp} XP`, rowX + rowW - 26, y + 101);

    // status sticker
    art.sticker(ctx, {
      x: rowX + rowW - 92, y: y + 30,
      text: status, size: 11,
      fill: statusFill, color: HEX.ink, rotate: 0.03
    });

    y += rowH + gap;
  });

  // ── footer ──
  art.tape(ctx, {
    x: -20, y: H - 50, w: W + 40, h: 26,
    text: 'HIỂU UYÊN DAILY CYPHER · NHẬN THƯỞNG TRƯỚC KHI HẾT NGÀY',
    fill: HEX.gold, color: HEX.ink, size: 12, rotate: -0.005
  });

  return canvas.toBuffer('image/png');
}

module.exports = { generateQuestCard };
