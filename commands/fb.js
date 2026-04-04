const axios = require("axios");
const Helpers = require('../utils/helpers');

const FB_REGEX = /(?:https?:\/\/)?(?:www\.)?(facebook\.com|fb\.watch)\S+/i;

module.exports = {
    name: 'fb',
    description: 'Download Facebook videos',
    aliases: ['fbdl', 'facebookdl', 'facebook'],
    category: 'downloader',
    cooldown: 15000,

    async execute(context) {
        try {
            const { message: { text }, sendMessage } = context;
            const facebookUrl = text?.trim() || '';

            if (!facebookUrl) {
                return sendMessage("❌ Please provide a Facebook video URL\n\n*Usage:* .fb <url>");
            }

            if (!FB_REGEX.test(facebookUrl)) {
                return sendMessage("❌ Invalid Facebook URL format");
            }

            await sendMessage(`⏳ Processing: ${Helpers.truncate(facebookUrl, 50)}...`);

            const message = `📥 *Facebook Video Downloader*\n\n` +
                `🔗 *URL:* ${facebookUrl}\n` +
                `⚙️ *Status:* Ready for API integration\n` +
                `💡 *Setup Required:* Configure Facebook API credentials\n\n` +
                `_Currently in demo mode. API integration coming soon!_`;

            await sendMessage(message);
        } catch (error) {
            console.error("Facebook error:", error);
            await context.sendMessage(
                Helpers.createErrorMessage('Download Error', 'Facebook downloader temporarily unavailable', error.message)
            );
        }
    }
};