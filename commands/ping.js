const { sendButton } = require("gifted-btns"); // Hakikisha ume-install hii npm

module.exports = [
  {
    name: "ping",
    alias: ["p", "speed"],
    category: "general",
    desc: "Check bot speed with buttons (Angalia speed na button).",
    async execute(from, Loftxmd, conText) {
      const { reply, sender } = conText;
      const start = Date.now();
      const end = Date.now();
      const speed = end - start;

      // Muundo wa Button (Button structure)
      const buttons = [
        { buttonId: "runtime", buttonText: { displayText: "⏱️ Runtime" }, type: 1 },
        { buttonId: "system", buttonText: { displayText: "🖥️ System Info" }, type: 1 },
        { buttonId: "menu", buttonText: { displayText: "📜 Main Menu" }, type: 1 }
      ];

      const buttonMessage = {
        text: `*🏓 PONG!*\n\n📍 *Speed:* ${speed}ms\n📍 *User:* @${sender.split("@")[0]}`,
        footer: "© Mickey Glitch - 2026",
        buttons: buttons,
        headerType: 1,
        mentions: [sender]
      };

      // Kutuma kwa kutumia gifted-btns logic
      try {
        await Loftxmd.sendMessage(from, buttonMessage);
      } catch (e) {
        // Fallback kama button ikizingua kwenye baadhi ya WhatsApp versions
        return reply(`*🏓 Pong!* (${speed}ms)\n\n_Tumia amri za kawaida kama .runtime au .system_`);
      }
    }
  },
  {
    name: "alive",
    alias: ["mambo", "vipi"],
    category: "general",
    desc: "Check if bot is active (Angalia kama bot ipo hewani).",
    async execute(from, Loftxmd, conText) {
      const buttons = [
        { buttonId: "ping", buttonText: { displayText: "⚡ Check Speed" }, type: 1 },
        { buttonId: "owner", buttonText: { displayText: "👑 Owner" }, type: 1 }
      ];

      const aliveMsg = {
        text: "👋 *Hujambo! Mimi ni Mickey Glitch.*\nNipo hewani na niko tayari kukusaidia leo!",
        footer: "Powered by Mickey Dev",
        buttons: buttons,
        headerType: 1
      };

      return Loftxmd.sendMessage(from, aliveMsg);
    }
  }
];
