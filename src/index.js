// =============================================
// HIỂU UYÊN BOT — entry point
// anime · genZ · hiphop edition
// =============================================

require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { initDatabase } = require('./database/database');
const { registerEvents } = require('./events/index');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// cho phép các module khác lấy client khi cần
global.__HIEU_UYEN_CLIENT__ = client;

async function main() {
  console.log('');
  console.log('   🌸 HIỂU UYÊN — anime genZ hiphop era');
  console.log('   ─────────────────────────────────────');
  console.log('   📦 khởi tạo database...');
  initDatabase();

  console.log('   📡 đăng ký event handlers...');
  registerEvents(client);

  console.log('   🔑 kết nối Discord...');
  await client.login(process.env.DISCORD_TOKEN);

  startWebDashboard(client);
}

function startWebDashboard(discordClient) {
  try {
    const { createWebServer } = require('../web/server');
    const port = process.env.WEB_PORT || 3000;

    createWebServer(discordClient).listen(port, () => {
      console.log(`   🌐 dashboard: http://localhost:${port}`);
    });
  } catch (err) {
    console.warn('   ⚠️ web dashboard không khởi động được:', err.message);
  }
}

process.on('SIGINT', () => {
  console.log('\n👋 Hiểu Uyên đang tắt...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  client.destroy();
  process.exit(0);
});

main().catch(err => {
  console.error('❌ Lỗi khởi động:', err);
  process.exit(1);
});
