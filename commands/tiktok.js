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
        pattern: "tiktok",
        category: "downloader",
        react: "🎵",
        aliases: ["tiktokdl", "ttdl", "tt"],
        description: "Download TikTok videos",
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
            return reply("Please provide a TikTok URL");
        }

        if (!q.includes("tiktok.com")) {
            await react("❌");
            return reply("Please provide a valid TikTok URL");
        }

        try {
            const endpoints = [
                "tiktok",
                "tiktokdlv2",
                "tiktokdlv3",
                "tiktokdlv4",
            ];

            const t0 = Date.now();
            const result = await Promise.any(
                endpoints.map(endpoint => {
                    const apiUrl = `${GiftedTechApi}/api/download/${endpoint}?apikey=${GiftedApiKey}&url=${encodeURIComponent(q)}`;
                    return axios.get(apiUrl, { timeout: 20000 }).then(res => {
                        if (res.data?.success && res.data?.result) {
                            return res.data.result;
                        }
                        throw new Error(`${endpoint}: no result`);
                    });
                })
            ).catch(() => null);

            if (!result) {
                await react("❌");
                return reply(
                    "Failed to fetch TikTok video. Please try again later.",
                );
            }

            const { title, video, music, cover, author } = result;
            const dateNow = Date.now();

            const buttons = [
                { id: `tt_video_${dateNow}`, text: "Video" },
                { id: `tt_audio_${dateNow}`, text: "Audio Only" },
            ];

            await sendButtons(Loftxmd, from, {
                title: `${botName} TIKTOK DOWNLOADER`,
                text: `*Title:* ${title || "TikTok Video"}\n*Author:* ${author?.name || "Unknown"}\n\n*Select download type:*`,
                footer: botFooter,
                image: { url: cover },
                buttons: buttons,
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
                    if (selectedButtonId.startsWith("tt_video")) {
                        const fileSize = await getFileSize(video);
                        const sendAsDoc = fileSize > MAX_MEDIA_SIZE;

                        if (sendAsDoc) {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    document: { url: video },
                                    fileName: `${(title || "tiktok_video").replace(/[^\w\s.-]/gi, "")}.mp4`,
                                    mimetype: "video/mp4",
                                    caption: `*${title || "TikTok Video"}*`,
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    video: { url: video },
                                    mimetype: "video/mp4",
                                    caption: `*${title || "TikTok Video"}*`,
                                },
                                { quoted: messageData },
                            );
                        }
                    } else if (selectedButtonId.startsWith("tt_audio")) {
                        let audioBuffer;

                        if (music) {
                            audioBuffer = await gmdBuffer(music);
                            audioBuffer = await formatAudio(audioBuffer);
                        } else {
                            const videoBuffer = await gmdBuffer(video);
                            audioBuffer = await toAudio(videoBuffer);
                        }

                        const fileSize = audioBuffer.length;

                        if (fileSize > MAX_MEDIA_SIZE) {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    document: audioBuffer,
                                    fileName: `${(title || "tiktok_audio").replace(/[^\w\s.-]/gi, "")}.mp3`,
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
                    }

                    await react("✅");
                } catch (error) {
                    console.error("TikTok download error:", error);
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
            console.error("TikTok API error:", error);
            await react("❌");
            return reply("An error occurred. Please try again.");
        }
    },
);