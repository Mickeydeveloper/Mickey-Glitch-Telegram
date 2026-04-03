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
        pattern: "twitter",
        category: "downloader",
        react: "🐦",
        aliases: ["twitterdl", "xdl", "xdownloader", "twitterdownloader", "x"],
        description: "Download Twitter/X videos",
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
            return reply("Please provide a Twitter/X URL");
        }

        if (!q.includes("twitter.com") && !q.includes("x.com")) {
            await react("❌");
            return reply("Please provide a valid Twitter/X URL");
        }

        try {
            const apiUrl = `${GiftedTechApi}/api/download/twitter?apikey=${GiftedApiKey}&url=${encodeURIComponent(q)}`;
            const response = await axios.get(apiUrl, { timeout: 60000 });

            if (!response.data?.success || !response.data?.result) {
                await react("❌");
                return reply(
                    "Failed to fetch video. Please check the URL and try again.",
                );
            }

            const { thumbnail, videoUrls } = response.data.result;

            if (!videoUrls || videoUrls.length === 0) {
                await react("❌");
                return reply("No video found in this tweet.");
            }

            const dateNow = Date.now();
            const buttons = videoUrls.map((v, index) => ({
                id: `tw_${index}_${dateNow}`,
                text: `${v.quality} Quality`,
            }));
            buttons.push({ id: `tw_audio_${dateNow}`, text: "Audio Only" });

            await sendButtons(Loftxmd, from, {
                title: `${botName} TWITTER DOWNLOADER`,
                text: `*Available qualities:* ${videoUrls.map((v) => v.quality).join(", ")}\n\n*Select download type:*`,
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
                    if (selectedButtonId.startsWith("tw_audio")) {
                        const bestVideo = videoUrls[0]?.url;
                        if (!bestVideo) {
                            await react("❌");
                            return reply(
                                "No video available for audio extraction.",
                                messageData,
                            );
                        }

                        const videoBuffer = await gmdBuffer(bestVideo);
                        const audioBuffer = await toAudio(videoBuffer);
                        const fileSize = audioBuffer.length;

                        if (fileSize > MAX_MEDIA_SIZE) {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    document: audioBuffer,
                                    fileName: "twitter_audio.mp3",
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
                        const index = parseInt(selectedButtonId.split("_")[1]);
                        const videoUrl = videoUrls[index]?.url;

                        if (!videoUrl) {
                            await react("❌");
                            return reply(
                                "Selected quality not available.",
                                messageData,
                            );
                        }

                        const fileSize = await getFileSize(videoUrl);
                        const sendAsDoc = fileSize > MAX_MEDIA_SIZE;

                        if (sendAsDoc) {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    document: { url: videoUrl },
                                    fileName: `twitter_video_${videoUrls[index].quality}.mp4`,
                                    mimetype: "video/mp4",
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    video: { url: videoUrl },
                                    mimetype: "video/mp4",
                                },
                                { quoted: messageData },
                            );
                        }
                    }

                    await react("✅");
                } catch (error) {
                    console.error("Twitter download error:", error);
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
            console.error("Twitter API error:", error);
            await react("❌");
            return reply("An error occurred. Please try again.");
        }
    },
);