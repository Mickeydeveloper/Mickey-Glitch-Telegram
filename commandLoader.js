const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const chalk = require('chalk');
const axios = require('axios');

class CommandLoader {
    constructor() {
        this.commands = new Map();
        this.commandsPaths = [path.join(__dirname, 'commands')];

        // Support additional command folder(s) by environment variable or config
        const extraPaths = [];
        if (process.env.COMMANDS_PATH) {
            extraPaths.push(...process.env.COMMANDS_PATH.split(path.delimiter || ';').map(p => p.trim()).filter(Boolean));
        }

        try {
            const config = require('./config');
            if (config.commandsPath) {
                if (Array.isArray(config.commandsPath)) {
                    extraPaths.push(...config.commandsPath);
                } else if (typeof config.commandsPath === 'string') {
                    extraPaths.push(...config.commandsPath.split(path.delimiter || ';').map(p => p.trim()).filter(Boolean));
                }
            }
        } catch (err) {
            // Config not found / no extra path; ignore
        }

        extraPaths.forEach(p => {
            if (!p) return;
            const normalized = path.isAbsolute(p) ? p : path.resolve(__dirname, p);
            if (!this.commandsPaths.includes(normalized)) {
                this.commandsPaths.push(normalized);
            }
        });
    }

    isRemotePath(commandsPath) {
        return /^https?:\/\//i.test(commandsPath);
    }

    async loadGithubCommands(remoteUrl) {
        const githubTree = this.getGithubTreeInfo(remoteUrl);
        if (!githubTree) {
            console.warn(chalk.yellow(`⚠ Unsupported remote command path: ${remoteUrl}`));
            return null;
        }

        const { owner, repo, branch, folder } = githubTree;
        const apiTreeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

        let treeData;
        try {
            const response = await axios.get(apiTreeUrl, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            treeData = response.data;
        } catch (error) {
            console.error(chalk.red(`✗ Failed to fetch GitHub tree: ${error.message}`));
            return null;
        }

        const jsFiles = (treeData.tree || []).filter(entry => entry.type === 'blob' && entry.path.startsWith(folder) && entry.path.endsWith('.js'));
        if (jsFiles.length === 0) {
            console.warn(chalk.yellow(`⚠ No .js commands found in GitHub folder ${folder}`));
            return null;
        }

        const tempDir = path.join(os.tmpdir(), `command-loader-${crypto.randomBytes(8).toString('hex')}`);
        fs.mkdirSync(tempDir, { recursive: true });

        for (const file of jsFiles) {
            const relativePath = file.path.substring(folder.length).replace(/^\//, '');
            const targetPath = path.join(tempDir, relativePath);
            const targetDir = path.dirname(targetPath);
            fs.mkdirSync(targetDir, { recursive: true });

            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
            try {
                const fileData = await axios.get(rawUrl, { responseType: 'text' });
                fs.writeFileSync(targetPath, fileData.data, 'utf8');
            } catch (error) {
                console.error(chalk.red(`✗ Failed to download ${rawUrl}: ${error.message}`));
            }
        }

        return tempDir;
    }

    getGithubTreeInfo(remoteUrl) {
        const rawMatch = remoteUrl.match(/^https:\/\/raw\.githubusercontent\.com\/([^\/-]+)\/([^\/-]+)\/([^\/]+)\/(.+)$/i);
        if (rawMatch) {
            const owner = rawMatch[1];
            const repo = rawMatch[2];
            const branch = rawMatch[3];
            let folder = rawMatch[4];
            if (!folder.endsWith('/')) folder += '/';
            return { owner, repo, branch, folder };
        }

        const treeMatch = remoteUrl.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)$/i);
        if (treeMatch) {
            const owner = treeMatch[1];
            const repo = treeMatch[2];
            const branch = treeMatch[3];
            let folder = treeMatch[4];
            if (!folder.endsWith('/')) folder += '/';
            return { owner, repo, branch, folder };
        }

        return null;
    }

    async loadAll() {
        let totalCommands = 0;

        for (const commandsPath of this.commandsPaths) {
            let targetPath = commandsPath;

            if (this.isRemotePath(commandsPath)) {
                targetPath = await this.loadGithubCommands(commandsPath);
                if (!targetPath) {
                    continue;
                }
            }

            if (!fs.existsSync(targetPath)) {
                console.warn(chalk.yellow(`⚠ Commands folder not found at ${targetPath}, skipping.`));
                continue;
            }

            const files = fs.readdirSync(targetPath).filter(file => file.endsWith('.js'));
            console.log(chalk.blue(`Loading ${files.length} commands from ${targetPath}...`));

            files.forEach(file => {
                const commandName = file.replace('.js', '');
                try {
                    const commandModule = require(path.join(targetPath, file));

                    const commandFunc = commandModule.execute || commandModule.default || commandModule;

                    if (typeof commandFunc === 'function') {
                        const commandNames = [commandName.toLowerCase()];
                        if (Array.isArray(commandModule.aliases)) {
                            commandModule.aliases.forEach(alias => {
                                if (typeof alias === 'string' && alias.trim()) {
                                    commandNames.push(alias.toLowerCase());
                                }
                            });
                        }

                        commandNames.forEach(name => {
                            this.commands.set(name, commandFunc);
                        });

                        console.log(chalk.green(`✓ Loaded command(s): ${commandNames.join(', ')}`));
                        totalCommands += 1;
                    } else {
                        console.warn(chalk.yellow(`⚠ Command ${commandName} does not export a function`));
                    }
                } catch (error) {
                    console.error(chalk.red(`✗ Error loading command ${commandName} from ${targetPath}:`), error.message);
                }
            });
        }

        console.log(chalk.cyan(`Total commands loaded: ${this.commands.size} (${totalCommands} files scanned)`));
    }

    // Get a command by name
    getCommand(name) {
        return this.commands.get(name);
    }

    // Execute a command (works for both WhatsApp and Telegram)
    async execute(commandName, context) {
        const command = this.getCommand(commandName);
        
        if (!command) {
            return {
                success: false,
                error: `Command "${commandName}" not found`
            };
        }

        try {
            const result = await command(context);
            return {
                success: true,
                result: result
            };
        } catch (error) {
            console.error(chalk.red(`Error executing command "${commandName}":`), error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get all command names
    getAllCommandNames() {
        return Array.from(this.commands.keys());
    }

    // Get all commands
    getAllCommands() {
        return this.commands;
    }
}

// Export singleton instance
module.exports = new CommandLoader();
