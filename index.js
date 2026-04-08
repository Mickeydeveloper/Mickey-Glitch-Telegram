require('dotenv').config()
require('./settings') // Inasoma global.tg_token na global.pairing_code
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const { exec } = require('child_process')
const TelegramBot = require('node-telegram-bot-api')
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
const readline = require("readline")

// ====================== GLOBAL CONFIG ======================
global.botname = "𝙼𝚒𝚌𝚔𝚎𝚈 𝙶𝚕𝚒𝚝𝚌𝚑™"
const channelRD = {
    id: '120363398106360290@newsletter',
    name: '🅼🅸🅲🅺🅴🆈'
}

// Inazindua Telegram Bot kwa kutumia token iliyo kwenye config
const tgBot = new TelegramBot(global.tg_token, { polling: true })
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
    console.log(chalk.greenBright(`✨ Loaded ${global.commands.size} commands successfully!`))
}

// ====================== AUTO-UPDATE SYSTEM ======================
const autoUpdate = () => {
    exec('git pull', (err, stdout) => {
        if (stdout && !stdout.includes('Already up to date.')) {
            console.log(chalk.bgGreen.black('🚀 Update mpya imepatikana! Restarting...'))
            process.exit(0)
        }
    })
}

// ====================== CLEANERS ======================
const cleanFiles = () => {
    const folders = ['./tmp', './temp']
    folders.forEach(dir => {
        if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach(f => { try { fs.unlinkSync(path.join(dir, f)) } catch {} })
        }
    })
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

// ====================== SUPPRESS NOISE ======================
const originalConsoleError = console.error
console.error = function (...args) {
    const msg = args.join(' ')
    if (msg.includes('Bad MAC') || msg.includes('verifyMAC') || msg.includes('Failed to decrypt') || msg.includes('session closed')) return
    originalConsoleError.apply(console, args)
}

// ====================== UI BOX ======================
const printBox = (title, content, bgColor = chalk.bgCyan, textColor = chalk.white) => {
    const maxLen = Math.max(title.length, content.length) + 8
    const topBottom = '═'.repeat(maxLen)
    const paddedTitle = ' '.repeat(Math.floor((maxLen - title.length) / 2)) + title
    const paddedContent = ' '.repeat(Math.floor((maxLen - content.length) / 2)) + content
    console.log(bgColor(`╔${topBottom}╗`))
    console.log(bgColor(`║${paddedTitle}║`))
    console.log(bgColor(`╠${topBottom}╣`))
    console.log(textColor(`║${paddedContent}║`))
    console.log(bgColor(`╚${topBottom}╝\n`))
}

// ====================== BOT START ======================
async function startMickeyBot() {
    autoUpdate()
    loadCommands()

    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const { version } = await fetchLatestBaileysVersion()

    printBox("INITIALIZING BOT", "Mickey Glitch ™ Starting...", chalk.bgMagenta, chalk.whiteBright)

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'fatal' }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
        },
        markOnlineOnConnect: true,
        getMessage: async (key) => {
            return (await require('./lib/lightweight_store').loadMessage(jidNormalizedUser(key.remoteJid), key.id))?.message || undefined
        }
    })

    // TELEGRAM PAIRING LOGIC
    tgBot.onText(/\/start/, (msg) => {
        tgBot.sendMessage(msg.chat.id, `👋 Hello *${msg.from.first_name}*!\n\nNitumie namba yako ya WhatsApp kupata Pairing Code.\nMfano: \`255615858685\``, { parse_mode: 'Markdown' })
    })

    tgBot.on('message', async (msg) => {
        const text = msg.text
        if (text && /^\d+$/.test(text) && !sock.authState.creds.registered) {
            let number = text.replace(/[^0-9]/g, '')
            if (!number.startsWith('255')) number = '255' + number
            
            try {
                tgBot.sendMessage(msg.chat.id, `⏳ Inatengeneza code kwa ${number}...`)
                let code = await sock.requestPairingCode(number, global.pairing_code)
                tgBot.sendMessage(msg.chat.id, `✅ **CODE YAKO:** \`${code}\``, { parse_mode: 'Markdown' })
            } catch (e) { tgBot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`) }
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
        if (connection === 'open') printBox("BOT CONNECTED", "✨ Online & Ready (TG Pairing) ✨", chalk.bgGreen, chalk.black)
        if (connection === 'close') {
            if (new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut) setTimeout(() => startMickeyBot(), 5000)
        }
    })
}

startMickeyBot()
