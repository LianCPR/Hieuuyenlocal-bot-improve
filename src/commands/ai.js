// =============================================
// AI CHAT — /chat + mention bot
// =============================================

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const theme = require('../ui/theme');
const { C } = theme;
const ai = require('../systems/ai/aiClient');
const store = require('../database/models/aiChat');

const COOLDOWN_MS = 3500;
const HOURLY_LIMIT = 40;
const lastCall = new Map();
const missingKeyAt = new Map();

function splitMessage(text, size = 1900) {
  const out = [];
  let rest = String(text || '').trim();
  while (rest.length > size) {
    let cut = rest.lastIndexOf('\n', size);
    if (cut < size * 0.6) cut = rest.lastIndexOf(' ', size);
    if (cut < size * 0.6) cut = size;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out.length ? out : ['(AI không trả lời nội dung nào)'];
}

function setupEmbed() {
  const cfg = ai.publicConfig();
  return theme.baseEmbed({
    color: C.cyber,
    section: theme.sectionName('ai'),
    title: '🤖 AI CHƯA ĐƯỢC CẤU HÌNH',
    description: [
      theme.header('BẬT AI THẬT', 'thiếu API key nên mình chưa trả lời được'),
      'Thêm vào file `.env` rồi khởi động lại bot:',
      '```env',
      'AI_API_KEY=...',
      `AI_BASE_URL=${cfg.baseURL}`,
      `AI_MODEL=${cfg.model}`,
      '```',
      '',
      'Lấy key tại **https://z.ai** — dòng GLM-4.5-Flash có bản miễn phí.',
      '',
      '-# tuyệt đối không gửi key vào chat Discord hoặc commit lên git'
    ].join('\n')
  });
}

function friendlyError(err) {
  switch (err?.code) {
    case 'MISSING_KEY':
      return 'AI chưa có API key. Thêm `AI_API_KEY` vào `.env` rồi khởi động lại bot nhé.';
    case 'AUTH':
      return 'API key AI bị từ chối hoặc đã hết hạn. Kiểm tra lại key trong `.env`.';
    case 'RATE_LIMIT':
      return 'Nhà cung cấp AI đang giới hạn tốc độ. Chờ một chút rồi thử lại nhé.';
    case 'TIMEOUT':
      return 'AI trả lời hơi lâu nên mình ngắt rồi. Thử lại với câu ngắn hơn nhé.';
    case 'EMPTY':
      return 'AI không trả về nội dung. Thử lại một lần nữa nhé.';
    default:
      return 'AI đang gặp lỗi tạm thời. Thử lại sau vài giây nhé.';
  }
}

async function respondWithAi({ userId, channelId, userName, channelName, prompt }) {
  if (store.countRecent(userId, 60) >= HOURLY_LIMIT) {
    const err = new Error('hourly limit');
    err.code = 'HOURLY_LIMIT';
    throw err;
  }

  const history = store.getHistory(userId, channelId, 12);
  const result = await ai.chat({ history, message: prompt, userName, channelName });

  store.appendMessage(userId, channelId, 'user', prompt);
  store.appendMessage(userId, channelId, 'assistant', result.text);
  return result;
}

// ── Slash command ─────────────────────────────
const chatCommand = {
  data: new SlashCommandBuilder()
    .setName('chat')
    .setDescription('🤖 Trò chuyện với AI Hiểu Uyên')
    .addSubcommand(sub => sub
      .setName('send')
      .setDescription('Gửi một câu cho AI')
      .addStringOption(opt => opt
        .setName('noidung')
        .setDescription('Bạn muốn nói gì với Hiểu Uyên?')
        .setRequired(true)
        .setMaxLength(1000)))
    .addSubcommand(sub => sub
      .setName('reset')
      .setDescription('Xoá ngữ cảnh trò chuyện ở kênh này'))
    .addSubcommand(sub => sub
      .setName('status')
      .setDescription('Xem trạng thái AI và số lượt còn lại')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const channelId = interaction.channelId;

    if (sub === 'status') {
      const cfg = ai.publicConfig();
      const used = store.countRecent(userId, 60);
      const kept = store.countHistory(userId, channelId);

      return interaction.reply({
        embeds: [theme.baseEmbed({
          color: cfg.configured ? C.lime : C.gold,
          section: theme.sectionName('ai'),
          title: '🤖 AI STATUS',
          description: [
            theme.field('Trạng thái', cfg.configured ? '**đã kết nối**' : '**chưa có API key**'),
            theme.field('Model', `\`${cfg.model}\``),
            theme.field('Endpoint', `\`${cfg.host}\``),
            theme.field('Ngữ cảnh kênh này', `**${kept}** tin`),
            theme.field('Lượt còn lại', `**${Math.max(0, HOURLY_LIMIT - used)}**/${HOURLY_LIMIT} trong 1 giờ`),
            '',
            cfg.configured
              ? '-# dùng `/chat send` hoặc mention bot để bắt đầu'
              : '-# thêm `AI_API_KEY` vào `.env` rồi khởi động lại bot'
          ].join('\n')
        })],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'reset') {
      const removed = store.clearHistory(userId, channelId);
      return interaction.reply({
        embeds: [theme.successEmbed(
          'ĐÃ RESET NGỮ CẢNH',
          removed
            ? `Xoá **${removed}** tin trong kênh này. Bắt đầu lại từ đầu nhé.`
            : 'Kênh này chưa có ngữ cảnh nào để xoá.'
        )],
        flags: MessageFlags.Ephemeral
      });
    }

    if (!ai.isConfigured()) {
      return interaction.reply({ embeds: [setupEmbed()], flags: MessageFlags.Ephemeral });
    }

    const now = Date.now();
    const last = lastCall.get(userId) || 0;
    if (now - last < COOLDOWN_MS) {
      return interaction.reply({
        embeds: [theme.warnEmbed('CHẬM THÔI NÀO', `Chờ **${((COOLDOWN_MS - (now - last)) / 1000).toFixed(1)}s** nữa nhé.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    const used = store.countRecent(userId, 60);
    if (used >= HOURLY_LIMIT) {
      return interaction.reply({
        embeds: [theme.warnEmbed('HẾT LƯỢT GIỜ NÀY', `Bạn đã dùng **${used}/${HOURLY_LIMIT}** lượt. Thử lại sau khi qua giờ nhé.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    lastCall.set(userId, now);
    const prompt = interaction.options.getString('noidung', true).trim();

    await interaction.deferReply();

    try {
      const result = await respondWithAi({
        userId,
        channelId,
        userName: interaction.member?.displayName || interaction.user.globalName || interaction.user.username,
        channelName: interaction.channel?.name || 'DM',
        prompt
      });

      const chunks = splitMessage(result.text);
      await interaction.editReply({
        content: chunks[0],
        allowedMentions: { parse: [] }
      });

      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({
          content: chunks[i],
          allowedMentions: { parse: [] }
        });
      }
    } catch (err) {
      console.error('[AI] chat error:', err.code || '', err.status || '', err.message);

      if (err.code === 'HOURLY_LIMIT') {
        return interaction.editReply({
          embeds: [theme.warnEmbed('HẾT LƯỢT GIỜ NÀY', `Tối đa **${HOURLY_LIMIT}** tin/giờ. Thử lại sau nhé.`)]
        });
      }

      return interaction.editReply({
        embeds: [theme.errorEmbed('AI KHÔNG TRẢ LỜI ĐƯỢC', friendlyError(err))]
      });
    }
  }
};

// ── Mention handler ───────────────────────────
async function handleMention(message, client) {
  try {
    if (!message?.author || message.author.bot) return false;
    if (!client?.user) return false;
    if (!message.mentions?.users?.has(client.user.id)) return false;

    const prompt = String(message.content || '')
      .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), ' ')
      .trim();

    const noMentions = { repliedUser: false, parse: [] };

    if (!prompt) {
      await message.reply({
        content: 'Gọi mình rồi mà không nói gì hả? Thử `/chat send noidung:...` hoặc mention kèm câu hỏi nhé.',
        allowedMentions: noMentions
      });
      return true;
    }

    const userId = message.author.id;
    const channelId = message.channelId;
    const now = Date.now();

    if (!ai.isConfigured()) {
      // Chỉ nhắc cấu hình một lần mỗi 10 phút để không spam kênh.
      if (now - (missingKeyAt.get(userId) || 0) > 10 * 60 * 1000) {
        missingKeyAt.set(userId, now);
        await message.reply({ embeds: [setupEmbed()], allowedMentions: noMentions });
      }
      return true;
    }

    // Mention bị cooldown thì im lặng, tránh spam kênh.
    if (now - (lastCall.get(userId) || 0) < COOLDOWN_MS) return true;

    if (store.countRecent(userId, 60) >= HOURLY_LIMIT) {
      await message.reply({
        content: `Hết **${HOURLY_LIMIT}** lượt trong giờ này rồi. Chờ qua giờ rồi mình nói tiếp nhé.`,
        allowedMentions: noMentions
      });
      return true;
    }

    lastCall.set(userId, now);
    await message.channel.sendTyping().catch(() => {});

    const result = await respondWithAi({
      userId,
      channelId,
      userName: message.member?.displayName || message.author.globalName || message.author.username,
      channelName: message.channel?.name || 'DM',
      prompt
    });

    const chunks = splitMessage(result.text);
    await message.reply({ content: chunks[0], allowedMentions: noMentions });

    for (let i = 1; i < chunks.length; i++) {
      await message.channel.send({ content: chunks[i], allowedMentions: { parse: [] } });
    }

    return true;
  } catch (err) {
    console.error('[AI] mention error:', err.code || '', err.status || '', err.message);
    try {
      await message.reply({
        content: friendlyError(err),
        allowedMentions: { repliedUser: false, parse: [] }
      });
    } catch { /* kênh không cho gửi */ }
    return true;
  }
}

module.exports = chatCommand;
module.exports.handleMention = handleMention;
module.exports.splitMessage = splitMessage;
module.exports.friendlyError = friendlyError;
