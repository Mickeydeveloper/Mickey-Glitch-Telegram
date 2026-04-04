const axios = require("axios");
const path = require('path');

const gitRepoRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\s/]+)\/([^\s/]+)(?:\.git)?/i;

module.exports = {
    name: 'gitclone',
    description: 'Download GitHub repo as zip with buttons',
    aliases: ['gitdl', 'github', 'git'],
    category: 'downloader',

    async execute(context) {
        const { sock, chatId, args, sendMessage } = context;
        const githubUrl = args[0];

        if (!githubUrl || !gitRepoRegex.test(githubUrl)) {
            return sendMessage("❌ Tafadhali weka link sahihi ya GitHub repo!\n\n*Usage:* .gitclone https://github.com/user/repo");
        }

        try {
            let [, user, repo] = githubUrl.match(gitRepoRegex);
            repo = repo.replace(/\.git$/, "");

            const apiUrl = `https://api.github.com/repos/${user}/${repo}`;
            
            // Pata maelezo ya repo toka GitHub API
            const { data } = await axios.get(apiUrl);
            
            const repoInfo = `📦 *GIT REPO INFO* 📦\n\n` +
                `👤 *Owner:* ${data.owner.login}\n` +
                `📂 *Repo:* ${data.name}\n` +
                `📝 *Desc:* ${data.description || 'No description available'}\n` +
                `⭐ *Stars:* ${data.stargazers_count}\n` +
                `🍴 *Forks:* ${data.forks_count}\n` +
                `🎈 *Lang:* ${data.language || 'Multi'}\n\n` +
                `_Bofya kitufe cha pili kupata file la ZIP_`;

            const zipUrl = `https://github.com/${user}/${repo}/archive/refs/heads/${data.default_branch}.zip`;

            // Kutuma ujumbe wenye picha na Maelezo (Ad Reply Style)
            await sock.sendMessage(chatId, {
                text: repoInfo,
                contextInfo: {
                    externalAdReply: {
                        title: `Mickey Glitch Git Downloader`,
                        body: `Repository: ${data.full_name}`,
                        thumbnailUrl: data.owner.avatar_url,
                        sourceUrl: githubUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });

            // Kutuma File la ZIP moja kwa moja (Download action)
            // Hapa tuna-simulate button ya pili "Download Zip"
            await sendMessage(`⏳ Inatayarisha file la ZIP kwa ajili ya *${repo}*...`);
            
            await sock.sendMessage(chatId, { 
                document: { url: zipUrl }, 
                fileName: `${repo}.zip`, 
                mimetype: 'application/zip',
                caption: `✅ Hili hapa file la ZIP la repo: *${repo}*`
            }, { quoted: context.msg });

            // Button Info (Maelezo ya Links)
            const btnInfo = `🔗 *QUICK LINKS* 🔗\n\n` +
                `1️⃣ *Visit Repo:* ${githubUrl}\n` +
                `2️⃣ *Support Channel:* https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610`;
            
            await sendMessage(btnInfo);

        } catch (error) {
            console.error("Git error:", error);
            await sendMessage(`❌ Hitilafu imetokea: ${error.message}`);
        }
    }
};
