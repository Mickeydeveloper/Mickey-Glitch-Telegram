const axios = require('axios');

module.exports = {
    name: 'download',
    description: 'Download video yoyote kwa kutumia Nayan API',
    aliases: ['d', 'alldown', 'dl'],
    category: 'downloader',

    async execute(context) {
        const { sock, chatId, args, sendMessage, msg, type, ctx } = context;
        const videoUrl = args[0];

        if (!videoUrl) {
            return sendMessage("❌ Tafadhali weka link! \n*Usage:* .download https://link-ya-video");
        }

        try {
            await sendMessage("⏳ _Inatafuta video, tafadhali subiri..._");

            // Encode link ili isilete error kwenye URL
            const apiUrl = `https://nayan-video-downloader.vercel.app/alldown?url=${encodeURIComponent(videoUrl)}`;
            const response = await axios.get(apiUrl);
            
            // Angalia muundo wa data (Nayan API wakati mwingine inarudisha data ndani ya data)
            const res = response.data;
            const mainData = res.data?.data || res.data; 

            if (!mainData || (!mainData.high && !mainData.low)) {
                return sendMessage("❌ API imeshindwa kupata video hii sasa hivi. Jaribu tena baadae.");
            }

            const title = mainData.title || "Mickey Video";
            const videoLink = mainData.high || mainData.low;
            const thumb = mainData.thumbnail || "";

            if (type === 'whatsapp') {
                // Tuma Info na Picha kwanza (WhatsApp)
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

                // Tuma Video yenyewe
                await sock.sendMessage(chatId, {
                    video: { url: videoLink },
                    caption: `✅ *Success:* ${title}`,
                    mimetype: 'video/mp4'
                }, { quoted: msg });

            } else if (type === 'telegram') {
                // Tuma Video (Telegram)
                await ctx.replyWithVideo({ url: videoLink }, { caption: `✅ *Success:* ${title}` });
            }

        } catch (error) {
            console.error("Download Error:", error);
            await sendMessage(`❌ Hitilafu: Video hii haiwezi kupatikana kwa sasa.`);
        }
    }
};
