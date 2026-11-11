// =============================================
// MINIGAME STATS — thắng/thua/lãi lỗ theo user
// =============================================

const { getDb } = require('../database');

const EMPTY = {
  played: 0,
  won: 0,
  lost: 0,
  tied: 0,
  wagered: 0,
  profit: 0,
  bestWin: 0
};

function getStats(userId, game) {
  const row = getDb().prepare(`
    SELECT played, won, lost, tied, wagered, profit, bestWin
    FROM minigame_stats WHERE userId = ? AND game = ?
  `).get(userId, game);

  return row ? { ...EMPTY, ...row } : { ...EMPTY };
}

function recordGame(userId, game, { bet = 0, net = 0, result = 'lose' } = {}) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM minigame_stats WHERE userId = ? AND game = ?').get(userId, game);

  const won = result === 'win' ? 1 : 0;
  const lost = result === 'lose' ? 1 : 0;
  const tied = result === 'tie' ? 1 : 0;
  const bestWin = Math.max(0, Number(net) || 0);

  if (row) {
    db.prepare(`
      UPDATE minigame_stats
      SET played = played + 1,
          won = won + ?,
          lost = lost + ?,
          tied = tied + ?,
          wagered = wagered + ?,
          profit = profit + ?,
          bestWin = MAX(bestWin, ?),
          updatedAt = datetime('now')
      WHERE userId = ? AND game = ?
    `).run(won, lost, tied, bet, net, bestWin, userId, game);
  } else {
    db.prepare(`
      INSERT INTO minigame_stats
        (userId, game, played, won, lost, tied, wagered, profit, bestWin, updatedAt)
      VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(userId, game, won, lost, tied, bet, net, bestWin);
  }

  return getStats(userId, game);
}

function getLeaderboard({ game = 'all', sort = 'wins', limit = 10 } = {}) {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  const order = sort === 'profit'
    ? 'profit DESC, won DESC, played ASC'
    : 'won DESC, profit DESC, played ASC';
  const filter = game && game !== 'all' ? 'WHERE m.game = ?' : '';
  const params = filter ? [game, safeLimit] : [safeLimit];

  const rows = getDb().prepare(`
    SELECT
      m.userId,
      COALESCE(u.username, 'Người chơi ẩn danh') AS username,
      COALESCE(SUM(m.played), 0) AS played,
      COALESCE(SUM(m.won), 0) AS won,
      COALESCE(SUM(m.lost), 0) AS lost,
      COALESCE(SUM(m.tied), 0) AS tied,
      COALESCE(SUM(m.wagered), 0) AS wagered,
      COALESCE(SUM(m.profit), 0) AS profit,
      COALESCE(MAX(m.bestWin), 0) AS bestWin
    FROM minigame_stats m
    LEFT JOIN users u ON u.userId = m.userId
    ${filter}
    GROUP BY m.userId
    HAVING SUM(m.played) > 0
    ORDER BY ${order}
    LIMIT ?
  `).all(...params);

  return rows.map(row => ({
    ...row,
    winRate: row.played > 0 ? row.won / row.played : 0
  }));
}

function getSummary(userId) {
  const row = getDb().prepare(`
    SELECT
      COALESCE(SUM(played), 0) AS played,
      COALESCE(SUM(won), 0) AS won,
      COALESCE(SUM(lost), 0) AS lost,
      COALESCE(SUM(tied), 0) AS tied,
      COALESCE(SUM(wagered), 0) AS wagered,
      COALESCE(SUM(profit), 0) AS profit,
      COALESCE(MAX(bestWin), 0) AS bestWin
    FROM minigame_stats WHERE userId = ?
  `).get(userId);

  return { ...EMPTY, ...(row || {}) };
}

module.exports = { getStats, recordGame, getSummary, getLeaderboard, EMPTY };
