// =============================================
// LIFE — health · hoà giải · sticker · server check
// =============================================

const {
  SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits, MessageFlags
} = require('discord.js');

const theme = require('../ui/theme');
const { C, fmtNum } = theme;
const {
  getOrCreateUser, getUser, addXp, updateCoins,
  updateWaterStreak, getLeaderboard
} = require('../database/models/users');
const { generateStickerCard } = require('../canvas/social');
const { generateServerCard } = require('../canvas/charts');
const { unlockAchievement } = require('../database/models/achievements');
const { getDb } = require('../database/database');
const { progressQuest } = require('../database/models/quests');

const EPH = { flags: MessageFlags.Ephemeral };

// ── HEALTH ────────────────────────────────────
const healthCommand = {
  data: new SlashCommandBuilder()
    .setName('health')
    .setDescription('💧 Góc chăm sóc bản thân')
    .addSubcommand(s => s.setName('water').setDescription('Ghi nhận đã uống nước hôm nay'))
    .addSubcommand(s => s.setName('streak').setDescription('Xem chuỗi ngày của bạn'))
    .addSubcommand(s => s.setName('top').setDescription('Top người chăm nhất')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'water') {
      getOrCreateUser(interaction.user.id, interaction.user.username);
      const result = updateWaterStreak(interaction.user.id);

      if (result?.alreadyDone) {
        return interaction.reply({
          embeds: [theme.infoEmbed('Đã ghi nhận rồi', 'Hôm nay bạn uống nước rồi nha~\n> Mai quay lại giữ streak nhé!')],
          ...EPH
        });
      }

      addXp(interaction.user.id, 10);
      updateCoins(interaction.user.id, 5);
      progressQuest(interaction.user.id, 'water');

      if (result?.streak >= 7) unlockAchievement(interaction.user.id, 'water_7');
      if (result?.streak >= 30) unlockAchievement(interaction.user.id, 'water_30');

      const streak = result?.streak || 1;

      await interaction.reply({
        embeds: [theme.baseEmbed({
          color: C.cyber,
          section: theme.sectionName('health'),
          title: '💧 ĐÃ UỐNG NƯỚC',
          description: [
            theme.header('HEALTH CHECK', 'cơ thể cảm ơn bạn'),
            theme.field('Streak', `🔥 **${streak} ngày** liên tiếp`),
            theme.field('Thưởng', '+10 XP · +5 coins'),
            '',
            `**${theme.bar(streak, 7, 12)}** ${streak >= 7 ? 'đã qua mốc 7 ngày!' : `${7 - streak} ngày nữa tới mốc 7`}`,
            '',
            theme.quote(streak >= 7 ? 'đại dương nội tâm luôn đầy' : 'uống thêm một ngụm nữa đi nè')
          ].join('\n')
        })]
      });
      return;
    }

    if (sub === 'streak') {
      const user = getUser(interaction.user.id);
      if (!user) return interaction.reply({ embeds: [theme.warnEmbed('Chưa có dữ liệu', 'Dùng `/health water` trước nhé.')], ...EPH });

      const s = user.waterStreak || 0;
      const message =
        s >= 30 ? '🌊 Chuỗi này bền như đại dương, đỉnh thật.' :
        s >= 7 ? '💎 Streak 7+ ngày, quá đáng nể.' :
        s >= 3 ? '🌱 Đang lên đều, giữ nhịp nha.' :
        '💡 Bắt đầu từ hôm nay là được.';

      await interaction.reply({
        embeds: [theme.baseEmbed({
          color: C.cyber,
          section: theme.sectionName('health'),
          title: `💧 STREAK // ${interaction.user.displayName.toUpperCase()}`,
          description: [
            theme.header(`${s} NGÀY LIÊN TIẾP`, message),
            `**${theme.bar(s, 30, 20)}** ${s}/30`,
            '',
            theme.field('Tổng XP', fmtNum(user.xp)),
            theme.field('Coins', fmtNum(user.coins))
          ].join('\n')
        })]
      });
      return;
    }

    const top = getLeaderboard('health', 10);

    await interaction.reply({
      embeds: [theme.baseEmbed({
        color: C.cyber,
        section: theme.sectionName('health'),
        title: '💧 TOP WATER CREW',
        description: [
          theme.header('CHUỖI NGÀY DÀI NHẤT', 'uống nước đều là một siêu năng lực'),
          top.map((u, i) => `${['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`} **${u.username}** — 🔥 ${u.waterStreak} ngày`).join('\n') || '*Chưa ai bắt đầu.*'
        ].join('\n')
      })]
    });
  }
};

// ── HOÀ GIẢI ──────────────────────────────────
const gianghoaCommand = {
  data: new SlashCommandBuilder()
    .setName('gianghoa')
    .setDescription('🕊️ Hạ nhiệt tranh luận trong kênh')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    await interaction.reply({
      embeds: [theme.baseEmbed({
        color: C.mint,
        section: theme.sectionName('social'),
        title: '🕊️ HẠ NHIỆT NÀO CẢ NHÀ',
        description: [
          theme.header('BÌNH TĨNH TRƯỚC ĐÃ', 'không ai thắng một cuộc cãi nhau'),
          '> Mỗi người đều có lý do để nghĩ như vậy.',
          '> Nhưng ở đây, chúng ta cần hiểu nhau hơn là thắng nhau.',
          '',
          '**Gợi ý:**',
          '`01` Nói lại điều bạn muốn, đừng nói người kia sai.',
          '`02` Cho nhau 5 phút im lặng, đừng trả lời khi còn nóng.',
          '`03` Nếu cần, nhờ mod vào giúp thay vì tự xử.',
          '',
          theme.quote('một server ấm là một server biết dừng đúng lúc'),
          '',
          '-# kênh này nên được làm mới sau khi mọi người bình tĩnh'
        ].join('\n')
      })]
    });
  }
};

// ── STICKER ───────────────────────────────────
const stickerCommand = {
  data: new SlashCommandBuilder()
    .setName('sticker')
    .setDescription('🖼️ Biến avatar thành poster sticker')
    .addStringOption(o => o.setName('tagline').setDescription('Câu chữ dưới sticker (tuỳ chọn)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();
    const tagline = interaction.options.getString('tagline') || 'certified vibe';

    try {
      const card = await generateStickerCard({
        name: interaction.user.username,
        avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 512 }),
        tagline
      });
      const file = new AttachmentBuilder(card, { name: 'sticker.png' });

      unlockAchievement(interaction.user.id, 'sticker_maker');

      await interaction.editReply({
        embeds: [theme.imageEmbed({
          title: '🖼️ STICKER CỦA BẠN',
          color: C.cyber,
          section: theme.sectionName('social'),
          description: [
            `**@${interaction.user.username}**`,
            theme.quote(tagline),
            '',
            '-# lưu về làm sticker Telegram/Discord tuỳ thích'
          ].join('\n')
        })],
        files: [file]
      });
    } catch (err) {
      console.error('sticker error:', err);
      await interaction.editReply({ embeds: [theme.errorEmbed('Không tạo được sticker', 'Thử lại sau nhé!')] });
    }
  }
};

// ── SERVER CHECK ──────────────────────────────
const thongkeCommand = {
  data: new SlashCommandBuilder()
    .setName('thongke')
    .setDescription('📊 Server check — ảnh tổng quan server'),

  async execute(interaction) {
    await interaction.deferReply();
    const db = getDb();

    const stats = {
      members: interaction.guild.memberCount,
      messages: db.prepare('SELECT SUM(totalMessages) as c FROM users').get().c || 0,
      topLevel: db.prepare('SELECT MAX(level) as c FROM users').get().c || 0,
      games: db.prepare('SELECT SUM(gamesPlayed) as c FROM werewolf_stats').get().c || 0,
      cards: db.prepare('SELECT COUNT(*) as c FROM gacha_cards').get().c || 0
    };

    const top = getLeaderboard('xp', 5);

    try {
      const card = await generateServerCard({
        guildName: interaction.guild.name,
        iconURL: interaction.guild.iconURL({ extension: 'png', size: 256 }),
        stats,
        top
      });
      const file = new AttachmentBuilder(card, { name: 'server.png' });

      await interaction.editReply({
        embeds: [theme.imageEmbed({
          title: '📊 SERVER CHECK',
          color: C.neon,
          section: 'CONTROL ROOM',
          description: [
            `**${interaction.guild.name}**`,
            '',
            theme.field('Thành viên', fmtNum(stats.members)),
            theme.field('Tin nhắn', fmtNum(stats.messages)),
            theme.field('Level cao nhất', `**${stats.topLevel}**`),
            theme.field('Ma Sói', `${fmtNum(stats.games)} trận`),
            theme.field('Thẻ gacha', fmtNum(stats.cards))
          ].join('\n')
        })],
        files: [file]
      });
    } catch (err) {
      console.error('server card error:', err);
      await interaction.editReply({ embeds: [theme.errorEmbed('Không vẽ được ảnh', 'Thử lại sau nhé!')] });
    }
  }
};

module.exports = [healthCommand, gianghoaCommand, stickerCommand, thongkeCommand];
