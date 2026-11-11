// =============================================
// AI CHAT HISTORY — lịch sử hội thoại theo user + kênh
// =============================================

const { getDb } = require('../database');

const MAX_KEPT = 40;

function getHistory(userId, channelId, limit = 12) {
  return getDb().prepare(`
    SELECT role, content
    FROM ai_messages
    WHERE userId = ? AND channelId = ?
    ORDER BY id DESC
    LIMIT ?
  `).all(userId, channelId, limit).reverse();
}

function appendMessage(userId, channelId, role, content) {
  if (!userId || !channelId || !content) return;
  if (role !== 'user' && role !== 'assistant') return;

  const db = getDb();
  db.prepare(`
    INSERT INTO ai_messages (userId, channelId, role, content)
    VALUES (?, ?, ?, ?)
  `).run(userId, channelId, role, String(content).slice(0, 4000));

  // Giữ tối đa MAX_KEPT tin gần nhất cho mỗi cặp user + kênh.
  db.prepare(`
    DELETE FROM ai_messages
    WHERE userId = ? AND channelId = ?
      AND id NOT IN (
        SELECT id FROM ai_messages
        WHERE userId = ? AND channelId = ?
        ORDER BY id DESC
        LIMIT ?
      )
  `).run(userId, channelId, userId, channelId, MAX_KEPT);
}

function clearHistory(userId, channelId) {
  const result = getDb().prepare(`
    DELETE FROM ai_messages WHERE userId = ? AND channelId = ?
  `).run(userId, channelId);
  return result.changes || 0;
}

/** Đếm số tin USER gửi trong N phút gần nhất (dùng cho rate limit). */
function countRecent(userId, minutes = 60) {
  const row = getDb().prepare(`
    SELECT COUNT(*) AS n
    FROM ai_messages
    WHERE userId = ? AND role = 'user'
      AND createdAt >= datetime('now', ?)
  `).get(userId, `-${Math.max(1, Number(minutes) || 60)} minutes`);
  return row?.n || 0;
}

function countHistory(userId, channelId) {
  const row = getDb().prepare(`
    SELECT COUNT(*) AS n FROM ai_messages WHERE userId = ? AND channelId = ?
  `).get(userId, channelId);
  return row?.n || 0;
}

module.exports = {
  getHistory,
  appendMessage,
  clearHistory,
  countRecent,
  countHistory,
  MAX_KEPT
};
