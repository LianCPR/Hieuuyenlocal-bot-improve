// =============================================
// MINIGAME ENGINE — tài xỉu · oẳn tù tì · đoán số
// =============================================

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const rollDie = () => 1 + Math.floor(Math.random() * 6);
const rollDice = (count = 3) => Array.from({ length: count }, rollDie);
const diceFace = (n) => DICE_FACES[Math.min(6, Math.max(1, Number(n) || 1)) - 1];

const RPS = {
  keo: { label: 'KÉO', emoji: '✌️', beats: 'bao' },
  bua: { label: 'BÚA', emoji: '✊', beats: 'keo' },
  bao: { label: 'BAO', emoji: '✋', beats: 'bua' }
};

/** Tài Xỉu: tổng 11–18 là Tài, 4–10 là Xỉu. Bão (3 mặt giống nhau) nhà cái thắng. */
function playTaiXiu(choice = 'tai') {
  const dice = rollDice(3);
  const total = dice.reduce((sum, n) => sum + n, 0);
  const triple = dice[0] === dice[1] && dice[1] === dice[2];
  const outcome = total >= 11 ? 'tai' : 'xiu';
  return {
    dice,
    total,
    triple,
    outcome,
    win: !triple && choice === outcome
  };
}

/** Oẳn tù tì: kéo thắng bao, bao thắng búa, búa thắng kéo. */
function playRPS(choice = 'keo') {
  const keys = Object.keys(RPS);
  const bot = keys[Math.floor(Math.random() * keys.length)];
  const tie = choice === bot;
  return {
    bot,
    tie,
    win: !tie && RPS[choice]?.beats === bot
  };
}

/** Đoán số 1–6; trúng nhận lời gấp 3 lần cược (tổng nhận 4x). */
function playGuess(choice = 1) {
  const pick = Math.min(6, Math.max(1, Number(choice) || 1));
  const bot = rollDie();
  return { choice: pick, bot, win: bot === pick };
}

module.exports = {
  DICE_FACES,
  RPS,
  rollDie,
  rollDice,
  diceFace,
  playTaiXiu,
  playRPS,
  playGuess
};
