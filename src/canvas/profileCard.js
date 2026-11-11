// =============================================
// PROFILE CARD — anime · genZ · hiphop poster
// =============================================

const { createCanvas, drawAvatar, font } = require('./engine');
const art = require('./art');
const { HEX, rankOf, RARITY } = require('../ui/theme');
const { xpForLevel, xpNeededForNextLevel } = require('../database/models/users');
const { countUserAchievements } = require('../database/models/achievements');

// ── Themes ────────────────────────────────────
const THEMES = {
  default:        { accent: HEX.gold,    accent2: HEX.hot,   accent3: HEX.cyber, label: 'BOOM BAP' },
  theme_sakura:   { accent: '#FF8FBF',   accent2: '#FF5FA2', accent3: '#C084FC', label: 'SAKURA' },
  sakura:         { accent: '#FF8FBF',   accent2: '#FF5FA2', accent3: '#C084FC', label: 'SAKURA' },
  theme_night:    { accent: '#7C4DFF',   accent2: '#22D3EE', accent3: '#FF2D95', label: 'NIGHT OWL' },
  night:          { accent: '#7C4DFF',   accent2: '#22D3EE', accent3: '#FF2D95', label: 'NIGHT OWL' },
  theme_ocean:    { accent: '#22D3EE',   accent2: '#3B82F6', accent3: '#34D399', label: 'OCEAN' },
  ocean:          { accent: '#22D3EE',   accent2: '#3B82F6', accent3: '#34D399', label: 'OCEAN' },
  theme_neon:     { accent: '#FF2D95',   accent2: '#22D3EE', accent3: '#FACC15', label: 'NEON CITY' },
  theme_hiphop:   { accent: '#FFD60A',   accent2: '#FF2E93', accent3: '#CCFF00', label: 'BOOM BAP' },
  theme_anime:    { accent: '#FF9EC4',   accent2: '#A855F7', accent3: '#60A5FA', label: 'ANIME POP' },
  theme_cyber:     { accent: '#BEF264',  accent2: '#22D3EE', accent3: '#FF2D95', label: 'CYBERPUNK' }
};

const themeOf = (key) => THEMES[key] || THEMES.default;

const spaced = (s) => s.split('').join(' ');

const fitSize = (ctx, text, maxWidth, start, family = 'body', weight = 'bold') => {
  let size = start;
  ctx.font = font(size, weight, family);
  while (ctx.measureText(text).width > maxWidth && size > 12) {
    size -= 1;
    ctx.font = font(size, weight, family);
  }
  return size;
};

// ── Profile poster ────────────────────────────
/**
 * @param {object} user   - row trong bảng users
 * @param {object} member - Discord GuildMember
 * @returns {Promise<Buffer>}
 */
async function generateProfileCard(user, member) {
  const W = 1200, H = 630;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const theme = themeOf(user.profileTheme);
  const rank = rankOf(user.level);
  const seed = art.hashStr(user.userId || user.username || 'hieu-uyen');

  art.bgPoster(ctx, {
    w: W, h: H, seed,
    accent: theme.accent, accent2: theme.accent2, accent3: theme.accent3
  });

  // texture tường + mây sơn xịt
  art.bricks(ctx, { w: W, h: H, alpha: 0.05, color: '#FFFFFF', step: 74, rowH: 32 });
  art.spray(ctx, { cx: 196, cy: 236, r: 268, color: theme.accent3, seed: seed + 9, alpha: 0.2 });

  // graffiti splashes sau avatar
  art.splatter(ctx, { cx: 220, cy: 250, maxR: 190, color: theme.accent, seed, alpha: 0.35 });
  art.sparkles(ctx, { w: W, h: 520, seed: seed + 3, count: 18, color: '#ffffff' });

  // ── khung poster ──
  art.frame(ctx, { w: W, h: H, color: theme.accent, inset: 18, alpha: 0.5, width: 1.5 });

  // sơn nhỏ giọt từ mép trên + băng dính mixtape
  art.drips(ctx, { x: 0, y: 0, w: 178, color: theme.accent2, seed: seed + 2, count: 5, maxLen: 58, alpha: 0.5 });
  art.tape(ctx, {
    x: 742, y: 28, w: 332, h: 25,
    text: 'SIDE A · MIXTAPE · HIỂU UYÊN',
    fill: theme.accent2, color: HEX.ink, size: 11, rotate: -0.028
  });

  // burst MC nhỏ cạnh avatar
  art.burst(ctx, { cx: 372, cy: 92, r: 40, points: 13, fill: theme.accent2, stroke: HEX.ink, rotate: -0.18, lineWidth: 2.5 });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = HEX.ink;
  ctx.font = font(22, 'bold', 'display');
  ctx.fillText('MC', 372, 94);
  ctx.textBaseline = 'alphabetic';

  // ── avatar ──
  const avatarURL = member?.displayAvatarURL
    ? member.displayAvatarURL({ extension: 'png', size: 512 })
    : null;
  await drawAvatar(ctx, {
    url: avatarURL,
    cx: 218, cy: 245, r: 116,
    ring: theme.accent, ring2: theme.accent2,
    label: user.username
  });

  // stickers quanh avatar
  art.sticker(ctx, {
    x: 218, y: 388, text: `LV ${user.level}`, size: 26, fill: theme.accent,
    rotate: -0.08
  });
  art.sticker(ctx, {
    x: 100, y: 118, text: rank.tag, size: 16, fill: '#0B0A12', color: theme.accent3,
    rotate: 0.12, border: theme.accent3
  });

  // ── eyebrow ──
  ctx.textAlign = 'left';
  ctx.fillStyle = theme.accent3;
  ctx.font = font(15, 'bold', 'mono');
  ctx.fillText(spaced('MEMBER FILE'), 412, 104);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = font(13, 'normal', 'mono');
  ctx.fillText(`ID ${String(user.userId || '').slice(-6) || '000000'} · ${theme.label}`, 412, 124);

  // ── name ──
  const displayName = member?.displayName || user.username || 'unknown';
  const nameSize = fitSize(ctx, displayName, 580, 66, 'display');
  art.outlineText(ctx, {
    text: displayName, x: 408, y: 196, size: nameSize,
    fill: user.nameColor || '#FFFFFF', stroke: HEX.ink, offset: 5
  });

  // gạch chân marker dưới tên
  ctx.font = font(nameSize, 'bold', 'display');
  art.tagLine(ctx, {
    x: 410, y: 208, w: Math.min(560, ctx.measureText(displayName).width),
    color: theme.accent3, width: 5, seed: seed + 7, alpha: 0.85
  });

  // ── title sticker ──
  const titleText = `// ${user.title || 'Tập Sự'}`;
  ctx.font = font(20, 'bold', 'body');
  const titleW = ctx.measureText(titleText).width + 34;
  art.sticker(ctx, {
    x: 412 + titleW / 2, y: 240, text: titleText, size: 20,
    fill: theme.accent2, rotate: -0.025
  });

  // ── rank stamp ──
  art.stamp(ctx, {
    x: 1080, y: 128, r: 68,
    top: 'RANK', big: rank.short, bottom: rank.tag,
    color: rank.color, rotate: -0.14
  });

  // ── level ──
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = font(14, 'bold', 'mono');
  ctx.fillText(spaced('LEVEL'), 412, 292);

  art.neonText(ctx, {
    text: String(user.level).padStart(2, '0'), x: 410, y: 340,
    size: 58, color: theme.accent, fill: '#FFFFFF', glow: 26, family: 'display'
  });
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.font = font(18, 'bold', 'mono');
  ctx.fillText('/ 100', 512, 338);

  art.sticker(ctx, {
    x: 620, y: 320, text: rank.name, size: 15,
    fill: '#151222', color: rank.color, rotate: 0, border: rank.color
  });

  // ── XP bar ──
  const currentBase = xpForLevel(user.level);
  const nextAt = xpNeededForNextLevel(user.level);
  const progress = (user.xp - currentBase) / Math.max(1, nextAt - currentBase);

  ctx.fillStyle = theme.accent3;
  ctx.font = font(13, 'bold', 'mono');
  ctx.fillText(spaced('XP TO NEXT VIBE'), 412, 372);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = font(13, 'normal', 'mono');
  ctx.fillText(`${(user.xp || 0).toLocaleString('vi-VN')} / ${nextAt.toLocaleString('vi-VN')} XP  ·  ${Math.round(progress * 100)}%`, 1150, 372);
  ctx.textAlign = 'left';

  art.bar(ctx, {
    x: 412, y: 384, w: 738, h: 24,
    pct: progress, from: theme.accent, to: theme.accent2
  });

  // moving spark on the bar
  const knobX = 412 + 738 * Math.max(0.02, Math.min(1, progress));
  art.star4(ctx, knobX, 396, 13, '#FFFFFF', 0.95);

  // ── stats stickers ──
  const achievements = safeCountAchievements(user.userId);
  const stats = [
    { label: 'COINS', value: (user.coins || 0).toLocaleString('vi-VN'), accent: HEX.gold },
    { label: 'MESSAGES', value: (user.totalMessages || 0).toLocaleString('vi-VN'), accent: HEX.cyber },
    { label: 'ACHIEVEMENTS', value: `${achievements}`, accent: HEX.lime },
    { label: 'WATER STREAK', value: `${user.waterStreak || 0}d`, accent: HEX.sky }
  ];

  stats.forEach((s, i) => {
    const x = 412 + i * 186;
    const y = 432;
    art.roundRect(ctx, x, y, 168, 84, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.055)';
    ctx.fill();
    ctx.strokeStyle = art.rgba(s.accent, 0.35);
    ctx.lineWidth = 1.4;
    art.roundRect(ctx, x, y, 168, 84, 12);
    ctx.stroke();

    // accent tab
    art.roundRect(ctx, x + 12, y + 12, 4, 26, 2);
    ctx.fillStyle = s.accent;
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = font(10, 'bold', 'mono');
    ctx.textAlign = 'left';
    ctx.fillText(s.label, x + 26, y + 24);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(28, 'bold', 'display');
    ctx.fillText(s.value, x + 26, y + 62);
  });

  // ── cassette góc trái ──
  art.cassette(ctx, {
    x: 92, y: 438, w: 208, rotate: -0.08,
    color: theme.accent3, label: 'HIỂU UYÊN'
  });

  // ── hype quote ──
  const hypeText = require('../ui/theme').hype('profile');
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = font(16, 'normal', 'body');
  ctx.fillText(`// ${hypeText}`, 412, 552);

  // ── marquee ──
  art.tape(ctx, {
    x: -30, y: 578, w: W + 60, h: 38,
    text: 'HIỂU UYÊN · ANIME GENZ HIPHOP · BOOM BAP · VIBE CHECK PASSED',
    fill: theme.accent, color: '#0B0A12', size: 17, rotate: -0.012
  });

  // ── corner signature ──
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.font = font(11, 'normal', 'mono');
  ctx.fillText('hieu-uyen.exe', 1180, 560);

  return canvas.toBuffer('image/png');
}

function safeCountAchievements(userId) {
  try { return countUserAchievements(userId); } catch { return 0; }
}

// ── Level up splash ───────────────────────────
async function generateLevelUpCard(user, member, newLevel) {
  const W = 1000, H = 320;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const theme = themeOf(user.profileTheme);
  const rank = rankOf(newLevel);
  const seed = art.hashStr((user.userId || 'x') + newLevel);

  art.bgPoster(ctx, { w: W, h: H, seed, accent: theme.accent, accent2: theme.accent2, accent3: theme.accent3 });
  art.bricks(ctx, { w: W, h: H, alpha: 0.05, color: '#FFFFFF', step: 70, rowH: 30 });
  art.spray(ctx, { cx: 130, cy: 160, r: 220, color: theme.accent3, seed: seed + 4, alpha: 0.22 });
  art.splatter(ctx, { cx: 130, cy: 160, maxR: 130, color: theme.accent, seed, alpha: 0.5 });
  art.drips(ctx, { x: 0, y: 0, w: 140, color: theme.accent2, seed: seed + 2, count: 4, maxLen: 46, alpha: 0.45 });

  await drawAvatar(ctx, {
    url: member?.displayAvatarURL ? member.displayAvatarURL({ extension: 'png', size: 256 }) : null,
    cx: 130, cy: 160, r: 82,
    ring: theme.accent, ring2: theme.accent2, label: user.username
  });

  art.tape(ctx, {
    x: 610, y: 22, w: 350, h: 24,
    text: 'SIDE B · LEVEL UP · HIỂU UYÊN',
    fill: theme.accent2, color: HEX.ink, size: 10, rotate: -0.022
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = theme.accent3;
  ctx.font = font(14, 'bold', 'mono');
  ctx.fillText(spaced('LEVEL UP'), 250, 82);

  art.outlineText(ctx, {
    text: `LV ${newLevel}`, x: 248, y: 188, size: 92,
    fill: '#FFFFFF', stroke: HEX.ink, offset: 5
  });

  art.tagLine(ctx, { x: 250, y: 200, w: 190, color: theme.accent3, width: 5, seed: seed + 6, alpha: 0.85 });

  art.sticker(ctx, {
    x: 505, y: 70, text: rank.name, size: 16,
    fill: rank.color, color: HEX.ink, rotate: -0.04
  });

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = font(17, 'normal', 'body');
  const name = member?.displayName || user.username || 'bạn';
  ctx.fillText(`${name} vừa bước vào era mới`, 252, 226);

  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.font = font(14, 'normal', 'mono');
  ctx.fillText(`// ${require('../ui/theme').hype('levelup')}`, 252, 252);

  art.burst(ctx, { cx: 900, cy: 118, r: 82, points: 14, fill: theme.accent2, stroke: HEX.ink, rotate: 0.2, alpha: 0.24, lineWidth: 3 });
  art.stamp(ctx, {
    x: 900, y: 118, r: 56, top: 'NEW', big: rank.short, bottom: 'ERA',
    color: rank.color, rotate: 0.2
  });

  art.tape(ctx, {
    x: -30, y: 284, w: W + 60, h: 32,
    text: 'HIỂU UYÊN · LEVEL SYSTEM · BOOM BAP · ON THE MIC', fill: theme.accent2, color: HEX.ink, size: 14, rotate: -0.01
  });

  return canvas.toBuffer('image/png');
}

module.exports = { generateProfileCard, generateLevelUpCard, THEMES, getRankInfo: rankOf };
