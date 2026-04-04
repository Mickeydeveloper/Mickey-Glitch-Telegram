const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

class Logger {
    constructor(options = {}) {
        this.timezone = options.timezone || 'Asia/Jakarta';
        this.logDir = options.logDir || path.join(__dirname, '../logs');
        this.enableFileLogging = options.enableFileLogging !== false;
        this.enableConsole = options.enableConsole !== false;
        
        if (this.enableFileLogging && !fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getTimestamp() {
        return moment().tz(this.timezone).format('YYYY-MM-DD HH:mm:ss');
    }

    getLogFileName(level) {
        const date = moment().tz(this.timezone).format('YYYY-MM-DD');
        return path.join(this.logDir, `${level.toLowerCase()}-${date}.log`);
    }

    writeToFile(level, message, data = null) {
        if (!this.enableFileLogging) return;

        try {
            const timestamp = this.getTimestamp();
            let logEntry = `[${timestamp}] [${level}] ${message}`;
            if (data) {
                logEntry += `\nData: ${JSON.stringify(data, null, 2)}`;
            }
            logEntry += '\n';

            fs.appendFileSync(this.getLogFileName(level), logEntry);
        } catch (error) {
            // Silently fail for file logging
        }
    }

    info(message, data = null) {
        if (this.enableConsole) {
            console.log(chalk.blue(`ℹ️  ${message}`));
        }
        this.writeToFile('INFO', message, data);
    }

    success(message, data = null) {
        if (this.enableConsole) {
            console.log(chalk.green(`✅ ${message}`));
        }
        this.writeToFile('SUCCESS', message, data);
    }

    warn(message, data = null) {
        if (this.enableConsole) {
            console.warn(chalk.yellow(`⚠️  ${message}`));
        }
        this.writeToFile('WARN', message, data);
    }

    error(message, data = null) {
        if (this.enableConsole) {
            console.error(chalk.red(`❌ ${message}`));
        }
        this.writeToFile('ERROR', message, data);
    }

    debug(message, data = null) {
        if (!process.env.DEBUG) return;
        if (this.enableConsole) {
            console.debug(chalk.gray(`🐛 ${message}`));
        }
        this.writeToFile('DEBUG', message, data);
    }
}

module.exports = Logger;
