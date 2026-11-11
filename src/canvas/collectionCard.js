// =============================================
// COLLECTION CARD — poster bộ sưu tập gacha (1100x880)
// =============================================

const { createCanvas, font } = require('./engine');
const art = require('./art');
const { HEX, rarityMeta } = require('../ui/theme');
const { CARDS, RARITY_ORDER, rarityRank } = require('../data/cards');

const fit = (ctx, text, maxWidth, start, family = 'body', weight = 'bold') => {
  let size = start;
  ctx.font = font(size, weight, family);
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 1;
    ctx.font = font(size, weight, family);
  }
  return size;
};

/**
 * @param {{username:string, owned:Array, summary:object}} opts
 */
async function generateCollectionCard({ username = 'player', owned = [], summary = {} }) {
  const W = 1100, H = 880;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const seed = art.hashStr(`collection:${username}`);
  const unique = summary.unique ?? owned.length;
  const all = summary.all ?? CARDS.length;
  const completion = summary.completion ?? Math.round((unique / all) * 100);

  const ownedMap = new Map(owned.map(row => [row.card.id, row]));
  const cards = CARDS.slice().sort((a, b) => {
    const byRarity = rarityRank(b.rarity) - rarityRank(a.rarity);
    return byRarity !== 0 ? byRarity : a.name.localeCompare(b.name);
  });

  art.bgPoster(ctx, {
    w: W, h: H, seed,
    accent: HEX.neon, accent2: HEX.cyber, accent3: HEX.hot
  });
  art.bricks(ctx, { w: W, h: H, alpha: 0.04, color: '#FFFFFF', step: 76, rowH: 33 });
  art.spray(ctx, { cx: W - 120, cy: 116, r: 200, color: HEX.cyber, seed: seed + 8, alpha: 0.18 });
  art.sparkles(ctx, { w: W, h: 460, seed: seed + 4, count: 20, color: '#ffffff' });
  art.frame(ctx, { w: W, h: H, color: HEX.cyber, inset: 16, alpha: 0.5, width: 1.5 });

  // ── header ──
  ctx.textAlign = 'left';
  ctx.fillStyle = HEX.cyber;
  ctx.font = font(12, 'bold', 'mono');
  ctx.fillText('MIXTAPE ARCHIVE  //  ANIME GENZ HIPHOP', 58, 56);

  art.outlineText(ctx, {
    text: 'BỘ SƯU TẬP', x: 56, y: 122,
    size: fit(ctx, 'BỘ SƯU TẬP', 560, 58),
    fill: '#FFFFFF', stroke: HEX.ink, offset: 4, align: 'left'
  });

  art.tagLine(ctx, { x: 58, y: 136, w: 330, color: HEX.lime, width: 5, seed: seed + 2, alpha: 0.8 });

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = font(15, 'bold', 'body');
  ctx.fillText(`@${String(username).slice(0, 26)}`, 58, 154);

  // stamp %
  art.burst(ctx, {
    cx: W - 132, cy: 112, r: 98, points: 16,
    fill: HEX.hot, stroke: HEX.ink, rotate: -0.1, alpha: 0.22, lineWidth: 3
  });
  art.stamp(ctx, {
    x: W - 132, y: 112, r: 66,
    top: 'COLLECTION', big: `${completion}%`, bottom: `${unique}/${all}`,
    color: completion >= 100 ? HEX.gold : HEX.neon, rotate: -0.1
  });

  // ── rarity chips ──
  let chipX = 58;
  const chipY = 192;
  for (const rarity of RARITY_ORDER.slice().reverse()) {
    const meta = rarityMeta(rarity);
    const count = summary.byRarity?.[rarity] || 0;
    const label = `${rarity} ${count}`;
    ctx.font = font(12, 'bold', 'mono');
    const w = ctx.measureText(label).width + 26;

    art.roundRect(ctx, chipX, chipY - 14, w, 28, 8);
    ctx.fillStyle = count
      ? art.rgba(meta.hex, 0.22)
      : 'rgba(255,255,255,0.055)';
    ctx.fill();
    ctx.strokeStyle = count ? art.rgba(meta.hex, 0.75) : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    art.roundRect(ctx, chipX, chipY - 14, w, 28, 8);
    ctx.stroke();

    ctx.fillStyle = count ? meta.hex : 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'left';
    ctx.fillText(label, chipX + 13, chipY + 5);

    chipX += w + 10;
  }

  // completion bar
  art.bar(ctx, {
    x: 58, y: 224, w: 420, h: 10,
    pct: unique / all, from: HEX.cyber, to: HEX.hot, stripes: false
  });

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = font(12, 'normal', 'mono');
  ctx.textAlign = 'left';
  ctx.fillText(`ĐÃ MỞ ${unique}/${all} LOẠI`, 500, 234);

  // ── grid 4 x 4 ──
  const cols = 4;
  const gap = 16;
  const tileW = Math.floor((W - 116 - gap * (cols - 1)) / cols);
  const tileH = 122;
  const startX = 58;
  const startY = 268;

  cards.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (tileW + gap);
    const y = startY + row * (tileH + gap);

    const meta = rarityMeta(card.rarity);
    const ownedRow = ownedMap.get(card.id);
    const isOwned = !!ownedRow;

    // tile background
    const grad = ctx.createLinearGradient(x, y, x + tileW, y + tileH);
    grad.addColorStop(0, art.mixHex(meta.hex, '#0B0A12', isOwned ? 0.74 : 0.9));
    grad.addColorStop(1, 'rgba(8,6,14,0.96)');
    art.roundRect(ctx, x, y, tileW, tileH, 14);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = isOwned ? art.rgba(meta.hex, 0.85) : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = isOwned ? 1.8 : 1;
    art.roundRect(ctx, x, y, tileW, tileH, 14);
    ctx.stroke();

    // rarity label + count
    ctx.textAlign = 'left';
    ctx.fillStyle = isOwned ? meta.hex : 'rgba(255,255,255,0.34)';
    ctx.font = font(10, 'bold', 'mono');
    ctx.fillText(meta.label, x + 14, y + 22);

    if (isOwned && ownedRow.count > 1) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = font(11, 'bold', 'mono');
      ctx.fillText(`x${ownedRow.count}`, x + tileW - 14, y + 22);
    }

    // name
    ctx.textAlign = 'left';
    ctx.fillStyle = isOwned ? '#FFFFFF' : 'rgba(255,255,255,0.34)';
    const name = isOwned ? card.name : '???';
    ctx.font = font(fit(ctx, name, tileW - 28, 17), 'bold', 'body');
    ctx.fillText(name, x + 14, y + 58);

    // element
    ctx.fillStyle = isOwned ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.22)';
    ctx.font = font(10, 'normal', 'body');
    ctx.fillText(isOwned ? card.element : 'CHƯA MỞ KHOÁ', x + 14, y + 78);

    // stars
    if (isOwned) {
      const stars = ['N', 'R', 'SR', 'SSR', 'UR'].indexOf(card.rarity) + 1;
      for (let s = 0; s < stars; s++) {
        art.star4(ctx, x + 20 + s * 16, y + tileH - 22, 5, meta.hex, 0.95);
      }
    } else {
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.font = font(10, 'bold', 'mono');
      ctx.fillText('LOCKED', x + tileW - 14, y + tileH - 18);
    }
  });

  art.tape(ctx, {
    x: -20, y: H - 48, w: W + 40, h: 26,
    text: 'HIỂU UYÊN MIXTAPE DECK · MỞ ĐỦ 13 THẺ LÀ FLEX CẢ SERVER',
    fill: HEX.cyber, color: HEX.ink, size: 12, rotate: 0.004
  });

  return canvas.toBuffer('image/png');
}

module.exports = { generateCollectionCard };
