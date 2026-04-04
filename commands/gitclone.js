const axios = require("axios");
const { GiftedButtons } = require("gifted-btns"); // Hakikisha ume-install hii npm
const gitRepoRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\s/]+)\/([^\s/]+)(?:\.git)?/i;

module.exports = {
    name: 'gitclone',
    description: 'Download GitHub repo kwa kutumia buttons',
    aliases: ['gitdl', 'github', 'git'],
    category: 'downloader',

    async execute(context) {
        const { sock, chatId, args, sendMessage, msg, userId } = context;
        const githubUrl = args[0];

        if (!githubUrl || !gitRepoRegex.test(githubUrl)) {
            return sendMessage("❌ Weka link sahihi! \n*Usage:* .gitclone https://github.com/user/repo");
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
                `_Chagua action hapa chini:_`;

            // 1. Tengeneza Buttons kwa kutumia gifted-btns
            const buttons = [
                { 
                    buttonId: `visit_repo_${repo}`, 
                    buttonText: { displayText: '🔗 VISIT MY REPO' }, 
                    type: 2, 
                    url: githubUrl 
                },
                { 
                    buttonId: `gitdl_zip_${user}_${repo}`, 
                    buttonText: { displayText: '📥 DOWNLOAD ZIP' }, 
                    type: 1 
                },
                { 
                    buttonId: `support_chan`, 
                    buttonText: { displayText: '📢 SUPPORT CHANNEL' }, 
                    type: 2, 
                    url: 'https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610' 
                }
            ];

            // 2. Tuma Ujumbe wenye Buttons
            // Kumbuka: ZIP haitumwi hapa mpaka button ibonyezwe
            await sock.sendMessage(chatId, {
                text: repoInfo,
                footer: "©2026 Mickey Labs™",
                buttons: buttons,
                headerType: 4,
                contextInfo: {
                    externalAdReply: {
                        title: "MICKEY GLITCH GIT-DL",
                        body: data.full_name,
                        thumbnailUrl: data.owner.avatar_url,
                        sourceUrl: githubUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });

        } catch (error) {
            console.error("Git error:", error);
            await sendMessage(`❌ Error: ${error.message}`);
        }
    }
};

// ======================================================
// SEHEMU YA PILI: HANDLING BUTTON CLICKS (Kwenye index.js)
// ======================================================
// Unapaswa kuweka logic hii kwenye `connection.update` au `messages.upsert`
// Ili bot isikilize pale mtu anapobonyeza "DOWNLOAD ZIP"

/* // Mfano wa logic ya kuweka kwenye index.js:

if (msg.message.buttonsResponseMessage) {
    const id = msg.message.buttonsResponseMessage.selectedButtonId;
    if (id.startsWith('gitdl_zip_')) {
        const [, , user, repo] = id.split('_');
        const zipUrl = `https://github.com/${user}/${repo}/archive/refs/heads/main.zip`;
        
        await sock.sendMessage(chatId, { 
            document: { url: zipUrl }, 
            fileName: `${repo}.zip`, 
            mimetype: 'application/zip',
            caption: `✅ Hili hapa file la ZIP la *${repo}*`
        });
    }
}
*/
