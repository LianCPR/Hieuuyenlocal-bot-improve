// =============================================
// ECONOMY MODEL - Shop & Inventory
// =============================================

const { getDb } = require('../database');
const { updateCoins } = require('./users');

/**
 * Lấy tất cả items trong shop theo category
 */
function getShopItems(type = null) {
  const db = getDb();
  if (type) {
    return db.prepare('SELECT * FROM shop_items WHERE isAvailable = 1 AND itemType = ? ORDER BY price ASC').all(type);
  }
  return db.prepare('SELECT * FROM shop_items WHERE isAvailable = 1 ORDER BY itemType, price ASC').all();
}

/**
 * Lấy một item cụ thể
 */
function getShopItem(itemId) {
  return getDb().prepare('SELECT * FROM shop_items WHERE itemId = ?').get(itemId);
}

/**
 * Mua item - kiểm tra đủ coins và chưa có
 * @returns {{ success, message, item }}
 */
function purchaseItem(userId, itemId) {
  const db = getDb();

  const item = getShopItem(itemId);
  if (!item) return { success: false, message: 'Vật phẩm không tồn tại trong shop ✨' };

  // Kiểm tra đã có chưa
  const owned = db.prepare('SELECT * FROM inventory WHERE userId = ? AND itemId = ?').get(userId, itemId);
  if (owned) return { success: false, message: 'Bạn đã sở hữu vật phẩm này rồi nè 💫' };

  // Kiểm tra đủ coins
  const user = db.prepare('SELECT coins FROM users WHERE userId = ?').get(userId);
  if (!user || user.coins < item.price) {
    return { success: false, message: `Không đủ coins! Bạn cần ${item.price} coins 💰` };
  }

  // Transaction: trừ coins + thêm inventory
  const buy = db.transaction(() => {
    updateCoins(userId, -item.price);
    db.prepare(`
      INSERT INTO inventory (userId, itemId, itemType, obtainedAt)
      VALUES (?, ?, ?, datetime('now'))
    `).run(userId, item.itemId, item.itemType);
  });

  buy();
  return { success: true, message: `Đã mua **${item.itemName}** thành công! 🎉`, item };
}

/**
 * Equip/trang bị item
 */
function equipItem(userId, inventoryId) {
  const db = getDb();

  const item = db.prepare('SELECT * FROM inventory WHERE inventoryId = ? AND userId = ?').get(inventoryId, userId);
  if (!item) return { success: false, message: 'Vật phẩm không thuộc về bạn!' };

  // Unequip các item cùng loại
  db.prepare('UPDATE inventory SET equipped = 0 WHERE userId = ? AND itemType = ?').run(userId, item.itemType);

  // Equip item mới
  db.prepare('UPDATE inventory SET equipped = 1 WHERE inventoryId = ?').run(inventoryId);

  // Cập nhật profile user
  const fieldMap = {
    border: 'profileBorder',
    theme: 'profileTheme',
    badge: 'profileBadge',
    namecolor: 'nameColor'
  };

  if (fieldMap[item.itemType]) {
    db.prepare(`UPDATE users SET ${fieldMap[item.itemType]} = ? WHERE userId = ?`).run(item.itemId, userId);
  }

  return { success: true, message: 'Đã trang bị vật phẩm! ✨' };
}

/**
 * Lấy inventory của user
 */
function getUserInventory(userId, type = null) {
  const db = getDb();
  if (type) {
    return db.prepare(`
      SELECT i.*, s.itemName, s.rarity, s.description
      FROM inventory i
      JOIN shop_items s ON i.itemId = s.itemId
      WHERE i.userId = ? AND i.itemType = ?
      ORDER BY i.obtainedAt DESC
    `).all(userId, type);
  }

  return db.prepare(`
    SELECT i.*, s.itemName, s.rarity, s.description
    FROM inventory i
    JOIN shop_items s ON i.itemId = s.itemId
    WHERE i.userId = ?
    ORDER BY i.itemType, i.obtainedAt DESC
  `).all(userId);
}

const RARITY_COLORS = {
  common: 0x9E9E9E,
  uncommon: 0x4CAF50,
  rare: 0x2196F3,
  epic: 0x9C27B0,
  legendary: 0xFF9800
};

const RARITY_EMOJI = {
  common: '⬜',
  uncommon: '🟩',
  rare: '🟦',
  epic: '🟪',
  legendary: '🟧'
};

module.exports = {
  getShopItems,
  getShopItem,
  purchaseItem,
  equipItem,
  getUserInventory,
  RARITY_COLORS,
  RARITY_EMOJI
};
