// =============================================
// EVENT HANDLERS — Hiểu Uyên Bot
// =============================================

const {
  EmbedBuilder, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  AttachmentBuilder, MessageFlags, Routes
} = require('discord.js');
const { REST } = require('@discordjs/rest');

const theme = require('../ui/theme');
const { C, fmtNum } = theme;

const commands = require('../commands/index');
const { buildHelpPayload } = require('../commands/core');
const { handleMessageXp } = require('../systems/level/xpSystem');
const quiz = require('../games/quiz/quizState');
const rap = require('../games/rapbattle/rapBattle');
const questCommand = require('../commands/quests');
const aiCommand = require('../commands/ai');

const {
  getOrCreateUser, addXp, updateCoins, updateWaterStreak
} = require('../database/models/users');
const { getOrCreateRelationship, addLovePoints } = require('../database/models/relationships');
const { getGame, STATE } = require('../games/werewolf/werewolfGame');
const { getDb } = require('../database/database');
const { progressQuest } = require('../database/models/quests');
const { purchaseItem, equipItem } = require('../database/models/economy');
const { getGuildChannel, getOrCreateGuild, autoDetectChannels, updateGuildChannels } = require('../database/models/guilds');
const { getShopItem } = require('../database/models/economy');
const { generateWelcomeCard } = require('../canvas/social');

// ── Deploy commands cho 1 guild ────────────────
async function deployCommandsToGuild(guildId) {
  try {
    const body = commands.map(c => c.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
      { body }
    );

    console.log(`✅ Deploy ${body.length} commands → guild ${guildId}`);
  } catch (err) {
    console.error(`⚠️ Deploy commands lỗi (guild ${guildId}):`, err.message);
  }
}

// ── Register ──────────────────────────────────
function registerEvents(client) {
  rap.setClient(client);

  // ── Ready ───────────────────────────────────
  client.once(Events.ClientReady, async () => {
    console.log('');
    console.log('  ██╗  ██╗██╗███████╗██╗   ██╗    ██╗   ██╗██╗   ██╗███████╗███╗   ██╗');
    console.log('  ██║  ██║██║██╔════╝██║   ██║    ██║   ██║╚██╗ ██╔╝██╔════╝████╗  ██║');
    console.log('  ███████║██║█████╗  ██║   ██║    ██║   ██║ ╚████╔╝ █████╗  ██╔██╗ ██║');
    console.log('  ██╔══██║██║██╔══╝  ██║   ██║    ██║   ██║  ╚██╔╝  ██╔══╝  ██║╚██╗██║');
    console.log('  ██║  ██║██║███████╗╚██████╔╝    ╚██████╔╝   ██║   ███████╗██║ ╚████║');
    console.log('  ╚═╝  ╚═╝╚═╝╚══════╝ ╚═════╝      ╚═════╝    ╚═╝   ╚══════╝╚═╝  ╚═══╝');
    console.log('');
    console.log(`  🌸 online: ${client.user.tag}`);
    console.log(`  📡 servers: ${client.guilds.cache.size}`);
    console.log('');

    startPresenceRotation(client);

    // deploy commands cho mọi server đang có
    await Promise.allSettled(client.guilds.cache.map(g => deployCommandsToGuild(g.id)));

    // XP voice mỗi phút
    const { handleVoiceXp } = require('../systems/level/xpSystem');
    setInterval(() => handleVoiceXp(client).catch(() => {}), 60 * 1000);

    startHealthReminders(client);
    require('../systems/diary/weeklyDiary').startWeeklyDiary(client);
  });

  // ── Message ─────────────────────────────────
  client.on(Events.MessageCreate, async message => {
    if (message.author?.bot) return;

    if (message.guild) {
      try {
        await handleMessageXp(message);

        if (message.mentions.users.size > 0) {
          for (const [, mentioned] of message.mentions.users) {
            if (mentioned.bot || mentioned.id === message.author.id) continue;
            getOrCreateUser(mentioned.id, mentioned.username);
            getOrCreateRelationship(message.author.id, mentioned.id);
            addLovePoints(message.author.id, mentioned.id, 2);
          }
        }

        await quiz.handleQuizAnswer(message);
      } catch (err) {
        console.error('MessageCreate error:', err.message);
      }
    }

    // AI chat: mention bot ở bất kỳ kênh nào (kể cả DM)
    await aiCommand.handleMention(message, client)
      .catch(err => console.error('[AI] dispatch error:', err.message));
  });

  // ── Reaction ────────────────────────────────
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;

    try {
      if (reaction.partial) await reaction.fetch();
      const msg = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

      if (msg.author && !msg.author.bot && msg.author.id !== user.id) {
        getOrCreateRelationship(user.id, msg.author.id);
        addLovePoints(user.id, msg.author.id, 1);
      }

      const total = msg.reactions.cache.reduce((acc, r) => acc + r.count, 0);
      if (total >= 5) {
        getDb().prepare(`
          INSERT OR REPLACE INTO server_logs
            (messageId, authorId, content, reactionCount, attachments, loggedAt)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).run(
          msg.id,
          msg.author?.id || 'unknown',
          msg.content?.substring(0, 500) || '',
          total,
          JSON.stringify(msg.attachments.map(a => a.url))
        );
      }
    } catch { /* ignore */ }
  });

  // ── Member join ─────────────────────────────
  client.on(Events.GuildMemberAdd, async member => {
    if (member.user.bot) return;

    getOrCreateUser(member.user.id, member.user.username);

    try {
      const channelId = getGuildChannel(member.guild.id, 'welcome');
      const channel = channelId ? member.guild.channels.cache.get(channelId) : member.guild.systemChannel;
      if (!channel) return;

      const card = await generateWelcomeCard({
        name: member.displayName,
        guildName: member.guild.name,
        avatarURL: member.user.displayAvatarURL({ extension: 'png', size: 512 }),
        memberCount: member.guild.memberCount
      });
      const file = new AttachmentBuilder(card, { name: 'welcome.png' });

      const embed = theme.imageEmbed({
        title: '🌸 NEW FACE ALERT',
        color: C.hot,
        section: 'WELCOME',
        description: [
          `**${member.displayName}** vừa gia nhập server!`,
          '',
          theme.field('Bắt đầu', '`/profile` · `/daily` · `/chat` · `/help`'),
          theme.field('Gacha', '`/gacha pull` để thử vận may'),
          '',
          theme.quote('chào mừng tới era mới, đừng quên uống nước')
        ].join('\n')
      });

      await channel.send({ embeds: [embed], files: [file] }).catch(() => {
        channel.send({ embeds: [embed] }).catch(() => {});
      });
    } catch { /* channel không cho gửi */ }
  });

  // ── Interaction ─────────────────────────────
  client.on(Events.InteractionCreate, async interaction => {
    try {
      if (interaction.isChatInputCommand()) return await handleSlashCommand(interaction);
      if (interaction.isButton()) return await handleButton(interaction);
      if (interaction.isStringSelectMenu()) return await handleSelect(interaction);
    } catch (err) {
      console.error('Interaction error:', err);

      const payload = {
        embeds: [theme.errorEmbed('Có gì đó không ổn', 'Thử lại sau vài giây nhé!')],
        flags: MessageFlags.Ephemeral
      };
      try {
        if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
        else await interaction.reply(payload);
      } catch { /* ignore */ }
    }
  });

  // ── Guild create ────────────────────────────
  client.on(Events.GuildCreate, async guild => {
    console.log(`🌸 Vào server mới: ${guild.name} (${guild.id})`);

    getOrCreateGuild(guild.id, guild.name);
    const detected = autoDetectChannels(guild);
    updateGuildChannels(guild.id, detected);

    await deployCommandsToGuild(guild.id);

    const channel = (detected.welcomeChannelId && guild.channels.cache.get(detected.welcomeChannelId))
      || guild.systemChannel;
    if (!channel) return;

    const embed = theme.baseEmbed({
      color: C.hot,
      section: 'WELCOME',
      title: '🌸 HIỂU UYÊN ĐÃ ĐẾN',
      thumbnail: client.user.displayAvatarURL({ extension: 'png', size: 256 }),
      description: [
        theme.header('XIN CHÀO SERVER MỚI', `${guild.name} · anime genz hiphop era`),
        'Slash commands đã được cài tự động.',
        '',
        '**Bot tự tìm được các kênh:**',
        detected.diaryChannelId ? `📰 Báo tường → <#${detected.diaryChannelId}>` : '',
        detected.healthChannelId ? `💧 Sức khỏe → <#${detected.healthChannelId}>` : '',
        detected.welcomeChannelId ? `👋 Chào mừng → <#${detected.welcomeChannelId}>` : '',
        '',
        '**Thử ngay:**',
        '`/profile` `/daily` `/chat` `/gacha pull` `/quiz` `/rapbattle @ai_đó`',
        '',
        '-# admin có thể chỉnh bằng /setup'
      ].filter(Boolean).join('\n')
    });

    await channel.send({ embeds: [embed] }).catch(() => {});
  });

  client.on(Events.GuildDelete, guild => {
    console.log(`👋 Rời server: ${guild.name} (${guild.id})`);
  });

  client.on('error', err => console.error('Discord client error:', err));
  process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));
}

// ── Presence ──────────────────────────────────
function startPresenceRotation(client) {
  const presets = [
    { name: 'vibe của server ✦ /help', type: 3 },
    { name: 'anime genZ hiphop era 🎧', type: 3 },
    { name: 'gacha với mọi người 🎴', type: 0 },
    { name: '/rapbattle @ai_đó 🎤', type: 2 },
    { name: 'tri kỷ của mọi người 💞', type: 3 },
    { name: 'trò chuyện với mình 🤖 /chat', type: 3 },
    { name: 'tài xỉu với mình 🎲 /taixiu', type: 3 }
  ];

  let i = 0;
  const tick = () => {
    try { client.user.setActivity(presets[i % presets.length]); } catch { /* ignore */ }
    i++;
  };
  tick();
  setInterval(tick, 45 * 1000);
}

// ── Slash command ─────────────────────────────
async function handleSlashCommand(interaction) {
  const command = commands.commandMap?.get(interaction.commandName)
    || commands.find(c => c.data.name === interaction.commandName);

  if (!command) {
    return interaction.reply({
      embeds: [theme.warnEmbed('Lệnh không tồn tại', 'Bot chưa deploy lệnh này. Thử `/help`.')],
      flags: MessageFlags.Ephemeral
    });
  }

  if (!interaction.client.cooldowns) interaction.client.cooldowns = new Map();
  const key = `${interaction.user.id}-${interaction.commandName}`;
  const last = interaction.client.cooldowns.get(key) || 0;
  const now = Date.now();

  if (now - last < 3000) {
    return interaction.reply({
      embeds: [theme.warnEmbed('Chậm thôi nào', `Chờ **${((3000 - (now - last)) / 1000).toFixed(1)}s** nữa nhé~`)],
      flags: MessageFlags.Ephemeral
    });
  }
  interaction.client.cooldowns.set(key, now);

  await command.execute(interaction, interaction.client);
}

// ── Buttons ───────────────────────────────────
async function handleButton(interaction) {
  const { customId } = interaction;

  // rap battle (tự xử lý toàn bộ flow)
  // rap battle (tự xử lý toàn bộ flow)
  if (customId.startsWith('rap_')) {
    const handled = await rap.handleButton(interaction);
    if (handled) return;
  }

  // nhiệm vụ hằng ngày
  if (customId.startsWith('quest:')) {
    const handled = await questCommand.handleQuestButton(interaction);
    if (handled) return;
  }

  if (customId === 'werewolf_join') {
    const game = getGame(interaction.guildId);
    if (!game || game.state !== STATE.WAITING) {
      return interaction.reply({ content: '❌ Phòng không còn mở!', flags: MessageFlags.Ephemeral });
    }

    getOrCreateUser(interaction.user.id, interaction.user.username);
    const added = game.addPlayer(interaction.member);

    if (!added) {
      return interaction.reply({ content: '❌ Bạn đã tham gia hoặc phòng đầy!', flags: MessageFlags.Ephemeral });
    }

    return interaction.reply(`✅ **${interaction.user.displayName}** đã tham gia! (${game.players.size}/12)`);
  }

  if (customId === 'werewolf_start') {
    const game = getGame(interaction.guildId);
    if (!game) return interaction.reply({ content: '❌ Không có game!', flags: MessageFlags.Ephemeral });
    if (game.host.id !== interaction.user.id) return interaction.reply({ content: '❌ Chỉ host!', flags: MessageFlags.Ephemeral });
    if (game.players.size < 4) return interaction.reply({ content: '❌ Cần ít nhất 4 người!', flags: MessageFlags.Ephemeral });

    await interaction.reply('🎮 Đang bắt đầu game...');
    game.assignRoles();
    await game.sendRoleDMs();
    await game.startDay();
    return;
  }

  if (customId === 'health_water_done') {
    getOrCreateUser(interaction.user.id, interaction.user.username);
    const result = updateWaterStreak(interaction.user.id);

    if (result?.alreadyDone) {
      return interaction.reply({ content: '✅ Hôm nay ghi nhận rồi nha!', flags: MessageFlags.Ephemeral });
    }

    addXp(interaction.user.id, 10);
    updateCoins(interaction.user.id, 5);
    progressQuest(interaction.user.id, 'water');

    return interaction.reply({
      embeds: [theme.successEmbed(
        'Đã uống nước',
        `**${interaction.user.displayName}** vừa uống nước!\n🔥 Streak: **${result?.streak} ngày**`
      )]
    });
  }
}

// ── Select menus ──────────────────────────────
async function handleSelect(interaction) {
  const { customId, values } = interaction;
  const value = values[0];

  if (customId === 'help_select') {
    return interaction.update(await buildHelpPayload(value, interaction.client));
  }

  const [componentAction] = customId.split(':');

  if (componentAction === 'shop_buy') {
    getOrCreateUser(interaction.user.id, interaction.user.username);
    const result = purchaseItem(interaction.user.id, value);

    if (!result.success) {
      return interaction.reply({
        embeds: [theme.errorEmbed('Không mua được', result.message)],
        flags: MessageFlags.Ephemeral
      });
    }

    const item = getShopItem(value);
    return interaction.reply({
      embeds: [theme.successEmbed('MUA THÀNH CÔNG', [
        `**${item.itemName}** đã vào túi.`,
        '',
        `> Trang bị: \`/shop equip ${item.itemId}\``
      ].join('\n'))],
      flags: MessageFlags.Ephemeral
    });
  }

  if (componentAction === 'shop_equip') {
    const result = equipItem(interaction.user.id, Number(value));

    if (!result.success) {
      return interaction.reply({
        embeds: [theme.errorEmbed('Không trang bị được', result.message)],
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.reply({
      embeds: [theme.successEmbed('ĐÃ TRANG BỊ', `${result.message}\n\n> Xem \`/profile\` để kiểm tra ✨`)],
      flags: MessageFlags.Ephemeral
    });
  }

  const game = getGame(interaction.guildId);

  if (customId === 'werewolf_vote' && game?.state === STATE.VOTING) {
    game.votes.set(interaction.user.id, value);
    return interaction.reply({ content: '✅ Đã bỏ phiếu!', flags: MessageFlags.Ephemeral });
  }

  if (customId.startsWith('wolf_kill_') && game) {
    game.nightTarget = value;
    return interaction.reply({ content: '🐺 Đã chọn mục tiêu đêm nay!', flags: MessageFlags.Ephemeral });
  }

  if (customId.startsWith('seer_check_') && game) {
    const target = game.players.get(value);
    if (target) {
      return interaction.reply({
        embeds: [theme.baseEmbed({
          color: C.neon,
          title: '🔮 TIÊN TRI HÉ LỘ',
          description: `**${target.member.displayName}** là **${target.role.name}**`
        })],
        flags: MessageFlags.Ephemeral
      });
    }
  }

  if (customId.startsWith('protector_save_') && game) {
    const target = game.players.get(value);
    if (target) {
      target.protected = true;
      return interaction.reply({
        content: `🛡️ Đã bảo vệ **${target.member.displayName}** đêm nay!`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

// ── Health reminders ──────────────────────────
function startHealthReminders(client) {
  const reminders = [
    { hour: 9,  title: 'MỞ MẮT LÀ UỐNG NƯỚC', message: '☀️ Ngày mới rồi. Một ly nước trước khi mở điện thoại nha.' },
    { hour: 12, title: 'GIỜ NGHỈ TRƯA', message: '🌞 Ăn trưa xong nhớ đứng dậy vài phút, đừng dán mắt vào màn hình.' },
    { hour: 15, title: 'CHECK POSTURE', message: '⏰ 3 giờ chiều. Vai đang gù kìa, ngồi thẳng lên và uống nước đi.' },
    { hour: 18, title: 'NẠP LẠI NƯỚC', message: '🌆 Chiều tàn rồi, hôm nay bạn uống đủ nước chưa?' },
    { hour: 21, title: 'CHUẨN BỊ NGHỈ', message: '🌙 Tối rồi. Bớt lướt điện thoại, ngủ đủ giấc giúp aura tăng.' }
  ];

  setInterval(async () => {
    const now = new Date();
    if (now.getMinutes() !== 0) return;

    const reminder = reminders.find(r => r.hour === now.getHours());
    if (!reminder) return;

    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const channelId = getGuildChannel(guildId, 'health');
        if (!channelId) continue;
        const channel = guild.channels.cache.get(channelId);
        if (!channel) continue;

        const button = new ButtonBuilder()
          .setCustomId('health_water_done')
          .setLabel('Đã uống nước')
          .setEmoji('💧')
          .setStyle(ButtonStyle.Primary);

        await channel.send({
          embeds: [theme.baseEmbed({
            color: C.cyber,
            section: theme.sectionName('health'),
            title: `💧 ${reminder.title}`,
            description: [reminder.message, '', '-# nhấn nút để nhận +10 XP và +5 coin'].join('\n')
          })],
          components: [new ActionRowBuilder().addComponents(button)]
        });
      } catch { /* ignore từng server */ }
    }
  }, 60 * 1000);
}

module.exports = { registerEvents, deployCommandsToGuild };
