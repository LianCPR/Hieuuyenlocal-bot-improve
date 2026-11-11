// =============================================
// CORE COMMANDS — profile · leaderboard · thành tựu · help
// =============================================

const {
  SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, MessageFlags
} = require('discord.js');

const theme = require('../ui/theme');
const { C, fmtNum, rankOf } = theme;
const {
  getOrCreateUser, getUser, getLeaderboard,
  xpForLevel, xpNeededForNextLevel
} = require('../database/models/users');
const {
  getUserAchievements, getAllAchievements, countUserAchievements
} = require('../database/models/achievements');
const { generateProfileCard } = require('../canvas/profileCard');
const { generateLeaderboardCard } = require('../canvas/charts');
const { generateHelpBanner, HELP_BANNER_FILE } = require('../canvas/helpBanner');

const EPH = { flags: MessageFlags.Ephemeral };

// ── PROFILE ───────────────────────────────────
const profileCommand = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('🪪 Profile card phong cách anime genZ của bạn')
    .addUserOption(o => o.setName('user').setDescription('Xem profile của ai đó').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null) || {
      displayName: target.displayName || target.username,
      displayAvatarURL: (opts) => target.displayAvatarURL(opts)
    };
    const user = getOrCreateUser(target.id, target.username);

    try {
      const card = await generateProfileCard(user, member);
      const file = new AttachmentBuilder(card, { name: 'card.png' });

      const rank = rankOf(user.level);
      const currentBase = xpForLevel(user.level);
      const nextAt = xpNeededForNextLevel(user.level);
      const progress = (user.xp - currentBase) / Math.max(1, nextAt - currentBase);

      const embed = theme.imageEmbed({
        title: `🪪 PROFILE // ${(member.displayName || user.username).toUpperCase()}`,
        color: C.hot,
        section: theme.sectionName('profile'),
        description: [
          `**${rank.name}** ${rank.emoji} · ${theme.bar(progress, 1, 14)} **${Math.round(progress * 100)}%**`,
          '',
          theme.field('Level', `**${user.level}** / 100`),
          theme.field('XP', `${fmtNum(user.xp)} / ${fmtNum(nextAt)}`),
          theme.field('Coins', `**${fmtNum(user.coins)}**`),
          theme.field('Danh hiệu', user.title || 'Tập Sự'),
          '',
          theme.quote(theme.hype('profile'))
        ].join('\n')
      });

      await interaction.editReply({ embeds: [embed], files: [file] });
    } catch (err) {
      console.error('profile card error:', err);
      await interaction.editReply({ embeds: [theme.errorEmbed('Card lỗi rồi', 'Thử lại sau vài giây nhé!')] });
    }
  }
};

// ── LEADERBOARD ───────────────────────────────
const leaderboardCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('🏆 Bảng xếp hạng server (có poster riêng)')
    .addStringOption(o =>
      o.setName('type').setDescription('Xếp theo gì?').setRequired(false)
        .addChoices(
          { name: '⭐ XP & Level', value: 'xp' },
          { name: '💰 Coins', value: 'coins' },
          { name: '💬 Tin nhắn', value: 'messages' },
          { name: '💧 Sức khỏe', value: 'health' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const type = interaction.options.getString('type') || 'xp';
    const users = getLeaderboard(type, 10);

    if (!users.length) {
      return interaction.editReply({ embeds: [theme.warnEmbed('Bảng trống', 'Chưa ai có dữ liệu. Chat vài câu đi nào!')] });
    }

    const avatars = await Promise.all(users.map(async u => {
      const cached = interaction.guild.members.cache.get(u.userId);
      if (cached) return cached.displayAvatarURL({ extension: 'png', size: 128 });
      try {
        const user = await interaction.client.users.fetch(u.userId);
        return user.displayAvatarURL({ extension: 'png', size: 128 });
      } catch { return null; }
    }));

    try {
      const card = await generateLeaderboardCard(users, { type, avatars });
      const file = new AttachmentBuilder(card, { name: 'charts.png' });

      await interaction.editReply({
        embeds: [theme.imageEmbed({
          title: '🏆 SERVER CHARTS',
          color: C.gold,
          section: theme.sectionName('level'),
          description: [
            theme.header('TOP 10', 'flex nhẹ thôi nha'),
            users.slice(0, 3).map((u, i) =>
              `${['🥇', '🥈', '🥉'][i]} **${u.username}** · ${u.level ? `LV ${u.level}` : ''} ${u.xp ? `· ${fmtNum(u.xp)} XP` : ''}`
            ).join('\n')
          ].join('\n')
        })],
        files: [file]
      });
    } catch (err) {
      console.error('leaderboard card error:', err);
      const description = users.map((u, i) => {
        const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
        return `${medal} **${u.username}** — LV ${u.level} · ${fmtNum(u.xp)} XP`;
      }).join('\n');
      await interaction.editReply({
        embeds: [theme.baseEmbed({ title: '🏆 SERVER CHARTS', color: C.gold, description, section: theme.sectionName('level') })]
      });
    }
  }
};

// ── THÀNH TỰU ─────────────────────────────────
const achievementsCommand = {
  data: new SlashCommandBuilder()
    .setName('thanhtu')
    .setDescription('🏅 Bộ sưu tập thành tựu của bạn')
    .addUserOption(o => o.setName('user').setDescription('Xem của ai đó').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const unlocked = getUserAchievements(target.id);
    const all = getAllAchievements();
    const count = countUserAchievements(target.id);

    const catNames = {
      general: '🌱 Khởi đầu', chat: '💬 Chat', level: '📈 Level',
      werewolf: '🐺 Ma Sói', health: '💧 Sức khỏe', quiz: '🧠 Quiz',
      social: '💞 Xã hội', economy: '💰 Kinh tế', gacha: '🎴 Gacha',
      minigame: '🎮 Mini-game'
    };

    const grouped = {};
    for (const a of unlocked) {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category].push(a);
    }

    const lines = Object.entries(grouped).map(([cat, items]) =>
      `**${catNames[cat] || cat}**\n${items.map(a => `${a.badgeIcon} ${a.name}`).join(' · ')}`
    );

    const embed = theme.baseEmbed({
      color: C.gold,
      section: theme.sectionName('profile'),
      title: `🏅 THÀNH TỰU // ${(target.displayName || target.username).toUpperCase()}`,
      thumbnail: target.displayAvatarURL({ extension: 'png', size: 256 }),
      description: [
        theme.header('BỘ SƯU TẬP', `${count}/${all.length} thành tựu`),
        `**${theme.bar(count, all.length, 16)}** ${Math.round((count / Math.max(1, all.length)) * 100)}%`,
        '',
        lines.join('\n\n') || '*Chưa mở khoá thành tựu nào. Bắt đầu chat, chơi game và quay gacha nhé!*',
        '',
        theme.quote(count >= all.length ? 'hoàn hảo, không còn gì để chứng minh' : 'còn vài cái nữa là full bộ đó')
      ].join('\n')
    });

    await interaction.reply({ embeds: [embed] });
  }
};

// ── HELP ──────────────────────────────────────
const HELP_PAGES = {
  overview: {
    title: '『 HIỂU UYÊN 』',
    subtitle: 'anime · genZ · hiphop edition',
    body: [
      '**>> NHỊP SỐNG SERVER**',
      '`/daily` nhận coin → `/nhiemvu` nhận thưởng → `/taixiu` thử vận → `/gametop` flex top',
      '',
      '**>> 8 TAB**',
      '🪪 Core · 💰 Economy · 💞 Social · 📋 Daily Quest',
      '🎮 Games · 🤖 AI · 💧 Life & Admin',
      '',
      '**>> QUICK START**',
      '`/profile` `/daily` `/nhiemvu` `/chat` `/quiz` `/gacha pull`',
      '',
      '-# chọn tab bên dưới để mở menu'
    ].join('\n')
  },
  core: {
    title: '🪪 CORE',
    subtitle: 'danh tính & flex',
    body: [
      '`/profile [user]` — poster profile anime, có rank stamp và XP bar',
      '`/info [user]` — thẻ thông tin Discord + dữ liệu bot',
      '`/leaderboard [type]` — bảng xếp hạng render thành ảnh',
      '`/thanhtu [user]` — bộ sưu tập thành tựu',
      '',
      '**TIP** · theme và viền mua ở `/shop`, trang bị bằng `/shop equip`'
    ].join('\n')
  },
  quests: {
    title: '📋 DAILY QUEST',
    subtitle: 'mỗi ngày ba việc nhỏ',
    body: [
      '`/nhiemvu` — mở bảng nhiệm vụ hôm nay (poster riêng)',
      'Mỗi ngày có **3 nhiệm vụ**, reset lúc **00:00** giờ Việt Nam.',
      '',
      '**CÁC LOẠI NHIỆM VỤ**',
      '`CHAT` gửi tin nhắn · `DAILY` điểm danh · `QUIZ` trả lời đúng',
      '`GACHA` quay thẻ · `WATER` uống nước · `SHIP` ship người · `RAP` battle',
      '',
      '**CÁCH NHẬN** · làm xong, bấm nút trên bảng nhiệm vụ hoặc **NHẬN TẤT CẢ**.',
      '-# nhiệm vụ của mỗi người là riêng, cùng ngày nhưng khác bộ'
    ].join('\n')
  },
  economy: {
    title: '💰 ECONOMY',
    subtitle: 'kiếm coin, tiêu coin',
    body: [
      '`/daily` — điểm danh hàng ngày, streak càng dài bonus càng cao',
      '`/shop list` — xem shop, mua trực tiếp bằng menu',
      '`/shop buy <item_id>` — mua nhanh',
      '`/shop inventory` — túi đồ + menu trang bị',
      '`/shop equip <item_id>` — mặc item',
      '',
      '**NGUỒN COIN** · daily, quiz, rap battle, ma sói, uống nước, gacha trùng thẻ'
    ].join('\n')
  },
  ai: {
    title: '🤖 AI COMPANION',
    subtitle: 'trò chuyện thật, nhớ ngữ cảnh',
    body: [
      '`/chat send noidung:<câu hỏi>` — nói chuyện với AI Hiểu Uyên',
      '`/chat reset` — xoá ngữ cảnh ở kênh hiện tại',
      '`/chat status` — kiểm tra model và số lượt còn lại',
      '',
      '**TAG BOT** · mention @Hiểu Uyên kèm câu hỏi để chat tự nhiên trong kênh',
      '',
      '**NGỮ CẢNH** · AI nhớ 12 tin gần nhất theo từng người + kênh',
      '**GIỚI HẠN** · 1 tin mỗi 3.5 giây, tối đa 40 tin/giờ',
      '-# cần AI_API_KEY trong `.env`; bot sẽ hướng dẫn nếu chưa có'
    ].join('\n')
  },
  social: {
    title: '💞 SOCIAL',
    subtitle: 'kết nối & battle',
    body: [
      '`/triky xem @user` — xem mối quan hệ + starmap',
      '`/triky danhsach` — danh sách tri kỷ',
      '`/triky top` — top cặp đôi server',
      '`/bantin @user` — tạo bản tin sao',
      '`/ship @user` — đo độ hợp nhau bằng ảnh',
      '`/rapbattle @user [topic]` — battle bar 1v1, cả server vote',
      '`/raptop` — bảng xếp hạng rap battle',
      '',
      '**CÁCH TÍNH ĐIỂM TÌNH CẢM** · tag nhau, react, chơi game chung, battle cùng nhau'
    ].join('\n')
  },
  games: {
    title: '🎮 GAMES',
    subtitle: 'chơi là có thưởng',
    body: [
      '`/masoi tao|tham|bat|huy|vote` — game ma sói đầy đủ role',
      '`/quiz [category]` — quiz 30 giây, streak càng cao thưởng càng lớn',
      '`/taixiu <cược> <tài|xỉu>` — tài xỉu 3 xúc xắc, thắng 1:1',
      '`/oanthu <cược> <kéo|búa|bao>` — oẳn tù tì, hoà hoàn cược',
      '`/doanso <cược> <1-6>` — đoán số, trúng lời x3',
      '`/baucua <cược> <bầu|cua|tôm|cá|gà|nai>` — bầu cua 3 xúc xắc, trúng 1–3 lần ăn theo số lần · card kết quả',
      '`/gametop [game] [sort]` — bảng xếp hạng mini-game theo thắng hoặc lãi',
      '**CARD KẾT QUẢ** · Tài Xỉu, Oẳn Tù Tì, Đoán Số và Bầu Cua đều có poster riêng',
      '`/gacha pull [số lượng]` — quay thẻ anime (120 coin/lượt)',
      '`/gacha collection [user]` — bộ sưu tập thẻ',
      '`/gacha info` — tỉ lệ, bảo hiểm, top collector',
      '',
      '**GACHA** · multi 10 lượt = 1.000 coin, chắc chắn có SR+, bảo hiểm SSR ở mốc 80 lượt'
    ].join('\n')
  },
  life: {
    title: '💧 LIFE',
    subtitle: 'chăm sóc bản thân',
    body: [
      '`/health water` — ghi nhận uống nước, nhận XP + coin',
      '`/health streak` — xem chuỗi ngày',
      '`/health top` — top người chăm nhất',
      '`/sticker` — biến avatar thành sticker poster',
      '`/thongke` — server check dạng ảnh',
      '`/gianghoa` — hạ nhiệt tranh luận (cần quyền Manage Messages)',
      '',
      '**ADMIN** · `/setup auto` hoặc `/setup channel` để cấu hình kênh'
    ].join('\n')
  }
};

const HELP_TABS = [
  { value: 'overview', label: 'Tổng quan', emoji: '🌸', description: 'Bắt đầu nhanh & vibe bot', accent: C.hot, poster: 'OVERVIEW', tagline: 'nhịp sống server trong một tab', chips: ['START', 'DAILY', 'HELP'] },
  { value: 'core', label: 'Core', emoji: '🪪', description: 'Profile, BXH, thành tựu, info', accent: C.cyber, poster: 'CORE', tagline: 'danh tính & flex', chips: ['PROFILE', 'TOP', 'BADGES'] },
  { value: 'economy', label: 'Economy', emoji: '💰', description: 'Daily, shop, túi đồ', accent: C.gold, poster: 'ECONOMY', tagline: 'kiếm coin, tiêu coin', chips: ['SHOP', 'DAILY', 'INVENTORY'] },
  { value: 'social', label: 'Social', emoji: '💞', description: 'Tri kỷ, ship, rap battle', accent: C.hot, poster: 'SOCIAL', tagline: 'kết nối & battle', chips: ['SOCIAL', 'SHIP', 'RAP'] },
  { value: 'quests', label: 'Daily Quest', emoji: '📋', description: 'Nhiệm vụ hằng ngày', accent: C.lime, poster: 'DAILY QUEST', tagline: 'mỗi ngày ba việc nhỏ', chips: ['DAILY', 'CLAIM', 'STREAK'] },
  { value: 'ai', label: 'AI Chat', emoji: '🤖', description: 'Trò chuyện AI thật', accent: C.neon, poster: 'AI COMPANION', tagline: 'trò chuyện thật, nhớ ngữ cảnh', chips: ['CHAT', 'CONTEXT', 'LIMIT'] },
  { value: 'games', label: 'Games', emoji: '🎮', description: 'Ma sói, quiz, gacha, bầu cua', accent: C.orange, poster: 'GAME ZONE', tagline: 'chơi là có thưởng', chips: ['GACHA', 'QUIZ', 'BẦU CUA'] },
  { value: 'life', label: 'Life & Admin', emoji: '💧', description: 'Health, sticker, setup', accent: C.mint, poster: 'LIFE & ADMIN', tagline: 'chăm sóc bản thân & server', chips: ['WATER', 'STICKER', 'SETUP'] }
];

const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📖 Danh sách lệnh + hướng dẫn nhanh'),

  async execute(interaction) {
    await interaction.reply(await buildHelpPayload('overview', interaction.client));
  }
};

/** Dùng cho select menu trong events */
function buildHelpEmbed(value, client) {
  const key = HELP_PAGES[value] ? value : 'overview';
  const page = HELP_PAGES[key];
  const tab = HELP_TABS.find(t => t.value === key) || HELP_TABS[0];
  const index = HELP_TABS.findIndex(t => t.value === key);
  const title = page.title.startsWith(tab.emoji) ? page.title : `${tab.emoji} ${page.title}`;

  return theme.baseEmbed({
    color: tab.accent,
    section: theme.sectionName('help'),
    author: client?.user
      ? { name: 'HIỂU UYÊN · COMMAND DECK', iconURL: client.user.displayAvatarURL({ extension: 'png', size: 64 }) }
      : undefined,
    thumbnail: client?.user?.displayAvatarURL({ extension: 'png', size: 256 }),
    title,
    description: [
      `*${page.subtitle}*`,
      `\`TAB ${String(index + 1).padStart(2, '0')}/${String(HELP_TABS.length).padStart(2, '0')}\` · ${tab.tagline}`,
      theme.DIVIDER,
      page.body,
      '',
      `-# ${tab.emoji} ${tab.label} · chọn tab bên dưới để đổi`
    ].join('\n')
  });
}

/** Menu chọn tab, giữ nguyên customId để events xử lý */
function buildHelpComponents(value) {
  const current = HELP_PAGES[value] ? value : 'overview';
  const tab = HELP_TABS.find(t => t.value === current) || HELP_TABS[0];

  return [new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_select')
      .setPlaceholder(`✦ ${tab.emoji} ${tab.label.toUpperCase()} · đổi tab`)
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(HELP_TABS.map(t => ({
        label: t.label,
        value: t.value,
        emoji: t.emoji,
        description: t.description,
        default: t.value === current
      })))
  )];
}

/** Payload đầy đủ: embed + menu + banner poster (fallback nếu canvas lỗi). */
async function buildHelpPayload(value, client) {
  const key = HELP_PAGES[value] ? value : 'overview';
  const tab = HELP_TABS.find(t => t.value === key) || HELP_TABS[0];
  const index = HELP_TABS.findIndex(t => t.value === key);
  const embed = buildHelpEmbed(key, client);

  try {
    const banner = await generateHelpBanner({
      key,
      index,
      total: HELP_TABS.length,
      label: tab.label,
      poster: tab.poster,
      tagline: tab.tagline,
      accent: tab.accent,
      chips: tab.chips,
      avatar: client?.user?.displayAvatarURL?.({ extension: 'png', size: 128 }) || null
    });
    embed.setImage(`attachment://${HELP_BANNER_FILE}`);
    return {
      embeds: [embed],
      components: buildHelpComponents(key),
      files: [new AttachmentBuilder(banner, { name: HELP_BANNER_FILE })]
    };
  } catch (err) {
    console.error('help banner error:', err);
    return { embeds: [embed], components: buildHelpComponents(key) };
  }
}

module.exports = [
  profileCommand, leaderboardCommand, achievementsCommand, helpCommand
];

module.exports.HELP_PAGES = HELP_PAGES;
module.exports.HELP_TABS = HELP_TABS;
module.exports.buildHelpEmbed = buildHelpEmbed;
module.exports.buildHelpComponents = buildHelpComponents;
module.exports.buildHelpPayload = buildHelpPayload;
