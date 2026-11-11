// =============================================
// MA SÓI GAME - Hiểu Uyên Bot
// Full implementation của game Werewolf
// =============================================

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ChannelType, PermissionFlagsBits
} = require('discord.js');
const { getDb } = require('../../database/database');
const { addXp, updateCoins } = require('../../database/models/users');

// ── ROLES ─────────────────────────────────────
const ROLES = {
  WOLF:      { id: 'wolf',      name: 'Ma Sói 🐺',     desc: 'Mỗi đêm, giết 1 dân làng. Tránh bị phát hiện!', emoji: '🐺', team: 'evil' },
  VILLAGER:  { id: 'villager',  name: 'Dân Làng 🏘️',   desc: 'Tìm và loại bỏ Ma Sói khỏi làng!', emoji: '🏘️', team: 'good' },
  SEER:      { id: 'seer',      name: 'Tiên Tri 🔮',    desc: 'Mỗi đêm, xem thân phận 1 người chơi.', emoji: '🔮', team: 'good' },
  PROTECTOR: { id: 'protector', name: 'Người Bảo Vệ 🛡️', desc: 'Mỗi đêm, bảo vệ 1 người khỏi Ma Sói.', emoji: '🛡️', team: 'good' },
};

// ── GAME STATES ───────────────────────────────
const STATE = { WAITING: 0, DAY: 1, NIGHT: 2, VOTING: 3, ENDED: 4 };

// Active games: guildId -> GameSession
const activeGames = new Map();

class WerewolfGame {
  constructor(guild, channel, hostMember) {
    this.guild       = guild;
    this.channel     = channel;
    this.host        = hostMember;
    this.players     = new Map(); // userId -> { member, role, alive, protected, voted }
    this.state       = STATE.WAITING;
    this.day         = 0;
    this.nightTarget = null; // Wolf kill target
    this.seerTarget  = null;
    this.protectTarget = null;
    this.votes       = new Map(); // voterId -> targetId
    this.nightChannel = null; // Private wolf channel
    this.timeout     = null;
    this.startTime   = Date.now();
  }

  // ── Thêm người chơi ─────────────────────────
  addPlayer(member) {
    if (this.players.has(member.id)) return false;
    if (this.players.size >= 12) return false;
    this.players.set(member.id, {
      member, role: null, alive: true,
      protected: false, voted: false
    });
    return true;
  }

  // ── Assign roles ─────────────────────────────
  assignRoles() {
    const count = this.players.size;
    let roles = [];

    // 1 wolf per 4 players (min 1)
    const wolfCount = Math.max(1, Math.floor(count / 4));
    for (let i = 0; i < wolfCount; i++) roles.push(ROLES.WOLF);

    // Special roles
    if (count >= 5) roles.push(ROLES.SEER);
    if (count >= 7) roles.push(ROLES.PROTECTOR);

    // Fill rest with villagers
    while (roles.length < count) roles.push(ROLES.VILLAGER);

    // Shuffle
    roles.sort(() => Math.random() - 0.5);

    // Assign
    let i = 0;
    for (const [userId, player] of this.players) {
      player.role = roles[i++];
    }
  }

  // ── Send DM roles ─────────────────────────────
  async sendRoleDMs() {
    for (const [, player] of this.players) {
      try {
        const embed = new EmbedBuilder()
          .setColor(player.role.team === 'evil' ? 0xFF0000 : 0x00AA00)
          .setTitle(`🌙 Thân phận của bạn: ${player.role.name}`)
          .setDescription([
            `**${player.role.desc}**`,
            ``,
            player.role.id === 'wolf'
              ? `🐺 Đồng bọn Sói: ${this.getWolves().filter(w => w.member.id !== player.member.id).map(w => w.member.displayName).join(', ') || 'Chỉ mình bạn!'}`
              : '',
            ``,
            `📢 Game diễn ra tại: ${this.channel}`
          ].filter(Boolean).join('\n'))
          .setFooter({ text: 'Hiểu Uyên • Ma Sói • Đừng tiết lộ thân phận!' })
          .setTimestamp();

        await player.member.send({ embeds: [embed] });
      } catch {
        // DM blocked - thông báo trong channel
        await this.channel.send(`⚠️ Không thể gửi DM cho ${player.member.displayName}! Hãy bật cho phép nhận DM.`);
      }
    }
  }

  // ── Lấy danh sách wolves ──────────────────────
  getWolves() {
    return [...this.players.values()].filter(p => p.role?.id === 'wolf' && p.alive);
  }

  // ── Lấy tất cả player còn sống ───────────────
  getAlivePlayers() {
    return [...this.players.values()].filter(p => p.alive);
  }

  // ── Kiểm tra điều kiện thắng ─────────────────
  checkWinCondition() {
    const alive = this.getAlivePlayers();
    const wolves = alive.filter(p => p.role?.id === 'wolf');
    const good = alive.filter(p => p.role?.team === 'good');

    if (wolves.length === 0) return 'good';
    if (wolves.length >= good.length) return 'evil';
    return null;
  }

  // ── Bắt đầu phase ban ngày ───────────────────
  async startDay() {
    this.state = STATE.DAY;
    this.day++;
    this.votes.clear();

    // Reset protection
    for (const [, p] of this.players) p.protected = false;

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`☀️ Ngày ${this.day} - Làng thức dậy`)
      .setDescription([
        `Mặt trời đã mọc! Dân làng bắt đầu thảo luận...`,
        ``,
        `👥 **Còn sống (${this.getAlivePlayers().length}):**`,
        this.getAlivePlayers().map(p => `• ${p.member.displayName}`).join('\n'),
        ``,
        `🗳️ Dùng **/vote @người** để bỏ phiếu loại ai đó!`,
        `⏰ Thảo luận trong **3 phút**...`
      ].join('\n'))
      .setFooter({ text: 'Hiểu Uyên • Ma Sói' });

    await this.channel.send({ embeds: [embed] });

    // Sau 3 phút bắt đầu vote
    this.timeout = setTimeout(() => this.startVoting(), 3 * 60 * 1000);
  }

  // ── Bắt đầu voting ────────────────────────────
  async startVoting() {
    clearTimeout(this.timeout);
    this.state = STATE.VOTING;

    const alivePlayers = this.getAlivePlayers();

    const options = alivePlayers.map(p => ({
      label: p.member.displayName,
      value: p.member.id,
      emoji: '👤'
    }));

    const select = new StringSelectMenuBuilder()
      .setCustomId('werewolf_vote')
      .setPlaceholder('Chọn người bạn nghi ngờ...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);

    const embed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle('🗳️ BỎ PHIẾU - Ai là Ma Sói?')
      .setDescription([
        `Thời gian bỏ phiếu! Hãy chọn người bạn nghi là Sói.`,
        `⏰ **60 giây** để bỏ phiếu!`,
        ``,
        `Người có nhiều phiếu nhất sẽ bị xử tử.`,
      ].join('\n'))
      .setFooter({ text: 'Hiểu Uyên • Ma Sói' });

    const msg = await this.channel.send({ embeds: [embed], components: [row] });

    // Thu phiếu sau 60s
    this.timeout = setTimeout(() => this.processVotes(msg), 60 * 1000);
  }

  // ── Xử lý kết quả vote ────────────────────────
  async processVotes(voteMsg) {
    clearTimeout(this.timeout);

    // Đếm phiếu
    const voteCount = new Map();
    for (const [, targetId] of this.votes) {
      voteCount.set(targetId, (voteCount.get(targetId) || 0) + 1);
    }

    if (voteCount.size === 0) {
      await this.channel.send('😔 Không ai bỏ phiếu... Không ai bị loại hôm nay.');
      await this.startNight();
      return;
    }

    // Người nhiều phiếu nhất
    let maxVotes = 0, eliminated = null;
    for (const [userId, count] of voteCount) {
      if (count > maxVotes) { maxVotes = count; eliminated = userId; }
    }

    const eliminatedPlayer = this.players.get(eliminated);
    if (eliminatedPlayer) {
      eliminatedPlayer.alive = false;

      const embed = new EmbedBuilder()
        .setColor(0x8B0000)
        .setTitle('⚰️ Kết quả bỏ phiếu')
        .setDescription([
          `**${eliminatedPlayer.member.displayName}** bị dân làng xử tử!`,
          ``,
          `Thân phận: **${eliminatedPlayer.role.name}**`,
          ``,
          `*Đúng không? Dân làng thở phào... hay hối hận?*`
        ].join('\n'))
        .setThumbnail(eliminatedPlayer.member.displayAvatarURL());

      await this.channel.send({ embeds: [embed] });
    }

    // Kiểm tra thắng/thua
    const winner = this.checkWinCondition();
    if (winner) {
      await this.endGame(winner);
      return;
    }

    await this.startNight();
  }

  // ── Bắt đầu ban đêm ───────────────────────────
  async startNight() {
    this.state = STATE.NIGHT;
    this.nightTarget = null;
    this.seerTarget = null;
    this.protectTarget = null;

    const embed = new EmbedBuilder()
      .setColor(0x1a1a3e)
      .setTitle('🌙 Đêm buông xuống...')
      .setDescription([
        `Làng chìm vào giấc ngủ...`,
        `Nhưng có những kẻ vẫn thức trong bóng tối.`,
        ``,
        `👤 Kiểm tra DM của bạn để thực hiện hành động đêm nay!`,
        `⏰ **90 giây** để tất cả hành động!`
      ].join('\n'))
      .setFooter({ text: 'Hiểu Uyên • Ma Sói' });

    await this.channel.send({ embeds: [embed] });

    // Gửi DM cho các role đặc biệt
    await this.sendNightActionDMs();

    // Sau 90s xử lý đêm
    this.timeout = setTimeout(() => this.processNight(), 90 * 1000);
  }

  // ── Gửi DM hành động đêm ─────────────────────
  async sendNightActionDMs() {
    const alivePlayers = this.getAlivePlayers();
    const selectOptions = alivePlayers.map(p => ({
      label: p.member.displayName,
      value: p.member.id,
      emoji: '👤'
    }));

    for (const [, player] of this.players) {
      if (!player.alive) continue;

      try {
        if (player.role.id === 'wolf') {
          const targets = alivePlayers.filter(p => p.role?.id !== 'wolf');
          const wolfOptions = targets.map(p => ({
            label: p.member.displayName,
            value: p.member.id,
            emoji: '🎯'
          }));

          const select = new StringSelectMenuBuilder()
            .setCustomId(`wolf_kill_${this.guild.id}`)
            .setPlaceholder('Chọn nạn nhân đêm nay...')
            .addOptions(wolfOptions);

          const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🐺 Hành động của Ma Sói')
            .setDescription('Chọn người bạn muốn tiêu diệt đêm nay!');

          await player.member.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });

        } else if (player.role.id === 'seer') {
          const select = new StringSelectMenuBuilder()
            .setCustomId(`seer_check_${this.guild.id}`)
            .setPlaceholder('Chọn người muốn xem thân phận...')
            .addOptions(selectOptions.filter(o => o.value !== player.member.id));

          const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🔮 Sức mạnh Tiên Tri')
            .setDescription('Bạn có thể xem thân phận của 1 người tối nay!');

          await player.member.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });

        } else if (player.role.id === 'protector') {
          const select = new StringSelectMenuBuilder()
            .setCustomId(`protector_save_${this.guild.id}`)
            .setPlaceholder('Chọn người muốn bảo vệ...')
            .addOptions(selectOptions.filter(o => o.value !== player.member.id));

          const embed = new EmbedBuilder()
            .setColor(0x00AA00)
            .setTitle('🛡️ Hành động Bảo Vệ')
            .setDescription('Bạn có thể bảo vệ 1 người khỏi Ma Sói tối nay!');

          await player.member.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
        }
      } catch { /* DM blocked */ }
    }
  }

  // ── Xử lý kết quả đêm ────────────────────────
  async processNight() {
    clearTimeout(this.timeout);

    let deathMsg = '🌅 Bình minh ló dạng... Một đêm bình yên trôi qua!';
    let died = null;

    if (this.nightTarget) {
      const target = this.players.get(this.nightTarget);
      if (target && !target.protected) {
        target.alive = false;
        died = target;
        deathMsg = `🩸 **${target.member.displayName}** đã bị giết trong đêm!\nThân phận: **${target.role.name}**`;
      } else if (target?.protected) {
        deathMsg = `🛡️ Đêm qua có ai đó bị tấn công... nhưng đã được bảo vệ kịp thời!`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(died ? 0x8B0000 : 0xFFD700)
      .setTitle('🌅 Bình minh - Kết quả đêm qua')
      .setDescription(deathMsg)
      .setFooter({ text: 'Hiểu Uyên • Ma Sói' });

    await this.channel.send({ embeds: [embed] });

    const winner = this.checkWinCondition();
    if (winner) {
      await this.endGame(winner);
    } else {
      await this.startDay();
    }
  }

  // ── Kết thúc game ─────────────────────────────
  async endGame(winner) {
    this.state = STATE.ENDED;
    clearTimeout(this.timeout);

    const isGoodWin = winner === 'good';
    const duration = Math.floor((Date.now() - this.startTime) / 1000 / 60);

    // Rewards
    const XP_WIN = 150, COINS_WIN = 75, XP_PLAY = 30, COINS_PLAY = 15;
    const winners = [...this.players.values()].filter(p =>
      (isGoodWin && p.role?.team === 'good') || (!isGoodWin && p.role?.team === 'evil')
    );

    for (const [userId] of this.players) {
      addXp(userId, XP_PLAY);
      updateCoins(userId, COINS_PLAY);
    }
    for (const winner of winners) {
      addXp(winner.member.id, XP_WIN);
      updateCoins(winner.member.id, COINS_WIN);
    }

    // Update stats
    this.updateStats(winner);

    const roles = [...this.players.values()]
      .map(p => `${p.alive ? '✅' : '💀'} **${p.member.displayName}** - ${p.role.name}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(isGoodWin ? 0x00AA00 : 0xFF0000)
      .setTitle(isGoodWin ? '🎉 DÂN LÀNG CHIẾN THẮNG!' : '🐺 MA SÓI CHIẾN THẮNG!')
      .setDescription([
        isGoodWin
          ? '✨ Dân làng đã tìm ra và tiêu diệt Ma Sói!'
          : '🌙 Ma Sói đã kiểm soát cả làng rồi...',
        ``,
        `⏱️ Thời gian: **${duration} phút**`,
        ``,
        `**📋 Thân phận tất cả người chơi:**`,
        roles,
        ``,
        `🎁 Người thắng: **+${XP_WIN} XP + ${COINS_WIN} coins**`,
        `🎁 Tất cả: **+${XP_PLAY} XP + ${COINS_PLAY} coins**`
      ].join('\n'))
      .setFooter({ text: 'Hiểu Uyên • Ma Sói' })
      .setTimestamp();

    await this.channel.send({ embeds: [embed] });
    activeGames.delete(this.guild.id);
  }

  // ── Update stats sau game ──────────────────────
  updateStats(winner) {
    const db = getDb();
    const isGoodWin = winner === 'good';

    for (const [userId, player] of this.players) {
      db.prepare(`
        INSERT OR IGNORE INTO werewolf_stats (userId) VALUES (?)
      `).run(userId);

      const won = (isGoodWin && player.role?.team === 'good') ||
                  (!isGoodWin && player.role?.team === 'evil');

      db.prepare(`
        UPDATE werewolf_stats SET
          gamesPlayed = gamesPlayed + 1,
          gamesWon = gamesWon + ?,
          wolfWins = wolfWins + ?,
          villagerWins = villagerWins + ?,
          seerWins = seerWins + ?,
          protectorWins = protectorWins + ?
        WHERE userId = ?
      `).run(
        won ? 1 : 0,
        (!isGoodWin && player.role?.id === 'wolf') ? 1 : 0,
        (isGoodWin && player.role?.id === 'villager') ? 1 : 0,
        (isGoodWin && player.role?.id === 'seer') ? 1 : 0,
        (isGoodWin && player.role?.id === 'protector') ? 1 : 0,
        userId
      );
    }
  }
}

// ── Exports ──────────────────────────────────
function createGame(guild, channel, host) {
  if (activeGames.has(guild.id)) return null;
  const game = new WerewolfGame(guild, channel, host);
  activeGames.set(guild.id, game);
  return game;
}

function getGame(guildId) {
  return activeGames.get(guildId) || null;
}

function endGame(guildId) {
  activeGames.delete(guildId);
}

module.exports = { WerewolfGame, createGame, getGame, endGame, ROLES, STATE };
