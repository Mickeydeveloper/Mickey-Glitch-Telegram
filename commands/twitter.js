const axios = require("axios");
const Helpers = require('../utils/helpers');

const TWITTER_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\S+/i;

module.exports = {
    name: 'twitter',
    description: 'Download Twitter/X videos and media',
    aliases: ['twitterdl', 'xdl', 'xdownloader', 'twitterdownloader', 'x'],
    category: 'downloader',
    cooldown: 15000,

    async execute(context) {
        try {
            const { message: { text }, sendMessage } = context;
            const twitterUrl = text?.trim() || '';

            if (!twitterUrl) {
                return sendMessage("❌ Please provide a Twitter/X URL\n\n*Usage:* .twitter <url>");
            }

            if (!TWITTER_REGEX.test(twitterUrl)) {
                return sendMessage("❌ Invalid Twitter/X URL format");
            }

            await sendMessage(`⏳ Processing: ${Helpers.truncate(twitterUrl, 50)}...`);

            const message = `🐦 *Twitter/X Media Downloader*\n\n` +
                `🔗 *URL:* ${twitterUrl}\n` +
                `⚙️ *Status:* Ready for API integration\n` +
                `💡 *Setup Required:* Configure Twitter API v2 credentials\n\n` +
                `_Currently in demo mode. API integration coming soon!_`;

            await sendMessage(message);
        } catch (error) {
            console.error("Twitter error:", error);
            await context.sendMessage(
                Helpers.createErrorMessage('Download Error', 'Twitter/X downloader unavailable', error.message)
            );
        }
    }
};