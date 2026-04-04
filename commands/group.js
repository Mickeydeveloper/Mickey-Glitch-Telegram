const { GiftedButtons } = require("gifted-btns");

// UTILITY: Kupata JID (Internal)
const getTarget = (conText) => {
  const { mentionedJid, quotedUser, q } = conText;
  return mentionedJid?.[0] || quotedUser || (q?.includes("@s.whatsapp.net") ? q : null);
};

module.exports = {
  name: "group",
  alias: ["gc", "admin-cmd"],
  category: "group",
  desc: "Group Management Commands.",
  async execute(from, Loftxmd, conText) {
    const { reply, isGroup, isAdmin, isSuperAdmin, isBotAdmin, q } = conText;
    
    if (!isGroup) return reply("❌ Hii ni kwa makundi tu!");
    if (!isAdmin && !isSuperAdmin) return reply("❌ Amri hii ni kwa Admins tu!");
    if (!isBotAdmin) return reply("❌ Bot si admin hapa!");

    // Muundo wa Buttons kwa ajili ya Group Menu
    const buttons = [
      { buttonId: "mute", buttonText: { displayText: "🔒 Mute Group" }, type: 1 },
      { buttonId: "unmute", buttonText: { displayText: "🔓 Unmute Group" }, type: 1 },
      { buttonId: "tagall", buttonText: { displayText: "📢 Tag Everyone" }, type: 1 }
    ];

    return await Loftxmd.sendMessage(from, {
      text: "*🛠️ MICKEY GROUP MANAGER*\n\nChagua amri hapa chini kudhibiti kundi:",
      footer: "©2026 Mickey Glitch",
      buttons: buttons,
      headerType: 1
    });
  }
};
