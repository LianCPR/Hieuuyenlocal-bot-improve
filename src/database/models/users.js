// =============================================
// USERS MODEL - Hiểu Uyên Bot
// Các thao tác database cho người dùng
// =============================================

const { getDb } = require('../database');

/**
 * Lấy hoặc tạo user mới
 * @param {string} userId - Discord user ID
 * @param {string} username - Discord username
 */
function getOrCreateUser(userId, username) {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
  if (existing) {
    // Update username nếu thay đổi
    if (existing.username !== username) {
      db.prepare('UPDATE users SET username = ? WHERE userId = ?').run(username, userId);
      existing.username = username;
    }
    return existing;
  }

  // Tạo user mới
  db.prepare(`
    INSERT INTO users (userId, username, createdAt)
    VALUES (?, ?, datetime('now'))
  `).run(userId, username);

  // Thêm title mặc định
  db.prepare(`
    INSERT OR IGNORE INTO user_titles (userId, titleName)
    VALUES (?, 'Tập Sự')
  `).run(userId);

  return db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
}

/**
 * Lấy thông tin user theo ID
 */
function getUser(userId) {
  return getDb().prepare('SELECT * FROM users WHERE userId = ?').get(userId);
}

/**
 * Cộng XP cho user - có tính level up
 * @returns {{ leveled: boolean, oldLevel: number, newLevel: number }}
 */
function addXp(userId, amount) {
  const db = getDb();
  const user = db.prepare('SELECT xp, level FROM users WHERE userId = ?').get(userId);
  if (!user) return null;

  const newXp = user.xp + amount;
  const newLevel = calculateLevel(newXp);
  const leveled = newLevel > user.level;

  db.prepare("UPDATE users SET xp = ?, level = ?, lastXpTime = datetime('now') WHERE userId = ?")
    .run(newXp, newLevel, userId);

  return { leveled, oldLevel: user.level, newLevel, newXp };
}

/**
 * Tính level từ XP - công thức progressive
 * Level n cần: 100 * n^1.5 XP tích lũy
 */
function calculateLevel(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return Math.min(level, 100);
}

function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level - 1, 1.5));
}

function xpNeededForNextLevel(level) {
  return xpForLevel(level + 1);
}

/**
 * Cộng/trừ coins
 */
function updateCoins(userId, amount) {
  const db = getDb();
  const user = db.prepare('SELECT coins FROM users WHERE userId = ?').get(userId);
  if (!user) return false;

  const newCoins = Math.max(0, user.coins + amount);
  db.prepare('UPDATE users SET coins = ? WHERE userId = ?').run(newCoins, userId);
  return newCoins;
}

/**
 * Cập nhật số tin nhắn
 */
function incrementMessages(userId) {
  getDb().prepare('UPDATE users SET totalMessages = totalMessages + 1 WHERE userId = ?').run(userId);
}

/**
 * Cập nhật voice minutes
 */
function addVoiceMinutes(userId, minutes) {
  getDb().prepare('UPDATE users SET totalVoiceMinutes = totalVoiceMinutes + ? WHERE userId = ?').run(minutes, userId);
}

/**
 * Leaderboard theo XP
 */
function getLeaderboard(type = 'xp', limit = 10) {
  const db = getDb();
  const orderBy = {
    xp: 'xp DESC',
    coins: 'coins DESC',
    messages: 'totalMessages DESC',
    health: 'waterStreak DESC'
  };

  return db.prepare(`
    SELECT userId, username, xp, level, coins, title, waterStreak, totalMessages
    FROM users 
    ORDER BY ${orderBy[type] || 'xp DESC'}
    LIMIT ?
  `).all(limit);
}

/**
 * Cập nhật water streak
 */
function updateWaterStreak(userId) {
  const db = getDb();
  const user = db.prepare('SELECT waterStreak, lastWaterCheck FROM users WHERE userId = ?').get(userId);
  if (!user) return null;

  const now = new Date();
  const lastCheck = user.lastWaterCheck ? new Date(user.lastWaterCheck) : null;

  // Kiểm tra đã check hôm nay chưa
  if (lastCheck && isSameDay(now, lastCheck)) {
    return { streak: user.waterStreak, alreadyDone: true };
  }

  // Kiểm tra có liên tiếp không
  let newStreak = user.waterStreak;
  if (lastCheck && isYesterday(now, lastCheck)) {
    newStreak += 1;
  } else if (!lastCheck || !isYesterday(now, lastCheck)) {
    newStreak = 1; // Reset streak
  }

  db.prepare("UPDATE users SET waterStreak = ?, lastWaterCheck = datetime('now') WHERE userId = ?")
    .run(newStreak, userId);

  return { streak: newStreak, alreadyDone: false };
}

/**
 * Cập nhật title cho user
 */
function setUserTitle(userId, title) {
  getDb().prepare('UPDATE users SET title = ? WHERE userId = ?').run(title, userId);
}

/**
 * Lấy danh sách titles đã mở khóa
 */
function getUserTitles(userId) {
  return getDb().prepare('SELECT titleName, unlockedAt FROM user_titles WHERE userId = ?').all(userId);
}

/**
 * Unlock title mới
 */
function unlockTitle(userId, titleName) {
  try {
    getDb().prepare('INSERT OR IGNORE INTO user_titles (userId, titleName) VALUES (?, ?)').run(userId, titleName);
    return true;
  } catch { return false; }
}

/**
 * Lấy daily reward
 */
function claimDaily(userId) {
  const db = getDb();
  const user = db.prepare('SELECT lastDaily, coins, dailyStreak FROM users WHERE userId = ?').get(userId);
  if (!user) return null;

  const now = new Date();
  const lastDaily = user.lastDaily ? new Date(user.lastDaily) : null;

  if (lastDaily && isSameDay(now, lastDaily)) {
    return { claimed: false, nextClaim: getNextMidnight(), streak: user.dailyStreak || 1 };
  }

  // Chuỗi điểm danh: hôm qua có nhận → +1, nghỉ quá 1 ngày → reset
  const streak = lastDaily && isYesterday(now, lastDaily)
    ? (user.dailyStreak || 0) + 1
    : 1;

  const baseCoins = parseInt(process.env.DAILY_COINS || 100);
  const baseXp = parseInt(process.env.DAILY_XP || 50);
  const bonus = Math.min(streak - 1, 7) * 15; // tối đa +105 coins
  const dailyCoins = baseCoins + bonus;
  const dailyXp = baseXp + Math.min(streak - 1, 7) * 5;

  db.prepare(`UPDATE users
    SET coins = coins + ?, dailyStreak = ?, lastDaily = datetime('now')
    WHERE userId = ?`).run(dailyCoins, streak, userId);

  return { claimed: true, coins: dailyCoins, xp: dailyXp, streak, bonus };
}

// Helpers
function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function isYesterday(today, date) {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(yesterday, date);
}

function getNextMidnight() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

module.exports = {
  getOrCreateUser,
  getUser,
  addXp,
  calculateLevel,
  xpForLevel,
  xpNeededForNextLevel,
  updateCoins,
  incrementMessages,
  addVoiceMinutes,
  getLeaderboard,
  updateWaterStreak,
  setUserTitle,
  getUserTitles,
  unlockTitle,
  claimDaily
};
