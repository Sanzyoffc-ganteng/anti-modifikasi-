const axios = require("axios");
const fetch = require("node-fetch");
const fs = require("fs");
const { checkMaintenance } = require("../maintenance.js");

const {
    loadJsonData,
    saveJsonData,
    checkCooldown } = require('../lib/function');

const settings = require("../config.js");
const config = require("../config.js");
const { sendCreateNotification } = require("../utils/notify.js");
const OWNER_ID = settings.ownerId;
const ALLOWED_GROUP_ID = settings.groupId;

const {
    domain,
    plta,
    pltc,
    domainV2,
    pltaV2,
    pltcV2,
    domainV3,
    pltaV3,
    pltcV3,
    domainV4,
    pltaV4,
    pltcV4,
    domainV5,
    pltaV5,
    pltcV5,
    eggs,
    loc,
    dev,
    panel
} = settings;

const CADP_FILE = "./db/cadp.json";

// file database
const OWNER_FILE = './db/users/adminID.json';

const OWNERP_FILE = './db/users/ownerID.json';
const PREMIUM_FILE = './db/users/premiumUsers.json';
const PREMV2_FILE = './db/users/version/premiumV2.json';
const PREMV3_FILE = './db/users/version/premiumV3.json';
const PREMV4_FILE = './db/users/version/premiumV4.json';
const PREMV5_FILE = './db/users/version/premiumV5.json';

const RESS_FILE = './db/users/resellerUsers.json';
const RESSV2_FILE = './db/users/version/resellerV2.json';
const RESSV3_FILE = './db/users/version/resellerV3.json';
const RESSV4_FILE = './db/users/version/resellerV4.json';
const RESSV5_FILE = './db/users/version/resellerV5.json';

// ========== HELPER: GENERATE PASSWORD KUAT ==========
function generateSecurePassword(length = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = (bot) => {
// ========== LOCK CREATE ADMIN PANEL ==========
const LOCK_ADP_FILE = './db/lock_adp.json';

// Fungsi untuk cek apakah user adalah owner bot (dari config.js)
function isBotOwner(userId) {
    return String(userId) === String(OWNER_ID);
}

// Fungsi untuk cek status lock
function isAdpLocked() {
    try {
        if (fs.existsSync(LOCK_ADP_FILE)) {
            const data = JSON.parse(fs.readFileSync(LOCK_ADP_FILE));
            return data.locked === true;
        }
    } catch (e) {}
    return false;
}

// Fungsi untuk set status lock
function setAdpLock(locked) {
    if (!fs.existsSync('./db')) fs.mkdirSync('./db');
    fs.writeFileSync(LOCK_ADP_FILE, JSON.stringify({ locked: locked }, null, 2));
}

// ========== LOCK CREATE CADP PER VERSION ==========
const LOCK_CADP_V1_FILE = './db/lock_cadp_v1.json';
const LOCK_CADP_V2_FILE = './db/lock_cadp_v2.json';
const LOCK_CADP_V3_FILE = './db/lock_cadp_v3.json';
const LOCK_CADP_V4_FILE = './db/lock_cadp_v4.json';
const LOCK_CADP_V5_FILE = './db/lock_cadp_v5.json';

// Fungsi cek lock untuk setiap versi
function isCadpLocked(version) {
    const fileMap = {
        v1: LOCK_CADP_V1_FILE,
        v2: LOCK_CADP_V2_FILE,
        v3: LOCK_CADP_V3_FILE,
        v4: LOCK_CADP_V4_FILE,
        v5: LOCK_CADP_V5_FILE
    };
    const file = fileMap[version];
    if (!file) return false;
    try {
        if (fs.existsSync(file)) {
            const data = JSON.parse(fs.readFileSync(file));
            return data.locked === true;
        }
    } catch (e) {}
    return false;
}

// Fungsi set lock untuk setiap versi
function setCadpLock(version, locked) {
    const fileMap = {
        v1: LOCK_CADP_V1_FILE,
        v2: LOCK_CADP_V2_FILE,
        v3: LOCK_CADP_V3_FILE,
        v4: LOCK_CADP_V4_FILE,
        v5: LOCK_CADP_V5_FILE
    };
    const file = fileMap[version];
    if (!file) return;
    if (!fs.existsSync('./db')) fs.mkdirSync('./db');
    fs.writeFileSync(file, JSON.stringify({ locked: locked }, null, 2));
}

//CEK SERVER PANEL
bot.onText(/^\/cekserver$/i, async (msg) => {

  const chatId = msg.chat.id

  // ========== KIRIM PESAN LOADING ==========
  const loadingMsg = await bot.sendMessage(chatId, "⏳ *Mengecek status semua panel...*", {
    parse_mode: 'Markdown'
  })

  // AMBIL DARI CONFIG.JS
  const PANELS = [

    {
      name: 'PANEL V1',
      domain: settings.domain,
      plta: settings.plta
    },

    {
      name: 'PANEL V2',
      domain: settings.domainV2,
      plta: settings.pltaV2
    },

    {
      name: 'PANEL V3',
      domain: settings.domainV3,
      plta: settings.pltaV3
    },

    {
      name: 'PANEL V4',
      domain: settings.domainV4,
      plta: settings.pltaV4
    },

    {
      name: 'PANEL V5',
      domain: settings.domainV5,
      plta: settings.pltaV5
    }

  ]

  let text =
`📊 *STATUS SEMUA PANEL*
━━━━━━━━━━━━━━━━━━━

`

  let totalGlobalUser = 0
  let totalGlobalServer = 0

  for (const panel of PANELS) {

    // PANEL BELUM DI CONFIG
    if (
      !panel.domain ||
      panel.domain === '-' ||
      !panel.plta ||
      panel.plta === '-'
    ) {

      text +=
`⚪ *${panel.name}*
└ Status : ⚠️ Belum dikonfigurasi

`

      continue
    }

    try {

      const start = Date.now()

      const headers = {
        Authorization: `Bearer ${panel.plta}`,
        Accept: 'Application/vnd.pterodactyl.v1+json',
        'Content-Type': 'application/json'
      }

      // GET USERS
      const userRes = await axios.get(
        `${panel.domain}/api/application/users`,
        {
          headers,
          timeout: 15000
        }
      )

      // GET SERVERS
      const serverRes = await axios.get(
        `${panel.domain}/api/application/servers`,
        {
          headers,
          timeout: 15000
        }
      )

      const latency =
        Date.now() - start

      const totalUsers =
        userRes.data.meta?.pagination?.total || 0

      const totalServers =
        serverRes.data.meta?.pagination?.total || 0

      totalGlobalUser += totalUsers
      totalGlobalServer += totalServers

      text +=
`🟢 *${panel.name}*
├ Status       : ONLINE
├ Latency      : ${latency} ms
├ Total User   : ${totalUsers}
└ Total Server : ${totalServers}

`

    } catch (err) {

      let errorMsg =
        err.response?.status ||
        err.code ||
        err.message

      if (err.response?.status === 522) {
        errorMsg = 'HTTP 522'
      }

      else if (err.response?.status === 502) {
        errorMsg = 'HTTP 502'
      }

      else if (err.response?.status === 403) {
        errorMsg = 'API BLOCKED'
      }

      text +=
`🔴 *${panel.name}*
├ Status : OFFLINE
└ Error  : ${errorMsg}

`

    }

  }

  text +=
`━━━━━━━━━━━━━━━━━━━
📈 *RINGKASAN GLOBAL*
├ Total User   : ${totalGlobalUser}
└ Total Server : ${totalGlobalServer}
`

  // ========== EDIT PESAN LOADING JADI HASIL ==========
  await bot.editMessageText(text, {
    chat_id: chatId,
    message_id: loadingMsg.message_id,
    parse_mode: 'Markdown'
  })

})

// ========== LOCK CREATE ADMIN PANEL (HANYA OWNER BOT) ==========
bot.onText(/^\/lockadp$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Hanya OWNER BOT (pemilik bot) yang bisa lock
    if (!isBotOwner(userId)) {
        return bot.sendMessage(chatId, "❌ *AKSES DITOLAK!*\n\nHanya pemilik bot yang bisa mengunci create admin panel!", { parse_mode: "Markdown" });
    }
    
    if (isAdpLocked()) {
        return bot.sendMessage(chatId, "🔒 Create admin panel sudah terkunci!", { parse_mode: "Markdown" });
    }
    
    setAdpLock(true);
    bot.sendMessage(chatId, `
🔒 *CREATE ADMIN PANEL TELAH DIKUNCI!*

━━━━━━━━━━━━━━━━━━━━━
✅ Semua perintah /cadp, /cadpv2, /cadpv3, /cadpv4, /cadpv5 tidak dapat digunakan.
✅ Hanya pemilik bot yang bisa membuka kembali.
━━━━━━━━━━━━━━━━━━━━━

🔓 Untuk membuka, ketik: /unlockadp
`, { parse_mode: "Markdown" });
    
    // Notifikasi ke owner
    bot.sendMessage(OWNER_ID, `🔒 *LOCK CREATE ADP*\n\nUser: ${msg.from.first_name} (${userId})\nTelah mengunci create admin panel.`);
});

bot.onText(/^\/unlockadp$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Hanya OWNER BOT (pemilik bot) yang bisa unlock
    if (!isBotOwner(userId)) {
        return bot.sendMessage(chatId, "❌ *AKSES DITOLAK!*\n\nHanya pemilik bot yang bisa membuka create admin panel!", { parse_mode: "Markdown" });
    }
    
    if (!isAdpLocked()) {
        return bot.sendMessage(chatId, "🔓 Create admin panel tidak dalam keadaan terkunci!", { parse_mode: "Markdown" });
    }
    
    setAdpLock(false);
    bot.sendMessage(chatId, `
🔓 *CREATE ADMIN PANEL TELAH DIBUKA!*

━━━━━━━━━━━━━━━━━━━━━
✅ Semua perintah /cadp, /cadpv2, /cadpv3, /cadpv4, /cadpv5 sudah dapat digunakan kembali.
━━━━━━━━━━━━━━━━━━━━━

🔒 Untuk mengunci, ketik: /lockadp
`, { parse_mode: "Markdown" });
    
    // Notifikasi ke owner
    bot.sendMessage(OWNER_ID, `🔓 *UNLOCK CREATE ADP*\n\nUser: ${msg.from.first_name} (${userId})\nTelah membuka create admin panel.`);
});

// ==========================================
// LOCK /cadp (V1)
// ==========================================
bot.onText(/^\/lockcadpv1$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (!isBotOwner(userId)) {
        return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya Owner bot yang bisa menggunakan command ini.");
    }
    
    if (isCadpLocked('v1')) {
        return bot.sendMessage(chatId, "🔒 /cadp sudah dalam keadaan terkunci!");
    }
    
    setCadpLock('v1', true);
    bot.sendMessage(chatId, "🔒 /cadp TELAH DIKUNCI!\n\n✅ Command /cadp tidak dapat digunakan.\n🔓 Untuk membuka, ketik: /unlockcadp");
    bot.sendMessage(OWNER_ID, `🔒 LOCK /cadp\nUser: ${msg.from.first_name} (${userId})`);
});

bot.onText(/^\/unlockcadp$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (!isBotOwner(userId)) {
        return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya Owner bot yang bisa menggunakan command ini.");
    }
    
    if (!isCadpLocked('v1')) {
        return bot.sendMessage(chatId, "🔓 /cadp tidak dalam keadaan terkunci!");
    }
    
    setCadpLock('v1', false);
    bot.sendMessage(chatId, "🔓 /cadp TELAH DIBUKA!\n\n✅ Command /cadp sudah dapat digunakan kembali.\n🔒 Untuk mengunci, ketik: /lockcadp");
    bot.sendMessage(OWNER_ID, `🔓 UNLOCK /cadp\nUser: ${msg.from.first_name} (${userId})`);
});

// ==========================================
// LOCK /cadpv2 (V2)
// ==========================================
bot.onText(/^\/lockcadpv2$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (!isBotOwner(userId)) {
        return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya Owner bot yang bisa menggunakan command ini.");
    }
    
    if (isCadpLocked('v2')) {
        return bot.sendMessage(chatId, "🔒 /cadpv2 sudah dalam keadaan terkunci!");
    }
    
    setCadpLock('v2', true);
    bot.sendMessage(chatId, "🔒 /cadpv2 TELAH DIKUNCI!\n\n✅ Command /cadpv2 tidak dapat digunakan.\n🔓 Untuk membuka, ketik: /unlockcadpv2");
    bot.sendMessage(OWNER_ID, `🔒 LOCK /cadpv2\nUser: ${msg.from.first_name} (${userId})`);
});

bot.onText(/^\/unlockcadpv2$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (!isBotOwner(userId)) {
        return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya Owner bot yang bisa menggunakan command ini.");
    }
    
    if (!isCadpLocked('v2')) {
        return bot.sendMessage(chatId, "🔓 /cadpv2 tidak dalam keadaan terkunci!");
    }
    
    setCadpLock('v2', false);
    bot.sendMessage(chatId, "🔓 /cadpv2 TELAH DIBUKA!\n\n✅ Command /cadpv2 sudah dapat digunakan kembali.\n🔒 Untuk mengunci, ketik: /lockcadpv2");
    bot.sendMessage(OWNER_ID, `🔓 UNLOCK /cadpv2\nUser: ${msg.from.first_name} (${userId})`);
});

// ==========================================
// LOCK /cadpv3 (V3)
// ==========================================
bot.onText(/^\/lockcadpv3$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (!isBotOwner(userId)) {
        return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya Owner bot yang bisa menggunakan command ini.");
    }
    
    if (isCadpLocked('v3')) {
        return bot.sendMessage(chatId, "🔒 /cadpv3 sudah dalam keadaan terkunci!");
    }
    
    setCadpLock('v3', true);
    bot.sendMessage(chatId, "🔒 /cadpv3 TELAH DIKUNCI!\n\n✅ Command /cadpv3 tidak dapat digunakan.\n🔓 Untuk membuka, ketik: /unlockcadpv3");
    bot.sendMessage(OWNER_ID, `🔒 LOCK /cadpv3\nUser: ${msg.from.first_name} (${userId})`);
});

bot.onText(/^\/unlockcadpv3$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (!isBotOwner(userId)) {
        return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya Owner bot yang bisa menggunakan command ini.");
    }
    
    if (!isCadpLocked('v3')) {
        return bot.sendMessage(chatId, "🔓 /cadpv3 tidak dalam keadaan terkunci!");
    }
    
    setCadpLock('v3', false);
    bot.sendMessage(chatId, "🔓 /cadpv3 TELAH DIBUKA!\n\n✅ Command /cadpv3 sudah dapat digunakan kembali.\n🔒 Untuk mengunci, ketik: /lockcadpv3");
    bot.sendMessage(OWNER_ID, `🔓 UNLOCK /cadpv3\nUser: ${msg.from.first_name} (${userId})`);
});

// ==========================================
// LOCK /cadpv4 (V4)
// ==========================================
bot.onText(/^\/lockcadpv4$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (!isBotOwner(userId)) {
        return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya Owner bot yang bisa menggunakan command ini.");
    }
    
    if (isCadpLocked('v4')) {
        return bot.sendMessage(chatId, "🔒 /cadpv4 sudah dalam keadaan terkunci!");
    }
    
    setCadpLock('v4', true);
    bot.sendMessage(chatId, "🔒 /cadpv4 TELAH DIKUNCI!\n\n✅ Command /cadpv4 tidak dapat digunakan.\n🔓 Untuk membuka, ketik: /unlockcadpv4");
    bot.sendMessage(OWNER_ID, `🔒 LOCK /cadpv4\nUser: ${msg.from.first_name} (${userId})`);
});

bot.onText(/^\/unlockcadpv4$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (!isBotOwner(userId)) {
        return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya Owner bot yang bisa menggunakan command ini.");
    }
    
    if (!isCadpLocked('v4')) {
        return bot.sendMessage(chatId, "🔓 /cadpv4 tidak dalam keadaan terkunci!");
    }
    
    setCadpLock('v4', false);
    bot.sendMessage(chatId, "🔓 /cadpv4 TELAH DIBUKA!\n\n✅ Command /cadpv4 sudah dapat digunakan kembali.\n🔒 Untuk mengunci, ketik: /lockcadpv4");
    bot.sendMessage(OWNER_ID, `🔓 UNLOCK /cadpv4\nUser: ${msg.from.first_name} (${userId})`);
});

// ==========================================
// LOCK /cadpv5 (V5)
// ==========================================
bot.onText(/^\/lockcadpv5$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (!isBotOwner(userId)) {
        return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya Owner bot yang bisa menggunakan command ini.");
    }
    
    if (isCadpLocked('v5')) {
        return bot.sendMessage(chatId, "🔒 /cadpv5 sudah dalam keadaan terkunci!");
    }
    
    setCadpLock('v5', true);
    bot.sendMessage(chatId, "🔒 /cadpv5 TELAH DIKUNCI!\n\n✅ Command /cadpv5 tidak dapat digunakan.\n🔓 Untuk membuka, ketik: /unlockcadpv5");
    bot.sendMessage(OWNER_ID, `🔒 LOCK /cadpv5\nUser: ${msg.from.first_name} (${userId})`);
});

bot.onText(/^\/unlockcadpv5$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (!isBotOwner(userId)) {
        return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya Owner bot yang bisa menggunakan command ini.");
    }
    
    if (!isCadpLocked('v5')) {
        return bot.sendMessage(chatId, "🔓 /cadpv5 tidak dalam keadaan terkunci!");
    }
    
    setCadpLock('v5', false);
    bot.sendMessage(chatId, "🔓 /cadpv5 TELAH DIBUKA!\n\n✅ Command /cadpv5 sudah dapat digunakan kembali.\n🔒 Untuk mengunci, ketik: /lockcadpv5");
    bot.sendMessage(OWNER_ID, `🔓 UNLOCK /cadpv5\nUser: ${msg.from.first_name} (${userId})`);
});

    // log command
function notifyOwner(commandName, msg) {
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;
    const chatId = msg.chat.id;
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    const logMessage = `<blockquote>💬 Command: /${commandName}
👤 User: @${username}
🆔 ID: ${userId}
🕒 Waktu: ${now}
</blockquote>
    `;
    bot.sendMessage(OWNER_ID, logMessage, { parse_mode: 'HTML' });
}

// ========== FUNGSI CEK JOIN CHANNEL ==========
async function isJoinedChannel(userId) {
  const requiredChannels = config.requiredChannels || [];
  
  for (const channel of requiredChannels) {
    try {
      const member = await bot.getChatMember(channel.id, userId);
      const status = member.status;
      if (status !== 'member' && status !== 'administrator' && status !== 'creator') {
        return false;
      }
    } catch (err) {
      return false;
    }
  }
  return true;
}

async function requireJoinChannel(msg, next) {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  
  const joined = await isJoinedChannel(userId);
  if (!joined) {
    const requiredChannels = config.requiredChannels || [];
    let channelButtons = [];
    for (const ch of requiredChannels) {
      channelButtons.push([{ text: `📢 JOIN ${ch.id}`, url: ch.url }]);
    }
    channelButtons.push([{ text: "🔄 Cek Lagi", callback_data: "refresh_join_start" }]);
    
    return bot.sendMessage(chatId,
      `⚠️ <b>AKSES DITOLAK!</b>\n\n` +
      `Kamu harus join channel berikut terlebih dahulu:\n\n` +
      requiredChannels.map(ch => `• ${ch.id}`).join('\n') +
      `\n\n✅ Setelah join, klik tombol <b>🔄 Cek Lagi</b> untuk melanjutkan.`,
      {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: channelButtons }
      }
    );
  }
  return true;
}
    
    // info
// Fungsi escape HTML
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\*/g, '&#42;')
        .replace(/_/g, '&#95;')
        .replace(/`/g, '&#96;');
}

bot.onText(/^\/info$/, async (msg, match) => {
    const chatId = msg.chat.id;
    
    if (chatId.toString() !== settings.exGroupId) {
        const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
        const isOwner = ownerUsers.includes(String(msg.from.id));
        if (!isOwner) {
            return bot.sendMessage(chatId, "Khusus di panel public", {
                reply_to_message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard: [[{ text: "BUY PUBLIC", url: `https://t.me/${dev}` }]],
                },
            });
        }
    }
    
    let targetUser = msg.reply_to_message ? msg.reply_to_message.from : msg.from;
    const userId = targetUser.id.toString();
    const username = targetUser.username || "-";
    const firstName = targetUser.first_name || "User";

    // LOAD ROLE FILES
    let managersvip = [], managervip = [], kepemilikan = [], ceo = [], dev = [], asisten = [], adp = [], tk = [], pt = [], vip = [], owner = [], reseller = [], premium = [];
    
    try {
        if (fs.existsSync('./db/users/managersvip.json')) managersvip = JSON.parse(fs.readFileSync('./db/users/managersvip.json'));
        if (fs.existsSync('./db/users/managervip.json')) managervip = JSON.parse(fs.readFileSync('./db/users/managervip.json'));
        if (fs.existsSync('./db/users/kepemilikan.json')) kepemilikan = JSON.parse(fs.readFileSync('./db/users/kepemilikan.json'));
        if (fs.existsSync('./db/users/ceo.json')) ceo = JSON.parse(fs.readFileSync('./db/users/ceo.json'));
        if (fs.existsSync('./db/users/developer.json')) dev = JSON.parse(fs.readFileSync('./db/users/developer.json'));
        if (fs.existsSync('./db/users/asisten.json')) asisten = JSON.parse(fs.readFileSync('./db/users/asisten.json'));
        if (fs.existsSync('./db/users/adp.json')) adp = JSON.parse(fs.readFileSync('./db/users/adp.json'));
        if (fs.existsSync('./db/users/tk.json')) tk = JSON.parse(fs.readFileSync('./db/users/tk.json'));
        if (fs.existsSync('./db/users/pt.json')) pt = JSON.parse(fs.readFileSync('./db/users/pt.json'));
        if (fs.existsSync('./db/users/vip.json')) vip = JSON.parse(fs.readFileSync('./db/users/vip.json'));
        if (fs.existsSync(OWNERP_FILE)) owner = JSON.parse(fs.readFileSync(OWNERP_FILE));
        if (fs.existsSync(RESS_FILE)) reseller = JSON.parse(fs.readFileSync(RESS_FILE));
        if (fs.existsSync(PREMIUM_FILE)) premium = JSON.parse(fs.readFileSync(PREMIUM_FILE));
    } catch (e) {}

    const has = (arr) => arr && arr.includes(userId);

    // STATUS START
    let statusStart = `❌ ${firstName} belum start bot. Dilarang create!`;
    let startIcon = "❌";
    try {
        await bot.sendMessage(userId, "Start check");
        statusStart = `✅ ${firstName} sudah start bot! Silahkan create.`;
        startIcon = "✅";
        // HAPUS ATAU COMMENT 4 BARIS DI BAWAH INI KARENA usersFile TIDAK DIDEKLARASIKAN
        // let users = [];
        // if (fs.existsSync(usersFile)) users = JSON.parse(fs.readFileSync(usersFile));
        // if (!users.includes(userId)) {
        //     users.push(userId);
        //     fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        // }
    } catch (err) {}

    // MAIN ROLE (Prioritas dari level tertinggi)
    let mainRole = "USER";
    if (has(managersvip)) mainRole = "MANAGER SVIP";
    else if (has(managervip)) mainRole = "MANAGER VIP";
    else if (has(kepemilikan)) mainRole = "KEPEMILIKAN";
    else if (has(vip)) mainRole = "VIP MEMBER";
    else if (has(asisten)) mainRole = "ASISTEN";
    else if (has(dev)) mainRole = "DEVELOPER";
    else if (has(ceo)) mainRole = "CEO";
    else if (has(tk)) mainRole = "TANGAN KANAN";
    else if (has(owner)) mainRole = "OWNER";
    else if (has(adp)) mainRole = "ADMIN PANEL";
    else if (has(pt)) mainRole = "PARTNER";
    else if (has(reseller)) mainRole = "RESELLER";
    else if (has(premium)) mainRole = "PREMIUM";

    // BUILD MESSAGE
    const txtInfo = `
┌────────────────────────────────┐
│           USER INFO            │
└────────────────────────────────┘

Nama: ${firstName}
Username: @${username}
ID: ${userId}

┌────────────────────────────────┐
│          ROLE LIST             │
├────────────────────────────────┤
│  MANAGER SVIP    : ${has(managersvip) ? '✅' : '❌'}
│  MANAGER VIP     : ${has(managervip) ? '✅' : '❌'}
│  KEPEMILIKAN     : ${has(kepemilikan) ? '✅' : '❌'}
│  VIP MEMBER      : ${has(vip) ? '✅' : '❌'}
│  ASISTEN         : ${has(asisten) ? '✅' : '❌'}
│  DEVELOPER       : ${has(dev) ? '✅' : '❌'}
│  CEO             : ${has(ceo) ? '✅' : '❌'}
│  TANGAN KANAN    : ${has(tk) ? '✅' : '❌'}
│  OWNER           : ${has(owner) ? '✅' : '❌'}
│  ADMIN PANEL     : ${has(adp) ? '✅' : '❌'}
│  PARTNER         : ${has(pt) ? '✅' : '❌'}
│  RESELLER        : ${has(reseller) ? '✅' : '❌'}
│  PREMIUM         : ${has(premium) ? '✅' : '❌'}
└────────────────────────────────┘

┌────────────────────────────────┐
│            STATUS              │
├────────────────────────────────┤
│ ${startIcon} ${statusStart}
└────────────────────────────────┘
`;

    bot.sendMessage(chatId, txtInfo, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id
    });
});
    
    // scpu
bot.onText(/\/scpu (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1].split(",");

  if (input.length !== 3) {
    return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n`/scpu domain,ptla,ptlc`", { parse_mode: "Markdown" });
  }

  const [domain, plta, pltc] = input.map(x => x.trim());

  bot.sendMessage(chatId, "⏳ Sedang cek CPU server...");
  try {
    let page = 1;
    let totalPages = 1;
    let hasil = "📊 *Monitoring CPU Server*\n\n";

    do {
      const serversRes = await axios.get(`${domain}/api/application/servers?page=${page}`, {
        headers: { Authorization: `Bearer ${plta}`, Accept: "application/json" },
      });

      const servers = serversRes.data.data;
      totalPages = serversRes.data.meta.pagination.total_pages;

      for (const s of servers) {
        const name = s.attributes.name;
        const uuidShort = s.attributes.uuid.split("-")[0];

        try {
          const utilRes = await axios.get(
            `${domain}/api/client/servers/${uuidShort}/resources`,
            { headers: { Authorization: `Bearer ${pltc}`, Accept: "application/json" } }
          );

          const cpu = utilRes.data.attributes.resources.cpu_absolute;

          if (cpu >= 80) {
            hasil += `⚠️ *${name}* - CPU: ${cpu}%\n`;
          }
        } catch (err) {
          console.error(`Utilization error ${name}:`, err.message);
        }
      }

      page++;
    } while (page <= totalPages);

    if (hasil === "📊 *Monitoring CPU Server*\n\n") {
      hasil += "Status Server:\n✅ Semua server normal (CPU < 80%)";
    }

    bot.sendMessage(chatId, hasil, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
  } catch (error) {
    console.error(error.message);
    bot.sendMessage(chatId, "❌ Gagal mengambil data server!");
  }
});
    
    // monitoring
bot.onText(/\/servercpu/, async (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() !== settings.exGroupId) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}

  bot.sendMessage(chatId, "⏳");
  try {
    let page = 1;
    let totalPages = 1;
    let hasil = "📊 *Monitoring CPU Server*\n\n";

    do {
      const serversRes = await axios.get(`${domain}/api/application/servers?page=${page}`, {
        headers: { Authorization: `Bearer ${plta}`, Accept: "application/json" },
      });

      const servers = serversRes.data.data;
      totalPages = serversRes.data.meta.pagination.total_pages;

      for (const s of servers) {
        const name = s.attributes.name;
        const idServer = s.attributes.id; // ambil ID server
        const uuidShort = s.attributes.uuid.split("-")[0]; // uuidShort buat client API

        try {
          const utilRes = await axios.get(
            `${domain}/api/client/servers/${uuidShort}/resources`,
            { headers: { Authorization: `Bearer ${pltc}`, Accept: "application/json" } }
          );

          const cpu = utilRes.data.attributes.resources.cpu_absolute;

          if (cpu >= 80) {
            hasil += `⚠️ *${name}* (ID: \`${idServer}\`) - CPU: ${cpu}%\n`;
          }
        } catch (err) {
          console.error(`Utilization error ${name}:`, err.message);
        }
      }

      page++;
    } while (page <= totalPages);

    if (hasil === "📊 *Monitoring CPU Server*\n\n") {
      hasil += "Status Server:\n✅ Semua server normal (CPU < 80%)";
    }

    bot.sendMessage(chatId, hasil, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
  } catch (error) {
    console.error(error.message);
    bot.sendMessage(chatId, "❌ Gagal mengambil data server!");
  }
});

// ==========================================
// CREATE ADMIN PANEL V1 (CADP) - FIXED
// ==========================================
bot.onText(/^\/cadp(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);

  // ========== 1. ACCESS CHECK ==========
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(senderId);
    if (checkMaintenance(msg)) return;
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRolesAdp = [
    { file: './db/users/adp.json', name: 'ADMIN PANEL' },
    { file: OWNERP_FILE, name: 'OWNER' },
    { file: './db/users/tk.json', name: 'TANGAN KANAN' },
    { file: './db/users/ceo.json', name: 'CEO' },
    { file: './db/users/developer.json', name: 'DEVELOPER' },
    { file: './db/users/asisten.json', name: 'ASISTEN' },
    { file: './db/users/vip.json', name: 'VIP MEMBER' },
    { file: './db/users/kepemilikan.json', name: 'KEPEMILIKAN' },
    { file: './db/users/managervip.json', name: 'MANAGER VIP' },
    { file: './db/users/managersvip.json', name: 'MANAGER SVIP' }
  ];

  let hasAccess = false;
  for (const role of allowedRolesAdp) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }

  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role ADP ke atas yang bisa membuat Admin Panel.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isAdpLocked !== 'undefined' && isAdpLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Admin Panel sedang dikunci oleh Owner.");
  }
  
  if (isCadpLocked('v1')) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Command /cadp sedang dikunci oleh Owner.\n\n💡 Untuk informasi lebih lanjut, hubungi Owner.");
  }

  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. PARSE & VALIDATE INPUT ==========
  const rawParams = (match && match[1]) ? match[1].trim() : "";
  if (!rawParams) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /cadp <username>,<id_telegram>\nContoh: /cadp sanzy,123456789");
  }

  const t = rawParams.split(",");
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.");
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya boleh huruf (a-z) dan angka (0-9)", { reply_to_message_id: msg.message_id });
  }

  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID - ID harus berupa angka positif.", { reply_to_message_id: msg.message_id });
  }

    // ========== START LOADING BAR ==========
  let loadingMsg = null;
  
  const updateLoading = async (percent, text) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const message = "⏳ " + bar + " " + percent + "% - " + text;
    
    try {
      if (!loadingMsg) {
        loadingMsg = await bot.sendMessage(chatId, message, { 
          reply_to_message_id: msg.message_id 
        });
      } else {
        // Tambahkan .catch() untuk mencegah error
        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: loadingMsg.message_id
        }).catch(() => {});
      }
    } catch (e) {
      // Jika error, buat pesan baru
      if (loadingMsg) {
        try {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        } catch (er) {}
        loadingMsg = null;
      }
      loadingMsg = await bot.sendMessage(chatId, message, { 
        reply_to_message_id: msg.message_id 
      });
    }
  };

  try {
    // --- TAHAP 1: Validasi User (25%) ---
    await updateLoading(25, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM - Gagal memverifikasi user.", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Membuat Akun Admin (50%) ---
    await updateLoading(50, "Creating Admin Account");

    const domain = settings.domain;
    const plta = settings.plta;
    
    if (!domain || !plta) {
      throw new Error("Konfigurasi Domain/PLTA Panel Utama belum diatur!");
    }

    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);

    const resUser = await fetch(domain + "/api/application/users", {
      method: "POST",
      headers: { 
        "Accept": "application/json", 
        "Content-Type": "application/json", 
        "Authorization": "Bearer " + plta 
      },
      body: JSON.stringify({ 
        email: email, 
        username: username, 
        first_name: username, 
        last_name: "Admin", 
        language: "en", 
        root_admin: true, 
        password: password 
      }),
      signal: AbortSignal.timeout(15000)
    });

    const dataUser = await resUser.json();
    if (dataUser.errors) {
      throw new Error("API Error: " + (dataUser.errors[0].detail || JSON.stringify(dataUser.errors)));
    }
    
    const user = dataUser.attributes;

    // --- TAHAP 3: Finalizing (75%) ---
    await updateLoading(75, "Preparing credentials");

    // --- TAHAP 4: Sending (100%) ---
    await updateLoading(100, "Sending credentials");

    if (loadingMsg) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    }

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'ADP', 'admin', 'V1', targetUserId, username);
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE ADMIN PANEL SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
📧 EMAIL: <code>${email}</code>
🛡️ ROLE: <b>Admin Panel V1</b>

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN ADMIN PANEL V1 ANDA SIAP!</b>

📦 Paket: ADMIN PANEL (V1)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚠️ <b>PENTING:</b>
• Ini adalah akun ADMIN PANEL (root_admin)
• Segera ganti password di profil
• Jangan bagikan data ini ke siapapun
• Garansi 15 hari`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    console.error("Error /cadp:", err.message);
    if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    let errorMsg = err.message;
    if (errorMsg.includes("API Error")) {
      errorMsg = "Gagal membuat akun di panel. Cek kembali konfigurasi panel.";
    }
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + errorMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE ADMIN FAILED (V1)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// CREATE ADMIN PANEL V2 (CADPV2) - FIXED
// ==========================================
bot.onText(/^\/cadpv2(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);

  // ========== 1. ACCESS CHECK ==========
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(senderId);
    if (checkMaintenance(msg)) return;
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRolesAdpV2 = [
    { file: './db/users/version/adpV2.json', name: 'ADMIN PANEL V2' },
    { file: './db/users/version/ownerV2.json', name: 'OWNER V2' },
    { file: './db/users/version/tkV2.json', name: 'TANGAN KANAN V2' },
    { file: './db/users/version/ceoV2.json', name: 'CEO V2' },
    { file: './db/users/version/developerV2.json', name: 'DEVELOPER V2' },
    { file: './db/users/version/asistenV2.json', name: 'ASISTEN V2' },
    { file: './db/users/version/vipV2.json', name: 'VIP MEMBER V2' },
    { file: './db/users/version/kepemilikanV2.json', name: 'KEPEMILIKAN V2' },
    { file: './db/users/version/managervipV2.json', name: 'MANAGER VIP V2' },
    { file: './db/users/version/managersvipV2.json', name: 'MANAGER SVIP V2' }
  ];

  let hasAccess = false;
  for (const role of allowedRolesAdpV2) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }

  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role ADP V2 ke atas yang bisa membuat Admin Panel V2.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isAdpLocked !== 'undefined' && isAdpLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Admin Panel V2 sedang dikunci oleh Owner.");
  }
  
  if (isCadpLocked('v2')) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Command /cadpv2 sedang dikunci oleh Owner.\n\n💡 Untuk informasi lebih lanjut, hubungi Owner.");
  }

  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. PARSE & VALIDATE INPUT ==========
  const rawParams = (match && match[1]) ? match[1].trim() : "";
  if (!rawParams) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /cadpv2 <username>,<id_telegram>\nContoh: /cadpv2 sanzy,123456789");
  }

  const t = rawParams.split(",");
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.");
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya boleh huruf (a-z) dan angka (0-9)", { reply_to_message_id: msg.message_id });
  }

  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID - ID harus berupa angka positif.", { reply_to_message_id: msg.message_id });
  }

  // ========== CONFIG V2 ==========
  const domain = settings.domainV2;
  const plta = settings.pltaV2;

  if (!domain || !plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V2 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

    // ========== START LOADING BAR ==========
  let loadingMsg = null;
  
  const updateLoading = async (percent, text) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const message = "⏳ " + bar + " " + percent + "% - " + text;
    
    try {
      if (!loadingMsg) {
        loadingMsg = await bot.sendMessage(chatId, message, { 
          reply_to_message_id: msg.message_id 
        });
      } else {
        // Tambahkan .catch() untuk mencegah error
        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: loadingMsg.message_id
        }).catch(() => {});
      }
    } catch (e) {
      // Jika error, buat pesan baru
      if (loadingMsg) {
        try {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        } catch (er) {}
        loadingMsg = null;
      }
      loadingMsg = await bot.sendMessage(chatId, message, { 
        reply_to_message_id: msg.message_id 
      });
    }
  };

  try {
    // --- TAHAP 1: Validasi User (25%) ---
    await updateLoading(25, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM - Gagal memverifikasi user.", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Membuat Akun Admin (50%) ---
    await updateLoading(50, "Creating Admin Account V2");

    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);

    const resUser = await fetch(domain + "/api/application/users", {
      method: "POST",
      headers: { 
        "Accept": "application/json", 
        "Content-Type": "application/json", 
        "Authorization": "Bearer " + plta 
      },
      body: JSON.stringify({ 
        email: email, 
        username: username, 
        first_name: username, 
        last_name: "Admin", 
        language: "en", 
        root_admin: false, 
        password: password 
      }),
      signal: AbortSignal.timeout(15000)
    });

    const dataUser = await resUser.json();
    if (dataUser.errors) {
      throw new Error("API Error: " + (dataUser.errors[0].detail || JSON.stringify(dataUser.errors)));
    }
    
    const user = dataUser.attributes;

    // --- TAHAP 3: Finalizing (75%) ---
    await updateLoading(75, "Preparing credentials");

    // --- TAHAP 4: Sending (100%) ---
    await updateLoading(100, "Sending credentials");

    if (loadingMsg) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    }

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'ADP', 'admin', 'V2', targetUserId, username);
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE ADMIN PANEL V2 SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
📧 EMAIL: <code>${email}</code>
🛡️ ROLE: <b>Admin Panel V2</b>

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN ADMIN PANEL V2 ANDA SIAP!</b>

📦 Paket: ADMIN PANEL (V2)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚠️ <b>PENTING:</b>
• Ini adalah akun ADMIN PANEL V2
• Segera ganti password di profil
• Jangan bagikan data ini ke siapapun
• Garansi 15 hari`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    console.error("Error /cadpv2:", err.message);
    if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    let errorMsg = err.message;
    if (errorMsg.includes("API Error")) {
      errorMsg = "Gagal membuat akun di panel V2. Cek kembali konfigurasi panel.";
    }
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + errorMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE ADMIN FAILED (V2)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// CREATE ADMIN PANEL V3 (CADPV3) - FIXED
// ==========================================
bot.onText(/^\/cadpv3(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);

  // ========== 1. ACCESS CHECK ==========
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(senderId);
    if (checkMaintenance(msg)) return;
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRolesAdpV3 = [
    { file: './db/users/version/adpV3.json', name: 'ADMIN PANEL V3' },
    { file: './db/users/version/ownerV3.json', name: 'OWNER V3' },
    { file: './db/users/version/tkV3.json', name: 'TANGAN KANAN V3' },
    { file: './db/users/version/ceoV3.json', name: 'CEO V3' },
    { file: './db/users/version/developerV3.json', name: 'DEVELOPER V3' },
    { file: './db/users/version/asistenV3.json', name: 'ASISTEN V3' },
    { file: './db/users/version/vipV3.json', name: 'VIP MEMBER V3' },
    { file: './db/users/version/kepemilikanV3.json', name: 'KEPEMILIKAN V3' },
    { file: './db/users/version/managervipV3.json', name: 'MANAGER VIP V3' },
    { file: './db/users/version/managersvipV3.json', name: 'MANAGER SVIP V3' }
  ];

  let hasAccess = false;
  for (const role of allowedRolesAdpV3) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }

  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role ADP V3 ke atas yang bisa membuat Admin Panel V3.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isAdpLocked !== 'undefined' && isAdpLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Admin Panel V3 sedang dikunci oleh Owner.");
  }
  
  if (isCadpLocked('v3')) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Command /cadpv3 sedang dikunci oleh Owner.\n\n💡 Untuk informasi lebih lanjut, hubungi Owner.");
  }

  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. PARSE & VALIDATE INPUT ==========
  const rawParams = (match && match[1]) ? match[1].trim() : "";
  if (!rawParams) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /cadpv3 <username>,<id_telegram>\nContoh: /cadpv3 sanzy,123456789");
  }

  const t = rawParams.split(",");
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.");
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya boleh huruf (a-z) dan angka (0-9)", { reply_to_message_id: msg.message_id });
  }

  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID - ID harus berupa angka positif.", { reply_to_message_id: msg.message_id });
  }

  // ========== CONFIG V3 ==========
  const domain = settings.domainV3;
  const plta = settings.pltaV3;

  if (!domain || !plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V3 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

   // ========== START LOADING BAR ==========
  let loadingMsg = null;
  
  const updateLoading = async (percent, text) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const message = "⏳ " + bar + " " + percent + "% - " + text;
    
    try {
      if (!loadingMsg) {
        loadingMsg = await bot.sendMessage(chatId, message, { 
          reply_to_message_id: msg.message_id 
        });
      } else {
        // Tambahkan .catch() untuk mencegah error
        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: loadingMsg.message_id
        }).catch(() => {});
      }
    } catch (e) {
      // Jika error, buat pesan baru
      if (loadingMsg) {
        try {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        } catch (er) {}
        loadingMsg = null;
      }
      loadingMsg = await bot.sendMessage(chatId, message, { 
        reply_to_message_id: msg.message_id 
      });
    }
  };

  try {
    // --- TAHAP 1: Validasi User (25%) ---
    await updateLoading(25, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM - Gagal memverifikasi user.", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Membuat Akun Admin (50%) ---
    await updateLoading(50, "Creating Admin Account V3");

    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);

    const resUser = await fetch(domain + "/api/application/users", {
      method: "POST",
      headers: { 
        "Accept": "application/json", 
        "Content-Type": "application/json", 
        "Authorization": "Bearer " + plta 
      },
      body: JSON.stringify({ 
        email: email, 
        username: username, 
        first_name: username, 
        last_name: "Admin", 
        language: "en", 
        root_admin: false, 
        password: password 
      }),
      signal: AbortSignal.timeout(15000)
    });

    const dataUser = await resUser.json();
    if (dataUser.errors) {
      throw new Error("API Error: " + (dataUser.errors[0].detail || JSON.stringify(dataUser.errors)));
    }
    
    const user = dataUser.attributes;

    // --- TAHAP 3: Finalizing (75%) ---
    await updateLoading(75, "Preparing credentials");

    // --- TAHAP 4: Sending (100%) ---
    await updateLoading(100, "Sending credentials");

    if (loadingMsg) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    }

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'ADP', 'admin', 'V3', targetUserId, username);
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE ADMIN PANEL V3 SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
📧 EMAIL: <code>${email}</code>
🛡️ ROLE: <b>Admin Panel V3</b>

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN ADMIN PANEL V3 ANDA SIAP!</b>

📦 Paket: ADMIN PANEL (V3)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚠️ <b>PENTING:</b>
• Ini adalah akun ADMIN PANEL V3
• Segera ganti password di profil
• Jangan bagikan data ini ke siapapun
• Garansi 15 hari`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    console.error("Error /cadpv3:", err.message);
    if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    let errorMsg = err.message;
    if (errorMsg.includes("API Error")) {
      errorMsg = "Gagal membuat akun di panel V3. Cek kembali konfigurasi panel.";
    }
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + errorMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE ADMIN FAILED (V3)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// CREATE ADMIN PANEL V4 (CADPV4) - FIXED
// ==========================================
bot.onText(/^\/cadpv4(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);

  // ========== 1. ACCESS CHECK ==========
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(senderId);
    if (checkMaintenance(msg)) return;
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRolesAdpV4 = [
    { file: './db/users/version/adpV4.json', name: 'ADMIN PANEL V4' },
    { file: './db/users/version/ownerV4.json', name: 'OWNER V4' },
    { file: './db/users/version/tkV4.json', name: 'TANGAN KANAN V4' },
    { file: './db/users/version/ceoV4.json', name: 'CEO V4' },
    { file: './db/users/version/developerV4.json', name: 'DEVELOPER V4' },
    { file: './db/users/version/asistenV4.json', name: 'ASISTEN V4' },
    { file: './db/users/version/vipV4.json', name: 'VIP MEMBER V4' },
    { file: './db/users/version/kepemilikanV4.json', name: 'KEPEMILIKAN V4' },
    { file: './db/users/version/managervipV4.json', name: 'MANAGER VIP V4' },
    { file: './db/users/version/managersvipV4.json', name: 'MANAGER SVIP V4' }
  ];

  let hasAccess = false;
  for (const role of allowedRolesAdpV4) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }

  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role ADP V4 ke atas yang bisa membuat Admin Panel V4.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isAdpLocked !== 'undefined' && isAdpLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Admin Panel V4 sedang dikunci oleh Owner.");
  }
  
  if (isCadpLocked('v4')) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Command /cadpv4 sedang dikunci oleh Owner.\n\n💡 Untuk informasi lebih lanjut, hubungi Owner.");
  }

  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. PARSE & VALIDATE INPUT ==========
  const rawParams = (match && match[1]) ? match[1].trim() : "";
  if (!rawParams) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /cadpv4 <username>,<id_telegram>\nContoh: /cadpv4 sanzy,123456789");
  }

  const t = rawParams.split(",");
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.");
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya boleh huruf (a-z) dan angka (0-9)", { reply_to_message_id: msg.message_id });
  }

  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID - ID harus berupa angka positif.", { reply_to_message_id: msg.message_id });
  }

  // ========== CONFIG V4 ==========
  const domain = settings.domainV4;
  const plta = settings.pltaV4;

  if (!domain || !plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V4 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

    // ========== START LOADING BAR ==========
  let loadingMsg = null;
  
  const updateLoading = async (percent, text) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const message = "⏳ " + bar + " " + percent + "% - " + text;
    
    try {
      if (!loadingMsg) {
        loadingMsg = await bot.sendMessage(chatId, message, { 
          reply_to_message_id: msg.message_id 
        });
      } else {
        // Tambahkan .catch() untuk mencegah error
        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: loadingMsg.message_id
        }).catch(() => {});
      }
    } catch (e) {
      // Jika error, buat pesan baru
      if (loadingMsg) {
        try {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        } catch (er) {}
        loadingMsg = null;
      }
      loadingMsg = await bot.sendMessage(chatId, message, { 
        reply_to_message_id: msg.message_id 
      });
    }
  };

  try {
    // --- TAHAP 1: Validasi User (25%) ---
    await updateLoading(25, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM - Gagal memverifikasi user.", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Membuat Akun Admin (50%) ---
    await updateLoading(50, "Creating Admin Account V4");

    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);

    const resUser = await fetch(domain + "/api/application/users", {
      method: "POST",
      headers: { 
        "Accept": "application/json", 
        "Content-Type": "application/json", 
        "Authorization": "Bearer " + plta 
      },
      body: JSON.stringify({ 
        email: email, 
        username: username, 
        first_name: username, 
        last_name: "Admin", 
        language: "en", 
        root_admin: false, 
        password: password 
      }),
      signal: AbortSignal.timeout(15000)
    });

    const dataUser = await resUser.json();
    if (dataUser.errors) {
      throw new Error("API Error: " + (dataUser.errors[0].detail || JSON.stringify(dataUser.errors)));
    }
    
    const user = dataUser.attributes;

    // --- TAHAP 3: Finalizing (75%) ---
    await updateLoading(75, "Preparing credentials");

    // --- TAHAP 4: Sending (100%) ---
    await updateLoading(100, "Sending credentials");

    if (loadingMsg) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    }

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'ADP', 'admin', 'V4', targetUserId, username);
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE ADMIN PANEL V4 SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
📧 EMAIL: <code>${email}</code>
🛡️ ROLE: <b>Admin Panel V4</b>

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN ADMIN PANEL V4 ANDA SIAP!</b>

📦 Paket: ADMIN PANEL (V4)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚠️ <b>PENTING:</b>
• Ini adalah akun ADMIN PANEL V4
• Segera ganti password di profil
• Jangan bagikan data ini ke siapapun
• Garansi 15 hari`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    console.error("Error /cadpv4:", err.message);
    if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    let errorMsg = err.message;
    if (errorMsg.includes("API Error")) {
      errorMsg = "Gagal membuat akun di panel V4. Cek kembali konfigurasi panel.";
    }
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + errorMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE ADMIN FAILED (V4)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// CREATE ADMIN PANEL V5 (CADPV5) - FIXED
// ==========================================
bot.onText(/^\/cadpv5(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);

  // ========== 1. ACCESS CHECK ==========
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(senderId);
    if (checkMaintenance(msg)) return;
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRolesAdpV5 = [
    { file: './db/users/version/adpV5.json', name: 'ADMIN PANEL V5' },
    { file: './db/users/version/ownerV5.json', name: 'OWNER V5' },
    { file: './db/users/version/tkV5.json', name: 'TANGAN KANAN V5' },
    { file: './db/users/version/ceoV5.json', name: 'CEO V5' },
    { file: './db/users/version/developerV5.json', name: 'DEVELOPER V5' },
    { file: './db/users/version/asistenV5.json', name: 'ASISTEN V5' },
    { file: './db/users/version/vipV5.json', name: 'VIP MEMBER V5' },
    { file: './db/users/version/kepemilikanV5.json', name: 'KEPEMILIKAN V5' },
    { file: './db/users/version/managervipV5.json', name: 'MANAGER VIP V5' },
    { file: './db/users/version/managersvipV5.json', name: 'MANAGER SVIP V5' }
  ];

  let hasAccess = false;
  for (const role of allowedRolesAdpV5) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }

  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role ADP V5 ke atas yang bisa membuat Admin Panel V5.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isAdpLocked !== 'undefined' && isAdpLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Admin Panel V5 sedang dikunci oleh Owner.");
  }
  
  if (isCadpLocked('v5')) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Command /cadpv5 sedang dikunci oleh Owner.\n\n💡 Untuk informasi lebih lanjut, hubungi Owner.");
  }

  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. PARSE & VALIDATE INPUT ==========
  const rawParams = (match && match[1]) ? match[1].trim() : "";
  if (!rawParams) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /cadpv5 <username>,<id_telegram>\nContoh: /cadpv5 sanzy,123456789");
  }

  const t = rawParams.split(",");
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.");
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya boleh huruf (a-z) dan angka (0-9)", { reply_to_message_id: msg.message_id });
  }

  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID - ID harus berupa angka positif.", { reply_to_message_id: msg.message_id });
  }

  // ========== CONFIG V5 ==========
  const domain = settings.domainV5;
  const plta = settings.pltaV5;

  if (!domain || !plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V5 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

   // ========== START LOADING BAR ==========
  let loadingMsg = null;
  
  const updateLoading = async (percent, text) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const message = "⏳ " + bar + " " + percent + "% - " + text;
    
    try {
      if (!loadingMsg) {
        loadingMsg = await bot.sendMessage(chatId, message, { 
          reply_to_message_id: msg.message_id 
        });
      } else {
        // Tambahkan .catch() untuk mencegah error
        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: loadingMsg.message_id
        }).catch(() => {});
      }
    } catch (e) {
      // Jika error, buat pesan baru
      if (loadingMsg) {
        try {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        } catch (er) {}
        loadingMsg = null;
      }
      loadingMsg = await bot.sendMessage(chatId, message, { 
        reply_to_message_id: msg.message_id 
      });
    }
  };

  try {
    // --- TAHAP 1: Validasi User (25%) ---
    await updateLoading(25, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM - Gagal memverifikasi user.", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Membuat Akun Admin (50%) ---
    await updateLoading(50, "Creating Admin Account V5");

    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);

    const resUser = await fetch(domain + "/api/application/users", {
      method: "POST",
      headers: { 
        "Accept": "application/json", 
        "Content-Type": "application/json", 
        "Authorization": "Bearer " + plta 
      },
      body: JSON.stringify({ 
        email: email, 
        username: username, 
        first_name: username, 
        last_name: "Admin", 
        language: "en", 
        root_admin: false, 
        password: password 
      }),
      signal: AbortSignal.timeout(15000)
    });

    const dataUser = await resUser.json();
    if (dataUser.errors) {
      throw new Error("API Error: " + (dataUser.errors[0].detail || JSON.stringify(dataUser.errors)));
    }
    
    const user = dataUser.attributes;

    // --- TAHAP 3: Finalizing (75%) ---
    await updateLoading(75, "Preparing credentials");

    // --- TAHAP 4: Sending (100%) ---
    await updateLoading(100, "Sending credentials");

    if (loadingMsg) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    }

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'ADP', 'admin', 'V5', targetUserId, username);
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE ADMIN PANEL V5 SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
📧 EMAIL: <code>${email}</code>
🛡️ ROLE: <b>Admin Panel V5</b>

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN ADMIN PANEL V5 ANDA SIAP!</b>

📦 Paket: ADMIN PANEL (V5)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚠️ <b>PENTING:</b>
• Ini adalah akun ADMIN PANEL V5
• Segera ganti password di profil
• Jangan bagikan data ini ke siapapun
• Garansi 15 hari`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    console.error("Error /cadpv5:", err.message);
    if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    let errorMsg = err.message;
    if (errorMsg.includes("API Error")) {
      errorMsg = "Gagal membuat akun di panel V5. Cek kembali konfigurasi panel.";
    }
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + errorMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE ADMIN FAILED (V5)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

bot.onText(/\/listcadp/, (msg) => {
  const chatId = msg.chat.id;

  if (!fs.existsSync(CADP_FILE)) {
    return bot.sendMessage(chatId, "❌ Tidak ada data user tersimpan.");
  }

  const db = JSON.parse(fs.readFileSync(CADP_FILE));

  if (db.length === 0) {
    return bot.sendMessage(chatId, "❌ Belum ada user yang tercatat.");
  }

  let text = "<b>📋 User yang /cadp:</b>\n\n";
  db.forEach((id, index) => {
    text += `${index + 1}. <code>${id}</code>\n`;
  });

  bot.sendMessage(chatId, text, { parse_mode: "HTML" });
});

// ========== LOCK CREATE UNLI PANEL ==========
const LOCK_UNLI_FILE = './db/lock_unli.json';

// Fungsi untuk cek status lock unli
function isUnliLocked() {
    try {
        if (fs.existsSync(LOCK_UNLI_FILE)) {
            const data = JSON.parse(fs.readFileSync(LOCK_UNLI_FILE));
            return data.locked === true;
        }
    } catch (e) {}
    return false;
}

// Fungsi untuk set status lock unli
function setUnliLock(locked) {
    if (!fs.existsSync('./db')) fs.mkdirSync('./db');
    fs.writeFileSync(LOCK_UNLI_FILE, JSON.stringify({ locked: locked }, null, 2));
}

// ========== LOCK CREATE UNLI PANEL (HANYA OWNER BOT) ==========
bot.onText(/^\/lockunli$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Hanya OWNER BOT (pemilik bot) yang bisa lock
    if (!isBotOwner(userId)) {
        return bot.sendMessage(chatId, "❌ *AKSES DITOLAK!*\n\nHanya pemilik bot yang bisa mengunci create unli panel!", { parse_mode: "Markdown" });
    }
    
    if (isUnliLocked()) {
        return bot.sendMessage(chatId, "🔒 Create unli panel sudah terkunci!", { parse_mode: "Markdown" });
    }
    
    setUnliLock(true);
    bot.sendMessage(chatId, `
🔒 *CREATE UNLI PANEL TELAH DIKUNCI!*

━━━━━━━━━━━━━━━━━━━━━
✅ Semua perintah /unli, /unliv2, /unliv3, /unliv4, /unliv5 tidak dapat digunakan.
✅ Hanya pemilik bot yang bisa membuka kembali.
━━━━━━━━━━━━━━━━━━━━━

🔓 Untuk membuka, ketik: /unlockunli
`, { parse_mode: "Markdown" });
    
    // Notifikasi ke owner
    bot.sendMessage(OWNER_ID, `🔒 *LOCK UNLI PANEL*\n\nUser: ${msg.from.first_name} (${userId})\nTelah mengunci create unli panel.`);
});

bot.onText(/^\/unlockunli$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Hanya OWNER BOT (pemilik bot) yang bisa unlock
    if (!isBotOwner(userId)) {
        return bot.sendMessage(chatId, "❌ *AKSES DITOLAK!*\n\nHanya pemilik bot yang bisa membuka create unli panel!", { parse_mode: "Markdown" });
    }
    
    if (!isUnliLocked()) {
        return bot.sendMessage(chatId, "🔓 Create unli panel tidak dalam keadaan terkunci!", { parse_mode: "Markdown" });
    }
    
    setUnliLock(false);
    bot.sendMessage(chatId, `
🔓 *CREATE UNLI PANEL TELAH DIBUKA!*

━━━━━━━━━━━━━━━━━━━━━
✅ Semua perintah /unli, /unliv2, /unliv3, /unliv4, /unliv5 sudah dapat digunakan kembali.
━━━━━━━━━━━━━━━━━━━━━

🔒 Untuk mengunci, ketik: /lockunli
`, { parse_mode: "Markdown" });
    
    // Notifikasi ke owner
    bot.sendMessage(OWNER_ID, `🔓 *UNLOCK UNLI PANEL*\n\nUser: ${msg.from.first_name} (${userId})\nTelah membuka create unli panel.`);
});
    
    // unli ke whatsapp
bot.onText(/\/unliwa (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  
  if ((msg.chat.type !== "group" && msg.chat.type !== "supergroup") && msg.from.id !== OWNER_ID) {
    return bot.sendMessage(chatId, "❌ ᴋʜᴜꜱᴜꜱ ɢʀᴜᴘ!");
  }
    
  const text = match[1];

  const isCooldown = checkCooldown(msg);
  if (isCooldown) return bot.sendMessage(chatId, isCooldown);

  const ressUsers = JSON.parse(fs.readFileSync(RESS_FILE));
  const isReseller = ressUsers.includes(String(msg.from.id));

  if (!isReseller) {
    return bot.sendMessage(chatId, "❌ Khusus Reseller!", {
      reply_markup: {
        inline_keyboard: [[{ text: `LAPORAN", url: "https://t.me/${dev}` }]],
      },
    });
  }

  const t = text.split(",");
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ Format: /unli namapanel,nomorwa");
  }

  const username = t[0].trim();
  const waNumber = t[1].replace(/[^0-9]/g, ""); // nomor WA tujuan
  const jid = waNumber + "@s.whatsapp.net"; // jid WA
  const name = username + "unli";
  const egg = settings.eggs;
  const loc = settings.loc;
  const memo = "0";
  const cpu = "0";
  const disk = "0";
  const email = `${username}@gmail.com`;
  const spc =
    'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';
  const password = username + Math.random().toString(36).slice(2, 5);
    
  let user;
  let server;

  try {
    // CREATE USER
    const response = await fetch(`${domain}/api/application/users`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: username,
        language: "en",
        password: password,
      }),
    });

    const data = await response.json();
    if (data.errors) {
      return bot.sendMessage(
        chatId,
        `❌ Error: ${JSON.stringify(data.errors[0], null, 2)}`
      );
    }
    user = data.attributes;

    // CREATE SERVER
    const response2 = await fetch(`${domain}/api/application/servers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
      body: JSON.stringify({
        name: name,
        description: "",
        user: user.id,
        egg: parseInt(egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_20",
        startup: spc,
        environment: {
          INST: "npm",
          USER_UPLOAD: "0",
          AUTO_UPDATE: "0",
          CMD_RUN: "npm start",
        },
        limits: {
          memory: memo,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 1,
        },
        deploy: {
          locations: [parseInt(loc)],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });

    const data2 = await response2.json();
    if (data2.errors) {
      return bot.sendMessage(
        chatId,
        `❌ Error saat buat server: ${JSON.stringify(data2.errors[0], null, 2)}`
      );
    }
    server = data2.attributes;
  } catch (error) {
    return bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }

  if (user && server) {
    // kirim ke WA
    await sock.sendMessage(jid, {
  image: { url: panel },
  caption: `*🔐 Sukses Created Panel!*
▸ Name: ${username}
▸ Email: ${email}
▸ ID: ${user.id}

*🌐 Domain Panel*
▸ Username: ${user.username}
▸ Password: ${password}
▸ Login: ${domain}

*⚠️ Rules Panel*
▸ Sensor domain
▸ Simpan data akun
▸ Garansi 15 hari`
  });

    // notif di Telegram
    bot.sendMessage(
      chatId,
      `✅ Sukses kirim panel ke Nomer WhatsApp: ${waNumber}`
    );
  } else {
    bot.sendMessage(
      chatId,
      `❌ Akun panel tidak ada! Laporkan ke @${dev}.`
    );
  }
});
    
    // unli
// ========== HELPER: MAPPING ERROR API KE PESAN USER-FRIENDLY ==========
function getFriendlyErrorMessage(error, context = "panel") {
  const errCode = error?.response?.status;
  const errDetail = error?.response?.data?.errors?.[0]?.detail || error?.message || "Unknown error";
  const errLower = errDetail?.toLowerCase() || "";
  
  if (errCode === 401 || errCode === 403 || errLower.includes("unauthorized") || errLower.includes("forbidden")) {
    return "❌ API Key panel tidak valid / expired / tidak punya akses!\n💡 Hubungi owner untuk cek config API Key.";
  }
  if (errCode === 404 || errLower.includes("not found") || errLower.includes("egg") || errLower.includes("location")) {
    return "❌ Egg ID / Location ID tidak ditemukan di panel!\n💡 Cek config.js: egg, location, dan domain panel.";
  }
  if (errCode === 409 || errLower.includes("already") || errLower.includes("exists") || errLower.includes("username") || errLower.includes("email")) {
    return `❌ Username atau email sudah terdaftar di panel!\n💡 Gunakan username lain yang belum dipakai.`;
  }
  if (errCode === 422 || errLower.includes("validation") || errLower.includes("invalid")) {
    return `❌ Data tidak valid: ${errDetail}`;
  }
  if (error?.code === "ECONNABORTED" || errLower.includes("timeout") || errLower.includes("timed out")) {
    return "❌ Koneksi ke panel timeout!\n💡 Cek koneksi server atau coba lagi nanti.";
  }
  if (error?.code === "ENOTFOUND" || errLower.includes("getaddrinfo") || errLower.includes("dns")) {
    return "❌ Domain panel tidak ditemukan!\n💡 Cek config.domain panel di config.js.";
  }
  if (errLower.includes("resource") || errLower.includes("quota") || errLower.includes("limit") || errLower.includes("full")) {
    return "❌ Resource panel penuh / kuota habis!\n💡 Hubungi admin untuk tambah resource panel.";
  }
  if (errLower.includes("user") && errLower.includes("start") || errLower.includes("chat not found")) {
    return `❌ User Telegram dengan ID tersebut belum pernah start bot!\n💡 Minta user klik /start dulu di @${bot.botInfo?.username || 'bot_kamu'}.`;
  }
  return `❌ Gagal membuat ${context}: ${errDetail}`;
}

// ========== HELPER: CEK USERNAME SUDAH ADA DI PANEL ==========
async function isUsernameExists(domain, plta, username) {
  try {
    const res = await fetch(`${domain}/api/application/users?filter[username]=${encodeURIComponent(username)}`, {
      headers: { "Authorization": `Bearer ${plta}` },
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json();
    return data.data?.length > 0;
  } catch (e) {
    console.warn(`[WARN] Gagal cek username: ${e.message}`);
    return false;
  }
}

// ==========================================
// COMMAND /unli (UNLIMITED V1 - WITH DEBUG)
// ==========================================
bot.onText(/^\/unli(?:\s+(.+))?$/, async (msg, match) => {
  console.log("========================================");
  console.log("🚀 /unli DEBUG - COMMAND STARTED");
  console.log("========================================");
  
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  
  // DEBUG: Cek match[1]
  console.log("📌 STEP 1 - Checking match[1]:");
  console.log("   match:", match);
  console.log("   match[1]:", match?.[1]);
  console.log("   typeof match[1]:", typeof match?.[1]);
  
  const text = match?.[1] ? match[1].trim() : "";
  
  // DEBUG: Cek text
  console.log("📌 STEP 2 - Checking text:");
  console.log("   text:", text);
  console.log("   typeof text:", typeof text);
  console.log("   text length:", text.length);
  console.log("   is string?", typeof text === "string");
  
  if (!text) {
    console.log("❌ DEBUG: text kosong, return error");
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /unli <username>,<id_telegram>\nContoh: /unli sanzy,123456789", { reply_to_message_id: msg.message_id });
  }
  
  // DEBUG: Cek split
  console.log("📌 STEP 3 - Splitting text:");
  const t = text.split(",");
  console.log("   split result (t):", t);
  console.log("   t length:", t.length);
  console.log("   t[0]:", t[0]);
  console.log("   t[1]:", t[1]);
  
  // ========== 1. ACCESS CHECK ==========
  console.log("📌 STEP 4 - Access Check");
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(senderId);
    if (!isOwner) {
      console.log("❌ DEBUG: Bukan owner, return");
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.");
    }
  }

  // ========== 2. ROLE CHECK ==========
  console.log("📌 STEP 5 - Role Check");
  const allowedRoles = [
    { file: PREMIUM_FILE, name: 'PREMIUM' }, { file: RESS_FILE, name: 'RESELLER' },
    { file: './db/users/pt.json', name: 'PARTNER' }, { file: './db/users/adp.json', name: 'ADMIN PANEL' },
    { file: OWNERP_FILE, name: 'OWNER' }, { file: './db/users/tk.json', name: 'TANGAN KANAN' },
    { file: './db/users/ceo.json', name: 'CEO' }, { file: './db/users/developer.json', name: 'DEVELOPER' },
    { file: './db/users/asisten.json', name: 'ASISTEN' }, { file: './db/users/vip.json', name: 'VIP MEMBER' },
    { file: './db/users/kepemilikan.json', name: 'KEPEMILIKAN' }, { file: './db/users/managervip.json', name: 'MANAGER VIP' },
    { file: './db/users/managersvip.json', name: 'MANAGER SVIP' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  
  if (!hasAccess) {
    console.log("❌ DEBUG: Tidak punya akses, return");
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Anda tidak memiliki izin (Premium/Reseller/dll) untuk menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  console.log("📌 STEP 6 - Lock & Cooldown Check");
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    console.log("❌ DEBUG: Unli locked, return");
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel Unli sedang dikunci oleh Owner.");
  }
  
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    console.log("❌ DEBUG: Cooldown active, return");
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. PARSE & VALIDATE INPUT ==========
  console.log("📌 STEP 7 - Parse & Validate Input");
  console.log("   text:", text);
  console.log("   t length:", t.length);
  
  if (!text) {
    console.log("❌ DEBUG: text kosong (lagi), return");
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /unli <username>,<id_telegram>\nContoh: /unli sanzy,123456789");
  }
  
  if (t.length < 2) {
    console.log("❌ DEBUG: t.length < 2, return");
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.\nContoh: /unli sanzy,123456789");
  }
  
  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);
  
  console.log("   username:", username);
  console.log("   targetUserIdStr:", targetUserIdStr);
  console.log("   targetUserId:", targetUserId);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    console.log("❌ DEBUG: Username invalid, return");
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya boleh huruf (a-z) dan angka (0-9)", { reply_to_message_id: msg.message_id });
  }

  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    console.log("❌ DEBUG: ID invalid, return");
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID - ID harus berupa angka positif.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  console.log("📌 STEP 8 - Start Loading Bar");
  let loadingMsg = null;
  
  const updateLoading = async (percent, textStatus) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const message = "⏳ " + bar + " " + percent + "% - " + textStatus;
    
    try {
      if (!loadingMsg) {
        loadingMsg = await bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });
      } else {
        await bot.editMessageText(message, { chat_id: chatId, message_id: loadingMsg.message_id });
      }
    } catch (e) {
      if (loadingMsg) {
        try { await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {}); } catch (er) {}
        loadingMsg = await bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });
      }
    }
  };

  let user = null;
  let server = null;

  try {
    console.log("📌 STEP 9 - Try block started");
    
    // --- TAHAP 1: Validasi User (20%) ---
    console.log("📌 STEP 9a - Validating User (20%)");
    await updateLoading(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      console.log("❌ DEBUG: Error getChat:", err.message);
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM - Gagal memeriksa status user.", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username Panel (40%) ---
    console.log("📌 STEP 9b - Checking Username (40%)");
    await updateLoading(40, "Checking Username Availability");
    const usernameExists = await isUsernameExists(settings.domain, settings.plta, username);
    if (usernameExists) {
      console.log("❌ DEBUG: Username sudah dipakai");
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI\n\nUsername '" + username + "' sudah terdaftar di Panel V1.\n\n💡 Silakan gunakan username lain.", { reply_to_message_id: msg.message_id });
    }

    // --- TAHAP 3: Membuat User Panel (60%) ---
    console.log("📌 STEP 9c - Creating User (60%)");
    await updateLoading(60, "Creating User Account");
    
    const name = username + "unli";
    const egg = settings.eggsV1 || settings.eggs || 15;
    const loc = settings.locV1 || settings.loc || 1;
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    
    console.log("   name:", name);
    console.log("   email:", email);
    console.log("   password generated");
    
    const resUser = await fetch(settings.domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) {
      let errMsg = dataUser.errors[0].detail || dataUser.errors[0].code || "Unknown error";
      throw new Error("User API: " + errMsg);
    }
    user = dataUser.attributes;
    console.log("   ✅ User created, ID:", user.id);

    // --- TAHAP 4: Alokasi Server (80%) ---
    console.log("📌 STEP 9d - Creating Server (80%)");
    await updateLoading(80, "Allocating Server Resources");

    const resServer = await fetch(settings.domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(egg), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: 0, swap: 0, disk: 0, io: 500, cpu: 0 },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) {
      let errMsg = dataServer.errors[0].detail || dataServer.errors[0].code || "Unknown error";
      throw new Error("Server API: " + errMsg);
    }
    server = dataServer.attributes;
    console.log("   ✅ Server created, ID:", server.id);

    // --- TAHAP 5: Finalizing (100%) ---
    console.log("📌 STEP 9e - Finalizing (100%)");
    await updateLoading(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500));

    if (loadingMsg) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    }

    // ========== NOTIFIKASI KE CHANNEL ==========
    console.log("📌 STEP 10 - Sending Notification");
    await sendCreateNotification(bot, msg, 'UNLI', 'unli', 'V1', targetUserId, username);
    console.log("   ✅ Notification sent");

    // ========== SUKSES ==========
    console.log("📌 STEP 11 - Sending Success Message");
    const successMsg = 
`✅ <b>CREATE UNLIMITED PANEL SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ MEMORY: <code>UNLIMITED</code>

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER ==========
    console.log("📌 STEP 12 - Sending to User");
    const captionUser = 
`🔐 <b>AKUN UNLIMITED PANEL ANDA SIAP!</b>

📦 Paket: UNLIMITED (V1)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>UNLIMITED</code>
• CPU: <code>UNLIMITED</code>
• Disk: <code>UNLIMITED</code>

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });
    
    console.log("🎉 /unli DEBUG - COMMAND FINISHED SUCCESSFULLY");
    console.log("========================================");

  } catch (err) {
    console.log("========================================");
    console.log("💥 /unli DEBUG - ERROR CAUGHT!");
    console.log("💥 Error name:", err.name);
    console.log("💥 Error message:", err.message);
    console.log("💥 Error stack:", err.stack);
    console.log("========================================");
    
    if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    if (user && !server) {
      try {
        await fetch(settings.domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + settings.plta }
        });
        console.log("🧹 Cleaned up user:", user.id);
      } catch (e) {}
    }
    
    let errorDetail = err.message;
    if (errorDetail.includes("location") || errorDetail.includes("resource")) {
      errorDetail = "Resource panel penuh. Tambah node atau upgrade resource.";
    }
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + errorDetail + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE UNLI FAILED (V1)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// COMMAND /unliv2 (UNLIMITED V2 - FIXED)
// ==========================================
bot.onText(/^\/unliv2(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  const text = match?.[1] ? match[1].trim() : "";

if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /command <username>,<id_telegram>", { reply_to_message_id: msg.message_id });
}

const t = text.split(",");  // ✅ AMAN

  // ========== 1. ACCESS CHECK ==========
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(senderId);
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.");
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRoles = [
    { file: './db/users/version/premiumV2.json', name: 'PREMIUM V2' },
    { file: './db/users/version/resellerV2.json', name: 'RESELLER V2' },
    { file: './db/users/version/partnerV2.json', name: 'PARTNER V2' },
    { file: './db/users/version/adpV2.json', name: 'ADMIN PANEL V2' },
    { file: './db/users/version/ownerV2.json', name: 'OWNER V2' },
    { file: './db/users/version/tkV2.json', name: 'TANGAN KANAN V2' },
    { file: './db/users/version/ceoV2.json', name: 'CEO V2' },
    { file: './db/users/version/developerV2.json', name: 'DEVELOPER V2' },
    { file: './db/users/version/asistenV2.json', name: 'ASISTEN V2' },
    { file: './db/users/version/vipV2.json', name: 'VIP MEMBER V2' },
    { file: './db/users/version/kepemilikanV2.json', name: 'KEPEMILIKAN V2' },
    { file: './db/users/version/managervipV2.json', name: 'MANAGER VIP V2' },
    { file: './db/users/version/managersvipV2.json', name: 'MANAGER SVIP V2' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  
  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Anda tidak memiliki izin (Role V2) untuk menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel Unli sedang dikunci oleh Owner.");
  }
  
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. PARSE & VALIDATE INPUT ==========
  if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /unliv2 <username>,<id_telegram>\nContoh: /unliv2 sanzy,123456789");
  }
  
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.");
  }
  
  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
  }
  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID - ID harus berupa angka positif.", { reply_to_message_id: msg.message_id });
  }

  // ========== CONFIG VERSION-SPECIFIC ==========
  const domain = settings.domainV2;
  const plta = settings.pltaV2;
  const eggs = settings.eggsV2 || settings.eggs || 15;
  const loc = settings.locV2 || settings.loc || 1;

  if (!domain || !plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V2 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  let loadingMsg = null;
  
  const updateLoading = async (percent, textStatus) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const message = "⏳ " + bar + " " + percent + "% - " + textStatus;
    
    try {
      if (!loadingMsg) {
        loadingMsg = await bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });
      } else {
        await bot.editMessageText(message, { chat_id: chatId, message_id: loadingMsg.message_id });
      }
    } catch (e) {
      if (loadingMsg) {
        try { await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {}); } catch (er) {}
        loadingMsg = await bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });
      }
    }
  };

  let user = null;
  let server = null;

  try {
    // --- TAHAP 1: Validasi User (20%) ---
    await updateLoading(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username Panel (40%) ---
    await updateLoading(40, "Checking Username Availability");
    const usernameExists = await isUsernameExists(domain, plta, username);
    if (usernameExists) {
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI\n\nUsername '" + username + "' sudah terdaftar di Panel V2.\n\n💡 Silakan gunakan username lain.", { reply_to_message_id: msg.message_id });
    }

    // --- TAHAP 3: Membuat User Panel (60%) ---
    await updateLoading(60, "Creating User Account");
    
    const name = username + "unli";
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    
    const resUser = await fetch(domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error("User API: " + (dataUser.errors[0].detail || "Unknown error"));
    user = dataUser.attributes;

    // --- TAHAP 4: Alokasi Server (80%) ---
    await updateLoading(80, "Allocating Server Resources");

    const resServer = await fetch(domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: 0, swap: 0, disk: 0, io: 500, cpu: 0 },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error("Server API: " + (dataServer.errors[0].detail || "Unknown error"));
    server = dataServer.attributes;

    // --- TAHAP 5: Finalizing (100%) ---
    await updateLoading(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500));

    if (loadingMsg) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    }

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'UNLI', 'unli', 'V2', targetUserId, username);
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE UNLIMITED PANEL V2 SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ MEMORY: <code>UNLIMITED</code>

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN UNLIMITED PANEL V2 ANDA SIAP!</b>

📦 Paket: UNLIMITED (V2)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>UNLIMITED</code>
• CPU: <code>UNLIMITED</code>
• Disk: <code>UNLIMITED</code>

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    console.error("Error /unliv2:", err.message);
    if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    if (user && !server) {
      try {
        await fetch(domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + plta }
        });
      } catch (e) {}
    }
    
    let errorDetail = err.message;
    if (errorDetail.includes("location") || errorDetail.includes("resource")) {
      errorDetail = "Resource panel V2 penuh. Tambah node atau upgrade resource.";
    }
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + errorDetail + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE UNLI FAILED (V2)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// COMMAND /unliv3 (UNLIMITED V3 - FIXED)
// ==========================================
bot.onText(/^\/unliv3(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  const text = match?.[1] ? match[1].trim() : "";

if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /command <username>,<id_telegram>", { reply_to_message_id: msg.message_id });
}

const t = text.split(",");  // ✅ AMAN

  // ========== 1. ACCESS CHECK ==========
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(senderId);
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.");
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRoles = [
    { file: './db/users/version/premiumV3.json', name: 'PREMIUM V3' },
    { file: './db/users/version/resellerV3.json', name: 'RESELLER V3' },
    { file: './db/users/version/partnerV3.json', name: 'PARTNER V3' },
    { file: './db/users/version/adpV3.json', name: 'ADMIN PANEL V3' },
    { file: './db/users/version/ownerV3.json', name: 'OWNER V3' },
    { file: './db/users/version/tkV3.json', name: 'TANGAN KANAN V3' },
    { file: './db/users/version/ceoV3.json', name: 'CEO V3' },
    { file: './db/users/version/developerV3.json', name: 'DEVELOPER V3' },
    { file: './db/users/version/asistenV3.json', name: 'ASISTEN V3' },
    { file: './db/users/version/vipV3.json', name: 'VIP MEMBER V3' },
    { file: './db/users/version/kepemilikanV3.json', name: 'KEPEMILIKAN V3' },
    { file: './db/users/version/managervipV3.json', name: 'MANAGER VIP V3' },
    { file: './db/users/version/managersvipV3.json', name: 'MANAGER SVIP V3' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  
  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Anda tidak memiliki izin (Role V3) untuk menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel Unli sedang dikunci oleh Owner.");
  }
  
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. PARSE & VALIDATE INPUT ==========
  if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /unliv3 <username>,<id_telegram>\nContoh: /unliv3 sanzy,123456789");
  }
  
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.");
  }
  
  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
  }
  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID - ID harus berupa angka positif.", { reply_to_message_id: msg.message_id });
  }

  // ========== CONFIG VERSION-SPECIFIC ==========
  const domain = settings.domainV3;
  const plta = settings.pltaV3;
  const eggs = settings.eggsV3 || settings.eggs || 15;
  const loc = settings.locV3 || settings.loc || 1;

  if (!domain || !plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V3 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  let loadingMsg = null;
  
  const updateLoading = async (percent, textStatus) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const message = "⏳ " + bar + " " + percent + "% - " + textStatus;
    
    try {
      if (!loadingMsg) {
        loadingMsg = await bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });
      } else {
        await bot.editMessageText(message, { chat_id: chatId, message_id: loadingMsg.message_id });
      }
    } catch (e) {
      if (loadingMsg) {
        try { await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {}); } catch (er) {}
        loadingMsg = await bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });
      }
    }
  };

  let user = null;
  let server = null;

  try {
    // --- TAHAP 1: Validasi User (20%) ---
    await updateLoading(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username Panel (40%) ---
    await updateLoading(40, "Checking Username Availability");
    const usernameExists = await isUsernameExists(domain, plta, username);
    if (usernameExists) {
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI\n\nUsername '" + username + "' sudah terdaftar di Panel V3.\n\n💡 Silakan gunakan username lain.", { reply_to_message_id: msg.message_id });
    }

    // --- TAHAP 3: Membuat User Panel (60%) ---
    await updateLoading(60, "Creating User Account");
    
    const name = username + "unli";
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    
    const resUser = await fetch(domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error("User API: " + (dataUser.errors[0].detail || "Unknown error"));
    user = dataUser.attributes;

    // --- TAHAP 4: Alokasi Server (80%) ---
    await updateLoading(80, "Allocating Server Resources");

    const resServer = await fetch(domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: 0, swap: 0, disk: 0, io: 500, cpu: 0 },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error("Server API: " + (dataServer.errors[0].detail || "Unknown error"));
    server = dataServer.attributes;

    // --- TAHAP 5: Finalizing (100%) ---
    await updateLoading(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500));

    if (loadingMsg) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    }

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'UNLI', 'unli', 'V3', targetUserId, username);
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE UNLIMITED PANEL V3 SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ MEMORY: <code>UNLIMITED</code>

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN UNLIMITED PANEL V3 ANDA SIAP!</b>

📦 Paket: UNLIMITED (V3)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>UNLIMITED</code>
• CPU: <code>UNLIMITED</code>
• Disk: <code>UNLIMITED</code>

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    console.error("Error /unliv3:", err.message);
    if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    if (user && !server) {
      try {
        await fetch(domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + plta }
        });
      } catch (e) {}
    }
    
    let errorDetail = err.message;
    if (errorDetail.includes("location") || errorDetail.includes("resource")) {
      errorDetail = "Resource panel V3 penuh. Tambah node atau upgrade resource.";
    }
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + errorDetail + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE UNLI FAILED (V3)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// COMMAND /unliv4 (UNLIMITED V4 - FIXED)
// ==========================================
bot.onText(/^\/unliv4(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  const text = match?.[1] ? match[1].trim() : "";

if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /command <username>,<id_telegram>", { reply_to_message_id: msg.message_id });
}

const t = text.split(",");  // ✅ AMAN

  // ========== 1. ACCESS CHECK ==========
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(senderId);
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.");
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRoles = [
    { file: './db/users/version/premiumV4.json', name: 'PREMIUM V4' },
    { file: './db/users/version/resellerV4.json', name: 'RESELLER V4' },
    { file: './db/users/version/partnerV4.json', name: 'PARTNER V4' },
    { file: './db/users/version/adpV4.json', name: 'ADMIN PANEL V4' },
    { file: './db/users/version/ownerV4.json', name: 'OWNER V4' },
    { file: './db/users/version/tkV4.json', name: 'TANGAN KANAN V4' },
    { file: './db/users/version/ceoV4.json', name: 'CEO V4' },
    { file: './db/users/version/developerV4.json', name: 'DEVELOPER V4' },
    { file: './db/users/version/asistenV4.json', name: 'ASISTEN V4' },
    { file: './db/users/version/vipV4.json', name: 'VIP MEMBER V4' },
    { file: './db/users/version/kepemilikanV4.json', name: 'KEPEMILIKAN V4' },
    { file: './db/users/version/managervipV4.json', name: 'MANAGER VIP V4' },
    { file: './db/users/version/managersvipV4.json', name: 'MANAGER SVIP V4' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  
  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Anda tidak memiliki izin (Role V4) untuk menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel Unli sedang dikunci oleh Owner.");
  }
  
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. PARSE & VALIDATE INPUT ==========
  if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /unliv4 <username>,<id_telegram>\nContoh: /unliv4 sanzy,123456789");
  }
  
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.");
  }
  
  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
  }
  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID - ID harus berupa angka positif.", { reply_to_message_id: msg.message_id });
  }

  // ========== CONFIG VERSION-SPECIFIC ==========
  const domain = settings.domainV4;
  const plta = settings.pltaV4;
  const eggs = settings.eggsV4 || settings.eggs || 15;
  const loc = settings.locV4 || settings.loc || 1;

  if (!domain || !plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V4 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  let loadingMsg = null;
  
  const updateLoading = async (percent, textStatus) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const message = "⏳ " + bar + " " + percent + "% - " + textStatus;
    
    try {
      if (!loadingMsg) {
        loadingMsg = await bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });
      } else {
        await bot.editMessageText(message, { chat_id: chatId, message_id: loadingMsg.message_id });
      }
    } catch (e) {
      if (loadingMsg) {
        try { await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {}); } catch (er) {}
        loadingMsg = await bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });
      }
    }
  };

  let user = null;
  let server = null;

  try {
    // --- TAHAP 1: Validasi User (20%) ---
    await updateLoading(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username Panel (40%) ---
    await updateLoading(40, "Checking Username Availability");
    const usernameExists = await isUsernameExists(domain, plta, username);
    if (usernameExists) {
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI\n\nUsername '" + username + "' sudah terdaftar di Panel V4.\n\n💡 Silakan gunakan username lain.", { reply_to_message_id: msg.message_id });
    }

    // --- TAHAP 3: Membuat User Panel (60%) ---
    await updateLoading(60, "Creating User Account");
    
    const name = username + "unli";
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    
    const resUser = await fetch(domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error("User API: " + (dataUser.errors[0].detail || "Unknown error"));
    user = dataUser.attributes;

    // --- TAHAP 4: Alokasi Server (80%) ---
    await updateLoading(80, "Allocating Server Resources");

    const resServer = await fetch(domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: 0, swap: 0, disk: 0, io: 500, cpu: 0 },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error("Server API: " + (dataServer.errors[0].detail || "Unknown error"));
    server = dataServer.attributes;

    // --- TAHAP 5: Finalizing (100%) ---
    await updateLoading(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500));

    if (loadingMsg) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    }

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'UNLI', 'unli', 'V4', targetUserId, username);
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE UNLIMITED PANEL V4 SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ MEMORY: <code>UNLIMITED</code>

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN UNLIMITED PANEL V4 ANDA SIAP!</b>

📦 Paket: UNLIMITED (V4)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>UNLIMITED</code>
• CPU: <code>UNLIMITED</code>
• Disk: <code>UNLIMITED</code>

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    console.error("Error /unliv4:", err.message);
    if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    if (user && !server) {
      try {
        await fetch(domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + plta }
        });
      } catch (e) {}
    }
    
    let errorDetail = err.message;
    if (errorDetail.includes("location") || errorDetail.includes("resource")) {
      errorDetail = "Resource panel V4 penuh. Tambah node atau upgrade resource.";
    }
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + errorDetail + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE UNLI FAILED (V4)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// COMMAND /unliv5 (UNLIMITED V5 - FIXED)
// ==========================================
bot.onText(/^\/unliv5(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  const text = match?.[1] ? match[1].trim() : "";

if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /command <username>,<id_telegram>", { reply_to_message_id: msg.message_id });
}

const t = text.split(",");  // ✅ AMAN

  // ========== 1. ACCESS CHECK ==========
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(senderId);
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.");
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRoles = [
    { file: './db/users/version/premiumV5.json', name: 'PREMIUM V5' },
    { file: './db/users/version/resellerV5.json', name: 'RESELLER V5' },
    { file: './db/users/version/partnerV5.json', name: 'PARTNER V5' },
    { file: './db/users/version/adpV5.json', name: 'ADMIN PANEL V5' },
    { file: './db/users/version/ownerV5.json', name: 'OWNER V5' },
    { file: './db/users/version/tkV5.json', name: 'TANGAN KANAN V5' },
    { file: './db/users/version/ceoV5.json', name: 'CEO V5' },
    { file: './db/users/version/developerV5.json', name: 'DEVELOPER V5' },
    { file: './db/users/version/asistenV5.json', name: 'ASISTEN V5' },
    { file: './db/users/version/vipV5.json', name: 'VIP MEMBER V5' },
    { file: './db/users/version/kepemilikanV5.json', name: 'KEPEMILIKAN V5' },
    { file: './db/users/version/managervipV5.json', name: 'MANAGER VIP V5' },
    { file: './db/users/version/managersvipV5.json', name: 'MANAGER SVIP V5' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  
  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Anda tidak memiliki izin (Role V5) untuk menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel Unli sedang dikunci oleh Owner.");
  }
  
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. PARSE & VALIDATE INPUT ==========
  if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /unliv5 <username>,<id_telegram>\nContoh: /unliv5 sanzy,123456789");
  }
  
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.");
  }
  
  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
  }
  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID - ID harus berupa angka positif.", { reply_to_message_id: msg.message_id });
  }

  // ========== CONFIG VERSION-SPECIFIC ==========
  const domain = settings.domainV5;
  const plta = settings.pltaV5;
  const eggs = settings.eggsV5 || settings.eggs || 15;
  const loc = settings.locV5 || settings.loc || 1;

  if (!domain || !plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V5 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  let loadingMsg = null;
  
  const updateLoading = async (percent, textStatus) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const message = "⏳ " + bar + " " + percent + "% - " + textStatus;
    
    try {
      if (!loadingMsg) {
        loadingMsg = await bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });
      } else {
        await bot.editMessageText(message, { chat_id: chatId, message_id: loadingMsg.message_id });
      }
    } catch (e) {
      if (loadingMsg) {
        try { await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {}); } catch (er) {}
        loadingMsg = await bot.sendMessage(chatId, message, { reply_to_message_id: msg.message_id });
      }
    }
  };

  let user = null;
  let server = null;

  try {
    // --- TAHAP 1: Validasi User (20%) ---
    await updateLoading(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username Panel (40%) ---
    await updateLoading(40, "Checking Username Availability");
    const usernameExists = await isUsernameExists(domain, plta, username);
    if (usernameExists) {
      if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI\n\nUsername '" + username + "' sudah terdaftar di Panel V5.\n\n💡 Silakan gunakan username lain.", { reply_to_message_id: msg.message_id });
    }

    // --- TAHAP 3: Membuat User Panel (60%) ---
    await updateLoading(60, "Creating User Account");
    
    const name = username + "unli";
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    
    const resUser = await fetch(domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error("User API: " + (dataUser.errors[0].detail || "Unknown error"));
    user = dataUser.attributes;

    // --- TAHAP 4: Alokasi Server (80%) ---
    await updateLoading(80, "Allocating Server Resources");

    const resServer = await fetch(domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: 0, swap: 0, disk: 0, io: 500, cpu: 0 },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error("Server API: " + (dataServer.errors[0].detail || "Unknown error"));
    server = dataServer.attributes;

    // --- TAHAP 5: Finalizing (100%) ---
    await updateLoading(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500));

    if (loadingMsg) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    }

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'UNLI', 'unli', 'V5', targetUserId, username);
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE UNLIMITED PANEL V5 SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ MEMORY: <code>UNLIMITED</code>

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN UNLIMITED PANEL V5 ANDA SIAP!</b>

📦 Paket: UNLIMITED (V5)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>UNLIMITED</code>
• CPU: <code>UNLIMITED</code>
• Disk: <code>UNLIMITED</code>

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    console.error("Error /unliv5:", err.message);
    if (loadingMsg) await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    if (user && !server) {
      try {
        await fetch(domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + plta }
        });
      } catch (e) {}
    }
    
    let errorDetail = err.message;
    if (errorDetail.includes("location") || errorDetail.includes("resource")) {
      errorDetail = "Resource panel V5 penuh. Tambah node atau upgrade resource.";
    }
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + errorDetail + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE UNLI FAILED (V5)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

    // specs ram
const specs = {
  "1gbv2": { memo: 1024,  cpu: 30,  disk: 1024 },
  "2gbv2": { memo: 2048,  cpu: 60,  disk: 2048 },
  "3gbv2": { memo: 3072,  cpu: 90,  disk: 3072 },
  "4gbv2": { memo: 4096,  cpu: 120, disk: 4096 },
  "5gbv2": { memo: 5120,  cpu: 150, disk: 5120 },
  "6gbv2": { memo: 6144,  cpu: 180, disk: 6144 },
  "7gbv2": { memo: 7168,  cpu: 210, disk: 7168 },
  "8gbv2": { memo: 8192,  cpu: 240, disk: 8192 },
  "9gbv2": { memo: 9216,  cpu: 270, disk: 9216 },
  "10gbv2":{ memo: 10240, cpu: 300, disk: 10240 },

  "1gbv3": { memo: 1024,  cpu: 30,  disk: 1024 },
  "2gbv3": { memo: 2048,  cpu: 60,  disk: 2048 },
  "3gbv3": { memo: 3072,  cpu: 90,  disk: 3072 },
  "4gbv3": { memo: 4096,  cpu: 120, disk: 4096 },
  "5gbv3": { memo: 5120,  cpu: 150, disk: 5120 },
  "6gbv3": { memo: 6144,  cpu: 180, disk: 6144 },
  "7gbv3": { memo: 7168,  cpu: 210, disk: 7168 },
  "8gbv3": { memo: 8192,  cpu: 240, disk: 8192 },
  "9gbv3": { memo: 9216,  cpu: 270, disk: 9216 },
  "10gbv3":{ memo: 10240, cpu: 300, disk: 10240 },

  "1gbv4": { memo: 1024,  cpu: 30,  disk: 1024 },
  "2gbv4": { memo: 2048,  cpu: 60,  disk: 2048 },
  "3gbv4": { memo: 3072,  cpu: 90,  disk: 3072 },
  "4gbv4": { memo: 4096,  cpu: 120, disk: 4096 },
  "5gbv4": { memo: 5120,  cpu: 150, disk: 5120 },
  "6gbv4": { memo: 6144,  cpu: 180, disk: 6144 },
  "7gbv4": { memo: 7168,  cpu: 210, disk: 7168 },
  "8gbv4": { memo: 8192,  cpu: 240, disk: 8192 },
  "9gbv4": { memo: 9216,  cpu: 270, disk: 9216 },
  "10gbv4":{ memo: 10240, cpu: 300, disk: 10240 },

  "1gbv5": { memo: 1024,  cpu: 30,  disk: 1024 },
  "2gbv5": { memo: 2048,  cpu: 60,  disk: 2048 },
  "3gbv5": { memo: 3072,  cpu: 90,  disk: 3072 },
  "4gbv5": { memo: 4096,  cpu: 120, disk: 4096 },
  "5gbv5": { memo: 5120,  cpu: 150, disk: 5120 },
  "6gbv5": { memo: 6144,  cpu: 180, disk: 6144 },
  "7gbv5": { memo: 7168,  cpu: 210, disk: 7168 },
  "8gbv5": { memo: 8192,  cpu: 240, disk: 8192 },
  "9gbv5": { memo: 9216,  cpu: 270, disk: 9216 },
  "10gbv5":{ memo: 10240, cpu: 300, disk: 10240 }
};
// ========== HELPER: SAFE JSON FETCH (ANTI CRASH) ==========
async function safePanelJson(url, options = {}) {
  try {
    const res = await fetch(url, { 
      ...options, 
      signal: AbortSignal.timeout(15000) // Timeout 15 detik
    });
    const text = await res.text();
    
    // Cek apakah respon benar-benar JSON
    if (!text.trim().startsWith('{')) {
      throw new Error(`Panel tidak merespon JSON (Mungkin Down/502/Cloudflare). Status: ${res.status}`);
    }
    
    return JSON.parse(text);
  } catch (err) {
    if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
      throw new Error('⏱️ Koneksi ke panel timeout! Panel mungkin sedang berat/down.');
    }
    throw err;
  }
}

// ==========================================
// COMMAND /1gb (FIXED - HTML + SPOILER DOMAIN)
// ==========================================
bot.onText(/^\/1gb(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  const plan = "1gb";
  const text = match?.[1] ? match[1].trim() : "";

if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /command <username>,<id_telegram>", { reply_to_message_id: msg.message_id });
}

const t = text.split(",");  // ✅ AMAN

  // ========== 1. ACCESS CHECK ==========
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    if (!ownerUsers.includes(senderId)) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRoles = [
    { file: RESS_FILE, name: 'RESELLER' },
    { file: './db/users/pt.json', name: 'PARTNER' },
    { file: './db/users/adp.json', name: 'ADMIN PANEL' },
    { file: OWNERP_FILE, name: 'OWNER' },
    { file: './db/users/tk.json', name: 'TANGAN KANAN' },
    { file: './db/users/ceo.json', name: 'CEO' },
    { file: './db/users/developer.json', name: 'DEVELOPER' },
    { file: './db/users/asisten.json', name: 'ASISTEN' },
    { file: './db/users/vip.json', name: 'VIP MEMBER' },
    { file: './db/users/kepemilikan.json', name: 'KEPEMILIKAN' },
    { file: './db/users/managervip.json', name: 'MANAGER VIP' },
    { file: './db/users/managersvip.json', name: 'MANAGER SVIP' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role khusus yang bisa menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel sedang dikunci oleh Owner.");
  }
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. INPUT VALIDATION ==========
  if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /1gb <username>,<id_telegram>\nContoh: /1gb sanzy,123456789", { reply_to_message_id: msg.message_id });
  }
  
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.", { reply_to_message_id: msg.message_id });
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
  }
  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID", { reply_to_message_id: msg.message_id });
  }

  // ========== SPECS CONFIG ==========
  const specs = { memo: 1024, cpu: 60, disk: 2000 };
  const { memo, cpu, disk } = specs;

  // Cek Config Panel V1
  if (!settings.domain || !settings.plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V1 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  let progressText = "⏳ Processing [▒▒▒▒▒▒▒▒▒▒] 0%";
  let loadingMsg = await bot.sendMessage(chatId, progressText, { 
    reply_to_message_id: msg.message_id 
  });

  const updateProgress = async (percent, status) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const percentStr = percent.toString().padStart(3, ' ');
    
    try {
      await bot.editMessageText("⏳ Processing " + bar + " " + percentStr + "% - " + status, {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    } catch (e) { /* Ignore */ }
  };

  let user = null;
  let server = null;

  try {
    // --- TAHAP 1: Validasi User (20%) ---
    await updateProgress(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username (40%) ---
    await updateProgress(40, "Checking Username Availability");
    if (typeof isUsernameExists === 'function') {
        const usernameExists = await isUsernameExists(settings.domain, settings.plta, username);
        if (usernameExists) {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
          return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI - Username " + username + " sudah terdaftar.", { reply_to_message_id: msg.message_id });
        }
    }

    // --- TAHAP 3: Membuat User (60%) ---
    await updateProgress(60, "Creating User Account");
    
    const name = username + "_" + plan;
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    const eggs = settings.eggs || 15;
    const loc = settings.loc || 1;
    
    const resUser = await fetch(settings.domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error("User API: " + (dataUser.errors[0].detail || "Unknown error"));
    user = dataUser.attributes;

    // --- TAHAP 4: Alokasi Server (80%) ---
    await updateProgress(80, "Allocating Server Resources");

    const resServer = await fetch(settings.domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: memo, swap: 0, disk, io: 500, cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error("Server API: " + (dataServer.errors[0].detail || "Unknown error"));
    server = dataServer.attributes;

    // --- TAHAP 5: Finalizing (100%) ---
    await updateProgress(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500)); 

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'GB', '1gb', 'V1', targetUserId, username, { memo, cpu, disk });
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE PANEL 1GB SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ RAM: <code>${memo}</code> MB | CPU: <code>${cpu}</code>% | DISK: <code>${disk}</code> MB

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN PANEL 1GB ANDA SIAP!</b>

📦 Paket: 1GB Plan (V1)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>${memo}</code> MB
• CPU: <code>${cpu}</code>%
• Disk: <code>${disk}</code> MB

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    // Cleanup jika user jadi tapi server gagal
    if (user && !server) {
      try {
        await fetch(settings.domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + settings.plta }
        });
      } catch (e) {
        console.error('Gagal hapus user saat cleanup:', e.message);
      }
    }

    const friendlyMsg = getFriendlyErrorMessage ? getFriendlyErrorMessage(err, "Panel 1GB") : err.message;
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + friendlyMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE FAILED (1GB)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// COMMAND /2gb (FIXED - HTML + SPOILER DOMAIN)
// ==========================================
bot.onText(/^\/2gb(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  const plan = "2gb";
  const text = match?.[1] ? match[1].trim() : "";

if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /command <username>,<id_telegram>", { reply_to_message_id: msg.message_id });
}

const t = text.split(",");  // ✅ AMAN

  // ========== 1. ACCESS CHECK ==========
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    if (!ownerUsers.includes(senderId)) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRoles = [
    { file: RESS_FILE, name: 'RESELLER' },
    { file: './db/users/pt.json', name: 'PARTNER' },
    { file: './db/users/adp.json', name: 'ADMIN PANEL' },
    { file: OWNERP_FILE, name: 'OWNER' },
    { file: './db/users/tk.json', name: 'TANGAN KANAN' },
    { file: './db/users/ceo.json', name: 'CEO' },
    { file: './db/users/developer.json', name: 'DEVELOPER' },
    { file: './db/users/asisten.json', name: 'ASISTEN' },
    { file: './db/users/vip.json', name: 'VIP MEMBER' },
    { file: './db/users/kepemilikan.json', name: 'KEPEMILIKAN' },
    { file: './db/users/managervip.json', name: 'MANAGER VIP' },
    { file: './db/users/managersvip.json', name: 'MANAGER SVIP' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role khusus yang bisa menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel sedang dikunci oleh Owner.");
  }
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. INPUT VALIDATION ==========
  if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /2gb <username>,<id_telegram>\nContoh: /2gb sanzy,123456789", { reply_to_message_id: msg.message_id });
  }
  
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.", { reply_to_message_id: msg.message_id });
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
  }
  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID", { reply_to_message_id: msg.message_id });
  }

  // ========== SPECS CONFIG ==========
  const specs = { memo: 2048, cpu: 80, disk: 3000 };
  const { memo, cpu, disk } = specs;

  // Cek Config Panel V1
  if (!settings.domain || !settings.plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V1 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  let progressText = "⏳ Processing [▒▒▒▒▒▒▒▒▒▒] 0%";
  let loadingMsg = await bot.sendMessage(chatId, progressText, { 
    reply_to_message_id: msg.message_id 
  });

  const updateProgress = async (percent, status) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const percentStr = percent.toString().padStart(3, ' ');
    
    try {
      await bot.editMessageText("⏳ Processing " + bar + " " + percentStr + "% - " + status, {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    } catch (e) { /* Ignore */ }
  };

  let user = null;
  let server = null;

  try {
    // --- TAHAP 1: Validasi User (20%) ---
    await updateProgress(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username (40%) ---
    await updateProgress(40, "Checking Username Availability");
    if (typeof isUsernameExists === 'function') {
        const usernameExists = await isUsernameExists(settings.domain, settings.plta, username);
        if (usernameExists) {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
          return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI - Username " + username + " sudah terdaftar.", { reply_to_message_id: msg.message_id });
        }
    }

    // --- TAHAP 3: Membuat User (60%) ---
    await updateProgress(60, "Creating User Account");
    
    const name = username + "_" + plan;
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    const eggs = settings.eggs || 15;
    const loc = settings.loc || 1;
    
    const resUser = await fetch(settings.domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error("User API: " + (dataUser.errors[0].detail || "Unknown error"));
    user = dataUser.attributes;

    // --- TAHAP 4: Alokasi Server (80%) ---
    await updateProgress(80, "Allocating Server Resources");

    const resServer = await fetch(settings.domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: memo, swap: 0, disk, io: 500, cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error("Server API: " + (dataServer.errors[0].detail || "Unknown error"));
    server = dataServer.attributes;

    // --- TAHAP 5: Finalizing (100%) ---
    await updateProgress(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500)); 

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'GB', '2gb', 'V1', targetUserId, username, { memo, cpu, disk });
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE PANEL 2GB SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ RAM: <code>${memo}</code> MB | CPU: <code>${cpu}</code>% | DISK: <code>${disk}</code> MB

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN PANEL 2GB ANDA SIAP!</b>

📦 Paket: 2GB Plan (V1)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>${memo}</code> MB
• CPU: <code>${cpu}</code>%
• Disk: <code>${disk}</code> MB

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    // Cleanup jika user jadi tapi server gagal
    if (user && !server) {
      try {
        await fetch(settings.domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + settings.plta }
        });
      } catch (e) {
        console.error('Gagal hapus user saat cleanup:', e.message);
      }
    }

    const friendlyMsg = getFriendlyErrorMessage ? getFriendlyErrorMessage(err, "Panel 2GB") : err.message;
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + friendlyMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE FAILED (2GB)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// COMMAND /3gb (FIXED - HTML + SPOILER DOMAIN)
// ==========================================
bot.onText(/^\/3gb(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  const plan = "3gb";
  const text = match?.[1] ? match[1].trim() : "";

if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /command <username>,<id_telegram>", { reply_to_message_id: msg.message_id });
}

const t = text.split(",");  // ✅ AMAN

  // ========== 1. ACCESS CHECK ==========
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    if (!ownerUsers.includes(senderId)) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRoles = [
    { file: RESS_FILE, name: 'RESELLER' },
    { file: './db/users/pt.json', name: 'PARTNER' },
    { file: './db/users/adp.json', name: 'ADMIN PANEL' },
    { file: OWNERP_FILE, name: 'OWNER' },
    { file: './db/users/tk.json', name: 'TANGAN KANAN' },
    { file: './db/users/ceo.json', name: 'CEO' },
    { file: './db/users/developer.json', name: 'DEVELOPER' },
    { file: './db/users/asisten.json', name: 'ASISTEN' },
    { file: './db/users/vip.json', name: 'VIP MEMBER' },
    { file: './db/users/kepemilikan.json', name: 'KEPEMILIKAN' },
    { file: './db/users/managervip.json', name: 'MANAGER VIP' },
    { file: './db/users/managersvip.json', name: 'MANAGER SVIP' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role khusus yang bisa menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel sedang dikunci oleh Owner.");
  }
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. INPUT VALIDATION ==========
  if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /3gb <username>,<id_telegram>\nContoh: /3gb sanzy,123456789", { reply_to_message_id: msg.message_id });
  }
  
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.", { reply_to_message_id: msg.message_id });
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
  }
  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID", { reply_to_message_id: msg.message_id });
  }

  // ========== SPECS CONFIG ==========
  const specs = { memo: 3072, cpu: 100, disk: 4000 };
  const { memo, cpu, disk } = specs;

  // Cek Config Panel V1
  if (!settings.domain || !settings.plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V1 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  let progressText = "⏳ Processing [▒▒▒▒▒▒▒▒▒▒] 0%";
  let loadingMsg = await bot.sendMessage(chatId, progressText, { 
    reply_to_message_id: msg.message_id 
  });

  const updateProgress = async (percent, status) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const percentStr = percent.toString().padStart(3, ' ');
    
    try {
      await bot.editMessageText("⏳ Processing " + bar + " " + percentStr + "% - " + status, {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    } catch (e) { /* Ignore */ }
  };

  let user = null;
  let server = null;

  try {
    // --- TAHAP 1: Validasi User (20%) ---
    await updateProgress(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username (40%) ---
    await updateProgress(40, "Checking Username Availability");
    if (typeof isUsernameExists === 'function') {
        const usernameExists = await isUsernameExists(settings.domain, settings.plta, username);
        if (usernameExists) {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
          return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI - Username " + username + " sudah terdaftar.", { reply_to_message_id: msg.message_id });
        }
    }

    // --- TAHAP 3: Membuat User (60%) ---
    await updateProgress(60, "Creating User Account");
    
    const name = username + "_" + plan;
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    const eggs = settings.eggs || 15;
    const loc = settings.loc || 1;
    
    const resUser = await fetch(settings.domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error("User API: " + (dataUser.errors[0].detail || "Unknown error"));
    user = dataUser.attributes;

    // --- TAHAP 4: Alokasi Server (80%) ---
    await updateProgress(80, "Allocating Server Resources");

    const resServer = await fetch(settings.domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: memo, swap: 0, disk, io: 500, cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error("Server API: " + (dataServer.errors[0].detail || "Unknown error"));
    server = dataServer.attributes;

    // --- TAHAP 5: Finalizing (100%) ---
    await updateProgress(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500)); 

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'GB', '3gb', 'V1', targetUserId, username, { memo, cpu, disk });
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE PANEL 3GB SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ RAM: <code>${memo}</code> MB | CPU: <code>${cpu}</code>% | DISK: <code>${disk}</code> MB

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN PANEL 3GB ANDA SIAP!</b>

📦 Paket: 3GB Plan (V1)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>${memo}</code> MB
• CPU: <code>${cpu}</code>%
• Disk: <code>${disk}</code> MB

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    // Cleanup jika user jadi tapi server gagal
    if (user && !server) {
      try {
        await fetch(settings.domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + settings.plta }
        });
      } catch (e) {
        console.error('Gagal hapus user saat cleanup:', e.message);
      }
    }

    const friendlyMsg = getFriendlyErrorMessage ? getFriendlyErrorMessage(err, "Panel 3GB") : err.message;
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + friendlyMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE FAILED (3GB)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// COMMAND /4gb (FIXED - HTML + SPOILER DOMAIN)
// ==========================================
bot.onText(/^\/4gb(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  const plan = "4gb";
  const text = match?.[1] ? match[1].trim() : "";

if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /command <username>,<id_telegram>", { reply_to_message_id: msg.message_id });
}

const t = text.split(",");  // ✅ AMAN

  // ========== 1. ACCESS CHECK ==========
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    if (!ownerUsers.includes(senderId)) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRoles = [
    { file: RESS_FILE, name: 'RESELLER' },
    { file: './db/users/pt.json', name: 'PARTNER' },
    { file: './db/users/adp.json', name: 'ADMIN PANEL' },
    { file: OWNERP_FILE, name: 'OWNER' },
    { file: './db/users/tk.json', name: 'TANGAN KANAN' },
    { file: './db/users/ceo.json', name: 'CEO' },
    { file: './db/users/developer.json', name: 'DEVELOPER' },
    { file: './db/users/asisten.json', name: 'ASISTEN' },
    { file: './db/users/vip.json', name: 'VIP MEMBER' },
    { file: './db/users/kepemilikan.json', name: 'KEPEMILIKAN' },
    { file: './db/users/managervip.json', name: 'MANAGER VIP' },
    { file: './db/users/managersvip.json', name: 'MANAGER SVIP' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role khusus yang bisa menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel sedang dikunci oleh Owner.");
  }
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. INPUT VALIDATION ==========
  if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /4gb <username>,<id_telegram>\nContoh: /4gb sanzy,123456789", { reply_to_message_id: msg.message_id });
  }
  
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.", { reply_to_message_id: msg.message_id });
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
  }
  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID", { reply_to_message_id: msg.message_id });
  }

  // ========== SPECS CONFIG ==========
  const specs = { memo: 4096, cpu: 120, disk: 5000 };
  const { memo, cpu, disk } = specs;

  // Cek Config Panel V1
  if (!settings.domain || !settings.plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V1 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  let progressText = "⏳ Processing [▒▒▒▒▒▒▒▒▒▒] 0%";
  let loadingMsg = await bot.sendMessage(chatId, progressText, { 
    reply_to_message_id: msg.message_id 
  });

  const updateProgress = async (percent, status) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const percentStr = percent.toString().padStart(3, ' ');
    
    try {
      await bot.editMessageText("⏳ Processing " + bar + " " + percentStr + "% - " + status, {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    } catch (e) { /* Ignore */ }
  };

  let user = null;
  let server = null;

  try {
    // --- TAHAP 1: Validasi User (20%) ---
    await updateProgress(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username (40%) ---
    await updateProgress(40, "Checking Username Availability");
    if (typeof isUsernameExists === 'function') {
        const usernameExists = await isUsernameExists(settings.domain, settings.plta, username);
        if (usernameExists) {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
          return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI - Username " + username + " sudah terdaftar.", { reply_to_message_id: msg.message_id });
        }
    }

    // --- TAHAP 3: Membuat User (60%) ---
    await updateProgress(60, "Creating User Account");
    
    const name = username + "_" + plan;
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    const eggs = settings.eggs || 15;
    const loc = settings.loc || 1;
    
    const resUser = await fetch(settings.domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error("User API: " + (dataUser.errors[0].detail || "Unknown error"));
    user = dataUser.attributes;

    // --- TAHAP 4: Alokasi Server (80%) ---
    await updateProgress(80, "Allocating Server Resources");

    const resServer = await fetch(settings.domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: memo, swap: 0, disk, io: 500, cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error("Server API: " + (dataServer.errors[0].detail || "Unknown error"));
    server = dataServer.attributes;

    // --- TAHAP 5: Finalizing (100%) ---
    await updateProgress(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500)); 

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'GB', '4gb', 'V1', targetUserId, username, { memo, cpu, disk });
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE PANEL 4GB SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ RAM: <code>${memo}</code> MB | CPU: <code>${cpu}</code>% | DISK: <code>${disk}</code> MB

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN PANEL 4GB ANDA SIAP!</b>

📦 Paket: 4GB Plan (V1)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>${memo}</code> MB
• CPU: <code>${cpu}</code>%
• Disk: <code>${disk}</code> MB

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    // Cleanup jika user jadi tapi server gagal
    if (user && !server) {
      try {
        await fetch(settings.domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + settings.plta }
        });
      } catch (e) {
        console.error('Gagal hapus user saat cleanup:', e.message);
      }
    }

    const friendlyMsg = getFriendlyErrorMessage ? getFriendlyErrorMessage(err, "Panel 4GB") : err.message;
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + friendlyMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE FAILED (4GB)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// COMMAND /5gb (FIXED - HTML + SPOILER DOMAIN)
// ==========================================
bot.onText(/^\/5gb(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  const plan = "5gb";
  const text = match?.[1] ? match[1].trim() : "";

if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /command <username>,<id_telegram>", { reply_to_message_id: msg.message_id });
}

const t = text.split(",");  // ✅ AMAN

  // ========== 1. ACCESS CHECK ==========
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    if (!ownerUsers.includes(senderId)) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRoles = [
    { file: RESS_FILE, name: 'RESELLER' },
    { file: './db/users/pt.json', name: 'PARTNER' },
    { file: './db/users/adp.json', name: 'ADMIN PANEL' },
    { file: OWNERP_FILE, name: 'OWNER' },
    { file: './db/users/tk.json', name: 'TANGAN KANAN' },
    { file: './db/users/ceo.json', name: 'CEO' },
    { file: './db/users/developer.json', name: 'DEVELOPER' },
    { file: './db/users/asisten.json', name: 'ASISTEN' },
    { file: './db/users/vip.json', name: 'VIP MEMBER' },
    { file: './db/users/kepemilikan.json', name: 'KEPEMILIKAN' },
    { file: './db/users/managervip.json', name: 'MANAGER VIP' },
    { file: './db/users/managersvip.json', name: 'MANAGER SVIP' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role khusus yang bisa menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel sedang dikunci oleh Owner.");
  }
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. INPUT VALIDATION ==========
  if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /5gb <username>,<id_telegram>\nContoh: /5gb sanzy,123456789", { reply_to_message_id: msg.message_id });
  }
  
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.", { reply_to_message_id: msg.message_id });
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
  }
  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID", { reply_to_message_id: msg.message_id });
  }

  // ========== SPECS CONFIG ==========
  const specs = { memo: 5120, cpu: 140, disk: 6000 };
  const { memo, cpu, disk } = specs;

  // Cek Config Panel V1
  if (!settings.domain || !settings.plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V1 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  let progressText = "⏳ Processing [▒▒▒▒▒▒▒▒▒▒] 0%";
  let loadingMsg = await bot.sendMessage(chatId, progressText, { 
    reply_to_message_id: msg.message_id 
  });

  const updateProgress = async (percent, status) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const percentStr = percent.toString().padStart(3, ' ');
    
    try {
      await bot.editMessageText("⏳ Processing " + bar + " " + percentStr + "% - " + status, {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    } catch (e) { /* Ignore */ }
  };

  let user = null;
  let server = null;

  try {
    // --- TAHAP 1: Validasi User (20%) ---
    await updateProgress(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username (40%) ---
    await updateProgress(40, "Checking Username Availability");
    if (typeof isUsernameExists === 'function') {
        const usernameExists = await isUsernameExists(settings.domain, settings.plta, username);
        if (usernameExists) {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
          return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI - Username " + username + " sudah terdaftar.", { reply_to_message_id: msg.message_id });
        }
    }

    // --- TAHAP 3: Membuat User (60%) ---
    await updateProgress(60, "Creating User Account");
    
    const name = username + "_" + plan;
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    const eggs = settings.eggs || 15;
    const loc = settings.loc || 1;
    
    const resUser = await fetch(settings.domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error("User API: " + (dataUser.errors[0].detail || "Unknown error"));
    user = dataUser.attributes;

    // --- TAHAP 4: Alokasi Server (80%) ---
    await updateProgress(80, "Allocating Server Resources");

    const resServer = await fetch(settings.domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: memo, swap: 0, disk, io: 500, cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error("Server API: " + (dataServer.errors[0].detail || "Unknown error"));
    server = dataServer.attributes;

    // --- TAHAP 5: Finalizing (100%) ---
    await updateProgress(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500)); 

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'GB', '5gb', 'V1', targetUserId, username, { memo, cpu, disk });
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE PANEL 5GB SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ RAM: <code>${memo}</code> MB | CPU: <code>${cpu}</code>% | DISK: <code>${disk}</code> MB

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN PANEL 5GB ANDA SIAP!</b>

📦 Paket: 5GB Plan (V1)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>${memo}</code> MB
• CPU: <code>${cpu}</code>%
• Disk: <code>${disk}</code> MB

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    // Cleanup jika user jadi tapi server gagal
    if (user && !server) {
      try {
        await fetch(settings.domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + settings.plta }
        });
      } catch (e) {
        console.error('Gagal hapus user saat cleanup:', e.message);
      }
    }

    const friendlyMsg = getFriendlyErrorMessage ? getFriendlyErrorMessage(err, "Panel 5GB") : err.message;
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + friendlyMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE FAILED (5GB)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// COMMAND /6gb (FIXED - HTML + SPOILER DOMAIN)
// ==========================================
bot.onText(/^\/6gb(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  const plan = "6gb";
  const text = match?.[1] ? match[1].trim() : "";

if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /command <username>,<id_telegram>", { reply_to_message_id: msg.message_id });
}

const t = text.split(",");  // ✅ AMAN

  // ========== 1. ACCESS CHECK ==========
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    if (!ownerUsers.includes(senderId)) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRoles = [
    { file: RESS_FILE, name: 'RESELLER' },
    { file: './db/users/pt.json', name: 'PARTNER' },
    { file: './db/users/adp.json', name: 'ADMIN PANEL' },
    { file: OWNERP_FILE, name: 'OWNER' },
    { file: './db/users/tk.json', name: 'TANGAN KANAN' },
    { file: './db/users/ceo.json', name: 'CEO' },
    { file: './db/users/developer.json', name: 'DEVELOPER' },
    { file: './db/users/asisten.json', name: 'ASISTEN' },
    { file: './db/users/vip.json', name: 'VIP MEMBER' },
    { file: './db/users/kepemilikan.json', name: 'KEPEMILIKAN' },
    { file: './db/users/managervip.json', name: 'MANAGER VIP' },
    { file: './db/users/managersvip.json', name: 'MANAGER SVIP' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role khusus yang bisa menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel sedang dikunci oleh Owner.");
  }
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. INPUT VALIDATION ==========
  if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /6gb <username>,<id_telegram>\nContoh: /6gb sanzy,123456789", { reply_to_message_id: msg.message_id });
  }
  
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.", { reply_to_message_id: msg.message_id });
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
  }
  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID", { reply_to_message_id: msg.message_id });
  }

  // ========== SPECS CONFIG ==========
  const specs = { memo: 6144, cpu: 160, disk: 7000 };
  const { memo, cpu, disk } = specs;

  // Cek Config Panel V1
  if (!settings.domain || !settings.plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V1 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  let progressText = "⏳ Processing [▒▒▒▒▒▒▒▒▒▒] 0%";
  let loadingMsg = await bot.sendMessage(chatId, progressText, { 
    reply_to_message_id: msg.message_id 
  });

  const updateProgress = async (percent, status) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const percentStr = percent.toString().padStart(3, ' ');
    
    try {
      await bot.editMessageText("⏳ Processing " + bar + " " + percentStr + "% - " + status, {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    } catch (e) { /* Ignore */ }
  };

  let user = null;
  let server = null;

  try {
    // --- TAHAP 1: Validasi User (20%) ---
    await updateProgress(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username (40%) ---
    await updateProgress(40, "Checking Username Availability");
    if (typeof isUsernameExists === 'function') {
        const usernameExists = await isUsernameExists(settings.domain, settings.plta, username);
        if (usernameExists) {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
          return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI - Username " + username + " sudah terdaftar.", { reply_to_message_id: msg.message_id });
        }
    }

    // --- TAHAP 3: Membuat User (60%) ---
    await updateProgress(60, "Creating User Account");
    
    const name = username + "_" + plan;
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    const eggs = settings.eggs || 15;
    const loc = settings.loc || 1;
    
    const resUser = await fetch(settings.domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error("User API: " + (dataUser.errors[0].detail || "Unknown error"));
    user = dataUser.attributes;

    // --- TAHAP 4: Alokasi Server (80%) ---
    await updateProgress(80, "Allocating Server Resources");

    const resServer = await fetch(settings.domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: memo, swap: 0, disk, io: 500, cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error("Server API: " + (dataServer.errors[0].detail || "Unknown error"));
    server = dataServer.attributes;

    // --- TAHAP 5: Finalizing (100%) ---
    await updateProgress(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500)); 

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'GB', '6gb', 'V1', targetUserId, username, { memo, cpu, disk });
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE PANEL 6GB SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ RAM: <code>${memo}</code> MB | CPU: <code>${cpu}</code>% | DISK: <code>${disk}</code> MB

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN PANEL 6GB ANDA SIAP!</b>

📦 Paket: 6GB Plan (V1)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>${memo}</code> MB
• CPU: <code>${cpu}</code>%
• Disk: <code>${disk}</code> MB

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    // Cleanup jika user jadi tapi server gagal
    if (user && !server) {
      try {
        await fetch(settings.domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + settings.plta }
        });
      } catch (e) {
        console.error('Gagal hapus user saat cleanup:', e.message);
      }
    }

    const friendlyMsg = getFriendlyErrorMessage ? getFriendlyErrorMessage(err, "Panel 6GB") : err.message;
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + friendlyMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE FAILED (6GB)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// COMMAND /7gb (FIXED - HTML + SPOILER DOMAIN)
// ==========================================
bot.onText(/^\/7gb(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  const plan = "7gb";
  const text = match?.[1] ? match[1].trim() : "";

if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /command <username>,<id_telegram>", { reply_to_message_id: msg.message_id });
}

const t = text.split(",");  // ✅ AMAN

  // ========== 1. ACCESS CHECK ==========
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    if (!ownerUsers.includes(senderId)) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRoles = [
    { file: RESS_FILE, name: 'RESELLER' },
    { file: './db/users/pt.json', name: 'PARTNER' },
    { file: './db/users/adp.json', name: 'ADMIN PANEL' },
    { file: OWNERP_FILE, name: 'OWNER' },
    { file: './db/users/tk.json', name: 'TANGAN KANAN' },
    { file: './db/users/ceo.json', name: 'CEO' },
    { file: './db/users/developer.json', name: 'DEVELOPER' },
    { file: './db/users/asisten.json', name: 'ASISTEN' },
    { file: './db/users/vip.json', name: 'VIP MEMBER' },
    { file: './db/users/kepemilikan.json', name: 'KEPEMILIKAN' },
    { file: './db/users/managervip.json', name: 'MANAGER VIP' },
    { file: './db/users/managersvip.json', name: 'MANAGER SVIP' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role khusus yang bisa menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel sedang dikunci oleh Owner.");
  }
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. INPUT VALIDATION ==========
  if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /7gb <username>,<id_telegram>\nContoh: /7gb sanzy,123456789", { reply_to_message_id: msg.message_id });
  }
  
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.", { reply_to_message_id: msg.message_id });
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
  }
  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID", { reply_to_message_id: msg.message_id });
  }

  // ========== SPECS CONFIG ==========
  const specs = { memo: 7168, cpu: 180, disk: 8000 };
  const { memo, cpu, disk } = specs;

  // Cek Config Panel V1
  if (!settings.domain || !settings.plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V1 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  let progressText = "⏳ Processing [▒▒▒▒▒▒▒▒▒▒] 0%";
  let loadingMsg = await bot.sendMessage(chatId, progressText, { 
    reply_to_message_id: msg.message_id 
  });

  const updateProgress = async (percent, status) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const percentStr = percent.toString().padStart(3, ' ');
    
    try {
      await bot.editMessageText("⏳ Processing " + bar + " " + percentStr + "% - " + status, {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    } catch (e) { /* Ignore */ }
  };

  let user = null;
  let server = null;

  try {
    // --- TAHAP 1: Validasi User (20%) ---
    await updateProgress(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username (40%) ---
    await updateProgress(40, "Checking Username Availability");
    if (typeof isUsernameExists === 'function') {
        const usernameExists = await isUsernameExists(settings.domain, settings.plta, username);
        if (usernameExists) {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
          return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI - Username " + username + " sudah terdaftar.", { reply_to_message_id: msg.message_id });
        }
    }

    // --- TAHAP 3: Membuat User (60%) ---
    await updateProgress(60, "Creating User Account");
    
    const name = username + "_" + plan;
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    const eggs = settings.eggs || 15;
    const loc = settings.loc || 1;
    
    const resUser = await fetch(settings.domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error("User API: " + (dataUser.errors[0].detail || "Unknown error"));
    user = dataUser.attributes;

    // --- TAHAP 4: Alokasi Server (80%) ---
    await updateProgress(80, "Allocating Server Resources");

    const resServer = await fetch(settings.domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: memo, swap: 0, disk, io: 500, cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error("Server API: " + (dataServer.errors[0].detail || "Unknown error"));
    server = dataServer.attributes;

    // --- TAHAP 5: Finalizing (100%) ---
    await updateProgress(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500)); 

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'GB', '7gb', 'V1', targetUserId, username, { memo, cpu, disk });
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE PANEL 7GB SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ RAM: <code>${memo}</code> MB | CPU: <code>${cpu}</code>% | DISK: <code>${disk}</code> MB

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN PANEL 7GB ANDA SIAP!</b>

📦 Paket: 7GB Plan (V1)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>${memo}</code> MB
• CPU: <code>${cpu}</code>%
• Disk: <code>${disk}</code> MB

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    // Cleanup jika user jadi tapi server gagal
    if (user && !server) {
      try {
        await fetch(settings.domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + settings.plta }
        });
      } catch (e) {
        console.error('Gagal hapus user saat cleanup:', e.message);
      }
    }

    const friendlyMsg = getFriendlyErrorMessage ? getFriendlyErrorMessage(err, "Panel 7GB") : err.message;
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + friendlyMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE FAILED (7GB)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// COMMAND /8gb (FIXED - HTML + SPOILER DOMAIN)
// ==========================================
bot.onText(/^\/8gb(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  const plan = "8gb";
  const text = match?.[1] ? match[1].trim() : "";

if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /command <username>,<id_telegram>", { reply_to_message_id: msg.message_id });
}

const t = text.split(",");  // ✅ AMAN

  // ========== 1. ACCESS CHECK ==========
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    if (!ownerUsers.includes(senderId)) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRoles = [
    { file: RESS_FILE, name: 'RESELLER' },
    { file: './db/users/pt.json', name: 'PARTNER' },
    { file: './db/users/adp.json', name: 'ADMIN PANEL' },
    { file: OWNERP_FILE, name: 'OWNER' },
    { file: './db/users/tk.json', name: 'TANGAN KANAN' },
    { file: './db/users/ceo.json', name: 'CEO' },
    { file: './db/users/developer.json', name: 'DEVELOPER' },
    { file: './db/users/asisten.json', name: 'ASISTEN' },
    { file: './db/users/vip.json', name: 'VIP MEMBER' },
    { file: './db/users/kepemilikan.json', name: 'KEPEMILIKAN' },
    { file: './db/users/managervip.json', name: 'MANAGER VIP' },
    { file: './db/users/managersvip.json', name: 'MANAGER SVIP' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role khusus yang bisa menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel sedang dikunci oleh Owner.");
  }
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. INPUT VALIDATION ==========
  if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /8gb <username>,<id_telegram>\nContoh: /8gb sanzy,123456789", { reply_to_message_id: msg.message_id });
  }
  
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.", { reply_to_message_id: msg.message_id });
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
  }
  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID", { reply_to_message_id: msg.message_id });
  }

  // ========== SPECS CONFIG ==========
  const specs = { memo: 8192, cpu: 200, disk: 9000 };
  const { memo, cpu, disk } = specs;

  // Cek Config Panel V1
  if (!settings.domain || !settings.plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V1 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  let progressText = "⏳ Processing [▒▒▒▒▒▒▒▒▒▒] 0%";
  let loadingMsg = await bot.sendMessage(chatId, progressText, { 
    reply_to_message_id: msg.message_id 
  });

  const updateProgress = async (percent, status) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const percentStr = percent.toString().padStart(3, ' ');
    
    try {
      await bot.editMessageText("⏳ Processing " + bar + " " + percentStr + "% - " + status, {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    } catch (e) { /* Ignore */ }
  };

  let user = null;
  let server = null;

  try {
    // --- TAHAP 1: Validasi User (20%) ---
    await updateProgress(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username (40%) ---
    await updateProgress(40, "Checking Username Availability");
    if (typeof isUsernameExists === 'function') {
        const usernameExists = await isUsernameExists(settings.domain, settings.plta, username);
        if (usernameExists) {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
          return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI - Username " + username + " sudah terdaftar.", { reply_to_message_id: msg.message_id });
        }
    }

    // --- TAHAP 3: Membuat User (60%) ---
    await updateProgress(60, "Creating User Account");
    
    const name = username + "_" + plan;
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    const eggs = settings.eggs || 15;
    const loc = settings.loc || 1;
    
    const resUser = await fetch(settings.domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error("User API: " + (dataUser.errors[0].detail || "Unknown error"));
    user = dataUser.attributes;

    // --- TAHAP 4: Alokasi Server (80%) ---
    await updateProgress(80, "Allocating Server Resources");

    const resServer = await fetch(settings.domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: memo, swap: 0, disk, io: 500, cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error("Server API: " + (dataServer.errors[0].detail || "Unknown error"));
    server = dataServer.attributes;

    // --- TAHAP 5: Finalizing (100%) ---
    await updateProgress(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500)); 

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'GB', '8gb', 'V1', targetUserId, username, { memo, cpu, disk });
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE PANEL 8GB SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ RAM: <code>${memo}</code> MB | CPU: <code>${cpu}</code>% | DISK: <code>${disk}</code> MB

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN PANEL 8GB ANDA SIAP!</b>

📦 Paket: 8GB Plan (V1)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>${memo}</code> MB
• CPU: <code>${cpu}</code>%
• Disk: <code>${disk}</code> MB

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    // Cleanup jika user jadi tapi server gagal
    if (user && !server) {
      try {
        await fetch(settings.domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + settings.plta }
        });
      } catch (e) {
        console.error('Gagal hapus user saat cleanup:', e.message);
      }
    }

    const friendlyMsg = getFriendlyErrorMessage ? getFriendlyErrorMessage(err, "Panel 8GB") : err.message;
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + friendlyMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE FAILED (8GB)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// COMMAND /9gb (FIXED - HTML + SPOILER DOMAIN)
// ==========================================
bot.onText(/^\/9gb(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  const plan = "9gb";
  const text = match?.[1] ? match[1].trim() : "";

if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /command <username>,<id_telegram>", { reply_to_message_id: msg.message_id });
}

const t = text.split(",");  // ✅ AMAN

  // ========== 1. ACCESS CHECK ==========
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    if (!ownerUsers.includes(senderId)) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRoles = [
    { file: RESS_FILE, name: 'RESELLER' },
    { file: './db/users/pt.json', name: 'PARTNER' },
    { file: './db/users/adp.json', name: 'ADMIN PANEL' },
    { file: OWNERP_FILE, name: 'OWNER' },
    { file: './db/users/tk.json', name: 'TANGAN KANAN' },
    { file: './db/users/ceo.json', name: 'CEO' },
    { file: './db/users/developer.json', name: 'DEVELOPER' },
    { file: './db/users/asisten.json', name: 'ASISTEN' },
    { file: './db/users/vip.json', name: 'VIP MEMBER' },
    { file: './db/users/kepemilikan.json', name: 'KEPEMILIKAN' },
    { file: './db/users/managervip.json', name: 'MANAGER VIP' },
    { file: './db/users/managersvip.json', name: 'MANAGER SVIP' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role khusus yang bisa menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel sedang dikunci oleh Owner.");
  }
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. INPUT VALIDATION ==========
  if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /9gb <username>,<id_telegram>\nContoh: /9gb sanzy,123456789", { reply_to_message_id: msg.message_id });
  }
  
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.", { reply_to_message_id: msg.message_id });
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
  }
  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID", { reply_to_message_id: msg.message_id });
  }

  // ========== SPECS CONFIG ==========
  const specs = { memo: 9216, cpu: 220, disk: 10000 };
  const { memo, cpu, disk } = specs;

  // Cek Config Panel V1
  if (!settings.domain || !settings.plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V1 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  let progressText = "⏳ Processing [▒▒▒▒▒▒▒▒▒▒] 0%";
  let loadingMsg = await bot.sendMessage(chatId, progressText, { 
    reply_to_message_id: msg.message_id 
  });

  const updateProgress = async (percent, status) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const percentStr = percent.toString().padStart(3, ' ');
    
    try {
      await bot.editMessageText("⏳ Processing " + bar + " " + percentStr + "% - " + status, {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    } catch (e) { /* Ignore */ }
  };

  let user = null;
  let server = null;

  try {
    // --- TAHAP 1: Validasi User (20%) ---
    await updateProgress(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username (40%) ---
    await updateProgress(40, "Checking Username Availability");
    if (typeof isUsernameExists === 'function') {
        const usernameExists = await isUsernameExists(settings.domain, settings.plta, username);
        if (usernameExists) {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
          return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI - Username " + username + " sudah terdaftar.", { reply_to_message_id: msg.message_id });
        }
    }

    // --- TAHAP 3: Membuat User (60%) ---
    await updateProgress(60, "Creating User Account");
    
    const name = username + "_" + plan;
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    const eggs = settings.eggs || 15;
    const loc = settings.loc || 1;
    
    const resUser = await fetch(settings.domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error("User API: " + (dataUser.errors[0].detail || "Unknown error"));
    user = dataUser.attributes;

    // --- TAHAP 4: Alokasi Server (80%) ---
    await updateProgress(80, "Allocating Server Resources");

    const resServer = await fetch(settings.domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: memo, swap: 0, disk, io: 500, cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error("Server API: " + (dataServer.errors[0].detail || "Unknown error"));
    server = dataServer.attributes;

    // --- TAHAP 5: Finalizing (100%) ---
    await updateProgress(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500)); 

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'GB', '9gb', 'V1', targetUserId, username, { memo, cpu, disk });
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE PANEL 9GB SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ RAM: <code>${memo}</code> MB | CPU: <code>${cpu}</code>% | DISK: <code>${disk}</code> MB

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN PANEL 9GB ANDA SIAP!</b>

📦 Paket: 9GB Plan (V1)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>${memo}</code> MB
• CPU: <code>${cpu}</code>%
• Disk: <code>${disk}</code> MB

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    // Cleanup jika user jadi tapi server gagal
    if (user && !server) {
      try {
        await fetch(settings.domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + settings.plta }
        });
      } catch (e) {
        console.error('Gagal hapus user saat cleanup:', e.message);
      }
    }

    const friendlyMsg = getFriendlyErrorMessage ? getFriendlyErrorMessage(err, "Panel 9GB") : err.message;
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + friendlyMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE FAILED (9GB)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

// ==========================================
// COMMAND /10gb (FIXED - HTML + SPOILER DOMAIN)
// ==========================================
bot.onText(/^\/10gb(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = String(msg.from.id);
  const plan = "10gb";
  const text = match?.[1] ? match[1].trim() : "";

if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /command <username>,<id_telegram>", { reply_to_message_id: msg.message_id });
}

const t = text.split(",");  // ✅ AMAN

  // ========== 1. ACCESS CHECK ==========
  if (checkMaintenance(msg)) return;
  if (chatId.toString() !== settings.exGroupId) {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    if (!ownerUsers.includes(senderId)) {
      return bot.sendMessage(chatId, "❌ AKSES DITOLAK - Command ini hanya bisa digunakan di grup khusus.", {
        reply_to_message_id: msg.message_id
      });
    }
  }

  // ========== 2. ROLE CHECK ==========
  const allowedRoles = [
    { file: RESS_FILE, name: 'RESELLER' },
    { file: './db/users/pt.json', name: 'PARTNER' },
    { file: './db/users/adp.json', name: 'ADMIN PANEL' },
    { file: OWNERP_FILE, name: 'OWNER' },
    { file: './db/users/tk.json', name: 'TANGAN KANAN' },
    { file: './db/users/ceo.json', name: 'CEO' },
    { file: './db/users/developer.json', name: 'DEVELOPER' },
    { file: './db/users/asisten.json', name: 'ASISTEN' },
    { file: './db/users/vip.json', name: 'VIP MEMBER' },
    { file: './db/users/kepemilikan.json', name: 'KEPEMILIKAN' },
    { file: './db/users/managervip.json', name: 'MANAGER VIP' },
    { file: './db/users/managersvip.json', name: 'MANAGER SVIP' }
  ];
  
  let hasAccess = false;
  for (const role of allowedRoles) {
    try {
      if (fs.existsSync(role.file)) {
        const data = JSON.parse(fs.readFileSync(role.file));
        if (data.includes(senderId)) { hasAccess = true; break; }
      }
    } catch (e) {}
  }
  if (!hasAccess) {
    return bot.sendMessage(chatId, "❌ AKSES DITOLAK! Hanya role khusus yang bisa menggunakan command ini.");
  }

  // ========== 3. LOCK & COOLDOWN ==========
  if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
    return bot.sendMessage(chatId, "🔒 SYSTEM LOCKED - Pembuatan Panel sedang dikunci oleh Owner.");
  }
  const waktu = checkCooldown(senderId);
  if (waktu > 0) {
    return bot.sendMessage(chatId, "⏳ COOLDOWN - Tunggu " + waktu + " detik lagi.", { reply_to_message_id: msg.message_id });
  }

  // ========== 4. INPUT VALIDATION ==========
  if (!text) {
    return bot.sendMessage(chatId, "❌ FORMAT SALAH\n\nPenggunaan: /10gb <username>,<id_telegram>\nContoh: /10gb sanzy,123456789", { reply_to_message_id: msg.message_id });
  }
  
  if (t.length < 2) {
    return bot.sendMessage(chatId, "⚠️ FORMAT TIDAK LENGKAP - Pastikan ada koma (,) antara username dan ID.", { reply_to_message_id: msg.message_id });
  }

  const username = t[0].trim();
  const targetUserIdStr = t[1].trim();
  const targetUserId = parseInt(targetUserIdStr);

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return bot.sendMessage(chatId, "❌ USERNAME TIDAK VALID\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
  }
  if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
    return bot.sendMessage(chatId, "❌ ID TELEGRAM TIDAK VALID", { reply_to_message_id: msg.message_id });
  }

  // ========== SPECS CONFIG ==========
  const specs = { memo: 10240, cpu: 240, disk: 11000 };
  const { memo, cpu, disk } = specs;

  // Cek Config Panel V1
  if (!settings.domain || !settings.plta) {
    return bot.sendMessage(chatId, "❌ KONFIGURASI ERROR - Domain atau PLTA Panel V1 belum diatur di config bot.", { reply_to_message_id: msg.message_id });
  }

  // ========== START LOADING BAR ==========
  let progressText = "⏳ Processing [▒▒▒▒▒▒▒▒▒▒] 0%";
  let loadingMsg = await bot.sendMessage(chatId, progressText, { 
    reply_to_message_id: msg.message_id 
  });

  const updateProgress = async (percent, status) => {
    const filled = "█".repeat(Math.floor(percent / 10));
    const empty = "▒".repeat(10 - Math.floor(percent / 10));
    const bar = "[" + filled + empty + "]";
    const percentStr = percent.toString().padStart(3, ' ');
    
    try {
      await bot.editMessageText("⏳ Processing " + bar + " " + percentStr + "% - " + status, {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    } catch (e) { /* Ignore */ }
  };

  let user = null;
  let server = null;

  try {
    // --- TAHAP 1: Validasi User (20%) ---
    await updateProgress(20, "Validating Telegram User");
    try {
      await bot.getChat(targetUserId);
    } catch (err) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      const statusCode = err.response?.statusCode;
      const errLower = (err.response?.description || "").toLowerCase();
      
      if (statusCode === 400 && (errLower.includes("chat not found"))) {
        return bot.sendMessage(chatId, "❌ USER BELUM START BOT - User ID " + targetUserId + " belum pernah start bot.", { reply_to_message_id: msg.message_id });
      } else if (statusCode === 403) {
        return bot.sendMessage(chatId, "❌ USER MEMBLOKIR BOT", { reply_to_message_id: msg.message_id });
      } else {
        return bot.sendMessage(chatId, "⚠️ GANGGUAN SISTEM", { reply_to_message_id: msg.message_id });
      }
    }

    // --- TAHAP 2: Cek Username (40%) ---
    await updateProgress(40, "Checking Username Availability");
    if (typeof isUsernameExists === 'function') {
        const usernameExists = await isUsernameExists(settings.domain, settings.plta, username);
        if (usernameExists) {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
          return bot.sendMessage(chatId, "❌ USERNAME SUDAH DIPAKAI - Username " + username + " sudah terdaftar.", { reply_to_message_id: msg.message_id });
        }
    }

    // --- TAHAP 3: Membuat User (60%) ---
    await updateProgress(60, "Creating User Account");
    
    const name = username + "_" + plan;
    const email = username + "@gmail.com";
    const password = generateSecurePassword(12);
    const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';
    const eggs = settings.eggs || 15;
    const loc = settings.loc || 1;
    
    const resUser = await fetch(settings.domain + "/api/application/users", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
      signal: AbortSignal.timeout(15000)
    });
    const dataUser = await resUser.json();
    if (dataUser.errors) throw new Error("User API: " + (dataUser.errors[0].detail || "Unknown error"));
    user = dataUser.attributes;

    // --- TAHAP 4: Alokasi Server (80%) ---
    await updateProgress(80, "Allocating Server Resources");

    const resServer = await fetch(settings.domain + "/api/application/servers", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + settings.plta },
      body: JSON.stringify({
        name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
        limits: { memory: memo, swap: 0, disk, io: 500, cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 1 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
      }),
      signal: AbortSignal.timeout(20000)
    });
    const dataServer = await resServer.json();
    if (dataServer.errors) throw new Error("Server API: " + (dataServer.errors[0].detail || "Unknown error"));
    server = dataServer.attributes;

    // --- TAHAP 5: Finalizing (100%) ---
    await updateProgress(100, "Finalizing Setup");
    await new Promise(r => setTimeout(r, 500)); 

    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

    // ========== NOTIFIKASI KE CHANNEL (DI SINI - TRY BLOCK) ==========
    await sendCreateNotification(bot, msg, 'GB', '10gb', 'V1', targetUserId, username, { memo, cpu, disk });
    // ========== END NOTIFIKASI ==========

    // ========== SUKSES ==========
    const successMsg = 
`✅ <b>CREATE PANEL 10GB SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ RAM: <code>${memo}</code> MB | CPU: <code>${cpu}</code>% | DISK: <code>${disk}</code> MB

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

    await bot.sendMessage(chatId, successMsg, { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });

    // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
    const captionUser = 
`🔐 <b>AKUN PANEL 10GB ANDA SIAP!</b>

📦 Paket: 10GB Plan (V1)
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>${memo}</code> MB
• CPU: <code>${cpu}</code>%
• Disk: <code>${disk}</code> MB

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

    await bot.sendPhoto(targetUserId, settings.panel, {
      caption: captionUser,
      parse_mode: "HTML"
    });

  } catch (err) {
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    // Cleanup jika user jadi tapi server gagal
    if (user && !server) {
      try {
        await fetch(settings.domain + "/api/application/users/" + user.id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + settings.plta }
        });
      } catch (e) {
        console.error('Gagal hapus user saat cleanup:', e.message);
      }
    }

    const friendlyMsg = getFriendlyErrorMessage ? getFriendlyErrorMessage(err, "Panel 10GB") : err.message;
    
    await bot.sendMessage(chatId, "❌ <b>PROCESS FAILED</b>\n\n" + friendlyMsg + "\n\n💡 Jika masalah berlanjut, hubungi Owner.", { 
      parse_mode: "HTML",
      reply_to_message_id: msg.message_id 
    });
    
    try {
      await bot.telegram.sendMessage(
        config.ownerId,
        "<b>🚨 CREATE FAILED (10GB)</b>\n<b>User:</b> " + msg.from.first_name + " (" + senderId + ")\n<b>Username:</b> " + username + "\n<b>Error:</b> " + err.message,
        { parse_mode: "HTML" }
      );
    } catch (e) {}
  }
});

const versionsGB = ['v2', 'v3', 'v4', 'v5'];

for (const ver of versionsGB) {
  const upperVer = ver.toUpperCase(); // V2, V3, V4, V5
  
  bot.onText(new RegExp(`\\/(\\d+gb${ver})(?:\\s+(.+))?`), async (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = String(msg.from.id);
    const plan = match[1]; // e.g., "2gbv3"
    const text = match[2];

    // ========== 1. GROUP CHECK ==========
    if (checkMaintenance(msg)) return;
    if (chatId.toString() !== settings.exGroupId) {
      return bot.sendMessage(chatId, "❌ <b>AKSES DITOLAK</b>\n\nCommand ini hanya bisa digunakan di grup khusus.", {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id
      });
    }

    // ========== 2. ROLE CHECK ==========
    const roleFiles = {
      premium: `./db/users/version/premium${upperVer}.json`, 
      reseller: `./db/users/version/reseller${upperVer}.json`,
      partner: `./db/users/version/partner${upperVer}.json`, 
      adp: `./db/users/version/adp${upperVer}.json`,
      owner: `./db/users/version/owner${upperVer}.json`, 
      tk: `./db/users/version/tk${upperVer}.json`,
      ceo: `./db/users/version/ceo${upperVer}.json`, 
      developer: `./db/users/version/developer${upperVer}.json`,
      asisten: `./db/users/version/asisten${upperVer}.json`, 
      vip: `./db/users/version/vip${upperVer}.json`,
      kepemilikan: `./db/users/version/kepemilikan${upperVer}.json`, 
      managervip: `./db/users/version/managervip${upperVer}.json`,
      managersvip: `./db/users/version/managersvip${upperVer}.json`
    };
    
    const allowedRoles = Object.keys(roleFiles).map(k => ({ file: roleFiles[k], name: `${k.toUpperCase()} ${upperVer}` }));
    
    let hasAccess = false;
    for (const role of allowedRoles) {
      try {
        if (fs.existsSync(role.file)) {
          const data = JSON.parse(fs.readFileSync(role.file));
          if (data.includes(senderId)) { hasAccess = true; break; }
        }
      } catch (e) {}
    }
    
    if (!hasAccess) {
      return bot.sendMessage(chatId, `❌ <b>AKSES DITOLAK!</b>\n\nAnda tidak memiliki izin (Role ${upperVer}) untuk menggunakan command ini.`, { parse_mode: "HTML" });
    }

    // ========== 3. LOCK & COOLDOWN ==========
    if (typeof isUnliLocked !== 'undefined' && isUnliLocked()) {
      return bot.sendMessage(chatId, "🔒 <b>SYSTEM LOCKED</b>\n\nPembuatan Panel sedang dikunci oleh Owner.", { parse_mode: "HTML" });
    }
    
    const waktu = checkCooldown(senderId);
    if (waktu > 0) {
      return bot.sendMessage(chatId, `⏳ <b>COOLDOWN</b>\n\nTunggu ${waktu} detik lagi.`, { reply_to_message_id: msg.message_id });
    }

    // ========== 4. INPUT VALIDATION ==========
    if (!text) {
      return bot.sendMessage(chatId, `❌ <b>FORMAT SALAH</b>\n\nPenggunaan: /${plan} &lt;username&gt;,&lt;id_telegram&gt;\nContoh: /${plan} sanzy,123456789`, { parse_mode: "HTML" });
    }
    
    const t = text.split(",");
    if (t.length < 2) {
      return bot.sendMessage(chatId, `⚠️ <b>FORMAT TIDAK LENGKAP</b>\n\nPastikan ada koma (,) antara username dan ID.`, { parse_mode: "HTML" });
    }

    const username = t[0].trim();
    const targetUserIdStr = t[1].trim();
    const targetUserId = parseInt(targetUserIdStr);

    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
      return bot.sendMessage(chatId, "❌ <b>USERNAME TIDAK VALID</b>\n\n• Panjang: 3-20 karakter\n• Hanya huruf & angka", { reply_to_message_id: msg.message_id });
    }
    if (isNaN(targetUserId) || targetUserIdStr.length < 5) {
      return bot.sendMessage(chatId, "❌ <b>ID TELEGRAM TIDAK VALID</b>", { reply_to_message_id: msg.message_id });
    }

    // ========== SPECS CONFIG ==========
    const specsMap = {
      [`1gb${ver}`]: { memo: 1024, cpu: 60, disk: 2000 },
      [`2gb${ver}`]: { memo: 2048, cpu: 80, disk: 3000 },
      [`3gb${ver}`]: { memo: 3072, cpu: 100, disk: 4000 },
      [`4gb${ver}`]: { memo: 4096, cpu: 120, disk: 5000 },
      [`5gb${ver}`]: { memo: 5120, cpu: 140, disk: 6000 },
      [`6gb${ver}`]: { memo: 6144, cpu: 160, disk: 7000 },
      [`7gb${ver}`]: { memo: 7168, cpu: 180, disk: 8000 },
      [`8gb${ver}`]: { memo: 8192, cpu: 200, disk: 9000 },
      [`9gb${ver}`]: { memo: 9216, cpu: 220, disk: 10000 },
      [`10gb${ver}`]: { memo: 10240, cpu: 240, disk: 11000 }
    };
    
    const planSpecs = specsMap[plan];
    if (!planSpecs) return bot.sendMessage(chatId, `❌ Spesifikasi untuk ${plan} tidak ditemukan.`);
    const { memo, cpu, disk } = planSpecs;

    // ========== CONFIG VERSION-SPECIFIC ==========
    const domain = settings[`domain${upperVer}`];
    const plta = settings[`plta${upperVer}`];
    const eggs = settings[`eggs${upperVer}`] || settings.eggs || 15;
    const loc = settings[`loc${upperVer}`] || settings.loc || 1;
    
    if (!domain || !plta) {
      return bot.sendMessage(chatId, `❌ Konfigurasi Panel ${upperVer} belum diatur di settings!`, { reply_to_message_id: msg.message_id });
    }

    // ========== START LOADING BAR ==========
    let progressText = "⏳ Processing [▒▒▒▒▒▒▒▒▒▒] 0%";
    let loadingMsg = await bot.sendMessage(chatId, progressText, { 
      reply_to_message_id: msg.message_id 
    });

    const updateProgress = async (percent, status) => {
      const filled = "█".repeat(Math.floor(percent / 10));
      const empty = "▒".repeat(10 - Math.floor(percent / 10));
      const bar = `[${filled}${empty}]`;
      const percentStr = percent.toString().padStart(3, ' ');
      
      try {
        await bot.editMessageText(`⏳ Processing ${bar} ${percentStr}% - ${status}`, {
          chat_id: chatId,
          message_id: loadingMsg.message_id
        });
      } catch (e) { /* Ignore */ }
    };

    let user = null;
    let server = null;

    try {
      // --- TAHAP 1: Validasi User (20%) ---
      await updateProgress(20, "Validating Telegram User");
      try {
        await bot.getChat(targetUserId);
      } catch (err) {
        await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        const statusCode = err.response?.statusCode;
        const errLower = (err.response?.description || "").toLowerCase();
        
        if (statusCode === 400 && (errLower.includes("chat not found"))) {
          return bot.sendMessage(chatId, `❌ <b>USER BELUM START BOT</b>\nUser ID <code>${targetUserId}</code> belum pernah start bot.`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
        } else if (statusCode === 403) {
          return bot.sendMessage(chatId, `❌ <b>USER MEMBLOKIR BOT</b>`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
        } else {
          return bot.sendMessage(chatId, `⚠️ <b>GANGGUAN SISTEM</b>`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
        }
      }

      // --- TAHAP 2: Cek Username (40%) ---
      await updateProgress(40, "Checking Username Availability");
      if (typeof isUsernameExists === 'function') {
        const usernameExists = await isUsernameExists(domain, plta, username);
        if (usernameExists) {
          await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
          return bot.sendMessage(chatId, `❌ <b>USERNAME SUDAH DIPAKAI</b>\nUsername <code>${username}</code> sudah terdaftar di Panel ${upperVer}.`, { parse_mode: "HTML", reply_to_message_id: msg.message_id });
        }
      }

      // --- TAHAP 3: Membuat User (60%) ---
      await updateProgress(60, "Creating User Account");
      
      const name = `${username}_${plan}`;
      const email = `${username}@gmail.com`;
      const password = generateSecurePassword(12);
      const spc = 'if [ -f package.json ]; then npm install --production; fi; ${CMD_RUN}';

      // Create User API
      const resUser = await fetch(`${domain}/api/application/users`, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": `Bearer ${plta}` },
        body: JSON.stringify({ email, username, first_name: username, last_name: username, language: "en", password }),
        signal: AbortSignal.timeout(15000)
      });
      const dataUser = await resUser.json();
      if (dataUser.errors) throw new Error(`User API: ${dataUser.errors[0].detail}`);
      user = dataUser.attributes;

      // --- TAHAP 4: Alokasi Server (80%) ---
      await updateProgress(80, "Allocating Server Resources");

      // Create Server API
      const resServer = await fetch(`${domain}/api/application/servers`, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": `Bearer ${plta}` },
        body: JSON.stringify({
          name, user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: spc,
          environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
          limits: { memory: memo, swap: 0, disk, io: 500, cpu },
          feature_limits: { databases: 5, backups: 5, allocations: 1 },
          deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
        }),
        signal: AbortSignal.timeout(20000)
      });
      const dataServer = await resServer.json();
      if (dataServer.errors) throw new Error(`Server API: ${dataServer.errors[0].detail}`);
      server = dataServer.attributes;

      // --- TAHAP 5: Finalizing (100%) ---
      await updateProgress(100, "Finalizing Setup");
      await new Promise(r => setTimeout(r, 500)); 

      // Hapus Loading Bar
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

      // ========== NOTIFIKASI KE CHANNEL ==========
      const gbValue = plan.replace(/gb.*/, '');
      await sendCreateNotification(bot, msg, 'GB', `${gbValue}gb`, upperVer, targetUserId, username, { memo, cpu, disk });
      // ========== END NOTIFIKASI ==========

      // ========== SUKSES: NOTIFIKASI KE ADMIN ==========
      const successMsg = 
`✅ <b>CREATE PANEL ${plan.toUpperCase()} SUCCESS!</b>

📡 ID: <code>${user.id}</code>
👤 USERNAME: <code>${username}</code>
⚙️ RAM: <code>${memo}</code> MB | CPU: <code>${cpu}</code>% | DISK: <code>${disk}</code> MB

✅ Berhasil dikirim ke @${msg.from.username || 'User'}
(ID: <code>${targetUserId}</code>)`;

      await bot.sendMessage(chatId, successMsg, { 
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id 
      });

      // ========== KIRIM KE USER DENGAN SPOILER DOMAIN ==========
      const captionUser = 
`🔐 <b>AKUN PANEL ${plan.toUpperCase()} ANDA SIAP!</b>

📦 Paket: ${plan.toUpperCase()} (${upperVer})
<b>🌐 Login:</b> <a href="${domain}">🔗 KLIK LOGIN</a>
👤 <b>Username:</b> <code>${username}</code>
🔑 <b>Password:</b> <code>${password}</code>

⚙️ <b>Spek:</b>
• RAM: <code>${memo}</code> MB
• CPU: <code>${cpu}</code>%
• Disk: <code>${disk}</code> MB

⚠️ <b>PENTING:</b>
• Segera ganti password di profil
• Garansi 15 hari
• Simpan data login ini`;

      await bot.sendPhoto(targetUserId, settings.panel, {
        caption: captionUser,
        parse_mode: "HTML"
      });

    } catch (err) {
      await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
      
      if (user && !server) {
        try {
          await fetch(`${domain}/api/application/users/${user.id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${plta}` }
          });
        } catch (e) {}
      }

      const friendlyMsg = getFriendlyErrorMessage ? getFriendlyErrorMessage(err, `Panel ${plan}`) : err.message;
      
      await bot.sendMessage(chatId, 
        `❌ <b>PROCESS FAILED</b>\n\n${friendlyMsg}\n\n💡 Jika masalah berlanjut, hubungi Owner.`, 
        { parse_mode: "HTML", reply_to_message_id: msg.message_id }
      );
      
      try {
        await bot.telegram.sendMessage(
          config.ownerId,
          `<b>🚨 CREATE FAILED (${plan.toUpperCase()})</b>\n<b>User:</b> ${msg.from.first_name} (${senderId})\n<b>Username:</b> ${username}\n<b>Error:</b> ${err.message}`,
          { parse_mode: "HTML" }
        );
      } catch (e) {}
    }
  });
}

// ========== CLEAR ALL ROLE V1 (DENGAN LOADING) ==========
bot.onText(/^\/clearallrole$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (String(userId) !== String(OWNER_ID)) {
        return bot.sendMessage(chatId, "❌ Khusus Owner!");
    }
    
    // ========== KIRIM LOADING ==========
    const loadingMsg = await bot.sendMessage(chatId, "⏳ <b>Memproses clear all role V1...</b>\n\n📊 Mengumpulkan data user...", { parse_mode: "HTML" });
    
    // Daftar role V1
    const roles = [
        { name: "PREMIUM", file: './db/users/premiumUsers.json' },
        { name: "RESELLER", file: './db/users/resellerUsers.json' },
        { name: "PARTNER", file: './db/users/pt.json' },
        { name: "ADMIN PANEL", file: './db/users/adp.json' },
        { name: "OWNER", file: './db/users/ownerID.json' },
        { name: "TANGAN KANAN", file: './db/users/tk.json' },
        { name: "CEO", file: './db/users/ceo.json' },
        { name: "DEVELOPER", file: './db/users/developer.json' },
        { name: "ASISTEN", file: './db/users/asisten.json' },
        { name: "VIP MEMBER", file: './db/users/vip.json' },
        { name: "KEPEMILIKAN", file: './db/users/kepemilikan.json' },
        { name: "MANAGER VIP", file: './db/users/managervip.json' },
        { name: "MANAGER SVIP", file: './db/users/managersvip.json' }
    ];
    
    // Buat folder backup
    if (!fs.existsSync('./db/backup')) fs.mkdirSync('./db/backup', { recursive: true });
    
    // Update loading
    await bot.editMessageText("⏳ <b>Memproses clear all role V1...</b>\n\n📊 Mengumpulkan user yang terkena...", {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: "HTML"
    });
    
    // Kumpulkan semua user dengan role mereka (group by user ID)
    let userRolesMap = new Map(); // key: userId, value: array of role names
    
    for (const role of roles) {
        if (fs.existsSync(role.file)) {
            try {
                const data = JSON.parse(fs.readFileSync(role.file));
                if (Array.isArray(data) && data.length > 0) {
                    for (const targetUserId of data) {
                        // Skip owner bot
                        if (String(targetUserId) === String(OWNER_ID)) continue;
                        
                        if (!userRolesMap.has(targetUserId)) {
                            userRolesMap.set(targetUserId, []);
                        }
                        userRolesMap.get(targetUserId).push(role.name);
                    }
                }
            } catch (e) {}
        }
    }
    
    // Update loading
    await bot.editMessageText(`⏳ <b>Memproses clear all role V1...</b>\n\n📨 Mengirim notifikasi ke ${userRolesMap.size} user...`, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: "HTML"
    });
    
    // Kirim 1 notifikasi per user
    let notifiedCount = 0;
    let failedNotify = [];
    let current = 0;
    const total = userRolesMap.size;
    
    for (const [targetUserId, roleList] of userRolesMap) {
        current++;
        const roleListText = roleList.map(r => `• <b>${r}</b>`).join('\n');
        
        // Update progress setiap 5 user
        if (current % 5 === 0 || current === total) {
            await bot.editMessageText(`⏳ <b>Memproses clear all role V1...</b>\n\n📨 Mengirim notifikasi ke user ${current}/${total}...`, {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parse_mode: "HTML"
            }).catch(() => {});
        }
        
        try {
            await bot.sendMessage(targetUserId, 
`❌ <b>AKSES ANDA DICABUT!</b> ⚠️
━━━━━━━━━━━━━━━━━━━━━━
Akses kamu sebagai berikut telah dicabut oleh sistem:

${roleListText}

🪪 ID: <code>${targetUserId}</code>
🔒 Role V1 telah dinonaktifkan.

Jika ini kesalahan, silakan hubungi admin @Sanzyoffc.
━━━━━━━━━━━━━━━━━━━━━━
🧠 SANZY Core System: <i>"Privilege revoked successfully."</i>
🚨 <b>SANZY CORE MONITORING MASIH AKTIF</b>`, { parse_mode: "HTML" });
            notifiedCount++;
        } catch (err) {
            failedNotify.push({ id: targetUserId, roles: roleList, error: err.message });
        }
        
        await new Promise(r => setTimeout(r, 100));
    }
    
    // Update loading
    await bot.editMessageText("⏳ <b>Memproses clear all role V1...</b>\n\n🗑️ Menghapus file role...", {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: "HTML"
    });
    
    // Hapus semua file role (tapi pertahankan owner)
    let cleared = [];
    let notFound = [];
    
    for (const role of roles) {
        if (fs.existsSync(role.file)) {
            // Backup
            const backupFile = `./db/backup/${role.name.toLowerCase().replace(/ /g, '_')}_${Date.now()}.json`;
            fs.copyFileSync(role.file, backupFile);
            
            // Baca data, filter owner, lalu simpan
            let data = [];
            try {
                data = JSON.parse(fs.readFileSync(role.file));
                if (Array.isArray(data)) {
                    const filteredData = data.filter(id => String(id) === String(OWNER_ID));
                    fs.writeFileSync(role.file, JSON.stringify(filteredData, null, 2));
                    
                    if (filteredData.length !== data.length) {
                        cleared.push(`✅ ${role.name} (${data.length - filteredData.length} user dihapus, owner dipertahankan)`);
                    } else {
                        cleared.push(`✅ ${role.name} (tidak ada user yang dihapus)`);
                    }
                } else {
                    fs.writeFileSync(role.file, JSON.stringify([], null, 2));
                    cleared.push(`✅ ${role.name} (dikosongkan)`);
                }
            } catch (e) {
                fs.writeFileSync(role.file, JSON.stringify([], null, 2));
                cleared.push(`✅ ${role.name} (dikosongkan karena error)`);
            }
        } else {
            notFound.push(`⚠️ ${role.name} (file tidak ditemukan)`);
        }
    }
    
    // Hapus loading message
    await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    
    // Kirim laporan ke owner
    let message = `🗑️ <b>CLEAR ALL ROLE V1 COMPLETE!</b>\n\n`;
    message += `📊 <b>Role processed:</b> ${cleared.length}\n`;
    message += `👥 <b>User terkena (bukan owner):</b> ${userRolesMap.size} user\n`;
    message += `📨 <b>Notifikasi terkirim:</b> ${notifiedCount} user\n`;
    message += `❌ <b>Gagal notifikasi:</b> ${failedNotify.length} user\n`;
    message += `👑 <b>Role owner dipertahankan!</b>\n\n`;
    
    if (failedNotify.length > 0 && failedNotify.length <= 10) {
        message += `<b>⚠️ Gagal dikirim ke:</b>\n`;
        for (const fail of failedNotify) {
            message += `   • <code>${fail.id}</code> (${fail.roles.join(', ')})\n`;
        }
        message += `\n`;
    } else if (failedNotify.length > 10) {
        message += `<b>⚠️ ${failedNotify.length} user gagal dikirimi notifikasi.</b>\n\n`;
    }
    
    message += `📁 <b>Backup:</b> <code>./db/backup/</code>`;
    
    bot.sendMessage(chatId, message, { parse_mode: "HTML" });
});

// delsrv
bot.onText(/\/delsrv (.+)/, async (msg, match) => {
  notifyOwner('delsrv', msg);
  const chatId = msg.chat.id;
    
  if (chatId.toString() !== settings.exGroupId) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}
    
  const srv = match[1].trim();
    
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));
  if (!isOwner) {
    bot.sendMessage(chatId, "❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}`}],
        ],
      },
    });
    return;
  }

  if (!srv) {
    bot.sendMessage(
      chatId,
      "Masukkan ID server yang ingin dihapus, contoh: /delsrv 1234"
    );
    return;
  }

  try {
    let f = await fetch(domain + "/api/application/servers/" + srv, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
    });

    let res = f.ok ? { errors: null } : await f.json();

    if (res.errors) {
      bot.sendMessage(chatId, "❌ sᴇʀᴠᴇʀ ᴛɪᴅᴀᴋ ᴀᴅᴀ");
    } else {
      bot.sendMessage(chatId, `✅ ꜱᴜᴋꜱᴇꜱ ᴅᴇʟᴇᴛᴇ ꜱᴇʀᴠᴇʀ ${srv}`, { parse_mode: "MarkDown",
    reply_to_message_id: msg.message_id });
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus server.");
  }
});

// deladmin
bot.onText(/^\/deladmin(?:\s+(.+))?/, async (msg, match) => {
  notifyOwner('deladmin', msg);
  const chatId = msg.chat.id;
  const userId = match[1];

  if (chatId.toString() !== settings.exGroupId) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}

  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));
  if (!isOwner) {
    return bot.sendMessage(chatId, "❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}`}],
        ],
      },
    });
  }

  if (!userId) {
    return bot.sendMessage(
      chatId,
      "❌ Format salah!\nContoh: /deladmin ID",
      { parse_mode: "Markdown" }
    );
  }

  try {
    let f = await fetch(domain + "/api/application/users/" + userId, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${plta}`,
      },
    });

    let res = f.ok ? { errors: null } : await f.json();

    if (res.errors) {
      bot.sendMessage(chatId, "❌ ᴜsᴇʀ ᴛɪᴅᴀᴋ ᴀᴅᴀ");
    } else {
      bot.sendMessage(chatId, `✅ ꜱᴜᴋꜱᴇꜱ ᴅᴇʟᴇᴛᴇ ᴀᴅᴍɪɴ ${userId}`, {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id,
      });
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus admin.");
  }
});

// listsrvoff
bot.onText(/\/listsrvoff/, async (msg) => {
  const chatId = msg.chat.id;
    
  if (chatId.toString() !== settings.exGroupId) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}

  try {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(String(msg.from.id));
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ", {
        reply_markup: {
          inline_keyboard: [[{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}`}]],
        },
      });
    }

    let offlineServers = [];
    let page = 1;
    let totalPages = 1;

    // Ambil semua halaman server
    do {
      let f = await fetch(`${domain}/api/application/servers?page=${page}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${plta}`,
        },
      });

      let res = await f.json();
      let servers = res.data;
      totalPages = res.meta.pagination.total_pages;

      for (let server of servers) {
        let s = server.attributes;
        try {
          let f3 = await fetch(
            `${domain}/api/client/servers/${s.uuid.split("-")[0]}/resources`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${pltc}`,
              },
            }
          );

          let data = await f3.json();
          let status = data.attributes ? data.attributes.current_state : s.status;

          if (status === "offline") {
            offlineServers.push(
              `ID Server: ${s.id}\nNama: ${s.name}\nStatus: ${status}\n`
            );
          }
        } catch (err) {
          console.error(`Gagal ambil data server ${s.id}`, err);
        }
      }

      page++;
    } while (page <= totalPages);

    if (offlineServers.length === 0) {
      return bot.sendMessage(chatId, "✅ Semua server dalam keadaan online.");
    }

    // Gabung semua offline server ke string
    let messageText = `📋 ᴅᴀғᴛᴀʀ sᴇʀᴠᴇʀ ᴏғғʟɪɴᴇ (${offlineServers.length}):\n\n${offlineServers.join("\n")}`;

    // Handle limit karakter Telegram (4096)
    while (messageText.length > 0) {
      let chunk = messageText.slice(0, 4000); 
      messageText = messageText.slice(4000);
      await bot.sendMessage(chatId, chunk);
    }

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memproses /listsrvoff.");
  }
});

// delallsrv offline
bot.onText(/\/delsrvoff/, async (msg) => {
  notifyOwner('delsrvoff', msg);
  const chatId = msg.chat.id;

  if (chatId.toString() !== settings.exGroupId) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}
    
  bot.sendMessage(chatId, "⏳");

  try {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(String(msg.from.id));
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ", {
        reply_markup: {
          inline_keyboard: [[{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}` }]],
        },
      });
    }

    let page = 1;
    let totalPages = 1;
    let offlineServers = [];

    // Ambil semua server dari semua page
    do {
      let f = await fetch(`${domain}/api/application/servers?page=${page}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${plta}`,
        },
      });

      let res = await f.json();
      let servers = res.data;
      totalPages = res.meta.pagination.total_pages;

      for (let server of servers) {
        let s = server.attributes;
        try {
          let f3 = await fetch(
            `${domain}/api/client/servers/${s.uuid.split("-")[0]}/resources`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${pltc}`,
              },
            }
          );

          let data = await f3.json();
          let status = data.attributes ? data.attributes.current_state : s.status;

          if (status === "offline") {
            offlineServers.push({ id: s.id, name: s.name });
          }
        } catch (err) {
          console.error(`Gagal ambil data server ${s.id}`, err);
        }
      }

      page++;
    } while (page <= totalPages);

    if (offlineServers.length === 0) {
      return bot.sendMessage(chatId, "✅ Tidak ada server offline untuk dihapus.");
    }

    let success = [];
    let failed = [];

    for (let srv of offlineServers) {
      try {
        let del = await fetch(`${domain}/api/application/servers/${srv.id}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${plta}`,
          },
        });

        if (del.status === 204) {
          success.push(`✅ ${srv.name} (ID: ${srv.id})`);
        } else {
          failed.push(`❌ ${srv.name} (ID: ${srv.id})`);
        }
      } catch (err) {
        console.error(`Gagal hapus server ${srv.id}`, err);
        failed.push(`❌ ${srv.name} (ID: ${srv.id})`);
      }
    }

    let report = `🗑️ Sukses menghapus Server yang Offline:\n\n` +
      `ʙᴇʀʜᴀsɪʟ ᴅɪʜᴀᴘᴜs: ${success.length}\n` +
      `ɢᴀɢᴀʟ ᴅɪʜᴀᴘᴜs: ${failed.length}\n\n`;

    if (success.length) {
      report += `✅ ʙᴇʀʜᴀsɪʟ:\n${success.join("\n")}\n\n`;
    }
    if (failed.length) {
      report += `❌ ɢᴀɢᴀʟ:\n${failed.join("\n")}`;
    }

    // Handle limit karakter telegram
    while (report.length > 0) {
      let chunk = report.slice(0, 4000);
      report = report.slice(4000);
      await bot.sendMessage(chatId, chunk);
    }

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memproses /delsrvoff.");
  }
});

    
// total server
bot.onText(/\/totalserver/, async (msg) => {
  const chatId = msg.chat.id;

  if (chatId.toString() !== settings.exGroupId) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}

  try {

    let page = 1;
    let totalPages = 1;
    let totalServers = 0;

    // Loop semua halaman server
    do {
      let f = await fetch(`${domain}/api/application/servers?page=${page}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${plta}`,
        },
      });

      let res = await f.json();
      totalPages = res.meta.pagination.total_pages;

      if (res.data && res.data.length > 0) {
        totalServers += res.data.length;
      }

      page++;
    } while (page <= totalPages);

    return bot.sendMessage(
      chatId,
      `📊 Total server: *${totalServers}*`,
      { parse_mode: "Markdown",
    reply_to_message_id: msg.message_id }
    );

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memproses /totalserver.");
  }
});

// listadmin
const adminPages = new Map();

bot.onText(/\/listadmin/, async (msg) => {
  const chatId = msg.chat.id;

  if (chatId.toString() !== settings.exGroupId) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}

  const wait = await bot.sendMessage(chatId, "⏳");

  try {
    let page = 1;
    let admins = [];
    let totalPages = 1;

    // ambil semua admin
    do {
      const res = await fetch(`${domain}/api/application/users?page=${page}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${plta}`,
        },
      });
      const json = await res.json();
      if (!json.data) break;

      totalPages = json.meta.pagination.total_pages;
      const users = json.data;
      for (let user of users) {
        const u = user.attributes;
        if (u.root_admin) {
          admins.push({
            id: u.id,
            username: u.username,
            email: u.email,
            status: u.attributes?.user?.server_limit === null ? "Inactive" : "Active",
          });
        }
      }
      page++;
    } while (page <= totalPages);

    if (admins.length === 0) {
      return bot.editMessageText("⚠️ Tidak ada admin ditemukan.", {
        chat_id: chatId,
        message_id: wait.message_id,
      });
    }

    // ambil total server (inti)
    let totalServer = 0;
    try {
      const r = await fetch(`${domain}/api/application/servers`, {
        headers: { Authorization: `Bearer ${plta}` },
      });
      const j = await r.json();
      totalServer = j.meta.pagination.total;
    } catch {
      totalServer = "Unknown";
    }

    const pageSize = 10;
    const totalPage = Math.ceil(admins.length / pageSize);
    adminPages.set(chatId, { admins, totalPage, totalServer });

    const getPageText = (p) => {
      const { admins, totalPage, totalServer } = adminPages.get(chatId);
      const start = (p - 1) * pageSize;
      const end = Math.min(start + pageSize, admins.length);
      let text = `📊 Total Admin: ${admins.length}\n🖥️ Total Server: ${totalServer}\n\n`;

      for (let i = start; i < end; i++) {
        const a = admins[i];
        text += `ID: ${a.id}\nUsername: ${a.username}\nEmail: ${a.email}\nStatus: ${a.status}\n\n`;
      }
      return text.trim();
    };

    const text = getPageText(1);
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: wait.message_id,
      reply_markup: {
        inline_keyboard: [[
          { text: "(1/" + totalPage + ")", callback_data: "none" },
          { text: "➡️", callback_data: "adm_next_1" }
        ]],
      },
    });
  } catch (err) {
    console.error(err);
    bot.editMessageText("⚠️ Terjadi kesalahan saat memuat daftar admin.", {
      chat_id: chatId,
      message_id: wait.message_id,
    });
  }
});

bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;
  const data = q.data;

  if (!data.startsWith("adm_")) return;

  try {
    const saved = adminPages.get(chatId);
    if (!saved) return;

    let currentPage = parseInt(data.split("_")[2]);
    let newPage = data.includes("next") ? currentPage + 1 : currentPage - 1;
    if (newPage < 1 || newPage > saved.totalPage) return;

    const getPageText = (p) => {
      const { admins, totalPage, totalServer } = saved;
      const pageSize = 10;
      const start = (p - 1) * pageSize;
      const end = Math.min(start + pageSize, admins.length);
      let text = `📊 Total Admin: ${admins.length}\n🖥️ Total Server: ${totalServer}\n\n`;

      for (let i = start; i < end; i++) {
        const a = admins[i];
        text += `ID: ${a.id}\nUsername: ${a.username}\nEmail: ${a.email}\nStatus: ${a.status}\n\n`;
      }
      return text.trim();
    };

    const newText = getPageText(newPage);
    const { totalPage } = saved;
    const pageInfo = { text: `(${newPage}/${totalPage})`, callback_data: "none" };
    const keyboard = [];

    if (newPage > 1 && newPage < totalPage) {
      keyboard.push(
        { text: "⬅️", callback_data: `adm_prev_${newPage}` },
        pageInfo,
        { text: "➡️", callback_data: `adm_next_${newPage}` }
      );
    } else if (newPage > 1) {
      keyboard.push(
        { text: "⬅️", callback_data: `adm_prev_${newPage}` },
        pageInfo
      );
    } else if (newPage < totalPage) {
      keyboard.push(
        pageInfo,
        { text: "➡️", callback_data: `adm_next_${newPage}` }
      );
    } else {
      keyboard.push(pageInfo);
    }

    await bot.editMessageText(newText, {
      chat_id: chatId,
      message_id: q.message.message_id,
      reply_markup: { inline_keyboard: [keyboard] },
    });

    await bot.answerCallbackQuery(q.id);
  } catch (err) {
    console.error("Callback error:", err.message);
  }
});
    
// listsrv
const serverPages = new Map();

bot.onText(/^\/listsrv$/, async (msg) => {
  const chatId = msg.chat.id;

  if (chatId.toString() !== settings.exGroupId) {
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  const isOwner = ownerUsers.includes(String(msg.from.id));

  if (!isOwner) {
    return bot.sendMessage(chatId, "ᴋʜᴜꜱᴜꜱ ᴅɪ ᴘᴀɴᴇʟ ᴘᴜʙʟɪᴄ", {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "ʙᴜʏ ᴘᴜʙʟɪᴄ", url: `https://t.me/${dev}` }]],
      },
    });
  }
}

  const wait = await bot.sendMessage(chatId, "⏳");
  try {
    let page = 1;
    let servers = [];
    let totalPages = 1;

    do {
      const res = await fetch(`${domain}/api/application/servers?page=${page}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${plta}`,
        },
      });
      const json = await res.json();
      if (!json.data) break;

      servers = servers.concat(json.data);
      totalPages = json.meta.pagination.total_pages;
      page++;
    } while (page <= totalPages);

    if (servers.length === 0) {
      return bot.editMessageText("⚠️ Tidak ada server ditemukan.", {
        chat_id: chatId,
        message_id: wait.message_id,
      });
    }

    const pageSize = 10;
    const total = servers.length;
    const totalPage = Math.ceil(total / pageSize);
    serverPages.set(chatId, { servers, totalPage });

    const getPageText = async (p) => {
      let start = (p - 1) * pageSize;
      let end = Math.min(start + pageSize, total);
      let text = `📋 ᴅᴀғᴛᴀʀ sᴇʀᴠᴇʀ :\n\n`;

      for (let i = start; i < end; i++) {
        const s = servers[i].attributes;
        try {
          const r = await fetch(`${domain}/api/client/servers/${s.uuid.split("-")[0]}/resources`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${pltc}`,
            },
          });
          const d = await r.json();
          const status = d.attributes ? d.attributes.current_state : "unknown";
          text += `ID: ${s.id}\nNama: ${s.name}\nStatus: ${status}\n\n`;
        } catch {
          text += `ID: ${s.id}\nNama: ${s.name}\nStatus: unknown\n\n`;
        }
      }

      return text.trim();
    };

    const text = await getPageText(1);
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: wait.message_id,
      reply_markup: {
        inline_keyboard: [[
          { text: "(1/" + totalPage + ")", callback_data: "none" },
          { text: "➡️", callback_data: "srv_next_1" }
        ]],
      },
    });
  } catch (err) {
    console.error(err);
    bot.editMessageText("❌ Gagal mengambil data server.", {
      chat_id: chatId,
      message_id: wait.message_id,
    });
  }
});

bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;
  const data = q.data;

  if (!data.startsWith("srv_")) return;

  try {
    const saved = serverPages.get(chatId);
    if (!saved) return;

    let currentPage = parseInt(data.split("_")[2]);
    let newPage = data.includes("next") ? currentPage + 1 : currentPage - 1;
    if (newPage < 1 || newPage > saved.totalPage) return;

    const getPageText = async (p) => {
      const { servers, totalPage } = saved;
      const pageSize = 10;
      let start = (p - 1) * pageSize;
      let end = Math.min(start + pageSize, servers.length);
      let text = `📋 ᴅᴀғᴛᴀʀ sᴇʀᴠᴇʀ :\n\n`;

      for (let i = start; i < end; i++) {
        const s = servers[i].attributes;
        text += `ID: ${s.id}\nNama: ${s.name}\nStatus: ${s.status || "unknown"}\n\n`;
      }

      return text.trim();
    };

    const newText = await getPageText(newPage);
    const { totalPage } = saved;
    const pageInfo = { text: `(${newPage}/${totalPage})`, callback_data: "none" };
    const keyboard = [];

    if (newPage > 1 && newPage < totalPage) {
      keyboard.push(
        { text: "⬅️", callback_data: `srv_prev_${newPage}` },
        pageInfo,
        { text: "➡️", callback_data: `srv_next_${newPage}` }
      );
    } else if (newPage > 1) {
      keyboard.push(
        { text: "⬅️", callback_data: `srv_prev_${newPage}` },
        pageInfo
      );
    } else if (newPage < totalPage) {
      keyboard.push(
        pageInfo,
        { text: "➡️", callback_data: `srv_next_${newPage}` }
      );
    } else {
      keyboard.push(pageInfo);
    }

    await bot.editMessageText(newText, {
      chat_id: chatId,
      message_id: q.message.message_id,
      reply_markup: { inline_keyboard: [keyboard] },
    });

    await bot.answerCallbackQuery(q.id);
  } catch (err) {
    console.error("Callback error:", err.message);
  }
});
    
}
