const axios = require("axios");
// Hii hapa npm yako, nimeirudisha (gifted-btns)
const { GiftedButtons } = require("gifted-btns"); 
const gitRepoRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\s/]+)\/([^\s/]+)(?:\.git)?/i;

module.exports = {
    name: 'gitclone',
    alias: ['gitdl', 'github', 'git'],
    category: 'downloader',
    desc: 'Download GitHub repo kwa kutumia buttons.',

    async execute(from, Loftxmd, conText) {
        const { args, reply, sender } = conText;
        const githubUrl = args[0];

        if (!githubUrl || !gitRepoRegex.test(githubUrl)) {
            return reply("❌ Weka link sahihi ya GitHub!");
        }

        try {
            let [, user, repo] = githubUrl.match(gitRepoRegex);
            repo = repo.replace(/\.git$/, "");

            const apiUrl = `https://api.github.com/repos/${user}/${repo}`;
            const { data } = await axios.get(apiUrl);

            const repoInfo = `📦 *GIT REPO INFO* 📦\n\n` +
                `👤 *Owner:* ${data.owner.login}\n` +
                `📂 *Repo:* ${data.name}\n` +
                `⭐ *Stars:* ${data.stargazers_count}\n\n` +
                `_Chagua action hapa chini:_`;

            // 1. Kutumia gifted-btns (Buttons logic)
            const buttons = [
                { 
                    buttonId: `gitdl_zip_${user}_${repo}`, 
                    buttonText: { displayText: '📥 DOWNLOAD ZIP' }, 
                    type: 1 
                },
                { 
                    buttonId: `ping`, 
                    buttonText: { displayText: '⚡ SPEED TEST' }, 
                    type: 1 
                }
            ];

            // 2. Tuma kwa kutumia socket ya Loftxmd
            return await Loftxmd.sendMessage(from, {
                text: repoInfo,
                footer: "©2026 Mickey Glitch™",
                buttons: buttons,
                headerType: 4,
                mentions: [sender],
                contextInfo: {
                    externalAdReply: {
                        title: "MICKEY GIT DOWNLOADER",
                        body: data.full_name,
                        thumbnailUrl: data.owner.avatar_url,
                        sourceUrl: githubUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            });

        } catch (error) {
            return reply(`❌ Error: ${error.message}`);
        }
    }
};
