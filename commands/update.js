const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const DEFAULT_REPO = 'https://github.com/Mickeydeveloper/Mickey-Glitch-Telegram';
const DEFAULT_BRANCH = 'main';

module.exports = {
    name: 'update',
    description: 'Update bot files from a GitHub repo (owner/developer only)',
    aliases: ['upgrade', 'pull', 'sync'],
    category: 'owner',

    async execute(context) {
        const { args = [], sendMessage, userId, isOwner, isDeveloper } = context;

        if (!isOwner(userId) && !isDeveloper(userId)) {
            await sendMessage('❌ Only owner/developer can run this command.');
            return;
        }

        const repoArg = args[0] || DEFAULT_REPO;
        const branchArg = args[1] || DEFAULT_BRANCH;
        const restartFlag = args[2] === 'restart' || args[2] === 'reboot';

        let cloneUrl = repoArg;
        if (!/^https?:\/\//i.test(cloneUrl)) {
            if (/^[\w-]+\/[\w-]+$/.test(cloneUrl)) {
                cloneUrl = `https://github.com/${cloneUrl}.git`;
            } else {
                cloneUrl = `https://github.com/${cloneUrl}`;
            }
        }

        const projectRoot = path.resolve(__dirname, '..');
        const tempDir = path.join(os.tmpdir(), `bot-update-${Date.now()}`);

        try {
            await sendMessage(`🔄 Starting update from ${cloneUrl} branch ${branchArg}...`);

            fs.rmSync(tempDir, { recursive: true, force: true });
            fs.mkdirSync(tempDir, { recursive: true });

            execSync(`git clone --depth=1 --branch ${branchArg} "${cloneUrl}" "${tempDir}"`, {
                stdio: 'pipe',
                timeout: 5 * 60 * 1000
            });

            const copyRecursive = (srcDir, destDir) => {
                const entries = fs.readdirSync(srcDir, { withFileTypes: true });

                for (const entry of entries) {
                    if (entry.name === '.git' || entry.name === 'node_modules') continue;

                    const srcPath = path.join(srcDir, entry.name);
                    const destPath = path.join(destDir, entry.name);

                    if (entry.isDirectory()) {
                        if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
                        copyRecursive(srcPath, destPath);
                        continue;
                    }

                    fs.copyFileSync(srcPath, destPath);
                }
            };

            copyRecursive(tempDir, projectRoot);

            fs.rmSync(tempDir, { recursive: true, force: true });

            await sendMessage('✅ Update complete. Files are synced from GitHub.');

            if (restartFlag) {
                await sendMessage('♻️ Restarting bot process now...');
                process.exit(0);
            } else {
                await sendMessage('⚠️ Please restart the bot process manually for changes to take effect.');
            }
        } catch (error) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (e) {
                // ignore cleanup errors
            }

            await sendMessage(`❌ Update failed: ${error.message}`);
            console.error('Update command failed:', error);
        }
    }
};
