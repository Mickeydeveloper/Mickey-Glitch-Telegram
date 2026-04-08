require('dotenv').config()
require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const { exec } = require('child_process')
const TelegramBot = require('node-telegram-bot-api') // Library ya Telegram
const { handleMessages, handleStatus } = require('./main')

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")

const NodeCache = require("node-cache")
const pino = require("pino")

// ====================== CONFIG ======================
global.botname = "𝙼𝚒𝚌𝚔𝚎𝚈 𝙶𝚕𝚒𝚝𝚌𝚑™"
const TG_TOKEN = process.env.TG_TOKEN || 'WEKA_TOKEN_YAKO_HAPA' // Token kutoka BotFather
const tgBot = new TelegramBot(TG_TOKEN, { polling: true })

const channelRD = {
    id: '120363398106360290@newsletter',
    name: '🅼🅸🅲🅺🅴🆈'
}

global.commands = new Map()

// ====================== AUTO COMMAND LOADER ======================
const loadCommands = () => {
    const commandsPath = path.join(__dirname, 'commands')
    if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath)
    const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))
    for (const file of files) {
        try {
            const command = require(`./commands/${file}`)
            if (command.name) {
                global.commands.set(command.name, command)
                if (command.alias) command.alias.forEach(a => global.commands.set(a, command))
            }
        } catch (e) { console.log(chalk.red(`❌ Error loading ${file}: ${e.message}`)) }
    }
    console.log(chalk.greenBright(`✨ Loaded ${global.commands.size} commands!`))
}

// ====================== CLEANERS & UPDATER ======================
const autoUpdate = () => {
    exec('git pull', (err, stdout) => {
        if (stdout && !stdout.includes('Already up to date.')) process.exit(0)
    })
}

const cleanFiles = () => {
    const folders = ['./tmp', './temp']
    folders.forEach(dir => {
        if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach(f => { try { fs.unlinkSync(path.join(dir, f)) } catch {} })
        }
    })
    // Clean old session files (Keep creds.json)
    const sess = './session'
    if (fs.existsSync(sess)) {
        fs.readdirSync(sess).forEach(f => {
            if (f !== 'creds.json' && (Date.now() - fs.statSync(path.join(sess, f)).mtimeMs > 86400000)) {
                try { fs.unlinkSync(path.join(sess, f)) } catch {}
            }
        })
    }
}
setInterval(cleanFiles, 3600000)

// ====================== SUPPRESS ERRORS ======================
console.error = (orig => (...args) => {
    if (!args.join(' ').match(/Bad MAC|verifyMAC|closed session/)) orig.apply(console, args)
})(console.error)

// ====================== BOT START ======================
async function startMickeyBot() {
    autoUpdate()
    loadCommands()

    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'fatal' }),
        printQRInTerminal: false, // Tunatumia Pairing Code pekee
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
        },
        getMessage: async (key) => {
            return (await require('./lib/lightweight_store').loadMessage(jidNormalizedUser(key.remoteJid), key.id))?.message || undefined
        }
    })

    // ====================== TELEGRAM PAIRING LOGIC ======================
    tgBot.onText(/\/start/, (msg) => {
        tgBot.sendMessage(msg.chat.id, `👋 Hello ${msg.from.first_name}!\n\nNitumie namba yako ya simu iliyopo WhatsApp ili nikupe Pairing Code.\n\nMfano: \`255615858685\``, { parse_mode: 'Markdown' })
    })

    tgBot.on('message', async (msg) => {
        const text = msg.text
        if (text && /^\d+$/.test(text) && !sock.authState.creds.registered) {
            let number = text.replace(/[^0-9]/g, '')
            if (!number.startsWith('255')) number = '255' + number
            
            try {
                tgBot.sendMessage(msg.chat.id, `⏳ Inatengeneza code kwa namba: ${number}...`)
                await delay(2000)
                let code = await sock.requestPairingCode(number, "MICKDADY")
                tgBot.sendMessage(msg.chat.id, `✅ **PAIRING CODE YAKO:**\n\n\`${code}\`\n\nFungua WhatsApp > Linked Devices > Link with phone number alafu uweke hiyo code.`, { parse_mode: 'Markdown' })
            } catch (e) {
                tgBot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`)
            }
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async chatUpdate => {
        const mek = chatUpdate.messages[0]
        if (!mek || !mek.message) return
        if (mek.key.remoteJid === 'status@broadcast') return await handleStatus(sock, chatUpdate)

        const forwardContext = {
            isForwarded: true,
            forwardingScore: 999,
            forwardedNewsletterMessageInfo: { newsletterJid: channelRD.id, newsletterName: channelRD.name },
            externalAdReply: {
                title: `ᴍɪᴄᴋᴇʏ ɢʟɪᴛᴄʜ ᴠ3.1.0`,
                body: `Telegram Pairing Active`,
                thumbnailUrl: 'https://files.catbox.moe/jwdiuc.jpg',
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
        await handleMessages(sock, chatUpdate, true, forwardContext)
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'open') {
            console.log(chalk.bgGreen.black(' ✨ MICKEY CONNECTED SUCCESSFULLY ✨ '))
            tgBot.sendMessage(process.env.TG_CHAT_ID, "🚀 **Bot yako ipo Online sasa hivi!**")
        }
        if (connection === 'close') {
            if (new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut) startMickeyBot()
        }
    })
}

startMickeyBot()
