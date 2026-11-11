// =============================================
// CHARTS — Leaderboard card & Server stats card
// =============================================

const { createCanvas, drawAvatar, font } = require('./engine');
const art = require('./art');
const { HEX, rankOf, fmtNum } = require('../ui/theme');

const spaced = (s) => s.split('').join(' ');

const TYPE_META = {
  xp:       { label: 'XP & LEVEL', accent: HEX.hot,  value: u => `LV ${u.level}`, sub: u => `${fmtNum(u.xp)} XP`, ratio: u => Math.min(u.level / 100, 1) },
  coins:    { label: 'COIN HUSTLE', accent: HEX.gold, value: u => fmtNum(u.coins), sub: () => 'COINS', ratio: u => Math.min(u.coins / 50000, 1) },
  messages: { label: 'CHAT ENERGY', accent: HEX.cyber, value: u => fmtNum(u.totalMessages), sub: () => 'MESSAGES', ratio: u => Math.min(u.totalMessages / 5000, 1) },
  health:   { label: 'WATER CREW', accent: HEX.sky,  value: u => `${u.waterStreak}d`, sub: () => 'STREAK', ratio: u => Math.min(u.waterStreak / 30, 1) }
};

/**
 * Bảng xếp hạng dạng poster 1200x900
 * @param {Array} users
 * @param {{type?:string, avatars?:string[]}} opts
 */
async function generateLeaderboardCard(users, { type = 'xp', avatars = [] } = {}) {
  const W = 1200, H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const meta = TYPE_META[type] || TYPE_META.xp;

  art.bgPoster(ctx, {
    w: W, h: H, seed: art.hashStr(type + users.length),
    accent: meta.accent, accent2: HEX.neon, accent3: HEX.cyber
  });
  art.bricks(ctx, { w: W, h: H, alpha: 0.05, color: '#FFFFFF', step: 78, rowH: 34 });
  art.spray(ctx, { cx: 1040, cy: 116, r: 240, color: meta.accent, seed: 23, alpha: 0.18 });
  art.sparkles(ctx, { w: W, h: 150, count: 14, seed: 21 });

  // header
  ctx.textAlign = 'left';
  ctx.fillStyle = meta.accent;
  ctx.font = font(14, 'bold', 'mono');
  ctx.fillText(spaced('SERVER CHARTS'), 56, 74);

  art.outlineText(ctx, {
    text: meta.label, x: 52, y: 136, size: 62,
    fill: '#FFFFFF', stroke: HEX.ink, offset: 5
  });

  ctx.font = font(62, 'bold', 'display');
  art.tagLine(ctx, {
    x: 54, y: 148, w: Math.min(430, ctx.measureText(meta.label).width),
    color: HEX.lime, width: 6, seed: 27, alpha: 0.85
  });

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = font(14, 'normal', 'mono');
  ctx.fillText(`TOP ${users.length} · ${new Date().toLocaleDateString('vi-VN')}`, W - 56, 88);
  ctx.font = font(12, 'normal', 'mono');
  ctx.fillText('// hieu-uyen era', W - 56, 110);
  ctx.textAlign = 'left';

  art.tape(ctx, {
    x: 40, y: 168, w: W - 80, h: 32,
    text: 'HIỂU UYÊN · BOOM BAP CHARTS · NO SKIP · RUN IT UP',
    fill: meta.accent, color: HEX.ink, size: 14, rotate: -0.004, repeat: 2
  });

  const startY = 216;
  const rowH = 56;
  const gap = 6;

  for (let i = 0; i < Math.min(users.length, 10); i++) {
    const u = users[i];
    const y = startY + i * (rowH + gap);
    const accent = i === 0 ? HEX.gold : i === 1 ? '#D8D8E8' : i === 2 ? '#E08A4B' : meta.accent;

    // row panel
    art.roundRect(ctx, 48, y, W - 96, rowH, 12);
    ctx.fillStyle = i < 3 ? art.rgba(accent, 0.12) : 'rgba(255,255,255,0.045)';
    ctx.fill();
    ctx.strokeStyle = i < 3 ? art.rgba(accent, 0.55) : 'rgba(255,255,255,0.09)';
    ctx.lineWidth = i < 3 ? 3 : 1.2;
    art.roundRect(ctx, 48, y, W - 96, rowH, 12);
    ctx.stroke();

    // rank
    ctx.textAlign = 'left';
    ctx.fillStyle = accent;
    ctx.font = font(30, 'bold', 'display');
    ctx.fillText(String(i + 1).padStart(2, '0'), 68, y + 41);

    // avatar
    await drawAvatar(ctx, {
      url: avatars[i] || null,
      cx: 152, cy: y + rowH / 2, r: 19,
      ring: accent, ring2: meta.accent, label: u.username
    });

    // name + title
    const name = String(u.username || 'unknown');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(21, 'bold', 'display');
    const nameSize = Math.min(21, 21 * (420 / Math.max(1, ctx.measureText(name).width)));
    ctx.font = font(nameSize, 'bold', 'display');
    ctx.fillText(name.length > 24 ? name.slice(0, 23) + '…' : name, 188, y + 30);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = font(11, 'normal', 'body');
    ctx.fillText(`${u.title || 'Tập Sự'} · ${rankOf(u.level).tag}`, 188, y + 46);

    // progress line
    art.bar(ctx, {
      x: 640, y: y + rowH / 2 - 5, w: 300, h: 10,
      pct: meta.ratio(u), from: accent, to: meta.accent, stripes: false, glow: false
    });

    // value
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(24, 'bold', 'display');
    ctx.fillText(meta.value(u), W - 132, y + 34);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = font(10, 'bold', 'mono');
    ctx.fillText(meta.sub(u), W - 132, y + 48);

    // medal sticker for top 3
    if (i < 3) {
      art.sticker(ctx, {
        x: W - 78, y: y + rowH / 2, text: ['1ST', '2ND', '3RD'][i], size: 12,
        fill: accent, color: '#0B0A12', rotate: 0.08, padX: 10, padY: 6
      });
    }
  }

  art.tape(ctx, {
    x: -30, y: H - 44, w: W + 60, h: 34,
    text: 'HIỂU UYÊN · SERVER CHARTS · FLEX RESPONSIBLY · ON THE MIC',
    fill: HEX.gold, color: HEX.ink, size: 14, rotate: 0.008
  });

  return canvas.toBuffer('image/png');
}

/**
 * Server summary card 1100x640
 */
async function generateServerCard({ guildName = 'server', iconURL = null, stats = {}, top = [] } = {}) {
  const W = 1100, H = 640;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  art.bgPoster(ctx, {
    w: W, h: H, seed: art.hashStr(guildName),
    accent: HEX.neon, accent2: HEX.hot, accent3: HEX.cyber
  });
  art.bricks(ctx, { w: W, h: H, alpha: 0.05, color: '#FFFFFF', step: 74, rowH: 32 });
  art.spray(ctx, { cx: 930, cy: 130, r: 260, color: HEX.neon, seed: 13, alpha: 0.2 });
  art.splatter(ctx, { cx: 930, cy: 130, maxR: 220, color: HEX.neon, seed: 12, alpha: 0.3 });
  art.burst(ctx, { cx: 118, cy: 128, r: 100, points: 14, fill: HEX.hot, stroke: HEX.ink, rotate: -0.12, alpha: 0.24, lineWidth: 3 });

  await drawAvatar(ctx, {
    url: iconURL, cx: 118, cy: 128, r: 66,
    ring: HEX.hot, ring2: HEX.neon, label: guildName
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = HEX.cyber;
  ctx.font = font(14, 'bold', 'mono');
  ctx.fillText(spaced('SERVER CHECK'), 210, 96);

  const size = Math.min(50, 50 * (760 / Math.max(1, (() => {
    ctx.font = font(50, 'bold', 'display');
    return ctx.measureText(guildName).width;
  })())));
  art.outlineText(ctx, {
    text: guildName, x: 206, y: 148, size,
    fill: '#FFFFFF', stroke: HEX.ink, offset: 4
  });

  ctx.font = font(size, 'bold', 'display');
  art.tagLine(ctx, {
    x: 208, y: 166, w: Math.min(700, ctx.measureText(guildName).width),
    color: HEX.lime, width: 5, seed: 31, alpha: 0.8
  });

  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.font = font(13, 'normal', 'mono');
  ctx.fillText(`// ${new Date().toLocaleDateString('vi-VN')} · BOOM BAP ERA`, 208, 196);

  const boxes = [
    { label: 'MEMBERS', value: fmtNum(stats.members || 0), accent: HEX.hot },
    { label: 'MESSAGES', value: fmtNum(stats.messages || 0), accent: HEX.cyber },
    { label: 'TOP LEVEL', value: String(stats.topLevel || 0), accent: HEX.gold },
    { label: 'MA SÓI GAMES', value: fmtNum(stats.games || 0), accent: HEX.neon },
    { label: 'GACHA CARDS', value: fmtNum(stats.cards || 0), accent: HEX.lime }
  ];

  boxes.forEach((b, i) => {
    const x = 60 + i * 200;
    const y = 236;
    art.roundRect(ctx, x, y, 184, 92, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.strokeStyle = art.rgba(b.accent, 0.4);
    ctx.lineWidth = 1.4;
    art.roundRect(ctx, x, y, 184, 92, 12);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = font(10, 'bold', 'mono');
    ctx.fillText(b.label, x + 16, y + 26);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(36, 'bold', 'display');
    ctx.fillText(b.value, x + 16, y + 70);

    art.roundRect(ctx, x + 16, y + 80, 40, 3, 2);
    ctx.fillStyle = b.accent;
    ctx.fill();
  });

  // top crew
  ctx.fillStyle = HEX.hot;
  ctx.font = font(14, 'bold', 'mono');
  ctx.fillText(spaced('TOP CREW'), 60, 384);

  top.slice(0, 5).forEach((u, i) => {
    const y = 402 + i * 37;
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    art.roundRect(ctx, 56, y, 988, 32, 8);
    ctx.fill();

    ctx.fillStyle = i === 0 ? HEX.gold : 'rgba(255,255,255,0.6)';
    ctx.font = font(15, 'bold', 'display');
    ctx.fillText(String(i + 1).padStart(2, '0'), 70, y + 22);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(15, 'bold', 'body');
    ctx.fillText(String(u.username || 'unknown').slice(0, 26), 116, y + 22);

    ctx.textAlign = 'right';
    ctx.fillStyle = HEX.cyber;
    ctx.font = font(13, 'bold', 'mono');
    ctx.fillText(`LV ${u.level} · ${fmtNum(u.xp)} XP`, 1024, y + 22);
    ctx.textAlign = 'left';
  });

  art.tape(ctx, {
    x: -30, y: H - 40, w: W + 60, h: 32,
    text: 'HIỂU UYÊN · SERVER CHECK · BOOM BAP · GOOD VIBES ONLY',
    fill: HEX.cyber, color: HEX.ink, size: 14, rotate: -0.008
  });

  return canvas.toBuffer('image/png');
}

module.exports = { generateLeaderboardCard, generateServerCard, TYPE_META };
