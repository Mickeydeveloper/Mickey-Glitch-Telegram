const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

// Function ya kutengeneza muda hapa hapa ili tusitegemee file la nje lenye error
const getTime = () => {
    return moment().tz('Africa/Dar_es_Salaam').format('HH:mm:ss');
};

function getCommandsInfo() {
    try {
        // Hakikisha path ni sahihi kuelekea folder la commands
        const commandsPath = path.join(__dirname, '../commands'); 
        if (!fs.existsSync(commandsPath)) return [];

        const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        const commandList = [];
        const uniqueNames = new Set();

        files.forEach(file => {
            try {
                // Tunafuta cache ili kusoma file jipya
                delete require.cache[require.resolve(path.join(commandsPath, file))];
                const cmd = require(path.join(commandsPath, file));
                
                if (cmd && cmd.name && !uniqueNames.has(cmd.name)) {
                    uniqueNames.add(cmd.name);
                    commandList.push({
                        name: cmd.name,
                        category: (cmd.category || '📂 OTHERS').toUpperCase(),
                        description: cmd.description || 'No description',
                        aliases: cmd.aliases || []
                    });
                }
            } catch (e) {
                // Hapa itapita kimya kama file moja lina error (kama update.js)
            }
        });

        return commandList;
    } catch (e) { 
        console.error("Error reading commands folder:", e);
        return []; 
    }
}

module.exports = {
    name: 'menu',
    description: 'Main menu with command list',
    aliases: ['help', 'h', 'commands', 'cmd'],
    category: 'utilities',

    async execute(context) {
        try {
            const { sendMessage, userNickname, type } = context;

            const botName = 'MICKEY GLITCH BOT';
            const botVersion = '5.0.0';
            const currentTime = getTime(); // Tumia function yetu ya hapa ndani

            const allCmds = getCommandsInfo();
            const categorized = {};

            // Panga kwa category
            allCmds.forEach(cmd => {
                if (!categorized[cmd.category]) {
                    categorized[cmd.category] = [];
                }
                categorized[cmd.category].push(cmd);
            });

            let menuBody = `✨ *${botName} V${botVersion}* ✨\n\n`;
            menuBody += `┌─────────────────────┐\n`;
            menuBody += `│ 👋 *User:* ${userNickname || 'User'}\n`;
            menuBody += `│ 🕒 *Time:* ${currentTime}\n`;
            menuBody += `│ 📦 *Commands:* ${allCmds.length}\n`;
            menuBody += `│ 📱 *Platform:* ${type === 'telegram' ? 'Telegram' : 'WhatsApp'}\n`;
            menuBody += `└─────────────────────┘\n\n`;

            menuBody += `*━━━━ AVAILABLE COMMANDS ━━━━*\n\n`;

            // Tengeneza list ya menu
            for (const [category, commands] of Object.entries(categorized)) {
                menuBody += `*╭─  ${category}*\n`;
                commands.forEach((cmd, index) => {
                    const isLast = index === commands.length - 1;
                    const prefix = isLast ? '╰' : '├';
                    menuBody += `${prefix}─ \`.${cmd.name}\`\n`;
                });
                menuBody += `*╰──────────────────*\n\n`;
            }

            menuBody += `_📝 Use .command_name_\n`;
            menuBody += `_Version ${botVersion} | © 2026 Mickey Labs™_`;

            await sendMessage(menuBody);

        } catch (error) {
            console.error("Menu execution error:", error);
            await context.sendMessage("❌ Error: Menu imeshindwa kufunguka.");
        }
    }
};
