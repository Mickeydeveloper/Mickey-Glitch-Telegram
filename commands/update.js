const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Ingiza ma-owner toka config
const { allowedDevelopers } = require('../config');

const DEFAULT_REPO = 'https://github.com/Mickeydeveloper/Mickey-Glitch-Telegram';
const DEFAULT_BRANCH = 'main';

const checkIsOwner = (userId) => {
    return allowedDevelopers.includes(userId?.toString());
};

module.exports = {
    name: 'update',
    description: 'Update bot files from GitHub and restart',
    aliases: ['upgrade', 'pull', 'sync'],
    category: 'owner',

    async execute(context) {
        const { args = [], sendMessage, userId } = context;

        if (!checkIsOwner(userId)) {
            return await sendMessage('❌ Command hii ni kwa ajili ya Owner tu!');
        }

        const branchArg = args[1] || DEFAULT_BRANCH;
        const projectRoot = path.join(__dirname, '../'); 
        const tempDir = path.join(os.tmpdir(), `bot-update-${Date.now()}`);

        try {
            await sendMessage(`🔄 *Mickey Glitch Update*\nInatafuta updates (Branch: ${branchArg})...`);

            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
            fs.mkdirSync(tempDir, { recursive: true });

            // 1. Clone Repo
            execSync(`git clone --depth=1 --branch ${branchArg} "${DEFAULT_REPO}" "${tempDir}"`, {
                stdio: 'pipe',
                timeout: 300000
            });

            // 2. Hamisha Files (Copy logic)
            const copyFiles = (src, dest) => {
                const entries = fs.readdirSync(src, { withFileTypes: true });
                for (const entry of entries) {
                    // Exclude sensitive/env files
                    if (['.git', 'node_modules', 'session', 'sessions', 'config.js', '.env', 'package-lock.json'].includes(entry.name)) continue;

                    const srcPath = path.join(src, entry.name);
                    const destPath = path.join(dest, entry.name);

                    if (entry.isDirectory()) {
                        if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
                        copyFiles(srcPath, destPath);
                    } else {
                        fs.copyFileSync(srcPath, destPath);
                    }
                }
            };

            await sendMessage('📥 Inahamisha files kwenda kwenye root...');
            copyFiles(tempDir, projectRoot);

            // 3. Cleanup temp folder
            fs.rmSync(tempDir, { recursive: true, force: true });

            // 4. Install Dependencies
            await sendMessage('📦 Inasakinisha modules mpya (npm install)...');
            execSync('npm install', { cwd: projectRoot, stdio: 'ignore' });

            await sendMessage('✅ *UPDATE SUCCESSFUL*\n\nBot inajizima kuanza upya (Restarting)...');

            // 5. Restart Logic
            // Tunatumia setTimeout ili kutoa nafasi ya msg kutumwa kabla ya process kufa
            setTimeout(() => {
                console.log(chalk.green.bold('Update complete. Restarting bot...'));
                process.exit(0); // Kama unatumia PM2 au nodemon, itaji-restart yenyewe hapa.
            }, 3000);

        } catch (error) {
            console.error('Update Error:', error);
            if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
            await sendMessage(`❌ Update Failed: ${error.message}`);
        }
    }
};
