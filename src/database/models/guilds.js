// =============================================
// GUILD SETTINGS MODEL
// Lưu cấu hình riêng cho từng server
// =============================================

const { getDb } = require('../database');

/**
 * Lấy hoặc tạo settings cho một guild
 */
function getOrCreateGuild(guildId, guildName) {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM guild_settings WHERE guildId = ?').get(guildId);
  if (existing) {
    // Update tên guild nếu thay đổi
    if (guildName && existing.guildName !== guildName) {
      db.prepare('UPDATE guild_settings SET guildName = ? WHERE guildId = ?').run(guildName, guildId);
    }
    return existing;
  }

  db.prepare(`
    INSERT INTO guild_settings (guildId, guildName, joinedAt)
    VALUES (?, ?, datetime('now'))
  `).run(guildId, guildName || '');

  return db.prepare('SELECT * FROM guild_settings WHERE guildId = ?').get(guildId);
}

/**
 * Lấy settings của guild
 */
function getGuildSettings(guildId) {
  return getDb().prepare('SELECT * FROM guild_settings WHERE guildId = ?').get(guildId);
}

/**
 * Cập nhật channel settings
 * @param {string} guildId
 * @param {object} channels - { logChannelId, diaryChannelId, healthChannelId, welcomeChannelId }
 */
function updateGuildChannels(guildId, channels) {
  const db = getDb();
  const fields = [];
  const values = [];

  const allowed = ['logChannelId', 'diaryChannelId', 'healthChannelId', 'welcomeChannelId'];
  for (const [key, val] of Object.entries(channels)) {
    if (allowed.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (!fields.length) return false;

  values.push(guildId);
  db.prepare(`UPDATE guild_settings SET ${fields.join(', ')} WHERE guildId = ?`).run(...values);
  return true;
}

/**
 * Lấy channel ID của guild (ưu tiên DB, fallback về env)
 */
function getGuildChannel(guildId, type) {
  const settings = getGuildSettings(guildId);
  const envMap = {
    log:     process.env.LOG_CHANNEL_ID,
    diary:   process.env.DIARY_CHANNEL_ID,
    health:  process.env.HEALTH_CHANNEL_ID,
    welcome: null
  };
  const dbMap = {
    log:     settings?.logChannelId,
    diary:   settings?.diaryChannelId,
    health:  settings?.healthChannelId,
    welcome: settings?.welcomeChannelId
  };

  return dbMap[type] || envMap[type] || null;
}

/**
 * Auto-detect channel phù hợp trong guild
 * Bot tự tìm channel theo tên phổ biến
 */
function autoDetectChannels(guild) {
  const channels = guild.channels.cache.filter(c => c.isTextBased() && !c.isThread());

  const find = (...keywords) => {
    for (const kw of keywords) {
      const ch = channels.find(c =>
        c.name.toLowerCase().includes(kw) &&
        c.permissionsFor(guild.members.me)?.has('SendMessages')
      );
      if (ch) return ch.id;
    }
    return null;
  };

  return {
    logChannelId:     find('bot-log', 'log', 'bot'),
    diaryChannelId:   find('nhat-ky', 'diary', 'journal', 'weekly', 'tuan'),
    healthChannelId:  find('suc-khoe', 'health', 'nuoc', 'water'),
    welcomeChannelId: find('chao-mung', 'welcome', 'general', 'chung')
      || guild.systemChannel?.id
      || channels.first()?.id
  };
}

module.exports = {
  getOrCreateGuild,
  getGuildSettings,
  updateGuildChannels,
  getGuildChannel,
  autoDetectChannels
};
