const axios = require("axios");

module.exports = {
    name: 'twitter',
    description: 'Download Twitter/X videos',
    aliases: ['twitterdl', 'xdl', 'xdownloader', 'twitterdownloader', 'x'],
    category: 'downloader',

    async execute(context) {
        const { message: { text }, sendMessage } = context;
        const twitterUrl = text?.trim() || '';

        if (!twitterUrl) {
            return sendMessage("❌ Please provide a Twitter/X URL");
        }

        if (!twitterUrl.includes("twitter.com") && !twitterUrl.includes("x.com")) {
            return sendMessage("❌ Please provide a valid Twitter/X URL");
        }

        try {
            await sendMessage("⏳ Processing Twitter/X download...");
            return sendMessage(
                "🐦 Twitter downloader is available.\n\n" +
                "*URL:* " + twitterUrl + "\n\n" +
                "_Feature requires API credentials configuration_"
            );
        } catch (error) {
            console.error("Twitter error:", error);
            return sendMessage(`❌ Error: ${error.message}`);
        }
    }
};