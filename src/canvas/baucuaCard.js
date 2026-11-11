// =============================================
// BẦU CUA CARD — poster kết quả 3 xúc xắc linh vật
// =============================================

const { createCanvas, font } = require('./engine');
const art = require('./art');
const { HEX, fmtNum } = require('../ui/theme');

const W = 1200;
const H = 630;
const FILE_NAME = 'baucua-card.png';

const ANIMALS = {
  bau: { label: 'BẦU', color: HEX.gold },
  cua: { label: 'CUA', color: HEX.hot },
  tom: { label: 'TÔM', color: HEX.orange },
  ca: { label: 'CÁ', color: HEX.cyber },
  ga: { label: 'GÀ', color: HEX.lime },
  nai: { label: 'NAI', color: HEX.neon }
};

function paint(ctx, color) {
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = HEX.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawAnimal(ctx, type, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (type === 'bau') {
    ctx.beginPath();
    ctx.ellipse(0, 12, 32, 36, 0, 0, Math.PI * 2);
    paint(ctx, color);
    ctx.beginPath();
    ctx.ellipse(0, -28, 21, 25, 0, 0, Math.PI * 2);
    paint(ctx, color);
    ctx.beginPath();
    ctx.moveTo(-7, -51);
    ctx.quadraticCurveTo(2, -64, 12, -52);
    ctx.strokeStyle = HEX.ink;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-10, -7, 14, Math.PI * 1.1, Math.PI * 1.55);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 4;
    ctx.stroke();
  } else if (type === 'cua') {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(dir * 42, -12, 14, 11, dir * 0.35, 0, Math.PI * 2);
      paint(ctx, color);
      ctx.beginPath();
      ctx.moveTo(dir * 50, -20);
      ctx.lineTo(dir * 36, -12);
      ctx.strokeStyle = HEX.ink;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dir * 20, 27);
      ctx.lineTo(dir * 35, 47);
      ctx.moveTo(dir * 8, 32);
      ctx.lineTo(dir * 15, 53);
      ctx.strokeStyle = HEX.ink;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(0, 9, 34, 25, 0, 0, Math.PI * 2);
    paint(ctx, color);
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * 13, -16, 5, 0, Math.PI * 2);
      ctx.fillStyle = HEX.ink;
      ctx.fill();
    }
  } else if (type === 'tom') {
    ctx.beginPath();
    ctx.moveTo(-34, 29);
    ctx.quadraticCurveTo(-48, -7, -20, -32);
    ctx.quadraticCurveTo(12, -54, 34, -18);
    ctx.quadraticCurveTo(49, 15, 12, 34);
    ctx.quadraticCurveTo(-14, 44, -34, 29);
    ctx.closePath();
    paint(ctx, color);

    ctx.beginPath();
    ctx.moveTo(-17, -28);
    ctx.quadraticCurveTo(1, -6, -12, 30);
    ctx.moveTo(2, -35);
    ctx.quadraticCurveTo(20, -8, 4, 34);
    ctx.moveTo(21, -28);
    ctx.quadraticCurveTo(35, -4, 22, 27);
    ctx.strokeStyle = 'rgba(8,7,12,0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(30, -18);
    ctx.quadraticCurveTo(56, -36, 47, -52);
    ctx.moveTo(34, -12);
    ctx.quadraticCurveTo(62, -23, 58, -40);
    ctx.strokeStyle = HEX.ink;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(26, -21, 5, 0, Math.PI * 2);
    ctx.fillStyle = HEX.ink;
    ctx.fill();
  } else if (type === 'ca') {
    ctx.beginPath();
    ctx.moveTo(-50, 0);
    ctx.lineTo(-27, -22);
    ctx.lineTo(-27, 22);
    ctx.closePath();
    paint(ctx, color);
    ctx.beginPath();
    ctx.ellipse(5, 0, 37, 23, 0, 0, Math.PI * 2);
    paint(ctx, color);
    ctx.beginPath();
    ctx.moveTo(-10, -20);
    ctx.lineTo(4, -38);
    ctx.lineTo(15, -19);
    ctx.moveTo(-9, 20);
    ctx.lineTo(3, 36);
    ctx.lineTo(14, 19);
    ctx.strokeStyle = HEX.ink;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(22, -7, 5, 0, Math.PI * 2);
    ctx.fillStyle = HEX.ink;
    ctx.fill();
  } else if (type === 'ga') {
    ctx.beginPath();
    ctx.ellipse(0, -2, 26, 29, 0, 0, Math.PI * 2);
    paint(ctx, color);
    for (const [dx, dy, r] of [[-13, -31, 9], [0, -37, 10], [13, -31, 9]]) {
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      paint(ctx, color);
    }
    ctx.beginPath();
    ctx.moveTo(22, 2);
    ctx.lineTo(43, 10);
    ctx.lineTo(22, 18);
    ctx.closePath();
    paint(ctx, HEX.gold);
    ctx.beginPath();
    ctx.arc(23, 23, 7, 0, Math.PI * 2);
    paint(ctx, HEX.blood);
    ctx.beginPath();
    ctx.arc(11, -7, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = HEX.ink;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, 10, 24, 29, 0, 0, Math.PI * 2);
    paint(ctx, color);
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(dir * 25, -8, 10, 18, dir * 0.45, 0, Math.PI * 2);
      paint(ctx, color);
      ctx.beginPath();
      ctx.moveTo(dir * 8, -17);
      ctx.lineTo(dir * 15, -48);
      ctx.moveTo(dir * 15, -32);
      ctx.lineTo(dir * 30, -42);
      ctx.moveTo(dir * 12, -42);
      ctx.lineTo(dir * 24, -55);
      ctx.strokeStyle = HEX.ink;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(-8, 2, 3.5, 0, Math.PI * 2);
    ctx.arc(8, 2, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = HEX.ink;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 27, 7, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = HEX.ink;
    ctx.fill();
  }

  ctx.restore();
}

function drawDie(ctx, { x, y, key, index, selected, accent }) {
  const w = 210;
  const h = 230;
  const animal = ANIMALS[key];
  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(index === 1 ? 0.018 : index === 2 ? -0.012 : -0.008);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  art.roundRect(ctx, -w / 2, -h / 2, w, h, 18);
  ctx.fillStyle = 'rgba(12,9,20,0.96)';
  ctx.fill();
  ctx.restore();

  if (selected) {
    ctx.save();
    art.roundRect(ctx, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 15);
    ctx.fillStyle = art.rgba(animal.color, 0.12);
    ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = selected ? accent : 'rgba(255,255,255,0.22)';
  ctx.lineWidth = selected ? 4 : 2;
  if (selected) {
    ctx.shadowColor = accent;
    ctx.shadowBlur = 22;
  }
  art.roundRect(ctx, -w / 2, -h / 2, w, h, 18);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = 'left';
  ctx.fillStyle = selected ? accent : 'rgba(255,255,255,0.45)';
  ctx.font = font(10, 'bold', 'mono');
  ctx.fillText(`DIE 0${index + 1}`, -w / 2 + 18, -h / 2 + 29);

  if (selected) {
    art.roundRect(ctx, w / 2 - 74, -h / 2 + 15, 58, 20, 7);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.fillStyle = HEX.ink;
    ctx.font = font(8, 'bold', 'mono');
    ctx.textAlign = 'center';
    ctx.fillText('TRÚNG', w / 2 - 45, -h / 2 + 29);
  }

  drawAnimal(ctx, key, 0, -3, 96, animal.color);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = font(25, 'bold', 'body');
  ctx.fillText(animal.label, 0, h / 2 - 34);

  ctx.fillStyle = selected ? accent : 'rgba(255,255,255,0.25)';
  ctx.fillRect(-24, h / 2 - 22, 48, 3);

  ctx.restore();
}

function render({ dice = [], choice = 'bau', hits = 0, bet = 0, net = 0, balance = 0, stats = {} }) {
  const win = hits > 0;
  const pick = ANIMALS[choice] || ANIMALS.bau;
  const accent = win ? HEX.lime : HEX.blood;
  const title = hits === 3 ? 'NỔ 3' : hits === 2 ? 'TRÚNG 2' : hits === 1 ? 'TRÚNG 1' : 'TRƯỢT';
  const seed = art.hashStr(`baucua:${dice.join('-')}:${choice}:${net}`);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  art.bgPoster(ctx, {
    w: W, h: H, seed,
    accent: pick.color, accent2: accent, accent3: HEX.cyber
  });
  art.bricks(ctx, { w: W, h: H, alpha: 0.04, color: '#FFFFFF', step: 74, rowH: 32 });
  art.spray(ctx, { cx: 280, cy: 240, r: 300, color: pick.color, seed: seed + 1, alpha: 0.22 });
  art.spray(ctx, { cx: 930, cy: 430, r: 320, color: accent, seed: seed + 2, alpha: 0.12 });
  art.splatter(ctx, { cx: 1050, cy: 110, maxR: 180, color: accent, seed: seed + 3, alpha: 0.24 });
  art.sparkles(ctx, { w: W, h: 430, count: 22, seed: seed + 4 });
  art.frame(ctx, { w: W, h: H, color: accent, inset: 14, alpha: 0.55, width: 1.5 });

  ctx.textAlign = 'left';
  ctx.fillStyle = HEX.cyber;
  ctx.font = font(12, 'bold', 'mono');
  ctx.fillText('HIỂU UYÊN  //  BẦU CUA', 64, 54);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = font(11, 'normal', 'mono');
  ctx.fillText('3 DICE · 6 LINH VẬT · ALL IN VIBE', W - 64, 54);

  art.outlineText(ctx, {
    text: 'BẦU', x: 64, y: 168, size: 94,
    fill: '#FFFFFF', stroke: HEX.ink, offset: 5
  });
  art.outlineText(ctx, {
    text: 'CUA', x: 64, y: 258, size: 94,
    fill: pick.color, stroke: HEX.ink, offset: 5
  });
  art.tagLine(ctx, { x: 68, y: 286, w: 270, color: accent, width: 6, seed: seed + 6 });

  ctx.textAlign = 'left';
  ctx.fillStyle = accent;
  ctx.font = font(12, 'bold', 'mono');
  ctx.fillText(`VÁN CƯỢC · ${fmtNum(bet)} COIN`, 66, 324);

  art.sticker(ctx, {
    x: 194, y: 362,
    text: `BẠN CHỌN · ${pick.label}`,
    size: 14,
    fill: pick.color,
    color: HEX.ink,
    family: 'body',
    padX: 16,
    padY: 8,
    rotate: -0.03,
    shadow: true
  });

  art.outlineText(ctx, {
    text: title, x: 64, y: 452,
    size: 58,
    fill: win ? accent : '#FFFFFF',
    stroke: HEX.ink, offset: 4
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = win ? accent : HEX.blood;
  ctx.font = font(22, 'bold', 'body');
  ctx.fillText(win ? `LỜI +${fmtNum(net)} COIN` : `MẤT ${fmtNum(bet)} COIN`, 66, 489);

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = font(12, 'normal', 'mono');
  ctx.fillText(`SỐ DƯ · ${fmtNum(balance)} COIN`, 66, 520);
  ctx.fillText(`VÁN ${stats.played || 0} · THẮNG ${stats.won || 0} · LÃI/LỖ ${stats.profit >= 0 ? '+' : ''}${fmtNum(stats.profit || 0)}`, 66, 541);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = font(11, 'bold', 'mono');
  ctx.fillText('KẾT QUẢ 03 XÚC XẮC', 414, 146);

  const xs = [400, 650, 900];
  dice.forEach((key, index) => {
    drawDie(ctx, {
      x: xs[index], y: 170, key, index,
      selected: key === choice,
      accent
    });
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = font(12, 'normal', 'mono');
  ctx.fillText(`${pick.label} XUẤT HIỆN ${hits}/3 LẦN · THƯỞNG 1:${hits || 0}`, 414, 438);

  art.stamp(ctx, {
    x: 1090, y: 505, r: 62,
    top: 'PAYOUT',
    big: `x${hits}`,
    bottom: 'HITS',
    color: accent,
    rotate: -0.12
  });

  art.tape(ctx, {
    x: 20, y: H - 34, w: W - 40, h: 28,
    text: 'HIỂU UYÊN · BẦU CUA · 3 DICE · 6 LINH VẬT · NO SKIP',
    fill: accent, color: HEX.ink, size: 11, rotate: -0.003
  });

  return canvas.toBuffer('image/png');
}

function generateBaucuaCard(data = {}) {
  return render(data);
}

module.exports = { generateBaucuaCard, BAU_CUA_CARD_FILE: FILE_NAME };
