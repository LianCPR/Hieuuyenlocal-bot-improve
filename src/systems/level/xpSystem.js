// =============================================
// LEVEL SYSTEM — XP, level up, title, achievement
// =============================================

const { AttachmentBuilder } = require('discord.js');
const theme = require('../../ui/theme');
const { C, fmtNum, rankOf } = theme;
const {
  addXp, getOrCreateUser, incrementMessages, unlockTitle, setUserTitle
} = require('../../database/models/users');
const { checkAllAchievements } = require('../../database/models/achievements');
const { progressQuest } = require('../../database/models/quests');
const { generateLevelUpCard } = require('../../canvas/profileCard');

const xpCooldowns = new Map();
const XP_COOLDOWN = parseInt(process.env.XP_COOLDOWN_SECONDS || 60) * 1000;

const LEVEL_TITLES = [
  { level: 1, title: 'Tập Sự' },
  { level: 5, title: 'Người Kể Chuyện' },
  { level: 10, title: 'Kẻ Săn Đêm' },
  { level: 15, title: 'Linh Hồn Tự Do' },
  { level: 20, title: 'Học Giả Server' },
  { level: 30, title: 'Thám Tử Nghi Lễ' },
  { level: 40, title: 'Thần Nước Đương Thời' },
  { level: 50, title: 'Huyền Thoại Tri Kỷ' },
  { level: 75, title: 'Bất Tử Server' },
  { level: 100, title: 'Tinh Tú Vĩnh Cửu' }
];

// ── Message XP ────────────────────────────────
async function handleMessageXp(message) {
  if (message.author?.bot || !message.guild) return;

  const userId = message.author.id;
  const now = Date.now();

  if (now - (xpCooldowns.get(userId) || 0) < XP_COOLDOWN) return;
  xpCooldowns.set(userId, now);

  getOrCreateUser(userId, message.author.username);
  incrementMessages(userId);

  const base = parseInt(process.env.XP_PER_MESSAGE || 5);
  const gain = Math.floor(Math.random() * 5) + base;

  const result = addXp(userId, gain);
  if (!result) return;

  progressQuest(userId, 'messages');

  if (result.leveled) {
    await sendLevelUpNotification(message, getOrCreateUser(userId, message.author.username), result);
  }

  const updated = getOrCreateUser(userId, message.author.username);
  const newAchievements = await checkAllAchievements(updated);

  for (const achievement of newAchievements) {
    await sendAchievementNotification(message.channel, message.member, achievement);
  }
}

// ── Level up ──────────────────────────────────
async function sendLevelUpNotification(message, user, result) {
  try {
    const rank = rankOf(result.newLevel);
    const newTitle = checkTitleUnlock(result.newLevel, user.userId, message.member);

    const card = await generateLevelUpCard(user, message.member, result.newLevel);
    const file = new AttachmentBuilder(card, { name: 'levelup.png' });

    const embed = theme.baseEmbed({
      color: C.hot,
      section: theme.sectionName('level'),
      title: `📈 LEVEL ${result.newLevel} — ${rank.name}`,
      image: 'attachment://levelup.png',
      description: [
        `**${message.member?.displayName || user.username}** vừa lên cấp!`,
        '',
        theme.field('Level', `${result.oldLevel} → **${result.newLevel}**`),
        theme.field('Rank', `${rank.emoji} ${rank.short} · ${rank.tag}`),
        theme.field('XP', fmtNum(result.newXp)),
        newTitle ? `> 🏷️ Danh hiệu mới: **${newTitle}**` : '',
        '',
        theme.quote(theme.hype('levelup'))
      ].filter(Boolean).join('\n')
    });

    await message.channel.send({ embeds: [embed], files: [file] });
  } catch (err) {
    console.error('Level up notification error:', err.message);
  }
}

/**
 * Mở khoá danh hiệu theo level — FIX: truyền đúng userId
 */
function checkTitleUnlock(level, userId, member) {
  const unlocked = LEVEL_TITLES.filter(t => t.level <= level).pop();
  if (!unlocked || !userId) return null;

  const isNew = unlockTitle(userId, unlocked.title);
  if (!isNew) return null;
  if (member) setUserTitle(userId, unlocked.title);
  return unlocked.title;
}

// ── Achievement ───────────────────────────────
async function sendAchievementNotification(channel, member, achievement) {
  try {
    const embed = theme.baseEmbed({
      color: C.gold,
      section: theme.sectionName('profile'),
      title: `${achievement.badgeIcon} THÀNH TỰU MỚI`,
      thumbnail: member?.displayAvatarURL ? member.displayAvatarURL({ extension: 'png', size: 256 }) : undefined,
      description: [
        `**${member?.displayName || 'Ai đó'}** vừa mở khoá:`,
        '',
        `**${achievement.name}**`,
        `*${achievement.description}*`,
        '',
        theme.field('Thưởng', `+${achievement.rewardXp} XP · +${achievement.rewardCoins} coins`),
        '',
        theme.quote('bộ sưu tập đang dày lên đó')
      ].join('\n')
    });

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Achievement notification error:', err.message);
  }
}

// ── Voice XP ──────────────────────────────────
async function handleVoiceXp(client) {
  const xpPerMinute = parseInt(process.env.XP_VOICE_PER_MINUTE || 2);

  for (const [, guild] of client.guilds.cache) {
    for (const [, state] of guild.voiceStates.cache) {
      if (!state.channelId) continue;
      if (state.member?.user.bot) continue;
      if (state.selfMute && state.selfDeaf) continue;

      const userId = state.member.user.id;
      getOrCreateUser(userId, state.member.user.username);
      addXp(userId, xpPerMinute);
    }
  }
}

module.exports = {
  handleMessageXp, handleVoiceXp,
  sendAchievementNotification, LEVEL_TITLES, checkTitleUnlock
};
