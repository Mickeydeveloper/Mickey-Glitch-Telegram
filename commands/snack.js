const axios = require("axios");
const Helpers = require('../utils/helpers');

const SNACK_REGEX = /(?:https?:\/\/)?(?:www\.)?snackvideo\.com\S+/i;

module.exports = {
    name: 'snack',
    description: 'Download Snack videos',
    aliases: ['snackdl', 'snackvideo'],
    category: 'downloader',
    cooldown: 15000,

    async execute(context) {
        try {
            const { message: { text }, sendMessage } = context;
            const snackUrl = text?.trim() || '';

            if (!snackUrl) {
                return sendMessage("❌ Please provide a Snack video URL\n\n*Usage:* .snack <url>");
            }

            if (!SNACK_REGEX.test(snackUrl)) {
                return sendMessage("❌ Invalid Snack Video URL format");
            }

            await sendMessage(`⏳ Processing: ${Helpers.truncate(snackUrl, 50)}...`);

            const message = `🎬 *Snack Video Downloader*\n\n` +
                `🔗 *URL:* ${snackUrl}\n` +
                `⚙️ *Status:* Ready for API integration\n` +
                `💡 *Setup Required:* Configure Snack Video API credentials\n\n` +
                `_Currently in demo mode. API integration coming soon!_`;

            await sendMessage(message);
        } catch (error) {
            console.error("Snack error:", error);
            await context.sendMessage(
                Helpers.createErrorMessage('Download Error', 'Snack Video downloader unavailable', error.message)
            );
        }
    }
};
        }
    }
};