const { Telegraf, Markup } = require("telegraf");
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const chalk = require('chalk');
const { Boom } = require('@hapi/boom');
const { GiftedButtons } = require("gifted-btns"); 

let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay, makeCacheableSignalKeyStore, jidDecode;

const { BOT_TOKEN, allowedDevelopers } = require("./config");
const commandLoader = require('./commandLoader');

const bot = new Telegraf(BOT_TOKEN);
const SESSION_PATH = './session';

async function initializeBaileys() {
    const b = await import('@whiskeysockets/baileys');
    ({ default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay, makeCacheableSignalKeyStore, jidDecode } = b);
}

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
        browser: ["Mickey-Glitch", "Chrome", "20.0.04"]
    });

    zephy.ev.on('creds.update', saveCreds);

    zephy.ev.on('connection.update', async (up) => {
        const { connection, lastDisconnect } = up;
        if (connection === 'open') {
            console.log(chalk.green("✅ WhatsApp Connected!"));
            // Ujumbe wa kwanza kuji-tag mwenyewe (Success notification)
            const buttons = [
                { buttonId: "menu", buttonText: { displayText: "📜 MENU" }, type: 1 }
            ];
            await zephy.sendMessage(zephy.user.id, {
                text: "✅ *MICKEY GLITCH IS ACTIVE*",
                footer: "Powered by Mickey Dev",
                buttons: buttons,
                headerType: 1
            });
        }
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

        let selectionId = msg.message.buttonsResponseMessage?.selectedButtonId || 
                          msg.message.listResponseMessage?.singleSelectReply?.selectedRowId || 
                          msg.message.templateButtonReplyMessage?.selectedId || null;

        let text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        let input = selectionId || text;

        if (input.startsWith('.') || input.startsWith('/') || selectionId) {
            const cleanText = (input.startsWith('.') || input.startsWith('/')) ? input.slice(1) : input;
            const args = cleanText.trim().split(/\s+/);
            const commandName = args.shift().toLowerCase();

            // 🔥 FIX: Tunatengeneza 'context' yenye vigezo vyote kuzuia error za 'undefined'
            const context = {
                sock: zephy,
                chatId,
                userId,
                msg,
                args,
                // Support zote mbili (Backwards Compatibility)
                sendMessage: (t) => zephy.sendMessage(chatId, { text: t }, { quoted: msg }),
                reply: (t) => zephy.sendMessage(chatId, { text: t }, { quoted: msg })
            };

            await commandLoader.execute(commandName, context);
        }
    });
}

// ====================== TELEGRAM ENGINE ======================
bot.command(['pair', 'start'], async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const context = {
        type: 'telegram',
        chatId: ctx.chat.id,
        userId: ctx.from.id.toString(),
        ctx,
        args,
        sendMessage: (t) => ctx.reply(t),
        reply: (t) => ctx.reply(t)
    };
    await commandLoader.execute('pair', context);
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
            sendMessage: (t) => ctx.reply(t),
            reply: (t) => ctx.reply(t)
        };

        await commandLoader.execute(commandName, context);
    }
});

// ====================== LAUNCH ======================
(async () => {
    await initializeBaileys();
    await commandLoader.loadAll();
    bot.launch().then(() => console.log(chalk.blue('✓ Mickey Telegram Active')));
    startWhatsApp();
})();
