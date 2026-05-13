const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const { CANAL_LOG_VENDAS_ID, COR_PADRAO } = require("../../config/constants");
const { sessoesVenda } = require("../../database/memoryDb");
const { formatarMoeda } = require("../../utils/formatters");
const { montarEmbedCarrinhoVenda, montarComponentesVenda, calcularTotaisVenda } = require("../../utils/vendasHelpers");

async function handleButton(interaction) {
  const id = interaction.customId;

  if (id === "btn_venda_parceria" || id === "btn_venda_pista") {
    const tipo = id === "btn_venda_parceria" ? "parceria" : "pista";
    sessoesVenda.set(interaction.user.id, { tipo, itens: [] });
    const sessao = sessoesVenda.get(interaction.user.id);
    await interaction.reply({
      embeds: [montarEmbedCarrinhoVenda(interaction.user.id, sessao)],
      components: montarComponentesVenda(sessao),
      flags: 64,
    });
    return true;
  }

  if (id === "btn_limpar_carrinho") {
    sessoesVenda.delete(interaction.user.id);
    await interaction.update({ content: "🛒 Carrinho limpo.", embeds: [], components: [] });
    return true;
  }

  if (id === "btn_finalizar_venda") {
    const sessao = sessoesVenda.get(interaction.user.id);
    if (!sessao || sessao.itens.length === 0) {
      await interaction.reply({ content: "Seu carrinho está vazio.", flags: 64 });
      return true;
    }

    const { itens, total, deposito } = calcularTotaisVenda(sessao);
    const listaProdutos = itens.map(i => `• ${i.quantidade}x **${i.nome}**`).join("\n");

    const logChannel = interaction.guild.channels.cache.get(CANAL_LOG_VENDAS_ID);
    if (logChannel) {
      await logChannel.send({
        embeds: [new EmbedBuilder()
          .setColor(COR_PADRAO).setTitle("📦 NOVA VENDA")
          .addFields(
            { name: "Vendedor", value: `<@${interaction.user.id}>`, inline: true },
            { name: "Tipo", value: sessao.tipo === "pista" ? "Pista" : "Parceria", inline: true },
            { name: "Produtos", value: listaProdutos || "---" },
            { name: "Total", value: formatarMoeda(total), inline: true },
            { name: "30% Organização", value: formatarMoeda(deposito), inline: true },
          ).setTimestamp()],
      });
    }

    sessoesVenda.delete(interaction.user.id);
    await interaction.update({ content: "✅ Venda finalizada com sucesso!", embeds: [], components: [] });
    return true;
  }

  return false;
}

async function handleModal(interaction) {
  if (interaction.customId === "modal_venda_qtd") {
    const qtd = parseInt(interaction.fields.getTextInputValue("venda_qtd"));
    if (isNaN(qtd) || qtd <= 0) {
      await interaction.reply({ content: "Quantidade inválida.", flags: 64 });
      return true;
    }

    const sessao = sessoesVenda.get(interaction.user.id);
    if (!sessao) {
      await interaction.reply({ content: "Sessão não encontrada.", flags: 64 });
      return true;
    }

    const itemAtual = sessao.itens[sessao.itens.length - 1];
    itemAtual.quantidade = qtd;

    await interaction.update({
      embeds: [montarEmbedCarrinhoVenda(interaction.user.id, sessao)],
      components: montarComponentesVenda(sessao),
    });
    return true;
  }
  return false;
}

async function handleStringSelect(interaction) {
  if (interaction.customId === "menu_vendas_produtos") {
    const prodId = interaction.values[0];
    const sessao = sessoesVenda.get(interaction.user.id);
    if (!sessao) {
      await interaction.reply({ content: "Sessão não encontrada.", flags: 64 });
      return true;
    }

    sessao.itens.push({ key: prodId, quantidade: 0 });

    const modal = new ModalBuilder().setCustomId("modal_venda_qtd").setTitle("Quantidade do Produto");
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("venda_qtd").setLabel("Quantidade").setStyle(TextInputStyle.Short).setRequired(true),
    ));
    await interaction.showModal(modal);
    return true;
  }
  return false;
}

module.exports = { handleButton, handleModal, handleStringSelect };
