// --- UTILITY: Kupata JID ya mlengwa (Internal) ---
const getTarget = (conText) => {
  const { mentionedJid, quotedUser, q } = conText;
  return mentionedJid?.[0] || quotedUser || (q?.includes("@s.whatsapp.net") ? q : null);
};

module.exports = [
  {
    pattern: "unmute",
    react: "🔓",
    category: "group",
    desc: "Open group (Fungua kundi).",
    async execute(from, Loftxmd, conText) {
      const { reply, isAdmin, isSuperAdmin, isGroup, isBotAdmin, sender } = conText;
      if (!isGroup || !isBotAdmin || (!isAdmin && !isSuperAdmin)) return;
      await Loftxmd.groupSettingUpdate(from, "not_announcement");
      return reply(`✅ Gc limefunguliwa na @${sender.split("@")[0]}`, { mentions: [sender] });
    }
  },
  {
    pattern: "mute",
    react: "🔒",
    category: "group",
    desc: "Close group (Funga kundi).",
    async execute(from, Loftxmd, conText) {
      const { reply, isAdmin, isSuperAdmin, isGroup, isBotAdmin, sender } = conText;
      if (!isGroup || !isBotAdmin || (!isAdmin && !isSuperAdmin)) return;
      await Loftxmd.groupSettingUpdate(from, "announcement");
      return reply(`✅ Gc limefungwa na @${sender.split("@")[0]}`, { mentions: [sender] });
    }
  },
  {
    pattern: "kick",
    react: "🚫",
    category: "group",
    desc: "Remove member (Ondoa mwanachama).",
    async execute(from, Loftxmd, conText) {
      const { reply, isGroup, isBotAdmin, isAdmin, isSuperAdmin } = conText;
      if (!isGroup || !isBotAdmin || (!isAdmin && !isSuperAdmin)) return;
      const target = getTarget(conText);
      if (!target) return reply("❌ M-tag mtu au quote msg yake.");
      await Loftxmd.groupParticipantsUpdate(from, [target], "remove");
      return reply(`✅ @${target.split("@")[0]} amepigwa kiki (kicked).`, { mentions: [target] });
    }
  },
  {
    pattern: "promote",
    react: "👑",
    category: "group",
    desc: "Make admin (Mpe u-admin).",
    async execute(from, Loftxmd, conText) {
      const { reply, isGroup, isBotAdmin, isAdmin, isSuperAdmin } = conText;
      if (!isGroup || !isBotAdmin || (!isAdmin && !isSuperAdmin)) return;
      const target = getTarget(conText);
      if (!target) return reply("❌ M-tag mtu.");
      await Loftxmd.groupParticipantsUpdate(from, [target], "promote");
      return reply(`✅ @${target.split("@")[0]} sasa ni admin.`, { mentions: [target] });
    }
  },
  {
    pattern: "demote",
    react: "📉",
    category: "group",
    desc: "Remove admin (Vua u-admin).",
    async execute(from, Loftxmd, conText) {
      const { reply, isGroup, isBotAdmin, isAdmin, isSuperAdmin } = conText;
      if (!isGroup || !isBotAdmin || (!isAdmin && !isSuperAdmin)) return;
      const target = getTarget(conText);
      if (!target) return reply("❌ M-tag admin.");
      await Loftxmd.groupParticipantsUpdate(from, [target], "demote");
      return reply(`✅ @${target.split("@")[0]} amevuliwa u-admin.`, { mentions: [target] });
    }
  },
  {
    pattern: "tagall",
    react: "📢",
    category: "group",
    desc: "Tag all members (Tag wote).",
    async execute(from, Loftxmd, conText) {
      const { reply, isAdmin, isSuperAdmin, isGroup, participants, q } = conText;
      if (!isGroup || (!isAdmin && !isSuperAdmin)) return;
      let txt = `*📢 TAGALL BY MICKEY GLITCH*\n*Msg:* ${q || "Hamna"}\n\n`;
      for (let mem of participants) {
        txt += `📍 @${mem.id.split("@")[0]}\n`;
      }
      return Loftxmd.sendMessage(from, { text: txt, mentions: participants.map(a => a.id) });
    }
  }
];
