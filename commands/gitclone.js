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
        pattern: "gitclone",
        category: "downloader",
        react: "📦",
        aliases: ["gitdl", "github", "git", "repodl", "clone"],
        description: "Download GitHub repository as zip file",
    },
    async (from, Loftxmd, conText) => {
        const { q, mek, reply, react, sender, botName, newsletterJid } =
            conText;

        if (!q) {
            await react("❌");
            return reply(
                `Please provide a GitHub repository link.\n\n*Usage:* .gitclone https://github.com/user/repo`,
            );
        }

        if (!gitRepoRegex.test(q)) {
            await react("❌");
            return reply(
                "Invalid GitHub link format. Please provide a valid GitHub repository URL.",
            );
        }

        try {
            let [, user, repo] = q.match(gitRepoRegex) || [];
            repo = repo.replace(/\.git$/, "").split("/")[0];

            const apiUrl = `https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch-Telegram`;
            const zipUrl = `https://api.github.com/repos/Mickeydeveloper/Mickey-Glitch-Telegram/zipball`;

            await reply(`Fetching repository *${user}/${repo}*...`);

            const repoResponse = await axios.get(apiUrl);
            if (!repoResponse.data) {
                await react("❌");
                return reply(
                    "Repository not found or access denied. Make sure the repository is public.",
                );
            }

            const repoData = repoResponse.data;
            const defaultBranch = repoData.default_branch || "main";
            const filename = `${user}-${repo}-${defaultBranch}.zip`;

            await Loftxmd.sendMessage(
                from,
                {
                    document: { url: zipUrl },
                    fileName: filename,
                    mimetype: "application/zip",
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: newsletterJid,
                            newsletterName: botName,
                            serverMessageId: 143,
                        },
                    },
                },
                { quoted: mek },
            );

            await react("✅");
        } catch (error) {
            console.error("GitClone error:", error);
            await react("❌");

            if (error.message?.includes("404")) {
                return reply("Repository not found.");
            } else if (error.message?.includes("rate limit")) {
                return reply(
                    "GitHub API rate limit exceeded. Please try again later.",
                );
            } else {
                return reply(`Failed to download repository: ${error.message}`);
            }
        }
    },
);