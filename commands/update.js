const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Ingiza config ili kupata list ya ma-owner
const { allowedDevelopers } = require('../config');

const DEFAULT_REPO = 'https://github.com/Mickeydeveloper/Mickey-Glitch-Telegram';
const DEFAULT_BRANCH = 'main';

// Function ya ku-check kama ni Owner
const checkIsOwner = (userId) => {
    return allowedDevelopers.includes(userId?.toString());
};

// ============================================
//         DEPENDENCY CHECK
// ============================================
function checkDependencies() {
    const requiredModules = ['chalk', 'axios', 'moment-timezone'];
    const missingModules = [];

    for (const mod of requiredModules) {
        try {
            require.resolve(mod);
        } catch (error) {
            missingModules.push(mod);
        }
    }

    if (missingModules.length > 0) {
        console.error(chalk.red('❌ MISSING:'), missingModules.join(', '));
        return false;
    }
    return true;
}

module.exports = {
    name: 'update',
    description: 'Update bot files from GitHub',
    aliases: ['upgrade', 'pull', 'sync'],
    category: 'owner',

    async execute(context) {
        const { args = [], sendMessage, userId } = context;

        // FIX: Tumia function yetu ya ndani badala ya context.isOwner inayofeli
        if (!checkIsOwner(userId)) {
            return await sendMessage('❌ Command hii ni kwa ajili ya Owner tu!');
        }

        if (!checkDependencies()) {
            return await sendMessage('❌ Tafadhali install dependencies kwanza: `npm install`');
        }

        const branchArg = args[1] || DEFAULT_BRANCH;
        const projectRoot = path.join(__dirname, '../../'); // Hakikisha inaenda kwenye root folder
        const tempDir = path.join(os.tmpdir(), `bot-update-${Date.now()}`);

        try {
            await sendMessage(`🔄 *Mickey Glitch Update*\nChecking for updates from GitHub...`);

            // Safisha temp folder kama lipo
            if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { recursive: true, force: true });
            fs.mkdirSync(tempDir, { recursive: true });

            // Clone repo
            await sendMessage(`📥 Downloading files (Branch: ${branchArg})...`);
            execSync(`git clone --depth=1 --branch ${branchArg} "${DEFAULT_REPO}" "${tempDir}"`, {
                stdio: 'pipe',
                timeout: 300000
            });

            // Copy files recursive function
            const copyFiles = (src, dest) => {
                const entries = fs.readdirSync(src, { withFileTypes: true });
                for (const entry of entries) {
                    if (['.git', 'node_modules', 'session', 'sessions', 'config.js'].includes(entry.name)) continue;
                    
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

            copyFiles(tempDir, projectRoot);

            // Safisha temp
            fs.rmSync(tempDir, { recursive: true, force: true });

            await sendMessage('📦 Installing/Updating npm packages...');
            execSync('npm install', { cwd: projectRoot, stdio: 'pipe' });

            await sendMessage('✅ *UPDATE COMPLETE*\n\nBot itajizima sasa hivi. Tafadhali iwashe upya (Restart).');
            
            // Exit ili bot i-restart kama unatumia PM2 au Auto-restart script
            setTimeout(() => process.exit(0), 3000);

        } catch (error) {
            console.error('Update Error:', error);
            await sendMessage(`❌ Update Failed: ${error.message}`);
        }
    }
};
