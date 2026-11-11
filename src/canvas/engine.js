// =============================================
// CANVAS ENGINE — loader cho @napi-rs/canvas
// (fallback về node-canvas nếu máy chưa có napi)
// =============================================

let lib = null;
let engineName = '';

try {
  lib = require('@napi-rs/canvas');
  engineName = '@napi-rs/canvas';
} catch {
  try {
    lib = require('canvas');
    engineName = 'canvas';
  } catch {
    lib = null;
  }
}

if (!lib) {
  throw new Error(
    'Không tìm thấy canvas engine. Cài đặt: npm i @napi-rs/canvas'
  );
}

const { createCanvas, GlobalFonts } = lib;

// ── Font stack ────────────────────────────────
// Display: chữ Latin in đậm kiểu graffiti (Impact / Anton / Oswald)
// Body: font hỗ trợ tiếng Việt đầy đủ (Segoe UI / Inter / Arial)
const hasFont = (name) => {
  try { return GlobalFonts.has(name); } catch { return false; }
};

const pickFont = (candidates, fallback) => candidates.find(hasFont) || fallback;

const DISPLAY = pickFont(
  ['Anton', 'Impact', 'Oswald', 'Archivo Black', 'Arial Black', 'Segoe UI'],
  'sans-serif'
);
const BODY = pickFont(
  ['Segoe UI', 'Inter', 'Be Vietnam Pro', 'Arial', 'Tahoma'],
  'sans-serif'
);
const MONO = pickFont(['Consolas', 'Cascadia Mono', 'Courier New'], 'monospace');

const font = (size, weight = 'normal', family = 'body') => {
  const fam = family === 'display' ? DISPLAY : family === 'mono' ? MONO : BODY;
  return `${weight} ${Math.round(size)}px "${fam}"`;
};

// ── Path helpers ──────────────────────────────
function roundRectPath(ctx, x, y, w, h, r = 12) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

const fillRound = (ctx, x, y, w, h, r, fill) => {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
};

const strokeRound = (ctx, x, y, w, h, r, stroke, width = 2) => {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
};

// ── Image loading (avatar) ────────────────────
const imageCache = new Map();
const MAX_CACHE = 300;

/**
 * Load ảnh từ URL (Discord CDN) hoặc Buffer.
 * Có cache để tránh fetch lặp lại trong 1 card.
 */
async function loadImageSafe(input) {
  if (!input) return null;

  if (Buffer.isBuffer(input)) {
    try { return await lib.loadImage(input); } catch { return null; }
  }

  const key = String(input);
  if (imageCache.has(key)) return imageCache.get(key);

  let image = null;
  try {
    if (typeof fetch === 'function') {
      const res = await fetch(key, { headers: { 'User-Agent': 'hieu-uyen-bot/2.0' } });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        image = await lib.loadImage(buf);
      }
    } else {
      image = await lib.loadImage(key);
    }
  } catch {
    image = null;
  }

  if (imageCache.size > MAX_CACHE) imageCache.clear();
  imageCache.set(key, image);
  return image;
}

/**
 * Vẽ avatar hình tròn với viền neon + glow.
 * Nếu load lỗi → vẽ chữ cái đầu trên nền gradient.
 */
async function drawAvatar(ctx, { url, cx, cy, r, ring = '#FF2D95', ring2 = '#22D3EE', label = '?' }) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const img = await loadImageSafe(url);
  if (img) {
    // cover fit
    const ratio = Math.max((r * 2) / img.width, (r * 2) / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, ring);
    g.addColorStop(1, ring2);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = font(r * 0.9, 'bold', 'display');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(label || '?').charAt(0).toUpperCase(), cx, cy + r * 0.05);
  }
  ctx.restore();

  // Neon ring
  ctx.save();
  ctx.shadowColor = ring;
  ctx.shadowBlur = r * 0.35;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.strokeStyle = ring;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();

  // Outer dashed accent ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 13, 0, Math.PI * 2);
  ctx.strokeStyle = ring2;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  ctx.stroke();
  ctx.restore();
}

// ── Export ────────────────────────────────────
module.exports = {
  ...lib,
  engineName,
  createCanvas,
  loadImage: lib.loadImage,
  loadImageSafe,
  drawAvatar,
  font,
  FONTS: { DISPLAY, BODY, MONO },
  roundRectPath,
  fillRound,
  strokeRound
};
