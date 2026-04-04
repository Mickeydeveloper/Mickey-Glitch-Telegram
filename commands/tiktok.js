const axios = require("axios");
const Helpers = require('../utils/helpers');

const TIKTOK_REGEX = /(?:https?:\/\/)?(?:www\.)?tiktok\.com\S+/i;

module.exports = {
    name: 'tiktok',
    description: 'Download TikTok videos without watermark',
    aliases: ['tiktokdl', 'ttdl', 'tt'],
    category: 'downloader',
    cooldown: 15000,

    async execute(context) {
        try {
            const { message: { text }, sendMessage } = context;
            const tiktokUrl = text?.trim() || '';

            if (!tiktokUrl) {
                return sendMessage("❌ Please provide a TikTok URL\n\n*Usage:* .tiktok <url>");
            }

            if (!TIKTOK_REGEX.test(tiktokUrl)) {
                return sendMessage("❌ Invalid TikTok URL format");
            }

            await sendMessage(`⏳ Processing: ${Helpers.truncate(tiktokUrl, 50)}...`);

            const message = `📸 *TikTok Video Downloader*\n\n` +
                `🔗 *URL:* ${tiktokUrl}\n` +
                `⚙️ *Status:* Ready for API integration\n` +
                `💡 *Setup Required:* Configure TikTok API credentials\n\n` +
                `_Currently in demo mode. API integration coming soon!_`;

            await sendMessage(message);
        } catch (error) {
            console.error("TikTok error:", error);
            await context.sendMessage(
                Helpers.createErrorMessage('Download Error', 'TikTok downloader unavailable', error.message)
            );
        }
    }
};