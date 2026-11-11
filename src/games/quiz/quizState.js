// =============================================
// QUIZ STATE — quản lý câu hỏi đang chạy
// =============================================

const { EmbedBuilder } = require('discord.js');
const { getDb } = require('../../database/database');
const { addXp, updateCoins } = require('../../database/models/users');
const { unlockAchievement } = require('../../database/models/achievements');
const { progressQuest } = require('../../database/models/quests');
const theme = require('../../ui/theme');

const activeQuizzes = new Map(); // channelId -> quiz

const CAT_EMOJI = {
  general: '🌍', history: '📜', literature: '📖',
  science: '🔬', fun: '😄', anime: '🌸', music: '🎧'
};

function startQuiz(channelId, question) {
  activeQuizzes.set(channelId, {
    question,
    correct: question.correct,
    answered: false,
    startedAt: Date.now()
  });
}

function getActiveQuiz(channelId) {
  return activeQuizzes.get(channelId) || null;
}

function endQuiz(channelId) {
  activeQuizzes.delete(channelId);
}

/**
 * Xử lý tin nhắn trả lời quiz (A/B/C/D)
 * @returns {Promise<boolean>} true nếu tin nhắn là câu trả lời
 */
async function handleQuizAnswer(message) {
  if (!message?.guild || message.author?.bot) return false;

  const quiz = activeQuizzes.get(message.channelId);
  if (!quiz || quiz.answered) return false;

  const answer = String(message.content || '').trim().toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(answer)) return false;

  if (answer !== quiz.correct) {
    // trả lời sai: phản hồi nhẹ nhàng, không phạt
    if (Math.random() < 0.35) {
      await message.react('❌').catch(() => {});
    }
    return true;
  }

  quiz.answered = true;
  activeQuizzes.delete(message.channelId);

  const userId = message.author.id;
  const db = getDb();

  db.prepare(`
    INSERT INTO quiz_stats (userId, totalAnswered, correctCount, streak, bestStreak)
    VALUES (?, 1, 1, 1, 1)
    ON CONFLICT(userId) DO UPDATE SET
      totalAnswered = totalAnswered + 1,
      correctCount = correctCount + 1,
      streak = streak + 1,
      bestStreak = MAX(bestStreak, streak + 1)
  `).run(userId);

  const stats = db.prepare('SELECT * FROM quiz_stats WHERE userId = ?').get(userId);
  const streakBonus = Math.min(stats?.streak || 1, 6) * 3;

  addXp(userId, 30);
  updateCoins(userId, 15 + streakBonus);
  progressQuest(userId, 'quiz');

  const unlocked = [];
  if ((stats?.correctCount || 0) >= 10) {
    const a = unlockAchievement(userId, 'quiz_10');
    if (a) unlocked.push(a);
  }
  if ((stats?.bestStreak || 0) >= 5) {
    const a = unlockAchievement(userId, 'quiz_streak_5');
    if (a) unlocked.push(a);
  }

  const embed = theme.baseEmbed({
    color: theme.C.mint,
    section: theme.sectionName('quiz'),
    title: '🎯 CHUẨN KHÔNG CẦN CHỈNH',
    description: [
      theme.header('ĐÁP ÁN ĐÚNG', 'aura +100, não bộ +200'),
      `> **${message.member?.displayName || message.author.username}** gọi đúng **${answer}**`,
      '',
      theme.field('Thưởng', `+30 XP · +${15 + streakBonus} coins`),
      theme.field('Chuỗi đúng', `**${stats?.streak || 1}** câu liên tiếp`),
      unlocked.length ? `\n**Mở khoá:** ${unlocked.map(a => `${a.badgeIcon} ${a.name}`).join(' · ')}` : '',
      '',
      theme.quote(theme.hype('win'))
    ].filter(Boolean).join('\n')
  });

  await message.channel.send({ embeds: [embed] }).catch(() => {});
  return true;
}

/** Gửi embed câu hỏi */
function buildQuizEmbed(question) {
  const options = ['A', 'B', 'C', 'D'];
  const texts = [question.optionA, question.optionB, question.optionC, question.optionD];

  return new EmbedBuilder()
    .setColor(0x9C27B0)
    .setAuthor({ name: 'QUIZ ARENA · HIỂU UYÊN' })
    .setTitle(`${CAT_EMOJI[question.category] || '🧠'} CÂU HỎI NỔ NÃO`)
    .setDescription([
      `**${question.question}**`,
      '',
      options.map(o => `> **${o}.** ${texts[options.indexOf(o)]}`).join('\n'),
      '',
      '`30 giây` · gõ **A / B / C / D** trong chat',
      '-# trả lời đúng: +30 XP · +coins theo chuỗi'
    ].join('\n'))
    .setFooter({ text: theme.footer('QUIZ ARENA') })
    .setTimestamp();
}

module.exports = {
  activeQuizzes,
  startQuiz,
  getActiveQuiz,
  endQuiz,
  handleQuizAnswer,
  buildQuizEmbed,
  CAT_EMOJI
};
