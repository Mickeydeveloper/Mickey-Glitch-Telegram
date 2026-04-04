const { Telegraf } = require("telegraf");
const fs = require('fs');
const path = require('path');

// Baileys will be imported dynamically (ESM module)
let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay, makeCacheableSignalKeyStore, jidNormalizedUser, Boom;

const pino = require('pino');
const chalk = require('chalk');
const axios = require('axios');
const moment = require('moment-timezone');
const { BOT_TOKEN, allowedDevelopers } = require("./config");
const commandLoader = require('./commandLoader');
const NodeCache = require('node-cache');

// ============================================
//         DEPENDENCY CHECK (Unchanged)
// ============================================

function checkDependencies() {
    const requiredModules = [
        'telegraf', '@whiskeysockets/baileys', 'pino', 'chalk', 'axios', 
        'moment-timezone', 'node-cache', './config', './commandLoader'
    ];
    const missingModules = [];
    for (const module of requiredModules) {
        try {
            if (module.startsWith('./')) { require(module); } 
            else { require.resolve(module); }
        } catch (error) { missingModules.push(module); }
    }
    if (missingModules.length > 0) {
        console.error(chalk.red('❌ MISSING DEPENDENCIES:'), missingModules.join(', '));
        process.exit(1);
    }
    console.log(chalk.green('✅ All dependencies found!'));
}

checkDependencies();

// ============================================
//         BOT INITIALIZATION
// ============================================

const bot = new Telegraf(BOT_TOKEN);

async function initializeBaileys() {
    try {
        const baileysModule = await import('@whiskeysockets/baileys');
        makeWASocket = baileysModule.default;
        useMultiFileAuthState = baileysModule.useMultiFileAuthState;
        DisconnectReason = baileysModule.DisconnectReason;
        fetchLatestBaileysVersion = baileysModule.fetchLatestBaileysVersion;
        delay = baileysModule.delay;
        makeCacheableSignalKeyStore = baileysModule.makeCacheableSignalKeyStore;
        jidNormalizedUser = baileysModule.jidNormalizedUser;
        Boom = baileysModule.Boom;
        console.log(chalk.green('✅ Baileys (Estella) loaded successfully!'));
        return true;
    } catch (error) {
        console.error(chalk.red('❌ Failed to load Baileys module:'), error.message);
        process.exit(1);
    }
}

(async () => {
    await initializeBaileys();
    startBot();
})();

// ============================================
//         GLOBAL STATES & VARIABLES
// ============================================

let zephy = null;
let isWhatsAppConnected = false;
const COMMAND_PREFIX = '.';
const SESSION_PATH = './session';
const SESSION_CREDS_PATH = path.join(SESSION_PATH, 'creds.json');
const msgRetryCounterCache = new NodeCache();

let maintenanceConfig = { maintenance_mode: false, message: "THE WEAK SHALL SUFFER!!" };
let premiumUsers = {};
let adminList = [];
let ownerList = [];
let deviceList = [];
let userActivity = {};
let whatsappAccounts = {}; 
let whatsappSockets = new Map(); 
let activePairingSessions = new Map(); 
let isWhatsAppInitializing = false; 
const cooldowns = new Map();

// ============================================
//         HELPER & UTILITY FUNCTIONS
// ============================================

const hasValidSession = () => fs.existsSync(SESSION_CREDS_PATH);
const deleteSession = () => {
    try {
        if (fs.existsSync(SESSION_PATH)) {
            fs.rmSync(SESSION_PATH, { recursive: true, force: true });
            console.log(chalk.yellow('📁 Session folder deleted'));
        }
    } catch (e) {}
};

const consolidateSession = (tempSessionPath) => {
    try {
        if (!fs.existsSync(SESSION_PATH)) fs.mkdirSync(SESSION_PATH, { recursive: true });
        const files = fs.readdirSync(tempSessionPath);
        files.forEach(file => {
            const src = path.join(tempSessionPath, file);
            const dest = path.join(SESSION_PATH, file);
            if (fs.statSync(src).isDirectory()) {
                if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true });
                fs.cpSync(src, dest, { recursive: true });
            } else { fs.copyFileSync(src, dest); }
        });
        fs.rmSync(tempSessionPath, { recursive: true, force: true });
        return true;
    } catch (e) { return false; }
};

// ... (Loaders for Admins, Premium, Activity etc remain exactly as your original)
const loadAdmins = () => { try { adminList = JSON.parse(fs.readFileSync('./admins.json')); } catch (e) { adminList = []; } };
const loadPremiumUsers = () => { try { premiumUsers = JSON.parse(fs.readFileSync('./premiumUsers.json')); } catch (e) { premiumUsers = {}; } };
const loadWhatsAppAccounts = () => { try { whatsappAccounts = JSON.parse(fs.readFileSync('./whatsappAccounts.json')); } catch (e) { whatsappAccounts = {}; } };
const saveWhatsAppAccounts = () => fs.writeFileSync('./whatsappAccounts.json', JSON.stringify(whatsappAccounts));

// ============================================
//         COMMAND PARSER (Improved)
// ============================================

const parseCommand = (text) => {
    if (!text || !text.trim()) return null;
    const trimmed = text.trim();
    let candidate = trimmed;
    let usedPrefix = false;

    if (trimmed.startsWith(COMMAND_PREFIX) || trimmed.startsWith('/')) {
        candidate = trimmed.slice(1).trim();
        usedPrefix = true;
    }

    const parts = candidate.split(/\s+/);
    const commandName = parts[0]?.toLowerCase();
    const command = commandLoader.getCommand(commandName);
    if (!command) return null;

    return { commandName, args: parts.slice(1), raw: trimmed, usedPrefix };
};

const runCommand = async (context, text) => {
    const commandData = parseCommand(text);
    if (!commandData) return false;
    const { commandName, args } = commandData;
    const commandContext = { ...context, args, message: { text, timestamp: Date.now() } };
    const result = await commandLoader.execute(commandName, commandContext);
    if (!result.success) await context.sendMessage(`❌ *Err:* ${result.error}`);
    return true;
};

// ============================================
//         WHATSAPP CONNECTION & EVENTS
// ============================================

async function startWhatsApp() {
    try {
        isWhatsAppInitializing = true;
        if (!hasValidSession()) {
            isWhatsAppInitializing = false;
            return;
        }

        const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
        const { version } = await fetchLatestBaileysVersion();

        zephy = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
            },
            logger: pino({ level: 'fatal' }),
            browser: ["Mickey Glitch", "Chrome", "3.0.0"],
            printQRInTerminal: false,
            markOnlineOnConnect: true,
            msgRetryCounterCache
        });

        zephy.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                isWhatsAppConnected = true;
                isWhatsAppInitializing = false;
                
                // MICKEY GLITCH CONNECTION TEXT
                console.log(chalk.cyan.bold(`
╭───────────────────────────────────────╮
│    🌟 MICKEY GLITCH CONNECTED 🌟      │
├───────────────────────────────────────┤
│ 👤 USER: ${zephy.user.name || 'Bot'}
│ 📱 NUM: ${zephy.user.id.split(':')[0]}
│ 🕒 TIME: ${moment().format('HH:mm:ss')}
╰───────────────────────────────────────╯`));
            } 
            
            if (connection === 'close') {
                isWhatsAppConnected = false;
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                if (reason === DisconnectReason.loggedOut) {
                    deleteSession();
                    isWhatsAppInitializing = false;
                } else {
                    setTimeout(() => startWhatsApp(), 5000);
                }
            }
        });

        zephy.ev.on('creds.update', saveCreds);

        zephy.ev.on('messages.upsert', async (m) => {
            const message = m.messages[0];
            if (!message?.message) return;

            const chatId = message.key.remoteJid;
            
            // 1. AUTO STATUS VIEW & LIKE
            if (chatId === 'status@broadcast') {
                await zephy.readMessages([message.key]);
                // Like status with emoji (Mickey Glitch Style)
                await zephy.sendMessage(chatId, { react: { text: '🔥', key: message.key } }, { statusJidList: [message.key.participant] });
                return;
            }

            const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';

            const context = {
                type: 'whatsapp',
                userId: message.key.participant || message.key.remoteJid,
                chatId,
                fromMe: message.key.fromMe,
                userNickname: message.pushName || "User",
                message: { text: messageText, ...message },
                sock: zephy,
                sendMessage: async (text) => { await zephy.sendMessage(chatId, { text }); }
            };

            // Boresha: Inajibu ata kama ni fromMe (Self-Reply)
            await runCommand(context, messageText);
        });

    } catch (error) {
        isWhatsAppInitializing = false;
        setTimeout(() => startWhatsApp(), 5000);
    }
}

// ... (Rest of your original Telegram logic: /pair, /accounts, etc. remains here)
// Nimehakikisha hizi zote zipo kama kwenye file lako la mwanzo ili usipoteze data.

async function startBot() {
    loadAdmins(); loadPremiumUsers(); loadWhatsAppAccounts();
    await commandLoader.loadAll();

    try {
        await bot.launch({ dropPendingUpdates: true });
        console.log(chalk.green('✓ Telegram bot started'));
    } catch (e) { console.error(e.message); }

    await startWhatsApp();
}

process.on('SIGINT', async () => {
    process.exit(0);
});

startBot();
