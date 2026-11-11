// =============================================
// SOCIAL COMMANDS — tri kỷ · ship · rap battle
// =============================================

const {
  SlashCommandBuilder, AttachmentBuilder, MessageFlags
} = require('discord.js');

const theme = require('../ui/theme');
const { C, fmtNum } = theme;
const art = require('../canvas/art');
const { generateStarmap } = require('../canvas/starmap');
const { generateShipCard } = require('../canvas/social');
const { openBattle } = require('../games/rapbattle/rapBattle');
const {
  getOrCreateRelationship, addLovePoints, getUserRelationships,
  getRelationshipLeaderboard, RELATIONSHIP_LEVELS
} = require('../database/models/relationships');
const { getOrCreateUser } = require('../database/models/users');
const { saveShip, getRapLeaderboard } = require('../database/models/battles');
const { unlockAchievement } = require('../database/models/achievements');
const { progressQuest } = require('../database/models/quests');

const EPH = { flags: MessageFlags.Ephemeral };

const NEXT_POINTS = [0, 500, 2000, 5000, 10000];

// ── TRI KỶ ────────────────────────────────────
const trikyCommand = {
  data: new SlashCommandBuilder()
    .setName('triky')
    .setDescription('💞 Hệ thống tri kỷ — đo độ thân thiết')
    .addSubcommand(s =>
      s.setName('xem').setDescription('Xem mối quan hệ + bầu trời sao')
        .addUserOption(o => o.setName('user').setDescription('Người muốn xem').setRequired(true))
    )
    .addSubcommand(s => s.setName('danhsach').setDescription('Danh sách tri kỷ của bạn'))
    .addSubcommand(s => s.setName('top').setDescription('Top cặp tri kỷ server')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'xem') {
      await interaction.deferReply();
      const target = interaction.options.getUser('user');

      if (target.id === interaction.user.id) {
        return interaction.editReply({ embeds: [theme.warnEmbed('Không hợp lệ', 'Bạn không thể là tri kỷ của chính mình~')] });
      }
      if (target.bot) {
        return interaction.editReply({ embeds: [theme.warnEmbed('Bot không có tình cảm', 'Chọn một người thật đi nha.')] });
      }

      getOrCreateUser(interaction.user.id, interaction.user.username);
      getOrCreateUser(target.id, target.username);

      const rel = getOrCreateRelationship(interaction.user.id, target.id);
      const levelInfo = RELATIONSHIP_LEVELS[rel.relationshipLevel] || RELATIONSHIP_LEVELS[1];
      const maxPoints = NEXT_POINTS[rel.relationshipLevel] || 10000;
      const progress = Math.min(rel.lovePoints / maxPoints, 1);

      const member2 = await interaction.guild.members.fetch(target.id).catch(() => null);

      try {
        const card = await generateStarmap(
          interaction.member?.displayName || interaction.user.username,
          member2?.displayName || target.username,
          rel.lovePoints,
          rel.relationshipLevel,
          {
            avatar1: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
            avatar2: target.displayAvatarURL({ extension: 'png', size: 256 })
          }
        );
        const file = new AttachmentBuilder(card, { name: 'starmap.png' });

        await interaction.editReply({
          embeds: [theme.imageEmbed({
            title: '💞 STARMAP',
            color: C.hot,
            section: theme.sectionName('social'),
            description: [
              `**${interaction.user.displayName}** ${levelInfo.emoji} **${target.displayName}**`,
              '',
              theme.field('Cấp độ', `${levelInfo.name} · Level ${rel.relationshipLevel}/5`),
              theme.field('Điểm tình cảm', `**${fmtNum(rel.lovePoints)}**`),
              theme.field('Tương tác', `**${rel.interactionCount}** lần`),
              theme.field('Game chung', `**${rel.sharedGames}** trận`),
              '',
              `**${theme.bar(rel.lovePoints, maxPoints, 14)}** ${Math.round(progress * 100)}% tới cấp tiếp theo`,
              '',
              theme.quote('mỗi lần tag nhau là một ngôi sao sáng thêm')
            ].join('\n')
          })],
          files: [file]
        });
      } catch (err) {
        console.error('starmap error:', err);
        await interaction.editReply({ embeds: [theme.errorEmbed('Không vẽ được bầu trời', 'Thử lại sau nhé!')] });
      }
      return;
    }

    if (sub === 'danhsach') {
      getOrCreateUser(interaction.user.id, interaction.user.username);
      const rels = getUserRelationships(interaction.user.id);

      if (!rels.length) {
        return interaction.reply({
          embeds: [theme.warnEmbed('Chưa có tri kỷ', 'Tag ai đó trong chat hoặc dùng `/ship @user` để bắt đầu!')],
          ...EPH
        });
      }

      const embed = theme.baseEmbed({
        color: C.hot,
        section: theme.sectionName('social'),
        title: `💞 TRI KỶ CỦA ${interaction.user.displayName.toUpperCase()}`,
        description: [
          theme.header(`${rels.length} mối quan hệ`, 'càng tương tác càng bền'),
          rels.map((r, i) => {
            const lvl = RELATIONSHIP_LEVELS[r.relationshipLevel] || RELATIONSHIP_LEVELS[1];
            return `**${String(i + 1).padStart(2, '0')}** ${lvl.emoji} **${r.partnerName}** · ${lvl.name} · ${fmtNum(r.lovePoints)} pts`;
          }).join('\n')
        ].join('\n')
      });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // top
    const top = getRelationshipLeaderboard(10);

    const embed = theme.baseEmbed({
      color: C.hot,
      section: theme.sectionName('social'),
      title: '💞 TOP TRI KỶ SERVER',
      description: [
        theme.header('NHỮNG CẶP BỀN NHẤT', 'duyên này do vũ trụ sắp đặt'),
        top.map((r, i) => {
          const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
          const lvl = RELATIONSHIP_LEVELS[r.relationshipLevel] || RELATIONSHIP_LEVELS[1];
          return `${medal} **${r.user1Name}** 💞 **${r.user2Name}**\n> ${lvl.emoji} ${lvl.name} · **${fmtNum(r.lovePoints)}** pts`;
        }).join('\n') || '*Chưa có cặp nào.*'
      ].join('\n')
    });

    await interaction.reply({ embeds: [embed] });
  }
};

// ── SHIP ──────────────────────────────────────
const VERDICTS = [
  { min: 90, label: 'ĐỊNH MỆNH GỌI TÊN', line: 'duyên này do vũ trụ sắp đặt rồi, khỏi cãi' },
  { min: 75, label: 'CHUẨN KÈO', line: 'chemistry này là chemistry thật, không phải edit' },
  { min: 55, label: 'ỔN ÁP', line: 'cần thêm chút thời gian là bén ngay' },
  { min: 35, label: 'CẦN THỜI GIAN', line: 'chưa vội, để vũ trụ sắp xếp' },
  { min: 0, label: 'THỬ THÁCH', line: 'khó đó, nhưng biết đâu lại là kèo thơm' }
];

function shipScore(id1, id2, lovePoints = 0) {
  const seed = art.hashStr([id1, id2].sort().join(':'));
  const base = seed % 61;                       // 0..60
  const bonus = Math.min(35, Math.floor(lovePoints / 180));
  return Math.max(5, Math.min(99, 30 + base + bonus));
}

const shipCommand = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('💘 Đo độ hợp nhau của hai người (có ảnh)')
    .addUserOption(o => o.setName('user').setDescription('Người bạn muốn ship').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user');

    if (target.id === interaction.user.id) {
      return interaction.editReply({ embeds: [theme.warnEmbed('Tự ship bản thân?', 'Bạn cần đồng đội, không phải bản sao.')] });
    }
    if (target.bot) {
      return interaction.editReply({ embeds: [theme.warnEmbed('Bot cũng có trái tim', 'Nhưng bot chưa hỗ trợ chuyện này.')] });
    }

    getOrCreateUser(interaction.user.id, interaction.user.username);
    getOrCreateUser(target.id, target.username);

    const rel = getOrCreateRelationship(interaction.user.id, target.id);
    addLovePoints(interaction.user.id, target.id, 10);

    const score = shipScore(interaction.user.id, target.id, rel.lovePoints);
    const verdict = VERDICTS.find(v => score >= v.min) || VERDICTS[VERDICTS.length - 1];

    saveShip(interaction.user.id, target.id, score);
    progressQuest(interaction.user.id, 'ship');

    if (score >= 90) unlockAchievement(interaction.user.id, 'ship_soulmate');

    const member2 = await interaction.guild.members.fetch(target.id).catch(() => null);

    try {
      const card = await generateShipCard({
        name1: interaction.member?.displayName || interaction.user.username,
        name2: member2?.displayName || target.username,
        score,
        verdict: verdict.label,
        line: verdict.line,
        avatar1: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
        avatar2: target.displayAvatarURL({ extension: 'png', size: 256 })
      });
      const file = new AttachmentBuilder(card, { name: 'ship.png' });

      await interaction.editReply({
        embeds: [theme.imageEmbed({
          title: '💘 SHIP METER',
          color: C.hot,
          section: theme.sectionName('social'),
          description: [
            `**${interaction.user.displayName}** 💞 **${target.displayName}**`,
            '',
            `**${theme.bar(score, 100, 16)}** **${score}%**`,
            theme.field('Kết luận', `**${verdict.label}**`),
            theme.field('Điểm tình cảm', `**${fmtNum(rel.lovePoints + 10)}** (+10 từ lần ship này)`),
            '',
            theme.quote(verdict.line)
          ].join('\n')
        })],
        files: [file]
      });
    } catch (err) {
      console.error('ship card error:', err);
      await interaction.editReply({
        embeds: [theme.baseEmbed({
          title: '💘 SHIP METER',
          color: C.hot,
          description: `${interaction.user.displayName} + ${target.displayName} = **${score}%**\n**${verdict.label}**`
        })]
      });
    }
  }
};

// ── RAP BATTLE ────────────────────────────────
const rapBattleCommand = {
  data: new SlashCommandBuilder()
    .setName('rapbattle')
    .setDescription('🎤 Thách đấu rap battle 1v1, cả server vote')
    .addUserOption(o => o.setName('user').setDescription('Đối thủ của bạn').setRequired(true))
    .addStringOption(o => o.setName('topic').setDescription('Chủ đề battle (tuỳ chọn)').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const topic = interaction.options.getString('topic');

    if (!interaction.guild) {
      return interaction.reply({ embeds: [theme.errorEmbed('Chỉ trong server', 'Rap battle cần khán giả!')], ...EPH });
    }

    await openBattle(interaction, target, topic || undefined);
  }
};

const rapTopCommand = {
  data: new SlashCommandBuilder()
    .setName('raptop')
    .setDescription('🎧 Bảng xếp hạng rap battle'),

  async execute(interaction) {
    const top = getRapLeaderboard(10);

    const embed = theme.baseEmbed({
      color: C.gold,
      section: theme.sectionName('rap'),
      title: '🎧 RAP LEADERBOARD',
      description: [
        theme.header('CHỦ SÀN', 'ai giữ mic lâu nhất'),
        top.map((u, i) => {
          const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
          const winrate = u.rapBattles ? Math.round((u.rapWins / u.rapBattles) * 100) : 0;
          return `${medal} **${u.username}** · ${u.rapWins}W-${u.rapLosses}L · **${winrate}%** winrate`;
        }).join('\n') || '*Chưa có ai battle. Mở kèo đầu tiên đi!*'
      ].join('\n')
    });

    await interaction.reply({ embeds: [embed] });
  }
};

module.exports = [trikyCommand, shipCommand, rapBattleCommand, rapTopCommand];
