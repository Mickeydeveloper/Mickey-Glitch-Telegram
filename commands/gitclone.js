const axios = require("axios");
const gitRepoRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\s/]+)\/([^\s/]+)(?:\.git)?/i;

module.exports = {
    name: 'gitclone',
    alias: ['gitdl', 'github', 'git'],
    category: 'downloader',
    desc: 'Download GitHub repo.',

    async execute(from, Loftxmd, conText) {
        const { args, reply, sender } = conText;
        const githubUrl = args[0];

        if (!githubUrl || !gitRepoRegex.test(githubUrl)) {
            return reply("❌ Weka link sahihi!");
        }

        try {
            let [, user, repo] = githubUrl.match(gitRepoRegex);
            repo = repo.replace(/\.git$/, "");
            const { data } = await axios.get(`https://api.github.com/repos/${user}/${repo}`);

            const buttons = [
                { buttonId: `gitdl_zip_${user}_${repo}`, buttonText: { displayText: '📥 DOWNLOAD ZIP' }, type: 1 }
            ];

            return await Loftxmd.sendMessage(from, {
                text: `📦 *REPO:* ${data.name}\n⭐ *Stars:* ${data.stargazers_count}`,
                footer: "©2026 Mickey Glitch™",
                buttons: buttons,
                headerType: 1
            });
        } catch (e) { return reply(`❌ Error: ${e.message}`); }
    }
};
