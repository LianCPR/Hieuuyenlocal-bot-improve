// =============================================
// UTILS - Hiểu Uyên Bot
// Các helper function dùng chung
// =============================================

// ── Cooldown Manager ──────────────────────────
class CooldownManager {
  constructor() {
    this.map = new Map();
    // Tự dọn cache mỗi 10 phút
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  /**
   * Kiểm tra cooldown
   * @param {string} key   - unique key (userId-action)
   * @param {number} ms    - cooldown ms
   * @returns {number|null} thời gian còn lại (ms), null nếu không cooldown
   */
  check(key, ms) {
    const last = this.map.get(key);
    if (!last) return null;
    const elapsed = Date.now() - last;
    if (elapsed < ms) return ms - elapsed;
    return null;
  }

  /** Set cooldown */
  set(key) {
    this.map.set(key, Date.now());
  }

  /** Xóa cooldown của key */
  clear(key) {
    this.map.delete(key);
  }

  cleanup() {
    const threshold = Date.now() - 30 * 60 * 1000;
    for (const [k, t] of this.map) {
      if (t < threshold) this.map.delete(k);
    }
  }
}

// ── Format Helpers ────────────────────────────

/** Format số lớn */
const fmtNum = n => {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString('vi-VN');
};

/** Format thời gian còn lại */
const fmtTime = ms => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
};

/** Tạo progress bar text */
const progressBar = (current, max, length = 12) => {
  const pct    = Math.min(current / max, 1);
  const filled = Math.round(pct * length);
  const empty  = length - filled;
  return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${Math.round(pct * 100)}%`;
};

/** Escape Discord markdown */
const escMd = str => str.replace(/([*_`~|\\])/g, '\\$1');

/** Random item từ array */
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/** Delay */
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Chunk array thành nhóm nhỏ hơn */
const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// ── Error Handler ─────────────────────────────

/**
 * Wrap interaction handler với error catching
 */
function safeExecute(fn) {
  return async (interaction) => {
    try {
      await fn(interaction);
    } catch (err) {
      console.error(`[${interaction.commandName || 'interaction'}] Error:`, err);
      const payload = {
        content: '❌ Hiểu Uyên gặp lỗi rồi~ Thử lại sau nhé! 🌸',
        ephemeral: true
      };
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch { /* ignore */ }
    }
  };
}

// ── Spam Guard ────────────────────────────────
const spamMap = new Map(); // userId -> { count, resetAt }

/**
 * Phát hiện spam: trả về true nếu bị spam
 * @param {string} userId
 * @param {number} maxCount  - max messages
 * @param {number} windowMs  - time window
 */
function isSpamming(userId, maxCount = 5, windowMs = 5000) {
  const now  = Date.now();
  const data = spamMap.get(userId);

  if (!data || now > data.resetAt) {
    spamMap.set(userId, { count: 1, resetAt: now + windowMs });
    return false;
  }

  data.count++;
  if (data.count > maxCount) return true;
  return false;
}

// ── Logger ────────────────────────────────────
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
let currentLevel = LOG_LEVELS.INFO;

const logger = {
  debug: (...args) => currentLevel <= LOG_LEVELS.DEBUG && console.debug('[DEBUG]', ...args),
  info:  (...args) => currentLevel <= LOG_LEVELS.INFO  && console.log('[INFO]', ...args),
  warn:  (...args) => currentLevel <= LOG_LEVELS.WARN  && console.warn('[WARN]', ...args),
  error: (...args) => currentLevel <= LOG_LEVELS.ERROR && console.error('[ERROR]', ...args),
  setLevel: (level) => { currentLevel = LOG_LEVELS[level] ?? LOG_LEVELS.INFO; }
};

// ── Huong dan / Messages ──────────────────────

// Random messages từ bot
const BOT_MESSAGES = {
  greet: [
    'Hiểu Uyên xin chào nha~ ✨',
    'Ơi, bạn gọi Hiểu Uyên à? 🌸',
    'Hiểu Uyên luôn ở đây mà~ 💫',
  ],
  levelUp: [
    'Wow bạn giỏi quá đó! Tiếp tục nhé~ ✨',
    'Level lên rồi nè! Hiểu Uyên tự hào về bạn 🌸',
    'Cứ tiếp tục như vậy đi, bạn đang rất tuyệt! 💫',
  ],
  daily: [
    'Cảm ơn bạn đã ghé thăm hôm nay nha~ ✨',
    'Một ngày mới bắt đầu rồi! Chúc vui vẻ 🌸',
    'Nhớ uống nước và chăm sóc bản thân nha~ 💧',
  ],
  error: [
    'Ủa, có gì đó không ổn... Thử lại sau nhen 🌸',
    'Hiểu Uyên cần chút thời gian để sửa lỗi~ ✨',
    'Lỗi nhỏ thôi, không sao đâu~ Thử lại nhé 💫',
  ]
};

const getMessage = (type) => pick(BOT_MESSAGES[type] || BOT_MESSAGES.error);

module.exports = {
  CooldownManager,
  fmtNum, fmtTime, progressBar, escMd, pick, sleep, chunk,
  safeExecute, isSpamming, logger, getMessage,
  cooldowns: new CooldownManager()
};
