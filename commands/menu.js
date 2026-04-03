const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

/**
 * Mfumo wa kusoma commands automatic kutoka kwenye folder
 */
function getCommandsInfo() {
    try {
        const commandsPath = path.join(__dirname, '../commands'); 
        const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        const commandList = [];
        files.forEach(file => {
            try {
                const cmd = require(path.join(commandsPath, file));
                commandList.push({
                    name: cmd.name || file.replace('.js', ''),
                    category: cmd.category || '📂 NYINGINEZO'
                });
            } catch (e) {}
        });
        return commandList;
    } catch (e) { return []; }
}

module.exports = {
    name: 'menu',
    description: 'Main menu with Interactive Buttons',
    aliases: ['help', 'h', 'msaada'],
    category: 'utilities',

    async execute(context) {
        const { zephy, chatId, message, pushName } = context;
        // Tunahitaji generateWAMessageFromContent na proto kutoka Baileys
        const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

        try {
            const botName = 'MICKEY GLITCH';
            const timeStr = moment().tz('Africa/Dar_es_Salaam').format('HH:mm:ss');
            const dateStr = moment().tz('Africa/Dar_es_Salaam').format('ddd, MMM D');
            
            const allCmds = getCommandsInfo();
            const categorized = {};
            allCmds.forEach(cmd => {
                if (!categorized[cmd.category]) categorized[cmd.category] = [];
                categorized[cmd.category].push(cmd.name);
            });

            // --- JENGA TEXT YA MENU ---
            let menuBody = `✨ *${botName} V3.0* ✨\n\n`;
            menuBody += `┌  👋 *Habari:* ${pushName}\n`;
            menuBody += `│  🕒 *Muda:* ${timeStr} EAT\n`;
            menuBody += `│  📅 *Tarehe:* ${dateStr}\n`;
            menuBody += `│  📦 *Amri:* ${allCmds.length} Total\n`;
            menuBody += `└────────────────────┘\n\n`;

            Object.entries(categorized).forEach(([cat, cmds]) => {
                menuBody += `*╭───「 ${cat.toUpperCase()} 」*\n`;
                menuBody += `│ • ` + cmds.map(n => `\`.${n}\``).join('\n│ • ') + `\n`;
                menuBody += `*╰───────────────💎*\n\n`;
            });

            const buttons = [
                { buttonId: '.alive', buttonText: { displayText: '⏳ STATUS' }, type: 1 },
                { buttonId: '.owner', buttonText: { displayText: '👑 OWNER' }, type: 1 },
                { buttonId: '.help', buttonText: { displayText: '📖 MENU' }, type: 1 }
            ];

            await zephy.sendMessage(chatId, {
                text: menuBody,
                footer: '©2026 Mickey Labs™ — Mbande, Dar',
                buttons,
                headerType: 1
            }, { quoted: message });

        } catch (e) {
            console.error("Menu Button Error:", e);
            // Fallback: Tuma text ya kawaida kama interactive ikifeli
            await zephy.sendMessage(chatId, { text: "⚠️ Hitilafu ya Buttons! (Buttons error)." });
        }
    }
};