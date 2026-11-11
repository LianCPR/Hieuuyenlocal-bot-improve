// =============================================
// MINIGAMES — tài xỉu · oẳn tù tì · đoán số · bầu cua
// =============================================

const { SlashCommandBuilder, MessageFlags, AttachmentBuilder } = require('discord.js');
const theme = require('../ui/theme');
const { C, fmtNum } = theme;
const {
  getOrCreateUser, getUser, addXp, updateCoins
} = require('../database/models/users');
const mini = require('../database/models/minigames');
const { checkAllAchievements } = require('../database/models/achievements');
const engine = require('../games/minigames/engine');
const { generateBaucuaCard, BAU_CUA_CARD_FILE } = require('../canvas/baucuaCard');
const {
  generateTaiXiuCard, generateRPSSCard, generateGuessCard,
  TAIXIU_CARD_FILE, RPS_CARD_FILE, GUESS_CARD_FILE
} = require('../canvas/minigameCards');

const EPH = { flags: MessageFlags.Ephemeral };
const MIN_BET = 10;
const MAX_BET = 5000;
const COOLDOWN_MS = 4000;
const lastPlay = new Map();

function cooldownLeft(userId) {
  const left = COOLDOWN_MS - (Date.now() - (lastPlay.get(userId) || 0));
  return left > 0 ? left : 0;
}

function validate(interaction, bet) {
  const userId = interaction.user.id;
  const user = getOrCreateUser(userId, interaction.user.username);

  if (!Number.isInteger(bet) || bet < MIN_BET) {
    return { error: `Cược tối thiểu **${fmtNum(MIN_BET)} coin**.` };
  }
  if (bet > MAX_BET) {
    return { error: `Cược tối đa **${fmtNum(MAX_BET)} coin** mỗi ván.` };
  }
  if ((user.coins || 0) < bet) {
    return { error: `Bạn chỉ có **${fmtNum(user.coins || 0)} coin**, không đủ cược **${fmtNum(bet)}**.` };
  }

  return { user };
}

function cooldownReply(interaction, left) {
  return interaction.reply({
    embeds: [theme.warnEmbed('TỪ TỪ THÔI', `Chờ **${(left / 1000).toFixed(1)}s** nữa mới chơi ván tiếp nhé.`)],
    ...EPH
  });
}

async function finish(interaction, {
  game, bet, net, win, tie = false,
  title, color, lines, cardBuilder = null
}) {
  const userId = interaction.user.id;

  if (net !== 0) updateCoins(userId, net);
  if (win) addXp(userId, 5);
  else if (!tie) addXp(userId, 1);

  const stats = mini.recordGame(userId, game, {
    bet,
    net,
    result: tie ? 'tie' : win ? 'win' : 'lose'
  });

  const updatedUser = getUser(userId);
  const newAchievements = updatedUser
    ? await checkAllAchievements(updatedUser, { minigame: true })
    : [];
  const balance = getUser(userId)?.coins || 0;

  const payout = tie
    ? '> ♻️ Hoà, hoàn lại tiền cược.'
    : win
      ? `> 🎉 Lời **+${fmtNum(net)} coin**.`
      : `> 💸 Mất **${fmtNum(bet)} coin**.`;

  const embed = theme.baseEmbed({
    color,
    section: theme.sectionName('game'),
    title,
    description: [
      theme.header('VÁN ĐẤU', `cược **${fmtNum(bet)} coin**`),
      ...lines,
      '',
      payout,
      '',
      theme.field('Số dư', `**${fmtNum(balance)} coin**`),
      theme.field('Thống kê', `**${stats.played}** ván · **${stats.won}** thắng · lãi/lỗ **${stats.profit >= 0 ? '+' : ''}${fmtNum(stats.profit)}**`),
      newAchievements.length
        ? theme.field('Mở khoá thành tựu', newAchievements.map(a => `${a.badgeIcon} **${a.name}**`).join(' · '))
        : '',
      '',
      `-# ${theme.hype('win')}`
    ].filter(Boolean).join('\n')
  });

  let files = [];
  if (cardBuilder) {
    try {
      const card = await cardBuilder({ bet, net, win, tie, stats, balance, newAchievements });
      if (card?.buffer) {
        const name = card.name || BAU_CUA_CARD_FILE;
        embed.setImage(`attachment://${name}`);
        files = [new AttachmentBuilder(card.buffer, { name })];
      }
    } catch (err) {
      console.error('minigame card error:', err);
    }
  }

  await interaction.reply({
    embeds: [embed],
    ...(files.length ? { files } : {})
  });
}

// ── TÀI XỈU ───────────────────────────────────
const taiXiuCommand = {
  data: new SlashCommandBuilder()
    .setName('taixiu')
    .setDescription('🎲 Tài Xỉu 3 xúc xắc — cược coin, thắng nhận 1:1')
    .addIntegerOption(o => o
      .setName('cuoc')
      .setDescription(`Số coin cược (${MIN_BET}–${MAX_BET})`)
      .setRequired(true)
      .setMinValue(MIN_BET)
      .setMaxValue(MAX_BET))
    .addStringOption(o => o
      .setName('chon')
      .setDescription('Chọn Tài (11–18) hoặc Xỉu (4–10)')
      .setRequired(true)
      .addChoices(
        { name: 'Tài · tổng 11–18', value: 'tai' },
        { name: 'Xỉu · tổng 4–10', value: 'xiu' }
      )),

  async execute(interaction) {
    const left = cooldownLeft(interaction.user.id);
    if (left) return cooldownReply(interaction, left);

    const bet = interaction.options.getInteger('cuoc', true);
    const choice = interaction.options.getString('chon', true);
    const check = validate(interaction, bet);
    if (check.error) {
      return interaction.reply({ embeds: [theme.errorEmbed('KHÔNG CƯỢC ĐƯỢC', check.error)], ...EPH });
    }

    lastPlay.set(interaction.user.id, Date.now());
    const r = engine.playTaiXiu(choice);
    const net = r.win ? bet : -bet;
    const faces = r.dice.map(n => `${engine.diceFace(n)} ${n}`).join('  ·  ');

    await finish(interaction, {
      game: 'taixiu',
      bet,
      net,
      win: r.win,
      title: r.triple ? '🎲 TÀI XỈU // BÃO · THUA' : r.win ? '🎲 TÀI XỈU // THẮNG' : '🎲 TÀI XỈU // THUA',
      color: r.win ? C.lime : C.blood,
      lines: [
        `**Xúc xắc:** ${faces}`,
        `**Tổng:** **${r.total}** → **${r.outcome === 'tai' ? 'TÀI' : 'XỈU'}**${r.triple ? ' · BÃO 3 MẶT' : ''}`,
        theme.field('Bạn chọn', `**${choice === 'tai' ? 'TÀI' : 'XỈU'}**`),
        r.triple ? '> Bão 3 mặt: nhà cái thắng theo luật.' : ''
      ],
      cardBuilder: ({ bet: finalBet, net: finalNet, win: finalWin, stats, balance }) => ({
        name: TAIXIU_CARD_FILE,
        buffer: generateTaiXiuCard({
          dice: r.dice,
          choice,
          total: r.total,
          triple: r.triple,
          outcome: r.outcome,
          bet: finalBet,
          net: finalNet,
          win: finalWin,
          balance,
          stats
        })
      })
    });
  }
};

// ── OẲN TÙ TÌ ─────────────────────────────────
const oanTuTiCommand = {
  data: new SlashCommandBuilder()
    .setName('oanthu')
    .setDescription('✌️ Oẳn Tù Tì với bot — thắng nhận 1:1, hoà hoàn cược')
    .addIntegerOption(o => o
      .setName('cuoc')
      .setDescription(`Số coin cược (${MIN_BET}–${MAX_BET})`)
      .setRequired(true)
      .setMinValue(MIN_BET)
      .setMaxValue(MAX_BET))
    .addStringOption(o => o
      .setName('chon')
      .setDescription('Chọn kéo, búa hoặc bao')
      .setRequired(true)
      .addChoices(
        { name: '✌️ Kéo', value: 'keo' },
        { name: '✊ Búa', value: 'bua' },
        { name: '✋ Bao', value: 'bao' }
      )),

  async execute(interaction) {
    const left = cooldownLeft(interaction.user.id);
    if (left) return cooldownReply(interaction, left);

    const bet = interaction.options.getInteger('cuoc', true);
    const choice = interaction.options.getString('chon', true);
    const check = validate(interaction, bet);
    if (check.error) {
      return interaction.reply({ embeds: [theme.errorEmbed('KHÔNG CƯỢC ĐƯỢC', check.error)], ...EPH });
    }

    lastPlay.set(interaction.user.id, Date.now());
    const r = engine.playRPS(choice);
    const net = r.tie ? 0 : r.win ? bet : -bet;
    const mine = engine.RPS[choice];
    const theirs = engine.RPS[r.bot];

    await finish(interaction, {
      game: 'oanthu',
      bet,
      net,
      win: r.win,
      tie: r.tie,
      title: r.tie ? '✌️ OẲN TÙ TÌ // HOÀ' : r.win ? '✌️ OẲN TÙ TÌ // THẮNG' : '✌️ OẲN TÙ TÌ // THUA',
      color: r.tie ? C.gold : r.win ? C.lime : C.blood,
      lines: [
        `**Bạn ra:** ${mine.emoji} **${mine.label}**`,
        `**Bot ra:** ${theirs.emoji} **${theirs.label}**`,
        theme.field('Kết quả', r.tie ? 'Hoà' : r.win ? 'Bạn thắng' : 'Bot thắng')
      ],
      cardBuilder: ({ bet: finalBet, net: finalNet, win: finalWin, tie: finalTie, stats, balance }) => ({
        name: RPS_CARD_FILE,
        buffer: generateRPSSCard({
          player: choice,
          bot: r.bot,
          bet: finalBet,
          net: finalNet,
          win: finalWin,
          tie: finalTie,
          balance,
          stats
        })
      })
    });
  }
};

// ── ĐOÁN SỐ ───────────────────────────────────
const doanSoCommand = {
  data: new SlashCommandBuilder()
    .setName('doanso')
    .setDescription('🔢 Đoán số 1–6 — trúng nhận lời gấp 3 lần cược')
    .addIntegerOption(o => o
      .setName('cuoc')
      .setDescription(`Số coin cược (${MIN_BET}–${MAX_BET})`)
      .setRequired(true)
      .setMinValue(MIN_BET)
      .setMaxValue(MAX_BET))
    .addIntegerOption(o => o
      .setName('so')
      .setDescription('Đoán một số từ 1 đến 6')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(6)),

  async execute(interaction) {
    const left = cooldownLeft(interaction.user.id);
    if (left) return cooldownReply(interaction, left);

    const bet = interaction.options.getInteger('cuoc', true);
    const choice = interaction.options.getInteger('so', true);
    const check = validate(interaction, bet);
    if (check.error) {
      return interaction.reply({ embeds: [theme.errorEmbed('KHÔNG CƯỢC ĐƯỢC', check.error)], ...EPH });
    }

    lastPlay.set(interaction.user.id, Date.now());
    const r = engine.playGuess(choice);
    const net = r.win ? bet * 3 : -bet;

    await finish(interaction, {
      game: 'doanso',
      bet,
      net,
      win: r.win,
      title: r.win ? '🔢 ĐOÁN SỐ // TRÚNG' : '🔢 ĐOÁN SỐ // TRƯỢT',
      color: r.win ? C.lime : C.blood,
      lines: [
        `**Bạn đoán:** **${r.choice}**`,
        `**Bot ra:** **${r.bot}**`,
        theme.field('Kết quả', r.win ? 'Trúng · lời x3 tiền cược' : 'Trượt')
      ],
      cardBuilder: ({ bet: finalBet, net: finalNet, win: finalWin, stats, balance }) => ({
        name: GUESS_CARD_FILE,
        buffer: generateGuessCard({
          choice,
          bot: r.bot,
          bet: finalBet,
          net: finalNet,
          win: finalWin,
          balance,
          stats
        })
      })
    });
  }
};

// ── BẦU CUA ───────────────────────────────────
const bauCuaCommand = {
  data: new SlashCommandBuilder()
    .setName('baucua')
    .setDescription('🍈 Bầu Cua 3 xúc xắc — trúng 1–3 lần, ăn theo số lần')
    .addIntegerOption(o => o
      .setName('cuoc')
      .setDescription(`Số coin cược (${MIN_BET}–${MAX_BET})`)
      .setRequired(true)
      .setMinValue(MIN_BET)
      .setMaxValue(MAX_BET))
    .addStringOption(o => o
      .setName('chon')
      .setDescription('Chọn linh vật bạn muốn cược')
      .setRequired(true)
      .addChoices(
        { name: '🍈 Bầu', value: 'bau' },
        { name: '🦀 Cua', value: 'cua' },
        { name: '🦐 Tôm', value: 'tom' },
        { name: '🐟 Cá', value: 'ca' },
        { name: '🐓 Gà', value: 'ga' },
        { name: '🦌 Nai', value: 'nai' }
      )),

  async execute(interaction) {
    const left = cooldownLeft(interaction.user.id);
    if (left) return cooldownReply(interaction, left);

    const bet = interaction.options.getInteger('cuoc', true);
    const choice = interaction.options.getString('chon', true);
    const check = validate(interaction, bet);
    if (check.error) {
      return interaction.reply({ embeds: [theme.errorEmbed('KHÔNG CƯỢC ĐƯỢC', check.error)], ...EPH });
    }

    lastPlay.set(interaction.user.id, Date.now());
    const r = engine.playBauCua(choice);
    const net = r.hits > 0 ? bet * r.hits : -bet;
    const pick = engine.BAU_CUA[r.choice];
    const dice = r.dice.map(key => {
      const item = engine.BAU_CUA[key];
      return `${item.emoji} ${item.label}`;
    }).join('  ·  ');

    await finish(interaction, {
      game: 'baucua',
      bet,
      net,
      win: r.win,
      title: r.hits === 3
        ? '🍈 BẦU CUA // NỔ 3'
        : r.hits === 2
          ? '🍈 BẦU CUA // TRÚNG 2'
          : r.hits === 1
            ? '🍈 BẦU CUA // TRÚNG 1'
            : '🍈 BẦU CUA // TRƯỢT',
      color: r.win ? C.lime : C.blood,
      lines: [
        `**Xúc xắc:** ${dice}`,
        `**Bạn chọn:** ${pick.emoji} **${pick.label}**`,
        theme.field('Số lần xuất hiện', `**${r.hits}/3**`),
        r.hits
          ? `> Trúng **${r.hits}** lần · tỉ lệ thưởng **1:${r.hits}**`
          : '> Linh vật bạn chọn không xuất hiện.'
      ],
      cardBuilder: ({ bet: finalBet, net: finalNet, win: finalWin, stats, balance }) => ({
        name: BAU_CUA_CARD_FILE,
        buffer: generateBaucuaCard({
          dice: r.dice,
          choice: r.choice,
          hits: r.hits,
          bet: finalBet,
          net: finalNet,
          balance,
          stats,
          win: finalWin
        })
      })
    });
  }
};

module.exports = [taiXiuCommand, oanTuTiCommand, doanSoCommand, bauCuaCommand];
