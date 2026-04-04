const moment = require('moment-timezone');

class RateLimiter {
    constructor(maxRequests = 5, windowMs = 60000, timezone = 'Asia/Jakarta') {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.timezone = timezone;
        this.requests = new Map();
    }

    /**
     * Check if user has exceeded rate limit
     * @param {string} userId - User ID
     * @returns {object} { allowed: boolean, remaining: number, resetTime: Date }
     */
    check(userId) {
        const now = Date.now();
        
        if (!this.requests.has(userId)) {
            this.requests.set(userId, []);
        }

        let timestamps = this.requests.get(userId);
        
        // Remove old requests outside the window
        timestamps = timestamps.filter(ts => now - ts < this.windowMs);
        
        const remaining = Math.max(0, this.maxRequests - timestamps.length);
        const allowed = timestamps.length < this.maxRequests;
        
        if (allowed) {
            timestamps.push(now);
        }
        
        this.requests.set(userId, timestamps);
        
        const resetTime = timestamps.length > 0 
            ? new Date(timestamps[0] + this.windowMs)
            : new Date(now + this.windowMs);

        return {
            allowed,
            remaining,
            resetTime,
            retryAfter: Math.ceil((resetTime - now) / 1000)
        };
    }

    /**
     * Get remaining requests for user
     * @param {string} userId - User ID
     * @returns {number} Remaining requests
     */
    getRemaining(userId) {
        const now = Date.now();
        let timestamps = this.requests.get(userId) || [];
        timestamps = timestamps.filter(ts => now - ts < this.windowMs);
        return Math.max(0, this.maxRequests - timestamps.length);
    }

    /**
     * Reset user's rate limit
     * @param {string} userId - User ID
     */
    reset(userId) {
        this.requests.delete(userId);
    }

    /**
     * Reset all rate limits
     */
    resetAll() {
        this.requests.clear();
    }
}

class Cooldown {
    constructor(defaultDurationMs = 5000, timezone = 'Asia/Jakarta') {
        this.defaultDuration = defaultDurationMs;
        this.timezone = timezone;
        this.cooldowns = new Map();
    }

    /**
     * Set cooldown for user & command
     * @param {string} userId - User ID
     * @param {string} commandName - Command name
     * @param {number} durationMs - Cooldown duration in ms (optional, defaults to defaultDuration)
     */
    setCooldown(userId, commandName, durationMs = null) {
        const key = `${userId}:${commandName}`;
        const duration = durationMs || this.defaultDuration;
        this.cooldowns.set(key, Date.now() + duration);
    }

    /**
     * Check if user is on cooldown for command
     * @param {string} userId - User ID
     * @param {string} commandName - Command name
     * @returns {object} { onCooldown: boolean, remainingMs: number }
     */
    check(userId, commandName) {
        const key = `${userId}:${commandName}`;
        const cooldownTime = this.cooldowns.get(key);

        if (!cooldownTime) {
            return { onCooldown: false, remainingMs: 0 };
        }

        const now = Date.now();
        const remaining = cooldownTime - now;

        if (remaining <= 0) {
            this.cooldowns.delete(key);
            return { onCooldown: false, remainingMs: 0 };
        }

        return { onCooldown: true, remainingMs: remaining, remainingSeconds: Math.ceil(remaining / 1000) };
    }

    /**
     * Get all active cooldowns for user
     * @param {string} userId - User ID
     * @returns {array} Array of command names
     */
    getActiveCooldowns(userId) {
        const active = [];
        const now = Date.now();

        for (let [key, time] of this.cooldowns) {
            if (key.startsWith(`${userId}:`)) {
                if (time > now) {
                    active.push(key.split(':')[1]);
                } else {
                    this.cooldowns.delete(key);
                }
            }
        }

        return active;
    }

    /**
     * Clear cooldown for user & command
     * @param {string} userId - User ID
     * @param {string} commandName - Command name
     */
    clearCooldown(userId, commandName) {
        this.cooldowns.delete(`${userId}:${commandName}`);
    }

    /**
     * Clear all cooldowns for user
     * @param {string} userId - User ID
     */
    clearUserCooldowns(userId) {
        for (let key of this.cooldowns.keys()) {
            if (key.startsWith(`${userId}:`)) {
                this.cooldowns.delete(key);
            }
        }
    }
}

module.exports = { RateLimiter, Cooldown };
