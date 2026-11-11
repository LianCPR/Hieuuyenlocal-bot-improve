// =============================================
// ACHIEVEMENTS MODEL - Hiểu Uyên Bot
// =============================================

const { getDb } = require('../database');
const { addXp, updateCoins } = require('./users');

/**
 * Lấy tất cả thành tựu đã unlock của user
 */
function getUserAchievements(userId) {
  return getDb().prepare(`
    SELECT a.*, ua.unlockedAt
    FROM achievements a
    JOIN user_achievements ua ON a.achievementId = ua.achievementId
    WHERE ua.userId = ?
    ORDER BY ua.unlockedAt DESC
  `).all(userId);
}

/**
 * Kiểm tra user đã có achievement chưa
 */
function hasAchievement(userId, achievementId) {
  const result = getDb().prepare(`
    SELECT 1 FROM user_achievements WHERE userId = ? AND achievementId = ?
  `).get(userId, achievementId);
  return !!result;
}

/**
 * Unlock achievement và trả về info để gửi notification
 * @returns {object|null} Achievement info nếu mới unlock, null nếu đã có
 */
function unlockAchievement(userId, achievementId) {
  const db = getDb();

  if (hasAchievement(userId, achievementId)) return null;

  const achievement = db.prepare('SELECT * FROM achievements WHERE achievementId = ?').get(achievementId);
  if (!achievement) return null;

  // Unlock
  db.prepare('INSERT OR IGNORE INTO user_achievements (userId, achievementId) VALUES (?, ?)').run(userId, achievementId);

  // Reward
  if (achievement.rewardXp > 0) addXp(userId, achievement.rewardXp);
  if (achievement.rewardCoins > 0) updateCoins(userId, achievement.rewardCoins);

  return achievement;
}

/**
 * Check all achievements cho user - tự động unlock nếu đủ điều kiện
 * @param {object} user - User object từ DB
 * @param {object} context - Context data (werewolf, quiz, etc.)
 * @returns {Array} Danh sách achievements mới unlock
 */
async function checkAllAchievements(user, context = {}) {
  const newAchievements = [];

  // Helper
  const tryUnlock = (id) => {
    const result = unlockAchievement(user.userId, id);
    if (result) newAchievements.push(result);
  };

  // Chat achievements
  if (user.totalMessages >= 1) tryUnlock('first_message');
  if (user.totalMessages >= 100) tryUnlock('chat_100');
  if (user.totalMessages >= 1000) tryUnlock('chat_1000');

  // Level achievements
  if (user.level >= 5) tryUnlock('level_5');
  if (user.level >= 10) tryUnlock('level_10');
  if (user.level >= 20) tryUnlock('level_20');
  if (user.level >= 50) tryUnlock('level_50');

  // Health achievements
  if (user.waterStreak >= 7) tryUnlock('water_7');
  if (user.waterStreak >= 30) tryUnlock('water_30');

  // Economy achievements
  if (user.coins >= 1000) tryUnlock('rich_1000');
  if (user.coins >= 10000) tryUnlock('rich_10000');

  // Werewolf achievements
  if (context.werewolf) {
    const wStats = getDb().prepare('SELECT * FROM werewolf_stats WHERE userId = ?').get(user.userId);
    if (wStats) {
      if (wStats.gamesWon >= 1) tryUnlock('wolf_win_1');
      if (wStats.gamesWon >= 5) tryUnlock('wolf_win_5');
      if (wStats.gamesWon >= 10) tryUnlock('wolf_win_10');
    }
  }

  // Quiz achievements
  if (context.quiz) {
    const qStats = getDb().prepare('SELECT * FROM quiz_stats WHERE userId = ?').get(user.userId);
    if (qStats) {
      if (qStats.correctCount >= 10) tryUnlock('quiz_10');
      if (qStats.bestStreak >= 5) tryUnlock('quiz_streak_5');
    }
  }

  // Mini-game achievements
  if (context.minigame) {
    const gameStats = getDb().prepare(`
      SELECT
        COALESCE(SUM(won), 0) AS won,
        COALESCE(SUM(profit), 0) AS profit
      FROM minigame_stats WHERE userId = ?
    `).get(user.userId);

    if (gameStats) {
      if (gameStats.won >= 1) tryUnlock('game_win_1');
      if (gameStats.won >= 10) tryUnlock('game_win_10');
      if (gameStats.won >= 50) tryUnlock('game_win_50');
      if (gameStats.won >= 100) tryUnlock('game_win_100');
      if (gameStats.profit >= 1000) tryUnlock('game_profit_1000');
      if (gameStats.profit >= 10000) tryUnlock('game_profit_10000');
    }
  }

  // Relationship achievement
  if (context.newRelationship) tryUnlock('relationship_1');

  return newAchievements;
}

/**
 * Lấy tất cả achievements (cho shop/list)
 */
function getAllAchievements() {
  return getDb().prepare('SELECT * FROM achievements ORDER BY category, achievementId').all();
}

/**
 * Đếm số achievements của user
 */
function countUserAchievements(userId) {
  const result = getDb().prepare('SELECT COUNT(*) as count FROM user_achievements WHERE userId = ?').get(userId);
  return result?.count || 0;
}

module.exports = {
  getUserAchievements,
  hasAchievement,
  unlockAchievement,
  checkAllAchievements,
  getAllAchievements,
  countUserAchievements
};
