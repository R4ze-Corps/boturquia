const { EmbedBuilder } = require("discord.js");
const { CANAL_LOG_PUNICAO_ID, COR_PADRAO } = require("../../config/constants");

async function handleModal(interaction) {
  const id = interaction.customId;

  if (id.startsWith("modal_punicao_")) {
    const parts = id.split("_");
    const userId = parts[2];
    const cargoId = parts[3];
    const motivo = interaction.fields.getTextInputValue("motivo_punicao");

    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (member) {
      await member.roles.add(cargoId).catch(console.error);
      const logChannel = interaction.guild.channels.cache.get(CANAL_LOG_PUNICAO_ID);
      if (logChannel) {
        await logChannel.send({
          embeds: [new EmbedBuilder()
            .setColor(COR_PADRAO).setTitle("⚖️ PUNIÇÃO APLICADA")
            .addFields(
              { name: "Membro", value: `<@${userId}>`, inline: true },
              { name: "Staff", value: `<@${interaction.user.id}>`, inline: true },
              { name: "Motivo", value: motivo || "---" },
            ).setTimestamp()],
        });
      }
      await interaction.reply({ content: "Punição aplicada e logada.", ephemeral: true });
    }
    return true;
  }

  return false;
}

module.exports = { handleModal };
