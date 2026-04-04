// Load environment variables
require('dotenv').config();

module.exports = {
  // Core Settings
  BOT_TOKEN: process.env.BOT_TOKEN || "8015831619:AAG6frwGPB6OkT1NCLFtJPuNDOnJHRmsGKg",
  allowedDevelopers: (process.env.ALLOWED_DEVELOPERS || '8050573929').split(',').map(id => id.trim()),
  
  // Bot Configuration
  prefix: process.env.BOT_PREFIX || '.',
  timezone: process.env.BOT_TIMEZONE || 'Asia/Jakarta',
  version: process.env.BOT_VERSION || '5.0.0',
  
  // Command Paths
  commandsPath: [
    "https://github.com/Mickeydeveloper/Mickey-Glitch/tree/main/commands"
  ],
  
  // WhatsApp Settings
  whatsappAutoConnect: process.env.WHATSAPP_AUTO_CONNECT !== 'false',
  whatsappSessionPath: process.env.WHATSAPP_SESSION_PATH || './session',
  
  // Rate Limiting
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  
  // Command Cooldown
  commandCooldownMs: parseInt(process.env.COMMAND_COOLDOWN_MS || '3000'),
  
  // Logging
  logFileEnabled: process.env.LOG_FILE_ENABLED !== 'false',
  logDir: process.env.LOG_DIR || './logs',
  
  // Premium Features
  premiumEnabled: process.env.PREMIUM_ENABLED !== 'false',
  
  // Maintenance Mode
  maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
  maintenanceMessage: process.env.MAINTENANCE_MESSAGE || 'Bot is under maintenance. Please try again later.',
  
  // Debug
  debug: process.env.DEBUG === 'true'
};