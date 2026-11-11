# 🌸 HIỂU UYÊN — anime · genZ · hiphop

> *Bot tri kỷ cho server Discord của bạn — level, kinh tế, gacha anime, rap battle và một góc để nhắc bạn uống nước.*

<p>
  <b>Discord.js 14</b> · <b>SQLite</b> · <b>Canvas poster</b> · <b>Dashboard realtime</b>
</p>

---

## ✦ Có gì mới ở bản này

Bản này là một lần lột xác toàn diện, không chỉ đổi màu embed:

| Hạng mục | Trước | Bây giờ |
|----------|-------|---------|
| 🎨 Nhận diện | Hồng pastel dễ thương | **Anime · genZ · hiphop poster**: neon magenta/purple/cyan, halftone, speed line, sticker nghiêng, tape chạy chữ |
| 🪪 Profile | Card 900×280 | **Poster 1200×630** với rank stamp, XP bar sọc, 4 stat sticker, avatar neon |
| 🏆 Leaderboard | Embed text | **Ảnh poster 1200×900** có avatar từng người |
| 🎴 Gacha | Không có | **Hệ thống thẻ anime**: 13 thẻ, 5 độ hiếm, bảo hiểm, hoàn coin khi trùng, poster bộ sưu tập |
| 🎤 Rap battle | Không có | **Battle 1v1**: viết bar, cả server vote, thắng có coin/XP/achievement |
| 💘 Ship | Không có | **Ship meter** bằng ảnh, đo chemistry + lưu lịch sử |
| 🖼️ Sticker | Không có | Biến avatar thành **sticker poster** cá nhân |
| 📊 Server check | Không có | **Ảnh tổng quan server** + top crew |
| 💰 Daily | Cố định | **Streak 7/30 ngày**, bonus coin theo chuỗi |
| 🧩 Lệnh | 10 lệnh, 2 lệnh bị "mồ côi" | **27 lệnh**, tự động load, không còn lệnh bị bỏ quên |
| 🌐 Dashboard | Tím pastel | **Poster UI**: marquee, sticker, chart, gacha collectors, live clock |
| 🛠️ Độ ổn định | Lỗi `datetime("now")` trên SQLite mới | Đã sửa, có migration cột, fallback canvas engine |

---

## ✦ Tính năng

### 🪪 Core
- **Profile poster** — level, XP, rank stamp, coin, tin nhắn, thành tựu, streak; theme/viền/màu tên theo item đang trang bị.
- **Leaderboard ảnh** — 4 bảng: XP, coin, tin nhắn, sức khỏe.
- **Thành tựu** — 33 thành tựu, chia 10 nhóm, có tiến độ và phần thưởng tự động.
- **Help tương tác** — menu chọn danh mục, không spam một embed dài.

### 💰 Economy
- **Daily streak** — điểm danh mỗi ngày; streak càng dài bonus càng cao (tối đa +105 coin/ngày).
- **AI chat thật** — `/chat` hoặc mention bot; AI trả lời tiếng Việt, nhớ 12 tin gần nhất, có rate limit và reset ngữ cảnh.
- **4 mini-game cược coin** — Tài Xỉu, Oẳn Tù Tì, Đoán Số, Bầu Cua; có thống kê lãi/lỗ.
- **Card mini-game** — poster kết quả 1200×630 cho Bầu Cua, Tài Xỉu, Oẳn Tù Tì và Đoán Số.
- **Nhiệm vụ hằng ngày** — 3 quest/ngày (chat, daily, quiz, gacha, nước, ship, rap), poster riêng, nhận thưởng bằng nút.
- **Shop UI** — mua bằng select menu, xem túi đồ, trang bị bằng menu.
- **19 vật phẩm** — theme, viền, huy hiệu, màu tên với 5 độ hiếm.

### 💞 Social
- **Tri kỷ** — điểm tình cảm tăng khi tag, react, chơi chung; starmap render thành ảnh.
- **Ship** — đo độ hợp nhau (deterministic theo cặp ID + điểm tình cảm), có ảnh và lịch sử.
- **Rap battle** — thách đấu 1v1, viết bar theo chủ đề + từ khoá, cả server vote 90 giây.
- **Bản tin sao** — `/bantin` tạo poster bầu trời đêm cho hai người.

### 🎮 Games
- **Ma sói** — 4–12 người, đủ role Sói / Dân / Tiên Tri / Bảo Vệ, hành động qua DM.
- **Quiz** — 66 câu, 7 chủ đề (có anime & âm nhạc), streak thưởng thêm.
- **Gacha** — 13 thẻ anime, 5 độ hiếm, multi 10 lượt, bảo hiểm SR/SSR.

### 💧 Life
- **Health coach** — nhắc uống nước 5 khung giờ, nút xác nhận ngay trong chat.
- **Sticker** — avatar thành poster sticker.
- **Server check** — ảnh thống kê server.
- **Hoà giải** — hạ nhiệt tranh luận (cần quyền Manage Messages).

### 🌐 Dashboard
- Bảng xếp hạng 4 loại, top collector gacha, top tri kỷ, nhật ký khoảnh khắc.
- Tự refresh mỗi 30 giây, responsive, có empty state tử tế.
- API JSON cho mọi mục.

---

## ✦ Danh sách lệnh (27)

### Core
| Lệnh | Mô tả |
|------|-------|
| `/profile [user]` | Poster profile cá nhân |
| `/leaderboard [type]` | Bảng xếp hạng dạng ảnh |
| `/thanhtu [user]` | Bộ sưu tập thành tựu |
| `/nhiemvu` | Bảng nhiệm vụ hằng ngày + nhận thưởng |
| `/taixiu <cược> <tài\|xỉu>` | Tài Xỉu 3 xúc xắc, thắng 1:1 |
| `/oanthu <cược> <kéo\|búa\|bao>` | Oẳn Tù Tì với bot, hoà hoàn cược |
| `/doanso <cược> <1-6>` | Đoán số, trúng lời x3 tiền cược |
| `/baucua <cược> <linh_vật>` | Bầu Cua 3 xúc xắc, trúng 1–3 lần ăn theo số lần |
| `/gametop [game] [sort]` | BXH mini-game theo số thắng hoặc lãi ròng |
| `/info [user]` | Thông tin Discord + dữ liệu bot |
| `/chat send\|reset\|status` | Trò chuyện với AI thật, reset ngữ cảnh, xem trạng thái |
| `/help` | Menu hướng dẫn tương tác |

### Economy
| Lệnh | Mô tả |
|------|-------|
| `/daily` | Điểm danh + streak |
| `/shop list` | Shop + menu mua |
| `/shop buy <item_id>` | Mua nhanh |
| `/shop inventory` | Túi đồ + menu trang bị |
| `/shop equip <item_id>` | Trang bị item |

### Social
| Lệnh | Mô tả |
|------|-------|
| `/triky xem <user>` | Xem quan hệ + starmap |
| `/triky danhsach` | Danh sách tri kỷ |
| `/triky top` | Top cặp đôi |
| `/bantin <user>` | Bản tin sao |
| `/ship <user>` | Ship meter |
| `/rapbattle <user> [topic]` | Thách đấu rap |
| `/raptop` | BXH rap battle |

### Games
| Lệnh | Mô tả |
|------|-------|
| `/masoi tao\|tham\|bat\|huy\|vote` | Game ma sói |
| `/quiz [category]` | Quiz 30 giây |
| `/gacha pull [count]` | Quay thẻ (1 hoặc 10) |
| `/gacha collection [user]` | Bộ sưu tập dạng poster |
| `/gacha info` | Tỉ lệ, bảo hiểm, top collector |

### Life & Admin
| Lệnh | Mô tả |
|------|-------|
| `/health water\|streak\|top` | Chăm sóc bản thân |
| `/sticker [tagline]` | Sticker từ avatar |
| `/thongke` | Server check dạng ảnh |
| `/gianghoa` | Hạ nhiệt tranh luận |
| `/setup auto\|channel\|xem` | Cấu hình kênh (Admin) |

---

## ✦ Gacha

| Độ hiếm | Tỉ lệ | Số thẻ |
|---------|-------|--------|
| N | 42% | 2 |
| R | 30% | 3 |
| SR | 18.5% | 3 |
| SSR | 7.5% | 3 |
| UR | 2% | 2 |

- **Giá:** 120 coin/lượt · multi 10 lượt = 1.000 coin.
- **Bảo hiểm:** 10 lượt chắc chắn SR+, 80 lượt chắc chắn SSR+.
- **Multi:** lượt cuối luôn được đẩy lên tối thiểu SR.
- **Thẻ trùng:** tự động hoàn coin theo độ hiếm (25 → 2.200 coin).
- **Achievement:** mở thẻ đầu tiên, đủ 10 thẻ, có SSR, có UR.

---

## ✦ Rap battle

```
/rapbattle @user topic:"deadline 23:59"
   → 2 người bấm nút, mỗi người viết 1 bar (tối đa 200 ký tự)
   → bot mở vote 90 giây, ẩn danh Bar A / Bar B
   → hết giờ: công bố phiếu + thưởng
```

- Thắng: **+150 coin, +100 XP**. Hoà: mỗi người **+80 coin, +60 XP**.
- Người chơi không thể tự vote cho bar của mình.
- Mỗi trận tặng **+15 điểm tình cảm** cho cặp đấu.
- Kèo tự huỷ sau 5 phút nếu thiếu bar.

---

## ✦ Cài đặt

### Yêu cầu
- **Node.js 18+** (khuyến nghị 20 hoặc 22)
- **npm 8+**
- Discord Bot Token

### 1. Cài dependencies

```bash
npm install
```

> Canvas dùng `@napi-rs/canvas` (binary có sẵn, không cần Visual Studio). SQLite dùng `better-sqlite3`; nếu môi trường chặn install script, xem mục **Xử lý sự cố**.

### 2. Cấu hình `.env`

```bash
cp .env.example .env
```

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_client_id

# Dashboard
WEB_PORT=3000

# Tuỳ chọn — bot tự detect kênh nếu bỏ trống
DIARY_CHANNEL_ID=
HEALTH_CHANNEL_ID=

# XP / economy
XP_PER_MESSAGE=5
XP_COOLDOWN_SECONDS=60
XP_VOICE_PER_MINUTE=2
DAILY_COINS=100
DAILY_XP=50

# AI chat (OpenAI-compatible; Z.ai GLM-4.5-Flash có bản miễn phí)
AI_API_KEY=your_ai_api_key
AI_BASE_URL=https://api.z.ai/api/paas/v4
AI_MODEL=glm-4.5-flash
```

### 3. Bật intents

Trong [Discord Developer Portal](https://discord.com/developers/applications) → **Bot**:
- ✅ Server Members Intent
- ✅ Message Content Intent

### 4. Chạy bot

```bash
npm start        # production
npm run dev      # nodemon
```

Lần đầu khởi động, bot tự deploy slash commands cho mọi server và tự tìm kênh báo tường / sức khỏe / chào mừng.

Deploy tay (nếu cần):

```bash
npm run deploy
```

### 5. Xem dashboard

```bash
npm run web      # http://localhost:3000
```

Dashboard tự chạy cùng bot khi dùng `npm start`. Chạy riêng bằng `npm run web` sẽ không cần token Discord (chỉ cần database).

---

## ✦ Cấu trúc

```
src/
├─ index.js                     entry point
├─ commands/
│  ├─ index.js                  loader tự động (mọi file có data + execute)
│  ├─ core.js                   profile, leaderboard, thành tựu, help
│  ├─ economy.js                daily, shop
│  ├─ quests.js                 /nhiemvu + nút nhận thưởng
│  ├─ ai.js                     /chat + mention AI
│  ├─ minigames.js              /taixiu /oanthu /doanso /baucua
│  ├─ info.js                   /info
│  ├─ social.js                 tri kỷ, ship, rap battle, raptop
│  ├─ games.js                  ma sói, quiz, gacha
│  ├─ life.js                   health, hoà giải, sticker, server check
│  ├─ relationship/bantin.js    bản tin sao
│  └─ admin/setup.js            cấu hình kênh
├─ canvas/
│  ├─ engine.js                 loader canvas + avatar loader + font
│  ├─ art.js                    halftone, speed line, sticker, tape, stamp, chibi
│  ├─ profileCard.js            profile poster + level up splash
│  ├─ charts.js                 leaderboard + server card
│  ├─ social.js                 ship, sticker, welcome
│  ├─ starmap.js                bản tin tri kỷ
│  ├─ gachaCard.js              thẻ gacha
│  ├─ collectionCard.js         poster bộ sưu tập
│  └─ questCard.js              poster nhiệm vụ ngày
├─ data/cards.js                catalog thẻ + tỉ lệ + bảo hiểm
├─ data/quests.js               pool nhiệm vụ + chọn theo ngày
├─ ui/theme.js                  design system cho embed
├─ database/
│  ├─ database.js               schema, migration, seed
│  └─ models/                   users, economy, relationships, achievements,
│                               guilds, gacha, battles
├─ games/
│  ├─ werewolf/                 game ma sói
│  ├─ quiz/quizState.js         trạng thái quiz + xử lý trả lời
│  └─ rapbattle/rapBattle.js    flow battle + vote
├─ systems/
│  ├─ level/xpSystem.js         XP, level up, title, achievement
│  └─ diary/weeklyDiary.js      poster báo tường cuối tuần
└─ events/index.js              toàn bộ event Discord

web/
├─ server.js                    Express API + static
└─ public/index.html            dashboard poster UI
```

---

## ✦ Design system

Mọi embed đều đi qua `src/ui/theme.js`:

```js
theme.baseEmbed({ color, title, description, section });
theme.successEmbed('Tiêu đề', 'Mô tả');
theme.errorEmbed('Lỗi', 'Thử lại nhé');
theme.bar(current, max, length);   // ▰▰▰▱▱
theme.field('Label', 'Value');     // > **Label** · Value
```

Mọi ảnh đi qua `src/canvas/art.js`:

```js
art.bgPoster(ctx, { w, h, accent, accent2, accent3 });
art.sticker(ctx, { x, y, text: 'NEW!', fill: HEX.hot, rotate: -0.05 });
art.tape(ctx, { x, y, w, h, text: 'GENZ · ANIME' });
art.stamp(ctx, { x, y, r: 68, top: 'RANK', big: 'SSR', color: HEX.gold });
art.chibi(ctx, { cx, cy, r: 150, palette, accessory: 'catEars' });
```

Muốn đổi vibe toàn bộ bot: sửa palette trong `theme.js` và accent trong từng renderer (hoặc truyền theme riêng cho profile).

---

## ✦ API dashboard

| Endpoint | Mô tả |
|----------|-------|
| `GET /api/stats` | Tổng quan server |
| `GET /api/leaderboard?type=xp&limit=15` | Bảng xếp hạng |
| `GET /api/gacha/top?limit=8` | Top collector |
| `GET /api/rap/top` | BXH rap battle |
| `GET /api/ships/top` | Top ship |
| `GET /api/relationships?limit=8` | Top tri kỷ |
| `GET /api/logs?limit=6` | Khoảnh khắc nổi bật |
| `GET /api/profile/:userId` | Profile + thành tựu |
| `GET /api/users?page=1&limit=20` | Danh sách người dùng |
| `GET /health` | Health check |

---

## ✦ Xử lý sự cố

**`Cannot find module '../build/Release/canvas.node'`**
Bản cũ dùng `node-canvas` (cần build C++). Bản này dùng `@napi-rs/canvas`, đã cài sẵn binary. Nếu vẫn thấy lỗi, chạy `npm i @napi-rs/canvas` và đảm bảo `node_modules/canvas` cũ đã bị xoá.

**`Could not locate the bindings file` (better-sqlite3)**
npm có thể chặn install script. Chạy:

```bash
node node_modules/better-sqlite3/node_modules/prebuild-install/bin.js
# hoặc
cd node_modules/better-sqlite3 && node ../prebuild-install/bin.js
```

Nếu vẫn lỗi, cài Visual Studio Build Tools hoặc chuyển sang Node LTS có prebuild tương thích.

**`no such column: "now"`**
Đã sửa trong bản này (`datetime('now')` dùng nháy đơn). Nếu bạn có code cũ, kiểm tra toàn bộ query tương tự.

**Bot không gửi báo tường**
Chạy `/setup channel loai:diary channel:#kênh` hoặc `/setup auto`.

**Slash commands chưa xuất hiện**
Bot tự deploy khi khởi động; nếu vừa thêm server mới, khởi động lại hoặc chạy `npm run deploy`.

---

## ✦ Bảo mật

- Không lưu token trong code.
- Query dùng prepared statement.
- Rate limit cho API dashboard.
- Cooldown cho mọi slash command.
- Kiểm tra quyền khi hoà giải / setup / huỷ game.
- Không trả role qua kênh công khai trong ma sói.

---

## ✦ License

MIT — dùng, sửa, remix thoải mái.

<div align="center">

**HIỂU UYÊN** · *anime genZ hiphop era*

</div>
