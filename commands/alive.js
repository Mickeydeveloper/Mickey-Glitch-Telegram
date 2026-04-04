const { performance } = require('perf_hooks');
const os = require('os');
const moment = require('moment-timezone');
const Helpers = require('../utils/helpers');

let startTime = Date.now();

module.exports = {
    name: 'alive',
    description: 'Check if bot is alive and show system info',
    aliases: ['uptime', 'status'],
    category: 'misc',
    cooldown: 5000,
    
    async execute(context) {
        try {
            const { type, sendMessage, userId, isOwner, isDeveloper } = context;
            
            // Calculate uptime
            const uptime = Date.now() - startTime;
            const uptimeString = Helpers.formatUptime(uptime);
            
            // Get system info
            const platform = type === 'telegram' ? 'Telegram' : 'WhatsApp';
            const nodeVersion = process.version;
            const memoryUsage = process.memoryUsage();
            const memoryMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
            const totalMemoryMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
            const systemUptime = os.uptime();
            const systemUptimeString = Helpers.formatUptime(systemUptime * 1000);
            
            // Get current time
            const currentTime = Helpers.getCurrentTime();
            
            // Build response
            let response = `🤖 *Bot Status - ${platform}*\n\n`;
            response += `✅ *Status:* Online\n`;
            response += `⏰ *Bot Uptime:* ${uptimeString}\n`;
            response += `🖥️ *System Uptime:* ${systemUptimeString}\n`;
            response += `🕐 *Current Time:* ${currentTime}\n`;
            response += `💾 *Memory:* ${memoryMB}MB / ${totalMemoryMB}MB\n`;
            response += `🔧 *Node.js:* ${nodeVersion}\n`;
            response += `📱 *Platform:* ${platform}\n`;
            
            if (isOwner(userId) || isDeveloper(userId)) {
                response += `\n👑 *Developer Mode*\n`;
                response += `🆔 *User ID:* ${userId}\n`;
            }
            
            response += `\n✨ *Bot is running perfectly!*`;
            
            await sendMessage(response);
        } catch (error) {
            await context.sendMessage(`❌ Error: ${error.message}`);
        }
    }
};