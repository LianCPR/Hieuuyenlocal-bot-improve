// =============================================
// MINIGAME CARDS — Tài Xỉu · Oẳn Tù Tì · Đoán Số
// =============================================

const { createCanvas, font } = require('./engine');
const art = require('./art');
const { HEX, fmtNum } = require('../ui/theme');

const W = 1200;
const H = 630;

const TAIXIU_CARD_FILE = 'taixiu-card.png';
const RPS_CARD_FILE = 'oanthu-card.png';
const GUESS_CARD_FILE = 'doanso-card.png';

const RPS = {
  keo: { label: 'KÉO', color: HEX.cyber },
  bua: { label: 'BÚA', color: HEX.gold },
  bao: { label: 'BAO', color: HEX.hot }
};

function fit(ctx, text, maxWidth, start, family = 'display', weight = 'bold') {
  let size = start;
  ctx.font = font(size, weight, family);
  while (ctx.measureText(text).width > maxWidth && size > 12) {
    size -= 1;
    ctx.font = font(size, weight, family);
  }
  return size;
}

function fillStroke(ctx, fill, width = 4) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = HEX.ink;
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawDiePips(ctx, value, cx, cy, radius = 9, gap = 36) {
  const positions = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
    5: [[-1, -1], [-1, 1], [0, 0], [1, -1], [1, 1]],
    6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]]
  };

  ctx.fillStyle = HEX.ink;
  for (const [px, py] of positions[value] || positions[1]) {
    ctx.beginPath();
    ctx.arc(cx + px * gap, cy + py * gap, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDiceTile(ctx, { x, y, size, value, index, highlight, accent }) {
  const w = size;
  const h = size;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(index === 1 ? 0.026 : index === 2 ? -0.018 : -0.01);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 9;
  art.roundRect(ctx, -w / 2, -h / 2, w, h, 20);
  ctx.fillStyle = '#F4EEE4';
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = highlight ? accent : 'rgba(8,7,12,0.6)';
  ctx.lineWidth = highlight ? 5 : 2.5;
  if (highlight) {
    ctx.shadowColor = accent;
    ctx.shadowBlur = 22;
  }
  art.roundRect(ctx, -w / 2, -h / 2, w, h, 20);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(8,7,12,0.55)';
  ctx.font = font(10, 'bold', 'mono');
  ctx.fillText(`DIE 0${index + 1}`, -w / 2 + 18, -h / 2 + 29);

  drawDiePips(ctx, value, 0, 6, 9, w * 0.18);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(8,7,12,0.7)';
  ctx.font = font(10, 'bold', 'mono');
  ctx.fillText('XÚC XẮC', 0, h / 2 - 20);

  ctx.restore();
}

function drawHand(ctx, type, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 120, size / 120);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (type === 'keo') {
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.translate(dir * 14, -10);
      ctx.rotate(dir * 0.34);
      art.roundRect(ctx, -10, -58, 20, 66, 10);
      fillStroke(ctx, color);
      ctx.restore();
    }
    art.roundRect(ctx, -29, -8, 58, 58, 20);
    fillStroke(ctx, color);
    ctx.beginPath();
    ctx.moveTo(-16, 27);
    ctx.quadraticCurveTo(-2, 38, 16, 27);
    ctx.strokeStyle = 'rgba(8,7,12,0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (type === 'bua') {
    art.roundRect(ctx, -27, 28, 54, 33, 11);
    fillStroke(ctx, color);
    art.roundRect(ctx, -38, -30, 76, 66, 22);
    fillStroke(ctx, color);
    ctx.beginPath();
    ctx.ellipse(-43, 6, 14, 20, -0.32, 0, Math.PI * 2);
    fillStroke(ctx, color);
    ctx.beginPath();
    ctx.moveTo(-19, -4);
    ctx.lineTo(-13, -20);
    ctx.moveTo(0, -7);
    ctx.lineTo(0, -24);
    ctx.moveTo(19, -4);
    ctx.lineTo(13, -20);
    ctx.strokeStyle = 'rgba(8,7,12,0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    for (let i = 0; i < 4; i++) {
      art.roundRect(ctx, -34 + i * 17, -58, 12, 52, 7);
      fillStroke(ctx, color);
    }
    ctx.save();
    ctx.rotate(-0.42);
    art.roundRect(ctx, -54, -14, 16, 50, 8);
    fillStroke(ctx, color);
    ctx.restore();
    art.roundRect(ctx, -34, -10, 68, 66, 18);
    fillStroke(ctx, color);
    ctx.beginPath();
    ctx.moveTo(-16, 28);
    ctx.quadraticCurveTo(0, 38, 18, 28);
    ctx.strokeStyle = 'rgba(8,7,12,0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.restore();
}

function drawDuelTile(ctx, { x, y, w, h, label, type, color, border, glow, badge }) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(label === 'BẠN' ? -0.012 : 0.014);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  art.roundRect(ctx, -w / 2, -h / 2, w, h, 20);
  ctx.fillStyle = 'rgba(12,9,20,0.96)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  art.roundRect(ctx, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 16);
  ctx.fillStyle = art.rgba(color, 0.08);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = border;
  ctx.lineWidth = glow ? 4 : 2;
  if (glow) {
    ctx.shadowColor = border;
    ctx.shadowBlur = 24;
  }
  art.roundRect(ctx, -w / 2, -h / 2, w, h, 20);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.font = font(10, 'bold', 'mono');
  ctx.fillText(label, -w / 2 + 18, -h / 2 + 29);

  if (badge) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = font(9, 'bold', 'mono');
    ctx.fillText(badge, w / 2 - 18, -h / 2 + 29);
  }

  drawHand(ctx, type, 0, 8, 128, color);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(21, 'bold', 'body');
  ctx.fillText(RPS[type].label, 0, h / 2 - 30);

  ctx.restore();
}

function drawNumberTile(ctx, { x, y, w, h, label, value, color, border, glow, active }) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(label === 'BẠN' ? -0.012 : 0.014);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  art.roundRect(ctx, -w / 2, -h / 2, w, h, 20);
  ctx.fillStyle = 'rgba(12,9,20,0.96)';
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = border;
  ctx.lineWidth = glow ? 4 : 2;
  if (glow) {
    ctx.shadowColor = border;
    ctx.shadowBlur = 24;
  }
  art.roundRect(ctx, -w / 2, -h / 2, w, h, 20);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.font = font(10, 'bold', 'mono');
  ctx.fillText(label, -w / 2 + 18, -h / 2 + 29);

  art.outlineText(ctx, {
    text: String(value),
    x: 0, y: 92,
    size: 142,
    fill: color,
    stroke: HEX.ink,
    offset: 5,
    align: 'center'
  });

  for (let i = 1; i <= 6; i++) {
    const px = -w / 2 + 42 + (i - 1) * ((w - 84) / 5);
    ctx.beginPath();
    ctx.arc(px, h / 2 - 28, 4, 0, Math.PI * 2);
    ctx.fillStyle = i === value ? color : 'rgba(255,255,255,0.2)';
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = active ? color : 'rgba(255,255,255,0.45)';
  ctx.font = font(9, 'bold', 'mono');
  ctx.fillText(`SỐ ${value}`, 0, h / 2 - 12);

  ctx.restore();
}

function renderCard({
  header, rightTop, titleLines, secondary, accent,
  kicker, pickText, result, resultColor, money, bet,
  balance, stats, rightLabel, rightCaption, scene,
  stamp, footer, seed
}) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  art.bgPoster(ctx, {
    w: W, h: H, seed,
    accent, accent2: secondary, accent3: HEX.cyber
  });
  art.bricks(ctx, { w: W, h: H, alpha: 0.04, color: '#FFFFFF', step: 74, rowH: 32 });
  art.spray(ctx, { cx: 280, cy: 250, r: 300, color: secondary, seed: seed + 1, alpha: 0.2 });
  art.spray(ctx, { cx: 940, cy: 420, r: 320, color: accent, seed: seed + 2, alpha: 0.12 });
  art.splatter(ctx, { cx: 1040, cy: 120, maxR: 180, color: accent, seed: seed + 3, alpha: 0.24 });
  art.sparkles(ctx, { w: W, h: 430, count: 22, seed: seed + 4 });
  art.frame(ctx, { w: W, h: H, color: accent, inset: 14, alpha: 0.55, width: 1.5 });

  ctx.textAlign = 'left';
  ctx.fillStyle = HEX.cyber;
  ctx.font = font(12, 'bold', 'mono');
  ctx.fillText(`HIỂU UYÊN  //  ${header}`, 64, 54);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = font(11, 'normal', 'mono');
  ctx.fillText(rightTop, W - 64, 54);

  art.outlineText(ctx, {
    text: titleLines[0], x: 64, y: 168,
    size: fit(ctx, titleLines[0], 315, 94),
    fill: '#FFFFFF', stroke: HEX.ink, offset: 5
  });
  art.outlineText(ctx, {
    text: titleLines[1], x: 64, y: 258,
    size: fit(ctx, titleLines[1], 315, 94),
    fill: secondary, stroke: HEX.ink, offset: 5
  });
  art.tagLine(ctx, { x: 68, y: 286, w: 270, color: accent, width: 6, seed: seed + 6 });

  ctx.textAlign = 'left';
  ctx.fillStyle = accent;
  ctx.font = font(12, 'bold', 'mono');
  ctx.fillText(kicker, 66, 324);

  art.sticker(ctx, {
    x: 194, y: 362,
    text: pickText,
    size: 14,
    fill: secondary,
    color: HEX.ink,
    family: 'body',
    padX: 16,
    padY: 8,
    rotate: -0.03,
    shadow: true
  });

  art.outlineText(ctx, {
    text: result, x: 64, y: 452,
    size: fit(ctx, result, 315, 58),
    fill: resultColor || (accent === HEX.blood ? '#FFFFFF' : accent),
    stroke: HEX.ink, offset: 4
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = resultColor || accent;
  ctx.font = font(22, 'bold', 'body');
  ctx.fillText(money, 66, 489);

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = font(12, 'normal', 'mono');
  ctx.fillText(`SỐ DƯ · ${fmtNum(balance)} COIN`, 66, 520);
  ctx.fillText(`VÁN ${stats.played || 0} · THẮNG ${stats.won || 0} · LÃI/LỖ ${stats.profit >= 0 ? '+' : ''}${fmtNum(stats.profit || 0)}`, 66, 541);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = font(11, 'bold', 'mono');
  ctx.fillText(rightLabel, 414, 146);

  scene(ctx);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = font(12, 'normal', 'mono');
  ctx.fillText(rightCaption, 414, 438);

  art.stamp(ctx, {
    x: 1090, y: 505, r: 62,
    top: stamp.top,
    big: stamp.big,
    bottom: stamp.bottom,
    color: stamp.color || accent,
    rotate: -0.12
  });

  art.tape(ctx, {
    x: 20, y: H - 34, w: W - 40, h: 28,
    text: footer,
    fill: accent, color: HEX.ink, size: 11, rotate: -0.003
  });

  return canvas.toBuffer('image/png');
}

function generateTaiXiuCard({ dice = [1, 2, 3], choice = 'tai', total = 6, triple = false, outcome = 'xiu', bet = 0, net = 0, win = false, balance = 0, stats = {} }) {
  const accent = win ? HEX.lime : HEX.blood;
  const secondary = outcome === 'tai' ? HEX.hot : HEX.cyber;
  const choiceLabel = choice === 'tai' ? 'TÀI' : 'XỈU';
  const result = triple ? 'BÃO · THUA' : win ? 'THẮNG' : 'THUA';
  const seed = art.hashStr(`taixiu:${dice.join('-')}:${choice}:${net}`);

  return renderCard({
    header: 'TÀI XỈU',
    rightTop: '3 DICE · 1:1 PAYOUT · NO SKIP',
    titleLines: ['TÀI', 'XỈU'],
    secondary,
    accent,
    kicker: `CƯỢC · ${fmtNum(bet)} COIN`,
    pickText: `BẠN CHỌN · ${choiceLabel}`,
    result,
    resultColor: win ? accent : '#FFFFFF',
    money: win ? `LỜI +${fmtNum(net)} COIN` : `MẤT ${fmtNum(bet)} COIN`,
    bet,
    balance,
    stats,
    rightLabel: 'KẾT QUẢ 03 XÚC XẮC',
    rightCaption: `TỔNG ${total} · ${outcome === 'tai' ? 'TÀI' : 'XỈU'}${triple ? ' · BÃO 3 MẶT' : ''}`,
    scene: (ctx) => {
      [410, 650, 890].forEach((x, index) => {
        drawDiceTile(ctx, {
          x, y: 170, size: 210,
          value: dice[index], index,
          highlight: win || triple,
          accent
        });
      });
    },
    stamp: { top: 'PAYOUT', big: win ? 'x1' : 'x0', bottom: 'BET' },
    footer: 'HIỂU UYÊN · TÀI XỈU · 3 DICE · ALL IN VIBE',
    seed
  });
}

function generateRPSSCard({ player = 'keo', bot = 'bao', bet = 0, net = 0, win = false, tie = false, balance = 0, stats = {} }) {
  const accent = tie ? HEX.gold : win ? HEX.lime : HEX.blood;
  const p = RPS[player] || RPS.keo;
  const b = RPS[bot] || RPS.bao;
  const seed = art.hashStr(`oanthu:${player}:${bot}:${net}`);

  return renderCard({
    header: 'OẲN TÙ TÌ',
    rightTop: '1 VS 1 · HAND DUEL · FAIR PLAY',
    titleLines: ['OẲN', 'TÙ TÌ'],
    secondary: HEX.neon,
    accent,
    kicker: `CƯỢC · ${fmtNum(bet)} COIN`,
    pickText: `BẠN RA · ${p.label}`,
    result: tie ? 'HOÀ' : win ? 'THẮNG' : 'THUA',
    resultColor: tie ? HEX.gold : win ? accent : '#FFFFFF',
    money: tie ? 'HOÀ · HOÀN CƯỢC' : win ? `LỜI +${fmtNum(net)} COIN` : `MẤT ${fmtNum(bet)} COIN`,
    bet,
    balance,
    stats,
    rightLabel: 'BẠN VS BOT',
    rightCaption: `${p.label} VS ${b.label} · ${tie ? 'HOÀ' : win ? 'BẠN THẮNG' : 'BOT THẮNG'}`,
    scene: (ctx) => {
      drawDuelTile(ctx, {
        x: 420, y: 165, w: 280, h: 250,
        label: 'BẠN', type: player,
        color: p.color,
        border: tie ? HEX.gold : win ? accent : p.color,
        glow: win || tie,
        badge: 'PLAYER'
      });
      drawDuelTile(ctx, {
        x: 820, y: 165, w: 280, h: 250,
        label: 'BOT', type: bot,
        color: b.color,
        border: tie ? HEX.gold : !win ? accent : b.color,
        glow: !win || tie,
        badge: 'CPU'
      });
      art.sticker(ctx, {
        x: 760, y: 290, text: 'VS',
        size: 22, fill: HEX.gold, color: HEX.ink,
        rotate: -0.08, shadow: true
      });
    },
    stamp: { top: 'DUEL', big: tie ? 'TIE' : win ? 'WIN' : 'LOSE', bottom: '1V1' },
    footer: 'HIỂU UYÊN · OẲN TÙ TÌ · KÉO BÚA BAO · 1V1',
    seed
  });
}

function generateGuessCard({ choice = 1, bot = 1, bet = 0, net = 0, win = false, balance = 0, stats = {} }) {
  const accent = win ? HEX.lime : HEX.blood;
  const seed = art.hashStr(`doanso:${choice}:${bot}:${net}`);

  return renderCard({
    header: 'ĐOÁN SỐ',
    rightTop: '1–6 · 30% HIT · x3 PAYOUT',
    titleLines: ['ĐOÁN', 'SỐ'],
    secondary: HEX.cyber,
    accent,
    kicker: `CƯỢC · ${fmtNum(bet)} COIN`,
    pickText: `BẠN ĐOÁN · ${choice}`,
    result: win ? 'TRÚNG' : 'TRƯỢT',
    resultColor: win ? accent : '#FFFFFF',
    money: win ? `LỜI +${fmtNum(net)} COIN` : `MẤT ${fmtNum(bet)} COIN`,
    bet,
    balance,
    stats,
    rightLabel: 'BẠN VS BOT',
    rightCaption: `BOT RA ${bot} · BẠN ĐOÁN ${choice} · ${win ? 'TRÚNG' : 'TRƯỢT'}`,
    scene: (ctx) => {
      drawNumberTile(ctx, {
        x: 430, y: 170, w: 260, h: 250,
        label: 'BẠN', value: choice, color: HEX.cyber,
        border: win ? accent : HEX.cyber,
        glow: win,
        active: win
      });
      drawNumberTile(ctx, {
        x: 790, y: 170, w: 260, h: 250,
        label: 'BOT', value: bot, color: HEX.hot,
        border: !win ? accent : HEX.hot,
        glow: !win,
        active: !win
      });
      art.sticker(ctx, {
        x: 740, y: 295, text: 'VS',
        size: 22, fill: HEX.gold, color: HEX.ink,
        rotate: -0.08, shadow: true
      });
    },
    stamp: { top: 'PAYOUT', big: win ? 'x3' : 'x0', bottom: 'HIT' },
    footer: 'HIỂU UYÊN · ĐOÁN SỐ · 1–6 · x3 PAYOUT',
    seed
  });
}

module.exports = {
  generateTaiXiuCard,
  generateRPSSCard,
  generateGuessCard,
  TAIXIU_CARD_FILE,
  RPS_CARD_FILE,
  GUESS_CARD_FILE
};
