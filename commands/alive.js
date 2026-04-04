const os = require('os');
const moment = require('moment-timezone');

// Pata muda bot ilipoanza (Global to this file)
const startTime = Date.now();

// Ingiza ma-owner toka config
const { allowedDevelopers } = require('../config');

// Function ya kugeuza milisec kuwa masaa/dakika
const formatUptime = (ms) => {
    let s = Math.floor(ms / 1000);
    let m = Math.floor(s / 60);
    let h = Math.floor(m / 60);
    let d = Math.floor(h / 24);
    h %= 24; m %= 60; s %= 60;
    return `${d > 0 ? d + 'd ' : ''}${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
};

module.exports = {
    name: 'alive',
    description: 'Check if bot is alive and show system info',
    aliases: ['uptime', 'status', 'ping'],
    category: 'misc',

    async execute(context) {
        try {
            const { type, sendMessage, userId, sock, chatId } = context;

            // 1. Mahesabu ya Uptime
            const botUptime = formatUptime(Date.now() - startTime);
            const sysUptime = formatUptime(os.uptime() * 1000);

            // 2. RAM Usage
            const usedMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2); // GB

            // 3. Current Time
            const timeTz = moment().tz('Africa/Dar_es_Salaam').format('HH:mm:ss');

            // 4. Check kama ni Owner
            const isOwner = allowedDevelopers.includes(userId?.toString());

            // 5. Build Response
            let response = `✨ *MICKEY GLITCH IS ALIVE* ✨\n\n`;
            response += `🚀 *Bot Uptime:* ${botUptime}\n`;
            response += `📟 *System Uptime:* ${sysUptime}\n`;
            response += `⏰ *Time (EAT):* ${timeTz}\n`;
            response += `💾 *RAM Used:* ${usedMem} MB\n`;
            response += `🖥️ *Total RAM:* ${totalMem} GB\n`;
            response += `⚙️ *Node JS:* ${process.version}\n`;
            response += `📱 *Platform:* ${type.toUpperCase()}\n`;

            if (isOwner) {
                response += `\n👑 *DEVELOPER ACCESS:* ✅\n`;
                response += `🆔 *Your ID:* \`${userId}\`\n`;
            }

            response += `\n_Bot is running perfectly on ${os.platform()}!_`;

            // Kutuma na picha kama ni WhatsApp kwa muonekano mzuri (Optional)
            if (type === 'whatsapp') {
                await sock.sendMessage(chatId, {
                    text: response,
                    contextInfo: {
                        externalAdReply: {
                            title: "Mickey Glitch v5.0.0",
                            body: "System Status: Online",
                            thumbnailUrl: "https://files.catbox.moe/jwdiuc.jpg",
                            sourceUrl: "https://whatsapp.com/channel/0029VajVv9sEwEjw9T9S0C26",
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: context.msg });
            } else {
                await sendMessage(response);
            }

        } catch (error) {
            console.error("Alive Error:", error);
            await context.sendMessage(`❌ Error: ${error.message}`);
        }
    }
};
