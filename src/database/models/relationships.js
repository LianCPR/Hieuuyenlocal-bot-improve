// =============================================
// RELATIONSHIPS MODEL - Hệ thống Tri Kỷ
// =============================================

const { getDb } = require('../database');

/**
 * Lấy hoặc tạo mối quan hệ giữa 2 người
 * Đảm bảo userOneId < userTwoId để tránh duplicate
 */
function getOrCreateRelationship(userOneId, userTwoId) {
  const db = getDb();

  // Sắp xếp để đảm bảo unique pair
  const [uid1, uid2] = [userOneId, userTwoId].sort();

  const existing = db.prepare(`
    SELECT * FROM relationships WHERE userOneId = ? AND userTwoId = ?
  `).get(uid1, uid2);

  if (existing) return existing;

  db.prepare(`
    INSERT INTO relationships (userOneId, userTwoId, createdAt)
    VALUES (?, ?, datetime('now'))
  `).run(uid1, uid2);

  return db.prepare(`
    SELECT * FROM relationships WHERE userOneId = ? AND userTwoId = ?
  `).get(uid1, uid2);
}

/**
 * Thêm điểm tình cảm
 */
function addLovePoints(userOneId, userTwoId, points) {
  const db = getDb();
  const [uid1, uid2] = [userOneId, userTwoId].sort();

  db.prepare(`
    UPDATE relationships 
    SET lovePoints = lovePoints + ?,
        interactionCount = interactionCount + 1
    WHERE userOneId = ? AND userTwoId = ?
  `).run(points, uid1, uid2);

  // Update relationship level
  const rel = db.prepare('SELECT * FROM relationships WHERE userOneId = ? AND userTwoId = ?').get(uid1, uid2);
  if (rel) {
    const newLevel = calculateRelationshipLevel(rel.lovePoints);
    if (newLevel !== rel.relationshipLevel) {
      db.prepare('UPDATE relationships SET relationshipLevel = ? WHERE userOneId = ? AND userTwoId = ?')
        .run(newLevel, uid1, uid2);
    }
  }

  return rel;
}

/**
 * Tính level mối quan hệ từ điểm
 */
function calculateRelationshipLevel(points) {
  if (points >= 10000) return 5; // Tri Kỷ Tuyệt Vời
  if (points >= 5000) return 4;  // Đôi Tri Kỷ
  if (points >= 2000) return 3;  // Người Quen Thân
  if (points >= 500) return 2;   // Bạn Bè
  return 1;                       // Người Lạ
}

const RELATIONSHIP_LEVELS = {
  1: { name: 'Người Lạ Quen Mặt', emoji: '👋' },
  2: { name: 'Người Bạn', emoji: '🤝' },
  3: { name: 'Bạn Thân', emoji: '😊' },
  4: { name: 'Đôi Tri Kỷ', emoji: '💫' },
  5: { name: 'Tri Kỷ Tuyệt Vời', emoji: '💞' }
};

/**
 * Lấy thông tin mối quan hệ giữa 2 người
 */
function getRelationship(userOneId, userTwoId) {
  const [uid1, uid2] = [userOneId, userTwoId].sort();
  return getDb().prepare(`
    SELECT r.*, 
      u1.username as user1Name, 
      u2.username as user2Name
    FROM relationships r
    JOIN users u1 ON r.userOneId = u1.userId
    JOIN users u2 ON r.userTwoId = u2.userId
    WHERE r.userOneId = ? AND r.userTwoId = ?
  `).get(uid1, uid2);
}

/**
 * Lấy tất cả mối quan hệ của một user
 */
function getUserRelationships(userId) {
  return getDb().prepare(`
    SELECT r.*,
      CASE WHEN r.userOneId = ? THEN u2.username ELSE u1.username END as partnerName,
      CASE WHEN r.userOneId = ? THEN r.userTwoId ELSE r.userOneId END as partnerId
    FROM relationships r
    JOIN users u1 ON r.userOneId = u1.userId
    JOIN users u2 ON r.userTwoId = u2.userId
    WHERE r.userOneId = ? OR r.userTwoId = ?
    ORDER BY r.lovePoints DESC
    LIMIT 10
  `).all(userId, userId, userId, userId);
}

/**
 * Top relationships leaderboard
 */
function getRelationshipLeaderboard(limit = 10) {
  return getDb().prepare(`
    SELECT r.*,
      u1.username as user1Name,
      u2.username as user2Name
    FROM relationships r
    JOIN users u1 ON r.userOneId = u1.userId
    JOIN users u2 ON r.userTwoId = u2.userId
    ORDER BY r.lovePoints DESC
    LIMIT ?
  `).all(limit);
}

/**
 * Track game chung
 */
function trackSharedGame(userOneId, userTwoId) {
  const [uid1, uid2] = [userOneId, userTwoId].sort();
  getDb().prepare(`
    UPDATE relationships 
    SET sharedGames = sharedGames + 1
    WHERE userOneId = ? AND userTwoId = ?
  `).run(uid1, uid2);
}

module.exports = {
  getOrCreateRelationship,
  addLovePoints,
  calculateRelationshipLevel,
  RELATIONSHIP_LEVELS,
  getRelationship,
  getUserRelationships,
  getRelationshipLeaderboard,
  trackSharedGame
};
