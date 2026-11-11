// =============================================
// THEME.JS — Hiểu Uyên / ANIME · GENZ · HIPHOP
// Design system cho toàn bộ embed của bot
// =============================================

const { EmbedBuilder } = require('discord.js');

// ── Palette ───────────────────────────────────
const C = {
  hot:      0xFF2E93, // spray pink
  neon:     0xA855F7, // purple neon
  cyber:    0x26F0FF, // cyan
  lime:     0xCCFF00, // acid lime
  gold:     0xFFD60A, // mustard gold
  orange:   0xFF7A1A, // graffiti orange
  blood:    0xFF4D6D,
  ink:      0x08070C,
  smoke:    0x17151F,
  sky:      0x60A5FA,
  mint:     0x34D399,
  white:    0xF5F3FF
};

const HEX = {
  hot: '#FF2E93',
  neon: '#A855F7',
  cyber: '#26F0FF',
  lime: '#CCFF00',
  gold: '#FFD60A',
  orange: '#FF7A1A',
  blood: '#FF4D6D',
  ink: '#08070C',
  smoke: '#17151F',
  sky: '#60A5FA',
  mint: '#34D399',
  white: '#F5F3FF'
};

const BRAND = 'HIỂU UYÊN';
const DIVIDER = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
const DOT = '✦';

// ── Rarity ────────────────────────────────────
const RARITY = {
  common:    { label: 'COMMON',    color: C.smoke,  hex: HEX.smoke,  stars: '★',     emoji: '◽' },
  uncommon:  { label: 'UNCOMMON',  color: C.mint,   hex: HEX.mint,   stars: '★★',    emoji: '🟩' },
  rare:      { label: 'RARE',      color: C.sky,    hex: HEX.sky,    stars: '★★★',   emoji: '🟦' },
  epic:      { label: 'EPIC',      color: C.neon,   hex: HEX.neon,   stars: '★★★★',  emoji: '🟪' },
  legendary: { label: 'LEGENDARY', color: C.gold,   hex: HEX.gold,   stars: '★★★★★', emoji: '🟧' },
  N:         { label: 'N',         color: 0x9CA3AF, hex: '#9CA3AF',  stars: '★',     emoji: '◽' },
  R:         { label: 'R',         color: C.cyber,  hex: HEX.cyber,  stars: '★★',    emoji: '🟦' },
  SR:        { label: 'SR',        color: C.neon,   hex: HEX.neon,   stars: '★★★',   emoji: '🟪' },
  SSR:       { label: 'SSR',       color: C.hot,    hex: HEX.hot,    stars: '★★★★',  emoji: '🟥' },
  UR:        { label: 'UR',        color: C.gold,   hex: HEX.gold,   stars: '★★★★★', emoji: '🟨' }
};

const rarityMeta = (r) => RARITY[r] || RARITY.common;

// ── Text helpers ──────────────────────────────
const clamp = (s = '', n = 4000) => (s.length > n ? s.slice(0, n - 3) + '...' : s);
const fmtNum = (n = 0) => {
  n = Number(n) || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'K';
  return n.toLocaleString('vi-VN');
};

/** Thanh tiến độ kiểu genZ: ▰▰▰▱▱▱ */
const bar = (current, max, len = 12) => {
  const pct = max > 0 ? Math.max(0, Math.min(current / max, 1)) : 0;
  const filled = Math.round(pct * len);
  return '▰'.repeat(filled) + '▱'.repeat(Math.max(0, len - filled));
};

const pct = (current, max) => (max > 0 ? Math.min(100, (current / max) * 100) : 0).toFixed(0);

const pad = (s, n) => String(s).padEnd(n, ' ');

// ── Hype lines ────────────────────────────────
const HYPE = {
  profile: [
    'ảnh này đăng story là nổ thông báo đó nha',
    'aura +9999, không cần giải thích nhiều',
    'flow này không cần beat vẫn chạy',
    'cả server đang chờ bạn lên mic',
    'vibe này là vibe không ai copy được',
    'mixtape của bạn đang top 1 trending'
  ],
  levelup: [
    'level up mà aura cũng up theo, slay',
    'đi lên đi, đừng dừng lại ở đây',
    'một bước nữa tới huyền thoại rồi đó',
    'server này có bạn là có năng lượng'
  ],
  daily: [
    'điểm danh xong rồi, hôm nay auto may mắn',
    'một ngày mới, một flex mới',
    'nhận lương tinh thần đều đặn nha',
    'giữ streak này, đừng để mất aura'
  ],
  win: [
    'quá đỉnh, không cần bàn cãi',
    'kèo này bạn cân cả sân',
    'bar này cả sân phải cúi đầu',
    'chiến thắng này xứng đáng được lưu vào sử sách server'
  ],
  ship: [
    'chemistry này là chemistry thật, không phải edit',
    'hai người hợp nhau tới mức bot cũng phải ghen',
    'kèo thơm, cả server đang đẩy thuyền',
    'duyên này do vũ trụ sắp đặt rồi'
  ],
  gacha: [
    'luck này nên đi mua vé số',
    'banner này thương bạn đó',
    'một pull đổi vận, quá hời',
    'bộ sưu tập của bạn đang cháy'
  ]
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const hype = (kind) => pick(HYPE[kind] || HYPE.profile);

// ── Building blocks ───────────────────────────
const footer = (section = 'ANIME GENZ HIPHOP') =>
  `▸ ${BRAND} · ON THE MIC · ${section}`;

const header = (title, sub = '') =>
  `**『 ${title} 』**${sub ? `\n*${sub}*` : ''}\n${DIVIDER}`;

const field = (label, value) => `> **${label}** · ${value}`;

const quote = (text) => `>>> *“${text}”*`;

/** Khung "sticker" cho một khối text */
const block = (title, body) =>
  `**╭─ ${title}**\n${body.split('\n').map(l => `**│** ${l}`).join('\n')}\n**╰─**`;

// ── Embed factory ─────────────────────────────
function baseEmbed(opts = {}) {
  const e = new EmbedBuilder()
    .setColor(opts.color ?? C.hot)
    .setFooter({ text: opts.footer || footer(opts.section) });

  if (opts.title) e.setTitle(opts.title);
  if (opts.description) e.setDescription(clamp(opts.description, 4000));
  if (opts.thumbnail) e.setThumbnail(opts.thumbnail);
  if (opts.image) e.setImage(opts.image);
  if (opts.author) e.setAuthor(opts.author);
  if (opts.url) e.setURL(opts.url);
  if (Array.isArray(opts.fields) && opts.fields.length) {
    e.addFields(opts.fields.slice(0, 25).map(f => ({
      name: clamp(f.name, 250),
      value: clamp(String(f.value), 1000) || '—',
      inline: !!f.inline
    })));
  }
  e.setTimestamp(opts.timestamp === false ? null : new Date());
  return e;
}

const successEmbed = (title, description, opts = {}) =>
  baseEmbed({ ...opts, color: C.mint, title: `✅ ${title}`, description });

const errorEmbed = (title, description, opts = {}) =>
  baseEmbed({ ...opts, color: C.blood, title: `💥 ${title}`, description });

const warnEmbed = (title, description, opts = {}) =>
  baseEmbed({ ...opts, color: C.gold, title: `⚠️ ${title}`, description });

const infoEmbed = (title, description, opts = {}) =>
  baseEmbed({ ...opts, color: C.cyber, title: `💬 ${title}`, description });

/** Embed có ảnh đính kèm (profile card, starmap, ...) */
const imageEmbed = ({ title, description, image = 'attachment://card.png', color = C.hot, section, fields }) =>
  baseEmbed({ title, description, image, color, section, fields });

// ── Rank ladder ───────────────────────────────
const RANKS = [
  { min: 100, name: 'TINH TÚ VĨNH CỬU', short: 'UR', tag: 'GOAT', color: HEX.gold,   emoji: '👑' },
  { min: 75,  name: 'BẤT TỬ SERVER',    short: 'SSR', tag: 'IMMORTAL', color: HEX.hot, emoji: '🔥' },
  { min: 50,  name: 'HUYỀN THOẠI',      short: 'SSR', tag: 'LEGEND',  color: HEX.hot,    emoji: '🌟' },
  { min: 30,  name: 'THẦN TƯỢNG',       short: 'SR', tag: 'ICON',     color: HEX.neon,   emoji: '💎' },
  { min: 20,  name: 'DÂN CHƠI',         short: 'SR', tag: 'HYPE',     color: HEX.neon,   emoji: '🎧' },
  { min: 10,  name: 'CÂN TEAM',         short: 'R',  tag: 'SOLID',    color: HEX.cyber,  emoji: '🎤' },
  { min: 5,   name: 'NEW FACE',         short: 'R',  tag: 'RISING',   color: HEX.cyber,  emoji: '🛹' },
  { min: 1,   name: 'TÂN BINH',         short: 'N',  tag: 'ROOKIE',   color: HEX.mint,   emoji: '🌱' }
];

const rankOf = (level = 1) => RANKS.find(r => level >= r.min) || RANKS[RANKS.length - 1];

// ── Section presets ───────────────────────────
const SECTIONS = {
  profile:  { emoji: '🪪', label: 'PROFILE CARD' },
  level:    { emoji: '📈', label: 'LEVEL SYSTEM' },
  economy:  { emoji: '💰', label: 'COIN HUSTLE' },
  shop:     { emoji: '🛒', label: 'THE VAULT' },
  social:   { emoji: '💞', label: 'TRI KỶ' },
  game:     { emoji: '🎮', label: 'GAME ZONE' },
  gacha:    { emoji: '🎴', label: 'MIXTAPE DECK' },
  rap:      { emoji: '🎤', label: 'RAP CYPHER' },
  health:   { emoji: '💧', label: 'HEALTH COACH' },
  quiz:     { emoji: '🧠', label: 'QUIZ ARENA' },
  quests:   { emoji: '📋', label: 'DAILY CYPHER' },
  ai:       { emoji: '🤖', label: 'AI COMPANION' },
  admin:    { emoji: '⚙️', label: 'CONTROL ROOM' },
  help:     { emoji: '📖', label: 'COMMAND LIST' }
};

const sectionName = (key) => SECTIONS[key]?.label || 'HIỂU UYÊN';

module.exports = {
  C, HEX, BRAND, DIVIDER, DOT, RARITY, RANKS, SECTIONS,
  rarityMeta, clamp, fmtNum, bar, pct, pad, pick, hype,
  footer, header, field, quote, block, sectionName, rankOf,
  baseEmbed, successEmbed, errorEmbed, warnEmbed, infoEmbed, imageEmbed
};
