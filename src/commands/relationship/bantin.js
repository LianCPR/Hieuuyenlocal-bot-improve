// =============================================
// /bantin — Bản tin tri kỷ với starmap
// =============================================

const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const theme = require('../../ui/theme');
const { C, fmtNum } = theme;
const { generateStarmap } = require('../../canvas/starmap');
const { getOrCreateUser } = require('../../database/models/users');
const {
  getOrCreateRelationship, addLovePoints, RELATIONSHIP_LEVELS
} = require('../../database/models/relationships');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bantin')
    .setDescription('🌌 Tạo bản tin tri kỷ với bầu trời sao')
    .addUserOption(o => o.setName('user').setDescription('Người tri kỷ của bạn').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user');

    if (target.id === interaction.user.id) {
      return interaction.editReply({
        embeds: [theme.warnEmbed('Không hợp lệ', 'Bạn không thể tạo bản tin với chính mình~')]
      });
    }
    if (target.bot) {
      return interaction.editReply({
        embeds: [theme.warnEmbed('Bot không có tình cảm', 'Chọn một người thật đi nha.')]
      });
    }

    getOrCreateUser(interaction.user.id, interaction.user.username);
    getOrCreateUser(target.id, target.username);

    const rel = getOrCreateRelationship(interaction.user.id, target.id);
    const levelInfo = RELATIONSHIP_LEVELS[rel.relationshipLevel] || RELATIONSHIP_LEVELS[1];

    addLovePoints(interaction.user.id, target.id, 5);

    const member2 = await interaction.guild.members.fetch(target.id).catch(() => null);

    try {
      const card = await generateStarmap(
        interaction.member?.displayName || interaction.user.username,
        member2?.displayName || target.username,
        rel.lovePoints + 5,
        rel.relationshipLevel,
        {
          avatar1: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
          avatar2: target.displayAvatarURL({ extension: 'png', size: 256 })
        }
      );
      const file = new AttachmentBuilder(card, { name: 'starmap.png' });

      const embed = theme.imageEmbed({
        title: '🌌 BẢN TIN TRI KỶ',
        color: C.hot,
        section: theme.sectionName('social'),
        description: [
          `**${interaction.user.displayName}** ${levelInfo.emoji} **${target.displayName}**`,
          '',
          '*Mỗi ngôi sao trên bầu trời đêm là một lần hai người chọn ở lại.*',
          '',
          theme.field('Cấp độ', `${levelInfo.name}`),
          theme.field('Điểm tình cảm', `**${fmtNum(rel.lovePoints + 5)}**`),
          theme.field('Game chung', `${rel.sharedGames} lần`),
          theme.field('Tương tác', `${rel.interactionCount} lần`),
          '',
          '-# +5 điểm tình cảm từ lần tạo bản tin này'
        ].join('\n')
      });

      await interaction.editReply({ embeds: [embed], files: [file] });
    } catch (err) {
      console.error('Starmap error:', err);
      await interaction.editReply({
        embeds: [theme.errorEmbed('Không vẽ được bản tin', 'Thử lại sau nhé!')]
      });
    }
  }
};
