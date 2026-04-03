const {
    gmd,
    gitRepoRegex,
    MAX_MEDIA_SIZE,
    getFileSize,
    getMimeCategory,
    getMimeFromUrl,
} = require("../loft"),
LOFT_DLS = require("loft-dls"),
loftDls = new LOFT_DLS(),
axios = require("axios"),
{ sendButtons } = require("gifted-btns");

function extractButtonId(msg) {
    if (!msg) return null;
    if (msg.templateButtonReplyMessage?.selectedId)
        return msg.templateButtonReplyMessage.selectedId;
    if (msg.buttonsResponseMessage?.selectedButtonId)
        return msg.buttonsResponseMessage.selectedButtonId;
    if (msg.listResponseMessage?.singleSelectReply?.selectedRowId)
        return msg.listResponseMessage.singleSelectReply.selectedRowId;
    if (msg.interactiveResponseMessage) {
        const nf = msg.interactiveResponseMessage.nativeFlowResponseMessage;
        if (nf?.paramsJson) {
            try { const p = JSON.parse(nf.paramsJson); if (p.id) return p.id; } catch {}
        }
        return msg.interactiveResponseMessage.buttonId || null;
    }
    return null;
}

gmd(
    {
        pattern: "ig",
        category: "downloader",
        react: "📸",
        aliases: ["insta", "instadl", "igdl", "instagram"],
        description: "Download Instagram reels/videos",
    },
    async (from, Loftxmd, conText) => {
        const {
            q,
            mek,
            reply,
            react,
            botName,
            botFooter,
            newsletterJid,
            gmdBuffer,
            toAudio,
            formatAudio,
            LoftxmdTechApi,
            LoftxmdApiKey,
        } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide an Instagram URL");
        }

        if (!q.includes("instagram.com")) {
            await react("❌");
            return reply("Please provide a valid Instagram URL");
        }

        try {
            const apiUrl = `${GiftedTechApi}/api/download/instadl?apikey=${GiftedApiKey}&url=${encodeURIComponent(q)}`;
            const response = await axios.get(apiUrl, { timeout: 60000 });

            if (!response.data?.success || !response.data?.result) {
                await react("❌");
                return reply(
                    "Failed to fetch content. Please check the URL and try again.",
                );
            }

            const { thumbnail, download_url } = response.data.result;

            if (!download_url) {
                await react("❌");
                return reply("No downloadable content found.");
            }

            const dateNow = Date.now();

            await sendButtons(Loftxmd, from, {
                title: `${botName} INSTAGRAM DOWNLOADER`,
                text: `*Select download type:*`,
                footer: botFooter,
                image: { url: thumbnail },
                buttons: [
                    { id: `ig_video_${dateNow}`, text: "Video" },
                    { id: `ig_audio_${dateNow}`, text: "Audio Only" },
                ],
            });

            const handleResponse = async (event) => {
                const messageData = event.messages[0];
                if (!messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId) return;
                if (!selectedButtonId.includes(`_${dateNow}`)) return;

                const isFromSameChat = messageData.key?.remoteJid === from;
                if (!isFromSameChat) return;

                await react("⬇️");

                try {
                    if (selectedButtonId.startsWith("ig_audio")) {
                        const videoBuffer = await gmdBuffer(download_url);
                        const audioBuffer = await toAudio(videoBuffer);
                        const fileSize = audioBuffer.length;

                        if (fileSize > MAX_MEDIA_SIZE) {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    document: audioBuffer,
                                    fileName: "instagram_audio.mp3",
                                    mimetype: "audio/mpeg",
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    audio: audioBuffer,
                                    mimetype: "audio/mpeg",
                                },
                                { quoted: messageData },
                            );
                        }
                    } else {
                        const fileSize = await getFileSize(download_url);
                        const sendAsDoc = fileSize > MAX_MEDIA_SIZE;

                        if (sendAsDoc) {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    document: { url: download_url },
                                    fileName: "instagram_video.mp4",
                                    mimetype: "video/mp4",
                                    caption: `*Downloaded via ${botName}*`,
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    video: { url: download_url },
                                    mimetype: "video/mp4",
                                    caption: `*Downloaded via ${botName}*`,
                                },
                                { quoted: messageData },
                            );
                        }
                    }

                    await react("✅");
                } catch (error) {
                    console.error("Instagram download error:", error);
                    await react("❌");
                    await reply(
                        "Failed to download. Please try again.",
                        messageData,
                    );
                }
            };

            Loftxmd.ev.on("messages.upsert", handleResponse);
            setTimeout(
                () => Loftxmd.ev.off("messages.upsert", handleResponse),
                300000,
            );
        } catch (error) {
            console.error("Instagram API error:", error);
            await react("❌");
            return reply("An error occurred. Please try again.");
        }
    },
);