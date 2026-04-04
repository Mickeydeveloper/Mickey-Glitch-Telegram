const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    jidDecode, 
    delay 
} = require("@whiskeysockets/baileys");
const { Telegraf } = require("telegraf");
const pino = require('pino');
const chalk = require('chalk');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

// Configuration (Hakikisha file hili lipo au weka data zako hapa)
const { BOT_TOKEN } = require("./config");
const commandLoader = require('./commandLoader');

const bot = new Telegraf(BOT_TOKEN);
const SESSION_PATH = './session';

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
        printQRInTerminal: false // Tunatumia Pairing Code
    });

    zephy.ev.on('creds.update', saveCreds);

    zephy.ev.on('connection.update', async (up) => {
        const { connection, lastDisconnect } = up;
        if (connection === 'open') {
            console.log(chalk.green("✅ WhatsApp Connected!"));
            await zephy.sendMessage(zephy.user.id, { text: "🚀 *MICKEY GLITCH IS LIVE & CONNECTED*" });
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
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // --- PAIR COMMAND LOGIC (NDANI YA INDEX) ---
        if (text.startsWith('.pair') || text.startsWith('/pair')) {
            const args = text.split(/\s+/).slice(1);
            const phoneNumber = args[0]?.replace(/[^0-9]/g, '');

            if (!phoneNumber) {
                return zephy.sendMessage(chatId, { text: "❌ Weka namba ya simu!\n*Mfano:* .pair 2557XXXXXXXX" }, { quoted: msg });
            }

            try {
                await zephy.sendMessage(chatId, { text: `⏳ _Tafadhali subiri, Mickey Glitch inatengeneza code kwa ${phoneNumber}..._` });
                let code = await zephy.requestPairingCode(phoneNumber);
                
                let pairMsg = `✨ *MICKEY PAIRING CODE* ✨\n\n`;
                pairMsg += `📱 *Namba:* ${phoneNumber}\n`;
                pairMsg += `🔐 *Code:* *${code}*\n\n`;
                pairMsg += `_Nenda WhatsApp Settings > Linked Devices > Link with phone number kisha weka hiyo code._`;

                return await zephy.sendMessage(chatId, { text: pairMsg }, { quoted: msg });
            } catch (e) {
                return zephy.sendMessage(chatId, { text: `❌ Error: ${e.message}` });
            }
        }

        // --- NYINGINEZO (KUPITIA COMMANDLOADER) ---
        if (text.startsWith('.') || text.startsWith('/')) {
            const args = text.slice(1).trim().split(/\s+/);
            const commandName = args.shift().toLowerCase();

            const conText = {
                sock: zephy,
                Loftxmd: zephy,
                chatId,
                userId,
                msg,
                args,
                reply: (t) => zephy.sendMessage(chatId, { text: t }, { quoted: msg }),
                sender: userId
            };

            await commandLoader.execute(commandName, conText);
        }
    });
}

// ====================== TELEGRAM ENGINE ======================
bot.on('message', async (ctx) => {
    const text = ctx.message.text || '';
    
    // logic ya /pair kwa Telegram
    if (text.startsWith('/pair') || text.startsWith('.pair')) {
        const args = text.split(/\s+/).slice(1);
        const phoneNumber = args[0]?.replace(/[^0-9]/g, '');

        if (!phoneNumber) {
            return ctx.reply("❌ Weka namba ya simu!\n*Usage:* /pair 2557XXXXXXXX");
        }

        // Hapa Telegram inatuma request kwenye system ya WhatsApp ili ipate code
        // Kumbuka: Lazima kwanza uanzishe startWhatsApp()
        ctx.reply(`⏳ Inatengeneza code kwa ${phoneNumber}... tafadhali tumia WhatsApp bot kupata code kamili.`);
        // Hapa unaweza kuita function maalum kama unataka iwe fully automated
    }

    // Commands nyingine za Telegram
    if (text.startsWith('.') || text.startsWith('/')) {
        const args = text.slice(1).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const conText = {
            type: 'telegram',
            chatId: ctx.chat.id,
            userId: ctx.from.id.toString(),
            ctx,
            args,
            reply: (t) => ctx.reply(t),
            sender: ctx.from.id.toString()
        };

        await commandLoader.execute(commandName, conText);
    }
});

// ====================== LAUNCH ======================
(async () => {
    try {
        console.log(chalk.yellow("🛠️ Mickey Glitch Inawaka..."));
        await commandLoader.loadAll();
        
        bot.launch().then(() => console.log(chalk.blue('✓ Mickey Telegram Active')));
        
        await startWhatsApp();
    } catch (e) {
        console.error(chalk.red("✗ Error wakati wa kuwasha:"), e);
    }
})();

// Anti-Crash (Muhimu kwa server za Katabump)
process.on('uncaughtException', (err) => console.error('Caught exception: ', err));
process.on('unhandledRejection', (reason, p) => console.error('Unhandled Rejection at: Promise', p, 'reason:', reason));
