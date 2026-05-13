const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  CANAL_AUSENCIA_ID,
  CANAL_LOG_AUSENCIA_ID,
  CARGO_AUSENCIA_ID,
  COR_PRETO,
} = require("../../config/constants");
const { ausenciasEmAndamento } = require("../../database/memoryDb");

async function handleButton(interaction) {
  const id = interaction.customId;

  if (id === "btn_pedir_ausencia") {
    const modal = new ModalBuilder()
      .setCustomId("modal_ausencia").setTitle("Registro de Ausência");

    const inicioInput = new TextInputBuilder()
      .setCustomId("inicio_ausencia").setLabel("Data de Início").setPlaceholder("Ex: 10/05")
      .setStyle(TextInputStyle.Short).setRequired(true);
    const fimInput = new TextInputBuilder()
      .setCustomId("fim_ausencia").setLabel("Data de Término").setPlaceholder("Ex: 15/05")
      .setStyle(TextInputStyle.Short).setRequired(true);
    const motivoInput = new TextInputBuilder()
      .setCustomId("motivo_ausencia").setLabel("Motivo").setStyle(TextInputStyle.Paragraph).setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(inicioInput),
      new ActionRowBuilder().addComponents(fimInput),
      new ActionRowBuilder().addComponents(motivoInput),
    );
    await interaction.showModal(modal);
    return true;
  }

  if (id.startsWith("btn_aprovar_ausencia_") || id.startsWith("btn_negar_ausencia_")) {
    const parts = id.split("_");
    const userId = parts[3];
    const acao = parts[1];

    if (acao === "aprovar") {
      const dados = ausenciasEmAndamento.get(userId);
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (member) {
        await member.roles.add(CARGO_AUSENCIA_ID).catch(console.error);
        const logChannel = interaction.guild.channels.cache.get(CANAL_LOG_AUSENCIA_ID);
        if (logChannel) {
          await logChannel.send({
            embeds: [new EmbedBuilder()
              .setColor("#00FF00").setTitle("Ausência Iniciada")
              .addFields(
                { name: "Membro", value: `<@${userId}>`, inline: true },
                { name: "Início", value: dados?.inicio || "---", inline: true },
                { name: "Fim", value: dados?.fim || "---", inline: true },
                { name: "Motivo", value: dados?.motivo || "---" },
              ).setTimestamp()],
          });
        }
      }
      await interaction.update({
        content: `✅ Ausência de <@${userId}> aprovada por <@${interaction.user.id}>`,
        components: [],
      });
    } else {
      await interaction.update({
        content: `❌ Ausência de <@${userId}> negada por <@${interaction.user.id}>`,
        components: [],
      });
      ausenciasEmAndamento.delete(userId);
    }
    return true;
  }

  return false;
}

async function handleModal(interaction) {
  if (interaction.customId === "modal_ausencia") {
    const inicio = interaction.fields.getTextInputValue("inicio_ausencia");
    const fim = interaction.fields.getTextInputValue("fim_ausencia");
    const motivo = interaction.fields.getTextInputValue("motivo_ausencia");

    ausenciasEmAndamento.set(interaction.user.id, { inicio, fim, motivo });

    const avaliacaoChannel = interaction.guild.channels.cache.get(CANAL_AUSENCIA_ID);
    if (avaliacaoChannel) {
      const embed = new EmbedBuilder()
        .setColor(COR_PRETO).setTitle("📋 PEDIDO DE AUSÊNCIA")
        .addFields(
          { name: "Membro", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Início", value: inicio, inline: true },
          { name: "Fim", value: fim, inline: true },
          { name: "Motivo", value: motivo },
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`btn_aprovar_ausencia_${interaction.user.id}`).setLabel("Aprovar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`btn_negar_ausencia_${interaction.user.id}`).setLabel("Negar").setStyle(ButtonStyle.Danger),
      );
      await avaliacaoChannel.send({ embeds: [embed], components: [row] });
    }
    await interaction.reply({ content: "Seu pedido de ausência foi enviado para análise.", flags: 64 });
    return true;
  }
  return false;
}

module.exports = { handleButton, handleModal };
