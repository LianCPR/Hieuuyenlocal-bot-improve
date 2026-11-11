// =============================================
// GAMES — ma sói · quiz · gacha
// =============================================

const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  AttachmentBuilder, MessageFlags
} = require('discord.js');

const theme = require('../ui/theme');
const { C, fmtNum, rarityMeta } = theme;
const { getDb } = require('../database/database');
const { getOrCreateUser, addXp, getUser } = require('../database/models/users');
const { createGame, getGame, STATE } = require('../games/werewolf/werewolfGame');
const quizState = require('../games/quiz/quizState');
const gacha = require('../database/models/gacha');
const { generateCollectionCard } = require('../canvas/collectionCard');
const { progressQuest } = require('../database/models/quests');
const {
  CARDS, PULL_COST, MULTI_COST, PITY_SR, PITY_SSR, RATES, RARITY_ORDER
} = require('../data/cards');

const EPH = { flags: MessageFlags.Ephemeral };

// ── MA SÓI ────────────────────────────────────
const werewolfCommand = {
  data: new SlashCommandBuilder()
    .setName('masoi')
    .setDescription('🐺 Game Ma Sói — 4 đến 12 người')
    .addSubcommand(s => s.setName('tao').setDescription('Tạo phòng mới'))
    .addSubcommand(s => s.setName('tham').setDescription('Tham gia phòng'))
    .addSubcommand(s => s.setName('bat').setDescription('Bắt đầu game (host)'))
    .addSubcommand(s => s.setName('huy').setDescription('Huỷ game (host/admin)'))
    .addSubcommand(s =>
      s.setName('vote').setDescription('Bỏ phiếu loại người chơi')
        .addUserOption(o => o.setName('target').setDescription('Người bạn nghi ngờ').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'tao') {
      if (getGame(interaction.guildId)) {
        return interaction.reply({ embeds: [theme.warnEmbed('Đang có game', 'Chờ game hiện tại kết thúc đã!')], ...EPH });
      }

      const game = createGame(interaction.guild, interaction.channel, interaction.member);
      game.addPlayer(interaction.member);
      getOrCreateUser(interaction.user.id, interaction.user.username);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('werewolf_join').setLabel('Tham gia').setEmoji('🐺').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('werewolf_start').setLabel('Bắt đầu').setEmoji('✅').setStyle(ButtonStyle.Success)
      );

      const embed = theme.baseEmbed({
        color: C.neon,
        section: theme.sectionName('game'),
        title: '🐺 PHÒNG MA SÓI MỞ',
        description: [
          theme.header('ĐÊM NAY AI SẼ THỨC?', `${interaction.user.displayName} mở phòng`),
          `**Người chơi:** 1/12 · cần tối thiểu **4**`,
          '',
          '> Bấm **Tham gia** để vào, host bấm **Bắt đầu** khi đủ người.',
          '> Vai sẽ được gửi qua DM nên nhớ mở inbox nha.',
          '',
          theme.quote('đừng tin ai, kể cả người mở phòng')
        ].join('\n')
      });

      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }

    if (sub === 'tham') {
      const game = getGame(interaction.guildId);
      if (!game) return interaction.reply({ embeds: [theme.warnEmbed('Không có phòng', 'Dùng `/masoi tao` để mở.')], ...EPH });
      if (game.state !== STATE.WAITING) return interaction.reply({ embeds: [theme.warnEmbed('Đã bắt đầu', 'Game đang chạy rồi!')], ...EPH });

      getOrCreateUser(interaction.user.id, interaction.user.username);
      const added = game.addPlayer(interaction.member);

      if (!added) return interaction.reply({ embeds: [theme.warnEmbed('Không vào được', 'Bạn đã tham gia hoặc phòng đầy.')], ...EPH });

      await interaction.reply({
        embeds: [theme.successEmbed('Đã vào phòng', `**${interaction.user.displayName}** tham gia! (${game.players.size}/12)`)]
      });
      return;
    }

    if (sub === 'bat') {
      const game = getGame(interaction.guildId);
      if (!game) return interaction.reply({ embeds: [theme.warnEmbed('Không có phòng', 'Mở phòng trước đã.')], ...EPH });
      if (game.host.id !== interaction.user.id) return interaction.reply({ embeds: [theme.warnEmbed('Không phải host', 'Chỉ host mới bắt đầu được.')], ...EPH });
      if (game.players.size < 4) return interaction.reply({ embeds: [theme.warnEmbed('Chưa đủ người', 'Cần ít nhất 4 người chơi.')], ...EPH });

      await interaction.reply({ embeds: [theme.infoEmbed('Game bắt đầu', 'Đang chia vai và gửi DM...')] });
      game.assignRoles();
      await game.sendRoleDMs();
      await game.startDay();
      return;
    }

    if (sub === 'huy') {
      const game = getGame(interaction.guildId);
      if (!game) return interaction.reply({ embeds: [theme.warnEmbed('Không có game', 'Không có gì để huỷ.')], ...EPH });
      if (game.host.id !== interaction.user.id && !interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({ embeds: [theme.warnEmbed('Không đủ quyền', 'Chỉ host hoặc admin được huỷ.')], ...EPH });
      }

      game.state = STATE.ENDED;
      clearTimeout(game.timeout);
      require('../games/werewolf/werewolfGame').endGame(interaction.guildId);

      await interaction.reply({ embeds: [theme.warnEmbed('Game đã huỷ', 'Phòng Ma Sói đã đóng.')] });
      return;
    }

    // vote
    const target = interaction.options.getUser('target');
    const game = getGame(interaction.guildId);
    if (!game || game.state !== STATE.VOTING) {
      return interaction.reply({ embeds: [theme.warnEmbed('Chưa tới lúc vote', 'Đợi tới giai đoạn bỏ phiếu nhé.')], ...EPH });
    }

    game.votes.set(interaction.user.id, target.id);
    await interaction.reply({ content: `✅ Đã vote cho **${target.displayName}**.`, ...EPH });
  }
};

// ── QUIZ ──────────────────────────────────────
const quizCommand = {
  data: new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('🧠 Quiz 30 giây — trả lời đúng nhận XP + coin')
    .addStringOption(o =>
      o.setName('category').setDescription('Chủ đề').setRequired(false)
        .addChoices(
          { name: '🌍 Tổng hợp', value: 'general' },
          { name: '📜 Lịch sử', value: 'history' },
          { name: '📖 Văn học', value: 'literature' },
          { name: '🔬 Khoa học', value: 'science' },
          { name: '😄 Đố vui', value: 'fun' },
          { name: '🌸 Anime', value: 'anime' },
          { name: '🎧 Âm nhạc', value: 'music' }
        )
    ),

  async execute(interaction) {
    if (quizState.getActiveQuiz(interaction.channelId)) {
      return interaction.reply({
        embeds: [theme.warnEmbed('Đang có câu hỏi', 'Trả lời câu hiện tại trước đã!')],
        ...EPH
      });
    }

    const category = interaction.options.getString('category');
    const db = getDb();
    const question = category
      ? db.prepare('SELECT * FROM quiz_questions WHERE category = ? ORDER BY RANDOM() LIMIT 1').get(category)
      : db.prepare('SELECT * FROM quiz_questions ORDER BY RANDOM() LIMIT 1').get();

    if (!question) {
      return interaction.reply({ embeds: [theme.errorEmbed('Hết câu hỏi', 'Chủ đề này chưa có câu nào!')], ...EPH });
    }

    await interaction.reply({ embeds: [quizState.buildQuizEmbed(question)] });
    quizState.startQuiz(interaction.channelId, question);

    setTimeout(async () => {
      const quiz = quizState.getActiveQuiz(interaction.channelId);
      if (!quiz || quiz.answered) return;
      quizState.endQuiz(interaction.channelId);

      const texts = { A: question.optionA, B: question.optionB, C: question.optionC, D: question.optionD };

      await interaction.followUp({
        embeds: [theme.baseEmbed({
          color: C.blood,
          section: theme.sectionName('quiz'),
          title: '⏰ HẾT GIỜ',
          description: [
            `Đáp án đúng: **${question.correct}. ${texts[question.correct]}**`,
            '',
            theme.quote('chưa ai trả lời, câu sau gỡ lại nha')
          ].join('\n')
        })]
      }).catch(() => {});
    }, 30000);
  }
};

// ── GACHA ─────────────────────────────────────
const gachaCommand = {
  data: new SlashCommandBuilder()
    .setName('gacha')
    .setDescription('🎴 Quay thẻ anime & sưu tầm')
    .addSubcommand(s =>
      s.setName('pull').setDescription('Quay thẻ (120 coin/lượt, multi 10 = 1.000 coin)')
        .addIntegerOption(o =>
          o.setName('count').setDescription('Số lượt quay (1 hoặc 10)').setRequired(false)
            .addChoices({ name: '1 lượt · 120 coin', value: 1 }, { name: '10 lượt · 1.000 coin', value: 10 })
        )
    )
    .addSubcommand(s =>
      s.setName('collection').setDescription('Xem bộ sưu tập')
        .addUserOption(o => o.setName('user').setDescription('Xem của ai đó').setRequired(false))
    )
    .addSubcommand(s => s.setName('info').setDescription('Tỉ lệ quay, bảo hiểm & top collector')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    getOrCreateUser(interaction.user.id, interaction.user.username);

    if (sub === 'pull') {
      await interaction.deferReply();
      const count = interaction.options.getInteger('count') || 1;
      const result = gacha.pull(interaction.user.id, { count });

      if (!result.success) {
        return interaction.editReply({ embeds: [theme.errorEmbed('Không quay được', result.message)] });
      }

      progressQuest(interaction.user.id, 'gacha', count);

      const { best } = result;
      const meta = rarityMeta(best.card.rarity);
      const file = new AttachmentBuilder(
        await require('../canvas/gachaCard').generateGachaCard(best.card, {
          owner: interaction.user.username,
          isNew: best.isNew
        }),
        { name: 'card.png' }
      );

      const counts = { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 };
      result.results.forEach(r => { counts[r.card.rarity] += 1; });

      const embed = theme.imageEmbed({
        title: `${meta.emoji} ${best.card.rarity} PULL!`,
        color: meta.color,
        section: theme.sectionName('gacha'),
        description: [
          theme.header(best.card.name, `${best.card.element} · ${best.card.rarity}`),
          theme.quote(best.card.quote),
          '',
          theme.field('Kết quả', RARITY_ORDER.filter(r => counts[r]).map(r => `${rarityMeta(r).label} ×${counts[r]}`).join(' · ') || '—'),
          theme.field('Chi phí', `**${fmtNum(result.cost)} coins** · còn **${fmtNum(result.coins)}**`),
          theme.field('Bộ sưu tập', `${result.summary.unique}/${result.summary.all} thẻ · **${result.summary.completion}%**`),
          best.refund ? `> ♻️ Thẻ trùng → hoàn **${best.refund} coins**` : '',
          result.newlyUnlocked.length
            ? `> 🏅 Mở khoá: ${result.newlyUnlocked.map(a => `${a.badgeIcon} **${a.name}**`).join(' · ')}`
            : '',
          '',
          `-# ${theme.hype('gacha')}`
        ].filter(Boolean).join('\n')
      });

      await interaction.editReply({ embeds: [embed], files: [file] });
      return;
    }

    if (sub === 'collection') {
      const target = interaction.options.getUser('user') || interaction.user;
      const cards = gacha.getUserCards(target.id);
      const summary = gacha.getCollectionSummary(target.id);

      const byRarity = {};
      for (const row of cards) {
        if (!byRarity[row.card.rarity]) byRarity[row.card.rarity] = [];
        byRarity[row.card.rarity].push(row);
      }

      const card = await generateCollectionCard({
        username: target.displayName || target.username,
        owned: cards,
        summary
      });
      const file = new AttachmentBuilder(card, { name: 'collection.png' });

      const embed = theme.imageEmbed({
        color: C.neon,
        section: theme.sectionName('gacha'),
        title: `🎴 BỘ SƯU TẬP // ${(target.displayName || target.username).toUpperCase()}`,
        description: [
          theme.header('COLLECTION', `${summary.unique}/${summary.all} thẻ · ${summary.completion}%`),
          `**${theme.bar(summary.unique, summary.all, 16)}**`,
          '',
          theme.field('Đã mở', `**${summary.unique}** loại · **${summary.total}** thẻ`),
          theme.field('Hiếm nhất', `**${RARITY_ORDER.slice().reverse().find(r => summary.byRarity[r]) || 'N'}**`),
          '',
          summary.unique ? '-# ảnh bên trên là toàn bộ bộ sưu tập của bạn' : '*Chưa có thẻ nào. `/gacha pull` để bắt đầu!*'
        ].join('\n'),
        image: 'attachment://collection.png'
      });

      await interaction.reply({ embeds: [embed], files: [file] });
      return;
    }

    // info
    const stats = gacha.getOrCreateStats(interaction.user.id);
    const top = gacha.getTopCollectors(5);

    const embed = theme.baseEmbed({
      color: C.gold,
      section: theme.sectionName('gacha'),
      title: '🎴 GACHA INFO',
      description: [
        theme.header('BANNER ANIME', 'luck là một kỹ năng'),
        `**Giá:** ${PULL_COST} coin/lượt · multi 10 = ${MULTI_COST} coin`,
        `**Tỉ lệ:** N ${(RATES.N * 100).toFixed(0)}% · R ${(RATES.R * 100).toFixed(0)}% · SR ${(RATES.SR * 100).toFixed(1)}% · SSR ${(RATES.SSR * 100).toFixed(1)}% · UR ${(RATES.UR * 100).toFixed(1)}%`,
        '',
        theme.field('Bảo hiểm của bạn', `SR+: **${PITY_SR - (stats.pitySR || 0)}** lượt · SSR: **${PITY_SSR - (stats.pitySSR || 0)}** lượt`),
        theme.field('Tổng lượt đã quay', `**${stats.pulls || 0}**`),
        theme.field('Thẻ hiếm nhất', `**${stats.bestRarity || 'N'}**`),
        '',
        '**TOP COLLECTOR**',
        top.map((u, i) => `${['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`} **${u.username}** — ${u.uniqueCards} thẻ`).join('\n') || '*Chưa có ai.*',
        '',
        '-# multi 10 luôn có ít nhất 1 SR+'
      ].join('\n')
    });

    await interaction.reply({ embeds: [embed] });
  }
};

module.exports = [werewolfCommand, quizCommand, gachaCommand];
