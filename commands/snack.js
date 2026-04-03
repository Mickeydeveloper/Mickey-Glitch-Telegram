const axios = require("axios");

module.exports = {
    name: 'snack',
    description: 'Download Snack Video',
    aliases: ['snackdl', 'snackvideo'],
    category: 'downloader',

    async execute(context) {
        const { message: { text }, sendMessage } = context;
        const snackUrl = text?.trim() || '';

        if (!snackUrl) {
            return sendMessage("❌ Please provide a Snack Video URL");
        }

        if (!snackUrl.includes("snackvideo.com")) {
            return sendMessage("❌ Please provide a valid Snack Video URL");
        }

        try {
            await sendMessage("⏳ Processing Snack Video download...");
            return sendMessage(
                "🍿 Snack Video downloader is available.\n\n" +
                "*URL:* " + snackUrl + "\n\n" +
                "_Feature requires API credentials configuration_"
            );
        } catch (error) {
            console.error("Snack Video error:", error);
            return sendMessage(`❌ Error: ${error.message}`);
        }
    }
};