const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const {
  CANAL_LOG_FARM_ID,
  COR_PADRAO,
} = require("../../config/constants");
const {
  farmEmAndamento,
  bancoDeFarm,
  configFarm,
} = require("../../database/memoryDb");

async function handleButton(interaction) {
  const id = interaction.customId;

  if (id === "ver_entregas") {
    const conta = bancoDeFarm.get(interaction.user.id) || { plastico: 0, aluminio: 0, polvora: 0, ferro: 0, sd: 0 };
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle("📊 Seu Histórico de Entregas").setColor(COR_PADRAO)
        .setDescription(
          `Aqui está o total que você já entregou:\n\n📦 **${configFarm.plastico.nome}:** ${conta.plastico} / ${configFarm.plastico.meta}\n📦 **${configFarm.aluminio.nome}:** ${conta.aluminio} / ${configFarm.aluminio.meta}\n📦 **${configFarm.polvora.nome}:** ${conta.polvora} / ${configFarm.polvora.meta}\n📦 **${configFarm.ferro.nome}:** ${conta.ferro} / ${configFarm.ferro.meta}\n📦 **${configFarm.sd.nome}:** ${conta.sd} / ${configFarm.sd.meta}`,
        )],
      flags: 64,
    });
    return true;
  }

  if (id === "configurar_farm") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: "❌ Apenas administradores podem configurar o painel.", flags: 64 });
      return true;
    }
    await interaction.reply({
      content: "O que você deseja configurar?",
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("abrir_modal_metas").setLabel("⚙️ Produtos e Metas").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("abrir_modal_editar_farm").setLabel("✏️ Editar Farm de Jogador").setStyle(ButtonStyle.Secondary),
      )],
      flags: 64,
    });
    return true;
  }

  if (id === "abrir_modal_metas") {
    const modal = new ModalBuilder().setCustomId("modal_config_farm").setTitle("Configurar Produtos e Metas");
    const fields = [
      { key: "cfg_plastico", label: "Plástico (Nome | Meta)", val: `${configFarm.plastico.nome} | ${configFarm.plastico.meta}` },
      { key: "cfg_aluminio", label: "Alumínio (Nome | Meta)", val: `${configFarm.aluminio.nome} | ${configFarm.aluminio.meta}` },
      { key: "cfg_polvora", label: "Pólvora (Nome | Meta)", val: `${configFarm.polvora.nome} | ${configFarm.polvora.meta}` },
      { key: "cfg_ferro", label: "Ferro (Nome | Meta)", val: `${configFarm.ferro.nome} | ${configFarm.ferro.meta}` },
      { key: "cfg_sd", label: "Cartão SD (Nome | Meta)", val: `${configFarm.sd.nome} | ${configFarm.sd.meta}` },
    ];
    fields.forEach(f => modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(f.key).setLabel(f.label).setStyle(TextInputStyle.Short).setValue(f.val).setRequired(true),
    )));
    await interaction.showModal(modal);
    return true;
  }

  if (id === "abrir_modal_editar_farm") {
    await interaction.reply({
      content: "Selecione de qual jogador você deseja editar o farm:",
      components: [new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder().setCustomId("selecionar_jogador_edit_farm").setPlaceholder("Selecione o jogador"),
      )],
      flags: 64,
    });
    return true;
  }

  if (id.startsWith("abrir_modal_valores_edit_")) {
    const userId = id.replace("abrir_modal_valores_edit_", "");
    const conta = bancoDeFarm.get(userId) || { plastico: 0, aluminio: 0, polvora: 0, ferro: 0, sd: 0 };

    const modalEdit = new ModalBuilder().setCustomId(`edit_farm_vals_${userId}`).setTitle("Editar Valores de Farm");
    const items = [
      { key: "val_plastico", label: configFarm.plastico.nome, val: conta.plastico },
      { key: "val_aluminio", label: configFarm.aluminio.nome, val: conta.aluminio },
      { key: "val_polvora", label: configFarm.polvora.nome, val: conta.polvora },
      { key: "val_ferro", label: configFarm.ferro.nome, val: conta.ferro },
      { key: "val_sd", label: configFarm.sd.nome, val: conta.sd },
    ];
    items.forEach(i => modalEdit.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(i.key).setLabel(i.label).setStyle(TextInputStyle.Short).setValue(String(i.val)).setRequired(true),
    )));
    await interaction.showModal(modalEdit);
    return true;
  }

  if (id === "fechar_ticket") {
    if (!interaction.member.roles.cache.has("1498812659993280542")) {
      await interaction.reply({ content: "❌ **Acesso Negado:** Apenas membros autorizados podem fechar esta sala.", flags: 64 });
      return true;
    }
    await interaction.reply("🔒 Esta sala será apagada em 5 segundos...");
    setTimeout(() => interaction.channel.delete().catch(console.error), 5000);
    return true;
  }

  if (id === "finalizar_farm") {
    const farm = farmEmAndamento.get(interaction.channel.id);
    if (!farm) {
      await interaction.reply({ content: "Farm não encontrado.", flags: 64 });
      return true;
    }

    await interaction.reply("Envie um print do farm para finalizar o registro.");
    const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

    collector.on("collect", async (m) => {
      const logChannel = interaction.guild.channels.cache.get(CANAL_LOG_FARM_ID);
      if (logChannel) {
        await logChannel.send({
          embeds: [new EmbedBuilder()
            .setColor("#00FF00").setTitle("🚜 NOVO FARM REGISTRADO")
            .addFields(
              { name: "Membro", value: `<@${interaction.user.id}>`, inline: true },
              { name: "Produto", value: farm.itemNome, inline: true },
              { name: "Quantidade", value: farm.qtd.toString(), inline: true },
            ).setImage(m.attachments.first().url).setTimestamp()],
        });
      }

      if (!bancoDeFarm.has(interaction.user.id)) {
        bancoDeFarm.set(interaction.user.id, { plastico: 0, aluminio: 0, polvora: 0, ferro: 0, sd: 0 });
      }
      const conta = bancoDeFarm.get(interaction.user.id);
      conta[farm.itemKey] += parseInt(farm.qtd);
      bancoDeFarm.set(interaction.user.id, conta);

      await m.delete().catch(() => {});
      await interaction.deleteReply().catch(() => {});
      await interaction.message.delete().catch(() => {});
      await interaction.followUp({ content: `✅ Farm de **${farm.qtd}x ${farm.itemNome}** registrado com sucesso!`, flags: 64 });
      farmEmAndamento.delete(interaction.channel.id);
    });
    return true;
  }

  return false;
}

async function handleModal(interaction) {
  const id = interaction.customId;

  if (id === "modal_qtd_farm") {
    const qtd = parseInt(interaction.fields.getTextInputValue("qtd_farm"));
    if (isNaN(qtd) || qtd <= 0) {
      await interaction.reply({ content: "Quantidade inválida.", flags: 64 });
      return true;
    }

    const farm = farmEmAndamento.get(interaction.channel.id);
    farm.qtd = qtd;

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(COR_PADRAO).setTitle("🚜 REGISTRO DE FARM")
        .setDescription(`Você está registrando ${qtd}x **${farm.itemNome}**.`)
        .setFooter({ text: "Clique no botão abaixo para enviar o print e finalizar." }),
      ],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("finalizar_farm").setLabel("ENVIAR PRINT (CLIQUE AQUI)").setStyle(ButtonStyle.Primary),
      )],
    });
    return true;
  }

  if (id === "modal_config_farm") {
    const parseInput = (val, defaultNome) => {
      const parts = val.split("|");
      return { nome: parts[0] ? parts[0].trim() : defaultNome, meta: parts[1] ? parts[1].trim() : "X" };
    };

    configFarm.plastico = parseInput(interaction.fields.getTextInputValue("cfg_plastico"), "Plástico");
    configFarm.aluminio = parseInput(interaction.fields.getTextInputValue("cfg_aluminio"), "Alumínio");
    configFarm.polvora = parseInput(interaction.fields.getTextInputValue("cfg_polvora"), "Pólvora Preta");
    configFarm.ferro = parseInput(interaction.fields.getTextInputValue("cfg_ferro"), "Barra de Ferro");
    configFarm.sd = parseInput(interaction.fields.getTextInputValue("cfg_sd"), "Cartão SD");

    await interaction.reply({ content: "✅ Produtos e metas atualizados com sucesso!", flags: 64 });
    return true;
  }

  if (id.startsWith("edit_farm_vals_")) {
    const userId = id.replace("edit_farm_vals_", "");
    const vals = ["plastico", "aluminio", "polvora", "ferro", "sd"].map(k => parseInt(interaction.fields.getTextInputValue(`val_${k}`), 10));

    if (vals.some(isNaN)) {
      await interaction.reply({ content: "❌ Todos os valores devem ser números válidos.", flags: 64 });
      return true;
    }

    bancoDeFarm.set(userId, { plastico: vals[0], aluminio: vals[1], polvora: vals[2], ferro: vals[3], sd: vals[4] });
    await interaction.reply({ content: `✅ Farm do jogador <@${userId}> atualizado com sucesso!`, flags: 64 });
    return true;
  }

  return false;
}

async function handleStringSelect(interaction) {
  const id = interaction.customId;

  if (id === "menu_ticket") {
    const tipo = interaction.values[0];
    if (tipo === "abrir_farm") {
      const { criarSalaFarm } = require("../../utils/farmHelpers");
      const canal = await criarSalaFarm(interaction.guild, interaction.member, configFarm).catch(console.error);
      await interaction.reply({ content: `✅ Sua sala de farm foi criada: ${canal}`, flags: 64 });
    }
    return true;
  }

  if (id === "menu_produtos_farm") {
    const itemKey = interaction.values[0];
    farmEmAndamento.set(interaction.channel.id, {
      itemKey, itemNome: configFarm[itemKey].nome, userId: interaction.user.id,
    });

    const modal = new ModalBuilder().setCustomId("modal_qtd_farm").setTitle("Quantidade do Farm");
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("qtd_farm").setLabel("Quantidade").setStyle(TextInputStyle.Short).setRequired(true),
    ));
    await interaction.showModal(modal);
    return true;
  }

  return false;
}

async function handleUserSelect(interaction) {
  if (interaction.customId !== "selecionar_jogador_edit_farm") return false;

  const userId = interaction.values[0];
  let conta = bancoDeFarm.get(userId);
  if (!conta) {
    conta = { plastico: 0, aluminio: 0, polvora: 0, ferro: 0, sd: 0 };
    bancoDeFarm.set(userId, conta);
  }

  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setTitle(`📊 Farm Atual: <@${userId}>`).setColor(COR_PADRAO)
      .setDescription(`Aqui está o total que o jogador já entregou:\n\n📦 **${configFarm.plastico.nome}:** ${conta.plastico}\n📦 **${configFarm.aluminio.nome}:** ${conta.aluminio}\n📦 **${configFarm.polvora.nome}:** ${conta.polvora}\n📦 **${configFarm.ferro.nome}:** ${conta.ferro}\n📦 **${configFarm.sd.nome}:** ${conta.sd}`),
    ],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`abrir_modal_valores_edit_${userId}`).setLabel("✏️ Editar Quantidades").setStyle(ButtonStyle.Primary),
    )],
    flags: 64,
  });
  return true;
}

module.exports = { handleButton, handleModal, handleStringSelect, handleUserSelect };
