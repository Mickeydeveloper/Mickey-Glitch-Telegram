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
    description: 'Update bot files from GitHub',
    aliases: ['upgrade', 'pull', 'sync'],
    category: 'owner',

    async execute(context) {
        const { args = [], sendMessage, userId } = context;

        if (!checkIsOwner(userId)) {
            return await sendMessage('❌ Command hii ni kwa ajili ya Owner tu!');
        }

        // Define temp directory na Project Root
        const branchArg = args[1] || DEFAULT_BRANCH;
        const projectRoot = path.join(__dirname, '../'); 
        const tempDir = path.join(os.tmpdir(), `bot-update-${Date.now()}`);

        try {
            await sendMessage(`🔄 *Mickey Glitch Update*\nInatafuta updates kutoka GitHub...`);

            // FIX: Hakikisha tunatumia tempDir badala ya tempPath
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
            fs.mkdirSync(tempDir, { recursive: true });

            await sendMessage(`📥 Inapakua files (Branch: ${branchArg})...`);
            
            // Clone repo kwenda kwenye temp folder
            execSync(`git clone --depth=1 --branch ${branchArg} "${DEFAULT_REPO}" "${tempDir}"`, {
                stdio: 'pipe',
                timeout: 300000
            });

            const copyFiles = (src, dest) => {
                const entries = fs.readdirSync(src, { withFileTypes: true });
                for (const entry of entries) {
                    // Usiguse folder la git, node_modules, na file la config/session
                    if (['.git', 'node_modules', 'session', 'sessions', 'config.js', '.env'].includes(entry.name)) continue;
                    
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

            // Anza kuhamisha files
            copyFiles(tempDir, projectRoot);

            // Safisha temp folder baada ya kumaliza
            fs.rmSync(tempDir, { recursive: true, force: true });

            await sendMessage('📦 Inasakinisha npm packages (npm install)...');
            execSync('npm install', { cwd: projectRoot, stdio: 'pipe' });

            await sendMessage('✅ *UPDATE COMPLETE*\n\nBot itajizima sasa hivi. Tafadhali iwashe upya au subiri auto-restart.');
            
            setTimeout(() => process.exit(0), 3000);

        } catch (error) {
            console.error('Update Error:', error);
            // Cleanup temp folder hata kama imefeli
            if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
            await sendMessage(`❌ Update Failed: ${error.message}`);
        }
    }
};
