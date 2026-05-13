const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { COR_PADRAO } = require("../config/constants");

module.exports = {
  name: "registrar",
  data: {
    name: "registrar",
    description: "Abrir formulário de registro",
  },
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(COR_PADRAO)
      .setTitle("Sistema de Registro")
      .setDescription(
        "Para fazer sua liberação, precisamos de algumas informações suas.\n\n" +
        "Por favor, clique no botão abaixo para abrir o formulário e preencher seu **Nome, ID, Recrutador** e **Telefone.**"
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("btn-abrir-registro")
        .setLabel("📃 Registrar")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
