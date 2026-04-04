// Ping Command kwa Mickey Glitch
const { GiftedButtons } = require("gifted-btns");
const os = require('os');

module.exports = {
    name: "ping",
    alias: ["p", "speed", "test"],
    category: "general",
    desc: "Angalia kasi ya bot (Check bot speed).",

    async execute(from, Loftxmd, conText) {
        const { reply, sender } = conText;
        const start = Date.now();
        
        // Tunatuma msg ya kwanza kupima speed
        await reply("_Pinging Mickey Glitch..._");
        
        const end = Date.now();
        const speed = end - start;

        // 1. Muundo wa Buttons (Gifted Logic)
        const buttons = [
            { 
                buttonId: "runtime", 
                buttonText: { displayText: "⏱️ RUNTIME" }, 
                type: 1 
            },
            { 
                buttonId: "system", 
                buttonText: { displayText: "🖥️ SYSTEM" }, 
                type: 1 
            },
            { 
                buttonId: "menu", 
                buttonText: { displayText: "📜 MENU" }, 
                type: 1 
            }
        ];

        // 2. Tuma ujumbe wenye buttons na muonekano (ExternalAdReply)
        return await Loftxmd.sendMessage(from, {
            text: `*🏓 PONG!*\n\n🚀 *Speed:* ${speed}ms\n📡 *Server:* ${os.platform()}\n👤 *User:* @${sender.split("@")[0]}`,
            footer: "©2026 Mickey Glitch - High Speed Bot",
            buttons: buttons,
            headerType: 4,
            mentions: [sender],
            contextInfo: {
                externalAdReply: {
                    title: "MICKEY GLITCH PING",
                    body: `Kasi ya sasa: ${speed}ms`,
                    // Unaweza kuweka link ya picha yako hapa
                    thumbnailUrl: "https://github.com/Mickeydeveloper.png", 
                    sourceUrl: "https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        });
    }
};
