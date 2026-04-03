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
        pattern: "snack",
        category: "downloader",
        react: "🍿",
        aliases: ["snackdl", "snackvideo"],
        description: "Download Snack Video",
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
            return reply("Please provide a Snack Video URL");
        }

        if (!q.includes("snackvideo.com")) {
            await react("❌");
            return reply("Please provide a valid Snack Video URL");
        }

        try {
            const apiUrl = `${GiftedTechApi}/api/download/snackdl?apikey=${GiftedApiKey}&url=${encodeURIComponent(q)}`;
            const response = await axios.get(apiUrl, { timeout: 60000 });

            if (!response.data?.success || !response.data?.result) {
                await react("❌");
                return reply(
                    "Failed to fetch video. Please check the URL and try again.",
                );
            }

            const { title, media, thumbnail, author, like, comment, share } =
                response.data.result;

            if (!media) {
                await react("❌");
                return reply("No video found.");
            }

            const dateNow = Date.now();

            await sendButtons(Loftxmd, from, {
                title: `${botName} SNACK VIDEO`,
                text: `*Title:* ${title || "Snack Video"}\n*Author:* ${author || "Unknown"}\n*Likes:* ${like || "0"}\n\n*Select download type:*`,
                footer: botFooter,
                image: { url: thumbnail },
                buttons: [
                    { id: `sn_video_${dateNow}`, text: "Video" },
                    { id: `sn_audio_${dateNow}`, text: "Audio Only" },
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
                    if (selectedButtonId.startsWith("sn_video")) {
                        const fileSize = await getFileSize(media);
                        const sendAsDoc = fileSize > MAX_MEDIA_SIZE;

                        if (sendAsDoc) {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    document: { url: media },
                                    fileName: `${(title || "snack_video").replace(/[^\w\s.-]/gi, "")}.mp4`,
                                    mimetype: "video/mp4",
                                    caption: `*${title || "Snack Video"}*`,
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    video: { url: media },
                                    mimetype: "video/mp4",
                                    caption: `*${title || "Snack Video"}*`,
                                },
                                { quoted: messageData },
                            );
                        }
                    } else if (selectedButtonId.startsWith("sn_audio")) {
                        const videoBuffer = await gmdBuffer(media);
                        const audioBuffer = await toAudio(videoBuffer);
                        const fileSize = audioBuffer.length;

                        if (fileSize > MAX_MEDIA_SIZE) {
                            await Loftxmd.sendMessage(
                                from,
                                {
                                    document: audioBuffer,
                                    fileName: `${(title || "snack_audio").replace(/[^\w\s.-]/gi, "")}.mp3`,
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
                    console.error("Snack Video download error:", error);
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
            console.error("Snack Video API error:", error);
            await react("❌");
            return reply("An error occurred. Please try again.");
        }
    },
);