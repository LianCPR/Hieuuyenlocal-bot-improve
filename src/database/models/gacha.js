// =============================================
// GACHA MODEL — quay thẻ, bộ sưu tập, bảo hiểm
// =============================================

const { getDb } = require('../database');
const { updateCoins } = require('./users');
const { unlockAchievement } = require('./achievements');
const {
  CARDS, cardById, rollRarity, randomCard, REFUND,
  PULL_COST, MULTI_COST, RARITY_ORDER, rarityRank, isAtLeast
} = require('../../data/cards');

function getOrCreateStats(userId) {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO gacha_stats (userId) VALUES (?)').run(userId);
  return db.prepare('SELECT * FROM gacha_stats WHERE userId = ?').get(userId);
}

function bestRarityOf(userId) {
  const rows = getDb().prepare('SELECT DISTINCT rarity FROM gacha_cards WHERE userId = ?').all(userId);
  return rows.reduce((best, r) => (rarityRank(r.rarity) > rarityRank(best) ? r.rarity : best), 'N');
}

function getUserCards(userId) {
  const rows = getDb().prepare(`
    SELECT * FROM gacha_cards WHERE userId = ? ORDER BY count DESC, firstAt ASC
  `).all(userId);

  return rows
    .map(row => ({ ...row, card: cardById(row.cardId) }))
    .filter(row => row.card)
    .sort((a, b) => rarityRank(b.card.rarity) - rarityRank(a.card.rarity));
}

function getCollectionSummary(userId) {
  const rows = getUserCards(userId);
  const byRarity = { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 };
  let total = 0;
  for (const row of rows) {
    byRarity[row.card.rarity] = (byRarity[row.card.rarity] || 0) + 1;
    total += row.count || 1;
  }
  return {
    unique: rows.length,
    total,
    byRarity,
    all: CARDS.length,
    completion: Math.round((rows.length / CARDS.length) * 100)
  };
}

/**
 * Quay thẻ.
 * @param {string} userId
 * @param {{count?:number}} opts
 */
function pull(userId, { count = 1 } = {}) {
  const db = getDb();
  const user = db.prepare('SELECT coins FROM users WHERE userId = ?').get(userId);
  if (!user) return { success: false, message: 'Chưa có dữ liệu người chơi!' };

  const multi = count >= 10;
  const cost = multi ? MULTI_COST : PULL_COST * count;

  if (user.coins < cost) {
    return {
      success: false,
      message: `Không đủ coins! Cần **${cost.toLocaleString('vi-VN')}**, bạn có **${user.coins.toLocaleString('vi-VN')}**.`
    };
  }

  const stats = getOrCreateStats(userId);
  let pitySR = stats.pitySR || 0;
  let pitySSR = stats.pitySSR || 0;

  const results = [];
  const newlyUnlocked = [];

  const tx = db.transaction(() => {
    updateCoins(userId, -cost);

    for (let i = 0; i < count; i++) {
      let rarity = rollRarity({ pitySR, pitySSR });

      // Bảo hiểm: multi pull luôn có ít nhất 1 SR+
      if (multi && i === count - 1 && rarityRank(rarity) < rarityRank('SR')) {
        rarity = Math.random() < 0.15 ? 'SSR' : 'SR';
      }

      const card = randomCard(rarity);
      const existing = db.prepare('SELECT * FROM gacha_cards WHERE userId = ? AND cardId = ?')
        .get(userId, card.id);

      let refund = 0;
      if (existing) {
        refund = REFUND[rarity] || 0;
        db.prepare("UPDATE gacha_cards SET count = count + 1, lastAt = datetime('now') WHERE id = ?")
          .run(existing.id);
        if (refund) updateCoins(userId, refund);
      } else {
        db.prepare(`
          INSERT INTO gacha_cards (userId, cardId, rarity)
          VALUES (?, ?, ?)
        `).run(userId, card.id, rarity);
      }

      pitySR = isAtLeast(rarity, 'SR') ? 0 : pitySR + 1;
      pitySSR = isAtLeast(rarity, 'SSR') ? 0 : pitySSR + 1;

      results.push({ card, isNew: !existing, refund });
    }

    db.prepare(`
      UPDATE gacha_stats SET
        pulls = pulls + ?,
        pitySR = ?,
        pitySSR = ?,
        bestRarity = ?
      WHERE userId = ?
    `).run(count, pitySR, pitySSR, bestRarityOf(userId), userId);
  });

  tx();

  // Achievements
  const summary = getCollectionSummary(userId);
  const tryUnlock = (id) => {
    const unlocked = unlockAchievement(userId, id);
    if (unlocked) newlyUnlocked.push(unlocked);
  };

  tryUnlock('gacha_first');
  if (summary.unique >= 10) tryUnlock('gacha_10');
  if (summary.byRarity.SSR > 0 || summary.byRarity.UR > 0) tryUnlock('gacha_ssr');
  if (summary.byRarity.UR > 0) tryUnlock('gacha_ur');

  const best = results.reduce((top, r) =>
    rarityRank(r.card.rarity) > rarityRank(top.card.rarity) ? r : top, results[0]);

  const updated = db.prepare('SELECT coins FROM users WHERE userId = ?').get(userId);

  return {
    success: true,
    results,
    best,
    cost,
    coins: updated?.coins || 0,
    summary,
    newlyUnlocked,
    pity: { sr: PITY_PREVIEW(pitySR), ssr: PITY_PREVIEW(pitySSR) }
  };
}

// hiển thị số pull còn lại tới bảo hiểm
function PITY_PREVIEW(value) { return value; }

function getTopCollectors(limit = 10) {
  return getDb().prepare(`
    SELECT u.userId, u.username,
      COUNT(g.cardId) as uniqueCards,
      SUM(g.count) as totalCards,
      SUM(CASE WHEN g.rarity IN ('SSR','UR') THEN 1 ELSE 0 END) as rareCards
    FROM gacha_cards g
    JOIN users u ON g.userId = u.userId
    GROUP BY g.userId
    ORDER BY uniqueCards DESC, rareCards DESC
    LIMIT ?
  `).all(limit);
}

function getGlobalCardCount() {
  return getDb().prepare('SELECT COUNT(*) as c FROM gacha_cards').get().c || 0;
}

function getCardOwners(cardId, limit = 5) {
  return getDb().prepare(`
    SELECT u.username, g.count, g.firstAt
    FROM gacha_cards g JOIN users u ON g.userId = u.userId
    WHERE g.cardId = ?
    ORDER BY g.firstAt ASC
    LIMIT ?
  `).all(cardId, limit);
}

module.exports = {
  getOrCreateStats,
  getUserCards,
  getCollectionSummary,
  pull,
  getTopCollectors,
  getGlobalCardCount,
  getCardOwners,
  CARDS,
  PULL_COST,
  MULTI_COST
};
