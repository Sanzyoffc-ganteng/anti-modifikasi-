const settings = require("./config.js");
const config = require("./config.js");

const TelegramBot = require("node-telegram-bot-api");
const { checkMaintenance, setMaintenance, isMaintenance, initMaintenance } = require("./maintenance.js");
const axios = require("axios");
const archiver = require("archiver");
const { createCanvas, loadImage } = require('canvas');
const chalk = require("chalk");
const fs = require("fs");
const os = require('os');
const { initErrorHandler } = require("./utils/errorHandler.js");
initErrorHandler();
const { checkTakeover, setupPollingErrorHandler } = require("./utils/botManager.js");
const { exec } = require("child_process");
const path = require("path");
const {
    loadJsonData,
    saveJsonData,
    checkCooldown,
    setCooldown
} = require('./lib/function');

/*const { saveActiveSessions, connectToWhatsApp, initializeWhatsAppConnections, sessions } = require("./connect");

// koneksi WA
initializeWhatsAppConnections();*/

// DAFTAR RAW URL UNTUK 3 FILE
const filesToCheck = [
    { local: "nael.js", raw: "https://raw.githubusercontent.com/Sanzyoffc-ganteng/anti-modifikasi-/refs/heads/main/nael.js" },
    { local: "menu/addusr.js", raw: "https://raw.githubusercontent.com/Sanzyoffc-ganteng/anti-modifikasi-/refs/heads/main/menu/addusr.js" },
    { local: "menu/panel.js", raw: "https://raw.githubusercontent.com/Sanzyoffc-ganteng/anti-modifikasi-/refs/heads/main/menu/panel.js" }
];

async function checkAllFiles() {
    console.log("🔍 VERIFIKASI INTEGRITAS SCRIPT...");
    
    let adaPerubahan = false;
    
    for (const file of filesToCheck) {
        try {
            // Ambil dari GitHub
            const githubRes = await axios.get(file.raw, { timeout: 10000 });
            const githubContent = githubRes.data;
            
            // Baca lokal
            let localContent = "";
            if (fs.existsSync(file.local)) {
                localContent = fs.readFileSync(file.local, 'utf8');
            } else {
                // File lokal tidak ada
                adaPerubahan = true;
                break;
            }
            
            // Bandingkan
            if (githubContent !== localContent) {
                adaPerubahan = true;
                break; // Langsung keluar, gak perlu cek file lain
            }
            
        } catch (err) {
            // Jika gagal ambil dari GitHub, skip (anggap aman)
            console.log("⚠️ Koneksi ke GitHub bermasalah, lanjutkan...");
        }
    }
    
    if (adaPerubahan) {
        console.log("");
        console.log("╔═══════════════════════════════════════╗");
        console.log("║   ❌ TERDETEKSI SC DI MODIFIKASI!     ║");
        console.log("║   BOT AKAN MATI OTOMATIS              ║");
        console.log("╚═══════════════════════════════════════╝");
        console.log("");
        process.exit(1);
    } else {
        console.log("");
        console.log("╔═══════════════════════════════════════╗");
        console.log("║   ✅ TIDAK ADA TERDETEKSI             ║");
        console.log("║   SC DI MODIFIKASI                    ║");
        console.log("╚═══════════════════════════════════════╝");
        console.log("");
    }
}

// JALANKAN SEBELUM BOT START
checkAllFiles();

// ========== VALIDASI TOKEN KE GITHUB ==========
const TOKEN_CHECK_URL = "https://raw.githubusercontent.com/Sanzyoffc-ganteng/panel-password/refs/heads/main/token.json";

async function cekToken() {
    console.clear();
    console.log(chalk.cyan("===================================="));
    console.log(chalk.cyan("     BOT TOKEN PROTECTION SYSTEM"));
    console.log(chalk.cyan("====================================\n"));

    // 1. Ambil token dari config
    const tokenSekarang = settings.token;
    
    if (!tokenSekarang) {
        console.log("❌ Token tidak ditemukan di config.js!");
        process.exit(1);
    }

    console.log(chalk.white("🔍 Mengecek BOT_TOKEN di GitHub..."));
    
    let daftarToken = [];
    try {
        // Tambahkan timeout 5 detik agar tidak hang
        const res = await axios.get(TOKEN_CHECK_URL, { timeout: 5000 });
        daftarToken = res.data.tokens || [];
        console.log(`✓ ${daftarToken.length} token terdaftar di GitHub`);
    } catch (err) {
        console.log("❌ GAGAL ambil daftar token dari GitHub!");
        console.log("   Pastikan koneksi internet lancar dan URL GitHub benar.");
        // Opsional: Jika ingin bot tetap jalan meski GitHub down, hapus process.exit(1)
        // process.exit(1); 
        return true; // Atau kembalikan false tergantung kebijakan Anda
    }
    
    // 2. Cek apakah token saat ini ada di daftar
    if (!daftarToken.includes(tokenSekarang)) {
        console.log("\n TOKEN TIDAK TERDAFTAR DI GITHUB!");
        console.log(`   Token: ${tokenSekarang.substring(0, 15)}...`);
        console.log("   BOT DIHENTIKAN.\n");
        process.exit(1);
    }
    
    console.log("\n✅ TOKEN VALID! BOT STARTING...\n");
    return true;
}
// ========== END VALIDASI TOKEN ==========

const bot = new TelegramBot(settings.token, { polling: true });

async function startBot(bot) {
    console.clear();

    console.log(chalk.gray('• Connecting to Telegram API...'));
    await new Promise(resolve => setTimeout(resolve, 800));

    console.log(chalk.gray('• Authenticating credentials...'));
    await new Promise(resolve => setTimeout(resolve, 600));

    console.log(chalk.gray('• Initializing bot services...\n'));
    await new Promise(resolve => setTimeout(resolve, 600));

    const info = await bot.getMe();
    console.clear();

    console.log(chalk.gray('╭──────────────────────────────╮'));
    console.log(chalk.gray('│ ') + chalk.white.bold('Verifikasi Token...'));
    console.log(chalk.gray('╰──────────────────────────────╯'));

    await new Promise(resolve => setTimeout(resolve, 1000));
    console.clear();

    console.log(chalk.green.bold(`\n✓ @${info.username} Connected!\n`));

    console.log(chalk.gray('╭──────────────────────────────╮'));
    console.log(chalk.gray('│    ') + chalk.white.bold('Source Code by @naeldev'));
    console.log(chalk.gray('│  ') + chalk.red.bold('Dont Share Script For Free!'));
    console.log(chalk.gray('│     	 ') + chalk.white.bold('Version: 4.0.0'));
    console.log(chalk.gray('╰──────────────────────────────╯'));

    console.log(chalk.gray('\nType a Command...'));
}

async function initializeBot() {
const OWNER_ID = settings.ownerId;

const antiCulik = require('./antiCulik.js');
const { checkGroupAccess } = antiCulik(bot, OWNER_ID);

initMaintenance(bot, OWNER_ID);

// ========== CEK TAKEOVER (pindah ke sini) ==========
    await checkTakeover(bot, OWNER_ID);
    setupPollingErrorHandler(bot, OWNER_ID);
    // ========== END TAKEOVER ==========
// system file
require("./start.js")(bot);

// menu file
require("./menu/panel.js")(bot);
require("./menu/other.js")(bot);
require("./menu/private.js")(bot);
require("./menu/install.js")(bot);
require("./menu/cvps.js")(bot);
require("./menu/addusr.js")(bot);
require("./menu/addvpsrole.js")(bot);
require("./events/welcome.js")(bot, OWNER_ID, checkMaintenance);

const {
    ownerId,
    dev,
    qris,
    pp,
    ppVid,
    panel
} = settings;

const allowedKeys = ["ownerId","groupId","exGroupId", "exUserId","chId","chUsnId","vpsPublic","pwPublic","pwPrivate","vpsPrivate","domainAdp","ptlaAdp","ptlcAdp","domain","plta","pltc","domainV2","pltaV2","pltcV2","domainV3","pltaV3","pltcV3","domainV4","pltaV4","pltcV4","domainV5","pltaV5","pltcV5","egg","loc","dev","vercel","dana","namaDana","pp","ppVid","hostname","apiDigitalOcean","apiDigitalOcean2","apiDigitalOcean3"];

const settingsPath = "./config.js";

// file database
const PRIVATE_FILE = "./db/users/private/privateID.json";
const OWNER_FILE = './db/users/adminID.json';
const CEO_FILE = './db/users/ceo.json';
const DEV_FILE = './db/users/dev.json';
const VIP_FILE = './db/users/vip.json';
const ASIS_FILE = './db/users/asis.json';

// premium file
const PREMIUM_FILE = './db/users/premiumUsers.json';
const PREMV2_FILE = './db/users/version/premiumV2.json';
const PREMV3_FILE = './db/users/version/premiumV3.json';
const PREMV4_FILE = './db/users/version/premiumV4.json';
const PREMV5_FILE = './db/users/version/premiumV5.json';

// reseller file
const RESS_FILE = './db/users/resellerUsers.json';
const RESSV2_FILE = './db/users/version/resellerV2.json';
const RESSV3_FILE = './db/users/version/resellerV3.json';
const RESSV4_FILE = './db/users/version/resellerV4.json';
const RESSV5_FILE = './db/users/version/resellerV5.json';

const CADP_FILE = "./db/cadp.json";

// ========== FUNGSI NOTIFY OWNER ==========
function notifyOwner(commandName, msg) {
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    const logMessage = `<blockquote>💬 Command: /${commandName}
👤 User: @${username}
🆔 ID: ${userId}
🕒 Waktu: ${now}
</blockquote>`;
    
    bot.sendMessage(OWNER_ID, logMessage, { parse_mode: 'HTML' }).catch(() => {});
}

function addPremiumHandler(command, fileName, versi) {
    bot.onText(new RegExp(`^\\/${command}`), (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const isCooldown = checkCooldown(msg);
        if (isCooldown) return bot.sendMessage(chatId, isCooldown);

        const owners = loadJsonData(OWNER_FILE);
        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ');
        }

        const args = msg.text.trim().split(" ");
        if (args.length < 2) {
            return bot.sendMessage(chatId, `❌ Format salah!\nContoh: /${command} <id>`);
        }

        const targetUserId = args[1];
        if (!/^\d+$/.test(targetUserId)) {
            return bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
        }

        const premUsers = loadJsonData(fileName);
        if (premUsers.includes(targetUserId)) {
            return bot.sendMessage(chatId, `⚠️ ᴜsᴇʀ ɪᴅ sᴜᴅᴀʜ ᴛᴇʀᴅᴀғᴛᴀʀ sᴇʙᴀɢᴀɪ ᴘʀᴇᴍɪᴜᴍ ${versi}!`);
        }

        premUsers.push(targetUserId);
        const success = saveJsonData(fileName, premUsers);

        if (success) {
            bot.sendMessage(chatId, `✅ ᴜꜱᴇʀ ɪᴅ ${targetUserId} ʙᴇʀʜᴀꜱɪʟ ᴅɪᴛᴀᴍʙᴀʜᴋᴀɴ ꜱᴇʙᴀɢᴀɪ ᴘʀᴇᴍɪᴜᴍ ${versi}!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
        } else {
            bot.sendMessage(chatId, `❌ Gagal menyimpan data Premium ${versi}!`);
        }
    });
}

// addprem
addPremiumHandler("addpremv2", PREMV2_FILE, "V2");
addPremiumHandler("addpremv3", PREMV3_FILE, "V3");
addPremiumHandler("addpremv4", PREMV4_FILE, "V4");
addPremiumHandler("addpremv5", PREMV5_FILE, "V5");

function delPremiumHandler(command, fileName, versi) {
    bot.onText(new RegExp(`^\\/${command}`), (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const owners = loadJsonData(OWNER_FILE);
        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ');
        }

        const args = msg.text.trim().split(" ");
        if (args.length < 2) {
            return bot.sendMessage(chatId, `❌ Format salah!\nContoh: /${command} <id>`);
        }

        const targetUserId = args[1];
        if (!/^\d+$/.test(targetUserId)) {
            return bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
        }

        let premUsers = loadJsonData(fileName);
        if (!premUsers.includes(targetUserId)) {
            return bot.sendMessage(chatId, `⚠️ ᴜsᴇʀ ɪᴅ ${targetUserId} ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ ᴅɪ ᴘʀᴇᴍɪᴜᴍ ${versi}!`);
        }

        premUsers = premUsers.filter(id => id !== targetUserId);
        const success = saveJsonData(fileName, premUsers);

        if (success) {
            bot.sendMessage(chatId, `✅ ᴜꜱᴇʀ ɪᴅ ${targetUserId} ʙᴇʀʜᴀꜱɪʟ ᴅɪʜᴀᴘᴜꜱ ᴅᴀʀɪ ᴘʀᴇᴍɪᴜᴍ ${versi}!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
        } else {
            bot.sendMessage(chatId, `❌ Gagal menyimpan perubahan Premium ${versi}!`);
        }
    });
}

// delprem
delPremiumHandler("delpremv2", PREMV2_FILE, "V2");
delPremiumHandler("delpremv3", PREMV3_FILE, "V3");
delPremiumHandler("delpremv4", PREMV4_FILE, "V4");
delPremiumHandler("delpremv5", PREMV5_FILE, "V5");  // ✅ BENAR

function addResellerHandler(command, fileName, versi) {
    bot.onText(new RegExp(`^\\/${command}`), (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const owners = loadJsonData(OWNER_FILE);
        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ');
        }

        const args = msg.text.trim().split(" ");
        if (args.length < 2) {
            return bot.sendMessage(chatId, `⚠️ Format salah!\nGunakan: /${command} <user_id>`);
        }

        const targetUserId = args[1];
        if (!/^\d+$/.test(targetUserId)) {
            return bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
        }

        const ressUsers = loadJsonData(fileName);
        if (ressUsers.includes(targetUserId)) {
            return bot.sendMessage(chatId, `⚠️ ᴜsᴇʀ ɪᴅ sᴜᴅᴀʜ ᴍᴇɴᴊᴀᴅɪ ʀᴇsᴇʟʟᴇʀ ${versi}!`);
        }

        ressUsers.push(targetUserId);
        const success = saveJsonData(fileName, ressUsers);

        if (success) {
            bot.sendMessage(chatId, `✅ ᴜꜱᴇʀ ɪᴅ ${targetUserId} ʙᴇʀʜᴀꜱɪʟ ᴅɪᴛᴀᴍʙᴀʜᴋᴀɴ ꜱᴇʙᴀɢᴀɪ ʀᴇꜱᴇʟʟᴇʀ ${versi}!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
        } else {
            bot.sendMessage(chatId, `❌ Gagal menyimpan data Reseller ${versi}!`);
        }
    });
}

// address
addResellerHandler("addressv2", RESSV2_FILE, "V2");
addResellerHandler("addressv3", RESSV3_FILE, "V3");
addResellerHandler("addressv4", RESSV4_FILE, "V4");
addResellerHandler("addressv5", RESSV5_FILE, "V5");

const DB_FILES = {
    // ========== V2 ==========
    premiumV2: './db/users/version/premiumV2.json',
    resellerV2: './db/users/version/resellerV2.json',
    partnerV2: './db/users/version/partnerV2.json',
    adpV2: './db/users/version/adpV2.json',
    ownerV2: './db/users/version/ownerV2.json',
    tkV2: './db/users/version/tkV2.json',
    ceoV2: './db/users/version/ceoV2.json',
    developerV2: './db/users/version/developerV2.json',
    asistenV2: './db/users/version/asistenV2.json',
    vipV2: './db/users/version/vipV2.json',
    kepemilikanV2: './db/users/version/kepemilikanV2.json',
    managervipV2: './db/users/version/managervipV2.json',
    managersvipV2: './db/users/version/managersvipV2.json',
    
    // ========== V3 ==========
    premiumV3: './db/users/version/premiumV3.json',
    resellerV3: './db/users/version/resellerV3.json',
    partnerV3: './db/users/version/partnerV3.json',
    adpV3: './db/users/version/adpV3.json',
    ownerV3: './db/users/version/ownerV3.json',
    tkV3: './db/users/version/tkV3.json',
    ceoV3: './db/users/version/ceoV3.json',
    developerV3: './db/users/version/developerV3.json',
    asistenV3: './db/users/version/asistenV3.json',
    vipV3: './db/users/version/vipV3.json',
    kepemilikanV3: './db/users/version/kepemilikanV3.json',
    managervipV3: './db/users/version/managervipV3.json',
    managersvipV3: './db/users/version/managersvipV3.json',
    
    // ========== V4 ==========
    premiumV4: './db/users/version/premiumV4.json',
    resellerV4: './db/users/version/resellerV4.json',
    partnerV4: './db/users/version/partnerV4.json',
    adpV4: './db/users/version/adpV4.json',
    ownerV4: './db/users/version/ownerV4.json',
    tkV4: './db/users/version/tkV4.json',
    ceoV4: './db/users/version/ceoV4.json',
    developerV4: './db/users/version/developerV4.json',
    asistenV4: './db/users/version/asistenV4.json',
    vipV4: './db/users/version/vipV4.json',
    kepemilikanV4: './db/users/version/kepemilikanV4.json',
    managervipV4: './db/users/version/managervipV4.json',
    managersvipV4: './db/users/version/managersvipV4.json',
    
    // ========== V5 ==========
    premiumV5: './db/users/version/premiumV5.json',
    resellerV5: './db/users/version/resellerV5.json',
    partnerV5: './db/users/version/partnerV5.json',
    adpV5: './db/users/version/adpV5.json',
    ownerV5: './db/users/version/ownerV5.json',
    tkV5: './db/users/version/tkV5.json',
    ceoV5: './db/users/version/ceoV5.json',
    developerV5: './db/users/version/developerV5.json',
    asistenV5: './db/users/version/asistenV5.json',
    vipV5: './db/users/version/vipV5.json',
    kepemilikanV5: './db/users/version/kepemilikanV5.json',
    managervipV5: './db/users/version/managervipV5.json',
    managersvipV5: './db/users/version/managersvipV5.json',
};

// ========== FUNGSI GET USER LEVEL UNTUK V2-V5 ==========
function getUserLevel(userId) {
    userId = userId.toString();
    
    // Cek dari V2
    if (loadJsonData(DB_FILES.managersvipV2)?.includes(userId)) return 13;
    if (loadJsonData(DB_FILES.managervipV2)?.includes(userId)) return 12;
    if (loadJsonData(DB_FILES.kepemilikanV2)?.includes(userId)) return 11;
    if (loadJsonData(DB_FILES.vipV2)?.includes(userId)) return 10;
    if (loadJsonData(DB_FILES.asistenV2)?.includes(userId)) return 9;
    if (loadJsonData(DB_FILES.developerV2)?.includes(userId)) return 8;
    if (loadJsonData(DB_FILES.ceoV2)?.includes(userId)) return 7;
    if (loadJsonData(DB_FILES.tkV2)?.includes(userId)) return 6;
    if (loadJsonData(DB_FILES.ownerV2)?.includes(userId)) return 5;
    if (loadJsonData(DB_FILES.adpV2)?.includes(userId)) return 4;
    if (loadJsonData(DB_FILES.partnerV2)?.includes(userId)) return 3;
    if (loadJsonData(DB_FILES.resellerV2)?.includes(userId)) return 2;
    if (loadJsonData(DB_FILES.premiumV2)?.includes(userId)) return 1;
    
    return 0; // default user
}

function delResellerHandler(command, fileName, versi) {
    bot.onText(new RegExp(`^\\/${command}`), (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const owners = loadJsonData(OWNER_FILE);
        if (!owners.includes(userId)) {
            return bot.sendMessage(chatId, '❌ ᴋʜᴜsᴜs ᴏᴡɴᴇʀ');
        }

        // ambil argumen setelah command
        const args = msg.text.trim().split(" ");
        if (args.length < 2) {
            return bot.sendMessage(chatId, `⚠️ Format salah!\nGunakan: /${command} <id>`);
        }

        const targetUserId = args[1];
        if (!/^\d+$/.test(targetUserId)) {
            return bot.sendMessage(chatId, '❌ User ID harus berupa angka!');
        }

        let ressUsers = loadJsonData(fileName);
        if (!ressUsers.includes(targetUserId)) {
            return bot.sendMessage(chatId, `⚠️ ᴜsᴇʀ ɪᴅ ${targetUserId} ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ ᴅɪ ʀᴇsᴇʟʟᴇʀ ${versi}!`);
        }

        // hapus user dari array
        ressUsers = ressUsers.filter(id => id !== targetUserId);
        const success = saveJsonData(fileName, ressUsers);

        if (success) {
            bot.sendMessage(chatId, `✅ User ID ${targetUserId} berhasil dihapus dari Reseller ${versi}!`, { parse_mode: "Markdown", reply_to_message_id: msg.message_id });
        } else {
            bot.sendMessage(chatId, `❌ Gagal menyimpan perubahan Reseller ${versi}!`);
        }
    });
}

// /delress
delResellerHandler("delressv2", RESSV2_FILE, "V2");
delResellerHandler("delressv3", RESSV3_FILE, "V3");
delResellerHandler("delressv4", RESSV4_FILE, "V4");
delResellerHandler("delressv5", RESSV5_FILE, "V5");

// create file premium
if (!fs.existsSync(PREMIUM_FILE)) {
    saveJsonData(PREMIUM_FILE, []);
}

if (!fs.existsSync(PREMV2_FILE)) {
    saveJsonData(PREMV2_FILE, []);
}

if (!fs.existsSync(PREMV3_FILE)) {
    saveJsonData(PREMV3_FILE, []);
}

if (!fs.existsSync(PREMV4_FILE)) {
    saveJsonData(PREMV4_FILE, []);
}

if (!fs.existsSync(PREMV5_FILE)) {
    saveJsonData(PREMV5_FILE, []);
}

// create file reseller
if (!fs.existsSync(RESS_FILE)) {
    saveJsonData(RESS_FILE, []);
}

if (!fs.existsSync(RESSV2_FILE)) {
    saveJsonData(RESSV2_FILE, []);
}

if (!fs.existsSync(RESSV3_FILE)) {
    saveJsonData(RESSV3_FILE, []);
}

if (!fs.existsSync(RESSV4_FILE)) {
    saveJsonData(RESSV4_FILE, []);
}

if (!fs.existsSync(RESSV5_FILE)) {
    saveJsonData(RESSV5_FILE, []);
}

if (!fs.existsSync(OWNER_FILE)) {
    saveJsonData(OWNER_FILE, []);
}

// ==================== FUNGSI ADD ROLE GENERIK UNTUK V2-V5 ====================
function addRoleHandler(command, filePath, roleName, version) {
    bot.onText(new RegExp(`^\\/${command}(?:\\s+(\\d+))?$`), async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        
        if (msg.from.id !== OWNER_ID) {
            return bot.sendMessage(chatId, `❌ Khusus Owner!`);
        }
        
        let targetUserId;
        if (match && match[1]) {
            targetUserId = match[1];
        } else if (msg.reply_to_message) {
            targetUserId = msg.reply_to_message.from.id.toString();
        } else {
            return bot.sendMessage(chatId, `❌ Reply ke pesan user atau masukkan ID!\nContoh: /${command} 123456789`);
        }
        
        // Buat folder jika belum ada
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        // Buat file jika belum ada
        if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([], null, 2));
        
        let data = JSON.parse(fs.readFileSync(filePath));
        
        if (data.includes(targetUserId)) {
            return bot.sendMessage(chatId, `⚠️ User ID ${targetUserId} sudah menjadi ${roleName} ${version}!`);
        }
        
        data.push(targetUserId);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        bot.sendMessage(chatId, `✅ User ID ${targetUserId} berhasil ditambahkan sebagai ${roleName} ${version}!`);
    });
}

function delRoleHandler(command, filePath, roleName, version) {
    bot.onText(new RegExp(`^\\/${command}(?:\\s+(\\d+))?$`), async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        
        if (msg.from.id !== OWNER_ID) {
            return bot.sendMessage(chatId, `❌ Khusus Owner!`);
        }
        
        let targetUserId;
        if (match && match[1]) {
            targetUserId = match[1];
        } else if (msg.reply_to_message) {
            targetUserId = msg.reply_to_message.from.id.toString();
        } else {
            return bot.sendMessage(chatId, `❌ Reply ke pesan user atau masukkan ID!\nContoh: /${command} 123456789`);
        }
        
        if (!fs.existsSync(filePath)) {
            return bot.sendMessage(chatId, `⚠️ File ${roleName} ${version} belum ada!`);
        }
        
        let data = JSON.parse(fs.readFileSync(filePath));
        
        if (!data.includes(targetUserId)) {
            return bot.sendMessage(chatId, `⚠️ User ID ${targetUserId} bukan ${roleName} ${version}!`);
        }
        
        data = data.filter(id => id !== targetUserId);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        bot.sendMessage(chatId, `✅ User ID ${targetUserId} berhasil dihapus dari ${roleName} ${version}!`);
    });
}

function listRoleHandler(command, filePath, roleName, version) {
    bot.onText(new RegExp(`^\\/${command}$`), async (msg) => {
        const chatId = msg.chat.id;
        
        if (!fs.existsSync(filePath)) {
            return bot.sendMessage(chatId, `📭 Belum ada ${roleName} ${version}.`);
        }
        
        const data = JSON.parse(fs.readFileSync(filePath));
        
        if (data.length === 0) {
            return bot.sendMessage(chatId, `📭 Belum ada ${roleName} ${version}.`);
        }
        
        let message = `📋 *DAFTAR ${roleName} ${version}:*\n\n`;
        data.forEach((id, i) => {
            message += `${i+1}. \`${id}\`\n`;
        });
        
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
}

// ==================== V2 ====================
// Partner V2
addRoleHandler('addptv2', './db/users/version/partnerV2.json', 'PARTNER', 'V2');
delRoleHandler('delptv2', './db/users/version/partnerV2.json', 'PARTNER', 'V2');
listRoleHandler('listptv2', './db/users/version/partnerV2.json', 'PARTNER', 'V2');

// ADP V2
addRoleHandler('addadpv2', './db/users/version/adpV2.json', 'ADMIN PANEL', 'V2');
delRoleHandler('deladpv2', './db/users/version/adpV2.json', 'ADMIN PANEL', 'V2');
listRoleHandler('listadpv2', './db/users/version/adpV2.json', 'ADMIN PANEL', 'V2');

// Owner V2
addRoleHandler('addownerv2', './db/users/version/ownerV2.json', 'OWNER', 'V2');
delRoleHandler('delownerv2', './db/users/version/ownerV2.json', 'OWNER', 'V2');
listRoleHandler('listownerv2', './db/users/version/ownerV2.json', 'OWNER', 'V2');

// TK V2
addRoleHandler('addtkv2', './db/users/version/tkV2.json', 'TANGAN KANAN', 'V2');
delRoleHandler('deltkv2', './db/users/version/tkV2.json', 'TANGAN KANAN', 'V2');
listRoleHandler('listtkv2', './db/users/version/tkV2.json', 'TANGAN KANAN', 'V2');

// CEO V2
addRoleHandler('addceov2', './db/users/version/ceoV2.json', 'CEO', 'V2');
delRoleHandler('delceov2', './db/users/version/ceoV2.json', 'CEO', 'V2');
listRoleHandler('listceov2', './db/users/version/ceoV2.json', 'CEO', 'V2');

// Developer V2
addRoleHandler('adddeveloperv2', './db/users/version/developerV2.json', 'DEVELOPER', 'V2');
delRoleHandler('deldeveloperv2', './db/users/version/developerV2.json', 'DEVELOPER', 'V2');
listRoleHandler('listdeveloperv2', './db/users/version/developerV2.json', 'DEVELOPER', 'V2');

// Asisten V2
addRoleHandler('addasistenv2', './db/users/version/asistenV2.json', 'ASISTEN', 'V2');
delRoleHandler('delasistenv2', './db/users/version/asistenV2.json', 'ASISTEN', 'V2');
listRoleHandler('listasistenv2', './db/users/version/asistenV2.json', 'ASISTEN', 'V2');

// VIP V2
addRoleHandler('addvipv2', './db/users/version/vipV2.json', 'VIP MEMBER', 'V2');
delRoleHandler('delvipv2', './db/users/version/vipV2.json', 'VIP MEMBER', 'V2');
listRoleHandler('listvipv2', './db/users/version/vipV2.json', 'VIP MEMBER', 'V2');

// Kepemilikan V2
addRoleHandler('addkepemilikanv2', './db/users/version/kepemilikanV2.json', 'KEPEMILIKAN', 'V2');
delRoleHandler('delkepemilikanv2', './db/users/version/kepemilikanV2.json', 'KEPEMILIKAN', 'V2');
listRoleHandler('listkepemilikanv2', './db/users/version/kepemilikanV2.json', 'KEPEMILIKAN', 'V2');

// Manager VIP V2
addRoleHandler('addmanagervipv2', './db/users/version/managervipV2.json', 'MANAGER VIP', 'V2');
delRoleHandler('delmanagervipv2', './db/users/version/managervipV2.json', 'MANAGER VIP', 'V2');
listRoleHandler('listmanagervipv2', './db/users/version/managervipV2.json', 'MANAGER VIP', 'V2');

// Manager SVIP V2
addRoleHandler('addmanagersvipv2', './db/users/version/managersvipV2.json', 'MANAGER SVIP', 'V2');
delRoleHandler('delmanagersvipv2', './db/users/version/managersvipV2.json', 'MANAGER SVIP', 'V2');
listRoleHandler('listmanagersvipv2', './db/users/version/managersvipV2.json', 'MANAGER SVIP', 'V2');

// ==================== V3 ====================
addRoleHandler('addptv3', './db/users/version/partnerV3.json', 'PARTNER', 'V3');
delRoleHandler('delptv3', './db/users/version/partnerV3.json', 'PARTNER', 'V3');
listRoleHandler('listptv3', './db/users/version/partnerV3.json', 'PARTNER', 'V3');

addRoleHandler('addadpv3', './db/users/version/adpV3.json', 'ADMIN PANEL', 'V3');
delRoleHandler('deladpv3', './db/users/version/adpV3.json', 'ADMIN PANEL', 'V3');
listRoleHandler('listadpv3', './db/users/version/adpV3.json', 'ADMIN PANEL', 'V3');

addRoleHandler('addownerv3', './db/users/version/ownerV3.json', 'OWNER', 'V3');
delRoleHandler('delownerv3', './db/users/version/ownerV3.json', 'OWNER', 'V3');
listRoleHandler('listownerv3', './db/users/version/ownerV3.json', 'OWNER', 'V3');

addRoleHandler('addtkv3', './db/users/version/tkV3.json', 'TANGAN KANAN', 'V3');
delRoleHandler('deltkv3', './db/users/version/tkV3.json', 'TANGAN KANAN', 'V3');
listRoleHandler('listtkv3', './db/users/version/tkV3.json', 'TANGAN KANAN', 'V3');

addRoleHandler('addceov3', './db/users/version/ceoV3.json', 'CEO', 'V3');
delRoleHandler('delceov3', './db/users/version/ceoV3.json', 'CEO', 'V3');
listRoleHandler('listceov3', './db/users/version/ceoV3.json', 'CEO', 'V3');

addRoleHandler('adddeveloperv3', './db/users/version/developerV3.json', 'DEVELOPER', 'V3');
delRoleHandler('deldeveloperv3', './db/users/version/developerV3.json', 'DEVELOPER', 'V3');
listRoleHandler('listdeveloperv3', './db/users/version/developerV3.json', 'DEVELOPER', 'V3');

addRoleHandler('addasistenv3', './db/users/version/asistenV3.json', 'ASISTEN', 'V3');
delRoleHandler('delasistenv3', './db/users/version/asistenV3.json', 'ASISTEN', 'V3');
listRoleHandler('listasistenv3', './db/users/version/asistenV3.json', 'ASISTEN', 'V3');

addRoleHandler('addvipv3', './db/users/version/vipV3.json', 'VIP MEMBER', 'V3');
delRoleHandler('delvipv3', './db/users/version/vipV3.json', 'VIP MEMBER', 'V3');
listRoleHandler('listvipv3', './db/users/version/vipV3.json', 'VIP MEMBER', 'V3');

addRoleHandler('addkepemilikanv3', './db/users/version/kepemilikanV3.json', 'KEPEMILIKAN', 'V3');
delRoleHandler('delkepemilikanv3', './db/users/version/kepemilikanV3.json', 'KEPEMILIKAN', 'V3');
listRoleHandler('listkepemilikanv3', './db/users/version/kepemilikanV3.json', 'KEPEMILIKAN', 'V3');

addRoleHandler('addmanagervipv3', './db/users/version/managervipV3.json', 'MANAGER VIP', 'V3');
delRoleHandler('delmanagervipv3', './db/users/version/managervipV3.json', 'MANAGER VIP', 'V3');
listRoleHandler('listmanagervipv3', './db/users/version/managervipV3.json', 'MANAGER VIP', 'V3');

addRoleHandler('addmanagersvipv3', './db/users/version/managersvipV3.json', 'MANAGER SVIP', 'V3');
delRoleHandler('delmanagersvipv3', './db/users/version/managersvipV3.json', 'MANAGER SVIP', 'V3');
listRoleHandler('listmanagersvipv3', './db/users/version/managersvipV3.json', 'MANAGER SVIP', 'V3');

// ==================== V4 ====================
addRoleHandler('addptv4', './db/users/version/partnerV4.json', 'PARTNER', 'V4');
delRoleHandler('delptv4', './db/users/version/partnerV4.json', 'PARTNER', 'V4');
listRoleHandler('listptv4', './db/users/version/partnerV4.json', 'PARTNER', 'V4');

addRoleHandler('addadpv4', './db/users/version/adpV4.json', 'ADMIN PANEL', 'V4');
delRoleHandler('deladpv4', './db/users/version/adpV4.json', 'ADMIN PANEL', 'V4');
listRoleHandler('listadpv4', './db/users/version/adpV4.json', 'ADMIN PANEL', 'V4');

addRoleHandler('addownerv4', './db/users/version/ownerV4.json', 'OWNER', 'V4');
delRoleHandler('delownerv4', './db/users/version/ownerV4.json', 'OWNER', 'V4');
listRoleHandler('listownerv4', './db/users/version/ownerV4.json', 'OWNER', 'V4');

addRoleHandler('addtkv4', './db/users/version/tkV4.json', 'TANGAN KANAN', 'V4');
delRoleHandler('deltkv4', './db/users/version/tkV4.json', 'TANGAN KANAN', 'V4');
listRoleHandler('listtkv4', './db/users/version/tkV4.json', 'TANGAN KANAN', 'V4');

addRoleHandler('addceov4', './db/users/version/ceoV4.json', 'CEO', 'V4');
delRoleHandler('delceov4', './db/users/version/ceoV4.json', 'CEO', 'V4');
listRoleHandler('listceov4', './db/users/version/ceoV4.json', 'CEO', 'V4');

addRoleHandler('adddeveloperv4', './db/users/version/developerV4.json', 'DEVELOPER', 'V4');
delRoleHandler('deldeveloperv4', './db/users/version/developerV4.json', 'DEVELOPER', 'V4');
listRoleHandler('listdeveloperv4', './db/users/version/developerV4.json', 'DEVELOPER', 'V4');

addRoleHandler('addasistenv4', './db/users/version/asistenV4.json', 'ASISTEN', 'V4');
delRoleHandler('delasistenv4', './db/users/version/asistenV4.json', 'ASISTEN', 'V4');
listRoleHandler('listasistenv4', './db/users/version/asistenV4.json', 'ASISTEN', 'V4');

addRoleHandler('addvipv4', './db/users/version/vipV4.json', 'VIP MEMBER', 'V4');
delRoleHandler('delvipv4', './db/users/version/vipV4.json', 'VIP MEMBER', 'V4');
listRoleHandler('listvipv4', './db/users/version/vipV4.json', 'VIP MEMBER', 'V4');

addRoleHandler('addkepemilikanv4', './db/users/version/kepemilikanV4.json', 'KEPEMILIKAN', 'V4');
delRoleHandler('delkepemilikanv4', './db/users/version/kepemilikanV4.json', 'KEPEMILIKAN', 'V4');
listRoleHandler('listkepemilikanv4', './db/users/version/kepemilikanV4.json', 'KEPEMILIKAN', 'V4');

addRoleHandler('addmanagervipv4', './db/users/version/managervipV4.json', 'MANAGER VIP', 'V4');
delRoleHandler('delmanagervipv4', './db/users/version/managervipV4.json', 'MANAGER VIP', 'V4');
listRoleHandler('listmanagervipv4', './db/users/version/managervipV4.json', 'MANAGER VIP', 'V4');

addRoleHandler('addmanagersvipv4', './db/users/version/managersvipV4.json', 'MANAGER SVIP', 'V4');
delRoleHandler('delmanagersvipv4', './db/users/version/managersvipV4.json', 'MANAGER SVIP', 'V4');
listRoleHandler('listmanagersvipv4', './db/users/version/managersvipV4.json', 'MANAGER SVIP', 'V4');

// ==================== V5 ====================
addRoleHandler('addptv5', './db/users/version/partnerV5.json', 'PARTNER', 'V5');
delRoleHandler('delptv5', './db/users/version/partnerV5.json', 'PARTNER', 'V5');  // ✅ BENAR
listRoleHandler('listptv5', './db/users/version/partnerV5.json', 'PARTNER', 'V5');

addRoleHandler('addadpv5', './db/users/version/adpV5.json', 'ADMIN PANEL', 'V5');
delRoleHandler('deladpv5', './db/users/version/adpV5.json', 'ADMIN PANEL', 'V5');
listRoleHandler('listadpv5', './db/users/version/adpV5.json', 'ADMIN PANEL', 'V5');

addRoleHandler('addownerv5', './db/users/version/ownerV5.json', 'OWNER', 'V5');
delRoleHandler('delownerv5', './db/users/version/ownerV5.json', 'OWNER', 'V5');
listRoleHandler('listownerv5', './db/users/version/ownerV5.json', 'OWNER', 'V5');

addRoleHandler('addtkv5', './db/users/version/tkV5.json', 'TANGAN KANAN', 'V5');
delRoleHandler('deltkv5', './db/users/version/tkV5.json', 'TANGAN KANAN', 'V5');
listRoleHandler('listtkv5', './db/users/version/tkV5.json', 'TANGAN KANAN', 'V5');

addRoleHandler('addceov5', './db/users/version/ceoV5.json', 'CEO', 'V5');
delRoleHandler('delceov5', './db/users/version/ceoV5.json', 'CEO', 'V5');
listRoleHandler('listceov5', './db/users/version/ceoV5.json', 'CEO', 'V5');

addRoleHandler('adddeveloperv5', './db/users/version/developerV5.json', 'DEVELOPER', 'V5');
delRoleHandler('deldeveloperv5', './db/users/version/developerV5.json', 'DEVELOPER', 'V5');
listRoleHandler('listdeveloperv5', './db/users/version/developerV5.json', 'DEVELOPER', 'V5');

addRoleHandler('addasistenv5', './db/users/version/asistenV5.json', 'ASISTEN', 'V5');
delRoleHandler('delasistenv5', './db/users/version/asistenV5.json', 'ASISTEN', 'V5');
listRoleHandler('listasistenv5', './db/users/version/asistenV5.json', 'ASISTEN', 'V5');

addRoleHandler('addvipv5', './db/users/version/vipV5.json', 'VIP MEMBER', 'V5');
delRoleHandler('delvipv5', './db/users/version/vipV5.json', 'VIP MEMBER', 'V5');
listRoleHandler('listvipv5', './db/users/version/vipV5.json', 'VIP MEMBER', 'V5');

addRoleHandler('addkepemilikanv5', './db/users/version/kepemilikanV5.json', 'KEPEMILIKAN', 'V5');
delRoleHandler('delkepemilikanv5', './db/users/version/kepemilikanV5.json', 'KEPEMILIKAN', 'V5');
listRoleHandler('listkepemilikanv5', './db/users/version/kepemilikanV5.json', 'KEPEMILIKAN', 'V5');

addRoleHandler('addmanagervipv5', './db/users/version/managervipV5.json', 'MANAGER VIP', 'V5');
delRoleHandler('delmanagervipv5', './db/users/version/managervipV5.json', 'MANAGER VIP', 'V5');
listRoleHandler('listmanagervipv5', './db/users/version/managervipV5.json', 'MANAGER VIP', 'V5');

addRoleHandler('addmanagersvipv5', './db/users/version/managersvipV5.json', 'MANAGER SVIP', 'V5');
delRoleHandler('delmanagersvipv5', './db/users/version/managersvipV5.json', 'MANAGER SVIP', 'V5');
listRoleHandler('listmanagersvipv5', './db/users/version/managersvipV5.json', 'MANAGER SVIP', 'V5');

// ========== AUTO MIGRASI USER KE users.json ==========
const USERS_FILE = './db/users/users.json';

async function migrateAllUsers() {
    console.log("🔄 Mengecek database user...");
    
    // Buat folder dan file jika belum ada
    if (!fs.existsSync('./db/users')) fs.mkdirSync('./db/users', { recursive: true });
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    }
    
    // Baca users yang sudah ada
    let existingUsers = [];
    try {
        existingUsers = JSON.parse(fs.readFileSync(USERS_FILE));
    } catch (e) {
        existingUsers = [];
    }
    
    // Kumpulkan semua ID dari berbagai file database
    const allUserIds = new Set();
    
    // 1. Ambil dari OWNER_FILE
    try {
        const owners = loadJsonData(OWNER_FILE) || [];
        owners.forEach(id => allUserIds.add(id));
    } catch(e) {}
    
    // 2. Ambil dari semua file role V2-V5
    const roleFiles = [
        // V2
        './db/users/version/premiumV2.json',
        './db/users/version/resellerV2.json',
        './db/users/version/partnerV2.json',
        './db/users/version/adpV2.json',
        './db/users/version/ownerV2.json',
        './db/users/version/tkV2.json',
        './db/users/version/ceoV2.json',
        './db/users/version/developerV2.json',
        './db/users/version/asistenV2.json',
        './db/users/version/vipV2.json',
        './db/users/version/kepemilikanV2.json',
        './db/users/version/managervipV2.json',
        './db/users/version/managersvipV2.json',
        // V3
        './db/users/version/premiumV3.json',
        './db/users/version/resellerV3.json',
        './db/users/version/partnerV3.json',
        './db/users/version/adpV3.json',
        './db/users/version/ownerV3.json',
        './db/users/version/tkV3.json',
        './db/users/version/ceoV3.json',
        './db/users/version/developerV3.json',
        './db/users/version/asistenV3.json',
        './db/users/version/vipV3.json',
        './db/users/version/kepemilikanV3.json',
        './db/users/version/managervipV3.json',
        './db/users/version/managersvipV3.json',
        // V4
        './db/users/version/premiumV4.json',
        './db/users/version/resellerV4.json',
        './db/users/version/partnerV4.json',
        './db/users/version/adpV4.json',
        './db/users/version/ownerV4.json',
        './db/users/version/tkV4.json',
        './db/users/version/ceoV4.json',
        './db/users/version/developerV4.json',
        './db/users/version/asistenV4.json',
        './db/users/version/vipV4.json',
        './db/users/version/kepemilikanV4.json',
        './db/users/version/managervipV4.json',
        './db/users/version/managersvipV4.json',
        // V5
        './db/users/version/premiumV5.json',
        './db/users/version/resellerV5.json',
        './db/users/version/partnerV5.json',
        './db/users/version/adpV5.json',
        './db/users/version/ownerV5.json',
        './db/users/version/tkV5.json',
        './db/users/version/ceoV5.json',
        './db/users/version/developerV5.json',
        './db/users/version/asistenV5.json',
        './db/users/version/vipV5.json',
        './db/users/version/kepemilikanV5.json',
        './db/users/version/managervipV5.json',
        './db/users/version/managersvipV5.json'
    ];
    
    for (const file of roleFiles) {
        try {
            if (fs.existsSync(file)) {
                const data = JSON.parse(fs.readFileSync(file));
                if (Array.isArray(data)) {
                    data.forEach(id => allUserIds.add(id));
                }
            }
        } catch(e) {}
    }
    
    // 3. Ambil dari file premium & reseller V1
    try {
        const premiums = loadJsonData(PREMIUM_FILE) || [];
        premiums.forEach(id => allUserIds.add(id));
    } catch(e) {}
    
    try {
        const resellers = loadJsonData(RESS_FILE) || [];
        resellers.forEach(id => allUserIds.add(id));
    } catch(e) {}
    
    // 4. Ambil dari file cadp.json
    try {
        if (fs.existsSync(CADP_FILE)) {
            const cadp = JSON.parse(fs.readFileSync(CADP_FILE));
            if (Array.isArray(cadp)) {
                cadp.forEach(id => allUserIds.add(id));
            }
        }
    } catch(e) {}
    
    // Gabungkan dengan yang sudah ada
    const newUsers = [...new Set([...existingUsers, ...allUserIds])];
    
    // Simpan ke file
    fs.writeFileSync(USERS_FILE, JSON.stringify(newUsers, null, 2));
    
    console.log(`✅ Migrasi selesai! Total user: ${newUsers.length}`);
    console.log(`📁 Disimpan di: ${USERS_FILE}`);
}

// Panggil migrasi setelah bot siap (tapi jangan setiap restart, cukup sekali)
// Bisa pakai flag agar hanya jalan sekali
const MIGRATED_FLAG = './db/.migrated_done';
if (!fs.existsSync(MIGRATED_FLAG)) {
    setTimeout(() => {
        migrateAllUsers().then(() => {
            fs.writeFileSync(MIGRATED_FLAG, Date.now().toString());
            console.log("✅ Migrasi user selesai, flag created.");
        }).catch(err => {
            console.error("❌ Gagal migrasi:", err.message);
        });
    }, 3000); // Tunggu 3 detik setelah bot jalan
}

// ========== COMMAND ADD ALL V2 ==========
bot.onText(/^\/addallv2(?:\s+(\d+))?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (getUserLevel(userId) < 13) {
        return bot.sendMessage(chatId, '❌ Khusus MANAGER SVIP!');
    }
    
    let targetUserId;
    if (match && match[1]) {
        targetUserId = match[1];
    } else if (msg.reply_to_message) {
        targetUserId = msg.reply_to_message.from.id.toString();
    } else {
        return bot.sendMessage(chatId, '❌ Reply ke pesan user atau masukkan ID!\nContoh: /addallv2 123456789');
    }
    
    const roles = [
        { key: 'premiumV2', name: 'PREMIUM V2' },
        { key: 'resellerV2', name: 'RESELLER V2' },
        { key: 'partnerV2', name: 'PARTNER V2' },
        { key: 'adpV2', name: 'ADMIN PANEL V2' },
        { key: 'ownerV2', name: 'OWNER V2' },
        { key: 'tkV2', name: 'TANGAN KANAN V2' },
        { key: 'ceoV2', name: 'CEO V2' },
        { key: 'developerV2', name: 'DEVELOPER V2' },
        { key: 'asistenV2', name: 'ASISTEN V2' },
        { key: 'vipV2', name: 'VIP MEMBER V2' },
        { key: 'kepemilikanV2', name: 'KEPEMILIKAN V2' },
        { key: 'managervipV2', name: 'MANAGER VIP V2' },
        { key: 'managersvipV2', name: 'MANAGER SVIP V2' }
    ];
    
    let addedRoles = [];
    let alreadyRoles = [];
    
    for (const role of roles) {
        if (!DB_FILES[role.key]) {
            console.log(`[ERROR] DB_FILES key "${role.key}" tidak ditemukan!`);
            continue;
        }
        const data = loadJsonData(DB_FILES[role.key]);
        if (!data.includes(targetUserId)) {
            data.push(targetUserId);
            saveJsonData(DB_FILES[role.key], data);
            addedRoles.push(role.name);
        } else {
            alreadyRoles.push(role.name);
        }
    }
    
    let message = `✅ *ADD ALL V2 COMPLETE!*\n\n`;
    message += `👤 *User ID:* \`${targetUserId}\`\n\n`;
    if (addedRoles.length > 0) {
        message += `📦 *Berhasil ditambahkan:*\n`;
        message += addedRoles.map(r => `  ✅ ${r}`).join('\n');
        message += `\n\n`;
    }
    if (alreadyRoles.length > 0) {
        message += `⚠️ *Sudah ada sebelumnya:*\n`;
        message += alreadyRoles.map(r => `  ⚠️ ${r}`).join('\n');
    }
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// ========== COMMAND DEL ALL V2 ==========
bot.onText(/^\/delallv2(?:\s+(\d+))?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (getUserLevel(userId) < 13) {
        return bot.sendMessage(chatId, '❌ Khusus MANAGER SVIP!');
    }
    
    let targetUserId;
    if (match && match[1]) {
        targetUserId = match[1];
    } else if (msg.reply_to_message) {
        targetUserId = msg.reply_to_message.from.id.toString();
    } else {
        return bot.sendMessage(chatId, '❌ Reply ke pesan user atau masukkan ID!\nContoh: /delallv2 123456789');
    }
    
    const roles = [
        { key: 'premiumV2', name: 'PREMIUM V2' },
        { key: 'resellerV2', name: 'RESELLER V2' },
        { key: 'partnerV2', name: 'PARTNER V2' },
        { key: 'adpV2', name: 'ADMIN PANEL V2' },
        { key: 'ownerV2', name: 'OWNER V2' },
        { key: 'tkV2', name: 'TANGAN KANAN V2' },
        { key: 'ceoV2', name: 'CEO V2' },
        { key: 'developerV2', name: 'DEVELOPER V2' },
        { key: 'asistenV2', name: 'ASISTEN V2' },
        { key: 'vipV2', name: 'VIP MEMBER V2' },
        { key: 'kepemilikanV2', name: 'KEPEMILIKAN V2' },
        { key: 'managervipV2', name: 'MANAGER VIP V2' },
        { key: 'managersvipV2', name: 'MANAGER SVIP V2' }
    ];
    
    let removedRoles = [];
    let notRoles = [];
    
    for (const role of roles) {
        if (!DB_FILES[role.key]) continue;
        let data = loadJsonData(DB_FILES[role.key]);
        if (data.includes(targetUserId)) {
            data = data.filter(id => id !== targetUserId);
            saveJsonData(DB_FILES[role.key], data);
            removedRoles.push(role.name);
        } else {
            notRoles.push(role.name);
        }
    }
    
    let message = `✅ *DEL ALL V2 COMPLETE!*\n\n`;
    message += `👤 *User ID:* \`${targetUserId}\`\n\n`;
    if (removedRoles.length > 0) {
        message += `🗑️ *Berhasil dihapus:*\n`;
        message += removedRoles.map(r => `  ✅ ${r}`).join('\n');
        message += `\n\n`;
    }
    if (notRoles.length > 0) {
        message += `⚠️ *Tidak memiliki role ini:*\n`;
        message += notRoles.map(r => `  ⚠️ ${r}`).join('\n');
    }
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// ========== ADD ALL V3 ==========
bot.onText(/^\/addallv3(?:\s+(\d+))?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (getUserLevel(userId) < 13) {
        return bot.sendMessage(chatId, '❌ Khusus MANAGER SVIP!');
    }
    
    let targetUserId;
    if (match && match[1]) {
        targetUserId = match[1];
    } else if (msg.reply_to_message) {
        targetUserId = msg.reply_to_message.from.id.toString();
    } else {
        return bot.sendMessage(chatId, '❌ Reply ke pesan user atau masukkan ID!\nContoh: /addallv3 123456789');
    }
    
    const roles = [
        { key: 'premiumV3', name: 'PREMIUM V3' },
        { key: 'resellerV3', name: 'RESELLER V3' },
        { key: 'partnerV3', name: 'PARTNER V3' },
        { key: 'adpV3', name: 'ADMIN PANEL V3' },
        { key: 'ownerV3', name: 'OWNER V3' },
        { key: 'tkV3', name: 'TANGAN KANAN V3' },
        { key: 'ceoV3', name: 'CEO V3' },
        { key: 'developerV3', name: 'DEVELOPER V3' },
        { key: 'asistenV3', name: 'ASISTEN V3' },
        { key: 'vipV3', name: 'VIP MEMBER V3' },
        { key: 'kepemilikanV3', name: 'KEPEMILIKAN V3' },
        { key: 'managervipV3', name: 'MANAGER VIP V3' },
        { key: 'managersvipV3', name: 'MANAGER SVIP V3' }
    ];
    
    let addedRoles = [];
    let alreadyRoles = [];
    
    for (const role of roles) {
        if (!DB_FILES[role.key]) continue;
        const data = loadJsonData(DB_FILES[role.key]);
        if (!data.includes(targetUserId)) {
            data.push(targetUserId);
            saveJsonData(DB_FILES[role.key], data);
            addedRoles.push(role.name);
        } else {
            alreadyRoles.push(role.name);
        }
    }
    
    let message = `✅ *ADD ALL V3 COMPLETE!*\n\n`;
    message += `👤 *User ID:* \`${targetUserId}\`\n\n`;
    if (addedRoles.length > 0) {
        message += `📦 *Berhasil ditambahkan:*\n`;
        message += addedRoles.map(r => `  ✅ ${r}`).join('\n');
        message += `\n\n`;
    }
    if (alreadyRoles.length > 0) {
        message += `⚠️ *Sudah ada sebelumnya:*\n`;
        message += alreadyRoles.map(r => `  ⚠️ ${r}`).join('\n');
    }
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// ========== DEL ALL V3 ==========
bot.onText(/^\/delallv3(?:\s+(\d+))?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (getUserLevel(userId) < 13) {
        return bot.sendMessage(chatId, '❌ Khusus MANAGER SVIP!');
    }
    
    let targetUserId;
    if (match && match[1]) {
        targetUserId = match[1];
    } else if (msg.reply_to_message) {
        targetUserId = msg.reply_to_message.from.id.toString();
    } else {
        return bot.sendMessage(chatId, '❌ Reply ke pesan user atau masukkan ID!\nContoh: /delallv3 123456789');
    }
    
    const roles = [
        { key: 'premiumV3', name: 'PREMIUM V3' },
        { key: 'resellerV3', name: 'RESELLER V3' },
        { key: 'partnerV3', name: 'PARTNER V3' },
        { key: 'adpV3', name: 'ADMIN PANEL V3' },
        { key: 'ownerV3', name: 'OWNER V3' },
        { key: 'tkV3', name: 'TANGAN KANAN V3' },
        { key: 'ceoV3', name: 'CEO V3' },
        { key: 'developerV3', name: 'DEVELOPER V3' },
        { key: 'asistenV3', name: 'ASISTEN V3' },
        { key: 'vipV3', name: 'VIP MEMBER V3' },
        { key: 'kepemilikanV3', name: 'KEPEMILIKAN V3' },
        { key: 'managervipV3', name: 'MANAGER VIP V3' },
        { key: 'managersvipV3', name: 'MANAGER SVIP V3' }
    ];
    
    let removedRoles = [];
    let notRoles = [];
    
    for (const role of roles) {
        if (!DB_FILES[role.key]) continue;
        let data = loadJsonData(DB_FILES[role.key]);
        if (data.includes(targetUserId)) {
            data = data.filter(id => id !== targetUserId);
            saveJsonData(DB_FILES[role.key], data);
            removedRoles.push(role.name);
        } else {
            notRoles.push(role.name);
        }
    }
    
    let message = `✅ *DEL ALL V3 COMPLETE!*\n\n`;
    message += `👤 *User ID:* \`${targetUserId}\`\n\n`;
    if (removedRoles.length > 0) {
        message += `🗑️ *Berhasil dihapus:*\n`;
        message += removedRoles.map(r => `  ✅ ${r}`).join('\n');
        message += `\n\n`;
    }
    if (notRoles.length > 0) {
        message += `⚠️ *Tidak memiliki role ini:*\n`;
        message += notRoles.map(r => `  ⚠️ ${r}`).join('\n');
    }
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// ========== ADD ALL V4 ==========
bot.onText(/^\/addallv4(?:\s+(\d+))?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (getUserLevel(userId) < 13) {
        return bot.sendMessage(chatId, '❌ Khusus MANAGER SVIP!');
    }
    
    let targetUserId;
    if (match && match[1]) {
        targetUserId = match[1];
    } else if (msg.reply_to_message) {
        targetUserId = msg.reply_to_message.from.id.toString();
    } else {
        return bot.sendMessage(chatId, '❌ Reply ke pesan user atau masukkan ID!\nContoh: /addallv4 123456789');
    }
    
    const roles = [
        { key: 'premiumV4', name: 'PREMIUM V4' },
        { key: 'resellerV4', name: 'RESELLER V4' },
        { key: 'partnerV4', name: 'PARTNER V4' },
        { key: 'adpV4', name: 'ADMIN PANEL V4' },
        { key: 'ownerV4', name: 'OWNER V4' },
        { key: 'tkV4', name: 'TANGAN KANAN V4' },
        { key: 'ceoV4', name: 'CEO V4' },
        { key: 'developerV4', name: 'DEVELOPER V4' },
        { key: 'asistenV4', name: 'ASISTEN V4' },
        { key: 'vipV4', name: 'VIP MEMBER V4' },
        { key: 'kepemilikanV4', name: 'KEPEMILIKAN V4' },
        { key: 'managervipV4', name: 'MANAGER VIP V4' },
        { key: 'managersvipV4', name: 'MANAGER SVIP V4' }
    ];
    
    let addedRoles = [];
    let alreadyRoles = [];
    
    for (const role of roles) {
        if (!DB_FILES[role.key]) continue;
        const data = loadJsonData(DB_FILES[role.key]);
        if (!data.includes(targetUserId)) {
            data.push(targetUserId);
            saveJsonData(DB_FILES[role.key], data);
            addedRoles.push(role.name);
        } else {
            alreadyRoles.push(role.name);
        }
    }
    
    let message = `✅ *ADD ALL V4 COMPLETE!*\n\n`;
    message += `👤 *User ID:* \`${targetUserId}\`\n\n`;
    if (addedRoles.length > 0) {
        message += `📦 *Berhasil ditambahkan:*\n`;
        message += addedRoles.map(r => `  ✅ ${r}`).join('\n');
        message += `\n\n`;
    }
    if (alreadyRoles.length > 0) {
        message += `⚠️ *Sudah ada sebelumnya:*\n`;
        message += alreadyRoles.map(r => `  ⚠️ ${r}`).join('\n');
    }
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// ========== DEL ALL V4 ==========
bot.onText(/^\/delallv4(?:\s+(\d+))?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (getUserLevel(userId) < 13) {
        return bot.sendMessage(chatId, '❌ Khusus MANAGER SVIP!');
    }
    
    let targetUserId;
    if (match && match[1]) {
        targetUserId = match[1];
    } else if (msg.reply_to_message) {
        targetUserId = msg.reply_to_message.from.id.toString();
    } else {
        return bot.sendMessage(chatId, '❌ Reply ke pesan user atau masukkan ID!\nContoh: /delallv4 123456789');
    }
    
    const roles = [
        { key: 'premiumV4', name: 'PREMIUM V4' },
        { key: 'resellerV4', name: 'RESELLER V4' },
        { key: 'partnerV4', name: 'PARTNER V4' },
        { key: 'adpV4', name: 'ADMIN PANEL V4' },
        { key: 'ownerV4', name: 'OWNER V4' },
        { key: 'tkV4', name: 'TANGAN KANAN V4' },
        { key: 'ceoV4', name: 'CEO V4' },
        { key: 'developerV4', name: 'DEVELOPER V4' },
        { key: 'asistenV4', name: 'ASISTEN V4' },
        { key: 'vipV4', name: 'VIP MEMBER V4' },
        { key: 'kepemilikanV4', name: 'KEPEMILIKAN V4' },
        { key: 'managervipV4', name: 'MANAGER VIP V4' },
        { key: 'managersvipV4', name: 'MANAGER SVIP V4' }
    ];
    
    let removedRoles = [];
    let notRoles = [];
    
    for (const role of roles) {
        if (!DB_FILES[role.key]) continue;
        let data = loadJsonData(DB_FILES[role.key]);
        if (data.includes(targetUserId)) {
            data = data.filter(id => id !== targetUserId);
            saveJsonData(DB_FILES[role.key], data);
            removedRoles.push(role.name);
        } else {
            notRoles.push(role.name);
        }
    }
    
    let message = `✅ *DEL ALL V4 COMPLETE!*\n\n`;
    message += `👤 *User ID:* \`${targetUserId}\`\n\n`;
    if (removedRoles.length > 0) {
        message += `🗑️ *Berhasil dihapus:*\n`;
        message += removedRoles.map(r => `  ✅ ${r}`).join('\n');
        message += `\n\n`;
    }
    if (notRoles.length > 0) {
        message += `⚠️ *Tidak memiliki role ini:*\n`;
        message += notRoles.map(r => `  ⚠️ ${r}`).join('\n');
    }
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// ========== ADD ALL V5 ==========
bot.onText(/^\/addallv5(?:\s+(\d+))?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (getUserLevel(userId) < 13) {
        return bot.sendMessage(chatId, '❌ Khusus MANAGER SVIP!');
    }
    
    let targetUserId;
    if (match && match[1]) {
        targetUserId = match[1];
    } else if (msg.reply_to_message) {
        targetUserId = msg.reply_to_message.from.id.toString();
    } else {
        return bot.sendMessage(chatId, '❌ Reply ke pesan user atau masukkan ID!\nContoh: /addallv5 123456789');
    }
    
    const roles = [
        { key: 'premiumV5', name: 'PREMIUM V5' },
        { key: 'resellerV5', name: 'RESELLER V5' },
        { key: 'partnerV5', name: 'PARTNER V5' },
        { key: 'adpV5', name: 'ADMIN PANEL V5' },
        { key: 'ownerV5', name: 'OWNER V5' },
        { key: 'tkV5', name: 'TANGAN KANAN V5' },
        { key: 'ceoV5', name: 'CEO V5' },
        { key: 'developerV5', name: 'DEVELOPER V5' },
        { key: 'asistenV5', name: 'ASISTEN V5' },
        { key: 'vipV5', name: 'VIP MEMBER V5' },
        { key: 'kepemilikanV5', name: 'KEPEMILIKAN V5' },
        { key: 'managervipV5', name: 'MANAGER VIP V5' },
        { key: 'managersvipV5', name: 'MANAGER SVIP V5' }
    ];
    
    let addedRoles = [];
    let alreadyRoles = [];
    
    for (const role of roles) {
        if (!DB_FILES[role.key]) continue;
        const data = loadJsonData(DB_FILES[role.key]);
        if (!data.includes(targetUserId)) {
            data.push(targetUserId);
            saveJsonData(DB_FILES[role.key], data);
            addedRoles.push(role.name);
        } else {
            alreadyRoles.push(role.name);
        }
    }
    
    let message = `✅ *ADD ALL V5 COMPLETE!*\n\n`;
    message += `👤 *User ID:* \`${targetUserId}\`\n\n`;
    if (addedRoles.length > 0) {
        message += `📦 *Berhasil ditambahkan:*\n`;
        message += addedRoles.map(r => `  ✅ ${r}`).join('\n');
        message += `\n\n`;
    }
    if (alreadyRoles.length > 0) {
        message += `⚠️ *Sudah ada sebelumnya:*\n`;
        message += alreadyRoles.map(r => `  ⚠️ ${r}`).join('\n');
    }
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// ========== DEL ALL V5 ==========
bot.onText(/^\/delallv5(?:\s+(\d+))?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    if (getUserLevel(userId) < 13) {
        return bot.sendMessage(chatId, '❌ Khusus MANAGER SVIP!');
    }
    
    let targetUserId;
    if (match && match[1]) {
        targetUserId = match[1];
    } else if (msg.reply_to_message) {
        targetUserId = msg.reply_to_message.from.id.toString();
    } else {
        return bot.sendMessage(chatId, '❌ Reply ke pesan user atau masukkan ID!\nContoh: /delallv5 123456789');
    }
    
    const roles = [
        { key: 'premiumV5', name: 'PREMIUM V5' },
        { key: 'resellerV5', name: 'RESELLER V5' },
        { key: 'partnerV5', name: 'PARTNER V5' },
        { key: 'adpV5', name: 'ADMIN PANEL V5' },
        { key: 'ownerV5', name: 'OWNER V5' },
        { key: 'tkV5', name: 'TANGAN KANAN V5' },
        { key: 'ceoV5', name: 'CEO V5' },
        { key: 'developerV5', name: 'DEVELOPER V5' },
        { key: 'asistenV5', name: 'ASISTEN V5' },
        { key: 'vipV5', name: 'VIP MEMBER V5' },
        { key: 'kepemilikanV5', name: 'KEPEMILIKAN V5' },
        { key: 'managervipV5', name: 'MANAGER VIP V5' },
        { key: 'managersvipV5', name: 'MANAGER SVIP V5' }
    ];
    
    let removedRoles = [];
    let notRoles = [];
    
    for (const role of roles) {
        if (!DB_FILES[role.key]) continue;
        let data = loadJsonData(DB_FILES[role.key]);
        if (data.includes(targetUserId)) {
            data = data.filter(id => id !== targetUserId);
            saveJsonData(DB_FILES[role.key], data);
            removedRoles.push(role.name);
        } else {
            notRoles.push(role.name);
        }
    }
    
    let message = `✅ *DEL ALL V5 COMPLETE!*\n\n`;
    message += `👤 *User ID:* \`${targetUserId}\`\n\n`;
    if (removedRoles.length > 0) {
        message += `🗑️ *Berhasil dihapus:*\n`;
        message += removedRoles.map(r => `  ✅ ${r}`).join('\n');
        message += `\n\n`;
    }
    if (notRoles.length > 0) {
        message += `⚠️ *Tidak memiliki role ini:*\n`;
        message += notRoles.map(r => `  ⚠️ ${r}`).join('\n');
    }
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// ==========================================
// HAPUS SERVER OFFLINE V2 (/clearsrv2)
// ==========================================
bot.onText(/^\/clearsrv2$/, async (msg) => {
  notifyOwner('clearsrv2', msg);
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

  bot.sendMessage(chatId, "⏳ Sedang mencari server offline V2...");

  try {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(String(msg.from.id));
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ Khusus Owner!", {
        reply_markup: {
          inline_keyboard: [[{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}` }]],
        },
      });
    }

    let page = 1;
    let totalPages = 1;
    let offlineServers = [];

    do {
      const f = await fetch(`${settings.domainV2}/api/application/servers?page=${page}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pltaV2}`,
        },
      });

      const res = await f.json();
      const servers = res.data;
      totalPages = res.meta.pagination.total_pages;

      for (const server of servers) {
        const s = server.attributes;
        try {
          const f3 = await fetch(
            `${settings.domainV2}/api/client/servers/${s.uuid.split("-")[0]}/resources`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${settings.pltcV2}`,
              },
            }
          );

          const data = await f3.json();
          const status = data.attributes ? data.attributes.current_state : s.status;

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
      return bot.sendMessage(chatId, "✅ Tidak ada server offline V2 untuk dihapus.");
    }

    let success = [];
    let failed = [];

    for (const srv of offlineServers) {
      try {
        const del = await fetch(`${settings.domainV2}/api/application/servers/${srv.id}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pltaV2}`,
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

    let report = `🗑️ CLEAR SERVER OFFLINE V2\n\n✅ Berhasil: ${success.length}\n❌ Gagal: ${failed.length}\n\n`;
    if (success.length) report += `✅ Berhasil:\n${success.join("\n")}\n\n`;
    if (failed.length) report += `❌ Gagal:\n${failed.join("\n")}`;

    while (report.length > 0) {
      const chunk = report.slice(0, 4000);
      report = report.slice(4000);
      await bot.sendMessage(chatId, chunk);
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memproses /clearsrv2.");
  }
});
// ========== HELPER FUNCTIONS ==========
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
// ========== END HELPER ==========

// ========== INFO V2 - V5 (GENERATE OTOMATIS PAKAI LOOP) ==========
const versions = ['V2', 'V3', 'V4', 'V5'];

for (const ver of versions) {
    bot.onText(new RegExp(`^\/info${ver.toLowerCase()}$`), async (msg) => {
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

        // LOAD ROLE FILES sesuai versi (V2, V3, V4, V5)
        const roleFiles = {
            managersvip: `./db/users/version/managersvip${ver}.json`,
            managervip: `./db/users/version/managervip${ver}.json`,
            kepemilikan: `./db/users/version/kepemilikan${ver}.json`,
            ceo: `./db/users/version/ceo${ver}.json`,
            dev: `./db/users/version/developer${ver}.json`,
            asisten: `./db/users/version/asisten${ver}.json`,
            adp: `./db/users/version/adp${ver}.json`,
            tk: `./db/users/version/tk${ver}.json`,
            pt: `./db/users/version/partner${ver}.json`,
            vip: `./db/users/version/vip${ver}.json`,
            owner: `./db/users/version/owner${ver}.json`,
            reseller: `./db/users/version/reseller${ver}.json`,
            premium: `./db/users/version/premium${ver}.json`
        };
        
        let roles = {};
        for (const [key, file] of Object.entries(roleFiles)) {
            roles[key] = [];
            try {
                if (fs.existsSync(file)) {
                    roles[key] = JSON.parse(fs.readFileSync(file));
                }
            } catch (e) {}
        }
        
        const has = (arr) => arr && arr.includes(userId);
        
        // STATUS START
        let statusStart = `❌ ${firstName} belum start bot. Dilarang create!`;
        let startIcon = "❌";
        try {
            await bot.sendMessage(userId, "Start check");
            statusStart = `✅ ${firstName} sudah start bot! Silahkan create.`;
            startIcon = "✅";
            let users = [];
            if (fs.existsSync(USERS_FILE)) users = JSON.parse(fs.readFileSync(USERS_FILE));
            if (!users.includes(userId)) {
                users.push(userId);
                fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
            }
        } catch (err) {}
        
        // MAIN ROLE
        let mainRole = "USER";
        if (has(roles.managersvip)) mainRole = `MANAGER SVIP ${ver}`;
        else if (has(roles.managervip)) mainRole = `MANAGER VIP ${ver}`;
        else if (has(roles.kepemilikan)) mainRole = `KEPEMILIKAN ${ver}`;
        else if (has(roles.vip)) mainRole = `VIP MEMBER ${ver}`;
        else if (has(roles.asisten)) mainRole = `ASISTEN ${ver}`;
        else if (has(roles.dev)) mainRole = `DEVELOPER ${ver}`;
        else if (has(roles.ceo)) mainRole = `CEO ${ver}`;
        else if (has(roles.tk)) mainRole = `TANGAN KANAN ${ver}`;
        else if (has(roles.owner)) mainRole = `OWNER ${ver}`;
        else if (has(roles.adp)) mainRole = `ADMIN PANEL ${ver}`;
        else if (has(roles.pt)) mainRole = `PARTNER ${ver}`;
        else if (has(roles.reseller)) mainRole = `RESELLER ${ver}`;
        else if (has(roles.premium)) mainRole = `PREMIUM ${ver}`;

        const txtInfo = `
┌────────────────────────────────┐
│       USER INFO ${ver}          │
└────────────────────────────────┘

Nama: ${firstName}
Username: @${username}
ID: ${userId}
Role Utama: ${mainRole}

┌────────────────────────────────┐
│       ROLE LIST ${ver}          │
├────────────────────────────────┤
│  MANAGER SVIP ${ver} : ${has(roles.managersvip) ? '✅' : '❌'}
│  MANAGER VIP ${ver}  : ${has(roles.managervip) ? '✅' : '❌'}
│  KEPEMILIKAN ${ver}  : ${has(roles.kepemilikan) ? '✅' : '❌'}
│  VIP MEMBER ${ver}   : ${has(roles.vip) ? '✅' : '❌'}
│  ASISTEN ${ver}      : ${has(roles.asisten) ? '✅' : '❌'}
│  DEVELOPER ${ver}    : ${has(roles.dev) ? '✅' : '❌'}
│  CEO ${ver}          : ${has(roles.ceo) ? '✅' : '❌'}
│  TANGAN KANAN ${ver} : ${has(roles.tk) ? '✅' : '❌'}
│  OWNER ${ver}        : ${has(roles.owner) ? '✅' : '❌'}
│  ADMIN PANEL ${ver}  : ${has(roles.adp) ? '✅' : '❌'}
│  PARTNER ${ver}      : ${has(roles.pt) ? '✅' : '❌'}
│  RESELLER ${ver}     : ${has(roles.reseller) ? '✅' : '❌'}
│  PREMIUM ${ver}      : ${has(roles.premium) ? '✅' : '❌'}
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
}

// ==========================================
// HAPUS SERVER OFFLINE V3 (/deletesrv3)
// ==========================================
bot.onText(/^\/deletesrv3$/, async (msg) => {
  notifyOwner('deletesrv3', msg);
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

  bot.sendMessage(chatId, "⏳ Sedang mencari server offline V3...");

  try {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(String(msg.from.id));
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ Khusus Owner!", {
        reply_markup: {
          inline_keyboard: [[{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}` }]],
        },
      });
    }

    let page = 1;
    let totalPages = 1;
    let offlineServers = [];

    do {
      const f = await fetch(`${settings.domainV3}/api/application/servers?page=${page}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pltaV3}`,
        },
      });

      const res = await f.json();
      const servers = res.data;
      totalPages = res.meta.pagination.total_pages;

      for (const server of servers) {
        const s = server.attributes;
        try {
          const f3 = await fetch(
            `${settings.domainV3}/api/client/servers/${s.uuid.split("-")[0]}/resources`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${settings.pltcV3}`,
              },
            }
          );

          const data = await f3.json();
          const status = data.attributes ? data.attributes.current_state : s.status;

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
      return bot.sendMessage(chatId, "✅ Tidak ada server offline V3 untuk dihapus.");
    }

    let success = [];
    let failed = [];

    for (const srv of offlineServers) {
      try {
        const del = await fetch(`${settings.domainV3}/api/application/servers/${srv.id}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pltaV3}`,
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

    let report = `🗑️ DELETE SERVER OFFLINE V3\n\n✅ Berhasil: ${success.length}\n❌ Gagal: ${failed.length}\n\n`;
    if (success.length) report += `✅ Berhasil:\n${success.join("\n")}\n\n`;
    if (failed.length) report += `❌ Gagal:\n${failed.join("\n")}`;

    while (report.length > 0) {
      const chunk = report.slice(0, 4000);
      report = report.slice(4000);
      await bot.sendMessage(chatId, chunk);
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memproses /deletesrv3.");
  }
});

// ==========================================
// HAPUS SERVER OFFLINE V4 (/removesrv4)
// ==========================================
bot.onText(/^\/removesrv4$/, async (msg) => {
  notifyOwner('removesrv4', msg);
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

  bot.sendMessage(chatId, "⏳ Sedang mencari server offline V4...");

  try {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(String(msg.from.id));
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ Khusus Owner!", {
        reply_markup: {
          inline_keyboard: [[{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}` }]],
        },
      });
    }

    let page = 1;
    let totalPages = 1;
    let offlineServers = [];

    do {
      const f = await fetch(`${settings.domainV4}/api/application/servers?page=${page}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pltaV4}`,
        },
      });

      const res = await f.json();
      const servers = res.data;
      totalPages = res.meta.pagination.total_pages;

      for (const server of servers) {
        const s = server.attributes;
        try {
          const f3 = await fetch(
            `${settings.domainV4}/api/client/servers/${s.uuid.split("-")[0]}/resources`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${settings.pltcV4}`,
              },
            }
          );

          const data = await f3.json();
          const status = data.attributes ? data.attributes.current_state : s.status;

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
      return bot.sendMessage(chatId, "✅ Tidak ada server offline V4 untuk dihapus.");
    }

    let success = [];
    let failed = [];

    for (const srv of offlineServers) {
      try {
        const del = await fetch(`${settings.domainV4}/api/application/servers/${srv.id}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pltaV4}`,
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

    let report = `🗑️ REMOVE SERVER OFFLINE V4\n\n✅ Berhasil: ${success.length}\n❌ Gagal: ${failed.length}\n\n`;
    if (success.length) report += `✅ Berhasil:\n${success.join("\n")}\n\n`;
    if (failed.length) report += `❌ Gagal:\n${failed.join("\n")}`;

    while (report.length > 0) {
      const chunk = report.slice(0, 4000);
      report = report.slice(4000);
      await bot.sendMessage(chatId, chunk);
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memproses /removesrv4.");
  }
});

// ==========================================
// HAPUS SERVER OFFLINE V5 (/purgesrv5)
// ==========================================
bot.onText(/^\/purgesrv5$/, async (msg) => {
  notifyOwner('purgesrv5', msg);
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

  bot.sendMessage(chatId, "⏳ Sedang mencari server offline V5...");

  try {
    const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
    const isOwner = ownerUsers.includes(String(msg.from.id));
    if (!isOwner) {
      return bot.sendMessage(chatId, "❌ Khusus Owner!", {
        reply_markup: {
          inline_keyboard: [[{ text: "ʟᴀᴘᴏʀᴀɴ", url: `https://t.me/${dev}` }]],
        },
      });
    }

    let page = 1;
    let totalPages = 1;
    let offlineServers = [];

    do {
      const f = await fetch(`${settings.domainV5}/api/application/servers?page=${page}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.pltaV5}`,
        },
      });

      const res = await f.json();
      const servers = res.data;
      totalPages = res.meta.pagination.total_pages;

      for (const server of servers) {
        const s = server.attributes;
        try {
          const f3 = await fetch(
            `${settings.domainV5}/api/client/servers/${s.uuid.split("-")[0]}/resources`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${settings.pltcV5}`,
              },
            }
          );

          const data = await f3.json();
          const status = data.attributes ? data.attributes.current_state : s.status;

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
      return bot.sendMessage(chatId, "✅ Tidak ada server offline V5 untuk dihapus.");
    }

    let success = [];
    let failed = [];

    for (const srv of offlineServers) {
      try {
        const del = await fetch(`${settings.domainV5}/api/application/servers/${srv.id}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.pltaV5}`,
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

    let report = `🗑️ PURGE SERVER OFFLINE V5\n\n✅ Berhasil: ${success.length}\n❌ Gagal: ${failed.length}\n\n`;
    if (success.length) report += `✅ Berhasil:\n${success.join("\n")}\n\n`;
    if (failed.length) report += `❌ Gagal:\n${failed.join("\n")}`;

    while (report.length > 0) {
      const chunk = report.slice(0, 4000);
      report = report.slice(4000);
      await bot.sendMessage(chatId, chunk);
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memproses /purgesrv5.");
  }
});

// ========== COMMAND MAINTENANCE ON/OFF ==========
const { setMaintenance, isMaintenance } = require("./maintenance.js");

bot.onText(/^\/maintenance on$/, async (msg) => {
    const chatId = msg.chat.id;
    
    if (msg.from.id !== OWNER_ID) {
        return bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
    }
    
    if (isMaintenance()) {
        return bot.sendMessage(chatId, "⚠️ Maintenance mode sudah AKTIF!");
    }
    
    setMaintenance(true);
    bot.sendMessage(chatId, "🔧 *MAINTENANCE MODE AKTIF!*\n\nBot sedang dalam perawatan.\nSemua command (kecuali owner) akan ditolak.\n\nGunakan /maintenance off untuk menonaktifkan.", {
        parse_mode: "Markdown"
    });
});

bot.onText(/^\/maintenance off$/, async (msg) => {
    const chatId = msg.chat.id;
    
    if (msg.from.id !== OWNER_ID) {
        return bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
    }
    
    if (!isMaintenance()) {
        return bot.sendMessage(chatId, "⚠️ Maintenance mode sudah NONAKTIF!");
    }
    
    setMaintenance(false);
    bot.sendMessage(chatId, "✅ *MAINTENANCE MODE NONAKTIF!*\n\nBot kembali normal.\nSemua command sudah bisa digunakan kembali.", {
        parse_mode: "Markdown"
    });
});

// Cek status maintenance
bot.onText(/^\/maintenance$/, async (msg) => {
    const chatId = msg.chat.id;
    
    if (msg.from.id !== OWNER_ID) {
        return bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
    }
    
    const status = isMaintenance() ? "🔴 AKTIF" : "🟢 NONAKTIF";
    bot.sendMessage(chatId, `📋 *STATUS MAINTENANCE*\n\nStatus: ${status}\n\nGunakan:\n/maintenance on - Aktifkan\n/maintenance off - Nonaktifkan`, {
        parse_mode: "Markdown"
    });
});
    
// ==========================================
// BROADCAST: PV = FORWARD, GRUP = TEKS BIASA
// ==========================================
bot.onText(/^\/broadcast$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);

  // ========== 1. CEK AKSES (HANYA OWNER) ==========
  if (msg.from.id !== OWNER_ID) {
    bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
    return;
  }

  // ========== 2. CEK APAKAH REPLY KE PESAN ==========
  if (!msg.reply_to_message) {
    return bot.sendMessage(chatId, 
      "📢 CARA BROADCAST\n\n" +
      "1. Kirim pesan yang ingin di-broadcast\n" +
      "2. Reply pesan tersebut dengan /broadcast\n\n" +
      "Contoh:\n" +
      "Hallo semua!\n" +
      "↳ /broadcast (reply ke pesan Hallo semua)", 
      { reply_to_message_id: msg.message_id }
    );
  }

  // ========== 3. AMBIL PESAN YANG DI-REPLY ==========
  const text = msg.reply_to_message.text || msg.reply_to_message.caption;
  const originalMessageId = msg.reply_to_message.message_id;
  
  if (!text) {
    return bot.sendMessage(chatId, "❌ Pesan yang di-reply tidak memiliki teks!", {
      reply_to_message_id: msg.message_id
    });
  }

  // ========== 4. BUAT HEADER UNTUK GRUP ==========
  const ownerUsername = msg.from.username ? `@${msg.from.username}` : settings.dev;
  const groupHeader = `📢 BROADCAST DARI OWNER (${ownerUsername})\n\n`;

  // ========== 5. AUTO CREATE FOLDER & FILE ==========
  const USERS_FILE = './db/users/users.json';
  if (!fs.existsSync('./db/users')) fs.mkdirSync('./db/users', { recursive: true });
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
  }

  // ========== 6. LOAD DAFTAR USER ==========
  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    try {
      users = JSON.parse(fs.readFileSync(USERS_FILE));
    } catch (e) {
      users = [];
    }
  }

  if (users.length === 0) {
    return bot.sendMessage(chatId, "⚠️ Tidak ada user yang terdaftar di database.", {
      reply_to_message_id: msg.message_id
    });
  }

  // ========== 7. LOADING ==========
  const loadingMsg = await bot.sendMessage(chatId, 
    "📢 MEMPROSES BROADCAST...\n\n" +
    "👥 Total user: " + users.length,
    { reply_to_message_id: msg.message_id }
  );

  // ========== 8. KIRIM KE PV USER (FORWARD MESSAGE) ==========
  let success = 0;
  let failed = 0;
  let failedList = [];

  for (let i = 0; i < users.length; i++) {
    const targetId = users[i];
    try {
      // ✅ FORWARD ke PV user (ada tulisan "Diteruskan dari")
      await bot.forwardMessage(targetId, chatId, originalMessageId);
      success++;
    } catch (err) {
      failed++;
      failedList.push({ id: targetId, error: err.message?.substring(0, 50) || "Unknown error" });
    }

    if ((i + 1) % 10 === 0 || i === users.length - 1) {
      try {
        const progress = Math.floor(((i + 1) / users.length) * 100);
        await bot.editMessageText(
          "📢 MEMPROSES BROADCAST...\n\n" +
          "📊 Progress: " + progress + "% (" + (i + 1) + "/" + users.length + ")\n" +
          "✅ Berhasil: " + success + "\n" +
          "❌ Gagal: " + failed,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id
          }
        );
      } catch (e) {}
    }
  }

  // ========== 9. KIRIM KE GRUP (TEKS BIASA DENGAN HEADER) ==========
  let groupSuccess = 0;
  let groupFailed = 0;
  
  const groupList = [];
  
  if (settings.exGroupId && settings.exGroupId !== '-') {
    groupList.push({ id: settings.exGroupId, name: 'Grup Utama' });
  }
  if (settings.exPGroupId && settings.exPGroupId !== '-' && settings.exPGroupId !== settings.exGroupId) {
    groupList.push({ id: settings.exPGroupId, name: 'Grup Panel' });
  }
  
  for (const group of groupList) {
    try {
      // ✅ KIRIM TEKS BIASA KE GRUP (bukan forward)
      await bot.sendMessage(group.id, groupHeader + text);
      groupSuccess++;
    } catch (err) {
      groupFailed++;
      console.log("Gagal kirim ke grup " + group.name + ": " + err.message);
    }
  }

  // ========== 10. HAPUS LOADING ==========
  await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

  // ========== 11. LAPORAN ==========
  let report = 
    "✅ BROADCAST SELESAI!\n\n" +
    "📊 LAPORAN PENGIRIMAN\n" +
    "━━━━━━━━━━━━━━━━━━━━━\n" +
    "📱 FORWARD KE USER (PV):\n" +
    "👥 Total target user: " + users.length + "\n" +
    "✅ Berhasil: " + success + "\n" +
    "❌ Gagal: " + failed + "\n\n" +
    "📡 KIRIM KE GRUP:\n" +
    "🎯 Target grup: " + groupList.length + "\n" +
    "✅ Berhasil: " + groupSuccess + "\n" +
    "❌ Gagal: " + groupFailed + "\n" +
    "━━━━━━━━━━━━━━━━━━━━━";

  if (failedList.length > 0 && failedList.length <= 10) {
    report += "\n\n❌ GAGAL DIKIRIM KE USER:\n";
    for (const fail of failedList) {
      report += "• " + fail.id + "\n";
    }
  } else if (failedList.length > 10) {
    report += "\n\n❌ " + failedList.length + " user gagal dikirimi pesan.";
  }

  await bot.sendMessage(chatId, report, { 
    reply_to_message_id: msg.message_id 
  });

  // ========== 12. LAPORAN KE OWNER ==========
  let ownerReport = "📢 LAPORAN BROADCAST DETAIL\n\n" +
    "📱 USER (PV):\n" +
    "✅ Berhasil: " + success + "\n" +
    "❌ Gagal: " + failed + "\n\n" +
    "📡 GRUP:\n" +
    "✅ Berhasil: " + groupSuccess + "\n" +
    "❌ Gagal: " + groupFailed + "\n\n";
  
  if (failedList.length > 0) {
    ownerReport += "❌ DAFTAR USER GAGAL:\n";
    for (const fail of failedList.slice(0, 20)) {
      ownerReport += "• ID: " + fail.id + "\n  Error: " + fail.error + "\n\n";
    }
  }
  
  await bot.sendMessage(OWNER_ID, ownerReport);
});

// ========== CLEAR ALL ROLE V2, V3, V4, V5 (DENGAN LOADING) ==========
const versiClear = ['V2', 'V3', 'V4', 'V5'];

for (const ver of versiClear) {
    bot.onText(new RegExp(`^\/clearallrole${ver.toLowerCase()}$`), async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        if (String(userId) !== String(OWNER_ID)) {
            return bot.sendMessage(chatId, "❌ Khusus Owner!");
        }
        
        // ========== KIRIM LOADING ==========
        const loadingMsg = await bot.sendMessage(chatId, `⏳ <b>Memproses clear all role ${ver}...</b>\n\n📊 Mengumpulkan data user...`, { parse_mode: "HTML" });
        
        // Daftar role untuk versi ini
        const roles = [
            { name: "PREMIUM", file: `./db/users/version/premium${ver}.json` },
            { name: "RESELLER", file: `./db/users/version/reseller${ver}.json` },
            { name: "PARTNER", file: `./db/users/version/partner${ver}.json` },
            { name: "ADMIN PANEL", file: `./db/users/version/adp${ver}.json` },
            { name: "OWNER", file: `./db/users/version/owner${ver}.json` },
            { name: "TANGAN KANAN", file: `./db/users/version/tk${ver}.json` },
            { name: "CEO", file: `./db/users/version/ceo${ver}.json` },
            { name: "DEVELOPER", file: `./db/users/version/developer${ver}.json` },
            { name: "ASISTEN", file: `./db/users/version/asisten${ver}.json` },
            { name: "VIP MEMBER", file: `./db/users/version/vip${ver}.json` },
            { name: "KEPEMILIKAN", file: `./db/users/version/kepemilikan${ver}.json` },
            { name: "MANAGER VIP", file: `./db/users/version/managervip${ver}.json` },
            { name: "MANAGER SVIP", file: `./db/users/version/managersvip${ver}.json` }
        ];
        
        // Buat folder backup
        if (!fs.existsSync('./db/backup')) fs.mkdirSync('./db/backup', { recursive: true });
        
        // Update loading
        await bot.editMessageText(`⏳ <b>Memproses clear all role ${ver}...</b>\n\n📊 Mengumpulkan user yang terkena...`, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: "HTML"
        });
        
        // Kumpulkan semua user dengan role mereka (group by user ID)
        let userRolesMap = new Map();
        
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
        await bot.editMessageText(`⏳ <b>Memproses clear all role ${ver}...</b>\n\n📨 Mengirim notifikasi ke ${userRolesMap.size} user...`, {
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
            const roleListText = roleList.map(r => `• <b>${r} ${ver}</b>`).join('\n');
            
            // Update progress setiap 5 user
            if (current % 5 === 0 || current === total) {
                await bot.editMessageText(`⏳ <b>Memproses clear all role ${ver}...</b>\n\n📨 Mengirim notifikasi ke user ${current}/${total}...`, {
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
🔒 Role <b>${ver}</b> telah dinonaktifkan.

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
        await bot.editMessageText(`⏳ <b>Memproses clear all role ${ver}...</b>\n\n🗑️ Menghapus file role...`, {
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
                const backupFile = `./db/backup/${role.name.toLowerCase().replace(/ /g, '_')}${ver}_${Date.now()}.json`;
                fs.copyFileSync(role.file, backupFile);
                
                // Baca data, filter owner, lalu simpan
                let data = [];
                try {
                    data = JSON.parse(fs.readFileSync(role.file));
                    if (Array.isArray(data)) {
                        const filteredData = data.filter(id => String(id) === String(OWNER_ID));
                        fs.writeFileSync(role.file, JSON.stringify(filteredData, null, 2));
                        
                        if (filteredData.length !== data.length) {
                            cleared.push(`✅ ${role.name} ${ver} (${data.length - filteredData.length} user dihapus, owner dipertahankan)`);
                        } else {
                            cleared.push(`✅ ${role.name} ${ver} (tidak ada user yang dihapus)`);
                        }
                    } else {
                        fs.writeFileSync(role.file, JSON.stringify([], null, 2));
                        cleared.push(`✅ ${role.name} ${ver} (dikosongkan)`);
                    }
                } catch (e) {
                    fs.writeFileSync(role.file, JSON.stringify([], null, 2));
                    cleared.push(`✅ ${role.name} ${ver} (dikosongkan karena error)`);
                }
            } else {
                notFound.push(`⚠️ ${role.name} ${ver} (file tidak ditemukan)`);
            }
        }
        
        // Hapus loading message
        await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        
        // Kirim laporan ke owner
        let message = `🗑️ <b>CLEAR ALL ROLE ${ver} COMPLETE!</b>\n\n`;
        message += `📊 <b>Role processed:</b> ${cleared.length}\n`;
        message += `👥 <b>User terkena (bukan owner):</b> ${userRolesMap.size} user\n`;
        message += `📨 <b>Notifikasi terkirim:</b> ${notifiedCount} user\n`;
        message += `❌ <b>Gagal notifikasi:</b> ${failedNotify.length} user\n`;
        message += `👑 <b>Role owner dipertahankan!</b>\n\n`;
        
        if (failedNotify.length > 0 && failedNotify.length <= 10) {
            message += `<b>⚠️ Gagal dikirim ke:</b>\n`;
            for (const fail of failedNotify) {
                message += `   • <code>${fail.id}</code> (${fail.roles.join(', ')} ${ver})\n`;
            }
            message += `\n`;
        } else if (failedNotify.length > 10) {
            message += `<b>⚠️ ${failedNotify.length} user gagal dikirimi notifikasi.</b>\n\n`;
        }
        
        message += `📁 <b>Backup:</b> <code>./db/backup/</code>`;
        
        bot.sendMessage(chatId, message, { parse_mode: "HTML" });
    });
}

// command pairing wa
bot.onText(/\/reqpair(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
    if (!text) {
        bot.sendMessage(chatId, '❌ Format salah!\nContoh: /reqpair 628123456789');
        return;
    }
    
  const botNumber = match[1].replace(/[^0-9]/g, "");

  try {
    await connectToWhatsApp(botNumber, chatId);
  } catch (error) {
    console.error("Error in addbot:", error);
    bot.sendMessage(
      chatId,
      "Terjadi kesalahan saat menghubungkan ke WhatsApp. Silakan coba lagi."
    );
  }
});

// ========== DELETE SERVER V2 ==========
bot.onText(/\/delsrvv2 (.+)/, async (msg, match) => {
  notifyOwner('delsrvv2', msg);
  const chatId = msg.chat.id;
  
  // Cek akses owner
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  if (!ownerUsers.includes(String(msg.from.id))) {
    return bot.sendMessage(chatId, "❌ Khusus Owner!");
  }

  const srv = match[1].trim();
  if (!srv) {
    return bot.sendMessage(chatId, "Masukkan ID server, contoh: /delsrvv2 1234");
  }

  try {
    const f = await fetch(`${settings.domainV2}/api/application/servers/${srv}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.pltaV2}`,
      },
    });

    if (f.status === 204) {
      bot.sendMessage(chatId, `✅ Sukses delete server V2: ${srv}`);
    } else {
      bot.sendMessage(chatId, "❌ Server tidak ada");
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus server V2.");
  }
});

// ========== DELETE SERVER V3 ==========
bot.onText(/\/delsrvv3 (.+)/, async (msg, match) => {
  notifyOwner('delsrvv3', msg);
  const chatId = msg.chat.id;
  
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  if (!ownerUsers.includes(String(msg.from.id))) {
    return bot.sendMessage(chatId, "❌ Khusus Owner!");
  }

  const srv = match[1].trim();
  if (!srv) return bot.sendMessage(chatId, "Masukkan ID server, contoh: /delsrvv3 1234");

  try {
    const f = await fetch(`${settings.domainV3}/api/application/servers/${srv}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.pltaV3}`,
      },
    });

    if (f.status === 204) {
      bot.sendMessage(chatId, `✅ Sukses delete server V3: ${srv}`);
    } else {
      bot.sendMessage(chatId, "❌ Server tidak ada");
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus server V3.");
  }
});

// ========== DELETE SERVER V4 ==========
bot.onText(/\/delsrvv4 (.+)/, async (msg, match) => {
  notifyOwner('delsrvv4', msg);
  const chatId = msg.chat.id;
  
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  if (!ownerUsers.includes(String(msg.from.id))) {
    return bot.sendMessage(chatId, "❌ Khusus Owner!");
  }

  const srv = match[1].trim();
  if (!srv) return bot.sendMessage(chatId, "Masukkan ID server, contoh: /delsrvv4 1234");

  try {
    const f = await fetch(`${settings.domainV4}/api/application/servers/${srv}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.pltaV4}`,
      },
    });

    if (f.status === 204) {
      bot.sendMessage(chatId, `✅ Sukses delete server V4: ${srv}`);
    } else {
      bot.sendMessage(chatId, "❌ Server tidak ada");
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus server V4.");
  }
});

// ========== DELETE SERVER V5 ==========
bot.onText(/\/delsrvv5 (.+)/, async (msg, match) => {
  notifyOwner('delsrvv5', msg);
  const chatId = msg.chat.id;
  
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  if (!ownerUsers.includes(String(msg.from.id))) {
    return bot.sendMessage(chatId, "❌ Khusus Owner!");
  }

  const srv = match[1].trim();
  if (!srv) return bot.sendMessage(chatId, "Masukkan ID server, contoh: /delsrvv5 1234");

  try {
    const f = await fetch(`${settings.domainV5}/api/application/servers/${srv}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.pltaV5}`,
      },
    });

    if (f.status === 204) {
      bot.sendMessage(chatId, `✅ Sukses delete server V5: ${srv}`);
    } else {
      bot.sendMessage(chatId, "❌ Server tidak ada");
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus server V5.");
  }
});

// ========== DELETE ADMIN V2 ==========
bot.onText(/\/deladminv2(?:\s+(\d+))?/, async (msg, match) => {
  notifyOwner('deladminv2', msg);
  const chatId = msg.chat.id;
  const userId = match[1];

  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  if (!ownerUsers.includes(String(msg.from.id))) {
    return bot.sendMessage(chatId, "❌ Khusus Owner!");
  }

  if (!userId) {
    return bot.sendMessage(chatId, "❌ Format salah!\nContoh: /deladminv2 123456789");
  }

  try {
    const f = await fetch(`${settings.domainV2}/api/application/users/${userId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.pltaV2}`,
      },
    });

    if (f.status === 204) {
      bot.sendMessage(chatId, `✅ Sukses delete admin V2: ${userId}`);
    } else {
      bot.sendMessage(chatId, "❌ User tidak ada");
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus admin V2.");
  }
});

// ========== DELETE ADMIN V3 ==========
bot.onText(/\/deladminv3(?:\s+(\d+))?/, async (msg, match) => {
  notifyOwner('deladminv3', msg);
  const chatId = msg.chat.id;
  const userId = match[1];

  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  if (!ownerUsers.includes(String(msg.from.id))) {
    return bot.sendMessage(chatId, "❌ Khusus Owner!");
  }

  if (!userId) return bot.sendMessage(chatId, "❌ Format: /deladminv3 123456789");

  try {
    const f = await fetch(`${settings.domainV3}/api/application/users/${userId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.pltaV3}`,
      },
    });

    if (f.status === 204) {
      bot.sendMessage(chatId, `✅ Sukses delete admin V3: ${userId}`);
    } else {
      bot.sendMessage(chatId, "❌ User tidak ada");
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus admin V3.");
  }
});

// ========== DELETE ADMIN V4 ==========
bot.onText(/\/deladminv4(?:\s+(\d+))?/, async (msg, match) => {
  notifyOwner('deladminv4', msg);
  const chatId = msg.chat.id;
  const userId = match[1];

  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  if (!ownerUsers.includes(String(msg.from.id))) {
    return bot.sendMessage(chatId, "❌ Khusus Owner!");
  }

  if (!userId) return bot.sendMessage(chatId, "❌ Format: /deladminv4 123456789");

  try {
    const f = await fetch(`${settings.domainV4}/api/application/users/${userId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.pltaV4}`,
      },
    });

    if (f.status === 204) {
      bot.sendMessage(chatId, `✅ Sukses delete admin V4: ${userId}`);
    } else {
      bot.sendMessage(chatId, "❌ User tidak ada");
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus admin V4.");
  }
});

// ========== DELETE ADMIN V5 ==========
bot.onText(/\/deladminv5(?:\s+(\d+))?/, async (msg, match) => {
  notifyOwner('deladminv5', msg);
  const chatId = msg.chat.id;
  const userId = match[1];

  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  if (!ownerUsers.includes(String(msg.from.id))) {
    return bot.sendMessage(chatId, "❌ Khusus Owner!");
  }

  if (!userId) return bot.sendMessage(chatId, "❌ Format: /deladminv5 123456789");

  try {
    const f = await fetch(`${settings.domainV5}/api/application/users/${userId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.pltaV5}`,
      },
    });

    if (f.status === 204) {
      bot.sendMessage(chatId, `✅ Sukses delete admin V5: ${userId}`);
    } else {
      bot.sendMessage(chatId, "❌ User tidak ada");
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Terjadi kesalahan saat menghapus admin V5.");
  }
});

// ========== LIST SERVER OFFLINE V2 ==========
bot.onText(/\/listsrvoffv2/, async (msg) => {
  const chatId = msg.chat.id;
  
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  if (!ownerUsers.includes(String(msg.from.id))) {
    return bot.sendMessage(chatId, "❌ Khusus Owner!");
  }

  await bot.sendMessage(chatId, "⏳ Memuat data server offline V2...");

  try {
    let offlineServers = [];
    let page = 1;
    let totalPages = 1;

    do {
      const f = await fetch(`${settings.domainV2}/api/application/servers?page=${page}`, {
        headers: { Authorization: `Bearer ${settings.pltaV2}` }
      });
      const res = await f.json();
      totalPages = res.meta.pagination.total_pages;

      for (let server of res.data) {
        const s = server.attributes;
        try {
          const f3 = await fetch(`${settings.domainV2}/api/client/servers/${s.uuid.split("-")[0]}/resources`, {
            headers: { Authorization: `Bearer ${settings.pltcV2}` }
          });
          const data = await f3.json();
          const status = data.attributes?.current_state || s.status;
          
          if (status === "offline") {
            offlineServers.push(`ID: ${s.id}\nNama: ${s.name}\nStatus: ${status}\n`);
          }
        } catch (err) {}
      }
      page++;
    } while (page <= totalPages);

    if (offlineServers.length === 0) {
      return bot.sendMessage(chatId, "✅ Semua server V2 online.");
    }

    let message = `📋 Daftar Server Offline V2 (${offlineServers.length}):\n\n${offlineServers.join("\n")}`;
    while (message.length > 0) {
      bot.sendMessage(chatId, message.slice(0, 4000));
      message = message.slice(4000);
    }
  } catch (error) {
    bot.sendMessage(chatId, "⚠️ Error saat memproses listsrvoffv2.");
  }
});

// ========== LIST SERVER OFFLINE V3 ==========
bot.onText(/\/listsrvoffv3/, async (msg) => {
  const chatId = msg.chat.id;
  
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  if (!ownerUsers.includes(String(msg.from.id))) {
    return bot.sendMessage(chatId, "❌ Khusus Owner!");
  }

  await bot.sendMessage(chatId, "⏳ Memuat data server offline V3...");

  try {
    let offlineServers = [];
    let page = 1;
    let totalPages = 1;

    do {
      const f = await fetch(`${settings.domainV3}/api/application/servers?page=${page}`, {
        headers: { Authorization: `Bearer ${settings.pltaV3}` }
      });
      const res = await f.json();
      totalPages = res.meta.pagination.total_pages;

      for (let server of res.data) {
        const s = server.attributes;
        try {
          const f3 = await fetch(`${settings.domainV3}/api/client/servers/${s.uuid.split("-")[0]}/resources`, {
            headers: { Authorization: `Bearer ${settings.pltcV3}` }
          });
          const data = await f3.json();
          const status = data.attributes?.current_state || s.status;
          
          if (status === "offline") {
            offlineServers.push(`ID: ${s.id}\nNama: ${s.name}\nStatus: ${status}\n`);
          }
        } catch (err) {}
      }
      page++;
    } while (page <= totalPages);

    if (offlineServers.length === 0) {
      return bot.sendMessage(chatId, "✅ Semua server V3 online.");
    }

    let message = `📋 Daftar Server Offline V3 (${offlineServers.length}):\n\n${offlineServers.join("\n")}`;
    while (message.length > 0) {
      bot.sendMessage(chatId, message.slice(0, 4000));
      message = message.slice(4000);
    }
  } catch (error) {
    bot.sendMessage(chatId, "⚠️ Error saat memproses listsrvoffv3.");
  }
});

// ========== LIST SERVER OFFLINE V4 ==========
bot.onText(/\/listsrvoffv4/, async (msg) => {
  const chatId = msg.chat.id;
  
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  if (!ownerUsers.includes(String(msg.from.id))) {
    return bot.sendMessage(chatId, "❌ Khusus Owner!");
  }

  await bot.sendMessage(chatId, "⏳ Memuat data server offline V4...");

  try {
    let offlineServers = [];
    let page = 1;
    let totalPages = 1;

    do {
      const f = await fetch(`${settings.domainV4}/api/application/servers?page=${page}`, {
        headers: { Authorization: `Bearer ${settings.pltaV4}` }
      });
      const res = await f.json();
      totalPages = res.meta.pagination.total_pages;

      for (let server of res.data) {
        const s = server.attributes;
        try {
          const f3 = await fetch(`${settings.domainV4}/api/client/servers/${s.uuid.split("-")[0]}/resources`, {
            headers: { Authorization: `Bearer ${settings.pltcV4}` }
          });
          const data = await f3.json();
          const status = data.attributes?.current_state || s.status;
          
          if (status === "offline") {
            offlineServers.push(`ID: ${s.id}\nNama: ${s.name}\nStatus: ${status}\n`);
          }
        } catch (err) {}
      }
      page++;
    } while (page <= totalPages);

    if (offlineServers.length === 0) {
      return bot.sendMessage(chatId, "✅ Semua server V4 online.");
    }

    let message = `📋 Daftar Server Offline V4 (${offlineServers.length}):\n\n${offlineServers.join("\n")}`;
    while (message.length > 0) {
      bot.sendMessage(chatId, message.slice(0, 4000));
      message = message.slice(4000);
    }
  } catch (error) {
    bot.sendMessage(chatId, "⚠️ Error saat memproses listsrvoffv4.");
  }
});

// ========== LIST SERVER OFFLINE V5 ==========
bot.onText(/\/listsrvoffv5/, async (msg) => {
  const chatId = msg.chat.id;
  
  const ownerUsers = JSON.parse(fs.readFileSync(OWNER_FILE));
  if (!ownerUsers.includes(String(msg.from.id))) {
    return bot.sendMessage(chatId, "❌ Khusus Owner!");
  }

  await bot.sendMessage(chatId, "⏳ Memuat data server offline V5...");

  try {
    let offlineServers = [];
    let page = 1;
    let totalPages = 1;

    do {
      const f = await fetch(`${settings.domainV5}/api/application/servers?page=${page}`, {
        headers: { Authorization: `Bearer ${settings.pltaV5}` }
      });
      const res = await f.json();
      totalPages = res.meta.pagination.total_pages;

      for (let server of res.data) {
        const s = server.attributes;
        try {
          const f3 = await fetch(`${settings.domainV5}/api/client/servers/${s.uuid.split("-")[0]}/resources`, {
            headers: { Authorization: `Bearer ${settings.pltcV5}` }
          });
          const data = await f3.json();
          const status = data.attributes?.current_state || s.status;
          
          if (status === "offline") {
            offlineServers.push(`ID: ${s.id}\nNama: ${s.name}\nStatus: ${status}\n`);
          }
        } catch (err) {}
      }
      page++;
    } while (page <= totalPages);

    if (offlineServers.length === 0) {
      return bot.sendMessage(chatId, "✅ Semua server V5 online.");
    }

    let message = `📋 Daftar Server Offline V5 (${offlineServers.length}):\n\n${offlineServers.join("\n")}`;
    while (message.length > 0) {
      bot.sendMessage(chatId, message.slice(0, 4000));
      message = message.slice(4000);
    }
  } catch (error) {
    bot.sendMessage(chatId, "⚠️ Error saat memproses listsrvoffv5.");
  }
});

// command send message gb
bot.onText(/^\/sendmsg (.+)$/, async (msg, match) => {
  const chatId = msg.chat.id
  const replyTo = msg.reply_to_message
  const targetGroupId = match[1] // id group tujuan

  if (!replyTo) {
    return bot.sendMessage(chatId, "❌ Reply pesan yang diforward!")
  }

  try {
    await bot.forwardMessage(targetGroupId, chatId, replyTo.message_id)
    bot.sendMessage(chatId, `✅ Sukses diforward ke grup ${targetGroupId}`)
  } catch (err) {
    console.error(err)
    bot.sendMessage(chatId, "❌ Gagal forward pesan, cek lagi ID grupnya.")
  }
})

// command backup
let autoBackupInterval = null;

bot.onText(/\/backup/, (msg) => {
  const chatId = msg.chat.id;

  if (msg.from.id !== OWNER_ID) {
    return bot.sendMessage(
      chatId,
      `❌ Kamu bukan @${dev}!`,
      { parse_mode: "Markdown", reply_to_message_id: msg.message_id }
    );
  }

  const doBackup = () => {
    const backupFile = `NAERI_BACKUP.zip`;
    const output = fs.createWriteStream(backupFile);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      bot.sendDocument(chatId, backupFile).then(() => {
        fs.unlinkSync(backupFile);
      });
    });

    archive.on("error", (err) => {
      console.error(err);
      bot.sendMessage(chatId, "❌ Gagal membuat backup!");
    });

    archive.pipe(output);

    ["nael.js", "connect.js", "config.js", "start.js", "package.json"].forEach((file) => {
      if (fs.existsSync(file)) {
        archive.file(file, { name: path.basename(file) });
      }
    });

    ["menu", "lib", "db"].forEach((dir) => {
      if (fs.existsSync(dir)) {
        archive.directory(dir, dir);
      }
    });

    archive.finalize();
  };

  // langsung backup pertama kali
  doBackup();

  // clear interval lama kalau ada
  if (autoBackupInterval) clearInterval(autoBackupInterval);

  // auto backup tiap 30 menit
  autoBackupInterval = setInterval(doBackup, 30 * 60 * 1000);

  bot.sendMessage(chatId, "Auto-backup aktif setiap 30 menit.", { reply_to_message_id: msg.message_id });
});

// command setcd
bot.onText(/\/setcd (\d+[smh])/, (msg, match) => { 
    const chatId = msg.chat.id; 
    const response = setCooldown(match[1]);

    bot.sendMessage(chatId, response);
});

bot.onText(/^\/cekid$/, async (msg) => {
  notifyOwner('cekid', msg);
  const chatId = msg.chat.id;
  const user = msg.from;

  try {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const username = user.username ? `@${user.username}` : '-';
    const userId = user.id.toString();
    const today = new Date().toISOString().split('T')[0];
    const dcId = (user.id >> 32) % 256;

    let photoUrl = null;
    try {
      const photos = await bot.getUserProfilePhotos(user.id, { limit: 1 });
      if (photos.total_count > 0) {
        const fileId = photos.photos[0][0].file_id;
        const file = await bot.getFile(fileId);
        photoUrl = `https://api.telegram.org/file/bot${settings.token}/${file.file_path}`;
      }
    } catch (e) {
      console.log('Gagal ambil foto profil:', e.message);
    }

    const canvas = createCanvas(800, 450);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0a4f44');
    gradient.addColorStop(1, '#128C7E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.roundRect(40, 40, canvas.width - 80, canvas.height - 80, 20);
    ctx.fill();

    ctx.fillStyle = '#0a4f44';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ID CARD TELEGRAM', canvas.width / 2, 80);

    ctx.strokeStyle = '#0a4f44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 100);
    ctx.lineTo(canvas.width - 50, 100);
    ctx.stroke();

    if (photoUrl) {
      try {
        const response = await axios.get(photoUrl, { responseType: 'arraybuffer' });
        const avatar = await loadImage(response.data);
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(150, 220, 70, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        
        ctx.drawImage(avatar, 80, 150, 140, 140);
        ctx.restore();
        
        ctx.strokeStyle = '#0a4f44';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(150, 220, 70, 0, Math.PI * 2, true);
        ctx.stroke();
      } catch (e) {
        console.log('Gagal memuat gambar:', e.message);
        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.arc(150, 220, 70, 0, Math.PI * 2, true);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#ccc';
      ctx.beginPath();
      ctx.arc(150, 220, 70, 0, Math.PI * 2, true);
      ctx.fill();
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Informasi Pengguna:', 280, 150);
    
    ctx.font = '20px Arial';
    ctx.fillText(`Nama: ${fullName}`, 280, 190);
    ctx.fillText(`User ID: ${userId}`, 280, 220);
    ctx.fillText(`Username: ${username}`, 280, 250);
    ctx.fillText(`Tanggal: ${today}`, 280, 280);
    ctx.fillText(`DC ID: ${dcId}`, 280, 310);

    ctx.textAlign = 'center';
    ctx.font = 'italic 16px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText(`ID Card by Fizsz Bot - @${dev}`, canvas.width / 2, canvas.height - 50);

    const buffer = canvas.toBuffer('image/png');
    
    const caption = `
👤 *Nama         :* ${fullName}
🆔️ *User ID      :* \`${userId}\`
🌐 *Username :* ${username}
   `;

    await bot.sendPhoto(chatId, buffer, { 
        caption, 
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id,
        reply_markup: {
            inline_keyboard: [
      [{ text: "ᴍᴀɴꜱᴢʏxꜰɪꜱᴢꜱᴢ", url: `https://t.me/MANSZYYYxFISZ` }]
    ]
  }
});

  } catch (err) {
    console.error('Gagal generate ID card:', err.message);
    bot.sendMessage(chatId, '❌ Gagal generate ID card. Silakan coba lagi.');
  }
});

// command payment
bot.onText(/^\/pay/, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendPhoto(chatId, qris, {
  caption: `<blockquote>💳 <b>Metode Pembayaran Qris</b>

Silahkan scan QRIS di atas untuk melakukan pembayaran.

<b>💰 DANA Payment</b>
Nomor: <code>${settings.dana}</code> (salin)
a/n ${settings.namaDana}

Kirim bukti transfer dan hubungi owner atau pilih metode pembayaran Dana!
</blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💬 ᴄʜᴀᴛ ᴏᴡɴᴇʀ", url: `https://t.me/${dev}` }]
      ]
    }
  });
});

// command /restart
bot.onText(/^\/restart$/, async (msg) => {
  const chatId = msg.chat.id;

    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }

  const bars = [
    "⏳ ᴘʀᴏᴄᴇꜱꜱ [░░░░░░░░░░] 0%",
    "⏳ ᴘʀᴏᴄᴇꜱꜱ [█░░░░░░░░░] 10%",
    "⏳ ᴘʀᴏᴄᴇꜱꜱ [██░░░░░░░░] 20%",
    "⏳ ᴘʀᴏᴄᴇꜱꜱ [███░░░░░░░] 30%",
    "⏳ ᴘʀᴏᴄᴇꜱꜱ [████░░░░░░] 40%",
    "⏳ ᴘʀᴏᴄᴇꜱꜱ [█████░░░░░] 50%",
    "⏳ ᴘʀᴏᴄᴇꜱꜱ [██████░░░░] 60%",
    "⏳ ᴘʀᴏᴄᴇꜱꜱ [███████░░░] 70%",
    "⏳ ᴘʀᴏᴄᴇꜱꜱ [████████░░] 80%",
    "⏳  [█████████░] 90%",
    "✅ ʀᴇꜱᴛᴀʀᴛ ᴄᴏᴍᴘʟᴇᴛᴇ\n[██████████] 100%",
    "👋 ɢᴏᴏᴅ ʙʏᴇ..."
  ];

  try {
    let sent = await bot.sendMessage(chatId, bars[0]);

    for (let i = 1; i < bars.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      await bot.editMessageText(bars[i], {
        chat_id: chatId,
        message_id: sent.message_id
      });
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    process.exit(0);
  } catch (e) {
    console.error(e);
    bot.sendMessage(chatId, "❌ Gagal restart bot.");
  }
});

// command /ping
bot.onText(/\/ping/, async (msg) => {
  const chatId = msg.chat.id;
  
  // 1. Hitung Latency
  const start = Date.now();
  // Kirim pesan loading tanpa parse mode dulu atau pakai HTML sederhana
  const sentMsg = await bot.sendMessage(chatId, "⏳ <i>Checking system...</i>", { 
    parse_mode: "HTML",
    reply_to_message_id: msg.message_id 
  });
  const latency = Date.now() - start;

  try {
    // --- DATA VPS ---
    const vpsUptime = os.uptime();
    const vpsDays = Math.floor(vpsUptime / 86400);
    const vpsHours = Math.floor((vpsUptime % 86400) / 3600);
    const vpsMinutes = Math.floor((vpsUptime % 3600) / 60);
    
    // Format VPS Uptime yang Rapi (Tanpa angka 0 yang mengganggu)
    let vpsParts = [];
    if (vpsDays > 0) vpsParts.push(`${vpsDays} Hari`);
    if (vpsHours > 0) vpsParts.push(`${vpsHours} Jam`);
    // Tampilkan menit hanya jika hari & jam 0, atau jika ingin selalu tampil hapus kondisi && vpsDays === 0
    if (vpsParts.length === 0 || vpsMinutes > 0) vpsParts.push(`${vpsMinutes} Menit`);
    
    const vpsUptimeStr = vpsParts.join(' ') || 'Baru mulai';
    
    const cpuInfo = os.cpus()[0];
    const cpuModel = cpuInfo.model.split('@')[0].trim(); // Ambil nama CPU saja
    const cpuCores = os.cpus().length;
    
    const totalRamGB = (os.totalmem() / (1024 ** 3)).toFixed(2);
    
    // --- DATA BOT ---
    const botUptime = process.uptime();
    const botDays = Math.floor(botUptime / 86400);
    const botHours = Math.floor((botUptime % 86400) / 3600);
    const botMinutes = Math.floor((botUptime % 3600) / 60);
    
    // Format Bot Uptime
    let botParts = [];
    if (botDays > 0) botParts.push(`${botDays} Hari`);
    if (botHours > 0) botParts.push(`${botHours} Jam`);
    if (botParts.length === 0 || botMinutes > 0) botParts.push(`${botMinutes} Menit`);
    
    const botUptimeStr = botParts.join(' ') || 'Baru mulai';

    // 2. Format Pesan HTML
    // Menggunakan \n untuk baris baru yang rapi
    const text = 
      `<b>📊 SYSTEM INFORMATION</b>\n\n` +
      `<b>🖥️ VPS Uptime:</b> ${vpsUptimeStr}\n` +
      `<b>⚙️ CPU Model:</b> ${cpuModel}\n` +
      `<b>🧠 CPU Cores:</b> ${cpuCores} Core\n` +
      `<b>💾 Total RAM:</b> ${totalRamGB} GB\n\n` +
      `<b>🤖 Bot Runtime:</b> ${botUptimeStr}\n` +
      `<b>📡 Latency:</b> ${latency} ms`;

    // 3. Kirim Hasil
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: sentMsg.message_id,
      parse_mode: "HTML" // Penting agar tag <b> bekerja
    });

  } catch (err) {
    console.error(err);
    await bot.editMessageText("❌ <b>Error:</b> Gagal mengambil data sistem.", {
      chat_id: chatId,
      message_id: sentMsg.message_id,
      parse_mode: "HTML"
    });
  }
});

// ========== FUNGSI RELOAD CONFIG TANPA RESTART ==========
function reloadConfig() {
    delete require.cache[require.resolve("./config.js")];
    const newConfig = require("./config.js");
    
    // Update semua variabel global yang dipakai bot
    settings.domain = newConfig.domain;
    settings.plta = newConfig.plta;
    settings.pltc = newConfig.pltc;
    settings.domainV2 = newConfig.domainV2;
    settings.pltaV2 = newConfig.pltaV2;
    settings.pltcV2 = newConfig.pltcV2;
    settings.domainV3 = newConfig.domainV3;
    settings.pltaV3 = newConfig.pltaV3;
    settings.pltcV3 = newConfig.pltcV3;
    settings.domainV4 = newConfig.domainV4;
    settings.pltaV4 = newConfig.pltaV4;
    settings.pltcV4 = newConfig.pltcV4;
    settings.domainV5 = newConfig.domainV5;
    settings.pltaV5 = newConfig.pltaV5;
    settings.pltcV5 = newConfig.pltcV5;
    
    console.log("✅ Config reloaded without restart!");
    return newConfig;
}

// ========== COMMAND /SETURL (GANTI DOMAIN V1) ==========
bot.onText(/^\/seturl(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const newUrl = match?.[1]?.trim();
    
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    if (!newUrl) {
        return bot.sendMessage(chatId, "❌ Format: /seturl domain.com");
    }
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(domain:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newUrl}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ Domain V1 berhasil diganti ke:\n${newUrl}\n\n✅ Langsung berlaku, tidak perlu restart!`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'domain' tidak ditemukan!");
    }
});

// ========== COMMAND /SETURLV2 (GANTI DOMAIN V2) ==========
bot.onText(/^\/seturlv2(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const newUrl = match?.[1]?.trim();
    if (!newUrl) return bot.sendMessage(chatId, "❌ Format: /seturlv2 domain.com");
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(domainV2:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newUrl}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ Domain V2 berhasil diganti ke:\n${newUrl}`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'domainV2' tidak ditemukan di config.js!");
    }
});

// ========== COMMAND /SETURLV3 (GANTI DOMAIN V3) ==========
bot.onText(/^\/seturlv3(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const newUrl = match?.[1]?.trim();
    if (!newUrl) return bot.sendMessage(chatId, "❌ Format: /seturlv3 domain.com");
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(domainV3:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newUrl}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ Domain V3 berhasil diganti ke:\n${newUrl}`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'domainV3' tidak ditemukan di config.js!");
    }
});

// ========== COMMAND /SETURLV4 (GANTI DOMAIN V4) ==========
bot.onText(/^\/seturlv4(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const newUrl = match?.[1]?.trim();
    if (!newUrl) return bot.sendMessage(chatId, "❌ Format: /seturlv4 domain.com");
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(domainV4:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newUrl}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ Domain V4 berhasil diganti ke:\n${newUrl}`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'domainV4' tidak ditemukan di config.js!");
    }
});

// ========== COMMAND /SETURLV5 (GANTI DOMAIN V5) ==========
bot.onText(/^\/seturlv5(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const newUrl = match?.[1]?.trim();
    if (!newUrl) return bot.sendMessage(chatId, "❌ Format: /seturlv5 domain.com");
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(domainV5:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newUrl}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ Domain V5 berhasil diganti ke:\n${newUrl}`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'domainV5' tidak ditemukan di config.js!");
    }
});

// ========== COMMAND /SETPLTA (GANTI PLTA V1) ==========
bot.onText(/^\/setplta(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const newPlta = match?.[1]?.trim();
    if (!newPlta) return bot.sendMessage(chatId, "❌ Format: /setplta ptla_xxxxx");
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(plta:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newPlta}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ PLTA V1 berhasil diganti!`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'plta' tidak ditemukan!");
    }
});

// ========== COMMAND /SETPLTAV2 (GANTI PLTA V2) ==========
bot.onText(/^\/setpltav2(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const newPlta = match?.[1]?.trim();
    if (!newPlta) return bot.sendMessage(chatId, "❌ Format: /setpltav2 ptla_xxxxx");
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(pltaV2:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newPlta}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ PLTA V2 berhasil diganti!`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'pltaV2' tidak ditemukan di config.js!");
    }
});

// ========== COMMAND /SETPLTAV3 (GANTI PLTA V3) ==========
bot.onText(/^\/setpltav3(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const newPlta = match?.[1]?.trim();
    if (!newPlta) return bot.sendMessage(chatId, "❌ Format: /setpltav3 ptla_xxxxx");
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(pltaV3:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newPlta}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ PLTA V3 berhasil diganti!`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'pltaV3' tidak ditemukan di config.js!");
    }
});

// ========== COMMAND /SETPLTAV4 (GANTI PLTA V4) ==========
bot.onText(/^\/setpltav4(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const newPlta = match?.[1]?.trim();
    if (!newPlta) return bot.sendMessage(chatId, "❌ Format: /setpltav4 ptla_xxxxx");
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(pltaV4:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newPlta}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ PLTA V4 berhasil diganti!`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'pltaV4' tidak ditemukan di config.js!");
    }
});

// ========== COMMAND /SETPLTAV5 (GANTI PLTA V5) ==========
bot.onText(/^\/setpltav5(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const newPlta = match?.[1]?.trim();
    if (!newPlta) return bot.sendMessage(chatId, "❌ Format: /setpltav5 ptla_xxxxx");
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(pltaV5:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newPlta}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ PLTA V5 berhasil diganti!`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'pltaV5' tidak ditemukan di config.js!");
    }
});

// ========== COMMAND /SETPLTC (GANTI PLTC V1) ==========
bot.onText(/^\/setpltc(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const newPltc = match?.[1]?.trim();
    if (!newPltc) return bot.sendMessage(chatId, "❌ Format: /setpltc ptlc_xxxxx");
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(pltc:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newPltc}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ PLTC V1 berhasil diganti!`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'pltc' tidak ditemukan!");
    }
});

// ========== COMMAND /SETPLTCV2 (GANTI PLTC V2) ==========
bot.onText(/^\/setpltcv2(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const newPltc = match?.[1]?.trim();
    if (!newPltc) return bot.sendMessage(chatId, "❌ Format: /setpltcv2 ptlc_xxxxx");
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(pltcV2:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newPltc}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ PLTC V2 berhasil diganti!`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'pltcV2' tidak ditemukan di config.js!");
    }
});

// ========== COMMAND /SETPLTCV3 (GANTI PLTC V3) ==========
bot.onText(/^\/setpltcv3(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const newPltc = match?.[1]?.trim();
    if (!newPltc) return bot.sendMessage(chatId, "❌ Format: /setpltcv3 ptlc_xxxxx");
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(pltcV3:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newPltc}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ PLTC V3 berhasil diganti!`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'pltcV3' tidak ditemukan di config.js!");
    }
});

// ========== COMMAND /SETPLTCV4 (GANTI PLTC V4) ==========
bot.onText(/^\/setpltcv4(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const newPltc = match?.[1]?.trim();
    if (!newPltc) return bot.sendMessage(chatId, "❌ Format: /setpltcv4 ptlc_xxxxx");
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(pltcV4:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newPltc}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ PLTC V4 berhasil diganti!`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'pltcV4' tidak ditemukan di config.js!");
    }
});

// ========== COMMAND /SETPLTCV5 (GANTI PLTC V5) ==========
bot.onText(/^\/setpltcv5(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const newPltc = match?.[1]?.trim();
    if (!newPltc) return bot.sendMessage(chatId, "❌ Format: /setpltcv5 ptlc_xxxxx");
    
    let configFile = fs.readFileSync("./config.js", "utf8");
    const regex = /(pltcV5:\s*["'])(.*?)(["'])/g;
    
    if (regex.test(configFile)) {
        configFile = configFile.replace(regex, `$1${newPltc}$3`);
        fs.writeFileSync("./config.js", configFile);
        reloadConfig();
        bot.sendMessage(chatId, `✅ PLTC V5 berhasil diganti!`);
    } else {
        bot.sendMessage(chatId, "❌ Key 'pltcV5' tidak ditemukan di config.js!");
    }
});

// ========== COMMAND /RELOADCONFIG (RELOAD MANUAL) ==========
bot.onText(/^\/reloadconfig$/, async (msg) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    try {
        reloadConfig();
        bot.sendMessage(chatId, `✅ Config berhasil direload!\n\n📋 Current Settings:\n🔗 Domain V1: ${settings.domain}\n🔗 Domain V2: ${settings.domainV2}\n🔗 Domain V3: ${settings.domainV3}\n🔗 Domain V4: ${settings.domainV4}\n🔗 Domain V5: ${settings.domainV5}`);
    } catch (err) {
        bot.sendMessage(chatId, `❌ Gagal reload config: ${err.message}`);
    }
});

// ========== COMMAND /CFG (LIAT SETTINGAN LENGKAP) ==========
bot.onText(/^\/cfg$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Hanya owner yang bisa lihat config lengkap
    if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
    
    const info = `
📋 *CONFIGURATION SETTINGS*
━━━━━━━━━━━━━━━━━━━━━

*VERSION 1*
🌐 Domain: ${settings.domain || '❌ belum set'}
🔑 PLTA: ${settings.plta ? settings.plta.substring(0, 15) + '...' : '❌ belum set'}
🔐 PLTC: ${settings.pltc ? settings.pltc.substring(0, 15) + '...' : '❌ belum set'}

*VERSION 2*
🌐 Domain: ${settings.domainV2 || '❌ belum set'}
🔑 PLTA: ${settings.pltaV2 ? settings.pltaV2.substring(0, 15) + '...' : '❌ belum set'}
🔐 PLTC: ${settings.pltcV2 ? settings.pltcV2.substring(0, 15) + '...' : '❌ belum set'}

*VERSION 3*
🌐 Domain: ${settings.domainV3 || '❌ belum set'}
🔑 PLTA: ${settings.pltaV3 ? settings.pltaV3.substring(0, 15) + '...' : '❌ belum set'}
🔐 PLTC: ${settings.pltcV3 ? settings.pltcV3.substring(0, 15) + '...' : '❌ belum set'}

*VERSION 4*
🌐 Domain: ${settings.domainV4 || '❌ belum set'}
🔑 PLTA: ${settings.pltaV4 ? settings.pltaV4.substring(0, 15) + '...' : '❌ belum set'}
🔐 PLTC: ${settings.pltcV4 ? settings.pltcV4.substring(0, 15) + '...' : '❌ belum set'}

*VERSION 5*
🌐 Domain: ${settings.domainV5 || '❌ belum set'}
🔑 PLTA: ${settings.pltaV5 ? settings.pltaV5.substring(0, 15) + '...' : '❌ belum set'}
🔐 PLTC: ${settings.pltcV5 ? settings.pltcV5.substring(0, 15) + '...' : '❌ belum set'}

━━━━━━━━━━━━━━━━━━━━━
💡 *Tips:*
• Gunakan /seturl, /setplta, /setpltc untuk mengubah
• Gunakan /reloadconfig setelah edit manual config.js
`;
    
    bot.sendMessage(chatId, info, { parse_mode: 'Markdown' });
});

// ========== COMMAND SET LOC V1 ==========
bot.onText(/^\/setlocv1(?:\s+(\d+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
  
  const newLoc = match?.[1]?.trim();
  if (!newLoc) return bot.sendMessage(chatId, "❌ Format: /setlocv1 1");
  
  let configFile = fs.readFileSync("./config.js", "utf8");
  const regex = /(locV1:\s*['"])(.*?)(['"])/g;
  
  if (regex.test(configFile)) {
    configFile = configFile.replace(regex, `$1${newLoc}$3`);
    fs.writeFileSync("./config.js", configFile);
    reloadConfig();
    bot.sendMessage(chatId, `✅ Location V1 berhasil diganti ke: ${newLoc}`);
  } else {
    bot.sendMessage(chatId, "❌ Key 'locV1' tidak ditemukan di config.js!");
  }
});

// ========== COMMAND SET EGG V1 ==========
bot.onText(/^\/seteggsv1(?:\s+(\d+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
  
  const newEgg = match?.[1]?.trim();
  if (!newEgg) return bot.sendMessage(chatId, "❌ Format: /seteggsv1 15");
  
  let configFile = fs.readFileSync("./config.js", "utf8");
  const regex = /(eggsV1:\s*['"])(.*?)(['"])/g;
  
  if (regex.test(configFile)) {
    configFile = configFile.replace(regex, `$1${newEgg}$3`);
    fs.writeFileSync("./config.js", configFile);
    reloadConfig();
    bot.sendMessage(chatId, `✅ Eggs V1 berhasil diganti ke: ${newEgg}`);
  } else {
    bot.sendMessage(chatId, "❌ Key 'eggsV1' tidak ditemukan di config.js!");
  }
});

// ========== COMMAND SET LOC V2 ==========
bot.onText(/^\/setlocv2(?:\s+(\d+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
  
  const newLoc = match?.[1]?.trim();
  if (!newLoc) return bot.sendMessage(chatId, "❌ Format: /setlocv2 1");
  
  let configFile = fs.readFileSync("./config.js", "utf8");
  const regex = /(locV2:\s*['"])(.*?)(['"])/g;
  
  if (regex.test(configFile)) {
    configFile = configFile.replace(regex, `$1${newLoc}$3`);
    fs.writeFileSync("./config.js", configFile);
    reloadConfig();
    bot.sendMessage(chatId, `✅ Location V2 berhasil diganti ke: ${newLoc}`);
  } else {
    bot.sendMessage(chatId, "❌ Key 'locV2' tidak ditemukan di config.js!");
  }
});

// ========== COMMAND SET EGG V2 ==========
bot.onText(/^\/seteggsv2(?:\s+(\d+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
  
  const newEgg = match?.[1]?.trim();
  if (!newEgg) return bot.sendMessage(chatId, "❌ Format: /seteggsv2 15");
  
  let configFile = fs.readFileSync("./config.js", "utf8");
  const regex = /(eggsV2:\s*['"])(.*?)(['"])/g;
  
  if (regex.test(configFile)) {
    configFile = configFile.replace(regex, `$1${newEgg}$3`);
    fs.writeFileSync("./config.js", configFile);
    reloadConfig();
    bot.sendMessage(chatId, `✅ Eggs V2 berhasil diganti ke: ${newEgg}`);
  } else {
    bot.sendMessage(chatId, "❌ Key 'eggsV2' tidak ditemukan di config.js!");
  }
});

// ========== COMMAND SET LOC V3 ==========
bot.onText(/^\/setlocv3(?:\s+(\d+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
  
  const newLoc = match?.[1]?.trim();
  if (!newLoc) return bot.sendMessage(chatId, "❌ Format: /setlocv3 1");
  
  let configFile = fs.readFileSync("./config.js", "utf8");
  const regex = /(locV3:\s*['"])(.*?)(['"])/g;
  
  if (regex.test(configFile)) {
    configFile = configFile.replace(regex, `$1${newLoc}$3`);
    fs.writeFileSync("./config.js", configFile);
    reloadConfig();
    bot.sendMessage(chatId, `✅ Location V3 berhasil diganti ke: ${newLoc}`);
  } else {
    bot.sendMessage(chatId, "❌ Key 'locV3' tidak ditemukan di config.js!");
  }
});

// ========== COMMAND SET EGG V3 ==========
bot.onText(/^\/seteggsv3(?:\s+(\d+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
  
  const newEgg = match?.[1]?.trim();
  if (!newEgg) return bot.sendMessage(chatId, "❌ Format: /seteggsv3 15");
  
  let configFile = fs.readFileSync("./config.js", "utf8");
  const regex = /(eggsV3:\s*['"])(.*?)(['"])/g;
  
  if (regex.test(configFile)) {
    configFile = configFile.replace(regex, `$1${newEgg}$3`);
    fs.writeFileSync("./config.js", configFile);
    reloadConfig();
    bot.sendMessage(chatId, `✅ Eggs V3 berhasil diganti ke: ${newEgg}`);
  } else {
    bot.sendMessage(chatId, "❌ Key 'eggsV3' tidak ditemukan di config.js!");
  }
});

// ========== COMMAND SET LOC V4 ==========
bot.onText(/^\/setlocv4(?:\s+(\d+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
  
  const newLoc = match?.[1]?.trim();
  if (!newLoc) return bot.sendMessage(chatId, "❌ Format: /setlocv4 1");
  
  let configFile = fs.readFileSync("./config.js", "utf8");
  const regex = /(locV4:\s*['"])(.*?)(['"])/g;
  
  if (regex.test(configFile)) {
    configFile = configFile.replace(regex, `$1${newLoc}$3`);
    fs.writeFileSync("./config.js", configFile);
    reloadConfig();
    bot.sendMessage(chatId, `✅ Location V4 berhasil diganti ke: ${newLoc}`);
  } else {
    bot.sendMessage(chatId, "❌ Key 'locV4' tidak ditemukan di config.js!");
  }
});

// ========== COMMAND SET EGG V4 ==========
bot.onText(/^\/seteggsv4(?:\s+(\d+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
  
  const newEgg = match?.[1]?.trim();
  if (!newEgg) return bot.sendMessage(chatId, "❌ Format: /seteggsv4 15");
  
  let configFile = fs.readFileSync("./config.js", "utf8");
  const regex = /(eggsV4:\s*['"])(.*?)(['"])/g;
  
  if (regex.test(configFile)) {
    configFile = configFile.replace(regex, `$1${newEgg}$3`);
    fs.writeFileSync("./config.js", configFile);
    reloadConfig();
    bot.sendMessage(chatId, `✅ Eggs V4 berhasil diganti ke: ${newEgg}`);
  } else {
    bot.sendMessage(chatId, "❌ Key 'eggsV4' tidak ditemukan di config.js!");
  }
});

// ========== COMMAND SET LOC V5 ==========
bot.onText(/^\/setlocv5(?:\s+(\d+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
  
  const newLoc = match?.[1]?.trim();
  if (!newLoc) return bot.sendMessage(chatId, "❌ Format: /setlocv5 1");
  
  let configFile = fs.readFileSync("./config.js", "utf8");
  const regex = /(locV5:\s*['"])(.*?)(['"])/g;
  
  if (regex.test(configFile)) {
    configFile = configFile.replace(regex, `$1${newLoc}$3`);
    fs.writeFileSync("./config.js", configFile);
    reloadConfig();
    bot.sendMessage(chatId, `✅ Location V5 berhasil diganti ke: ${newLoc}`);
  } else {
    bot.sendMessage(chatId, "❌ Key 'locV5' tidak ditemukan di config.js!");
  }
});

// ========== COMMAND SET EGG V5 ==========
bot.onText(/^\/seteggsv5(?:\s+(\d+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (msg.from.id !== OWNER_ID) {
        bot.sendMessage(chatId, `❌ Kamu bukan ${settings.dev}`);
        return;
    }
  
  const newEgg = match?.[1]?.trim();
  if (!newEgg) return bot.sendMessage(chatId, "❌ Format: /seteggsv5 15");
  
  let configFile = fs.readFileSync("./config.js", "utf8");
  const regex = /(eggsV5:\s*['"])(.*?)(['"])/g;
  
  if (regex.test(configFile)) {
    configFile = configFile.replace(regex, `$1${newEgg}$3`);
    fs.writeFileSync("./config.js", configFile);
    reloadConfig();
    bot.sendMessage(chatId, `✅ Eggs V5 berhasil diganti ke: ${newEgg}`);
  } else {
    bot.sendMessage(chatId, "❌ Key 'eggsV5' tidak ditemukan di config.js!");
  }
});

// Handle error
/*bot.on('error', (error) => {
  console.error('⚠️ ', error);
});

bot.on("polling_error", (err) => {
  console.error("⚠ ", err.code, err.response?.statusCode || "");
});

bot.on("polling_error", (err) => {
    if (err.code === "ETELEGRAM" && err.response?.statusCode === 409) {
      console.error("❌ Instance lain jalan. Auto-exit...");
      process.exit(1);
    }
});

process.on("unhandledRejection", (reason, promise) => {
  console.log("⚠ ", String(reason).slice(0, 200) + "...");
});

process.on("uncaughtException", (err) => {
  console.log("⚠ ", String(err).slice(0, 200) + "...");
});*/
}

cekToken().then(() => {
    setTimeout(() => {
        initializeBot().catch(err => {
            console.log('System initialization error:', err.message);
            process.exit(1);
        });
    }, 1000);
});
