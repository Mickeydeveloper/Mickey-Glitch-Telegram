const axios = require("axios");

module.exports = {
    name: 'ig',
    description: 'Download Instagram reels/videos',
    aliases: ['insta', 'instadl', 'igdl', 'instagram'],
    category: 'downloader',

    async execute(context) {
        const { message: { text }, sendMessage } = context;
        const instagramUrl = text?.trim() || '';

        if (!instagramUrl) {
            return sendMessage("❌ Please provide an Instagram URL");
        }

        if (!instagramUrl.includes("instagram.com")) {
            return sendMessage("❌ Please provide a valid Instagram URL");
        }

        try {
            await sendMessage("⏳ Processing Instagram download...");
            return sendMessage(
                "📸 Instagram downloader is available.\n\n" +
                "*URL:* " + instagramUrl + "\n\n" +
                "_Feature requires API credentials configuration_"
            );
        } catch (error) {
            console.error("Instagram error:", error);
            return sendMessage(`❌ Error: ${error.message}`);
        }
    }
};