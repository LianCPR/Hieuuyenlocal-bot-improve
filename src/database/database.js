// =============================================
// DATABASE.JS - Hiểu Uyên Bot
// SQLite database với better-sqlite3
// =============================================

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Đảm bảo thư mục data tồn tại (project/data)
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.join(dataDir, 'hieu-uyen.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db;

/**
 * Khởi tạo database connection
 */
function initDatabase() {
  db = new Database(DB_PATH, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : null
  });

  // Performance optimizations
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');

  createTables();
  seedDefaultData();

  console.log('✅ Database Hiểu Uyên đã sẵn sàng!');
  return db;
}

/**
 * Tạo toàn bộ bảng database
 */
function createTables() {
  db.exec(`
    -- =============================================
    -- USERS TABLE - Dữ liệu chính của thành viên
    -- =============================================
    CREATE TABLE IF NOT EXISTS users (
      userId      TEXT PRIMARY KEY,
      username    TEXT NOT NULL,
      
      xp          INTEGER DEFAULT 0,
      level       INTEGER DEFAULT 1,
      coins       INTEGER DEFAULT 0,
      
      title       TEXT DEFAULT 'Tập Sự',
      
      profileTheme  TEXT DEFAULT 'default',
      profileBorder TEXT DEFAULT 'none',
      profileBadge  TEXT DEFAULT 'none',
      
      waterStreak       INTEGER DEFAULT 0,
      lastWaterCheck    TEXT,
      healthPoints      INTEGER DEFAULT 0,
      
      totalMessages     INTEGER DEFAULT 0,
      totalVoiceMinutes INTEGER DEFAULT 0,
      
      lastDaily    TEXT,
      lastXpTime   TEXT,
      
      createdAt    TEXT DEFAULT (datetime('now'))
    );

    -- =============================================
    -- USER TITLES - Danh hiệu đã mở khóa
    -- =============================================
    CREATE TABLE IF NOT EXISTS user_titles (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      userId    TEXT NOT NULL,
      titleName TEXT NOT NULL,
      unlockedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(userId)
    );

    -- =============================================
    -- ACHIEVEMENTS - Định nghĩa thành tựu
    -- =============================================
    CREATE TABLE IF NOT EXISTS achievements (
      achievementId TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      description   TEXT NOT NULL,
      rewardXp      INTEGER DEFAULT 0,
      rewardCoins   INTEGER DEFAULT 0,
      badgeIcon     TEXT DEFAULT '🏅',
      category      TEXT DEFAULT 'general'
    );

    -- =============================================
    -- USER ACHIEVEMENTS - Thành tựu đã mở khóa
    -- =============================================
    CREATE TABLE IF NOT EXISTS user_achievements (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      userId        TEXT NOT NULL,
      achievementId TEXT NOT NULL,
      unlockedAt    TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(userId),
      FOREIGN KEY (achievementId) REFERENCES achievements(achievementId),
      UNIQUE(userId, achievementId)
    );

    -- =============================================
    -- RELATIONSHIPS - Hệ thống tri kỷ
    -- =============================================
    CREATE TABLE IF NOT EXISTS relationships (
      relationshipId  INTEGER PRIMARY KEY AUTOINCREMENT,
      userOneId       TEXT NOT NULL,
      userTwoId       TEXT NOT NULL,
      lovePoints      INTEGER DEFAULT 0,
      relationshipLevel INTEGER DEFAULT 1,
      sharedGames     INTEGER DEFAULT 0,
      interactionCount INTEGER DEFAULT 0,
      status          TEXT DEFAULT 'Friends',
      createdAt       TEXT DEFAULT (datetime('now')),
      UNIQUE(userOneId, userTwoId)
    );

    -- =============================================
    -- SERVER LOGS - Nhật ký server
    -- =============================================
    CREATE TABLE IF NOT EXISTS server_logs (
      messageId     TEXT PRIMARY KEY,
      authorId      TEXT NOT NULL,
      content       TEXT,
      attachments   TEXT DEFAULT '[]',
      reactionCount INTEGER DEFAULT 0,
      isPublished   INTEGER DEFAULT 0,
      loggedAt      TEXT DEFAULT (datetime('now'))
    );

    -- =============================================
    -- WEREWOLF STATS - Thống kê game ma sói
    -- =============================================
    CREATE TABLE IF NOT EXISTS werewolf_stats (
      userId          TEXT PRIMARY KEY,
      gamesPlayed     INTEGER DEFAULT 0,
      gamesWon        INTEGER DEFAULT 0,
      wolfWins        INTEGER DEFAULT 0,
      villagerWins    INTEGER DEFAULT 0,
      seerWins        INTEGER DEFAULT 0,
      protectorWins   INTEGER DEFAULT 0,
      totalKills      INTEGER DEFAULT 0,
      totalVotes      INTEGER DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users(userId)
    );

    -- =============================================
    -- INVENTORY - Vật phẩm người dùng
    -- =============================================
    CREATE TABLE IF NOT EXISTS inventory (
      inventoryId INTEGER PRIMARY KEY AUTOINCREMENT,
      userId      TEXT NOT NULL,
      itemId      TEXT NOT NULL,
      itemType    TEXT NOT NULL,
      equipped    INTEGER DEFAULT 0,
      obtainedAt  TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(userId)
    );

    -- =============================================
    -- SHOP ITEMS - Cửa hàng
    -- =============================================
    CREATE TABLE IF NOT EXISTS shop_items (
      itemId       TEXT PRIMARY KEY,
      itemName     TEXT NOT NULL,
      itemType     TEXT NOT NULL,
      price        INTEGER NOT NULL,
      rarity       TEXT DEFAULT 'common',
      previewImage TEXT,
      description  TEXT,
      isAvailable  INTEGER DEFAULT 1
    );

    -- =============================================
    -- QUIZ QUESTIONS - Câu hỏi quiz
    -- =============================================
    CREATE TABLE IF NOT EXISTS quiz_questions (
      questionId  INTEGER PRIMARY KEY AUTOINCREMENT,
      category    TEXT NOT NULL,
      question    TEXT NOT NULL,
      optionA     TEXT NOT NULL,
      optionB     TEXT NOT NULL,
      optionC     TEXT NOT NULL,
      optionD     TEXT NOT NULL,
      correct     TEXT NOT NULL,
      difficulty  TEXT DEFAULT 'medium'
    );

    -- =============================================
    -- QUIZ STATS - Thống kê quiz
    -- =============================================
    CREATE TABLE IF NOT EXISTS quiz_stats (
      userId        TEXT PRIMARY KEY,
      totalAnswered INTEGER DEFAULT 0,
      correctCount  INTEGER DEFAULT 0,
      streak        INTEGER DEFAULT 0,
      bestStreak    INTEGER DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users(userId)
    );

    -- =============================================
    -- GUILD SETTINGS - Cài đặt riêng cho từng server
    -- =============================================
    CREATE TABLE IF NOT EXISTS guild_settings (
      guildId           TEXT PRIMARY KEY,
      guildName         TEXT,
      logChannelId      TEXT,
      diaryChannelId    TEXT,
      healthChannelId   TEXT,
      welcomeChannelId  TEXT,
      joinedAt          TEXT DEFAULT (datetime('now'))
    );

    -- =============================================
    -- GACHA CARDS - Bộ sưu tập thẻ anime
    -- =============================================
    CREATE TABLE IF NOT EXISTS gacha_cards (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      userId    TEXT NOT NULL,
      cardId    TEXT NOT NULL,
      rarity    TEXT NOT NULL,
      count     INTEGER DEFAULT 1,
      firstAt   TEXT DEFAULT (datetime('now')),
      lastAt    TEXT DEFAULT (datetime('now')),
      UNIQUE(userId, cardId)
    );

    -- =============================================
    -- GACHA STATS - Lượt quay & bảo hiểm
    -- =============================================
    CREATE TABLE IF NOT EXISTS gacha_stats (
      userId    TEXT PRIMARY KEY,
      pulls     INTEGER DEFAULT 0,
      pitySR    INTEGER DEFAULT 0,
      pitySSR   INTEGER DEFAULT 0,
      bestRarity TEXT DEFAULT 'N'
    );

    -- =============================================
    -- BATTLE STATS - Rap battle
    -- =============================================
    CREATE TABLE IF NOT EXISTS battle_stats (
      userId     TEXT PRIMARY KEY,
      rapWins    INTEGER DEFAULT 0,
      rapLosses  INTEGER DEFAULT 0,
      rapBattles INTEGER DEFAULT 0,
      bestBar    TEXT
    );

    -- =============================================
    -- SHIP HISTORY - Lịch sử ghép đôi
    -- =============================================
    CREATE TABLE IF NOT EXISTS ship_history (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      userId    TEXT NOT NULL,
      targetId  TEXT NOT NULL,
      score     INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    -- =============================================
    -- DAILY QUESTS - nhiệm vụ mỗi ngày
    -- =============================================
    CREATE TABLE IF NOT EXISTS daily_quests (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      userId      TEXT NOT NULL,
      questDate   TEXT NOT NULL,
      questId     TEXT NOT NULL,
      questType   TEXT NOT NULL,
      target      INTEGER DEFAULT 1,
      progress    INTEGER DEFAULT 0,
      claimed     INTEGER DEFAULT 0,
      createdAt   TEXT DEFAULT (datetime('now')),
      UNIQUE(userId, questDate, questId)
    );

    -- Tạo indexes để tăng tốc query
    CREATE INDEX IF NOT EXISTS idx_users_level ON users(level DESC);
    CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);
    CREATE INDEX IF NOT EXISTS idx_users_coins ON users(coins DESC);
    CREATE INDEX IF NOT EXISTS idx_relationships_users ON relationships(userOneId, userTwoId);
    CREATE INDEX IF NOT EXISTS idx_server_logs_reactions ON server_logs(reactionCount DESC);
    CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(userId);
    CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(userId);
    CREATE INDEX IF NOT EXISTS idx_gacha_cards_user ON gacha_cards(userId);
    CREATE INDEX IF NOT EXISTS idx_gacha_cards_rarity ON gacha_cards(rarity);
    CREATE INDEX IF NOT EXISTS idx_ship_user ON ship_history(userId);
    CREATE INDEX IF NOT EXISTS idx_daily_quests_user ON daily_quests(userId, questDate);

    -- =============================================
    -- AI CHAT - lịch sử hội thoại với AI
    -- =============================================
    CREATE TABLE IF NOT EXISTS ai_messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      userId      TEXT NOT NULL,
      channelId   TEXT NOT NULL,
      role        TEXT NOT NULL,
      content     TEXT NOT NULL,
      createdAt   TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON ai_messages(userId, channelId, id);

    -- =============================================
    -- MINIGAME STATS - tài xỉu, oẳn tù tì, đoán số
    -- =============================================
    CREATE TABLE IF NOT EXISTS minigame_stats (
      userId    TEXT NOT NULL,
      game      TEXT NOT NULL,
      played    INTEGER DEFAULT 0,
      won       INTEGER DEFAULT 0,
      lost      INTEGER DEFAULT 0,
      tied      INTEGER DEFAULT 0,
      wagered   INTEGER DEFAULT 0,
      profit    INTEGER DEFAULT 0,
      bestWin   INTEGER DEFAULT 0,
      updatedAt TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (userId, game)
    );
    CREATE INDEX IF NOT EXISTS idx_minigame_stats_user ON minigame_stats(userId);
  `);

  migrateColumns();
}

/**
 * Thêm cột mới vào bảng cũ mà không mất dữ liệu
 */
function migrateColumns() {
  const addColumn = (table, column, ddl) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some(c => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    }
  };

  addColumn('users', 'dailyStreak', 'INTEGER DEFAULT 0');
  addColumn('users', 'nameColor', 'TEXT');
  addColumn('guild_settings', 'accentColor', 'TEXT');
}

/**
 * Seed dữ liệu mặc định
 */
function seedDefaultData() {
  // Seed achievements
  const achievements = [
    { id: 'first_message', name: 'Lần Đầu Lên Tiếng', desc: 'Gửi tin nhắn đầu tiên', xp: 50, coins: 20, icon: '💬', cat: 'chat' },
    { id: 'chat_100', name: 'Người Kể Chuyện', desc: 'Gửi 100 tin nhắn', xp: 100, coins: 50, icon: '📖', cat: 'chat' },
    { id: 'chat_1000', name: 'Linh Hồn Server', desc: 'Gửi 1000 tin nhắn', xp: 500, coins: 200, icon: '🌟', cat: 'chat' },
    { id: 'level_5', name: 'Đang Lớn Dần', desc: 'Đạt Level 5', xp: 100, coins: 100, icon: '🌱', cat: 'level' },
    { id: 'level_10', name: 'Người Quen Biết', desc: 'Đạt Level 10', xp: 200, coins: 200, icon: '🌿', cat: 'level' },
    { id: 'level_20', name: 'Cây Cổ Thụ', desc: 'Đạt Level 20', xp: 500, coins: 500, icon: '🌳', cat: 'level' },
    { id: 'level_50', name: 'Huyền Thoại', desc: 'Đạt Level 50', xp: 2000, coins: 2000, icon: '👑', cat: 'level' },
    { id: 'wolf_win_1', name: 'Sói Mới Vào Nghề', desc: 'Thắng 1 trận Ma Sói', xp: 100, coins: 50, icon: '🐺', cat: 'werewolf' },
    { id: 'wolf_win_5', name: 'Sói Già Bản Năng', desc: 'Thắng 5 trận Ma Sói', xp: 300, coins: 150, icon: '🌙', cat: 'werewolf' },
    { id: 'wolf_win_10', name: 'Chúa Sói', desc: 'Thắng 10 trận Ma Sói', xp: 800, coins: 400, icon: '🩸', cat: 'werewolf' },
    { id: 'water_7', name: 'Nguồn Nước Trong Lành', desc: 'Uống nước 7 ngày liên tiếp', xp: 200, coins: 100, icon: '💧', cat: 'health' },
    { id: 'water_30', name: 'Đại Dương Nội Tâm', desc: 'Uống nước 30 ngày liên tiếp', xp: 800, coins: 400, icon: '🌊', cat: 'health' },
    { id: 'quiz_10', name: 'Ham Học Hỏi', desc: 'Trả lời đúng 10 câu quiz', xp: 150, coins: 75, icon: '📚', cat: 'quiz' },
    { id: 'quiz_streak_5', name: 'Trí Tuệ Sắc Bén', desc: 'Streak 5 câu đúng liên tiếp', xp: 300, coins: 150, icon: '⚡', cat: 'quiz' },
    { id: 'relationship_1', name: 'Tìm Được Tri Kỷ', desc: 'Tạo mối quan hệ đầu tiên', xp: 100, coins: 50, icon: '💞', cat: 'social' },
    { id: 'rich_1000', name: 'Khởi Nghiệp', desc: 'Sở hữu 1000 coins', xp: 100, coins: 0, icon: '💰', cat: 'economy' },
    { id: 'rich_10000', name: 'Đại Gia Server', desc: 'Sở hữu 10000 coins', xp: 500, coins: 0, icon: '💎', cat: 'economy' },
    { id: 'gacha_first', name: 'Lần Đầu Quay', desc: 'Mở thẻ gacha đầu tiên', xp: 80, coins: 40, icon: '🎴', cat: 'gacha' },
    { id: 'gacha_10', name: 'Bộ Sưu Tập Sống', desc: 'Sở hữu 10 thẻ gacha khác nhau', xp: 250, coins: 120, icon: '📚', cat: 'gacha' },
    { id: 'gacha_ssr', name: 'Vận May Bùng Nổ', desc: 'Quay được thẻ SSR', xp: 400, coins: 200, icon: '💫', cat: 'gacha' },
    { id: 'gacha_ur', name: 'Được Banner Thương', desc: 'Quay được thẻ UR', xp: 1200, coins: 600, icon: '🌠', cat: 'gacha' },
    { id: 'rap_win_1', name: 'Bar Đầu Tay', desc: 'Thắng 1 trận rap battle', xp: 150, coins: 80, icon: '🎤', cat: 'social' },
    { id: 'rap_win_5', name: 'Chủ Sàn Battle', desc: 'Thắng 5 trận rap battle', xp: 500, coins: 250, icon: '🎧', cat: 'social' },
    { id: 'ship_soulmate', name: 'Định Mệnh 90%', desc: 'Ship ra kết quả từ 90% trở lên', xp: 200, coins: 100, icon: '💘', cat: 'social' },
    { id: 'sticker_maker', name: 'Sticker Chính Chủ', desc: 'Tạo sticker cá nhân đầu tiên', xp: 60, coins: 30, icon: '🖼️', cat: 'social' },
    { id: 'daily_7', name: 'Điểm Danh Siêng Năng', desc: 'Chuỗi daily 7 ngày', xp: 200, coins: 100, icon: '📅', cat: 'economy' },
    { id: 'daily_30', name: 'Kỷ Luật Thép', desc: 'Chuỗi daily 30 ngày', xp: 800, coins: 400, icon: '🗓️', cat: 'economy' },
    { id: 'game_win_1', name: 'Cược Đầu Tay', desc: 'Thắng ván mini-game đầu tiên', xp: 80, coins: 40, icon: '🎰', cat: 'minigame' },
    { id: 'game_win_10', name: 'Tay Chơi Thứ Thiệt', desc: 'Thắng 10 ván mini-game', xp: 250, coins: 120, icon: '🕹️', cat: 'minigame' },
    { id: 'game_win_50', name: 'Bá Chủ Sòng Bài', desc: 'Thắng 50 ván mini-game', xp: 700, coins: 350, icon: '👑', cat: 'minigame' },
    { id: 'game_win_100', name: 'Huyền Thoại Arcade', desc: 'Thắng 100 ván mini-game', xp: 1500, coins: 750, icon: '🌟', cat: 'minigame' },
    { id: 'game_profit_1000', name: 'Lãi Đậm', desc: 'Lãi 1.000 coin từ mini-game', xp: 200, coins: 100, icon: '📈', cat: 'minigame' },
    { id: 'game_profit_10000', name: 'Trùm Cuối Sòng Bài', desc: 'Lãi 10.000 coin từ mini-game', xp: 1000, coins: 500, icon: '💎', cat: 'minigame' },
  ];

  const insertAchievement = db.prepare(`
    INSERT OR IGNORE INTO achievements (achievementId, name, description, rewardXp, rewardCoins, badgeIcon, category)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const a of items) {
      insertAchievement.run(a.id, a.name, a.desc, a.xp, a.coins, a.icon, a.cat);
    }
  });
  insertMany(achievements);

  // Seed shop items
  const shopItems = [
    { id: 'border_pink', name: 'Viền Hồng Mộng Mơ', type: 'border', price: 500, rarity: 'common', desc: 'Viền màu hồng nhẹ nhàng' },
    { id: 'border_galaxy', name: 'Viền Thiên Hà', type: 'border', price: 1500, rarity: 'rare', desc: 'Viền gradient vũ trụ lung linh' },
    { id: 'border_animated_stars', name: 'Viền Sao Bay', type: 'border', price: 3000, rarity: 'epic', desc: 'Viền với animation sao lấp lánh' },
    { id: 'theme_sakura', name: 'Theme Hoa Anh Đào', type: 'theme', price: 800, rarity: 'uncommon', desc: 'Profile card phong cách Nhật Bản' },
    { id: 'theme_night', name: 'Theme Đêm Huyền Bí', type: 'theme', price: 1200, rarity: 'rare', desc: 'Profile card tối màu sang trọng' },
    { id: 'theme_ocean', name: 'Theme Đại Dương', type: 'theme', price: 1000, rarity: 'uncommon', desc: 'Profile card sóng biển xanh mát' },
    { id: 'badge_wolf', name: 'Huy Hiệu Sói Già', type: 'badge', price: 2000, rarity: 'rare', desc: 'Dành cho chiến thần Ma Sói' },
    { id: 'badge_scholar', name: 'Huy Hiệu Học Giả', type: 'badge', price: 2000, rarity: 'rare', desc: 'Dành cho người yêu tri thức' },
    { id: 'badge_health', name: 'Huy Hiệu Sức Khỏe', type: 'badge', price: 1500, rarity: 'uncommon', desc: 'Dành cho người chăm uống nước' },
    { id: 'name_color_gold', name: 'Tên Màu Vàng', type: 'namecolor', price: 5000, rarity: 'legendary', desc: 'Tên vàng rực rỡ trong leaderboard' },
    { id: 'border_neon', name: 'Viền Neon Downtown', type: 'border', price: 1200, rarity: 'uncommon', desc: 'Viền cyan phát sáng kiểu neon sign' },
    { id: 'border_graffiti', name: 'Viền Graffiti', type: 'border', price: 2400, rarity: 'epic', desc: 'Splat sơn và nét phun tường' },
    { id: 'theme_neon', name: 'Theme Neon City', type: 'theme', price: 1800, rarity: 'rare', desc: 'Thành phố neon, hồng và cyan' },
    { id: 'theme_hiphop', name: 'Theme Boom Bap', type: 'theme', price: 2600, rarity: 'epic', desc: 'Vàng gold, đỏ gạch, chất vinyl' },
    { id: 'theme_anime', name: 'Theme Anime Pop', type: 'theme', price: 2200, rarity: 'epic', desc: 'Pastel ngọt ngào như OP anime' },
    { id: 'theme_cyber', name: 'Theme Cyberpunk', type: 'theme', price: 3200, rarity: 'legendary', desc: 'Lime + cyan, vibe thành phố tương lai' },
    { id: 'badge_rap', name: 'Huy Hiệu Mic Vàng', type: 'badge', price: 2600, rarity: 'epic', desc: 'Dành cho chủ sàn battle' },
    { id: 'badge_gacha', name: 'Huy Hiệu Thẻ Bài', type: 'badge', price: 3000, rarity: 'epic', desc: 'Dành cho dân nghiện quay banner' },
    { id: 'namecolor_hot_pink', name: 'Tên Màu Hồng Neon', type: 'namecolor', price: 5200, rarity: 'legendary', desc: 'Tên hồng phát sáng trong bảng xếp hạng' },
  ];

  const insertShop = db.prepare(`
    INSERT OR IGNORE INTO shop_items (itemId, itemName, itemType, price, rarity, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertShopMany = db.transaction((items) => {
    for (const item of items) {
      insertShop.run(item.id, item.name, item.type, item.price, item.rarity, item.desc);
    }
  });
  insertShopMany(shopItems);

  // Seed quiz questions
  const questions = [
    { cat: 'general', q: 'Thủ đô của Việt Nam là gì?', a: 'Hà Nội', b: 'TP.HCM', c: 'Đà Nẵng', d: 'Huế', correct: 'A', diff: 'easy' },
    { cat: 'general', q: 'Sông dài nhất Việt Nam là?', a: 'Sông Hồng', b: 'Sông Mê Kông', c: 'Sông Đà', d: 'Sông Mã', correct: 'B', diff: 'medium' },
    { cat: 'history', q: 'Năm nào Việt Nam thống nhất đất nước?', a: '1973', b: '1974', c: '1975', d: '1976', correct: 'C', diff: 'easy' },
    { cat: 'history', q: 'Ai là vị vua đầu tiên của nhà Lý?', a: 'Lý Thái Tổ', b: 'Lý Thái Tông', c: 'Lý Nhân Tông', d: 'Lý Thánh Tông', correct: 'A', diff: 'medium' },
    { cat: 'literature', q: 'Tác giả của "Truyện Kiều" là ai?', a: 'Hồ Xuân Hương', b: 'Nguyễn Du', c: 'Nguyễn Trãi', d: 'Đoàn Thị Điểm', correct: 'B', diff: 'easy' },
    { cat: 'literature', q: '"Tắt đèn" là tác phẩm của ai?', a: 'Nam Cao', b: 'Tô Hoài', c: 'Ngô Tất Tố', d: 'Nguyễn Công Hoan', correct: 'C', diff: 'medium' },
    { cat: 'science', q: 'Công thức hóa học của nước là gì?', a: 'CO2', b: 'H2O', c: 'O2', d: 'NaCl', correct: 'B', diff: 'easy' },
    { cat: 'science', q: 'Tốc độ ánh sáng xấp xỉ bao nhiêu km/s?', a: '100,000', b: '200,000', c: '300,000', d: '400,000', correct: 'C', diff: 'medium' },
    { cat: 'fun', q: 'Con gì không bao giờ mệt?', a: 'Con suốt', b: 'Con đường', c: 'Con sông', d: 'Con mắt', correct: 'A', diff: 'easy' },
    { cat: 'fun', q: 'Cái gì càng cắt càng dài?', a: 'Cái tóc', b: 'Cái móng', c: 'Con đường', d: 'Cái lỗ', correct: 'C', diff: 'easy' },
    { cat: 'general', q: 'Hành tinh lớn nhất trong Hệ Mặt Trời là?', a: 'Sao Thổ', b: 'Sao Mộc', c: 'Sao Hải Vương', d: 'Trái Đất', correct: 'B', diff: 'easy' },
    { cat: 'general', q: 'Đại dương lớn nhất thế giới là?', a: 'Đại Tây Dương', b: 'Ấn Độ Dương', c: 'Thái Bình Dương', d: 'Bắc Băng Dương', correct: 'C', diff: 'easy' },
    { cat: 'general', q: 'Loài vật nào có thể ngủ khi đang đứng?', a: 'Ngựa', b: 'Mèo', c: 'Chó', d: 'Cá heo', correct: 'A', diff: 'medium' },
    { cat: 'science', q: 'Ký hiệu hóa học Fe là của nguyên tố nào?', a: 'Đồng', b: 'Sắt', c: 'Kẽm', d: 'Bạc', correct: 'B', diff: 'easy' },
    { cat: 'science', q: 'Một năm trên Sao Hỏa dài khoảng bao nhiêu ngày Trái Đất?', a: '365', b: '450', c: '687', d: '900', correct: 'C', diff: 'hard' },
    { cat: 'science', q: 'Bộ phận nào của tế bào chứa ADN?', a: 'Màng tế bào', b: 'Nhân', c: 'Ribosome', d: 'Không bào', correct: 'B', diff: 'medium' },
    { cat: 'history', q: 'Chiến tranh thế giới thứ hai kết thúc vào năm nào?', a: '1943', b: '1944', c: '1945', d: '1946', correct: 'C', diff: 'easy' },
    { cat: 'history', q: 'Kim tự tháp Giza nằm ở quốc gia nào?', a: 'Mexico', b: 'Ai Cập', c: 'Peru', d: 'Hy Lạp', correct: 'B', diff: 'easy' },
    { cat: 'history', q: 'Thành phố nào từng là thủ đô của nhà Nguyễn?', a: 'Hà Nội', b: 'Huế', c: 'Sài Gòn', d: 'Hội An', correct: 'B', diff: 'medium' },
    { cat: 'literature', q: 'Tác giả bộ truyện "Harry Potter" là ai?', a: 'J.R.R. Tolkien', b: 'J.K. Rowling', c: 'Roald Dahl', d: 'Rick Riordan', correct: 'B', diff: 'easy' },
    { cat: 'literature', q: '"Dế Mèn Phiêu Lưu Ký" là tác phẩm của ai?', a: 'Tô Hoài', b: 'Nam Cao', c: 'Vũ Trọng Phụng', d: 'Nguyên Hồng', correct: 'A', diff: 'medium' },
    { cat: 'anime', q: 'Nhân vật chính trong "Naruto" mơ ước trở thành gì?', a: 'Hokage', b: 'Anbu', c: 'Jonin', d: 'Kazekage', correct: 'A', diff: 'easy' },
    { cat: 'anime', q: 'Luffy trong "One Piece" sở hữu trái ác quỷ nào?', a: 'Mera Mera', b: 'Gomu Gomu', c: 'Bara Bara', d: 'Yami Yami', correct: 'B', diff: 'medium' },
    { cat: 'anime', q: 'Studio Ghibli đứng sau bộ phim nào?', a: 'Your Name', b: 'Spirited Away', c: 'Akira', d: 'Weathering With You', correct: 'B', diff: 'easy' },
    { cat: 'anime', q: 'Trong "Attack on Titan", bức tường ngoài cùng tên là gì?', a: 'Wall Rose', b: 'Wall Sina', c: 'Wall Maria', d: 'Wall Eldia', correct: 'C', diff: 'medium' },
    { cat: 'anime', q: '"Your Name" được đạo diễn bởi ai?', a: 'Hayao Miyazaki', b: 'Makoto Shinkai', c: 'Mamoru Hosoda', d: 'Satoshi Kon', correct: 'B', diff: 'medium' },
    { cat: 'anime', q: 'Trong "Jujutsu Kaisen", Itadori nuốt ngón tay của ai?', a: 'Sukuna', b: 'Gojo', c: 'Megumi', d: 'Toji', correct: 'A', diff: 'easy' },
    { cat: 'anime', q: 'Nobita trong "Doraemon" nổi tiếng vì điểm 0 môn nào?', a: 'Vẽ', b: 'Toán', c: 'Thể dục', d: 'Âm nhạc', correct: 'B', diff: 'easy' },
    { cat: 'music', q: 'Hip hop có nguồn gốc từ khu vực nào của New York?', a: 'Bronx', b: 'Brooklyn', c: 'Queens', d: 'Harlem', correct: 'A', diff: 'medium' },
    { cat: 'music', q: 'Album "The Marshall Mathers LP" là của nghệ sĩ nào?', a: 'Jay-Z', b: 'Eminem', c: 'Nas', d: '50 Cent', correct: 'B', diff: 'medium' },
    { cat: 'music', q: 'Nghệ sĩ hip hop đầu tiên đoạt giải Pulitzer cho Âm nhạc là ai?', a: 'Kendrick Lamar', b: 'Drake', c: 'Kanye West', d: 'J. Cole', correct: 'A', diff: 'hard' },
    { cat: 'music', q: 'Nhóm nhạc BTS debut vào năm nào?', a: '2010', b: '2011', c: '2013', d: '2016', correct: 'C', diff: 'medium' },
    { cat: 'music', q: 'BLACKPINK ra mắt vào năm nào?', a: '2014', b: '2015', c: '2016', d: '2017', correct: 'C', diff: 'medium' },
  ];

  const insertQuiz = db.prepare(`
    INSERT OR IGNORE INTO quiz_questions (category, question, optionA, optionB, optionC, optionD, correct, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQuizMany = db.transaction((qs) => {
    for (const q of qs) {
      insertQuiz.run(q.cat, q.q, q.a, q.b, q.c, q.d, q.correct, q.diff);
    }
  });
  insertQuizMany(questions);
}

/**
 * Lấy database instance
 */
function getDb() {
  if (!db) throw new Error('Database chưa được khởi tạo!');
  return db;
}

module.exports = { initDatabase, getDb };
