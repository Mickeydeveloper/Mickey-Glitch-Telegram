const commandLoader = require('./commandLoader');
const { isOwner, isDeveloper, isAdmin } = require('./utils/helpers');
const logger = require('./utils/logger');
const ratelimit = require('./utils/ratelimit');

async function handleMessages(sock, chatUpdate, isForwarded = false, forwardContext = null) {
    try {
        const mek = chatUpdate.messages[0];
        if (!mek || !mek.message) return;

        const m = {
            ...mek,
            sock,
            isForwarded,
            forwardContext
        };

        // Extract message content
        const msg = mek.message;
        let text = '';

        if (msg.conversation) text = msg.conversation;
        else if (msg.extendedTextMessage) text = msg.extendedTextMessage.text;
        else if (msg.imageMessage) text = msg.imageMessage.caption || '';
        else if (msg.videoMessage) text = msg.videoMessage.caption || '';
        else if (msg.documentMessage) text = msg.documentMessage.caption || '';
        else return; // No text content

        if (!text.trim()) return;

        const from = mek.key.remoteJid;
        const sender = mek.key.fromMe ? sock.user.id : (mek.key.participant || from);
        const isGroup = from.endsWith('@g.us');
        const userId = sender.split('@')[0];

        // Create context for command execution
        const context = {
            sock,
            m,
            chatId: from,
            userId,
            sender,
            isGroup,
            isOwner: isOwner(userId),
            isDeveloper: isDeveloper(userId),
            isAdmin: isAdmin(userId),
            text,
            args: text.split(' ').slice(1),
            reply: async (text, options = {}) => {
                return await sock.sendMessage(from, { text }, options);
            },
            sendMessage: async (text, options = {}) => {
                return await sock.sendMessage(from, { text }, options);
            }
        };

        // Check rate limit
        if (!ratelimit.checkLimit(userId)) {
            await context.reply('❌ Rate limit exceeded. Please wait before sending another command.');
            return;
        }

        // Log message
        logger.info(`Message from ${userId}: ${text.substring(0, 100)}`);

        // Check if it's a command
        const commandData = parseCommand(text);
        if (commandData) {
            const { commandName, args } = commandData;
            context.args = args;

            // Execute command
            await commandLoader.execute(commandName, context);
        }

    } catch (error) {
        console.error('Error in handleMessages:', error);
        logger.error('handleMessages error:', error);
    }
}

async function handleStatus(sock, chatUpdate) {
    // Handle status updates if needed
    // For now, just log
    logger.info('Status update received');
}

function parseCommand(text) {
    if (!text || !text.trim()) return null;

    const trimmed = text.trim();
    let candidate = trimmed;
    let usedPrefix = false;

    // Check for prefix
    const prefix = process.env.BOT_PREFIX || '.';
    if (trimmed.startsWith(prefix)) {
        candidate = trimmed.slice(prefix.length).trim();
        usedPrefix = true;
    } else if (trimmed.startsWith('/')) {
        candidate = trimmed.slice(1).trim();
        usedPrefix = true;
    }

    const parts = candidate.split(/\s+/);
    const commandName = parts[0]?.toLowerCase();
    if (!commandName) return null;

    return {
        commandName,
        args: parts.slice(1),
        raw: trimmed,
        usedPrefix
    };
}

module.exports = {
    handleMessages,
    handleStatus
};