const axios = require("axios");
// Hii npm ndio inahusika na muundo wa buttons
const { GiftedButtons } = require("gifted-btns"); 
const gitRepoRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\s/]+)\/([^\s/]+)(?:\.git)?/i;

module.exports = [
  {
    name: 'gitclone',
    alias: ['gitdl', 'github', 'git'],
    category: 'downloader',
    desc: 'Download GitHub repo kwa kutumia buttons.',

    async execute(from, Loftxmd, conText) {
      const { args, reply, sender } = conText;
      const githubUrl = args[0];

      // 1. Validation ya Link
      if (!githubUrl || !gitRepoRegex.test(githubUrl)) {
        return reply("❌ Weka link sahihi! \n*Usage:* .gitclone https://github.com/user/repo");
      }

      try {
        let [, user, repo] = githubUrl.match(gitRepoRegex);
        repo = repo.replace(/\.git$/, "");

        const apiUrl = `https://api.github.com/repos/${user}/${repo}`;
        const { data } = await axios.get(apiUrl);

        const repoInfo = `📦 *GIT REPO INFO* 📦\n\n` +
          `👤 *Owner:* ${data.owner.login}\n` +
          `📂 *Repo:* ${data.name}\n` +
          `📝 *Desc:* ${data.description || 'No description'}\n` +
          `⭐ *Stars:* ${data.stargazers_count} | 🍴 *Forks:* ${data.forks_count}\n\n` +
          `_Bonyeza button hapo chini kupata file (zip):_`;

        // 2. Kutengeneza Buttons (Gifted Logic)
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

        // 3. Tuma Ujumbe (Kurekebisha ile error ya sendMessage)
        return await Loftxmd.sendMessage(from, {
          text: repoInfo,
          footer: "©2026 Mickey Glitch™",
          buttons: buttons,
          headerType: 4,
          mentions: [sender],
          contextInfo: {
            externalAdReply: {
              title: "MICKEY GIT DOWNLOADER",
              body: `Repository: ${data.full_name}`,
              thumbnailUrl: data.owner.avatar_url,
              sourceUrl: githubUrl,
              mediaType: 1,
              renderLargerThumbnail: true
            }
          }
        });

      } catch (error) {
        console.error("Git error:", error);
        return reply(`❌ Imefeli: ${error.message}`);
      }
    }
  }
];
