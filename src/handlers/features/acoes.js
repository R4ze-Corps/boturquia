const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { COR_PADRAO } = require("../../config/constants");
const { acoesEmAndamento, sessoesFinalizacaoAcao } = require("../../database/memoryDb");

async function handleButton(interaction) {
  const id = interaction.customId;

  if (id.startsWith("btn_participar_acao") || id.startsWith("btn_reserva_acao") || id.startsWith("btn_sair_acao")) {
    const msgId = interaction.message.id;
    const acao = acoesEmAndamento.get(msgId);
    if (!acao) {
      await interaction.reply({ content: "Ação não encontrada.", flags: 64 });
      return true;
    }

    const userId = interaction.user.id;
    if (id.includes("participar")) {
      if (acao.participantes.length < acao.vagas) {
        if (!acao.participantes.includes(userId)) {
          acao.participantes.push(userId);
          acao.reservas = acao.reservas.filter(r => r !== userId);
        }
      } else {
        await interaction.reply({ content: "Vagas preenchidas. Entre como reserva.", flags: 64 });
        return true;
      }
    } else if (id.includes("reserva")) {
      if (!acao.reservas.includes(userId)) {
        acao.reservas.push(userId);
        acao.participantes = acao.participantes.filter(p => p !== userId);
      }
    } else if (id.includes("sair")) {
      acao.participantes = acao.participantes.filter(p => p !== userId);
      acao.reservas = acao.reservas.filter(r => r !== userId);
    }

    const newEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setFields(
      { name: `Participantes (${acao.participantes.length}/${acao.vagas})`, value: acao.participantes.length > 0 ? acao.participantes.map(id => `<@${id}>`).join("\n") : "Nenhum" },
      { name: "Reservas", value: acao.reservas.length > 0 ? acao.reservas.map(id => `<@${id}>`).join("\n") : "Nenhum" },
    );
    await interaction.update({ embeds: [newEmbed] });
    return true;
  }

  if (id === "btn_iniciar_acao") {
    const msgId = interaction.message.id;
    const acao = acoesEmAndamento.get(msgId);
    if (interaction.user.id !== acao.criadorId) {
      await interaction.reply({ content: "Apenas o criador pode iniciar.", flags: 64 });
      return true;
    }

    const pingMsg = await interaction.channel.send({ content: acao.participantes.map(id => `<@${id}>`).join(" ") });
    acao.pingMsgId = pingMsg.id;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_vitoria_acao").setLabel("Vitória").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("btn_derrota_acao").setLabel("Derrota").setStyle(ButtonStyle.Danger),
    );

    await interaction.update({
      embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setTitle(`🔴 EM ANDAMENTO: ${acao.nome}`).setColor("#FFFF00")],
      components: [row],
    });
    return true;
  }

  if (id === "btn_vitoria_acao" || id === "btn_derrota_acao") {
    const msgId = interaction.message.id;
    const acao = acoesEmAndamento.get(msgId);
    if (interaction.user.id !== acao.criadorId) {
      await interaction.reply({ content: "Apenas o criador pode finalizar.", flags: 64 });
      return true;
    }

    if (id.includes("vitoria")) {
      const modal = new ModalBuilder().setCustomId("modal_valor_vitoria").setTitle("Valor da Vitória");
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("valor_vitoria").setLabel("Valor Total Ganho").setStyle(TextInputStyle.Short).setRequired(true),
      ));
      await interaction.showModal(modal);
      sessoesFinalizacaoAcao.set(interaction.user.id, msgId);
    } else {
      if (acao.pingMsgId) {
        const m = await interaction.channel.messages.fetch(acao.pingMsgId).catch(() => null);
        if (m) await m.delete();
      }
      await interaction.update({ content: "💀 Ação finalizada com Derrota.", embeds: [], components: [] });
      acoesEmAndamento.delete(msgId);
    }
    return true;
  }

  return false;
}

async function handleModal(interaction) {
  const id = interaction.customId;

  if (id === "modal_criar_acao") {
    const nome = interaction.fields.getTextInputValue("nome_acao");
    const horario = interaction.fields.getTextInputValue("horario_acao");
    const vagas = parseInt(interaction.fields.getTextInputValue("vagas_acao"));

    const embed = new EmbedBuilder()
      .setColor(COR_PADRAO).setTitle(`🎯 AÇÃO: ${nome}`)
      .addFields(
        { name: "Horário", value: horario, inline: true },
        { name: "Vagas", value: vagas.toString(), inline: true },
        { name: "Participantes (0)", value: "Nenhum" },
        { name: "Reservas", value: "Nenhum" },
      ).setFooter({ text: `Criado por ${interaction.user.username}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_participar_acao").setLabel("Participar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("btn_reserva_acao").setLabel("Reserva").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("btn_sair_acao").setLabel("Sair").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("btn_iniciar_acao").setLabel("Iniciar").setStyle(ButtonStyle.Primary),
    );

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    acoesEmAndamento.set(msg.id, { nome, horario, vagas, criadorId: interaction.user.id, participantes: [], reservas: [] });
    return true;
  }

  if (id === "modal_valor_vitoria") {
    const valor = interaction.fields.getTextInputValue("valor_vitoria");
    const msgId = sessoesFinalizacaoAcao.get(interaction.user.id);
    const acao = acoesEmAndamento.get(msgId);

    if (acao.pingMsgId) {
      const m = await interaction.channel.messages.fetch(acao.pingMsgId).catch(() => null);
      if (m) await m.delete();
    }

    await interaction.update({ content: `🏆 Ação finalizada com Vitória! Total Ganho: ${valor}`, embeds: [], components: [] });
    acoesEmAndamento.delete(msgId);
    sessoesFinalizacaoAcao.delete(interaction.user.id);
    return true;
  }

  return false;
}

module.exports = { handleButton, handleModal };
