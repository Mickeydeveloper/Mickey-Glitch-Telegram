const moment = require('moment-timezone');

const TIMEZONE = 'Asia/Jakarta';

class Helpers {
    /**
     * Get current time in timezone
     */
    static getCurrentTime() {
        return moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    }

    /**
     * Get relative time (e.g., "2 hours ago")
     */
    static getRelativeTime(date) {
        return moment(date).tz(TIMEZONE).fromNow();
    }

    /**
     * Format bytes to human readable size
     */
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Format duration in milliseconds to readable format
     */
    static formatDuration(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0) parts.push(`${seconds}s`);

        return parts.length > 0 ? parts.join(' ') : '0s';
    }

    /**
     * Escape special markdown characters
     */
    static escapeMarkdown(text) {
        return String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
    }

    /**
     * Unescape markdown
     */
    static unescapeMarkdown(text) {
        return String(text).replace(/\\([_*[\]()~`>#+\-=|{}.!\\])/g, '$1');
    }

    /**
     * Format command usage string
     */
    static formatCommandUsage(command, args = '') {
        return `\`${command}${args ? ' ' + args : ''}\``;
    }

    /**
     * Create a formatted error message
     */
    static createErrorMessage(title, message, details = null) {
        let msg = `❌ *${title}*\n\n`;
        msg += `${message}`;
        
        if (details) {
            msg += `\n\n_${details}_`;
        }
        
        return msg;
    }

    /**
     * Create a formatted success message
     */
    static createSuccessMessage(title, message, details = null) {
        let msg = `✅ *${title}*\n\n`;
        msg += `${message}`;
        
        if (details) {
            msg += `\n\n_${details}_`;
        }
        
        return msg;
    }

    /**
     * Create a formatted info message
     */
    static createInfoMessage(title, message, details = null) {
        let msg = `ℹ️ *${title}*\n\n`;
        msg += `${message}`;
        
        if (details) {
            msg += `\n\n_${details}_`;
        }
        
        return msg;
    }

    /**
     * Truncate text with ellipsis
     */
    static truncate(text, maxLength = 100, suffix = '...') {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    }

    /**
     * Sleep for specified milliseconds
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate unique ID
     */
    static generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if value is empty
     */
    static isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    /**
     * Deep merge objects
     */
    static mergeObjects(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    result[key] = this.mergeObjects(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    /**
     * Get safe property value
     */
    static getProperty(obj, path, defaultValue = null) {
        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current === null || current === undefined) return defaultValue;
            current = current[key];
        }

        return current !== undefined ? current : defaultValue;
    }

    /**
     * Format uptime
     */
    static formatUptime(uptimeMs) {
        const days = Math.floor(uptimeMs / 86400000);
        const hours = Math.floor((uptimeMs % 86400000) / 3600000);
        const minutes = Math.floor((uptimeMs % 3600000) / 60000);
        const seconds = Math.floor((uptimeMs % 60000) / 1000);

        const parts = [];
        if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
        if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
        if (seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

        return parts.join(', ');
    }

    /**
     * Check if user is owner
     */
    static isOwner(userId) {
        const owners = (process.env.OWNERS || '8050573929').split(',').map(id => id.trim());
        return owners.includes(userId.toString());
    }

    /**
     * Check if user is developer
     */
    static isDeveloper(userId) {
        const developers = (process.env.DEVELOPERS || process.env.ALLOWED_DEVELOPERS || '8050573929').split(',').map(id => id.trim());
        return developers.includes(userId.toString());
    }

    /**
     * Check if user is admin
     */
    static isAdmin(userId) {
        return global.adminList && global.adminList.includes(userId.toString());
    }

    /**
     * Check if user is premium
     */
    static isPremium(userId) {
        if (!global.premiumUsers) return false;
        const userData = global.premiumUsers[userId.toString()];
        if (!userData) return false;
        const now = moment().tz(TIMEZONE);
        const expirationDate = moment(userData.expired, 'YYYY-MM-DD HH:mm:ss').tz(TIMEZONE);
        return now.isBefore(expirationDate);
    }
}

module.exports = Helpers;

// Named exports for convenience
module.exports.isOwner = Helpers.isOwner.bind(Helpers);
module.exports.isDeveloper = Helpers.isDeveloper.bind(Helpers);
module.exports.isAdmin = Helpers.isAdmin.bind(Helpers);
module.exports.isPremium = Helpers.isPremium.bind(Helpers);

module.exports = Helpers;
