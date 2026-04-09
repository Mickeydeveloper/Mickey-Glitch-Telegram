const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const Helpers = require('../utils/helpers');

module.exports = {
    name: 'update',
    description: 'Update bot from GitHub',
    aliases: ['upgrade', 'pull', 'sync'],
    category: 'owner',

    async execute(of, fxck, context) {
        const { args = [], reply, userId } = context;

        // Check if user is owner/developer
        if (!Helpers.isDeveloper(userId) && !Helpers.isOwner(userId)) {
            console.log(chalk.red(`❌ Update blocked for user ${userId}`));
            return await reply('❌ Only developers can use this command!');
        }

        try {
            await reply('⏳ Checking for updates...');

            // Get current directory
            const projectRoot = path.resolve(__dirname, '..');

            // Run git pull to update
            const output = execSync('git -C ' + projectRoot + ' pull', {
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024,
                timeout: 60000
            });

            if (output.includes('Already up to date')) {
                return await reply('✅ Bot is already up to date!');
            }

            // Updates found
            let message = '✨ *Update Found!*\n\n';
            message += 'Applying updates...\n';
            message += '🔄 Restarting bot...\n';

            await reply(message);

            // Restart after a delay
            setTimeout(() => {
                console.log(chalk.bgGreen.black('🚀 Restarting after update...'));
                process.exit(0);
            }, 2000);

        } catch (error) {
            console.error(chalk.red('Update error:'), error.message);
            await reply('❌ Update failed: ' + error.message.substring(0, 100));
        }
    }
};
