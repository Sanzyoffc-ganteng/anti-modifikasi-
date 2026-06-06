const fs = require('fs');
const { loadJsonData, saveJsonData } = require('../lib/function');
const settings = require('../config.js');

const OWNER_ID = settings.ownerId;

// ========== FILE DATABASE ==========
const DB_FILES = {
    managersvip: './db/users/managersvip.json',
    managervip: './db/users/managervip.json',
    kepemilikan: './db/users/kepemilikan.json',
    ceo: './db/users/ceo.json',
    dev: './db/users/developer.json',
    asisten: './db/users/asisten.json',
    adp: './db/users/adp.json',
    tk: './db/users/tk.json',
    pt: './db/users/pt.json',
    vip: './db/users/vip.json',
    owner: './db/users/ownerID.json',
    reseller: './db/users/resellerUsers.json',
    premium: './db/users/premiumUsers.json',
    // kompatibilitas lama
    master: './db/users/managersvip.json',
    supreme: './db/users/managervip.json',
    coowner: './db/users/kepemilikan.json'
};

// ========== LEVEL ROLE (Dari Bawah ke Atas) ==========
const ROLE_LEVEL = {
    managersvip: 13,
    managervip: 12,
    kepemilikan: 11,
    vip: 10,
    asisten: 9,
    dev: 8,
    ceo: 7,
    tk: 6,
    owner: 5,
    adp: 4,
    pt: 3,
    reseller: 2,
    premium: 1,
    user: 0
};

const ROLE_NAME = {
    managersvip: 'MANAGER SVIP',
    managervip: 'MANAGER VIP',
    kepemilikan: 'KEPEMILIKAN',
    vip: 'VIP MEMBER',
    asisten: 'ASISTEN',
    dev: 'DEVELOPER',
    ceo: 'CEO',
    tk: 'TANGAN KANAN',
    owner: 'OWNER',
    adp: 'ADMIN PANEL',
    pt: 'PARTNER',
    reseller: 'RESELLER',
    premium: 'PREMIUM',
    user: 'USER'
};

// ========== FUNGSI GET USER LEVEL ==========
function getUserLevel(userId) {
    userId = userId.toString();
    if (loadJsonData(DB_FILES.managersvip).includes(userId)) return 13;
    if (loadJsonData(DB_FILES.managervip).includes(userId)) return 12;
    if (loadJsonData(DB_FILES.kepemilikan).includes(userId)) return 11;
    if (loadJsonData(DB_FILES.vip).includes(userId)) return 10;
    if (loadJsonData(DB_FILES.asisten).includes(userId)) return 9;
    if (loadJsonData(DB_FILES.dev).includes(userId)) return 8;
    if (loadJsonData(DB_FILES.ceo).includes(userId)) return 7;
    if (loadJsonData(DB_FILES.tk).includes(userId)) return 6;
    if (loadJsonData(DB_FILES.owner).includes(userId)) return 5;
    if (loadJsonData(DB_FILES.adp).includes(userId)) return 4;
    if (loadJsonData(DB_FILES.pt).includes(userId)) return 3;
    if (loadJsonData(DB_FILES.reseller).includes(userId)) return 2;
    if (loadJsonData(DB_FILES.premium).includes(userId)) return 1;
    return 0;
}

function getUserRole(userId) {
    const level = getUserLevel(userId);
    for (const [role, lvl] of Object.entries(ROLE_LEVEL)) {
        if (lvl === level) return ROLE_NAME[role];
    }
    return ROLE_NAME.user;
}

// ========== CEK AUTHORIZATION ==========
function isAuthorized(userId, requiredLevel) {
    return getUserLevel(userId) >= requiredLevel;
}

// ========== FUNGSI ADD/DEL GENERIK ==========
function addRole(userId, roleKey) {
    const data = loadJsonData(DB_FILES[roleKey]);
    if (!data.includes(userId)) {
        data.push(userId);
        saveJsonData(DB_FILES[roleKey], data);
        return true;
    }
    return false;
}

function removeRole(userId, roleKey) {
    let data = loadJsonData(DB_FILES[roleKey]);
    if (data.includes(userId)) {
        data = data.filter(id => id !== userId);
        saveJsonData(DB_FILES[roleKey], data);
        return true;
    }
    return false;
}

// ========== CREATE ROLE COMMANDS ==========
function createRoleCommands(bot, roleKey, requiredLevel, requiredRoleName) {
    const addCmd = `/add${roleKey}`;
    const delCmd = `/del${roleKey}`;
    const listCmd = `/list${roleKey}`;
    const targetRoleLevel = ROLE_LEVEL[roleKey];
    
    // Command ADD
    bot.onText(new RegExp(`^${addCmd}(?:\\s+(\\d+))?$`), (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const adminLevel = getUserLevel(userId);
        
        if (!isAuthorized(userId, requiredLevel)) {
            return bot.sendMessage(chatId, `❌ Khusus ${requiredRoleName} ke atas!`);
        }
        
        let targetUserId;
        if (match && match[1]) targetUserId = match[1];
        else if (msg.reply_to_message) targetUserId = msg.reply_to_message.from.id.toString();
        else return bot.sendMessage(chatId, `❌ Reply ke pesan user atau masukkan ID!\nContoh: ${addCmd} 123456789`);
        
        if (adminLevel === 13) {
            if (addRole(targetUserId, roleKey)) {
                bot.sendMessage(chatId, `✅ User ID ${targetUserId} berhasil ditambahkan sebagai ${ROLE_NAME[roleKey]}!`);
            } else {
                bot.sendMessage(chatId, `⚠️ User ID ${targetUserId} sudah menjadi ${ROLE_NAME[roleKey]}!`);
            }
            return;
        }
        
        if (String(userId) === String(targetUserId)) {
            return bot.sendMessage(chatId, `❌ Anda tidak bisa menambahkan role ke diri sendiri!`);
        }
        if (targetRoleLevel >= adminLevel) {
            return bot.sendMessage(chatId, `❌ Anda tidak bisa menambahkan role yang levelnya lebih tinggi atau sama dengan level Anda!`);
        }
        
        if (addRole(targetUserId, roleKey)) {
            bot.sendMessage(chatId, `✅ User ID ${targetUserId} berhasil ditambahkan sebagai ${ROLE_NAME[roleKey]}!`);
        } else {
            bot.sendMessage(chatId, `⚠️ User ID ${targetUserId} sudah menjadi ${ROLE_NAME[roleKey]}!`);
        }
    });
    
    // Command DELETE
    bot.onText(new RegExp(`^${delCmd}(?:\\s+(\\d+))?$`), (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const adminLevel = getUserLevel(userId);
        
        if (!isAuthorized(userId, requiredLevel)) {
            return bot.sendMessage(chatId, `❌ Khusus ${requiredRoleName} ke atas!`);
        }
        
        let targetUserId;
        if (match && match[1]) targetUserId = match[1];
        else if (msg.reply_to_message) targetUserId = msg.reply_to_message.from.id.toString();
        else return bot.sendMessage(chatId, `❌ Reply ke pesan user atau masukkan ID!\nContoh: ${delCmd} 123456789`);
        
        if (adminLevel === 13) {
            if (removeRole(targetUserId, roleKey)) {
                bot.sendMessage(chatId, `✅ User ID ${targetUserId} berhasil dihapus dari ${ROLE_NAME[roleKey]}!`);
            } else {
                bot.sendMessage(chatId, `⚠️ User ID ${targetUserId} bukan ${ROLE_NAME[roleKey]}!`);
            }
            return;
        }
        
        if (String(userId) === String(targetUserId)) {
            return bot.sendMessage(chatId, `❌ Anda tidak bisa menghapus role dari diri sendiri!`);
        }
        // ✅ PERBAIKAN: Tambahkan validasi level agar tidak bisa hapus role yang lebih tinggi
        if (targetRoleLevel >= adminLevel) {
            return bot.sendMessage(chatId, `❌ Anda tidak bisa menghapus role ${ROLE_NAME[roleKey]} (Level ${targetRoleLevel}) karena level Anda hanya ${adminLevel}!`);
        }
        
        if (removeRole(targetUserId, roleKey)) {
            bot.sendMessage(chatId, `✅ User ID ${targetUserId} berhasil dihapus dari ${ROLE_NAME[roleKey]}!`);
        } else {
            bot.sendMessage(chatId, `⚠️ User ID ${targetUserId} bukan ${ROLE_NAME[roleKey]}!`);
        }
    });
    
    // Command LIST
    bot.onText(new RegExp(`^${listCmd}$`), (msg) => {
        const chatId = msg.chat.id;
        const data = loadJsonData(DB_FILES[roleKey]);
        if (data.length === 0) return bot.sendMessage(chatId, `📭 Belum ada ${ROLE_NAME[roleKey]}.`);
        
        let message = `${ROLE_NAME[roleKey]}:\n\n`;
        data.forEach((id, i) => { message += `${i+1}. \`${id}\`\n`; });
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
}

// ========== COMMAND KHUSUS MULTI ROLE ==========
function setupSpecialCommands(bot) {
    // /addtk
    bot.onText(/^\/addtk(?:\s+(\d+))?$/, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const adminLevel = getUserLevel(userId);
        
        if (!isAuthorized(userId, 4)) return bot.sendMessage(chatId, '❌ Khusus ADMIN PANEL ke atas!');
        
        let targetUserId = (match && match[1]) ? match[1] : (msg.reply_to_message ? msg.reply_to_message.from.id.toString() : null);
        if (!targetUserId) return bot.sendMessage(chatId, '❌ Reply ke pesan user atau masukkan ID!\nContoh: /addtk 123456789');
        
        let added = false;
        if (adminLevel === 13) {
            if (addRole(targetUserId, 'premium')) added = true;
            if (addRole(targetUserId, 'reseller')) added = true;
            if (addRole(targetUserId, 'tk')) added = true;
        } else {
            if (String(userId) === String(targetUserId)) return bot.sendMessage(chatId, `❌ Anda tidak bisa menambahkan role ke diri sendiri!`);
            if (6 >= adminLevel) return bot.sendMessage(chatId, `❌ Anda tidak bisa menambahkan role TANGAN KANAN (Level 6) karena level Anda hanya ${adminLevel}!`);
            
            if (addRole(targetUserId, 'premium')) added = true;
            if (addRole(targetUserId, 'reseller')) added = true;
            if (addRole(targetUserId, 'tk')) added = true;
        }
        
        bot.sendMessage(chatId, added ? `✅ User ID ${targetUserId} berhasil ditambahkan sebagai TANGAN KANAN!\n📦 Mendapat: Premium + Reseller` : `⚠️ User ID ${targetUserId} sudah menjadi TANGAN KANAN!`);
    });
    
    // /deltk (DIPERBAIKI: Tambah validasi level)
    bot.onText(/^\/deltk(?:\s+(\d+))?$/, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const adminLevel = getUserLevel(userId);
        
        if (!isAuthorized(userId, 4)) return bot.sendMessage(chatId, '❌ Khusus ADMIN PANEL ke atas!');
        
        let targetUserId = (match && match[1]) ? match[1] : (msg.reply_to_message ? msg.reply_to_message.from.id.toString() : null);
        if (!targetUserId) return bot.sendMessage(chatId, '❌ Reply ke pesan user atau masukkan ID!\nContoh: /deltk 123456789');
        
        if (adminLevel !== 13) {
            if (String(userId) === String(targetUserId)) return bot.sendMessage(chatId, `❌ Anda tidak bisa menghapus role dari diri sendiri!`);
            if (6 >= adminLevel) return bot.sendMessage(chatId, `❌ Anda tidak bisa menghapus role TANGAN KANAN (Level 6) karena level Anda hanya ${adminLevel}!`);
        }
        
        let removed = false;
        if (removeRole(targetUserId, 'premium')) removed = true;
        if (removeRole(targetUserId, 'reseller')) removed = true;
        if (removeRole(targetUserId, 'tk')) removed = true;
        
        bot.sendMessage(chatId, removed ? `✅ User ID ${targetUserId} berhasil dihapus dari TANGAN KANAN!` : `⚠️ User ID ${targetUserId} bukan TANGAN KANAN!`);
    });

    // /addpt
    bot.onText(/^\/addpt(?:\s+(\d+))?$/, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const adminLevel = getUserLevel(userId);
        
        if (!isAuthorized(userId, 7)) return bot.sendMessage(chatId, '❌ Khusus CEO ke atas!');
        
        let targetUserId = (match && match[1]) ? match[1] : (msg.reply_to_message ? msg.reply_to_message.from.id.toString() : null);
        if (!targetUserId) return bot.sendMessage(chatId, '❌ Reply ke pesan user atau masukkan ID!\nContoh: /addpt 123456789');
        
        let added = false;
        if (adminLevel === 13) {
            if (addRole(targetUserId, 'premium')) added = true;
            if (addRole(targetUserId, 'reseller')) added = true;
            if (addRole(targetUserId, 'pt')) added = true;
        } else {
            if (String(userId) === String(targetUserId)) return bot.sendMessage(chatId, `❌ Anda tidak bisa menambahkan role ke diri sendiri!`);
            if (3 >= adminLevel) return bot.sendMessage(chatId, `❌ Anda tidak bisa menambahkan role PARTNER (Level 3) karena level Anda hanya ${adminLevel}!`);
            
            if (addRole(targetUserId, 'premium')) added = true;
            if (addRole(targetUserId, 'reseller')) added = true;
            if (addRole(targetUserId, 'pt')) added = true;
        }
        
        bot.sendMessage(chatId, added ? `✅ User ID ${targetUserId} berhasil ditambahkan sebagai PARTNER!\n📦 Mendapat: Premium + Reseller` : `⚠️ User ID ${targetUserId} sudah menjadi PARTNER!`);
    });

    // /delpt (DIPERBAIKI: Tambah validasi level)
    bot.onText(/^\/delpt(?:\s+(\d+))?$/, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const adminLevel = getUserLevel(userId);
        
        if (!isAuthorized(userId, 7)) return bot.sendMessage(chatId, '❌ Khusus CEO ke atas!');
        
        let targetUserId = (match && match[1]) ? match[1] : (msg.reply_to_message ? msg.reply_to_message.from.id.toString() : null);
        if (!targetUserId) return bot.sendMessage(chatId, '❌ Reply ke pesan user atau masukkan ID!\nContoh: /delpt 123456789');
        
        if (adminLevel !== 13) {
            if (String(userId) === String(targetUserId)) return bot.sendMessage(chatId, `❌ Anda tidak bisa menghapus role dari diri sendiri!`);
            if (3 >= adminLevel) return bot.sendMessage(chatId, `❌ Anda tidak bisa menghapus role PARTNER (Level 3) karena level Anda hanya ${adminLevel}!`);
        }
        
        let removed = false;
        if (removeRole(targetUserId, 'premium')) removed = true;
        if (removeRole(targetUserId, 'reseller')) removed = true;
        if (removeRole(targetUserId, 'pt')) removed = true;
        
        bot.sendMessage(chatId, removed ? `✅ User ID ${targetUserId} berhasil dihapus dari PARTNER!` : `⚠️ User ID ${targetUserId} bukan PARTNER!`);
    });
    
    // /addall & /delall (Tetap sama, sudah aman karena dikunci khusus level 13)
    bot.onText(/^\/addall(?:\s+(\d+))?$/, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        if (getUserLevel(userId) !== 13) return bot.sendMessage(chatId, '❌ Khusus MANAGER SVIP!');
        
        let targetUserId = (match && match[1]) ? match[1] : (msg.reply_to_message ? msg.reply_to_message.from.id.toString() : null);
        if (!targetUserId) return bot.sendMessage(chatId, '❌ Reply ke pesan user atau masukkan ID!\nContoh: /addall 123456789');
        
        const roles = ['premium', 'reseller', 'pt', 'adp', 'owner', 'tk', 'ceo', 'dev', 'asisten', 'vip', 'kepemilikan', 'managervip', 'managersvip'];
        let addedRoles = [], alreadyRoles = [];
        
        for (const key of roles) {
            const data = loadJsonData(DB_FILES[key]);
            if (!data.includes(targetUserId)) {
                data.push(targetUserId);
                saveJsonData(DB_FILES[key], data);
                addedRoles.push(ROLE_NAME[key]);
            } else {
                alreadyRoles.push(ROLE_NAME[key]);
            }
        }
        
        let message = `✅ *ADD ALL COMPLETE!*\n👤 *User ID:* \`${targetUserId}\`\n\n`;
        if (addedRoles.length > 0) message += `📦 *Berhasil ditambahkan:*\n${addedRoles.map(r => `  ✅ ${r}`).join('\n')}\n\n`;
        if (alreadyRoles.length > 0) message += `⚠️ *Sudah ada sebelumnya:*\n${alreadyRoles.map(r => `  ⚠️ ${r}`).join('\n')}`;
        
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    bot.onText(/^\/delall(?:\s+(\d+))?$/, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        if (getUserLevel(userId) !== 13) return bot.sendMessage(chatId, '❌ Khusus MANAGER SVIP!');
        
        let targetUserId = (match && match[1]) ? match[1] : (msg.reply_to_message ? msg.reply_to_message.from.id.toString() : null);
        if (!targetUserId) return bot.sendMessage(chatId, '❌ Reply ke pesan user atau masukkan ID!\nContoh: /delall 123456789');
        
        const roles = ['premium', 'reseller', 'pt', 'adp', 'owner', 'tk', 'ceo', 'dev', 'asisten', 'vip', 'kepemilikan', 'managervip', 'managersvip'];
        let removedRoles = [], notRoles = [];
        
        for (const key of roles) {
            let data = loadJsonData(DB_FILES[key]);
            if (data.includes(targetUserId)) {
                data = data.filter(id => id !== targetUserId);
                saveJsonData(DB_FILES[key], data);
                removedRoles.push(ROLE_NAME[key]);
            } else {
                notRoles.push(ROLE_NAME[key]);
            }
        }
        
        let message = `✅ *DEL ALL COMPLETE!*\n👤 *User ID:* \`${targetUserId}\`\n\n`;
        if (removedRoles.length > 0) message += `🗑️ *Berhasil dihapus:*\n${removedRoles.map(r => `  ✅ ${r}`).join('\n')}\n\n`;
        if (notRoles.length > 0) message += `⚠️ *Tidak memiliki role ini:*\n${notRoles.map(r => `  ⚠️ ${r}`).join('\n')}`;
        
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
}

// ========== COMMAND CEK ROLE ==========
function setupCekCommands(bot) {
    bot.onText(/\/myrole/, (msg) => {
        const userId = msg.from.id.toString();
        bot.sendMessage(msg.chat.id, `👤 *User ID:* \`${userId}\`\n🏷️ *Role:* ${getUserRole(userId)}\n📊 *Level:* ${getUserLevel(userId)}`, { parse_mode: 'Markdown' });
    });
    
    bot.onText(/\/cekrole(?:\s+(\d+))?/, (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        if (!isAuthorized(userId, 4)) return bot.sendMessage(chatId, '❌ Khusus ADMIN PANEL ke atas!');
        
        let targetUserId = (match && match[1]) ? match[1] : (msg.reply_to_message ? msg.reply_to_message.from.id.toString() : null);
        if (!targetUserId) return bot.sendMessage(chatId, '❌ Masukkan ID atau reply pesan user!\nContoh: /cekrole 123456789');
        
        bot.sendMessage(chatId, `👤 *User ID:* \`${targetUserId}\`\n🏷️ *Role:* ${getUserRole(targetUserId)}\n📊 *Level:* ${getUserLevel(targetUserId)}`, { parse_mode: 'Markdown' });
    });
}

// ========== COMMAND LIST ALL ==========
function setupListAllCommands(bot) {
    bot.onText(/\/listall/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        if (!isAuthorized(userId, 4)) return bot.sendMessage(chatId, '❌ Khusus ADMIN PANEL ke atas!');
        
        let message = '📊 *DAFTAR SEMUA ROLE*\n━━━━━━━━━━━━━━━━━━━━━\n\n';
        const sortedRoles = Object.entries(ROLE_LEVEL).sort((a, b) => b[1] - a[1]);
        
        for (const [roleKey, level] of sortedRoles) {
            if (roleKey === 'user') continue;
            const data = loadJsonData(DB_FILES[roleKey]);
            if (data.length > 0) {
                message += `${ROLE_NAME[roleKey]} (Level ${level}):\n└─ \`${data.join('`, `')}\`\n\n`;
            }
        }
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
}

// ========== MAIN MODULE ==========
module.exports = (bot) => {
    const dirs = ['./db/users', './db/users/private'];
    dirs.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });
    
    for (const filePath of Object.values(DB_FILES)) {
        if (!fs.existsSync(filePath)) saveJsonData(filePath, []);
    }
    
    const roleConfigs = [
        { key: 'managersvip', level: 13, name: 'MANAGER SVIP' },
        { key: 'managervip', level: 12, name: 'MANAGER VIP' },
        { key: 'kepemilikan', level: 11, name: 'KEPEMILIKAN' },
        { key: 'vip', level: 10, name: 'VIP MEMBER' },
        { key: 'asisten', level: 9, name: 'ASISTEN' },
        { key: 'dev', level: 8, name: 'DEVELOPER' },
        { key: 'ceo', level: 7, name: 'CEO' },
        { key: 'tk', level: 6, name: 'TANGAN KANAN' },
        { key: 'owner', level: 5, name: 'OWNER' },
        { key: 'adp', level: 4, name: 'ADMIN PANEL' },
        { key: 'pt', level: 3, name: 'PARTNER' },
        { key: 'reseller', level: 2, name: 'RESELLER' },
        { key: 'premium', level: 1, name: 'PREMIUM' }
    ];
    
    for (const cfg of roleConfigs) {
        createRoleCommands(bot, cfg.key, cfg.level, cfg.name);
    }
    
    setupSpecialCommands(bot);
    setupCekCommands(bot);
    setupListAllCommands(bot);
    
    console.log('✅ Role Manager loaded successfully!');
};

// ========== EXPORT FUNGSI ==========
module.exports.getUserLevel = getUserLevel;
module.exports.getUserRole = getUserRole;
module.exports.isAuthorized = isAuthorized;
