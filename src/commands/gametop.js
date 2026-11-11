// =============================================
// GAMETOP — bảng xếp hạng mini-game
// =============================================

const { SlashCommandBuilder } = require('discord.js');
const theme = require('../ui/theme');
const { C, fmtNum } = theme;
const mini = require('../database/models/minigames');

const GAMES = {
  all:    { emoji: '🎮', label: 'TẤT CẢ GAME' },
  taixiu: { emoji: '🎲', label: 'TÀI XỈU' },
  oanthu: { emoji: '✌️', label: 'OẲN TÙ TÌ' },
  doanso: { emoji: '🔢', label: 'ĐOÁN SỐ' }
};

const SORTS = {
  wins: 'SỐ VÁN THẮNG',
  profit: 'LÃI RÒNG'
};

const gameTopCommand = {
  data: new SlashCommandBuilder()
    .setName('gametop')
    .setDescription('🎮 Bảng xếp hạng mini-game — ai thắng nhiều, ai lãi đậm?')
    .addStringOption(o =>
      o.setName('game').setDescription('Xem game nào?').setRequired(false)
        .addChoices(
          { name: '🎮 Tất cả game', value: 'all' },
          { name: '🎲 Tài Xỉu', value: 'taixiu' },
          { name: '✌️ Oẳn Tù Tì', value: 'oanthu' },
          { name: '🔢 Đoán Số', value: 'doanso' }
        )
    )
    .addStringOption(o =>
      o.setName('sort').setDescription('Xếp theo gì?').setRequired(false)
        .addChoices(
          { name: '🏆 Số ván thắng', value: 'wins' },
          { name: '💰 Lãi ròng', value: 'profit' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const game = interaction.options.getString('game') || 'all';
    const sort = interaction.options.getString('sort') || 'wins';
    const meta = GAMES[game] || GAMES.all;
    const rows = mini.getLeaderboard({ game, sort, limit: 10 });

    if (!rows.length) {
      return interaction.editReply({
        embeds: [theme.warnEmbed(
          'BẢNG CÒN TRỐNG',
          'Chưa ai chơi mini-game. Thử `/taixiu`, `/oanthu` hoặc `/doanso` để mở bảng nhé!'
        )]
      });
    }

    const board = rows.map((row, index) => {
      const medal = ['🥇', '🥈', '🥉'][index] || `**${index + 1}.**`;
      const sign = row.profit >= 0 ? '+' : '';
      return [
        `${medal} **${row.username}**`,
        `> **${row.won}** thắng / **${row.played}** ván · ${Math.round(row.winRate * 100)}% · lãi **${sign}${fmtNum(row.profit)} coin**`
      ].join('\n');
    }).join('\n');

    const mine = game === 'all'
      ? mini.getSummary(interaction.user.id)
      : mini.getStats(interaction.user.id, game);
    const mySign = mine.profit >= 0 ? '+' : '';

    const embed = theme.baseEmbed({
      color: sort === 'profit' ? C.gold : C.hot,
      section: theme.sectionName('game'),
      title: `🎮 GAME CHARTS // ${meta.label}`,
      description: [
        theme.header('TOP 10', `${SORTS[sort]} · ${meta.emoji} ${meta.label}`),
        board,
        '',
        theme.field('Bạn', `${mine.won} thắng / ${mine.played} ván · lãi ${mySign}${fmtNum(mine.profit)} coin`),
        '',
        theme.quote(sort === 'profit' ? 'tiền không tự sinh ra, chỉ chảy về túi người chơi giỏi' : 'thắng nhiều chưa chắc lãi, nhưng ít nhất là thắng')
      ].join('\n')
    });

    await interaction.editReply({ embeds: [embed] });
  }
};

module.exports = gameTopCommand;
