// =============================================
// /setup — cấu hình kênh cho server
// =============================================

const {
  SlashCommandBuilder, ActionRowBuilder, ChannelType, PermissionFlagsBits, MessageFlags
} = require('discord.js');
const theme = require('../../ui/theme');
const { C } = theme;
const {
  getOrCreateGuild, updateGuildChannels, autoDetectChannels, getGuildSettings
} = require('../../database/models/guilds');

const EPH = { flags: MessageFlags.Ephemeral };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('⚙️ Cấu hình Hiểu Uyên cho server (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('auto').setDescription('🤖 Tự động tìm kênh phù hợp'))
    .addSubcommand(s =>
      s.setName('channel').setDescription('📌 Chọn kênh thủ công')
        .addStringOption(o =>
          o.setName('loai').setDescription('Loại kênh').setRequired(true)
            .addChoices(
              { name: '📰 Báo tường cuối tuần', value: 'diary' },
              { name: '💧 Nhắc sức khỏe', value: 'health' },
              { name: '🤖 Log bot', value: 'log' },
              { name: '👋 Chào thành viên mới', value: 'welcome' }
            )
        )
        .addChannelOption(o =>
          o.setName('channel').setDescription('Kênh muốn dùng')
            .addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand(s => s.setName('xem').setDescription('👀 Xem cấu hình hiện tại')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    getOrCreateGuild(interaction.guildId, interaction.guild.name);

    if (sub === 'auto') {
      await interaction.deferReply(EPH);

      const detected = autoDetectChannels(interaction.guild);
      updateGuildChannels(interaction.guildId, detected);

      const fmt = id => id ? `<#${id}>` : '*không tìm thấy*';

      await interaction.editReply({
        embeds: [theme.successEmbed('TỰ ĐỘNG CẤU HÌNH XONG', [
          `Server **${interaction.guild.name}** đã được set up.`,
          '',
          theme.field('Báo tường', fmt(detected.diaryChannelId)),
          theme.field('Sức khỏe', fmt(detected.healthChannelId)),
          theme.field('Bot log', fmt(detected.logChannelId)),
          theme.field('Chào mừng', fmt(detected.welcomeChannelId)),
          '',
          '-# đổi từng kênh bằng /setup channel'
        ].join('\n'))]
      });
      return;
    }

    if (sub === 'channel') {
      const loai = interaction.options.getString('loai');
      const channel = interaction.options.getChannel('channel');

      const keyMap = {
        diary: 'diaryChannelId', health: 'healthChannelId',
        log: 'logChannelId', welcome: 'welcomeChannelId'
      };
      const nameMap = {
        diary: '📰 Báo tường', health: '💧 Sức khỏe',
        log: '🤖 Log bot', welcome: '👋 Chào mừng'
      };

      updateGuildChannels(interaction.guildId, { [keyMap[loai]]: channel.id });

      await interaction.reply({
        embeds: [theme.successEmbed('ĐÃ CẬP NHẬT', `**${nameMap[loai]}** → <#${channel.id}>\n\n> Hiểu Uyên sẽ dùng kênh này từ bây giờ.`)],
        ...EPH
      });
      return;
    }

    const settings = getGuildSettings(interaction.guildId);
    const fmt = id => id ? `<#${id}>` : '*chưa cài*';

    await interaction.reply({
      embeds: [theme.baseEmbed({
        color: C.cyber,
        section: theme.sectionName('admin'),
        title: `⚙️ CẤU HÌNH // ${interaction.guild.name.toUpperCase()}`,
        description: [
          theme.header('CONTROL ROOM', 'mọi thứ ở một chỗ'),
          theme.field('📰 Báo tường', fmt(settings?.diaryChannelId)),
          theme.field('💧 Sức khỏe', fmt(settings?.healthChannelId)),
          theme.field('🤖 Log bot', fmt(settings?.logChannelId)),
          theme.field('👋 Chào mừng', fmt(settings?.welcomeChannelId)),
          '',
          '-# `/setup auto` để tự detect · `/setup channel` để chọn tay'
        ].join('\n')
      })],
      ...EPH
    });
  }
};
