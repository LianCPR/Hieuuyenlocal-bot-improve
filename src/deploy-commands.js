// =============================================
// DEPLOY COMMANDS - Hiểu Uyên Bot
// Đăng ký slash commands lên Discord
// =============================================

require('dotenv').config();

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const commands = require('./commands/index');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
  console.log('\n🌸 Đang đăng ký slash commands...\n');

  const commandData = commands.map(cmd => cmd.data.toJSON());

  try {
    // Deploy to specific guild (nhanh hơn, dùng khi dev)
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commandData }
      );
      console.log(`✅ Đã deploy ${commandData.length} commands lên Guild ${process.env.GUILD_ID}!`);
    } else {
      // Deploy global (mất tới 1 giờ để update)
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commandData }
      );
      console.log(`✅ Đã deploy ${commandData.length} commands globally!`);
    }

    console.log('\nDanh sách commands:');
    commandData.forEach(cmd => console.log(`  /${cmd.name} - ${cmd.description}`));
    console.log('\n🎉 Deploy xong rồi nè!\n');

  } catch (err) {
    console.error('❌ Lỗi deploy commands:', err);
  }
}

deployCommands();
