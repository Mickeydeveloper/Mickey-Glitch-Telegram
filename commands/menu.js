const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const Helpers = require('../utils/helpers');

/**
 * Read commands from folder automatically
 */
function getCommandsInfo() {
    try {
        const commandsPath = path.join(__dirname, '../commands'); 
        const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        const commandList = [];
        const uniqueNames = new Set();

        files.forEach(file => {
            try {
                const cmd = require(path.join(commandsPath, file));
                if (cmd.name && !uniqueNames.has(cmd.name)) {
                    uniqueNames.add(cmd.name);
                    commandList.push({
                        name: cmd.name,
                        category: cmd.category || '📂 OTHERS',
                        description: cmd.description || 'No description',
                        aliases: cmd.aliases || []
                    });
                }
            } catch (e) {
                // Silently skip errors
            }
        });

        return commandList;
    } catch (e) { 
        return []; 
    }
}

module.exports = {
    name: 'menu',
    description: 'Main menu with command list',
    aliases: ['help', 'h', 'commands', 'cmd'],
    category: 'utilities',
    cooldown: 10000,

    async execute(context) {
        try {
            const { sendMessage, userNickname, type } = context;

            const botName = 'MICKEY GLITCH BOT';
            const botVersion = '5.0.0';
            const currentTime = Helpers.getCurrentTime();
            
            const allCmds = getCommandsInfo();
            const categorized = {};

            // Categorize commands
            allCmds.forEach(cmd => {
                if (!categorized[cmd.category]) {
                    categorized[cmd.category] = [];
                }
                categorized[cmd.category].push(cmd);
            });

            // Build menu text
            let menuBody = `✨ *${botName} V${botVersion}* ✨\n\n`;
            menuBody += `┌─────────────────────┐\n`;
            menuBody += `│ 👋 *User:* ${Helpers.truncate(userNickname, 15)}\n`;
            menuBody += `│ 🕒 *Time:* ${currentTime}\n`;
            menuBody += `│ 📦 *Commands:* ${allCmds.length}\n`;
            menuBody += `│ 📱 *Platform:* ${type === 'telegram' ? 'Telegram' : 'WhatsApp'}\n`;
            menuBody += `└─────────────────────┘\n\n`;
            
            menuBody += `*━━━━ AVAILABLE COMMANDS ━━━━*\n\n`;

            Object.entries(categorized).forEach(([category, commands]) => {
                menuBody += `*╭─ ${category}*\n`;
                commands.forEach((cmd, index) => {
                    const isLast = index === commands.length - 1;
                    const prefix = isLast ? '╰' : '├';
                    const cmdDisplay = `.${cmd.name}`;
                    const aliasText = cmd.aliases && cmd.aliases.length > 0 
                        ? ` (${cmd.aliases.join(', ')})` 
                        : '';
                    menuBody += `${prefix}─ \`${cmdDisplay}\`${aliasText}\n`;
                    if (!isLast) {
                        menuBody += `│  ${cmd.description}\n`;
                    }
                });
                menuBody += `*╰──────────────────*\n\n`;
            });

            menuBody += `_📝 Use .command_name to execute a command_\n`;
            menuBody += `_💡 Example: .alive_\n\n`;
            menuBody += `_Version ${botVersion} | © 2026 Mickey Labs™_`;

            await sendMessage(menuBody);

        } catch (error) {
            console.error("Menu error:", error);
            await context.sendMessage(
                Helpers.createErrorMessage(
                    'Menu Error',
                    'Failed to load menu',
                    error.message
                )
            );
        }
    }
};