// =============================================
// QUEST MODEL — tiến độ, nhận thưởng nhiệm vụ ngày
// =============================================

const { getDb } = require('../database');
const { addXp, updateCoins } = require('./users');
const { pickDailyQuests, questById } = require('../../data/quests');

const QUEST_TZ = 'Asia/Ho_Chi_Minh';

function todayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: QUEST_TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

/** Tạo 3 nhiệm vụ của hôm nay nếu chưa có */
function ensureDailyQuests(userId) {
  const db = getDb();
  const date = todayKey();
  const defs = pickDailyQuests(userId, date);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO daily_quests (userId, questDate, questId, questType, target)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const def of defs) insert.run(userId, date, def.id, def.type, def.target);
  return date;
}

/** Trả về 3 nhiệm vụ hôm nay kèm metadata để vẽ poster */
function getDailyQuests(userId) {
  const date = ensureDailyQuests(userId);
  const rows = getDb().prepare(`
    SELECT * FROM daily_quests
    WHERE userId = ? AND questDate = ?
    ORDER BY id ASC
  `).all(userId, date);

  return rows.map(row => {
    const def = questById(row.questId) || {};
    return {
      ...row,
      label: def.label || row.questId,
      short: def.short || 'QUEST',
      coins: def.coins || 0,
      xp: def.xp || 0,
      accent: def.accent || '#FF2D95'
    };
  });
}

/**
 * Cộng tiến độ cho mọi nhiệm vụ cùng loại (chưa nhận).
 * Gọi từ XP, quiz, gacha, daily, water, ship, rap.
 */
function progressQuest(userId, type, amount = 1) {
  if (!userId || !type) return 0;
  const date = ensureDailyQuests(userId);
  const result = getDb().prepare(`
    UPDATE daily_quests
    SET progress = MIN(target, progress + ?)
    WHERE userId = ? AND questDate = ? AND questType = ?
      AND claimed = 0 AND progress < target
  `).run(Math.max(1, amount), userId, date, type);
  return result.changes;
}

function getQuestSummary(userId) {
  const quests = getDailyQuests(userId);
  return {
    quests,
    total: quests.length,
    done: quests.filter(q => q.progress >= q.target).length,
    claimed: quests.filter(q => q.claimed).length,
    ready: quests.filter(q => !q.claimed && q.progress >= q.target).length
  };
}

function claimQuest(userId, questId) {
  const db = getDb();
  ensureDailyQuests(userId);
  const date = todayKey();

  const row = db.prepare(`
    SELECT * FROM daily_quests WHERE userId = ? AND questDate = ? AND questId = ?
  `).get(userId, date, questId);

  if (!row) {
    return { success: false, reason: 'missing', message: 'Nhiệm vụ này không có trong hôm nay.' };
  }
  if (row.claimed) {
    return { success: false, reason: 'claimed', message: 'Bạn nhận thưởng nhiệm vụ này rồi.' };
  }
  if (row.progress < row.target) {
    return {
      success: false,
      reason: 'progress',
      message: `Chưa hoàn thành: **${row.progress}/${row.target}**.`
    };
  }

  const def = questById(questId) || { label: questId, coins: 0, xp: 0, short: 'QUEST' };

  const tx = db.transaction(() => {
    db.prepare('UPDATE daily_quests SET claimed = 1 WHERE id = ?').run(row.id);
    if (def.coins) updateCoins(userId, def.coins);
    if (def.xp) addXp(userId, def.xp);
  });
  tx();

  return {
    success: true,
    quest: def,
    coins: def.coins || 0,
    xp: def.xp || 0
  };
}

function claimAllQuests(userId) {
  const summary = getQuestSummary(userId);
  const ready = summary.quests.filter(q => !q.claimed && q.progress >= q.target);

  const claimed = [];
  let coins = 0;
  let xp = 0;

  for (const quest of ready) {
    const result = claimQuest(userId, quest.questId);
    if (result.success) {
      claimed.push(result.quest);
      coins += result.coins;
      xp += result.xp;
    }
  }

  return { claimed, coins, xp };
}

module.exports = {
  todayKey,
  ensureDailyQuests,
  getDailyQuests,
  progressQuest,
  getQuestSummary,
  claimQuest,
  claimAllQuests
};
