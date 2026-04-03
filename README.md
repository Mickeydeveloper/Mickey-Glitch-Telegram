# 🤖 ApocalypseBVG Bot - Multi-Platform Command System

## What's New ✨
This bot has been completely refactored with a **plugin-based command system** that:
- ✅ Works on **WhatsApp** AND **Telegram** simultaneously
- ✅ Auto-loads commands from the `commands/` folder
- ✅ Easy to create and manage commands
- ✅ No bugs from conflicting command handlers

## 📋 Features
- 🔌 **Plugin System** - Create commands by simply adding `.js` files to `commands/`
- 📱 **Multi-Platform** - Same commands work on WhatsApp & Telegram
- 👥 **User Management** - Owner, Admin, Premium user system
- 🔒 **Permission Control** - Commands can be restricted by role
- 🚀 **Auto-Loading** - New commands load automatically on restart
- 📊 **Activity Tracking** - User activity logging
- 💾 **Data Persistence** - Admin list, premium users, etc. saved locally

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Bot
Edit `config.js`:
```javascript
module.exports = {
  BOT_TOKEN: "YOUR_TELEGRAM_BOT_TOKEN",
  allowedDevelopers: ['YOUR_TELEGRAM_ID'], // Your Telegram ID
};
```

### 3. Start the Bot
```bash
npm start
```

The bot will:
1. Load all commands from `commands/` folder
2. Connect to Telegram
3. Be ready to accept commands

### 4. Pair WhatsApp Account
To connect a WhatsApp account, send a message in Telegram containing `/pair` followed by a number:
```
/pair 1234567890
```

The bot will generate a pairing code that you need to enter in WhatsApp:
1. Open WhatsApp on your phone
2. Go to Settings → Linked Devices  
3. Tap "Link a Device"
4. Enter the pairing code provided by the bot

The pairing code expires in 60 seconds.

## 📝 Using Commands

### On WhatsApp
Send messages with the `.` prefix:
```
.ping
.help
.admin add 1234567890
.status
```

### On Telegram
Send messages with the `.` prefix:
```
.ping
.help
.owner
.status
```

## 📚 Available Commands

| Command | Usage | Platforms |
|---------|-------|-----------|
| `.ping` | Test bot response | WhatsApp, Telegram |
| `.help` | Show all commands | WhatsApp, Telegram |
| `.status` | Bot status & uptime | WhatsApp, Telegram |
| `.owner` | Owner information | WhatsApp, Telegram |
| `.admin` | Manage admins (owner only) | WhatsApp, Telegram |
| `.ban` | Ban a user (admin only) | WhatsApp, Telegram |
| `.premium` | Manage premium users (owner only) | WhatsApp, Telegram |

## 🔧 Creating New Commands

1. Create a new file in `commands/` folder
2. Export an `execute` function
3. Restart the bot

Example: `commands/greet.js`
```javascript
async function execute(context) {
    const { args, sendMessage } = context;
    const name = args[0] || 'User';
    await sendMessage(`👋 Hello ${name}!`);
    return { success: true };
}
module.exports = { execute };
```

📖 **For detailed guide, see [PLUGIN_GUIDE.md](PLUGIN_GUIDE.md)**

## 📁 Project Structure
```
├── index.js                    # Main bot file
├── commandLoader.js            # Command loader
├── config.js                   # Configuration
├── PLUGIN_GUIDE.md            # Developer guide
├── admins.json                # Admin list
├── premiumUsers.json          # Premium users
├── userActivity.json          # User activity log
├── commands/                  # All commands
│   ├── ping.js
│   ├── help.js
│   ├── admin.js
│   ├── ban.js
│   ├── premium.js
│   ├── owner.js
│   ├── status.js
│   ├── template.js            # Use as template
│   └── ... (add your commands)
└── package.json
```

## 🔒 Permission Levels
- **Owner**: Full control (Telegram ID in config)
- **Developer**: Same as owner
- **Admin**: Management commands
- **Premium User**: Advanced features
- **Regular User**: Basic commands

## 🌐 Multi-Platform Support

### WhatsApp
- Powered by WhiskeySockets/Baileys
- Supports groups and private chats
- Command auto-detection

### Telegram
- Real-time message handling
- Inline replies
- Full markdown support

## 💾 Data Files
- `admins.json` - List of bot admins
- `premiumUsers.json` - Premium user data
- `userActivity.json` - User activity logs
- `ListDevice.json` - Connected devices

## ⚙️ Configuration

### Bot Token
Get Telegram token from [@BotFather](https://t.me/botfather)

### Owner ID
Your Telegram user ID (get it with `/whoami` on Telegram)

### WhatsApp Connection
Scan QR code at first startup to connect WhatsApp

## 🐛 Troubleshooting

**Bot not responding?**
- Check `npm start` logs for errors
- Verify Telegram token is correct
- Ensure WhatsApp is connected (check logs)

**New command not working?**
- Restart the bot
- Check command file syntax
- Verify file is in `commands/` folder
- Check browser console for errors

**WhatsApp connection lost?**
- Scan QR code again
- Check WhatsApp app on phone
- Clear browser cache

## 📖 Documentation
- [PLUGIN_GUIDE.md](PLUGIN_GUIDE.md) - Complete developer guide
- Command examples in `commands/` folder
- Inline code comments

## 🔄 Updates from Mickey-Glitch
This bot is based on the structure from [Mickey-Glitch](https://github.com/Mickeydeveloper/Mickey-Glitch) with:
- Simplified plugin system
- Dual platform support (WhatsApp + Telegram)
- Better error handling
- Cleaner code organization

## 📞 Need Help?
1. Check [PLUGIN_GUIDE.md](PLUGIN_GUIDE.md)
2. Look at existing commands in `commands/` folder
3. Check console logs for error messages

## 🚀 Ready to Develop?
The system is ready for you to:
- Add new commands easily
- Modify existing commands
- Create custom features
- Deploy without bugs

Start by creating your first command! 💪

---
**Version**: 1.0.0+Plugin  
**Status**: ✅ Online & Ready  
**Last Updated**: 2026
