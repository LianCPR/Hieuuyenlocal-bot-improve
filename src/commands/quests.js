// =============================================
// QUEST COMMANDS — bảng nhiệm vụ hằng ngày
// =============================================

const {
  SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  AttachmentBuilder, MessageFlags
} = require('discord.js');

const theme = require('../ui/theme');
const { C, fmtNum } = theme;
const { generateQuestCard } = require('../canvas/questCard');
const {
  getDailyQuests, getQuestSummary, claimQuest, claimAllQuests, todayKey
} = require('../database/models/quests');
const { getOrCreateUser } = require('../database/models/users');

const EPH = { flags: MessageFlags.Ephemeral };

const QUEST_EMOJI = {
  messages: '💬', daily: '📅', quiz: '🧠', gacha: '🎴',
  water: '💧', ship: '💞', rap: '🎤'
};

function buildQuestComponents(userId, quests) {
  const rows = [];
  const row = new ActionRowBuilder();

  for (const q of quests.slice(0, 3)) {
    const ready = q.progress >= q.target;
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`quest:claim:${userId}:${q.questId}`)
        .setEmoji(q.claimed ? '✅' : (QUEST_EMOJI[q.questType] || '✦'))
        .setLabel(
          q.claimed ? `Đã nhận · ${q.short}`
            : ready ? `Nhận ${q.short} · +${q.coins}`
              : `${q.short} · ${q.progress}/${q.target}`
        )
        .setStyle(q.claimed ? ButtonStyle.Secondary : ready ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(Boolean(q.claimed) || !ready)
    );
  }
  rows.push(row);

  const readyCount = quests.filter(q => !q.claimed && q.progress >= q.target).length;
  if (readyCount) {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`quest:claimall:${userId}`)
        .setLabel(`NHẬN TẤT CẢ · ${readyCount}`)
        .setEmoji('🎁')
        .setStyle(ButtonStyle.Primary)
    ));
  }

  return rows;
}

async function buildQuestView(user, quests, summary) {
  const dateLabel = todayKey().split('-').reverse().join('/');
  const card = await generateQuestCard({
    username: user.username,
    dateLabel,
    quests,
    summary
  });
  const file = new AttachmentBuilder(card, { name: 'quests.png' });

  const embed = theme.imageEmbed({
    title: '📋 NHIỆM VỤ HÔM NAY',
    color: C.neon,
    section: theme.sectionName('quests'),
    description: [
      theme.header('DAILY QUEST BOARD', `${summary.done}/${summary.total} hoàn thành · ${summary.claimed} đã nhận`),
      `> Mỗi ngày 3 nhiệm vụ, làm xong bấm nút để nhận coin + XP.`,
      `> Nhiệm vụ reset lúc **00:00** giờ Việt Nam.`,
      '',
      theme.field('Sẵn sàng nhận', `**${summary.ready}** nhiệm vụ`),
      theme.field('Đã nhận hôm nay', `**${summary.claimed}/${summary.total}**`),
      '',
      theme.quote('làm đủ ba việc nhỏ, ngày mai tự khác nhẹ hơn')
    ].join('\n'),
    image: 'attachment://quests.png'
  });

  return { embed, file, components: buildQuestComponents(user.userId, quests) };
}

const questCommand = {
  data: new SlashCommandBuilder()
    .setName('nhiemvu')
    .setDescription('📋 Nhiệm vụ hằng ngày — làm xong nhận coin + XP'),

  async execute(interaction) {
    getOrCreateUser(interaction.user.id, interaction.user.username);
    await interaction.deferReply();

    const summary = getQuestSummary(interaction.user.id);
    const view = await buildQuestView(
      { userId: interaction.user.id, username: interaction.user.displayName || interaction.user.username },
      summary.quests,
      summary
    );

    await interaction.editReply({
      embeds: [view.embed],
      files: [view.file],
      components: view.components
    });
  }
};

/** Xử lý nút nhận thưởng (gọi từ events) */
async function handleQuestButton(interaction) {
  const [prefix, action, userId, questId] = interaction.customId.split(':');
  if (prefix !== 'quest') return false;

  if (interaction.user.id !== userId) {
    await interaction.reply({
      content: '🚫 Bảng nhiệm vụ này không phải của bạn. Gõ `/nhiemvu` để mở bảng riêng nhé.',
      ...EPH
    });
    return true;
  }

  if (action === 'claim') {
    const result = claimQuest(userId, questId);
    if (!result.success) {
      await interaction.reply({ content: result.message, ...EPH });
      return true;
    }

    const quests = getDailyQuests(userId);
    await interaction.update({ components: buildQuestComponents(userId, quests) });
    await interaction.followUp({
      embeds: [theme.successEmbed(
        'NHẬN THƯỞNG XONG',
        [
          `**${result.quest.label}**`,
          theme.field('Phần thưởng', `**+${fmtNum(result.coins)}** coin · **+${fmtNum(result.xp)}** XP`),
          '',
          theme.quote('một việc nhỏ xong rồi, thêm một việc nữa nha')
        ].join('\n')
      )],
      ...EPH
    });
    return true;
  }

  if (action === 'claimall') {
    const result = claimAllQuests(userId);

    if (!result.claimed.length) {
      await interaction.reply({ content: '⌛ Chưa có nhiệm vụ nào sẵn sàng nhận.', ...EPH });
      return true;
    }

    const quests = getDailyQuests(userId);
    await interaction.update({ components: buildQuestComponents(userId, quests) });
    await interaction.followUp({
      embeds: [theme.successEmbed(
        'NHẬN TẤT CẢ',
        [
          `Đã nhận **${result.claimed.length}** nhiệm vụ:`,
          result.claimed.map(q => `> **${q.label}**`).join('\n'),
          '',
          theme.field('Tổng thưởng', `**+${fmtNum(result.coins)}** coin · **+${fmtNum(result.xp)}** XP`)
        ].join('\n')
      )],
      ...EPH
    });
    return true;
  }

  return false;
}

module.exports = [questCommand];
module.exports.handleQuestButton = handleQuestButton;
module.exports.buildQuestComponents = buildQuestComponents;
