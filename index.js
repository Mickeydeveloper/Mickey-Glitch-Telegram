const { Telegraf } = require("telegraf");
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const chalk = require('chalk');
const { Boom } = require('@hapi/boom');
const { BOT_TOKEN, allowedDevelopers } = require("./config");
const commandLoader = require('./commandLoader');

let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay, makeCacheableSignalKeyStore, jidDecode;

const bot = new Telegraf(BOT_TOKEN);
const SESSION_PATH = './session';

async function initializeBaileys() {
    const b = await import('@whiskeysockets/baileys');
    ({ default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay, makeCacheableSignalKeyStore, jidDecode } = b);
}

// ====================== HELPER: DECODE JID ======================
const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return decode.user && decode.server && decode.user + '@' + decode.server || jid;
    }
    return jid;
};

// ====================== WHATSAPP ENGINE ======================
async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
    const { version } = await fetchLatestBaileysVersion();

    const zephy = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
        },
        logger: pino({ level: 'fatal' }),
        browser: ["Mickey-Glitch", "Chrome", "20.0.04"],
        printQRInTerminal: true
    });

    zephy.ev.on('creds.update', saveCreds);

    zephy.ev.on('connection.update', async (up) => {
        const { connection, lastDisconnect } = up;
        if (connection === 'open') console.log(chalk.green("✅ WhatsApp Connected!"));
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            if (reason !== DisconnectReason.loggedOut) startWhatsApp();
        }
    });

    zephy.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

        const chatId = msg.key.remoteJid;
        const userId = decodeJid(msg.key.participant || msg.key.remoteJid);
        
        // --- BUTTON HANDLER (MSIKILIZAJI WA BUTTONS) ---
        let selectionId = msg.message.buttonsResponseMessage?.selectedButtonId || 
                          msg.message.listResponseMessage?.singleSelectReply?.selectedRowId || 
                          msg.message.templateButtonReplyMessage?.selectedId;

        if (selectionId) {
            console.log(chalk.cyan(`[BUTTON] Clicked: ${selectionId}`));
            
            // Logic ya Git Downloader
            if (selectionId.startsWith('gitdl_zip_')) {
                const [, , user, repo] = selectionId.split('_');
                const zipUrl = `https://github.com/${user}/${repo}/archive/refs/heads/main.zip`;
                await zephy.sendMessage(chatId, { 
                    document: { url: zipUrl }, 
                    fileName: `${repo}.zip`, 
                    mimetype: 'application/zip',
                    caption: `✅ ZIP ya repo *${repo}* imetayarishwa.`
                }, { quoted: msg });
                return;
            }
        }

        // --- COMMAND HANDLER ---
        let text = msg.message.conversation || msg.message.extendedTextMessage?.text || selectionId || '';
        if (text.startsWith('.') || text.startsWith('/')) {
            const args = text.slice(1).trim().split(/\s+/);
            const commandName = args.shift().toLowerCase();
            
            const context = {
                type: 'whatsapp',
                chatId,
                userId,
                sock: zephy,
                msg,
                args,
                sendMessage: (t) => zephy.sendMessage(chatId, { text: t }, { quoted: msg })
            };

            await commandLoader.execute(commandName, context);
        }
    });
}

// ====================== TELEGRAM ENGINE ======================
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data.startsWith('gitdl_zip_')) {
        const [, , user, repo] = data.split('_');
        const zipUrl = `https://github.com/${user}/${repo}/archive/refs/heads/main.zip`;
        await ctx.replyWithDocument({ url: zipUrl, filename: `${repo}.zip` });
    }
    await ctx.answerCbQuery();
});

bot.on('message', async (ctx) => {
    const text = ctx.message.text || '';
    if (text.startsWith('.') || text.startsWith('/')) {
        const args = text.slice(1).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const context = {
            type: 'telegram',
            chatId: ctx.chat.id,
            userId: ctx.from.id.toString(),
            ctx,
            args,
            sendMessage: (t) => ctx.reply(t)
        };

        await commandLoader.execute(commandName, context);
    }
});

// ====================== LAUNCH ======================
(async () => {
    await initializeBaileys();
    await commandLoader.loadAll();
    
    // Start Telegram
    bot.launch().then(() => console.log(chalk.blue('✓ Mickey Telegram Active')));
    
    // Start WhatsApp
    startWhatsApp();
})();
