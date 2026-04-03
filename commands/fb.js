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
        pattern: "fb",
        category: "downloader",
        react: "📘",
        aliases: ["fbdl", "facebookdl", "facebook"],
        description: "Download Facebook videos",
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
            return reply("Please provide a Facebook video URL");
        }

        if (!q.includes("facebook.com") && !q.includes("fb.watch")) {
            await react("❌");
            return reply("Please provide a valid Facebook URL");
        }

        try {
            const apiUrl = `${GiftedTechApi}/api/download/facebook?apikey=${GiftedApiKey}&url=${encodeURIComponent(q)}`;
            const response = await axios.get(apiUrl, { timeout: 60000 });

            if (!response.data?.success || !response.data?.result) {
                await react("❌");
                return reply(
                    "Failed to fetch video. Please check the URL and try again.",
                );
            }

            const { title, duration, thumbnail, hd_video, sd_video } =
                response.data.result;
            const dateNow = Date.now();
            const videoUrl = hd_video || sd_video;

            const buttons = [];
            if (hd_video)
                buttons.push({ id: `fb_hd_${dateNow}`, text: "HD Quality" });
            if (sd_video)
                buttons.push({ id: `fb_sd_${dateNow}`, text: "SD Quality" });
            buttons.push({ id: `fb_audio_${dateNow}`, text: "Audio Only" });

            await sendButtons(Loftxmd, from, {
                title: `${botName} FACEBOOK DOWNLOADER`,
                text: `*Title:* ${title || "Facebook Video"}\n*Duration:* ${duration || "Unknown"}\n\n*Select download type:*`,
                footer: botFooter,
                image: { url: thumbnail },
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
                    if (selectedButtonId.startsWith("fb_audio")) {
                        const sourceVideo = hd_video || sd_video;
                        if (!sourceVideo) {
                            await react("❌");
                            return reply(
                                "No video available for audio extraction.",
                                messageData,
                            );
                        }

                        const videoBuffer = await gmdBuffer(sourceVideo);
                        if (!videoBuffer || videoBuffer instanceof Error || !Buffer.isBuffer(videoBuffer)) {
                            await react("❌");
                            return reply(
                                "Failed to download video for audio extraction. Please try again.",
                                messageData,
                            );
                        }
                        let audioBuffer;
                        try {
                            audioBuffer = await toAudio(videoBuffer);
                        } catch (audioErr) {
                            await react("❌");
                            const errMsg = audioErr.message || String(audioErr);
                            if (errMsg.includes('no audio')) {
                                return reply("This video has no audio track to extract.", messageData);
                            }
                            return reply("Failed to convert video to audio: " + errMsg, messageData);
                        }
                        if (!audioBuffer || !Buffer.isBuffer(audioBuffer)) {
                            await react("❌");
                            return reply(
                                "Failed to convert video to audio. The video format may not be supported.",
                                messageData,
                            );
                        }
                        const fileSize = audioBuffer.length;

                        if (fileSize > MAX_MEDIA_SIZE) {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    document: audioBuffer,
                                    fileName: `${(title || "facebook_audio").replace(/[^\w\s.-]/gi, "")}.mp3`,
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
                        const selectedVideoUrl = selectedButtonId.startsWith(
                            "fb_hd",
                        )
                            ? hd_video
                            : sd_video;

                        if (!selectedVideoUrl) {
                            await react("❌");
                            return reply(
                                "Selected quality not available.",
                                messageData,
                            );
                        }

                        const fileSize = await getFileSize(selectedVideoUrl);
                        const sendAsDoc = fileSize > MAX_MEDIA_SIZE;

                        if (sendAsDoc) {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    document: { url: selectedVideoUrl },
                                    fileName: `${(title || "facebook_video").replace(/[^\w\s.-]/gi, "")}.mp4`,
                                    mimetype: "video/mp4",
                                    caption: `*${title || "Facebook Video"}*`,
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    video: { url: selectedVideoUrl },
                                    mimetype: "video/mp4",
                                    caption: `*${title || "Facebook Video"}*`,
                                },
                                { quoted: messageData },
                            );
                        }
                    }

                    await react("✅");
                } catch (error) {
                    console.error("Facebook download error:", error);
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
            console.error("Facebook API error:", error);
            await react("❌");
            return reply("An error occurred. Please try again.");
        }
    },
);