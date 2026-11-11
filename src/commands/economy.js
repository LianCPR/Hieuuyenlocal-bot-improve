// =============================================
// ECONOMY COMMANDS — daily streak & shop UI
// =============================================

const {
  SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags
} = require('discord.js');

const theme = require('../ui/theme');
const { C, fmtNum, rarityMeta } = theme;
const {
  getOrCreateUser, addXp, claimDaily, getUser
} = require('../database/models/users');
const {
  getShopItems, purchaseItem, equipItem, getUserInventory, getShopItem
} = require('../database/models/economy');
const { unlockAchievement } = require('../database/models/achievements');
const { progressQuest } = require('../database/models/quests');

const EPH = { flags: MessageFlags.Ephemeral };

const TYPE_NAMES = {
  border: '🖼️ Viền profile',
  theme: '🎨 Theme card',
  badge: '🏅 Huy hiệu',
  namecolor: '✏️ Màu tên'
};

const TYPE_EMOJI = {
  border: '🖼️', theme: '🎨', badge: '🏅', namecolor: '✏️'
};

const TYPE_LABELS = {
  border: 'Viền profile', theme: 'Theme card', badge: 'Huy hiệu', namecolor: 'Màu tên'
};

/** Mỗi loại item một menu riêng — nhìn như các kệ hàng, đỡ phải scroll một list dài */
function buildTypeMenus(items, mode) {
  const groups = {};
  for (const item of items) {
    const type = item.itemType || 'other';
    if (!groups[type]) groups[type] = [];
    groups[type].push(item);
  }

  return Object.entries(groups).slice(0, 5).map(([type, list]) => {
    const options = list.slice(0, 25).map(item => {
      const r = rarityMeta(item.rarity);

      if (mode === 'equip') {
        return {
          label: `${item.itemName}${item.equipped ? ' · đang dùng' : ''}`.slice(0, 100),
          value: String(item.inventoryId),
          description: `${r.label} · ${TYPE_NAMES[type] || type}`.slice(0, 100),
          emoji: item.equipped ? '✅' : r.emoji
        };
      }

      return {
        label: `${item.itemName} · ${fmtNum(item.price)}`.slice(0, 100),
        value: item.itemId,
        description: `${r.label} · ${item.description || TYPE_NAMES[type] || type}`.slice(0, 100),
        emoji: r.emoji
      };
    });

    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`shop_${mode}:${type}`)
        .setPlaceholder(`${TYPE_EMOJI[type] || '✦'} ${TYPE_LABELS[type] || type} · ${list.length} món`)
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options)
    );
  });
}

// ── DAILY ─────────────────────────────────────
const dailyCommand = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('🎁 Điểm danh nhận coin + XP (streak càng dài càng lời)'),

  async execute(interaction) {
    getOrCreateUser(interaction.user.id, interaction.user.username);
    const result = claimDaily(interaction.user.id);

    if (!result) {
      return interaction.reply({ embeds: [theme.errorEmbed('Chưa có dữ liệu', 'Thử lại sau nhé!')], ...EPH });
    }

    if (!result.claimed) {
      const ms = result.nextClaim - Date.now();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);

      return interaction.reply({
        embeds: [theme.warnEmbed(
          'Điểm danh rồi nha',
          [
            `Bạn đã nhận thưởng hôm nay rồi.`,
            '',
            theme.field('Quay lại sau', `**${h}h ${m}m**`),
            theme.field('Streak hiện tại', `🔥 **${result.streak || 1} ngày**`),
            '',
            theme.quote('giữ streak đi, đừng để aura rơi')
          ].join('\n')
        )],
        ...EPH
      });
    }

    const xpResult = addXp(interaction.user.id, result.xp);
    progressQuest(interaction.user.id, 'daily');
    const user = getUser(interaction.user.id);

    // achievements theo streak
    const unlocked = [];
    if (result.streak >= 7) {
      const a = unlockAchievement(interaction.user.id, 'daily_7');
      if (a) unlocked.push(a);
    }
    if (result.streak >= 30) {
      const a = unlockAchievement(interaction.user.id, 'daily_30');
      if (a) unlocked.push(a);
    }

    const nextMilestone = result.streak >= 30 ? 30 : result.streak >= 7 ? 30 : 7;
    const embed = theme.successEmbed(
      'ĐIỂM DANH XONG',
      [
        theme.header('DAILY REWARD', theme.hype('daily')),
        theme.field('Coins', `**+${fmtNum(result.coins)}** 💰`),
        theme.field('XP', `**+${fmtNum(result.xp)}** ⭐`),
        theme.field('Streak', `🔥 **${result.streak} ngày**${result.bonus ? ` · bonus +${result.bonus} coin` : ''}`),
        '',
        `**${theme.bar(result.streak, nextMilestone, 14)}** ${result.streak}/${nextMilestone} tới mốc thưởng`,
        xpResult?.leveled ? `\n> 🌟 **LEVEL UP!** Bạn giờ là **Level ${xpResult.newLevel}**` : '',
        unlocked.length ? `\n**Mở khoá:** ${unlocked.map(a => `${a.badgeIcon} ${a.name}`).join(' · ')}` : '',
        '',
        theme.field('Số dư', `**${fmtNum(user?.coins || 0)} coins**`)
      ].filter(Boolean).join('\n')
    );
    embed.setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 256 }));

    await interaction.reply({ embeds: [embed] });
  }
};

// ── SHOP ──────────────────────────────────────
const shopCommand = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('🛒 Shop Hiểu Uyên — theme, viền, huy hiệu')
    .addSubcommand(s => s.setName('list').setDescription('Xem shop + mua bằng menu'))
    .addSubcommand(s =>
      s.setName('buy').setDescription('Mua nhanh một item')
        .addStringOption(o => o.setName('item_id').setDescription('ID item (xem ở /shop list)').setRequired(true))
    )
    .addSubcommand(s => s.setName('inventory').setDescription('Túi đồ + trang bị'))
    .addSubcommand(s =>
      s.setName('equip').setDescription('Trang bị item đã sở hữu')
        .addStringOption(o => o.setName('item_id').setDescription('ID item trong túi').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    getOrCreateUser(interaction.user.id, interaction.user.username);

    if (sub === 'list') {
      const items = getShopItems();
      const grouped = {};
      for (const item of items) {
        if (!grouped[item.itemType]) grouped[item.itemType] = [];
        grouped[item.itemType].push(item);
      }

      const lines = Object.entries(grouped).map(([type, list]) => [
        `**${TYPE_NAMES[type] || type}**`,
        list.map(i => {
          const r = rarityMeta(i.rarity);
          return `${r.emoji} \`${i.itemId}\` **${i.itemName}** — ${fmtNum(i.price)} 💰 · *${r.label}*`;
        }).join('\n')
      ].join('\n'));

      const embed = theme.baseEmbed({
        color: C.neon,
        section: theme.sectionName('shop'),
        title: '🛒 THE VAULT',
        thumbnail: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
        description: [
          theme.header('SHOP HIỂU UYÊN', 'flex là phải có đầu tư'),
          theme.field('Ví của bạn', `**${fmtNum(getUser(interaction.user.id)?.coins || 0)} coin**`),
          theme.field('Kệ hàng', `**${items.length}** món · **${Object.keys(grouped).length}** loại`),
          '',
          lines.join('\n\n'),
          '',
          '-# mỗi menu bên dưới là một kệ hàng · `/shop inventory` để trang bị'
        ].join('\n')
      });

      const components = buildTypeMenus(items, 'buy');

      await interaction.reply({ embeds: [embed], components, ...EPH });
      return;
    }

    if (sub === 'buy') {
      const itemId = interaction.options.getString('item_id').trim();
      const result = purchaseItem(interaction.user.id, itemId);

      if (!result.success) {
        return interaction.reply({ embeds: [theme.errorEmbed('Không mua được', result.message)], ...EPH });
      }

      const r = rarityMeta(result.item.rarity);
      const embed = theme.successEmbed(
        'MUA THÀNH CÔNG',
        [
          theme.header(result.item.itemName, `${r.label} · ${TYPE_NAMES[result.item.itemType] || result.item.itemType}`),
          result.message,
          '',
          theme.field('Đã trừ', `**${fmtNum(result.item.price)} coins**`),
          `> Dùng \`/shop equip ${result.item.itemId}\` để dùng ngay.`
        ].join('\n')
      );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'inventory') {
      const items = getUserInventory(interaction.user.id);

      if (!items.length) {
        return interaction.reply({
          embeds: [theme.warnEmbed('Túi đồ trống', 'Vào `/shop list` chọn vài món đi nào!')],
          ...EPH
        });
      }

      const embed = theme.baseEmbed({
        color: C.neon,
        section: theme.sectionName('shop'),
        title: '🎒 TÚI ĐỒ CỦA BẠN',
        thumbnail: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
        description: [
          theme.header('INVENTORY', `${items.length} món`),
          items.map(i => {
            const r = rarityMeta(i.rarity);
            return `${i.equipped ? '✅' : r.emoji} \`${i.itemId}\` **${i.itemName}** ${i.equipped ? '*(đang dùng)*' : ''}`;
          }).join('\n'),
          '',
          '-# chọn menu theo loại bên dưới để trang bị'
        ].join('\n')
      });

      await interaction.reply({
        embeds: [embed],
        components: buildTypeMenus(items, 'equip'),
        ...EPH
      });
      return;
    }

    if (sub === 'equip') {
      const itemId = interaction.options.getString('item_id').trim();
      const item = getShopItem(itemId);
      if (!item) {
        return interaction.reply({ embeds: [theme.errorEmbed('Không tìm thấy', 'Item này không tồn tại trong shop.')], ...EPH });
      }

      const owned = getUserInventory(interaction.user.id).find(i => i.itemId === itemId);
      if (!owned) {
        return interaction.reply({ embeds: [theme.warnEmbed('Chưa sở hữu', 'Bạn cần mua item này trước.')], ...EPH });
      }

      const result = equipItem(interaction.user.id, owned.inventoryId);
      if (!result.success) {
        return interaction.reply({ embeds: [theme.errorEmbed('Không trang bị được', result.message)], ...EPH });
      }

      await interaction.reply({
        embeds: [theme.successEmbed('ĐÃ TRANG BỊ', [
          `**${item.itemName}** đang được dùng.`,
          '',
          '> Mở `/profile` để xem thành quả ✨'
        ].join('\n'))]
      });
    }
  }
};

module.exports = [dailyCommand, shopCommand];
