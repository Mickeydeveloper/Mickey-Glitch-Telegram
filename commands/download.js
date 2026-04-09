const axios = require('axios');

module.exports = {
    name: 'download',
    description: 'Download video yoyote kwa kutumia Nayan API',
    aliases: ['d', 'alldown', 'dl'],
    category: 'downloader',

    async execute(context) {
        const { sock, chatId, args, reply, msg, type, ctx } = context;
        const videoUrl = args[0];

        if (!videoUrl) {
            return await reply("❌ Please provide a video link!\n*Usage:* .download <video-url>");
        }

        try {
            await reply("⏳ Downloading video, please wait...");

            // Set timeout for API call
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const apiUrl = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(videoUrl)}`;
            const response = await axios.get(apiUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            const res = response.data;
            const mainData = res.data?.data || res.data; 

            if (!mainData || (!mainData.high && !mainData.low)) {
                return await reply("❌ Could not retrieve video. Please try again later.");
            }

            const title = (mainData.title || "Video").substring(0, 50);
            const videoLink = mainData.high || mainData.low;
            const thumb = mainData.thumbnail || "";

            if (type === 'whatsapp') {
                try {
                    await sock.sendMessage(chatId, {
                        text: `🎬 *DOWNLOAD READY* 🎬\n\n📌 *Title:* ${title}\n🚀 *Status:* Sending Video...`,
                        contextInfo: {
                            externalAdReply: {
                                title: "MICKEY GLITCH DL",
                                body: title,
                                thumbnailUrl: thumb,
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    }, { quoted: msg });

                    await sock.sendMessage(chatId, {
                        video: { url: videoLink },
                        caption: `✅ *Success:* ${title}`,
                        mimetype: 'video/mp4'
                    }, { quoted: msg });
                } catch (whatsappError) {
                    console.error("WhatsApp send error:", whatsappError.message);
                    await reply("❌ Failed to send video on WhatsApp");
                }
            } else if (type === 'telegram') {
                try {
                    await ctx.replyWithVideo({ url: videoLink }, { caption: `✅ *Success:* ${title}` });
                } catch (telegramError) {
                    console.error("Telegram send error:", telegramError.message);
                    await reply("❌ Failed to send video on Telegram");
                }
            }

        } catch (error) {
            console.error("Download Error:", error.message);
            if (error.code === 'ABORT_ERR') {
                await reply("❌ Download timeout. Server took too long to respond.");
            } else {
                await reply(`❌ Error: ${error.message.substring(0, 50)}`);
            }
        }
    }
};
