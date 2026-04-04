const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class ConfigManager {
    constructor(configPath = null) {
        this.configPath = configPath || path.join(__dirname, '../config.js');
        this.envPath = path.join(__dirname, '../.env');
        this.config = this.loadConfig();
    }

    loadConfig() {
        const config = {};

        // Load from .env if exists
        if (fs.existsSync(this.envPath)) {
            try {
                const envContent = fs.readFileSync(this.envPath, 'utf-8');
                const lines = envContent.split('\n');

                for (const line of lines) {
                    if (!line.trim() || line.trim().startsWith('#')) continue;
                    const [key, value] = line.split('=').map(s => s.trim());
                    if (key && value) {
                        config[key] = this.parseValue(value);
                    }
                }
            } catch (error) {
                console.warn(chalk.yellow(`⚠️  Failed to load .env: ${error.message}`));
            }
        }

        // Load from config.js
        try {
            const fileConfig = require(this.configPath);
            Object.assign(config, fileConfig || {});
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Failed to load config.js: ${error.message}`));
        }

        return config;
    }

    parseValue(value) {
        // Try parsing as JSON
        try {
            return JSON.parse(value);
        } catch (e) {
            // Return as string if not JSON
            return value;
        }
    }

    get(key, defaultValue = null) {
        // Check environment variable first
        const envKey = `BOT_${key.toUpperCase()}`;
        if (process.env[envKey] !== undefined) {
            return this.parseValue(process.env[envKey]);
        }

        // Check config object
        if (this.config[key] !== undefined) {
            return this.config[key];
        }

        return defaultValue;
    }

    getRequired(key) {
        const value = this.get(key);
        if (value === null || value === undefined || value === '') {
            throw new Error(`Required config key not found: ${key}`);
        }
        return value;
    }

    set(key, value) {
        this.config[key] = value;
    }

    has(key) {
        return this.config[key] !== undefined;
    }

    validate() {
        const required = ['BOT_TOKEN', 'allowedDevelopers'];
        const missing = [];

        for (const key of required) {
            if (!this.has(key) && !process.env[`BOT_${key.toUpperCase()}`]) {
                missing.push(key);
            }
        }

        if (missing.length > 0) {
            console.error(chalk.red('❌ MISSING REQUIRED CONFIG:'));
            console.error(chalk.yellow('Missing:', missing.join(', ')));
            console.error(chalk.cyan('Add to config.js or .env file'));
            return false;
        }

        return true;
    }

    getAll() {
        return { ...this.config };
    }
}

module.exports = ConfigManager;
