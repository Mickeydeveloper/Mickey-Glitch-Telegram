const axios = require('axios');

module.exports = {
    name: 'download',
    description: 'Download video yoyote (YT, FB, IG, TikTok) kwa kutumia API ya Nayan',
    aliases: ['d', 'alldown', 'dl'],
    category: 'downloader',

    async execute(context) {
        const { sock, chatId, args, sendMessage, msg } = context;
        const videoUrl = args[0];

        if (!videoUrl) {
            return sendMessage("❌ Tafadhali weka link ya video unayotaka kudownload!\n\n*Usage:* .download https://youtu.be/xxx");
        }

        try {
            await sendMessage("⏳ _Inatafuta video yako, tafadhali subiri..._");

            // 1. Call the API
            const response = await axios.get(`https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(videoUrl)}`);
            const res = response.data;

            if (!res.data || !res.data.status) {
                return sendMessage("❌ Imeshindikana kupata video hiyo. Hakikisha link ni sahihi.");
            }

            const videoData = res.data.data;
            const title = videoData.title || "Mickey Glitch Video";
            const highQuality = videoData.high;
            const lowQuality = videoData.low;
            const thumb = videoData.thumbnail;

            // 2. Tuma Maelezo ya Video na Button ya kuchagua (External Ad Reply Style)
            // Hii inatengeneza muonekano wa Pro
            await sock.sendMessage(chatId, {
                text: `🎬 *VIDEO DOWNLOADER* 🎬\n\n📌 *Title:* ${title}\n✨ *Dev:* ${res.data.developer}\n\n_Chagua Quality hapa chini kuanza download_`,
                contextInfo: {
                    externalAdReply: {
                        title: "MICKEY GLITCH DOWNLOADER",
                        body: title,
                        thumbnailUrl: thumb,
                        sourceUrl: videoUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });

            // 3. Tuma Video Moja kwa moja (Default inatuma High Quality)
            // Unaweza kuongeza logic ya kuchagua quality, lakini kwa urahisi tunatuma High
            await sendMessage(`🚀 *Inatuma video sasa hivi...*`);

            await sock.sendMessage(chatId, {
                video: { url: highQuality },
                caption: `✅ *Success:* ${title}\n\n©2026 Mickey Labs™`,
                mimetype: 'video/mp4',
                fileName: `${title}.mp4`
            }, { quoted: msg });

        } catch (error) {
            console.error("Download Error:", error);
            await sendMessage(`❌ Hitilafu ya API: ${error.message}`);
        }
    }
};
