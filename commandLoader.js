const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class CommandLoader {
    constructor() {
        this.commands = new Map();
        this.aliases = new Map();
        // Path ya folder la commands kwenye server yako
        this.commandsPath = path.join(__dirname, 'commands');
    }

    async loadAll() {
        if (!fs.existsSync(this.commandsPath)) {
            console.log(chalk.red(`✗ Folder la commands halikupatikana: ${this.commandsPath}`));
            return;
        }

        const files = fs.readdirSync(this.commandsPath).filter(file => file.endsWith('.js'));
        console.log(chalk.blue(`🚀 Loading ${files.length} commands...`));

        for (const file of files) {
            try {
                const commandModule = require(path.join(this.commandsPath, file));
                
                // Msaada kwa aina zote (Object ya kawaida au Array)
                const cmds = Array.isArray(commandModule) ? commandModule : [commandModule];

                cmds.forEach(cmd => {
                    if (cmd.name && (cmd.execute || typeof cmd === 'function')) {
                        const name = cmd.name.toLowerCase();
                        this.commands.set(name, cmd);

                        // Sajili Aliases (kama zipo)
                        if (cmd.alias && Array.isArray(cmd.alias)) {
                            cmd.alias.forEach(a => this.aliases.set(a.toLowerCase(), name));
                        } else if (cmd.aliases && Array.isArray(cmd.aliases)) {
                            cmd.aliases.forEach(a => this.aliases.set(a.toLowerCase(), name));
                        }

                        console.log(chalk.green(`✅ Loaded: ${name}`));
                    } else {
                        console.log(chalk.yellow(`⚠ Skillip: ${file} haina 'name' au 'execute' function.`));
                    }
                });
            } catch (error) {
                console.error(chalk.red(`✗ Error loading ${file}:`), error.message);
            }
        }
        console.log(chalk.cyan(`📊 Total: ${this.commands.size} commands active.`));
    }

    async execute(commandName, conText) {
        // Tafuta jina halisi au alias
        const name = commandName.toLowerCase();
        const cmd = this.commands.get(name) || this.commands.get(this.aliases.get(name));

        if (!cmd) return; // Command haipo, kaa kimya

        try {
            // 🔥 FIX KUU: Hapa ndio tunatenganisha (from, Loftxmd, conText)
            // Hii inahakikisha ping.js na pair.js zinapata data sahihi
            const executeFunc = cmd.execute || (typeof cmd === 'function' ? cmd : null);
            
            if (executeFunc) {
                // Tunatuma: (chatId, socket, context_nzima)
                await executeFunc(conText.chatId, conText.sock || conText.Loftxmd, conText);
            }
        } catch (error) {
            console.error(chalk.red(`❌ Execution Error [${name}]:`), error);
            if (conText.reply) conText.reply(`❌ Error: ${error.message}`);
        }
    }
}

module.exports = new CommandLoader();
