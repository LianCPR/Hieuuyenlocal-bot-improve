// =============================================
// WEEKLY DIARY — Báo tường cuối tuần (poster mới)
// =============================================

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const cron = require('node-cron');
const { createCanvas, font } = require('../../canvas/engine');
const art = require('../../canvas/art');
const theme = require('../../ui/theme');
const { HEX, fmtNum } = theme;

const { getDb } = require('../../database/database');
const { getLeaderboard } = require('../../database/models/users');
const { getRelationshipLeaderboard } = require('../../database/models/relationships');
const { getGlobalCardCount } = require('../../database/models/gacha');

function startWeeklyDiary(client) {
  // Chủ nhật 20:00 giờ Việt Nam
  cron.schedule('0 20 * * 0', async () => {
    try {
      await generateAndSendDiary(client);
    } catch (err) {
      console.error('Weekly diary error:', err.message);
    }
  }, { timezone: 'Asia/Ho_Chi_Minh' });

  console.log('📰 Weekly Diary scheduler ready (Sun 20:00 Asia/Ho_Chi_Minh)');
}

async function generateAndSendDiary(client) {
  const db = getDb();

  const totalMessages = db.prepare('SELECT SUM(totalMessages) as t FROM users').get().t || 0;
  const totalUsers = db.prepare('SELECT COUNT(*) as t FROM users').get().t || 0;
  const totalGames = db.prepare('SELECT SUM(gamesPlayed) as t FROM werewolf_stats').get().t || 0;
  const totalCards = safeCards();

  const payload = {
    topMessages: getLeaderboard('messages', 3),
    topCoins: getLeaderboard('coins', 3),
    topHealth: getLeaderboard('health', 3),
    topRelations: getRelationshipLeaderboard(3),
    viralMessages: db.prepare(`
      SELECT l.*, u.username
      FROM server_logs l
      LEFT JOIN users u ON l.authorId = u.userId
      WHERE l.isPublished = 0
      ORDER BY l.reactionCount DESC
      LIMIT 3
    `).all(),
    stats: { totalMessages, totalUsers, totalGames, totalCards }
  };

  if (payload.viralMessages.length) {
    const ids = payload.viralMessages.map(m => m.messageId);
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE server_logs SET isPublished = 1 WHERE messageId IN (${placeholders})`).run(...ids);
  }

  const image = await generateDiaryImage(payload);
  const file = new AttachmentBuilder(image, { name: 'bao-tuong.png' });

  const guildId = process.env.GUILD_ID;
  const targets = [];

  const envChannel = process.env.DIARY_CHANNEL_ID;
  if (envChannel) targets.push(envChannel);

  if (!targets.length) {
    // fallback: dùng channel đã setup của từng guild
    const { getGuildChannel } = require('../../database/models/guilds');
    for (const [id] of client.guilds.cache) {
      const ch = getGuildChannel(id, 'diary');
      if (ch) targets.push(ch);
    }
  }

  if (!targets.length) {
    console.warn('⚠️ Chưa cấu hình kênh báo tường (/setup channel loai:diary)');
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(theme.C.hot)
    .setTitle('📰 BÁO TƯỜNG HIỂU UYÊN — TUẦN NÀY')
    .setDescription([
      theme.header('WEEKLY REPORT', getWeekString()),
      theme.field('Thành viên', fmtNum(totalUsers)),
      theme.field('Tin nhắn', fmtNum(totalMessages)),
      theme.field('Ma Sói', `${fmtNum(totalGames)} trận`),
      theme.field('Thẻ gacha', fmtNum(totalCards)),
      '',
      '**Top chatter**',
      payload.topMessages.map((u, i) => `${['🥇', '🥈', '🥉'][i]} **${u.username}** — ${fmtNum(u.totalMessages)} tin`).join('\n') || '—',
      '',
      '**Tri kỷ nổi bật**',
      payload.topRelations.map((r, i) => `${['🥇', '🥈', '🥉'][i]} **${r.user1Name}** 💞 **${r.user2Name}** — ${fmtNum(r.lovePoints)} pts`).join('\n') || '—',
      '',
      '**Water crew**',
      payload.topHealth.map((u, i) => `${['🥇', '🥈', '🥉'][i]} **${u.username}** — 🔥 ${u.waterStreak} ngày`).join('\n') || '—',
      '',
      theme.quote('một tuần nữa trôi qua, cảm ơn vì đã ở đây')
    ].join('\n'))
    .setImage('attachment://bao-tuong.png')
    .setFooter({ text: theme.footer('WEEKLY DIARY') })
    .setTimestamp();

  for (const channelId of [...new Set(targets)]) {
    const channel = client.channels.cache.get(channelId)
      || await client.channels.fetch(channelId).catch(() => null);
    if (!channel) continue;

    await channel.send({ embeds: [embed], files: [file] }).catch(() => {});
  }
}

// ── POSTER ────────────────────────────────────
async function generateDiaryImage({ topMessages, topHealth, topRelations, viralMessages, stats }) {
  const W = 1200, H = 760;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  art.bgPoster(ctx, {
    w: W, h: H, seed: art.hashStr(getWeekString()),
    accent: HEX.hot, accent2: HEX.neon, accent3: HEX.cyber
  });
  art.splatter(ctx, { cx: 1060, cy: 90, maxR: 190, color: HEX.neon, seed: 33, alpha: 0.3 });
  art.sparkles(ctx, { w: W, h: 240, count: 16, seed: 8 });

  // header
  ctx.textAlign = 'left';
  ctx.fillStyle = HEX.cyber;
  ctx.font = font(14, 'bold', 'mono');
  ctx.fillText('W E E K L Y   R E P O R T', 56, 74);

  art.outlineText(ctx, {
    text: 'BÁO TƯỜNG HIỂU UYÊN', x: 52, y: 148, size: 54,
    fill: '#FFFFFF', stroke: '#0B0A12', offset: 5
  });

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = font(15, 'mono');
  ctx.fillText(getWeekString(), W - 56, 96);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = font(12, 'mono');
  ctx.fillText('// hieu-uyen era · no skip', W - 56, 120);

  art.tape(ctx, {
    x: 40, y: 170, w: W - 80, h: 32,
    text: 'GENZ · ANIME · HIPHOP · WEEKLY WRAP UP',
    fill: HEX.hot, color: '#0B0A12', size: 14, rotate: -0.004
  });

  // 3 cột
  const columns = [
    { x: 50, title: 'TOP CHATTERS', accent: HEX.hot, rows: topMessages.map(u => [u.username, `${fmtNum(u.totalMessages)} tin nhắn`]) },
    { x: 425, title: 'TRI KỶ NỔI BẬT', accent: HEX.neon, rows: topRelations.map(r => [`${r.user1Name} & ${r.user2Name}`, `${fmtNum(r.lovePoints)} điểm`]) },
    { x: 800, title: 'WATER CREW', accent: HEX.cyber, rows: topHealth.map(u => [u.username, `${u.waterStreak} ngày streak`]) }
  ];

  for (const col of columns) {
    const y = 232, h = 250, w = 350;

    art.roundRect(ctx, col.x, y, w, h, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fill();
    ctx.strokeStyle = art.rgba(col.accent, 0.45);
    ctx.lineWidth = 1.5;
    art.roundRect(ctx, col.x, y, w, h, 14);
    ctx.stroke();

    art.roundRect(ctx, col.x, y, w, 4, 2);
    ctx.fillStyle = col.accent;
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = col.accent;
    ctx.font = font(15, 'bold', 'display');
    ctx.fillText(col.title, col.x + 20, y + 34);

    col.rows.forEach(([name, value], i) => {
      const ry = y + 78 + i * 56;
      ctx.fillStyle = i === 0 ? HEX.gold : 'rgba(255,255,255,0.78)';
      ctx.font = font(18, 'bold', 'display');
      const label = String(name).length > 22 ? String(name).slice(0, 21) + '…' : String(name);
      ctx.fillText(`${String(i + 1).padStart(2, '0')}  ${label}`, col.x + 20, ry);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = font(12, 'normal', 'body');
      ctx.fillText(value, col.x + 52, ry + 18);
    });

    if (!col.rows.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = font(13, 'normal', 'body');
      ctx.fillText('Chưa có dữ liệu', col.x + 20, y + 90);
    }
  }

  // moments
  ctx.textAlign = 'left';
  ctx.fillStyle = HEX.gold;
  ctx.font = font(14, 'bold', 'mono');
  ctx.fillText('K H O Ả N H   K H Ắ C   N Ổ I   B Ậ T', 56, 530);

  if (!viralMessages.length) {
    art.roundRect(ctx, 50, 548, 1100, 110, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = font(15, 'normal', 'body');
    ctx.textAlign = 'center';
    ctx.fillText('Tuần này chưa có khoảnh khắc nào nổi bật — thả thêm reaction để lưu lại kỷ niệm nhé!', W / 2, 612);
  } else {
    viralMessages.slice(0, 3).forEach((msg, i) => {
      const x = 50 + i * 373;
      const y = 548;

      art.roundRect(ctx, x, y, 354, 112, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fill();
      ctx.strokeStyle = art.rgba(HEX.hot, 0.3);
      ctx.lineWidth = 1.2;
      art.roundRect(ctx, x, y, 354, 112, 12);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = HEX.hot;
      ctx.font = font(12, 'bold', 'mono');
      ctx.fillText(`@${msg.username || 'unknown'} · ${msg.reactionCount} reacts`, x + 16, y + 26);

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = font(13, 'normal', 'body');
      wrapText(ctx, (msg.content || 'hình ảnh / sticker').substring(0, 140), x + 16, y + 48, 320, 19, 3);
    });
  }

  // stats bar
  const statsY = 686;
  art.roundRect(ctx, 50, statsY, 1100, 44, 10);
  ctx.fillStyle = 'rgba(9,7,16,0.7)';
  ctx.fill();
  ctx.strokeStyle = art.rgba(HEX.cyber, 0.35);
  ctx.lineWidth = 1.2;
  art.roundRect(ctx, 50, statsY, 1100, 44, 10);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = font(13, 'bold', 'mono');
  ctx.fillText(
    `${fmtNum(stats.totalUsers)} MEMBERS   ·   ${fmtNum(stats.totalMessages)} MESSAGES   ·   ${fmtNum(stats.totalGames)} MA SÓI   ·   ${fmtNum(stats.totalCards)} CARDS`,
    W / 2, statsY + 28
  );

  art.tape(ctx, {
    x: -30, y: H - 28, w: W + 60, h: 26,
    text: 'HIỂU UYÊN · WEEKLY DIARY · YÊU MỌI NGƯỜI',
    fill: HEX.cyber, color: '#0B0A12', size: 12, rotate: 0.004
  });

  return canvas.toBuffer('image/png');
}

function wrapText(ctx, text, x, y, maxW, lineH, maxLines = 3) {
  const words = String(text).split(' ');
  let line = '';
  let row = 0;

  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, y + row * lineH);
      line = word + ' ';
      row++;
      if (row >= maxLines) {
        ctx.fillText('…', x, y + row * lineH);
        return;
      }
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line.trim(), x, y + row * lineH);
}

function getWeekString() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  const fmt = d => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${fmt(start)} — ${fmt(now)}`;
}

function safeCards() {
  try { return getGlobalCardCount(); } catch { return 0; }
}

module.exports = { startWeeklyDiary, generateAndSendDiary, generateDiaryImage };
