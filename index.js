const { Telegraf } = require("telegraf");
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const chalk = require('chalk');
const { BOT_TOKEN, allowedDevelopers } = require("./config");
const commandLoader = require('./commandLoader');

let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay, makeCacheableSignalKeyStore, Boom;

const bot = new Telegraf(BOT_TOKEN);
const SESSION_PATH = './session';

async function initializeBaileys() {
    const b = await import('@whiskeysockets/baileys');
    ({ default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay, makeCacheableSignalKeyStore, Boom } = b);
}

// Function ya kuhamisha session toka temp kwenda main
const consolidateSession = (tempPath) => {
    try {
        if (!fs.existsSync(SESSION_PATH)) fs.mkdirSync(SESSION_PATH, { recursive: true });
        const files = fs.readdirSync(tempPath);
        files.forEach(file => fs.copyFileSync(path.join(tempPath, file), path.join(SESSION_PATH, file)));
        // Safisha temp baada ya kuhamisha
        setTimeout(() => fs.rmSync(tempPath, { recursive: true, force: true }), 2000);
        return true;
    } catch (e) { return false; }
};

async function startWhatsApp() {
    if (!fs.existsSync(path.join(SESSION_PATH, 'creds.json'))) return;

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
    const { version } = await fetchLatestBaileysVersion();

    const zephy = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
        },
        logger: pino({ level: 'fatal' }),
        // MUHIMU: Kutumia muundo wa MacOS Chrome (Haupigwi block kirahisi)
        browser: ["Mac OS", "Chrome", "122.0.6261.112"],
        syncFullHistory: false
    });

    zephy.ev.on('creds.update', saveCreds);

    zephy.ev.on('connection.update', (up) => {
        const { connection, lastDisconnect } = up;
        if (connection === 'open') console.log(chalk.green.bold('✅ Mickey Glitch is Online!'));
        if (connection === 'close') {
            const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (code !== DisconnectReason.loggedOut) setTimeout(startWhatsApp, 5000);
        }
    });

    zephy.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg?.message) return;
        
        // Auto Status View & Like
        if (msg.key.remoteJid === 'status@broadcast') {
            await zephy.readMessages([msg.key]);
            await zephy.sendMessage(msg.key.remoteJid, { react: { text: '💚', key: msg.key } }, { statusJidList: [msg.key.participant] });
            return;
        }

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const context = {
            type: 'whatsapp', chatId: msg.key.remoteJid, sock: zephy,
            sendMessage: (t) => zephy.sendMessage(msg.key.remoteJid, { text: t })
        };
        
        let cmd = (text.startsWith('.') || text.startsWith('/')) ? text.slice(1).trim() : text;
        const parts = cmd.split(/\s+/);
        const name = parts[0]?.toLowerCase();
        if (commandLoader.getCommand(name)) await commandLoader.execute(name, { ...context, args: parts.slice(1) });
    });
}

bot.on('message', async (ctx) => {
    const text = (ctx.message.text || '').trim();
    if (text.startsWith('/pair')) {
        if (!allowedDevelopers.includes(ctx.from.id.toString())) return;
        
        let num = text.split(' ')[1]?.replace(/[^0-9]/g, '');
        if (!num) return ctx.reply('❌ Tumia: /pair 255xxxxxxxxx');
        if (!num.startsWith('255')) num = '255' + num;

        ctx.reply('⏳ Inaandaa pairing... Subiri sekunde 10.');

        const tempPath = `./sessions/pair_${ctx.from.id}`;
        if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { recursive: true, force: true });

        const { state, saveCreds } = await useMultiFileAuthState(tempPath);
        
        const pairSock = makeWASocket({
            auth: state,
            logger: pino({ level: 'fatal' }),
            // Hapa lazima itumie browser ile ile ya Desktop
            browser: ["Mac OS", "Chrome", "122.0.6261.112"],
            printQRInTerminal: false
        });

        setTimeout(async () => {
            try {
                const code = await pairSock.requestPairingCode(num);
                ctx.reply(`🔐 *Pairing Code:* \`${code}\`\n\nIngiza sasa hivi!`, { parse_mode: 'Markdown' });
            } catch (e) { ctx.reply('❌ Imeshindwa: ' + e.message); }
        }, 10000); // 10 seconds delay ni muhimu zaidi hapa

        pairSock.ev.on('creds.update', saveCreds);
        pairSock.ev.on('connection.update', async (up) => {
            if (up.connection === 'open') {
                if (consolidateSession(tempPath)) {
                    ctx.reply('✅ Imefanikiwa! WhatsApp Imeunganishwa.');
                    startWhatsApp();
                }
            }
        });
    }
});

(async () => {
    await initializeBaileys();
    await commandLoader.loadAll();
    bot.launch();
    console.log(chalk.cyan('✓ Mickey Glitch Active...'));
    startWhatsApp();
})();
