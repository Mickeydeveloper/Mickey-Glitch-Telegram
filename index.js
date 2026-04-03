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
//         DEPENDENCY CHECK
// ============================================

function checkDependencies() {
    const requiredModules = [
        'telegraf',
        '@whiskeysockets/baileys',
        'pino',
        'chalk',
        'axios',
        'moment-timezone',
        'node-cache',
        './config',
        './commandLoader'
    ];

    const missingModules = [];

    for (const module of requiredModules) {
        try {
            if (module.startsWith('./')) {
                require(module);
            } else {
                require.resolve(module);
            }
        } catch (error) {
            missingModules.push(module);
        }
    }

    if (missingModules.length > 0) {
        console.error(chalk.red('❌ MISSING DEPENDENCIES:'));
        console.error(chalk.yellow('Please run: npm install'));
        console.error(chalk.red('Missing modules:'), missingModules.join(', '));
        console.error(chalk.cyan('\nIf you\'re in a container, run this command:'));
        console.error(chalk.green('cd /home/container && npm install'));
        process.exit(1);
    }

    console.log(chalk.green('✅ All dependencies found!'));
}

// Check dependencies before starting
checkDependencies();

// ============================================
//         BOT INITIALIZATION
// ============================================

const bot = new Telegraf(BOT_TOKEN);

// ============================================
//         ASYNC INITIALIZATION (Load ESM Baileys)
// ============================================

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

// Start the bot
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
let whatsappAccounts = {}; // Store multiple WhatsApp accounts
let whatsappSockets = new Map(); // Store active WhatsApp socket connections
let activePairingSessions = new Map(); // Track pairing sessions
let isWhatsAppInitializing = false; // Flag to prevent reconnect during initialization
const cooldowns = new Map();

// ============================================
//         HELPER FUNCTIONS
// ============================================

/**
 * Check if a valid WhatsApp session exists
 * @returns {boolean}
 */
const hasValidSession = () => {
    return fs.existsSync(SESSION_CREDS_PATH);
};

/**
 * Check if session directory exists
 * @returns {boolean}
 */
const sessionDirExists = () => {
    return fs.existsSync(SESSION_PATH);
};

/**
 * Delete the WhatsApp session folder
 */
const deleteSession = () => {
    try {
        if (fs.existsSync(SESSION_PATH)) {
            fs.rmSync(SESSION_PATH, { recursive: true, force: true });
            console.log(chalk.yellow('📁 Session folder deleted'));
        }
    } catch (error) {
        console.error(chalk.red('Error deleting session:'), error.message);
    }
};

/**
 * Move session from temp pairing location to main session folder
 * @param {string} tempSessionPath - Path to temporary session folder
 * @returns {boolean}
 */
const consolidateSession = (tempSessionPath) => {
    try {
        // Create session directory if it doesn't exist
        if (!fs.existsSync(SESSION_PATH)) {
            fs.mkdirSync(SESSION_PATH, { recursive: true });
        }

        // Copy all files from temp session to main session
        const files = fs.readdirSync(tempSessionPath);
        files.forEach(file => {
            const src = path.join(tempSessionPath, file);
            const dest = path.join(SESSION_PATH, file);
            const stat = fs.statSync(src);
            
            if (stat.isDirectory()) {
                // Copy directory
                if (fs.existsSync(dest)) {
                    fs.rmSync(dest, { recursive: true });
                }
                fs.cpSync(src, dest, { recursive: true });
            } else {
                // Copy file
                fs.copyFileSync(src, dest);
            }
        });

        // Clean up temp session directory
        fs.rmSync(tempSessionPath, { recursive: true, force: true });
        
        console.log(chalk.green('✓ Session consolidated to main folder'));
        return true;
    } catch (error) {
        console.error(chalk.red('Error consolidating session:'), error.message);
        return false;
    }
};

// ============================================
//         UTILITY FUNCTIONS
// ============================================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isOwner = (userId) => ownerList.includes(userId.toString());
const isDeveloper = (userId) => allowedDevelopers.includes(userId.toString());
const isAdmin = (userId) => adminList.includes(userId.toString());

const addAdmin = (userId) => {
    if (!adminList.includes(userId)) {
        adminList.push(userId);
        saveAdmins();
    }
};

const removeAdmin = (userId) => {
    adminList = adminList.filter(id => id !== userId);
    saveAdmins();
};

const saveAdmins = () => fs.writeFileSync('./admins.json', JSON.stringify(adminList));
const loadAdmins = () => {
    try {
        adminList = JSON.parse(fs.readFileSync('./admins.json'));
    } catch (error) {
        console.error(chalk.red('Failed to load admin list'), error.message);
        adminList = [];
    }
};

const addPremiumUser = (userId, durationDays) => {
    userId = userId.toString();
    const expirationDate = moment().tz('Asia/Jakarta').add(durationDays, 'days');
    premiumUsers[userId] = { expired: expirationDate.format('YYYY-MM-DD HH:mm:ss') };
    savePremiumUsers();
};

const removePremiumUser = (userId) => {
    delete premiumUsers[userId];
    savePremiumUsers();
};

const isPremiumUser = (userId) => {
    const userData = premiumUsers[userId];
    if (!userData) return false;
    const now = moment().tz('Asia/Jakarta');
    const expirationDate = moment(userData.expired, 'YYYY-MM-DD HH:mm:ss').tz('Asia/Jakarta');
    return now.isBefore(expirationDate);
};

const savePremiumUsers = () => fs.writeFileSync('./premiumUsers.json', JSON.stringify(premiumUsers));
const loadPremiumUsers = () => {
    try {
        premiumUsers = JSON.parse(fs.readFileSync('./premiumUsers.json'));
    } catch (error) {
        console.error(chalk.red('Failed to load premium users'), error.message);
        premiumUsers = {};
    }
};

const loadDeviceList = () => {
    try {
        deviceList = JSON.parse(fs.readFileSync('./ListDevice.json'));
    } catch (error) {
        console.error(chalk.red('Failed to load device list'), error.message);
        deviceList = [];
    }
};

const saveDeviceList = () => fs.writeFileSync('./ListDevice.json', JSON.stringify(deviceList));

const recordUserActivity = (userId, userNickname) => {
    const now = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
    userActivity[userId] = { nickname: userNickname, last_seen: now };
    fs.writeFileSync('./userActivity.json', JSON.stringify(userActivity));
};

const loadUserActivity = () => {
    try {
        userActivity = JSON.parse(fs.readFileSync('./userActivity.json'));
    } catch (error) {
        console.error(chalk.red('Failed to load user activity'), error.message);
        userActivity = {};
    }
};

/**
 * Parse a chat text to recognize commands with prefix or natural style.
 * Supports .command, /command, and bare command text (e.g. "status", "alive").
 */
const parseCommand = (text) => {
    if (!text || !text.trim()) return null;

    const trimmed = text.trim();
    let candidate = trimmed;
    let usedPrefix = false;

    if (trimmed.startsWith(COMMAND_PREFIX)) {
        candidate = trimmed.slice(COMMAND_PREFIX.length).trim();
        usedPrefix = true;
    } else if (trimmed.startsWith('/')) {
        candidate = trimmed.slice(1).trim();
        usedPrefix = true;
    }

    const parts = candidate.split(/\s+/);
    const commandName = parts[0]?.toLowerCase();
    if (!commandName) return null;

    const command = commandLoader.getCommand(commandName);
    if (!command) return null;

    return {
        commandName,
        args: parts.slice(1),
        raw: trimmed,
        usedPrefix
    };
};

const runCommand = async (context, text) => {
    const commandData = parseCommand(text);
    if (!commandData) return false;

    const { commandName, args } = commandData;

    const commandContext = {
        ...context,
        args,
        message: { text, timestamp: Date.now() }
    };

    const result = await commandLoader.execute(commandName, commandContext);

    if (!result.success) {
        await context.sendMessage(`❌ *Error:* ${result.error}`);
    }

    return true;
};

const runChatbotReply = async (context, text) => {
    const normalized = (text || '').toString().trim();
    if (!normalized) return;

    const lower = normalized.toLowerCase();

    if (/\b(status|alive|uptime)\b/.test(lower)) {
        await commandLoader.execute('alive', context);
        return;
    }

    if (/\b(hi|hello|hey|hola|salam)\b/.test(lower)) {
        await context.sendMessage(`👋 Hello ${context.userNickname || 'there'}! Ask me commands: .help, .alive, .status`);
        return;
    }

    if (/\b(help|commands|usage)\b/.test(lower)) {
        const supported = commandLoader.getAllCommandNames().sort().join(', ');
        await context.sendMessage(`📌 Commands available: ${supported}\nUse prefix '.' or plain command names (e.g. status).`);
        return;
    }

    await context.sendMessage(`🤖 I got your message: "${normalized}"\nTo run a bot command, use .<command> or plain command name (e.g. status, alive).`);
};

// WhatsApp Accounts Management
const saveWhatsAppAccounts = () => fs.writeFileSync('./whatsappAccounts.json', JSON.stringify(whatsappAccounts));
const loadWhatsAppAccounts = () => {
    try {
        whatsappAccounts = JSON.parse(fs.readFileSync('./whatsappAccounts.json'));
    } catch (error) {
        console.error(chalk.red('Failed to load WhatsApp accounts'), error.message);
        whatsappAccounts = {};
    }
};

// ============================================
//         INITIALIZE DATA & COMMANDS
// ============================================

// Expose utility functions globally so commands can access them
global.adminList = adminList;
global.isOwner = isOwner;
global.isDeveloper = isDeveloper;
global.isAdmin = isAdmin;
global.addAdmin = addAdmin;
global.removeAdmin = removeAdmin;
global.saveAdmins = saveAdmins;
global.loadAdmins = loadAdmins;
global.premiumUsers = premiumUsers;
global.addPremiumUser = addPremiumUser;
global.removePremiumUser = removePremiumUser;
global.isPremiumUser = isPremiumUser;
global.savePremiumUsers = savePremiumUsers;
global.loadPremiumUsers = loadPremiumUsers;
global.whatsappAccounts = whatsappAccounts;
global.whatsappSockets = whatsappSockets;
global.saveWhatsAppAccounts = saveWhatsAppAccounts;
global.loadWhatsAppAccounts = loadWhatsAppAccounts;
global.hasValidSession = hasValidSession;
global.deleteSession = deleteSession;
global.bot = bot;
global.activePairingSessions = activePairingSessions;

console.log(chalk.cyan('📦 Loading bot data...'));
loadAdmins();
loadPremiumUsers();
loadDeviceList();
loadUserActivity();
loadWhatsAppAccounts();
console.log(chalk.green('✓ Data loaded successfully\n'));

console.log(chalk.blue('📦 Loading command plugins...'));
commandLoader.loadAll().then(() => {
    console.log(chalk.green(`✓ Total commands: ${commandLoader.getAllCommandNames().length}\n`));
}).catch(err => {
    console.error(chalk.red('✗ Failed to load command plugins:'), err.message || err);
});

// ============================================
//         TELEGRAM COMMANDS
// ============================================

// Show connected accounts
bot.command('accounts', async (ctx) => {
    const userId = ctx.from.id.toString();
    
    if (!isDeveloper(userId)) {
        await ctx.reply('❌ Only developers can view accounts!');
        return;
    }

    const accounts = Object.entries(whatsappAccounts);
    
    if (accounts.length === 0) {
        let message = '📭 No WhatsApp accounts connected yet.\n\n';
        message += 'Use "/pair [number]" to pair a new account.\n';
        message += 'Example: /pair 62812345678';
        await ctx.reply(message);
        return;
    }

    let message = '📱 *Connected WhatsApp Accounts*\n\n';
    message += '─────────────────────\n';
    
    accounts.forEach(([sessionId, account], idx) => {
        message += `${idx + 1}️⃣ *Phone:* \`${account.phoneNumber}\`\n`;
        message += `   📅 Connected: ${new Date(account.connectedAt).toLocaleString()}\n`;
        message += `   Status: ${account.status}\n\n`;
    });
    
    message += `─────────────────────\n`;
    message += `✨ Total: ${accounts.length} account(s)`;
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
});

// ============================================
//         TELEGRAM COMMAND HANDLER
// ============================================

bot.on('message', async (ctx) => {
    const userId = ctx.from.id.toString();
    const userNickname = ctx.from.first_name || userId;
    
    recordUserActivity(userId, userNickname);

    const message = (ctx.message.text || '').trim();
    
    // Check for /pair followed by a number
    const pairMatch = message.match(/\/pair\s+(\d+)/);
    if (pairMatch) {
        // Only allow developers to pair
        if (!isDeveloper(userId)) {
            await ctx.reply('❌ Only bot developers can pair WhatsApp accounts!');
            return;
        }

        const phoneNumber = pairMatch[1];
        let formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
        
        // Validate phone number
        if (formattedNumber.length < 10 || formattedNumber.length > 15) {
            await ctx.reply('❌ Invalid phone number format. Please provide a valid phone number.');
            return;
        }
        
        // Ensure it starts with country code
        if (!formattedNumber.startsWith('255')) {
            formattedNumber = '255' + formattedNumber;
        }
        
        // Create a unique pairing session ID
        const pairingSessionId = `pairing_${userId}_${Date.now()}`;
        const tempSessionPath = `./sessions/${pairingSessionId}`;

        try {
            // Create temporary session directory
            if (!fs.existsSync('./sessions')) {
                fs.mkdirSync('./sessions', { recursive: true });
            }
            if (!fs.existsSync(tempSessionPath)) {
                fs.mkdirSync(tempSessionPath, { recursive: true });
            }

            // Notify user
            const setupMsg = `⏳ *Setting up WhatsApp pairing...*\n\n` +
                `📱 *Target Number:* \`${formattedNumber}\`\n` +
                `🔄 Initializing connection...\n\n` +
                `⏱️ Requesting pairing code (30-60 seconds)\n\n` +
                `Please wait while we generate the pairing code.`;
            
            await ctx.reply(setupMsg, { parse_mode: 'Markdown' });

            // Initialize Baileys socket for pairing with proper config
            const { state, saveCreds } = await useMultiFileAuthState(tempSessionPath);
            const { version } = await fetchLatestBaileysVersion();
            if (!Array.isArray(version)) {
                console.error(chalk.red('❌ Invalid WhatsApp version format'));
                throw new Error('Failed to fetch valid WhatsApp version');
            }
            console.log(chalk.blue(`📱 Using WhatsApp version: ${version.join('.')}`));
            
            const pairSocket = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
                },
                logger: pino({ level: 'fatal' }),
                printQRInTerminal: false,
                mobile: false,
                browser: ["Ubuntu","Chrome","20.0.04"],
                markOnlineOnConnect: false,
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000
            });

            // Track this pairing session
            activePairingSessions.set(pairingSessionId, {
                socket: pairSocket,
                phoneNumber: formattedNumber,
                ctxId: ctx.chat.id,
                startTime: Date.now()
            });

            let pairingReconnectAttempts = 0;
            const maxPairingReconnects = 3;
            let pairingCodeDisplayed = false;
            let timeoutHandle;

            // Handle connection updates (set up before requesting code)
            pairSocket.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;
                console.log(chalk.blue(`🔗 Pairing connection update: ${connection}`));

                if (lastDisconnect) {
                    console.log(chalk.yellow(`🔗 Pairing disconnect reason: ${lastDisconnect.error?.message || 'Unknown'}`));
                }

                // Handle successful pairing
                if (connection === 'open') {
                    clearTimeout(timeoutHandle);
                    
                    const connectedPhoneNumber = pairSocket.user?.id?.replace('@s.whatsapp.net', '') || formattedNumber;
                    console.log(chalk.green(`✅ WhatsApp pairing successful: ${connectedPhoneNumber}`));

                    // Move session to main folder
                    const moved = consolidateSession(tempSessionPath);
                    
                    if (moved) {
                        // Store account info
                        const accountId = `account_${connectedPhoneNumber}`;
                        whatsappAccounts[accountId] = {
                            phoneNumber: connectedPhoneNumber,
                            connectedAt: new Date().toISOString(),
                            status: 'connected',
                            pairedBy: userId,
                            targetNumber: formattedNumber
                        };
                        saveWhatsAppAccounts();

                        // Notify user
                        const successMsg = `✅ *WhatsApp Pairing Successful!*\n\n` +
                            `📱 *Phone:* \`${connectedPhoneNumber}\`\n` +
                            `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
                            `✨ Account is now ready!`;
                        
                        try {
                            await bot.telegram.sendMessage(ctx.chat.id, successMsg, { 
                                parse_mode: 'Markdown' 
                            });
                        } catch (e) {}

                        // Notify all developers
                        for (const devId of allowedDevelopers) {
                            try {
                                await bot.telegram.sendMessage(
                                    devId,
                                    `🟢 *WhatsApp Account Paired*\n\n` +
                                    `📱 *Number:* \`${connectedPhoneNumber}\`\n` +
                                    `👤 *Paired by:* User ${userId}\n` +
                                    `⏰ *Time:* ${new Date().toLocaleString()}`,
                                    { parse_mode: 'Markdown' }
                                );
                            } catch (e) {}
                        }

                        // Clean up pairing session
                        activePairingSessions.delete(pairingSessionId);
                        pairSocket.ev.removeAllListeners();
                        try {
                            pairSocket.socket?.end?.();
                        } catch (e) {}

                        // Start main WhatsApp connection if not already running
                        if (!isWhatsAppConnected && !isWhatsAppInitializing) {
                            console.log(chalk.blue('🔗 Starting main WhatsApp connection...'));
                            await delay(2000);
                            startWhatsApp();
                        }
                    } else {
                        try {
                            await bot.telegram.sendMessage(ctx.chat.id, 
                                '❌ Failed to consolidate session. Please try again.');
                        } catch (e) {}
                    }
                } 
                else if (connection === 'close') {
                    clearTimeout(timeoutHandle);
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    
                    if (pairingCodeDisplayed && shouldReconnect && pairingReconnectAttempts < maxPairingReconnects) {
                        pairingReconnectAttempts++;
                        console.log(chalk.yellow(`🔄 Attempting to reconnect pairing socket (attempt ${pairingReconnectAttempts}/${maxPairingReconnects}) for ${formattedNumber} - Reason: ${lastDisconnect?.error?.message || 'Unknown'}`));
                        // Wait before reconnecting
                        setTimeout(async () => {
                            try {
                                // Recreate socket with updated auth state
                                let reconnectState, reconnectSaveCreds;
                                try {
                                    const authResult = await useMultiFileAuthState(tempSessionPath);
                                    reconnectState = authResult.state;
                                    reconnectSaveCreds = authResult.saveCreds;
                                } catch (authError) {
                                    console.error(chalk.red('Failed to load auth state for reconnection:'), authError.message);
                                    // Skip reconnection if auth state can't be loaded
                                    return;
                                }
                                
                                const { version: reconnectVersion } = await fetchLatestBaileysVersion();
                                if (!Array.isArray(reconnectVersion)) {
                                    throw new Error('Failed to fetch valid WhatsApp version for reconnection');
                                }
                                
                                const reconnectSocket = makeWASocket({
                                    version: reconnectVersion,
                                    auth: {
                                        creds: reconnectState.creds,
                                        keys: makeCacheableSignalKeyStore(reconnectState.keys, pino({ level: "fatal" }))
                                    },
                                    logger: pino({ level: 'fatal' }),
                                    printQRInTerminal: false,
                                    mobile: false,
                                    browser: ["Baileys", "Chrome", "1.0.0"],
                                    markOnlineOnConnect: false,
                                    connectTimeoutMs: 60000,
                                    defaultQueryTimeoutMs: 60000
                                });

                                // Update the session socket
                                activePairingSessions.set(pairingSessionId, {
                                    socket: reconnectSocket,
                                    phoneNumber: formattedNumber,
                                    ctxId: ctx.chat.id,
                                    startTime: Date.now()
                                });

                                // Set up listeners for the new socket
                                reconnectSocket.ev.on('connection.update', async (update) => {
                                    const { connection: reconnConnection, lastDisconnect: reconnLastDisconnect } = update;
                                    console.log(chalk.blue(`🔗 Reconnected pairing connection update: ${reconnConnection}`));

                                    if (reconnLastDisconnect) {
                                        console.log(chalk.yellow(`🔗 Reconnected pairing disconnect reason: ${reconnLastDisconnect.error?.message || 'Unknown'}`));
                                    }

                                    if (reconnConnection === 'open') {
                                        clearTimeout(timeoutHandle);
                                        pairingReconnectAttempts = maxPairingReconnects; // Stop further reconnects
                                        
                                        const connectedPhoneNumber = reconnectSocket.user?.id?.replace('@s.whatsapp.net', '') || formattedNumber;
                                        console.log(chalk.green(`✅ WhatsApp pairing successful after reconnect: ${connectedPhoneNumber}`));

                                        // Move session to main folder
                                        const moved = consolidateSession(tempSessionPath);
                                        
                                        if (moved) {
                                            // Store account info
                                            const accountId = `account_${connectedPhoneNumber}`;
                                            whatsappAccounts[accountId] = {
                                                phoneNumber: connectedPhoneNumber,
                                                connectedAt: new Date().toISOString(),
                                                status: 'connected',
                                                pairedBy: userId,
                                                targetNumber: formattedNumber
                                            };
                                            saveWhatsAppAccounts();

                                            // Notify user
                                            const successMsg = `✅ *WhatsApp Pairing Successful!*\n\n` +
                                                `📱 *Phone:* \`${connectedPhoneNumber}\`\n` +
                                                `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
                                                `✨ Account is now ready!`;
                                            
                                            try {
                                                await bot.telegram.sendMessage(ctx.chat.id, successMsg, { 
                                                    parse_mode: 'Markdown' 
                                                });
                                            } catch (e) {}

                                            // Notify all developers
                                            for (const devId of allowedDevelopers) {
                                                try {
                                                    await bot.telegram.sendMessage(
                                                        devId,
                                                        `🟢 *WhatsApp Account Paired*\n\n` +
                                                        `📱 *Number:* \`${connectedPhoneNumber}\`\n` +
                                                        `👤 *Paired by:* User ${userId}\n` +
                                                        `⏰ *Time:* ${new Date().toLocaleString()}`,
                                                        { parse_mode: 'Markdown' }
                                                    );
                                                } catch (e) {}
                                            }

                                            // Clean up pairing session
                                            activePairingSessions.delete(pairingSessionId);
                                            reconnectSocket.ev.removeAllListeners();
                                            try {
                                                reconnectSocket.socket?.end?.();
                                            } catch (e) {}

                                            // Start main WhatsApp connection if not already running
                                            if (!isWhatsAppConnected && !isWhatsAppInitializing) {
                                                console.log(chalk.blue('🔗 Starting main WhatsApp connection...'));
                                                await delay(2000);
                                                startWhatsApp();
                                            }
                                        } else {
                                            try {
                                                await bot.telegram.sendMessage(ctx.chat.id, 
                                                    '❌ Failed to consolidate session. Please try again.');
                                            } catch (e) {}
                                        }
                                    } 
                                    else if (reconnConnection === 'close') {
                                        clearTimeout(timeoutHandle);
                                        const reconnShouldReconnect = reconnLastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                                        
                                        if (!reconnShouldReconnect || pairingReconnectAttempts >= maxPairingReconnects) {
                                            console.log(chalk.red(`❌ Pairing failed after reconnect attempts: Connection closed after code generation for ${formattedNumber}`));
                                            
                                            try {
                                                await bot.telegram.sendMessage(ctx.chat.id,
                                                    '❌ Pairing failed. Unable to maintain connection after multiple attempts.\n\n' +
                                                    'Possible reasons:\n' +
                                                    '• Network connectivity issues\n' +
                                                    '• WhatsApp server problems\n' +
                                                    '• Phone number restrictions\n\n' +
                                                    'Please try again later: /pair ' + phoneNumber);
                                            } catch (e) {}
                                            
                                            // Clean up
                                            activePairingSessions.delete(pairingSessionId);
                                            reconnectSocket.ev.removeAllListeners();
                                            try {
                                                reconnectSocket.socket?.end?.();
                                            } catch (e) {}
                                        }
                                    }
                                });

                                reconnectSocket.ev.on('creds.update', reconnectSaveCreds);

                            } catch (reconnectError) {
                                console.error(chalk.red('Reconnection error:'), reconnectError.message);
                                
                                if (pairingReconnectAttempts >= maxPairingReconnects) {
                                    try {
                                        await bot.telegram.sendMessage(ctx.chat.id,
                                            '❌ Pairing failed after multiple reconnection attempts.\n\n' +
                                            'Please check your network connection and try again: /pair ' + phoneNumber);
                                    } catch (e) {}
                                    
                                    activePairingSessions.delete(pairingSessionId);
                                }
                            }
                        }, 5000); // Wait 5 seconds before reconnecting
                        
                    } else {
                        // No reconnection attempted, clean up
                        console.log(chalk.red(`❌ Pairing failed: ${pairingCodeDisplayed ? 'Connection closed after code generation' : 'loggedOut or rejected'} for ${formattedNumber}`));
                        
                        try {
                            await bot.telegram.sendMessage(ctx.chat.id,
                                pairingCodeDisplayed ?
                                    '❌ Pairing failed. The connection was closed.\n\n' +
                                    'Possible reasons:\n' +
                                    '• Code entered incorrectly or expired\n' +
                                    '• Network issues\n' +
                                    '• WhatsApp blocking the request\n\n' +
                                    'Please try again: /pair ' + phoneNumber :
                                    '❌ Pairing failed or rejected by WhatsApp.\n\n' +
                                    'Please try again with: /pair ' + formattedNumber);
                        } catch (e) {}
                        
                        // Clean up
                        activePairingSessions.delete(pairingSessionId);
                        pairSocket.ev.removeAllListeners();
                        try {
                            pairSocket.socket?.end?.();
                        } catch (e) {}
                    }
                    pairSocket.ev.removeAllListeners();
                    try {
                        pairSocket.socket?.end?.();
                    } catch (e) {}
                }
            });

            // Save credentials
            pairSocket.ev.on('creds.update', saveCreds);

            // Wait for connection to stabilize
            await delay(5000);

            // Request pairing code
            try {
                console.log(chalk.cyan(`\n🔐 Requesting pairing code for ${formattedNumber}...`));
                
                // Request pairing code (using default WhatsApp pairing)
                const pairingCode = await pairSocket.requestPairingCode(formattedNumber);
                
                pairingCodeDisplayed = true;
                console.log(chalk.green.bold(`\n✅ Pairing Code Generated: ${pairingCode}`));

                // Send pairing code to Telegram
                const pairingMsg = `🔐 *Pairing Code Ready!*\n\n` +
                    `\`${pairingCode}\`\n\n` +
                    `📝 *How to pair:*\n` +
                    `1️⃣ Open WhatsApp on your phone\n` +
                    `2️⃣ Go to Settings → Linked Devices\n` +
                    `3️⃣ Tap "Link a Device"\n` +
                    `4️⃣ Enter the code above\n\n` +
                    `⏱️ Code expires in 2 minutes`;
                
                try {
                    await bot.telegram.sendMessage(ctx.chat.id, pairingMsg, { 
                        parse_mode: 'Markdown' 
                    });
                } catch (error) {
                    console.error('Error sending pairing code:', error.message);
                }

                // Set 120-second timeout (increased for better reliability)
                timeoutHandle = setTimeout(async () => {
                    if (pairingCodeDisplayed && !pairSocket?.user?.id) {
                        console.log(chalk.yellow(`⏱️ Pairing timeout for: ${formattedNumber}`));
                        
                        try {
                            await bot.telegram.sendMessage(
                                ctx.chat.id,
                                '⏱️ *Pairing code expired*\n\n' +
                                'Please try pairing again: /pair ' + phoneNumber,
                                { parse_mode: 'Markdown' }
                            );
                        } catch (e) {}

                        // Clean up
                        pairSocket.ev.removeAllListeners();
                        try {
                            pairSocket.socket?.end?.();
                        } catch (e) {}
                        activePairingSessions.delete(pairingSessionId);
                    }
                }, 120000);

            } catch (pairingError) {
                console.error(chalk.red('❌ Pairing Code Error: ' + pairingError.message));
                
                let errorMsg = '❌ *Pairing Error*\n\n';
                errorMsg += 'Failed to generate pairing code:\n';
                errorMsg += '```' + pairingError.message + '```\n\n';
                errorMsg += '*Possible causes:*\n';
                errorMsg += '• Phone number not registered on WhatsApp\n';
                errorMsg += '• WhatsApp blocking the request\n';
                errorMsg += '• Network connectivity issues\n\n';
                errorMsg += 'Please try again: /pair ' + phoneNumber;
                
                try {
                    await bot.telegram.sendMessage(
                        ctx.chat.id,
                        errorMsg,
                        { parse_mode: 'Markdown' }
                    );
                } catch (e) {}

                activePairingSessions.delete(pairingSessionId);
                pairSocket.ev.removeAllListeners();
                try {
                    pairSocket.socket?.end?.();
                } catch (e) {}
                return; // Don't set up event listeners if pairing failed
            }

        } catch (error) {
            console.error(chalk.red('Pairing error:'), error.message);
            activePairingSessions.delete(pairingSessionId);
            
            await ctx.reply(`❌ Pairing error: ${error.message}`);
        }
        
        return; // Don't process as regular command
    }
    
    const context = {
        type: 'telegram',
        userId,
        userNickname,
        message: { text: message, timestamp: Date.now() },
        isOwner: global.isOwner,
        isDeveloper: global.isDeveloper,
        isAdmin: global.isAdmin,
        sendMessage: async (text) => {
            try {
                await ctx.reply(text, { parse_mode: 'Markdown' });
            } catch (error) {
                console.error('Error sending Telegram message:', error.message);
            }
        },
        deleteMessage: async () => {
            try {
                await ctx.deleteMessage();
            } catch (error) {
                console.error('Error deleting Telegram message:', error.message);
            }
        }
    };

    // Handle command or chatbot natural text
    const handledAsCommand = await runCommand(context, message);
    if (handledAsCommand) return;

    await runChatbotReply(context, message);
});

// ============================================
//         WHATSAPP CONNECTION
// ============================================

/**
 * Start the main WhatsApp connection with improved stability
 * Only attempt to connect if a valid session exists
 */
async function startWhatsApp() {
    try {
        isWhatsAppInitializing = true;

        // Check if session exists before attempting connection
        if (!hasValidSession()) {
            console.log(chalk.blue('ℹ️  WhatsApp session not found.'));
            console.log(chalk.blue('💡 Use "/pair [number]" in Telegram to setup WhatsApp.\n'));
            isWhatsAppInitializing = false;
            return;
        }

        console.log(chalk.blue('🔗 Connecting to WhatsApp...'));
        
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
        const { version } = await fetchLatestBaileysVersion();
        if (!Array.isArray(version)) {
            console.error(chalk.red('❌ Invalid WhatsApp version format'));
            throw new Error('Failed to fetch valid WhatsApp version');
        }
        console.log(chalk.blue(`📱 Using WhatsApp version: ${version.join('.')}`));
        
        zephy = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
            },
            logger: pino({ level: 'fatal' }),
            printQRInTerminal: false,
            mobile: false,
            browser: ["Baileys", "Chrome", "1.0.0"],
            markOnlineOnConnect: true,
            msgRetryCounterCache: new NodeCache(),
            getMessage: async (key) => {
                const jid = jidNormalizedUser(key.remoteJid);
                // Return message if found in store, otherwise undefined
                return undefined;
            }
        });

        zephy.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                isWhatsAppConnected = true;
                isWhatsAppInitializing = false;
                
                const phoneNumber = zephy.user?.id?.replace('@s.whatsapp.net', '') || 'Unknown';
                console.log(chalk.green.bold(`\n✅ WhatsApp Connected!`));
                console.log(chalk.green(`📱 Number: ${phoneNumber}`));
                console.log(chalk.green(`⏰ Time: ${new Date().toLocaleString()}\n`));

                // Update account status automatically
                const accountId = `account_${phoneNumber}`;
                if (!whatsappAccounts[accountId]) {
                    whatsappAccounts[accountId] = { phoneNumber, connectedAt: new Date().toISOString() };
                }
                whatsappAccounts[accountId].status = 'connected';
                whatsappAccounts[accountId].lastSeen = new Date().toISOString();
                saveWhatsAppAccounts();

                // Notify developers
                for (const devId of allowedDevelopers) {
                    try {
                        await bot.telegram.sendMessage(
                            devId,
                            `🟢 *WhatsApp Connected*\n\n` +
                            `📱 *Number:* \`${phoneNumber}\`\n` +
                            `⏰ *Time:* ${new Date().toLocaleString()}`,
                            { parse_mode: 'Markdown' }
                        ).catch(() => {});
                    } catch (e) {}
                }
            } 
            else if (connection === 'close') {
                isWhatsAppConnected = false;
                const phoneNumber = zephy.user?.id?.replace('@s.whatsapp.net', '') || 'Unknown';
                const accountId = `account_${phoneNumber}`;
                if (whatsappAccounts[accountId]) {
                    whatsappAccounts[accountId].status = 'disconnected';
                    whatsappAccounts[accountId].lastSeen = new Date().toISOString();
                    saveWhatsAppAccounts();
                }

                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                const shouldReconnect = reason !== DisconnectReason.loggedOut;

                if (reason === DisconnectReason.loggedOut) {
                    // User logged out - require re-pairing
                    console.log(chalk.red('❌ WhatsApp logged out'));
                    console.log(chalk.yellow('📁 Deleting session folder...'));
                    deleteSession();
                    console.log(chalk.yellow('📢 Use "/pair [number]" in Telegram to reconnect\n'));
                    
                    isWhatsAppInitializing = false;

                    // Notify developers
                    for (const devId of allowedDevelopers) {
                        try {
                            await bot.telegram.sendMessage(
                                devId,
                                '🔴 *WhatsApp Logged Out*\n\n' +
                                'Session deleted. Use /pair to reconnect.',
                                { parse_mode: 'Markdown' }
                            ).catch(() => {});
                        } catch (e) {}
                    }
                } 
                else if (shouldReconnect && !isWhatsAppInitializing) {
                    // Normal disconnection - try reconnecting after delay
                    const errorReason = lastDisconnect?.error?.message || 'Unknown';
                    console.log(chalk.yellow(`⚠️  WhatsApp disconnected: ${errorReason}`));
                    console.log(chalk.yellow('🔄 Attempting to reconnect in 5 seconds...\n'));

                    isWhatsAppInitializing = false;
                    
                    setTimeout(() => {
                        // Only reconnect if session still exists and bot isn't already initializing
                        if (hasValidSession() && !isWhatsAppConnected && !isWhatsAppInitializing) {
                            startWhatsApp();
                        }
                    }, 5000);
                }
                else {
                    isWhatsAppInitializing = false;
                }
            }
        });

        zephy.ev.on('creds.update', saveCreds);

        // WhatsApp message handler
        zephy.ev.on('messages.upsert', async (m) => {
            const message = m.messages?.[0];
            if (!message?.message || message?.key?.fromMe) return;

            const messageText = message.message?.conversation || 
                               message.message?.extendedTextMessage?.text || '';

            const userId = message.key.participant || message.key.remoteJid;
            const chatId = message.key.remoteJid;

            const context = {
                type: 'whatsapp',
                userId,
                chatId,
                userNickname: message.pushName || (message.key.participant || message.key.remoteJid),
                message: { text: messageText, ...message },
                isOwner: global.isOwner,
                isDeveloper: global.isDeveloper,
                isAdmin: global.isAdmin,
                sock: zephy,
                sendMessage: async (text) => {
                    try {
                        await zephy.sendMessage(chatId, { text });
                    } catch (error) {
                        console.error('Error sending WhatsApp message:', error.message);
                    }
                },
                deleteMessage: async () => {
                    try {
                        await zephy.sendMessage(chatId, { delete: message.key });
                    } catch (error) {
                        console.error('Error deleting WhatsApp message:', error.message);
                    }
                }
            };

            const handledAsCommand = await runCommand(context, messageText);
            if (handledAsCommand) return;

            await runChatbotReply(context, messageText);
        });

    } catch (error) {
        // Filter out Bad MAC and other noise errors
        if (!error.message?.includes('Bad MAC') && !error.message?.includes('verifyMAC')) {
            console.error(chalk.red('WhatsApp error:'), error.message);
        }
        isWhatsAppInitializing = false;
        
        // Only retry if session exists
        if (hasValidSession()) {
            console.log(chalk.yellow('🔄 Retrying WhatsApp connection in 5 seconds...'));
            await delay(5000);
            startWhatsApp();
        } else {
            console.log(chalk.blue('💡 Use "/pair [number]" in Telegram to setup WhatsApp.\n'));
        }
    }
}

// Override console.error to suppress "Bad MAC" noise
const originalConsoleError = console.error;
console.error = function (...args) {
    const msg = args.join(' ');
    if (msg.includes('Bad MAC') || msg.includes('verifyMAC') || msg.includes('Failed to decrypt message') || msg.includes('Decrypted message with closed session') || msg.includes('session closed')) {
        // Suppress this noise
        return;
    }
    originalConsoleError.apply(console, args);
};

// ============================================
//         TELEGRAM ERROR HANDLING
// ============================================

bot.catch((err, ctx) => {
    console.error(chalk.red('Telegram error:'), err.message);
    ctx.reply('❌ An error occurred. Please try again later.').catch(() => {});
});

// ============================================
//         START BOT
// ============================================

async function startBot() {
    console.log(chalk.cyan('\n🚀 Starting bot...\n'));

    // Make sure we are not in webhook mode and wipe stale updates
    await bot.telegram.deleteWebhook().catch(() => {});

    // Start Telegram bot
    try {
        await bot.launch({ dropPendingUpdates: true });
        console.log(chalk.green('✓ Telegram bot started\n'));
    } catch (error) {
        console.error(chalk.red('Failed to start Telegram bot:'), error.message);

        if (error.description?.includes('terminated by other getUpdates request') || error.message?.includes('terminated by other getUpdates request') || error.message?.includes('409')) {
            console.warn(chalk.yellow('⚠️  Telegram conflict detected. Attempting to resolve...'));
            
            // Try multiple times to resolve the conflict
            let retryCount = 0;
            const maxRetries = 3;
            const retryDelay = 10000; // 10 seconds
            
            while (retryCount < maxRetries) {
                try {
                    console.warn(chalk.yellow(`⚠️  Attempting to stop and restart bot (attempt ${retryCount + 1}/${maxRetries})...`));
                    await bot.stop();
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    await bot.launch({ dropPendingUpdates: true });
                    console.log(chalk.green('✓ Telegram bot started after conflict resolution\n'));
                    break;
                } catch (retryError) {
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        console.error(chalk.red('All retry attempts failed:'), retryError.message);
                        console.error(chalk.red('Please ensure no other bot instance is running with the same token.'));
                        process.exit(1);
                    }
                }
            }
        } else {
            process.exit(1);
        }
    }

    // Try to connect WhatsApp (will skip if no session exists)
    console.log(chalk.blue('📱 WhatsApp initialization...\n'));
    await startWhatsApp();
}

// ============================================
//         GRACEFUL SHUTDOWN
// ============================================

process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\n⏹️  Shutting down bot...\n'));
    
    // Stop ongoing pairing sessions
    if (activePairingSessions.size > 0) {
        console.log(chalk.yellow(`Closing ${activePairingSessions.size} pairing session(s)...`));
        activePairingSessions.forEach((session, id) => {
            try {
                session.socket?.ev?.removeAllListeners?.();
                session.socket?.socket?.close?.();
            } catch (e) {}
        });
        activePairingSessions.clear();
    }

    // Close WhatsApp connection
    if (zephy) {
        try {
            console.log(chalk.yellow('Closing WhatsApp connection...'));
            zephy.ev.removeAllListeners();
            zephy.socket?.close?.();
        } catch (error) {
            console.error('Error closing WhatsApp connection:', error.message);
        }
    }

    // Close Telegram bot
    try {
        bot.stop();
    } catch (error) {
        console.error('Error stopping Telegram bot:', error.message);
    }

    console.log(chalk.green('\n✓ Bot shutdown complete\n'));
    process.exit(0);
});

// ============================================
//         RUN BOT
// ============================================

startBot().catch(error => {
    console.error(chalk.red('Fatal error:'), error.message);
    process.exit(1);
});

module.exports = { bot, zephy, isWhatsAppConnected };
