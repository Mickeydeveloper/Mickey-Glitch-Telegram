const axios = require("axios");
const Validator = require('../utils/validator');
const Helpers = require('../utils/helpers');

const gitRepoRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\s/]+)\/([^\s/]+)(?:\.git)?/i;

module.exports = {
    name: 'gitclone',
    description: 'Download GitHub repository as zip file',
    aliases: ['gitdl', 'github', 'git', 'repodl', 'clone'],
    category: 'downloader',
    cooldown: 10000,

    async execute(context) {
        try {
            const { message: { text }, sendMessage } = context;
            const githubUrl = text?.trim() || '';

            if (!githubUrl) {
                return sendMessage(
                    `❌ Please provide a GitHub repository link.\n\n*Usage:* .gitclone https://github.com/user/repo`
                );
            }

            // Validate GitHub URL
            Validator.githubUrl(githubUrl);

            if (!gitRepoRegex.test(githubUrl)) {
                return sendMessage(
                    "❌ Invalid GitHub link format. Please provide a valid repository URL."
                );
            }

            let [, user, repo] = githubUrl.match(gitRepoRegex) || [];
            repo = repo.replace(/\.git$/, "").split("/")[0];

            const apiUrl = `https://api.github.com/repos/${user}/${repo}`;
            const zipUrl = `https://github.com/${user}/${repo}/archive/refs/heads/main.zip`;

            await sendMessage(`⏳ Fetching repository *${user}/${repo}*...`);

            const repoResponse = await axios.get(apiUrl, { timeout: 10000 });
            if (!repoResponse.data) {
                return sendMessage(
                    "❌ Repository not found or access denied. Ensure it's public."
                );
            }

            const repoData = repoResponse.data;
            const defaultBranch = repoData.default_branch || "main";
            const description = repoData.description || "GitHub Repository";
            const starsCount = repoData.stargazers_count || 0;
            const forksCount = repoData.forks_count || 0;
            const language = repoData.language || "Not specified";
            const size = Helpers.formatBytes(repoData.size * 1024);

            let resultMessage = `📦 *GitHub Repository*\n\n`;
            resultMessage += `*Repo:* _${user}/${repo}_\n`;
            resultMessage += `*Branch:* ${defaultBranch}\n`;
            resultMessage += `*Language:* ${language}\n`;
            resultMessage += `*Size:* ${size}\n`;
            resultMessage += `*Stars:* ⭐ ${starsCount} | *Forks:* 🔀 ${forksCount}\n`;
            resultMessage += `*Description:* ${Helpers.truncate(description, 100)}\n\n`;
            resultMessage += `*Download:* [ZIP](${zipUrl})`;

            await sendMessage(resultMessage);
        } catch (error) {
            console.error("GitClone error:", error);

            if (error.message?.includes("Invalid") || error.message?.includes("Must be")) {
                return await context.sendMessage(error.message);
            } else if (error.message?.includes("404")) {
                return await context.sendMessage("❌ Repository not found.");
            } else if (error.message?.includes("rate limit")) {
                return await context.sendMessage(
                    "❌ API rate limit exceeded. Try again later."
                );
            } else {
                return await context.sendMessage(
                    Helpers.createErrorMessage('Download Error', 'Failed to fetch repository', 
                        Helpers.truncate(error.message, 80))
                );
            }
        }
    }
};