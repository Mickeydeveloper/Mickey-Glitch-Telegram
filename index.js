const { Telegraf } = require("telegraf");
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const chalk = require('chalk');
const { Boom } = require('@hapi/boom'); // Fix: Import Boom hivi
const { BOT_TOKEN, allowedDevelopers } = require("./config");
const commandLoader = require('./commandLoader');

let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay, makeCacheableSignalKeyStore;

const bot = new Telegraf(BOT_TOKEN);
const SESSION_PATH = './session';

async function initializeBaileys() {
    const b = await import('@whiskeysockets/baileys');
    ({ default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay, makeCacheableSignalKeyStore } = b);
}

// ====================== UTILS ======================
const printBox = (title, content, bgColor = chalk.bgCyan, textColor = chalk.white) => {
    const maxLen = Math.max(title.length, content.length) + 10;
    console.log(bgColor(`╔${'═'.repeat(maxLen)}╗`));
    console.log(bgColor(`║   ${title.padEnd(maxLen - 3)}║`));
    console.log(bgColor(`╠${'═'.repeat(maxLen)}╣`));
    console.log(textColor(`║   ${content.padEnd(maxLen - 3)}║`));
    console.log(bgColor(`╚${'═'.repeat(maxLen)}╝\n`));
};

// ====================== MAIN BOT ENGINE ======================
async function startWhatsApp() {
    const credsFile = path.join(SESSION_PATH, 'creds.json');
    if (!fs.existsSync(credsFile)) return;

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
    const { version } = await fetchLatestBaileysVersion();

    const zephy = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
        },
        logger: pino({ level: 'fatal' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        markOnlineOnConnect: true
    });

    zephy.ev.on('creds.update', saveCreds);

    zephy.ev.on('connection.update', async (up) => {
        const { connection, lastDisconnect } = up;
        if (connection === 'open') {
            printBox("ONLINE", "Mickey Glitch Connected!", chalk.bgGreen, chalk.black);
        }
        if (connection === 'close') {
            // Fix: Check Boom correctly
            const isLoggedOut = lastDisconnect?.error instanceof Boom 
                ? lastDisconnect.error.output.statusCode === DisconnectReason.loggedOut 
                : false;

            if (!isLoggedOut) {
                console.log(chalk.yellow("🔄 Reconnecting WhatsApp..."));
                setTimeout(startWhatsApp, 5000);
            }
        }
    });

    zephy.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg?.message || msg.key.remoteJid === 'status@broadcast') return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const context = { type: 'whatsapp', chatId: msg.key.remoteJid, sock: zephy, sendMessage: (t) => zephy.sendMessage(msg.key.remoteJid, { text: t }) };
        let cmd = (text.startsWith('.') || text.startsWith('/')) ? text.slice(1).trim() : text;
        const parts = cmd.split(/\s+/);
        if (commandLoader.getCommand(parts[0]?.toLowerCase())) await commandLoader.execute(parts[0].toLowerCase(), { ...context, args: parts.slice(1) });
    });
}

// ====================== PAIRING ENGINE ======================
async function startPairing(ctx, num, tempPath) {
    const { state, saveCreds } = await useMultiFileAuthState(tempPath);
    
    const pairSock = makeWASocket({
        auth: state,
        logger: pino({ level: 'error' }), 
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        printQRInTerminal: false,
        connectTimeoutMs: 60000
    });

    pairSock.ev.on('creds.update', saveCreds);

    pairSock.ev.on('connection.update', async (up) => {
        const { connection, lastDisconnect } = up;

        if (connection === 'open') {
            printBox("SYNCING", "Finalizing Session...", chalk.bgBlue, chalk.white);
            await delay(3000);
            await saveCreds();

            if (!fs.existsSync(SESSION_PATH)) fs.mkdirSync(SESSION_PATH, { recursive: true });
            const files = fs.readdirSync(tempPath);
            for (const f of files) {
                fs.copyFileSync(path.join(tempPath, f), path.join(SESSION_PATH, f));
            }

            await ctx.reply('✅ *Connected!* Inawasha bot sasa...');
            
            try { pairSock.end(); } catch (e) {}
            fs.rmSync(tempPath, { recursive: true, force: true });
            setTimeout(startWhatsApp, 2000);
        }

        if (connection === 'close') {
            const isLoggedOut = lastDisconnect?.error instanceof Boom 
                ? lastDisconnect.error.output.statusCode === DisconnectReason.loggedOut 
                : false;

            if (!isLoggedOut && !fs.existsSync(SESSION_PATH)) {
                console.log(chalk.yellow("🔄 Re-attempting pairing connection..."));
                setTimeout(() => startPairing(ctx, num, tempPath), 5000);
            }
        }
    });

    if (!state.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await pairSock.requestPairingCode(num);
                await ctx.reply(`🔐 *Pairing Code:* \`${code}\`\n\nIngiza sasa kwenye WhatsApp yako.`);
            } catch (e) {
                console.error(chalk.red("Pairing Request Fail:"), e.message);
            }
        }, 5000);
    }
}

bot.on('message', async (ctx) => {
    const text = (ctx.message.text || '').trim();
    if (text.startsWith('/pair')) {
        if (!allowedDevelopers.includes(ctx.from.id.toString())) return;
        let num = text.split(' ')[1]?.replace(/[^0-9]/g, '');
        if (!num) return ctx.reply('❌ Format: /pair 255xxxxxxxxx');
        
        const tempPath = `./sessions/pair_${ctx.from.id}`;
        if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { recursive: true, force: true });
        
        ctx.reply('⏳ Requesting Pairing Code...');
        startPairing(ctx, num, tempPath);
    }
});

// Anti-Crash Process Handlers
process.on('uncaughtException', (err) => {
    if (err.message.includes('Boom')) return; // Ignore boom errors
    console.error(chalk.red('Caught exception: '), err);
});

(async () => {
    await initializeBaileys();
    await commandLoader.loadAll();
    bot.launch();
    console.log(chalk.cyan('✓ Mickey Glitch Active (Telegram)'));
    startWhatsApp();
})();
