const { performance } = require('perf_hooks');
const os = require('os');
const moment = require('moment-timezone');

let startTime = Date.now();

module.exports = {
    name: 'alive',
    description: 'Check if bot is alive and show system info',
    aliases: ['uptime', 'status'],
    category: 'misc',
    
    async execute(context) {
        const { type, sendMessage, userId, isOwner, isDeveloper } = context;
        
        // Calculate uptime
        const uptime = Date.now() - startTime;
        const uptimeString = formatUptime(uptime);
        
        // Get system info
        const platform = type === 'telegram' ? 'Telegram' : 'WhatsApp';
        const nodeVersion = process.version;
        const memoryUsage = process.memoryUsage();
        const memoryMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
        const totalMemoryMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
        const cpuUsage = process.cpuUsage();
        const systemUptime = os.uptime();
        const systemUptimeString = formatUptime(systemUptime * 1000);
        
        // Get current time
        const currentTime = moment().tz('Africa/Dar_es_Salaam').format('YYYY-MM-DD HH:mm:ss');
        
        // Build response
        let response = `🤖 *Bot Status - ${platform}*\n\n`;
        response += `⏰ *Bot Uptime:* ${uptimeString}\n`;
        response += `🖥️ *System Uptime:* ${systemUptimeString}\n`;
        response += `🕐 *Current Time:* ${currentTime} EAT\n`;
        response += `💾 *Memory Usage:* ${memoryMB}MB / ${totalMemoryMB}MB\n`;
        response += `🔧 *Node.js:* ${nodeVersion}\n`;
        response += `📱 *Platform:* ${platform}\n`;
        
        if (isOwner(userId) || isDeveloper(userId)) {
            response += `\n👑 *Owner/Developer Mode*\n`;
            response += `🆔 *User ID:* ${userId}\n`;
        }
        
        response += `\n✅ *Bot is alive and running!*`;
        
        await sendMessage(response);
    }
};

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    let uptime = '';
    if (days > 0) uptime += `${days}d `;
    if (hours % 24 > 0) uptime += `${hours % 24}h `;
    if (minutes % 60 > 0) uptime += `${minutes % 60}m `;
    if (seconds % 60 > 0) uptime += `${seconds % 60}s`;
    
    return uptime.trim() || '0s';
}