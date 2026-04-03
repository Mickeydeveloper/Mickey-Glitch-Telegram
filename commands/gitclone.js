const axios = require("axios");

const gitRepoRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\s/]+)\/([^\s/]+)(?:\.git)?/i;

module.exports = {
    name: 'gitclone',
    description: 'Download GitHub repository as zip file',
    aliases: ['gitdl', 'github', 'git', 'repodl', 'clone'],
    category: 'downloader',

    async execute(context) {
        const { message: { text }, sendMessage } = context;
        const githubUrl = text?.trim() || '';

        if (!githubUrl) {
            return sendMessage(
                `❌ Please provide a GitHub repository link.\n\n*Usage:* .gitclone https://github.com/user/repo`
            );
        }

        if (!gitRepoRegex.test(githubUrl)) {
            return sendMessage(
                "❌ Invalid GitHub link format. Please provide a valid GitHub repository URL."
            );
        }

        try {
            let [, user, repo] = githubUrl.match(gitRepoRegex) || [];
            repo = repo.replace(/\.git$/, "").split("/")[0];

            const apiUrl = `https://api.github.com/repos/${user}/${repo}`;
            const zipUrl = `https://api.github.com/repos/${user}/${repo}/zipball`;

            await sendMessage(`⏳ Fetching repository *${user}/${repo}*...`);

            const repoResponse = await axios.get(apiUrl, { timeout: 10000 });
            if (!repoResponse.data) {
                return sendMessage(
                    "❌ Repository not found or access denied. Make sure the repository is public."
                );
            }

            const repoData = repoResponse.data;
            const defaultBranch = repoData.default_branch || "main";
            const description = repoData.description || "GitHub Repository";
            const starsCount = repoData.stargazers_count || 0;

            let resultMessage = `📦 *GitHub Repository Found*\n\n`;
            resultMessage += `*Repo:* ${user}/${repo}\n`;
            resultMessage += `*Branch:* ${defaultBranch}\n`;
            resultMessage += `*Stars:* ⭐ ${starsCount}\n`;
            resultMessage += `*Description:* ${description}\n\n`;
            resultMessage += `*Download:* ${zipUrl}`;

            await sendMessage(resultMessage);
        } catch (error) {
            console.error("GitClone error:", error);

            if (error.message?.includes("404")) {
                return sendMessage("❌ Repository not found.");
            } else if (error.message?.includes("rate limit")) {
                return sendMessage(
                    "❌ GitHub API rate limit exceeded. Please try again later."
                );
            } else {
                return sendMessage(`❌ Failed: ${error.message}`);
            }
        }
    }
};