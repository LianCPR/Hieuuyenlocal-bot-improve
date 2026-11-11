// =============================================
// RAP BATTLE — 1v1 bar battle có vote của server
// =============================================

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder
} = require('discord.js');

const theme = require('../../ui/theme');
const { getDb } = require('../../database/database');
const { addXp, updateCoins, getOrCreateUser } = require('../../database/models/users');
const { getOrCreateRelationship, addLovePoints } = require('../../database/models/relationships');
const { unlockAchievement } = require('../../database/models/achievements');
const { recordBattle, getBattleStats } = require('../../database/models/battles');
const { progressQuest } = require('../../database/models/quests');

const battles = new Map();
let battleSeq = 0;
let discordClient = null;

/** Gắn client để tìm channel khi hết giờ */
function setClient(client) { discordClient = client; }

const TOPICS = [
  'deadline lúc 23:59', 'trà sữa 0 đồng', 'crush seen không rep',
  'ngày đầu đi làm', 'giấc ngủ 4 tiếng', 'wifi lag giữa trận',
  'bữa ăn cuối tháng', 'đi muộn 1 phút', 'story không ai xem',
  'deadline content', 'chuyến xe buýt 7h', 'cú lừa của quán ăn đêm'
];

const KEYWORDS = [
  'flow', 'vibe', 'deadline', 'aura', 'cà phê', 'flex',
  'não', 'beat', 'sương', 'đèn đường', 'tai nghe', 'mưa'
];

const VERDICTS = [
  'BAR NÀY CÓ SỨC NẶNG', 'FLOW MƯỢT KHÔNG CẦN FILTER',
  'PUNCHLINE ĐÚNG CHỖ ĐAU', 'CẢ SÀN IM LẶNG', 'CÂU NÀY ĐI VÀO LỊCH SỬ'
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const newId = () => `b${++battleSeq}${Date.now().toString(36).slice(-3)}`;

const display = (user) => user.displayName || user.username || 'unknown';

/**
 * Mở battle mới
 */
async function openBattle(interaction, targetUser, topicOption) {
  const guildId = interaction.guildId;

  if (targetUser.id === interaction.user.id) {
    return interaction.reply({
      content: '🪞 Bạn không thể battle với chính mình được đâu~',
      ephemeral: true
    });
  }
  if (targetUser.bot) {
    return interaction.reply({
      content: '🤖 Bot không biết rap, chọn người thật đi nha.',
      ephemeral: true
    });
  }

  const existing = [...battles.values()].find(b =>
    b.guildId === guildId && b.channelId === interaction.channelId && b.state !== 'done'
  );
  if (existing) {
    return interaction.reply({
      content: '🎤 Kênh này đang có battle rồi, chờ kèo này xong đã!',
      ephemeral: true
    });
  }

  const id = newId();
  const topic = topicOption || pick(TOPICS);
  const words = [...KEYWORDS].sort(() => Math.random() - 0.5).slice(0, 4);

  const battle = {
    id,
    guildId,
    channelId: interaction.channelId,
    topic,
    words,
    state: 'writing',
    bars: { A: null, B: null },
    players: {
      A: { id: interaction.user.id, name: display(interaction.member) },
      B: { id: targetUser.id, name: display(interaction.guild.members.cache.get(targetUser.id) || targetUser) }
    },
    votes: new Map(),
    voteMessage: null,
    timer: null
  };

  battles.set(id, battle);
  setTimeout(() => abortBattle(id, '⏰ Hết giờ gửi bar, kèo này huỷ.'), 5 * 60 * 1000);

  getOrCreateUser(interaction.user.id, interaction.user.username);
  getOrCreateUser(targetUser.id, targetUser.username);
  getOrCreateRelationship(interaction.user.id, targetUser.id);

  const embed = theme.baseEmbed({
    color: theme.C.yellow || theme.C.gold,
    section: theme.sectionName('rap'),
    title: '🎤 RAP BATTLE — KÈO NÀY CĂNG',
    description: [
      theme.header('LUẬT CHƠI', 'gửi bar trước, cà khịa sau'),
      `**${battle.players.A.name}**  ⚔️  **${battle.players.B.name}**`,
      '',
      theme.field('Chủ đề', `**${topic}**`),
      theme.field('Từ khoá bắt buộc', words.map(w => `\`${w}\``).join(' · ')),
      '',
      '> Mỗi người bấm nút của mình, viết **1 bar (tối đa 200 ký tự)**.',
      '> Khi cả hai gửi xong, cả server vote trong **90 giây**.',
      '',
      theme.quote('không cần hay nhất, chỉ cần thật nhất')
    ].join('\n')
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rap_submit:${id}:A`)
      .setLabel(`🎤 ${battle.players.A.name}`.slice(0, 80))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`rap_submit:${id}:B`)
      .setLabel(`🎧 ${battle.players.B.name}`.slice(0, 80))
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.reply({ embeds: [embed], components: [row] });
  return battle;
}

/**
 * Xử lý tất cả button liên quan rap battle
 * @returns {Promise<boolean>} đã xử lý chưa
 */
async function handleButton(interaction) {
  const id = interaction.customId.split(':')[1];
  const parts = interaction.customId.split(':');
  if (!id || parts[0] !== 'rap_submit' && parts[0] !== 'rap_vote') return false;

  const battle = battles.get(id);
  if (!battle) {
    await interaction.reply({ content: '⌛ Kèo này hết hạn hoặc đã kết thúc rồi.', ephemeral: true });
    return true;
  }

  if (parts[0] === 'rap_submit') return handleSubmit(interaction, battle, parts[2]);
  return handleVote(interaction, battle, parts[2]);
}

async function handleSubmit(interaction, battle, side) {
  const player = battle.players[side];
  if (!player || interaction.user.id !== player.id) {
    await interaction.reply({ content: '🚫 Nút này không phải của bạn.', ephemeral: true });
    return true;
  }
  if (battle.state !== 'writing') {
    await interaction.reply({ content: '⌛ Đã chốt bar rồi, chờ vote thôi.', ephemeral: true });
    return true;
  }
  if (battle.bars[side]) {
    await interaction.reply({ content: '✅ Bạn gửi bar rồi, chờ đối thủ.', ephemeral: true });
    return true;
  }

  const modalId = `rap_modal:${battle.id}:${side}`;
  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle('Viết bar của bạn 🎤'.slice(0, 45))
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('bar')
          .setLabel(`Chủ đề: ${battle.topic}`.slice(0, 45))
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(`Dùng: ${battle.words.join(', ')}`)
          .setMinLength(8)
          .setMaxLength(200)
          .setRequired(true)
      )
    );

  await interaction.showModal(modal);

  let submitted;
  try {
    submitted = await interaction.awaitModalSubmit({
      time: 120000,
      filter: m => m.customId === modalId && m.user.id === interaction.user.id
    });
  } catch {
    return true;
  }

  const bar = submitted.fields.getTextInputValue('bar').slice(0, 200).trim();
  battle.bars[side] = { text: bar, at: Date.now() };

  const left = battle.bars.A && battle.bars.B ? 0 : 1;
  await submitted.reply({
    embeds: [theme.baseEmbed({
      color: theme.C.mint,
      section: theme.sectionName('rap'),
      description: left
        ? '✅ **Đã chốt bar!** Chờ đối thủ gửi nốt rồi cả sàn vote.'
        : '🔥 **Đủ 2 bar rồi!** Chuẩn bị vote...'
    })],
    ephemeral: true
  }).catch(() => {});

  if (battle.bars.A && battle.bars.B) await startVoting(battle);
  return true;
}

async function handleVote(interaction, battle, side) {
  if (battle.state !== 'voting') {
    await interaction.reply({ content: '⌛ Chưa tới lúc vote đâu.', ephemeral: true });
    return true;
  }
  if (interaction.user.id === battle.players[side].id) {
    await interaction.reply({ content: '🚫 Không tự vote cho bar của mình được đâu nha.', ephemeral: true });
    return true;
  }

  const previous = battle.votes.get(interaction.user.id);
  battle.votes.set(interaction.user.id, side);

  await interaction.reply({
    content: previous === side
      ? `✅ Bạn đã vote cho **${side === 'A' ? 'Bar A' : 'Bar B'}** rồi.`
      : `✅ Đã vote cho **${side === 'A' ? 'Bar A' : 'Bar B'}**!${previous ? ' (đổi phiếu)' : ''}`,
    ephemeral: true
  });
  return true;
}

async function startVoting(battle) {
  battle.state = 'voting';

  const channel = await findChannel(battle);
  if (!channel) return cleanup(battle);

  const embed = theme.baseEmbed({
    color: theme.C.hot,
    section: theme.sectionName('rap'),
    title: '🗳️ VOTE ĐI — AI CÓ BAR NẶNG HƠN?',
    description: [
      theme.header('BATTLE ĐANG MỞ VOTE', `chủ đề: ${battle.topic}`),
      `**BAR A**\n> ${battle.bars.A.text.replace(/\n/g, '\n> ')}`,
      '',
      `**BAR B**\n> ${battle.bars.B.text.replace(/\n/g, '\n> ')}`,
      '',
      '⏰ **90 giây** — bấm nút bên dưới để chọn.',
      '-# ẩn danh cho tới khi có kết quả · không tự vote cho mình'
    ].join('\n'),
    fields: [
      { name: '🎤 Người chơi A', value: battle.players.A.name, inline: true },
      { name: '🎧 Người chơi B', value: battle.players.B.name, inline: true }
    ]
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rap_vote:${battle.id}:A`).setLabel('VOTE BAR A').setEmoji('🔥').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rap_vote:${battle.id}:B`).setLabel('VOTE BAR B').setEmoji('⚡').setStyle(ButtonStyle.Danger)
  );

  battle.voteMessage = await channel.send({ embeds: [embed], components: [row] }).catch(() => null);

  battle.timer = setTimeout(() => finishVoting(battle), 90 * 1000);
}

async function finishVoting(battle) {
  if (battle.state === 'done') return;
  battle.state = 'done';
  clearTimeout(battle.timer);

  const channel = await findChannel(battle);
  const aVotes = [...battle.votes.values()].filter(v => v === 'A').length;
  const bVotes = [...battle.votes.values()].filter(v => v === 'B').length;
  const total = aVotes + bVotes;

  let winner = null; // 'A' | 'B' | 'tie'
  if (aVotes > bVotes) winner = 'A';
  else if (bVotes > aVotes) winner = 'B';
  else winner = 'tie';

  const players = battle.players;
  const results = [];

  for (const side of ['A', 'B']) {
    const player = players[side];
    const isWinner = winner === side;
    const isTie = winner === 'tie';

    const coins = isTie ? 80 : isWinner ? 150 : 40;
    const xp = isTie ? 60 : isWinner ? 100 : 35;

    addXp(player.id, xp);
    updateCoins(player.id, coins);
    recordBattle(player.id, { won: isWinner, bar: battle.bars[side].text });
    progressQuest(player.id, 'rap');

    // tình cảm: battle chung là kỷ niệm
    addLovePoints(players.A.id, players.B.id, 15);

    const stats = getBattleStats(player.id);
    const unlocked = [];
    if (stats.rapWins >= 1) {
      const a = unlockAchievement(player.id, 'rap_win_1');
      if (a) unlocked.push(a);
    }
    if (stats.rapWins >= 5) {
      const a = unlockAchievement(player.id, 'rap_win_5');
      if (a) unlocked.push(a);
    }

    results.push({ side, player, coins, xp, stats, unlocked });
  }

  if (channel) {
    const title = winner === 'tie'
      ? '🤝 HOÀ — CẢ HAI ĐỀU NẶNG'
      : `🏆 BAR ${winner} THẮNG — ${players[winner].name}`;

    const embed = theme.baseEmbed({
      color: winner === 'tie' ? theme.C.gold : theme.C.mint,
      section: theme.sectionName('rap'),
      title,
      description: [
        theme.header('KẾT QUẢ BATTLE', `chủ đề: ${battle.topic}`),
        `**Bar A** — ${aVotes} vote\n> ${battle.bars.A.text.replace(/\n/g, '\n> ')}`,
        '',
        `**Bar B** — ${bVotes} vote\n> ${battle.bars.B.text.replace(/\n/g, '\n> ')}`,
        '',
        theme.field('Tổng vote', `**${total}** · ${winner === 'tie' ? 'không phân thắng bại' : `người thắng: **${players[winner].name}**`}`),
        '',
        ...results.map(r => `> **${r.player.name}** ${winner === 'tie' ? '🤝' : winner === r.side ? '🏆' : '💀'} · +${r.coins} coins · +${r.xp} XP${r.unlocked.length ? ` · ${r.unlocked.map(a => a.badgeIcon).join('')}` : ''}`),
        '',
        theme.quote(winner === 'tie' ? 'hoà là đẹp, hẹn kèo sau' : pick(VERDICTS))
      ].join('\n')
    });

    await channel.send({ embeds: [embed] }).catch(() => {});
    if (battle.voteMessage) {
      await battle.voteMessage.edit({ components: [] }).catch(() => {});
    }
  }

  battles.delete(battle.id);
}

function abortBattle(id, reason) {
  const battle = battles.get(id);
  if (!battle || battle.state === 'done') return;
  battle.state = 'done';
  clearTimeout(battle.timer);
  battles.delete(id);

  const channel = findChannel(battle);
  channel?.then(ch => ch && ch.send(reason).catch(() => {}));
}

async function findChannel(battle) {
  const client = discordClient;
  if (client) {
    const ch = client.channels.cache.get(battle.channelId);
    if (ch) return ch;
  }
  return null;
}

function cleanup(battle) {
  clearTimeout(battle.timer);
  battles.delete(battle.id);
}

module.exports = { openBattle, handleButton, setClient, battles, TOPICS };
