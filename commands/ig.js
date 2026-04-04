const axios = require("axios");
const Helpers = require('../utils/helpers');

const IG_REGEX = /(?:https?:\/\/)?(?:www\.)?instagram\.com\S+/i;

module.exports = {
    name: 'ig',
    description: 'Download Instagram videos, reels, and posts',
    aliases: ['insta', 'instadl', 'igdl', 'instagram'],
    category: 'downloader',
    cooldown: 15000,

    async execute(context) {
        try {
            const { message: { text }, sendMessage } = context;
            const instagramUrl = text?.trim() || '';

            if (!instagramUrl) {
                return sendMessage("❌ Please provide an Instagram URL\n\n*Usage:* .ig <url>");
            }

            if (!IG_REGEX.test(instagramUrl)) {
                return sendMessage("❌ Invalid Instagram URL format");
            }

            await sendMessage(`⏳ Processing: ${Helpers.truncate(instagramUrl, 50)}...`);

            const message = `📷 *Instagram Media Downloader*\n\n` +
                `🔗 *URL:* ${instagramUrl}\n` +
                `⚙️ *Status:* Ready for API integration\n` +
                `💡 *Setup Required:* Configure Instagram API credentials\n\n` +
                `_Currently in demo mode. API integration coming soon!_`;

            await sendMessage(message);
        } catch (error) {
            console.error("Instagram error:", error);
            await context.sendMessage(
                Helpers.createErrorMessage('Download Error', 'Instagram downloader unavailable', error.message)
            );
        }
    }
};
        }
    }
};