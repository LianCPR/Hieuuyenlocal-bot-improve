// =============================================
// WEB SERVER — Hiểu Uyên Dashboard API
// =============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

function createWebServer(discordClient) {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { success: false, error: 'Too many requests' }
  });
  app.use('/api/', limiter);

  app.use('/api', createApiRouter(discordClient));

  app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  return app;
}

function createApiRouter(client) {
  const router = express.Router();

  const safe = (fn) => (req, res) => {
    try {
      const data = fn(req, res);
      if (data !== undefined) res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('API error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  };

  const { getLeaderboard, getUser } = require('../src/database/models/users');
  const { getRelationshipLeaderboard } = require('../src/database/models/relationships');
  const { getUserAchievements } = require('../src/database/models/achievements');
  const { getDb } = require('../src/database/database');

  // GET /api/leaderboard?type=xp&limit=15
  router.get('/leaderboard', safe(req => {
    const type = req.query.type || 'xp';
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    return getLeaderboard(type, limit);
  }));

  // GET /api/profile/:userId
  router.get('/profile/:userId', (req, res) => {
    try {
      const user = getUser(req.params.userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      res.json({ success: true, data: { ...user, achievements: getUserAchievements(req.params.userId) } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/relationships?limit=12
  router.get('/relationships', safe(req => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    return getRelationshipLeaderboard(limit);
  }));

  // GET /api/logs?limit=9
  router.get('/logs', safe(req => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    return getDb().prepare(`
      SELECT l.*, u.username
      FROM server_logs l
      LEFT JOIN users u ON l.authorId = u.userId
      ORDER BY l.reactionCount DESC
      LIMIT ?
    `).all(limit);
  }));

  // GET /api/gacha/top
  router.get('/gacha/top', safe(req => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);
    return require('../src/database/models/gacha').getTopCollectors(limit);
  }));

  // GET /api/rap/top
  router.get('/rap/top', safe(req => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);
    return require('../src/database/models/battles').getRapLeaderboard(limit);
  }));

  // GET /api/ships/top
  router.get('/ships/top', safe(req => {
    const limit = Math.min(parseInt(req.query.limit) || 8, 30);
    return require('../src/database/models/battles').getTopShips(limit);
  }));

  // GET /api/stats
  router.get('/stats', (req, res) => {
    try {
      const db = getDb();
      const stats = {
        totalUsers: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
        totalMessages: db.prepare('SELECT SUM(totalMessages) as c FROM users').get().c || 0,
        totalGames: db.prepare('SELECT SUM(gamesPlayed) as c FROM werewolf_stats').get().c || 0,
        topLevel: db.prepare('SELECT MAX(level) as c FROM users').get().c || 0,
        totalCards: db.prepare('SELECT COUNT(*) as c FROM gacha_cards').get().c || 0,
        totalShips: db.prepare('SELECT COUNT(*) as c FROM ship_history').get().c || 0,
        activeGuild: client?.guilds?.cache?.size || 0
      };
      res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/users?page=1&limit=20
  router.get('/users', safe(req => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const data = db.prepare(`
      SELECT userId, username, level, xp, coins, title, totalMessages, waterStreak
      FROM users ORDER BY xp DESC LIMIT ? OFFSET ?
    `).all(limit, (page - 1) * limit);
    return { data, total, page, limit };
  }));

  return router;
}

// Chạy riêng để xem dashboard: npm run web
if (require.main === module) {
  require('dotenv').config();
  const { initDatabase } = require('../src/database/database');
  initDatabase();

  const port = process.env.WEB_PORT || 3000;
  createWebServer(null).listen(port, () => {
    console.log(`🌐 Dashboard: http://localhost:${port}`);
  });
}

module.exports = { createWebServer };
