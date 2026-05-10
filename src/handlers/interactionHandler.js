const registro = require("./features/registro");
const ausencia = require("./features/ausencia");
const vendas = require("./features/vendas");
const acoes = require("./features/acoes");
const upar = require("./features/upar");
const suporte = require("./features/suporte");
const farm = require("./features/farm");
const punicao = require("./features/punicao");
const { gerarEmbedHierarquia } = require("../utils/hierarquia");

module.exports = async (interaction, client) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      return await command.execute(interaction, client);
    }

    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === "atualizar_hierarquia") {
        const embed = await gerarEmbedHierarquia(interaction.guild);
        return await interaction.update({ embeds: [embed] });
      }

      if (await registro.handleButton(interaction)) return;
      if (await ausencia.handleButton(interaction)) return;
      if (await vendas.handleButton(interaction)) return;
      if (await acoes.handleButton(interaction)) return;
      if (await upar.handleButton(interaction)) return;
      if (await suporte.handleButton(interaction)) return;
      if (await farm.handleButton(interaction)) return;
    }

    if (interaction.isModalSubmit()) {
      if (await registro.handleModal(interaction)) return;
      if (await ausencia.handleModal(interaction)) return;
      if (await vendas.handleModal(interaction)) return;
      if (await acoes.handleModal(interaction)) return;
      if (await farm.handleModal(interaction)) return;
      if (await punicao.handleModal(interaction)) return;
    }

    if (interaction.isStringSelectMenu()) {
      if (await registro.handleStringSelect(interaction)) return;
      if (await vendas.handleStringSelect(interaction)) return;
      if (await farm.handleStringSelect(interaction)) return;
    }

    if (interaction.isRoleSelectMenu()) {
      if (await upar.handleRoleSelect(interaction)) return;
    }

    if (interaction.isUserSelectMenu()) {
      if (await upar.handleUserSelect(interaction)) return;
      if (await farm.handleUserSelect(interaction)) return;
    }

  } catch (error) {
    console.error("Erro no Interaction Handler:", error);
    const reply = interaction.replied || interaction.deferred
      ? interaction.followUp.bind(interaction)
      : interaction.reply.bind(interaction);
    await reply({ content: "Ocorreu um erro ao processar sua interação.", ephemeral: true }).catch(() => {});
  }
};
