const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const { CANAL_AVALIACAO_ID, CARGO_ENTRADA_ID, COR_PRETO } = require("../../config/constants");
const { sessoesDeRegistro } = require("../../database/memoryDb");
const { safeNickname } = require("../../utils/nickHelpers");
const { criarSalaFarm } = require("../../utils/farmHelpers");
const { configFarm } = require("../../database/memoryDb");

async function handleButton(interaction) {
  const id = interaction.customId;

  if (id === "iniciar_registro") {
    const modal = new ModalBuilder()
      .setCustomId("modal_registro")
      .setTitle("Formulário de Registro");

    const nomeInput = new TextInputBuilder()
      .setCustomId("reg_nome").setLabel("Nome").setStyle(TextInputStyle.Short).setRequired(true);
    const idInput = new TextInputBuilder()
      .setCustomId("reg_id").setLabel("ID").setStyle(TextInputStyle.Short).setRequired(true);
    const telefoneInput = new TextInputBuilder()
      .setCustomId("reg_telefone").setLabel("Telefone").setStyle(TextInputStyle.Short).setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nomeInput),
      new ActionRowBuilder().addComponents(idInput),
      new ActionRowBuilder().addComponents(telefoneInput),
    );
    await interaction.showModal(modal);
    return true;
  }

  if (id.startsWith("aprovar_") || id.startsWith("negar_")) {
    const [acao, userId] = id.split("_");
    const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);

    if (acao === "aprovar") {
      if (!targetMember) {
        await interaction.reply({ content: "Membro não encontrado.", ephemeral: true });
        return true;
      }
      const dados = sessoesDeRegistro.get(userId);
      if (!dados) {
        await interaction.reply({ content: "Dados do registro não encontrados.", ephemeral: true });
        return true;
      }

      await targetMember.setNickname(safeNickname(`[AV] ${dados.nome} | ${dados.id}`)).catch(console.error);
      await targetMember.roles.add(["1499161311354032319", "1499172261549314170"]).catch(console.error);
      await targetMember.roles.remove(CARGO_ENTRADA_ID).catch(console.error);
      await criarSalaFarm(interaction.guild, targetMember, configFarm).catch(console.error);

      const embedLog = new EmbedBuilder()
        .setColor("#00FF00").setTitle("✅ REGISTRO APROVADO")
        .addFields(
          { name: "Membro", value: `<@${userId}>`, inline: true },
          { name: "Nome", value: dados.nome || "---", inline: true },
          { name: "ID", value: dados.id || "---", inline: true },
          { name: "Telefone", value: dados.telefone || "---", inline: true },
          { name: "Recrutador", value: dados.recrutadorId ? `<@${dados.recrutadorId}>` : "---", inline: true },
          { name: "Aprovado Por", value: `<@${interaction.user.id}>`, inline: true },
        ).setTimestamp();

      const logCanal = interaction.guild.channels.cache.get("1498895146203353221");
      if (logCanal && logCanal.id !== interaction.channel.id) {
        await logCanal.send({ embeds: [embedLog] });
      }
      await interaction.update({ content: null, embeds: [embedLog], components: [] });
      sessoesDeRegistro.delete(userId);
    } else {
      const dados = sessoesDeRegistro.get(userId);
      const embedLog = new EmbedBuilder()
        .setColor("#FF0000").setTitle("❌ REGISTRO NEGADO")
        .addFields(
          { name: "Membro", value: `<@${userId}>`, inline: true },
          { name: "Nome", value: dados?.nome || "---", inline: true },
          { name: "ID", value: dados?.id || "---", inline: true },
          { name: "Telefone", value: dados?.telefone || "---", inline: true },
          { name: "Recrutador", value: dados?.recrutadorId ? `<@${dados.recrutadorId}>` : "---", inline: true },
          { name: "Negado Por", value: `<@${interaction.user.id}>`, inline: true },
        ).setTimestamp();

      const logCanal = interaction.guild.channels.cache.get("1498895146203353221");
      if (logCanal && logCanal.id !== interaction.channel.id) {
        await logCanal.send({ embeds: [embedLog] });
      }
      await interaction.update({ content: null, embeds: [embedLog], components: [] });
      sessoesDeRegistro.delete(userId);
    }
    return true;
  }

  return false;
}

async function handleModal(interaction) {
  const id = interaction.customId;

  if (id === "modal_registro") {
    const nome = interaction.fields.getTextInputValue("reg_nome");
    const idVal = interaction.fields.getTextInputValue("reg_id");
    const telefone = interaction.fields.getTextInputValue("reg_telefone");

    sessoesDeRegistro.set(interaction.user.id, { nome, id: idVal, telefone });
    await interaction.guild.members.fetch();

    const recruiters = interaction.guild.members.cache.filter(m =>
      m.roles.cache.has("1498812659993280542"),
    );
    if (recruiters.size === 0) {
      await interaction.reply({ content: "Nenhum recrutador disponível no momento.", ephemeral: true });
      return true;
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("selecionar_recrutador")
      .setPlaceholder("Selecione o recrutador que te avaliou...")
      .addOptions(recruiters.map(r => ({ label: r.user.tag, value: r.id })).slice(0, 25));

    await interaction.reply({
      content: "Selecione seu recrutador:",
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
    return true;
  }

  return false;
}

async function handleStringSelect(interaction) {
  if (interaction.customId === "selecionar_recrutador") {
    const staffId = interaction.values[0];
    const dados = sessoesDeRegistro.get(interaction.user.id);
    if (dados) {
      dados.recrutadorId = staffId;
      sessoesDeRegistro.set(interaction.user.id, dados);
    }

    const canalAvaliacao = interaction.guild.channels.cache.get(CANAL_AVALIACAO_ID);
    if (canalAvaliacao) {
      const embed = new EmbedBuilder()
        .setColor(COR_PRETO).setTitle("📋 NOVA AVALIAÇÃO DE REGISTRO")
        .addFields(
          { name: "Candidato", value: `<@${interaction.user.id}>`, inline: true },
          { name: "ID", value: dados.id || "---", inline: true },
          { name: "Telefone", value: dados.telefone || "---", inline: true },
          { name: "Recrutador", value: `<@${staffId}>` },
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel("Aprovar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`negar_${interaction.user.id}`).setLabel("Negar").setStyle(ButtonStyle.Danger),
      );
      await canalAvaliacao.send({ embeds: [embed], components: [row] });
    }
    await interaction.update({ content: "Seus dados foram enviados para avaliação. Aguarde.", components: [] });
    return true;
  }
  return false;
}

module.exports = { handleButton, handleModal, handleStringSelect };
