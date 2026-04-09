# 🚀 Mickey Glitch Telegram Bot - Quick Start Guide

## ⚙️ Setup Instructions

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Create .env File**
Create a `.env` file in the root directory with:
```env
BOT_TOKEN=your_telegram_bot_token_here
BOT_PREFIX=.
BOT_TIMEZONE=Asia/Jakarta
BOT_VERSION=5.0.0
ALLOWED_DEVELOPERS=your_telegram_id,another_id
OWNERS=your_telegram_id
DEVELOPERS=your_telegram_id,another_id
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000
COMMAND_COOLDOWN_MS=3000
LOG_FILE_ENABLED=true
LOG_DIR=./logs
DEBUG=false
```

### 3. **Start the Bot**
```bash
node index.js
```

Or with PM2 (recommended):
```bash
pm2 start index.js --name "mickey-glitch"
pm2 logs mickey-glitch
```

## 📱 Available Commands

### Owner/Developer Commands
- **.update** - Update bot from GitHub
- **.pair [number]** - Generate WhatsApp pairing code (Telegram)

### General Commands
- **.ping** - Check bot speed
- **.menu** - Show command menu
- **.download [url]** - Download video from link
- **.gitclone [repo]** - Get GitHub repository info
- **.group** - Group management

### Chatbot Features
- Chat naturally with the bot
- Say "hello", "hi", "hey" for greeting
- Say "status", "alive", "uptime" for bot status
- Say "help", "menu", "commands" for command list

## 🔧 Configuration

All settings can be configured via `.env` file or `config.js`:

| Setting | Default | Description |
|---------|---------|-------------|
| BOT_PREFIX | . | Command prefix |
| BOT_TIMEZONE | Asia/Jakarta | Timezone for timestamps |
| RATE_LIMIT_MAX_REQUESTS | 10 | Requests allowed per window |
| RATE_LIMIT_WINDOW_MS | 60000 | Time window in ms (1 minute) |
| COMMAND_COOLDOWN_MS | 3000 | Cooldown between commands |
| LOG_FILE_ENABLED | true | Enable file logging |
| LOG_DIR | ./logs | Log directory |
| DEBUG | false | Enable debug mode |

## 📊 Project Structure

```
├── index.js              # Main entry point
├── main.js              # Message handler
├── settings.js          # Global settings
├── commandLoader.js     # Command loader
├── config.js            # Configuration
├── package.json         # Dependencies
├── commands/
│   ├── ping.js
│   ├── menu.js
│   ├── download.js
│   ├── gitclone.js
│   ├── group.js
│   ├── update.js
│   └── pair.js
├── utils/
│   ├── helpers.js       # Utility functions
│   ├── validator.js     # Input validation
│   ├── logger.js        # Logging
│   ├── ratelimit.js     # Rate limiting
│   ├── errors.js        # Custom errors
│   └── config.js        # Config utilities
├── session/             # WhatsApp session (auto-created)
├── logs/               # Log files (auto-created)
└── RECONSTRUCTION_REPORT.md  # Detailed report
```

## 🌐 Connecting to WhatsApp & Telegram

### WhatsApp (Baileys)
The bot automatically creates a session in the `./session` folder. To pair:
1. Send `/start` to the Telegram bot
2. Send your phone number (e.g., 255615858685)
3. Copy the pairing code from the bot
4. Use in WhatsApp: Linked Devices → Link with phone number

### Telegram
The bot uses polling to receive messages. No additional setup needed besides BOT_TOKEN.

## 📝 Logging

Logs are saved to `./logs/` and displayed in console:
- **INFO** - General information
- **WARN** - Warnings
- **ERROR** - Error messages
- **DEBUG** - Debug information (when DEBUG=true)

View logs:
```bash
tail -f logs/bot.log
# or
cat logs/bot.log
```

## 🔒 Security Notes

1. Keep .env file secret (add to .gitignore)
2. Use strong bot tokens
3. Only add trusted user IDs as developers/owners
4. Enable rate limiting to prevent abuse
5. Monitor log files for suspicious activity

## ⚡ Performance Tips

1. Use PM2 or similar process manager for auto-restart
2. Monitor resource usage: `pm2 monit`
3. Clear old session files regularly
4. Keep dependencies updated: `npm update`
5. Use `NODE_ENV=production` for better performance

## 🐛 Troubleshooting

### Bot not responding
1. Check if bot is running: `pm2 list`
2. Check logs: `pm2 logs mickey-glitch`
3. Verify BOT_TOKEN in .env
4. Make sure network connection is active

### Commands not working
1. Use correct prefix: `.command`
2. Check if you have required permissions (owner/developer)
3. Check command spelling
4. See available commands with `.menu`

### WhatsApp pairing issues
1. Use correct phone number format (with country code)
2. Make sure main WhatsApp account is active
3. Wait for pairing code to appear
4. Complete pairing within 1 minute

### Rate limiting issues
1. Adjust RATE_LIMIT_MAX_REQUESTS
2. Increase RATE_LIMIT_WINDOW_MS
3. Wait for cooldown to expire

## 📚 Additional Resources

- **Baileys** (WhatsApp): https://github.com/WhiskeySockets/Baileys
- **Telegram API**: https://core.telegram.org/
- **node-telegram-bot-api**: https://github.com/yagop/node-telegram-bot-api

## 📞 Support

For issues or questions:
1. Check the RECONSTRUCTION_REPORT.md
2. Review logs for error messages
3. Check GitHub issues
4. Create a new issue with logs and details

---

**Bot Status**: ✅ Ready to Deploy  
**Last Updated**: 2026-04-09  
**Version**: 5.0.0