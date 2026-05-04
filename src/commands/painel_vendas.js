const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { COR_PRETO } = require("../config/constants");
const catalogoVendas = require("../config/catalogoVendas");

module.exports = {
  name: "painel_vendas",
  data: new SlashCommandBuilder()
    .setName("painel_vendas")
    .setDescription("Envia o painel de vendas.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(COR_PRETO)
      .setTitle("🛒 PAINEL DE VENDAS - TURQUIA")
      .setDescription(
        "Selecione os produtos abaixo para adicionar ao seu carrinho.",
      )
      .setThumbnail(
        "https://r2.fivemanage.com/vLUsF9vzqBOo7DSFHERFX/logo-jpg(1).png",
      )
      .setImage(
        "https://r2.fivemanage.com/vLUsF9vzqBOo7DSFHERFX/Gemini_Generated_Image_nenl89nenl89nenl.png",
      )
      .setFooter({ text: "Raze Corp.  •  Turquia" });

    const options = Object.entries(catalogoVendas).map(([key, value]) => ({
      label: value.nome,
      value: key,
      description: `Parceria: R$${value.parceria} | Pista: R$${value.pista}`,
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("menu_vendas_produtos")
      .setPlaceholder("Selecione um produto...")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
