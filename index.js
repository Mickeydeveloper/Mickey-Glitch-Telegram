const { Telegraf, Markup } = require("telegraf");
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const chalk = require('chalk');
const { Boom } = require('@hapi/boom');

// Hii ndio npm ya buttons uliyotaja
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
        printQRInTerminal: false // Tunatumia Pairing Code mara nyingi
    });

    zephy.ev.on('creds.update', saveCreds);

    zephy.ev.on('connection.update', async (up) => {
        const { connection, lastDisconnect } = up;
        
        if (connection === 'open') {
            console.log(chalk.green("✅ WhatsApp Connected!"));
            
            // UJUMBE WA MAFANIKIO UKIWA NA BUTTONS (Kutumia gifted-btns logic)
            const buttons = [
                { buttonId: "ping", buttonText: { displayText: "⚡ SPEED TEST" }, type: 1 },
                { buttonId: "menu", buttonText: { displayText: "📜 MAIN MENU" }, type: 1 }
            ];

            await zephy.sendMessage(zephy.user.id, {
                text: `✅ *MICKEY GLITCH CONNECTED*\n\nBot imefanikiwa kujiunga na WhatsApp yako. Unaweza kuanza kutumia commands sasa.`,
                footer: "©2026 Mickey Labs™",
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

        // --- BUTTON HANDLER (MSIKILIZAJI) ---
        let selectionId = msg.message.buttonsResponseMessage?.selectedButtonId || 
                          msg.message.listResponseMessage?.singleSelectReply?.selectedRowId || 
                          msg.message.templateButtonReplyMessage?.selectedId || null;

        // --- TEXT COMMAND HANDLER ---
        let text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        let input = selectionId || text; // Kama ni button, chukua selectionId kama command

        if (input.startsWith('.') || input.startsWith('/') || selectionId) {
            const cleanText = input.startsWith('.') || input.startsWith('/') ? input.slice(1) : input;
            const args = cleanText.trim().split(/\s+/);
            const commandName = args.shift().toLowerCase();

            // FIX: Handling Git Download moja kwa moja hapa kuzuia error
            if (commandName.startsWith('gitdl_zip_')) {
                const parts = commandName.split('_');
                const user = parts[2];
                const repo = parts[3];
                const zipUrl = `https://github.com/${user}/${repo}/archive/refs/heads/main.zip`;
                return await zephy.sendMessage(chatId, { 
                    document: { url: zipUrl }, 
                    fileName: `${repo}.zip`, 
                    mimetype: 'application/zip'
                }, { quoted: msg });
            }

            const context = {
                sock: zephy,
                chatId,
                userId,
                msg,
                args,
                reply: (t) => zephy.sendMessage(chatId, { text: t }, { quoted: msg })
            };

            await commandLoader.execute(commandName, context);
        }
    });
}

// ====================== TELEGRAM ENGINE ======================
// FIX: Kutumia bot.command kwa ajili ya commands maalum kama /pair
bot.command(['pair', 'start'], async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const context = {
        type: 'telegram',
        chatId: ctx.chat.id,
        userId: ctx.from.id.toString(),
        ctx,
        args,
        reply: (t) => ctx.reply(t)
    };
    await commandLoader.execute('pair', context);
});

// Msikilizaji wa ujumbe wa kawaida wa Telegram
bot.on('message', async (ctx) => {
    const text = ctx.message.text || '';
    if (text.startsWith('.') || text.startsWith('/')) {
        const cleanText = text.slice(1);
        const args = cleanText.trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const context = {
            type: 'telegram',
            chatId: ctx.chat.id,
            userId: ctx.from.id.toString(),
            ctx,
            args,
            reply: (t) => ctx.reply(t)
        };

        await commandLoader.execute(commandName, context);
    }
});

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data.startsWith('gitdl_zip_')) {
        const parts = data.split('_');
        const user = parts[2];
        const repo = parts[3];
        await ctx.replyWithDocument({ url: `https://github.com/${user}/${repo}/archive/refs/heads/main.zip`, filename: `${repo}.zip` });
    }
    await ctx.answerCbQuery();
});

// ====================== LAUNCH ======================
(async () => {
    await initializeBaileys();
    await commandLoader.loadAll();

    bot.launch().then(() => console.log(chalk.blue('✓ Mickey Telegram Active')));
    startWhatsApp();
})();
