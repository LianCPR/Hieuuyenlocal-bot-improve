// =============================================
// COMMAND REGISTRY — tự động load mọi command
// =============================================

const fs = require('fs');
const path = require('path');

const modules = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.name.endsWith('.js')) continue;
    if (entry.name === 'index.js' && dir === __dirname) continue; // chính file này
    if (entry.name.startsWith('_')) continue;

    try {
      const mod = require(full);
      if (Array.isArray(mod)) modules.push(...mod);
      else if (mod?.data && typeof mod.execute === 'function') modules.push(mod);
    } catch (err) {
      console.error(`❌ Không load được command ${entry.name}:`, err.message);
    }
  }
}

walk(__dirname);

// Loại trùng theo tên, ưu tiên bản load trước
const commandMap = new Map();
for (const cmd of modules) {
  if (!cmd?.data?.name) continue;
  if (commandMap.has(cmd.data.name)) {
    console.warn(`⚠️ Command trùng tên: /${cmd.data.name}`);
    continue;
  }
  commandMap.set(cmd.data.name, cmd);
}

const commandArray = [...commandMap.values()];

// Tương thích với code cũ
commandArray.commandMap = commandMap;
commandArray.activeQuizzes = require('../games/quiz/quizState').activeQuizzes;

module.exports = commandArray;
