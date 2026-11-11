// =============================================
// BATTLE / SHIP MODEL — thống kê rap battle & ghép đôi
// =============================================

const { getDb } = require('../database');

function recordBattle(userId, { won = false, bar = null } = {}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO battle_stats (userId, rapBattles, rapWins, rapLosses, bestBar)
    VALUES (?, 1, ?, ?, ?)
    ON CONFLICT(userId) DO UPDATE SET
      rapBattles = rapBattles + 1,
      rapWins = rapWins + excluded.rapWins,
      rapLosses = rapLosses + excluded.rapLosses,
      bestBar = COALESCE(excluded.bestBar, bestBar)
  `).run(userId, won ? 1 : 0, won ? 0 : 1, bar);
}

function getBattleStats(userId) {
  return getDb().prepare('SELECT * FROM battle_stats WHERE userId = ?').get(userId) || {
    userId, rapWins: 0, rapLosses: 0, rapBattles: 0, bestBar: null
  };
}

function getRapLeaderboard(limit = 10) {
  return getDb().prepare(`
    SELECT b.*, u.username
    FROM battle_stats b
    JOIN users u ON b.userId = u.userId
    WHERE b.rapBattles > 0
    ORDER BY b.rapWins DESC, b.rapBattles ASC
    LIMIT ?
  `).all(limit);
}

function saveShip(userId, targetId, score) {
  getDb().prepare(`
    INSERT INTO ship_history (userId, targetId, score) VALUES (?, ?, ?)
  `).run(userId, targetId, score);
}

function getTopShips(limit = 10) {
  return getDb().prepare(`
    SELECT s.*, u1.username as user1Name, u2.username as user2Name
    FROM ship_history s
    JOIN users u1 ON s.userId = u1.userId
    JOIN users u2 ON s.targetId = u2.userId
    ORDER BY s.score DESC, s.createdAt DESC
    LIMIT ?
  `).all(limit);
}

module.exports = { recordBattle, getBattleStats, getRapLeaderboard, saveShip, getTopShips };
