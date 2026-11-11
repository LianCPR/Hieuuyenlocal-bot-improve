// =============================================
// INFO — thẻ thông tin Discord + dữ liệu bot
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const theme = require('../ui/theme');
const { C, fmtNum, rankOf } = theme;
const {
  getOrCreateUser, xpForLevel, xpNeededForNextLevel
} = require('../database/models/users');
const { countUserAchievements } = require('../database/models/achievements');
const { getQuestSummary } = require('../database/models/quests');
const gacha = require('../database/models/gacha');
const mini = require('../database/models/minigames');

const infoCommand = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('🪪 Thông tin Discord + dữ liệu bot của bạn')
    .addUserOption(o => o
      .setName('user')
      .setDescription('Xem thông tin của người khác')
      .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;

    if (target.bot) {
      return interaction.reply({
        embeds: [theme.warnEmbed('BOT KHÔNG CÓ INFO', 'Chọn một người thật để xem nhé.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const member = interaction.options.getMember('user')
      || (target.id === interaction.user.id ? interaction.member : null);
    const user = getOrCreateUser(target.id, target.username);

    const achievements = countUserAchievements(target.id);
    const quests = getQuestSummary(target.id);
    const collection = gacha.getCollectionSummary(target.id);
    const games = mini.getSummary(target.id);

    const xpBase = xpForLevel(user.level);
    const xpNext = xpNeededForNextLevel(user.level);
    const xpPct = Math.max(0, Math.min(100, Math.round(((user.xp - xpBase) / Math.max(1, xpNext - xpBase)) * 100)));
    const rank = rankOf(user.level);

    const roles = member?.roles?.cache
      ? [...member.roles.cache.values()]
        .filter(r => r.id !== interaction.guildId)
        .sort((a, b) => b.position - a.position)
      : [];
    const roleText = roles.length
      ? `${roles.slice(0, 3).map(r => r.name).join(', ')}${roles.length > 3 ? ` +${roles.length - 3}` : ''}`
      : '—';

    const createdAt = target.createdAt
      ? `<t:${Math.floor(target.createdAt.getTime() / 1000)}:D>`
      : '—';
    const joinedAt = member?.joinedAt
      ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:D>`
      : '—';

    const embed = theme.baseEmbed({
      color: C.cyber,
      section: theme.sectionName('profile'),
      title: `🪪 INFO // ${(member?.displayName || target.globalName || target.username).toUpperCase()}`,
      thumbnail: target.displayAvatarURL({ extension: 'png', size: 256 }),
      description: [
        theme.header('DISCORD', `@${target.username}`),
        theme.field('ID', `\`${target.id}\``),
        theme.field('Tài khoản tạo', createdAt),
        theme.field('Vào server', joinedAt),
        theme.field('Biệt danh', member?.nickname || '—'),
        theme.field('Role', roleText),
        '',
        theme.header('BOT DATA', `level ${user.level} · ${rank.short}`),
        `**${theme.bar(xpPct, 100, 14)}** **${xpPct}%** tới level tiếp theo`,
        '',
        theme.field('Cấp / Rank', `**${user.level}** · ${rank.short} · ${rank.name}`),
        theme.field('Coin', `**${fmtNum(user.coins || 0)}**`),
        theme.field('Tin nhắn', `**${fmtNum(user.totalMessages || 0)}**`),
        theme.field('Thành tựu', `**${achievements}**`),
        theme.field('Nhiệm vụ hôm nay', `**${quests.done}/${quests.total}**`),
        theme.field('Bộ sưu tập', `**${collection.unique}/${collection.all}** thẻ`),
        theme.field('Mini-game', `**${games.played}** ván · **${games.won}** thắng · lãi/lỗ **${games.profit >= 0 ? '+' : ''}${fmtNum(games.profit)}**`),
        '',
        theme.quote('thông tin đủ để flex, không đủ để doxx')
      ].join('\n')
    });

    await interaction.reply({ embeds: [embed] });
  }
};

module.exports = infoCommand;
