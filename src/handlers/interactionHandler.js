const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  AttachmentBuilder,
} = require("discord.js");

const {
  CANAL_LOG_PUNICAO_ID,
  CANAL_AUSENCIA_ID,
  CANAL_LOG_AUSENCIA_ID,
  CANAL_LOG_VENDAS_ID,
  CANAL_LOG_FARM_ID,
  CANAL_LOG_TRANSCRIPT_ID,
  CANAL_LOG_PROMO_ID,
  CARGO_AUSENCIA_ID,
  CARGOS_APROVADORES_AUSENCIA,
  CARGOS_LIDER_ORGANIZADOR,
  CATEGORIA_FARM_ID,
  CATEGORIA_SUPORTE_ID,
  COR_PADRAO,
  COR_PRETO,
} = require("../config/constants");

const {
  pendingRegistros,
  farmEmAndamento,
  bancoDeFarm,
  punicoesEmAndamento,
  ausenciasEmAndamento,
  sessoesAusenciaPainel,
  sessoesVenda,
  acoesEmAndamento,
  sessoesFinalizacaoAcao,
  sessoesUpar,
  configFarm,
} = require("../database/memoryDb");

const { gerarEmbedHierarquia } = require("../utils/hierarquia");
const { safeNickname } = require("../utils/nickHelpers");
const { formatarMoeda, formatarDataBR } = require("../utils/formatters");
const { criarSalaFarm } = require("../utils/farmHelpers");
const {
  montarEmbedCarrinhoVenda,
  montarComponentesVenda,
  calcularTotaisVenda,
} = require("../utils/vendasHelpers");
const { configRegistro } = require("../utils/registroConfig");
const catalogoVendas = require("../config/catalogoVendas");
const cargosTurquia = require("../config/cargosHierarquia");

const cargosUpar = {
  "1498812662962978957": { sigla: "MB", nome: "Membro" },
  "1499161311354032319": { sigla: "AV", nome: "Aviãozinho" },
  "1499109039261356062": { sigla: "FG", nome: "Fogueteiro" },
  "1499108787968282644": { sigla: "VP", nome: "Vapor" },
  "1499161248569360435": { sigla: "SD", nome: "Soldado" },
  "1499161315271512215": { sigla: "TF", nome: "Traficante" },
  "1499161731585544395": { sigla: "FR", nome: "Frente" },
  "1498812130412204173": { sigla: "E.P1", nome: "Elite P1" },
  "1498812133755064320": { sigla: "E.TR", nome: "Elite Tiro" },
  "1498811875679277137": { sigla: "GF", nome: "Gerente Financeiro" },
  "1498811873573732423": { sigla: "GA", nome: "Gerente Ação" },
  "1498811870705090631": { sigla: "GI", nome: "Gerente Inventory" },
  "1498811867496189992": { sigla: "GR", nome: "Gerente Rec" },
  "1498811878372016328": { sigla: "GE", nome: "Gerente Elite" },
  "1498808114504531978": { sigla: "GM", nome: "General Manager" },
  "1498811295825137714": { sigla: "G.FM", nome: "Gerente Farm" },
};

module.exports = async (interaction, client) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction, client);
    }

    // --- BUTTONS ---
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // Hierarquia
      if (customId === "atualizar_hierarquia") {
        const embed = await gerarEmbedHierarquia(interaction.guild);
        await interaction.update({ embeds: [embed] });
      }

      // Registro
      if (customId === "btn-abrir-registro") {
        const modal = new ModalBuilder()
          .setCustomId("modal-registro")
          .setTitle("Novo Registro");

        const nomeInput = new TextInputBuilder()
          .setCustomId("nome")
          .setLabel("Nome")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true);
        const idInput = new TextInputBuilder()
          .setCustomId("id")
          .setLabel("ID")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(50)
          .setRequired(true);
        const recrutadorInput = new TextInputBuilder()
          .setCustomId("recrutador")
          .setLabel("Recrutador")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true);
        const telefoneInput = new TextInputBuilder()
          .setCustomId("telefone")
          .setLabel("Telefone")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(30)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(nomeInput),
          new ActionRowBuilder().addComponents(idInput),
          new ActionRowBuilder().addComponents(recrutadorInput),
          new ActionRowBuilder().addComponents(telefoneInput),
        );
        await interaction.showModal(modal);
      }

      if (customId.startsWith("aprovar-registro_") || customId.startsWith("reprovar-registro_")) {
        const targetUserId = customId.split("_")[1];
        const data = pendingRegistros.get(targetUserId);

        if (customId.startsWith("aprovar-registro_")) {
          const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
          if (member && data) {
            await member.setNickname(`${data.id} | ${data.nome}`).catch(() => {});
            const roleIds = [configRegistro.cargos.aprovado, configRegistro.cargos.aprovado2].filter(Boolean);
            if (roleIds.length > 0) {
              await member.roles.add(roleIds).catch(console.error);
            }
            if (configRegistro.cargos.registrar && member.roles.cache.has(configRegistro.cargos.registrar)) {
              await member.roles.remove(configRegistro.cargos.registrar).catch(console.error);
            }
          }

          const embed = new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("Registro Aprovado")
            .setDescription(
              `**Candidato:** <@${targetUserId}>\n**Nome:** ${data?.nome || "—"}\n**ID:** ${data?.id || "—"}\n**Telefone:** ${data?.telefone || "—"}\n**Recrutador:** ${data?.recrutador || "—"}\n\n**Status:** ✅ Aprovado\n**Autorizado por:** <@${interaction.user.id}>`
            );

          await interaction.update({ embeds: [embed], components: [] });
        } else {
          const embed = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("Registro Negado")
            .setDescription(
              `**Candidato:** <@${targetUserId}>\n**Nome:** ${data?.nome || "—"}\n**ID:** ${data?.id || "—"}\n**Telefone:** ${data?.telefone || "—"}\n**Recrutador:** ${data?.recrutador || "—"}\n\n**Status:** ❌ Negado\n**Autorizado por:** <@${interaction.user.id}>`
            );

          await interaction.update({ embeds: [embed], components: [] });
        }
        pendingRegistros.delete(targetUserId);
      }

      // Ausência
      if (customId === "btn_pedir_ausencia") {
        const modal = new ModalBuilder()
          .setCustomId("modal_ausencia")
          .setTitle("Registro de Ausência");

        const inicioInput = new TextInputBuilder()
          .setCustomId("inicio_ausencia")
          .setLabel("Data de Início")
          .setPlaceholder("Ex: 10/05")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const fimInput = new TextInputBuilder()
          .setCustomId("fim_ausencia")
          .setLabel("Data de Término")
          .setPlaceholder("Ex: 15/05")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const motivoInput = new TextInputBuilder()
          .setCustomId("motivo_ausencia")
          .setLabel("Motivo")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(inicioInput),
          new ActionRowBuilder().addComponents(fimInput),
          new ActionRowBuilder().addComponents(motivoInput),
        );

        await interaction.showModal(modal);
      }

      if (
        customId.startsWith("btn_aprovar_ausencia_") ||
        customId.startsWith("btn_negar_ausencia_")
      ) {
        const parts = customId.split("_");
        const userId = parts[3];
        const acao = parts[1];

        if (acao === "aprovar") {
          const dados = ausenciasEmAndamento.get(userId);
          const member = await interaction.guild.members
            .fetch(userId)
            .catch(() => null);
          if (member) {
            await member.roles.add(CARGO_AUSENCIA_ID).catch(console.error);

            // Timer logic would go here, for now just log
            const logChannel = interaction.guild.channels.cache.get(
              CANAL_LOG_AUSENCIA_ID,
            );
            if (logChannel) {
              const embedLog = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("Ausência Iniciada")
                .addFields(
                  { name: "Membro", value: `<@${userId}>`, inline: true },
                  {
                    name: "Início",
                    value: dados?.inicio || "---",
                    inline: true,
                  },
                  { name: "Fim", value: dados?.fim || "---", inline: true },
                  { name: "Motivo", value: dados?.motivo || "---" },
                )
                .setTimestamp();
              await logChannel.send({ embeds: [embedLog] });
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
      }

      // Vendas
      if (customId === "btn_venda_parceria" || customId === "btn_venda_pista") {
        const tipo = customId === "btn_venda_parceria" ? "parceria" : "pista";
        sessoesVenda.set(interaction.user.id, { tipo, itens: [] });

        const sessao = sessoesVenda.get(interaction.user.id);
        const embed = montarEmbedCarrinhoVenda(interaction.user.id, sessao);
        const componentes = montarComponentesVenda(sessao);

        await interaction.reply({
          embeds: [embed],
          components: componentes,
          flags: 64,
        });
      }

      if (customId === "btn_limpar_carrinho") {
        sessoesVenda.delete(interaction.user.id);
        await interaction.update({
          content: "🛒 Carrinho limpo.",
          embeds: [],
          components: [],
        });
      }

      if (customId === "btn_finalizar_venda") {
        const sessao = sessoesVenda.get(interaction.user.id);
        if (!sessao || sessao.itens.length === 0)
          return interaction.reply({
            content: "Seu carrinho está vazio.",
            flags: 64,
          });

        const { itens, total, deposito } = calcularTotaisVenda(sessao);
        const listaProdutos = itens
          .map((i) => `• ${i.quantidade}x **${i.nome}**`)
          .join("\n");

        const logChannel =
          interaction.guild.channels.cache.get(CANAL_LOG_VENDAS_ID);
        if (logChannel) {
          const embedLog = new EmbedBuilder()
            .setColor(COR_PADRAO)
            .setTitle("📦 NOVA VENDA")
            .addFields(
              {
                name: "Vendedor",
                value: `<@${interaction.user.id}>`,
                inline: true,
              },
              {
                name: "Tipo",
                value: sessao.tipo === "pista" ? "Pista" : "Parceria",
                inline: true,
              },
              { name: "Produtos", value: listaProdutos || "---" },
              {
                name: "Total",
                value: formatarMoeda(total),
                inline: true,
              },
              {
                name: "30% Organização",
                value: formatarMoeda(deposito),
                inline: true,
              },
            )
            .setTimestamp();
          await logChannel.send({ embeds: [embedLog] });
        }

        sessoesVenda.delete(interaction.user.id);
        await interaction.update({
          content: "✅ Venda finalizada com sucesso!",
          embeds: [],
          components: [],
        });
      }

      // Ações
      if (
        customId.startsWith("btn_participar_acao") ||
        customId.startsWith("btn_reserva_acao") ||
        customId.startsWith("btn_sair_acao")
      ) {
        const msgId = interaction.message.id;
        const acao = acoesEmAndamento.get(msgId);
        if (!acao)
          return interaction.reply({
            content: "Ação não encontrada.",
            flags: 64,
          });

        const userId = interaction.user.id;
        if (customId.includes("participar")) {
          if (acao.participantes.length < acao.vagas) {
            if (!acao.participantes.includes(userId)) {
              acao.participantes.push(userId);
              acao.reservas = acao.reservas.filter((id) => id !== userId);
            }
          } else {
            return interaction.reply({
              content: "Vagas preenchidas. Entre como reserva.",
              flags: 64,
            });
          }
        } else if (customId.includes("reserva")) {
          if (!acao.reservas.includes(userId)) {
            acao.reservas.push(userId);
            acao.participantes = acao.participantes.filter(
              (id) => id !== userId,
            );
          }
        } else if (customId.includes("sair")) {
          acao.participantes = acao.participantes.filter((id) => id !== userId);
          acao.reservas = acao.reservas.filter((id) => id !== userId);
        }

        const newEmbed = EmbedBuilder.from(
          interaction.message.embeds[0],
        ).setFields(
          {
            name: `Participantes (${acao.participantes.length}/${acao.vagas})`,
            value:
              acao.participantes.length > 0
                ? acao.participantes.map((id) => `<@${id}>`).join("\n")
                : "Nenhum",
          },
          {
            name: `Reservas`,
            value:
              acao.reservas.length > 0
                ? acao.reservas.map((id) => `<@${id}>`).join("\n")
                : "Nenhum",
          },
        );
        await interaction.update({ embeds: [newEmbed] });
      }

      if (customId === "btn_iniciar_acao") {
        const msgId = interaction.message.id;
        const acao = acoesEmAndamento.get(msgId);
        if (interaction.user.id !== acao.criadorId)
          return interaction.reply({
            content: "Apenas o criador pode iniciar.",
            flags: 64,
          });

        const pingMsg = await interaction.channel.send({
          content: `${acao.participantes.map((id) => `<@${id}>`).join(" ")}`,
        });
        acao.pingMsgId = pingMsg.id;

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("btn_vitoria_acao")
            .setLabel("Vitória")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("btn_derrota_acao")
            .setLabel("Derrota")
            .setStyle(ButtonStyle.Danger),
        );

        const startedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setTitle(`🔴 EM ANDAMENTO: ${acao.nome}`)
          .setColor("#FFFF00");

        await interaction.update({ embeds: [startedEmbed], components: [row] });
      }

      if (customId === "btn_vitoria_acao" || customId === "btn_derrota_acao") {
        const msgId = interaction.message.id;
        const acao = acoesEmAndamento.get(msgId);
        if (interaction.user.id !== acao.criadorId)
          return interaction.reply({
            content: "Apenas o criador pode finalizar.",
            flags: 64,
          });

        if (customId.includes("vitoria")) {
          const modal = new ModalBuilder()
            .setCustomId("modal_valor_vitoria")
            .setTitle("Valor da Vitória");
          const valInput = new TextInputBuilder()
            .setCustomId("valor_vitoria")
            .setLabel("Valor Total Ganho")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(valInput));
          await interaction.showModal(modal);
          sessoesFinalizacaoAcao.set(interaction.user.id, msgId);
        } else {
          if (acao.pingMsgId) {
            const m = await interaction.channel.messages
              .fetch(acao.pingMsgId)
              .catch(() => null);
            if (m) await m.delete();
          }
          await interaction.update({
            content: "💀 Ação finalizada com Derrota.",
            embeds: [],
            components: [],
          });
          acoesEmAndamento.delete(msgId);
        }
      }

      // Upar
      if (customId === "btn_promover" || customId === "btn_rebaixar") {
        sessoesUpar.set(interaction.user.id, {
          tipo: customId === "btn_promover" ? "PROMOÇÃO" : "REBAIXAMENTO",
        });
        const userSelect = new UserSelectMenuBuilder()
          .setCustomId("select_user_upar")
          .setPlaceholder("Selecione o membro...");
        await interaction.reply({
          content: "Selecione o membro:",
          components: [new ActionRowBuilder().addComponents(userSelect)],
          flags: 64,
        });
      }

      // Suporte
      if (customId === "btn_abrir_suporte") {
        const canal = await interaction.guild.channels.create({
          name: `suporte-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: CATEGORIA_SUPORTE_ID,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
            },
          ],
        });

        const embed = new EmbedBuilder()
          .setColor(COR_PRETO)
          .setTitle("Atendimento")
          .setDescription(
            "Aguarde um membro da gerência. Para fechar, clique no botão abaixo.",
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("btn_fechar_suporte")
            .setLabel("Fechar Suporte")
            .setStyle(ButtonStyle.Danger),
        );

        await canal.send({
          content: `<@${interaction.user.id}>`,
          embeds: [embed],
          components: [row],
        });
        await interaction.reply({
          content: `Canal criado: ${canal}`,
          flags: 64,
        });
      }

      if (customId === "btn_fechar_suporte") {
        const canal = interaction.channel;
        const logs = await canal.messages.fetch();
        let transcript = `Transcript do canal ${canal.name}\n\n`;
        logs.reverse().forEach((m) => {
          transcript += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
        });

        const buffer = Buffer.from(transcript, "utf-8");
        const attachment = new AttachmentBuilder(buffer, {
          name: "transcript.txt",
        });

        const logChannel = interaction.guild.channels.cache.get(
          CANAL_LOG_TRANSCRIPT_ID,
        );
        if (logChannel) {
          await logChannel.send({
            content: `Suporte de <@${interaction.user.id}> fechado.`,
            files: [attachment],
          });
        }

        await interaction.reply("O canal será deletado em 5 segundos...");
        setTimeout(() => canal.delete(), 5000);
      }

      // Farm Buttons
      if (customId === "ver_entregas") {
        const conta = bancoDeFarm.get(interaction.user.id) || {
          plastico: 0,
          aluminio: 0,
          polvora: 0,
          ferro: 0,
          sd: 0,
        };
        const embedStatus = new EmbedBuilder()
          .setTitle("📊 Seu Histórico de Entregas")
          .setColor(COR_PADRAO)
          .setDescription(
            `Aqui está o total que você já entregou:\n\n📦 **${configFarm.plastico.nome}:** ${conta.plastico} / ${configFarm.plastico.meta}\n📦 **${configFarm.aluminio.nome}:** ${conta.aluminio} / ${configFarm.aluminio.meta}\n📦 **${configFarm.polvora.nome}:** ${conta.polvora} / ${configFarm.polvora.meta}\n📦 **${configFarm.ferro.nome}:** ${conta.ferro} / ${configFarm.ferro.meta}\n📦 **${configFarm.sd.nome}:** ${conta.sd} / ${configFarm.sd.meta}`,
          );
        await interaction.reply({
          embeds: [embedStatus],
          flags: 64,
        });
      }

      if (customId === "configurar_farm") {
        if (
          !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
        ) {
          return interaction.reply({
            content: "❌ Apenas administradores podem configurar o painel.",
            flags: 64,
          });
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("abrir_modal_metas")
            .setLabel("⚙️ Produtos e Metas")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("abrir_modal_editar_farm")
            .setLabel("✏️ Editar Farm de Jogador")
            .setStyle(ButtonStyle.Secondary),
        );

        await interaction.reply({
          content: "O que você deseja configurar?",
          components: [row],
          flags: 64,
        });
      }

      if (customId === "abrir_modal_metas") {
        const modal = new ModalBuilder()
          .setCustomId("modal_config_farm")
          .setTitle("Configurar Produtos e Metas");
        const in1 = new TextInputBuilder()
          .setCustomId("cfg_plastico")
          .setLabel("Plástico (Nome | Meta)")
          .setStyle(TextInputStyle.Short)
          .setValue(`${configFarm.plastico.nome} | ${configFarm.plastico.meta}`)
          .setRequired(true);
        const in2 = new TextInputBuilder()
          .setCustomId("cfg_aluminio")
          .setLabel("Alumínio (Nome | Meta)")
          .setStyle(TextInputStyle.Short)
          .setValue(`${configFarm.aluminio.nome} | ${configFarm.aluminio.meta}`)
          .setRequired(true);
        const in3 = new TextInputBuilder()
          .setCustomId("cfg_polvora")
          .setLabel("Pólvora (Nome | Meta)")
          .setStyle(TextInputStyle.Short)
          .setValue(`${configFarm.polvora.nome} | ${configFarm.polvora.meta}`)
          .setRequired(true);
        const in4 = new TextInputBuilder()
          .setCustomId("cfg_ferro")
          .setLabel("Ferro (Nome | Meta)")
          .setStyle(TextInputStyle.Short)
          .setValue(`${configFarm.ferro.nome} | ${configFarm.ferro.meta}`)
          .setRequired(true);
        const in5 = new TextInputBuilder()
          .setCustomId("cfg_sd")
          .setLabel("Cartão SD (Nome | Meta)")
          .setStyle(TextInputStyle.Short)
          .setValue(`${configFarm.sd.nome} | ${configFarm.sd.meta}`)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(in1),
          new ActionRowBuilder().addComponents(in2),
          new ActionRowBuilder().addComponents(in3),
          new ActionRowBuilder().addComponents(in4),
          new ActionRowBuilder().addComponents(in5),
        );
        await interaction.showModal(modal);
      }

      if (customId === "abrir_modal_editar_farm") {
        const selectMenu = new UserSelectMenuBuilder()
          .setCustomId("selecionar_jogador_edit_farm")
          .setPlaceholder("Selecione o jogador");

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
          content: "Selecione de qual jogador você deseja editar o farm:",
          components: [row],
          flags: 64,
        });
      }

      if (customId.startsWith("abrir_modal_valores_edit_")) {
        const userId = customId.replace("abrir_modal_valores_edit_", "");
        const conta = bancoDeFarm.get(userId) || {
          plastico: 0,
          aluminio: 0,
          polvora: 0,
          ferro: 0,
          sd: 0,
        };

        const modalEdit = new ModalBuilder()
          .setCustomId(`edit_farm_vals_${userId}`)
          .setTitle("Editar Valores de Farm");

        const in1 = new TextInputBuilder()
          .setCustomId("val_plastico")
          .setLabel(configFarm.plastico.nome)
          .setStyle(TextInputStyle.Short)
          .setValue(String(conta.plastico))
          .setRequired(true);
        const in2 = new TextInputBuilder()
          .setCustomId("val_aluminio")
          .setLabel(configFarm.aluminio.nome)
          .setStyle(TextInputStyle.Short)
          .setValue(String(conta.aluminio))
          .setRequired(true);
        const in3 = new TextInputBuilder()
          .setCustomId("val_polvora")
          .setLabel(configFarm.polvora.nome)
          .setStyle(TextInputStyle.Short)
          .setValue(String(conta.polvora))
          .setRequired(true);
        const in4 = new TextInputBuilder()
          .setCustomId("val_ferro")
          .setLabel(configFarm.ferro.nome)
          .setStyle(TextInputStyle.Short)
          .setValue(String(conta.ferro))
          .setRequired(true);
        const in5 = new TextInputBuilder()
          .setCustomId("val_sd")
          .setLabel(configFarm.sd.nome)
          .setStyle(TextInputStyle.Short)
          .setValue(String(conta.sd))
          .setRequired(true);

        modalEdit.addComponents(
          new ActionRowBuilder().addComponents(in1),
          new ActionRowBuilder().addComponents(in2),
          new ActionRowBuilder().addComponents(in3),
          new ActionRowBuilder().addComponents(in4),
          new ActionRowBuilder().addComponents(in5),
        );

        await interaction.showModal(modalEdit);
      }

      if (customId === "fechar_ticket") {
        if (!interaction.member.roles.cache.has("1498812659993280542")) {
          return interaction.reply({
            content:
              "❌ **Acesso Negado:** Apenas membros autorizados podem fechar esta sala.",
            flags: 64,
          });
        }
        await interaction.reply("🔒 Esta sala será apagada em 5 segundos...");
        setTimeout(() => {
          interaction.channel.delete().catch(console.error);
        }, 5000);
      }

      // Farm Finalizar
      if (customId === "finalizar_farm") {
        const farm = farmEmAndamento.get(interaction.channel.id);
        if (!farm)
          return interaction.reply({
            content: "Farm não encontrado.",
            flags: 64,
          });

        await interaction.reply(
          "Envie um print do farm para finalizar o registro.",
        );
        const filter = (m) =>
          m.author.id === interaction.user.id && m.attachments.size > 0;
        const collector = interaction.channel.createMessageCollector({
          filter,
          time: 60000,
          max: 1,
        });

        collector.on("collect", async (m) => {
          const logChannel =
            interaction.guild.channels.cache.get(CANAL_LOG_FARM_ID);
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setColor("#00FF00")
              .setTitle("🚜 NOVO FARM REGISTRADO")
              .addFields(
                {
                  name: "Membro",
                  value: `<@${interaction.user.id}>`,
                  inline: true,
                },
                { name: "Produto", value: farm.itemNome, inline: true },
                {
                  name: "Quantidade",
                  value: farm.qtd.toString(),
                  inline: true,
                },
              )
              .setImage(m.attachments.first().url)
              .setTimestamp();
            await logChannel.send({ embeds: [embed] });
          }

          // Atualizar banco de farm
          if (!bancoDeFarm.has(interaction.user.id)) {
            bancoDeFarm.set(interaction.user.id, {
              plastico: 0,
              aluminio: 0,
              polvora: 0,
              ferro: 0,
              sd: 0,
            });
          }
          const conta = bancoDeFarm.get(interaction.user.id);
          conta[farm.itemKey] += parseInt(farm.qtd);
          bancoDeFarm.set(interaction.user.id, conta);

          await m.delete().catch(() => {});
          await interaction.deleteReply().catch(() => {});
          await interaction.message.delete().catch(() => {});
          await interaction.followUp({
            content: `✅ Farm de **${farm.qtd}x ${farm.itemNome}** registrado com sucesso!`,
            flags: 64,
          });
          farmEmAndamento.delete(interaction.channel.id);
        });
      }
    }

    // --- MODALS ---
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      if (customId === "modal-registro") {
        const nome = interaction.fields.getTextInputValue("nome");
        const id = interaction.fields.getTextInputValue("id");
        const recrutador = interaction.fields.getTextInputValue("recrutador");
        const telefone = interaction.fields.getTextInputValue("telefone");

        const logChannelId = configRegistro.canalRegistro;
        if (!logChannelId) {
          return interaction.reply({
            content: "Canal de registro não configurado. Avise um administrador.",
            flags: 64,
          });
        }

        const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (!logChannel?.isTextBased()) {
          return interaction.reply({
            content: "Canal de registro inválido. Avise um administrador.",
            flags: 64,
          });
        }

        pendingRegistros.set(interaction.user.id, { nome, id, recrutador, telefone });

        const embed = new EmbedBuilder()
          .setColor(COR_PRETO)
          .setTitle("Novo Registro Para Avaliação")
          .addFields(
            { name: "Candidato", value: `<@${interaction.user.id}>`, inline: true },
            { name: "Nome", value: nome, inline: true },
            { name: "ID", value: id, inline: true },
            { name: "Telefone", value: telefone, inline: true },
            { name: "Recrutador", value: recrutador, inline: true },
            { name: "Status", value: "⏳ Pendente", inline: true },
            { name: "Autorizado por", value: "—" },
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`aprovar-registro_${interaction.user.id}`)
            .setLabel("✔ APROVAR")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`reprovar-registro_${interaction.user.id}`)
            .setLabel("❌ REPROVAR")
            .setStyle(ButtonStyle.Danger),
        );

        await logChannel.send({ embeds: [embed], components: [row] });
        await interaction.reply({
          content: "Registro enviado para avaliação!",
          flags: 64,
        });
        return;
      }

      if (customId.startsWith("modal_punicao_")) {
        const parts = customId.split("_");
        const userId = parts[2];
        const cargoId = parts[3];
        const motivo = interaction.fields.getTextInputValue("motivo_punicao");

        const member = await interaction.guild.members
          .fetch(userId)
          .catch(() => null);
        if (member) {
          await member.roles.add(cargoId).catch(console.error);
          const logChannel =
            interaction.guild.channels.cache.get(CANAL_LOG_PUNICAO_ID);
          if (logChannel) {
            const embedLog = new EmbedBuilder()
              .setColor(COR_PADRAO)
              .setTitle("⚖️ PUNIÇÃO APLICADA")
              .addFields(
                { name: "Membro", value: `<@${userId}>`, inline: true },
                {
                  name: "Staff",
                  value: `<@${interaction.user.id}>`,
                  inline: true,
                },
                { name: "Motivo", value: motivo || "---" },
              )
              .setTimestamp();
            await logChannel.send({ embeds: [embedLog] });
          }
          await interaction.reply({
            content: "Punição aplicada e logada.",
            flags: 64,
          });
        }
      }

      if (customId === "modal_ausencia") {
        const inicio = interaction.fields.getTextInputValue("inicio_ausencia");
        const fim = interaction.fields.getTextInputValue("fim_ausencia");
        const motivo = interaction.fields.getTextInputValue("motivo_ausencia");

        ausenciasEmAndamento.set(interaction.user.id, { inicio, fim, motivo });

        const avaliacaoChannel =
          interaction.guild.channels.cache.get(CANAL_AUSENCIA_ID);
        if (avaliacaoChannel) {
          const embed = new EmbedBuilder()
            .setColor(COR_PRETO)
            .setTitle("📋 PEDIDO DE AUSÊNCIA")
            .addFields(
              {
                name: "Membro",
                value: `<@${interaction.user.id}>`,
                inline: true,
              },
              { name: "Início", value: inicio, inline: true },
              { name: "Fim", value: fim, inline: true },
              { name: "Motivo", value: motivo },
            );

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`btn_aprovar_ausencia_${interaction.user.id}`)
              .setLabel("Aprovar")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`btn_negar_ausencia_${interaction.user.id}`)
              .setLabel("Negar")
              .setStyle(ButtonStyle.Danger),
          );

          await avaliacaoChannel.send({ embeds: [embed], components: [row] });
        }
        await interaction.reply({
          content: "Seu pedido de ausência foi enviado para análise.",
          flags: 64,
        });
      }

      if (customId === "modal_venda_qtd") {
        const qtd = parseInt(interaction.fields.getTextInputValue("venda_qtd"));
        if (isNaN(qtd) || qtd <= 0)
          return interaction.reply({
            content: "Quantidade inválida.",
            flags: 64,
          });

        const sessao = sessoesVenda.get(interaction.user.id);
        if (!sessao)
          return interaction.reply({
            content: "Sessão não encontrada.",
            flags: 64,
          });

        const itemAtual = sessao.itens[sessao.itens.length - 1];
        itemAtual.quantidade = qtd;

        const embed = montarEmbedCarrinhoVenda(interaction.user.id, sessao);
        const componentes = montarComponentesVenda(sessao);

        await interaction.update({
          embeds: [embed],
          components: componentes,
        });
      }

      if (customId === "modal_criar_acao") {
        const nome = interaction.fields.getTextInputValue("nome_acao");
        const horario = interaction.fields.getTextInputValue("horario_acao");
        const vagas = parseInt(
          interaction.fields.getTextInputValue("vagas_acao"),
        );

        const embed = new EmbedBuilder()
          .setColor(COR_PADRAO)
          .setTitle(`🎯 AÇÃO: ${nome}`)
          .addFields(
            { name: "Horário", value: horario, inline: true },
            { name: "Vagas", value: vagas.toString(), inline: true },
            { name: "Participantes (0)", value: "Nenhum" },
            { name: "Reservas", value: "Nenhum" },
          )
          .setFooter({ text: `Criado por ${interaction.user.username}` });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("btn_participar_acao")
            .setLabel("Participar")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("btn_reserva_acao")
            .setLabel("Reserva")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("btn_sair_acao")
            .setLabel("Sair")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("btn_iniciar_acao")
            .setLabel("Iniciar")
            .setStyle(ButtonStyle.Primary),
        );

        const msg = await interaction.reply({
          embeds: [embed],
          components: [row],
          fetchReply: true,
        });
        acoesEmAndamento.set(msg.id, {
          nome,
          horario,
          vagas,
          criadorId: interaction.user.id,
          participantes: [],
          reservas: [],
        });
      }

      if (customId === "modal_valor_vitoria") {
        const valor = interaction.fields.getTextInputValue("valor_vitoria");
        const msgId = sessoesFinalizacaoAcao.get(interaction.user.id);
        const acao = acoesEmAndamento.get(msgId);

        if (acao.pingMsgId) {
          const m = await interaction.channel.messages
            .fetch(acao.pingMsgId)
            .catch(() => null);
          if (m) await m.delete();
        }

        await interaction.update({
          content: `🏆 Ação finalizada com Vitória! Total Ganho: ${valor}`,
          embeds: [],
          components: [],
        });
        acoesEmAndamento.delete(msgId);
        sessoesFinalizacaoAcao.delete(interaction.user.id);
      }

      if (customId === "modal_qtd_farm") {
        const qtd = parseInt(interaction.fields.getTextInputValue("qtd_farm"));
        if (isNaN(qtd) || qtd <= 0)
          return interaction.reply({
            content: "Quantidade inválida.",
            flags: 64,
          });

        const farm = farmEmAndamento.get(interaction.channel.id);
        farm.qtd = qtd;

        const embed = new EmbedBuilder()
          .setColor(COR_PADRAO)
          .setTitle("🚜 REGISTRO DE FARM")
          .setDescription(`Você está registrando ${qtd}x **${farm.itemNome}**.`)
          .setFooter({
            text: "Clique no botão abaixo para enviar o print e finalizar.",
          });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("finalizar_farm")
            .setLabel("ENVIAR PRINT (CLIQUE AQUI)")
            .setStyle(ButtonStyle.Primary),
        );

        await interaction.reply({ embeds: [embed], components: [row] });
      }

      if (customId === "modal_config_farm") {
        const parseInput = (val, defaultNome) => {
          const parts = val.split("|");
          return {
            nome: parts[0] ? parts[0].trim() : defaultNome,
            meta: parts[1] ? parts[1].trim() : "X",
          };
        };

        configFarm.plastico = parseInput(
          interaction.fields.getTextInputValue("cfg_plastico"),
          "Plástico",
        );
        configFarm.aluminio = parseInput(
          interaction.fields.getTextInputValue("cfg_aluminio"),
          "Alumínio",
        );
        configFarm.polvora = parseInput(
          interaction.fields.getTextInputValue("cfg_polvora"),
          "Pólvora Preta",
        );
        configFarm.ferro = parseInput(
          interaction.fields.getTextInputValue("cfg_ferro"),
          "Barra de Ferro",
        );
        configFarm.sd = parseInput(
          interaction.fields.getTextInputValue("cfg_sd"),
          "Cartão SD",
        );

        await interaction.reply({
          content: "✅ Produtos e metas atualizados com sucesso!",
          flags: 64,
        });
      }

      if (customId.startsWith("edit_farm_vals_")) {
        const userId = customId.replace("edit_farm_vals_", "");
        const p = parseInt(
          interaction.fields.getTextInputValue("val_plastico"),
          10,
        );
        const a = parseInt(
          interaction.fields.getTextInputValue("val_aluminio"),
          10,
        );
        const po = parseInt(
          interaction.fields.getTextInputValue("val_polvora"),
          10,
        );
        const f = parseInt(
          interaction.fields.getTextInputValue("val_ferro"),
          10,
        );
        const s = parseInt(interaction.fields.getTextInputValue("val_sd"), 10);

        if (isNaN(p) || isNaN(a) || isNaN(po) || isNaN(f) || isNaN(s)) {
          return interaction.reply({
            content: "❌ Todos os valores devem ser números válidos.",
            flags: 64,
          });
        }

        bancoDeFarm.set(userId, {
          plastico: p,
          aluminio: a,
          polvora: po,
          ferro: f,
          sd: s,
        });
        await interaction.reply({
          content: `✅ Farm do jogador <@${userId}> atualizado com sucesso!`,
          flags: 64,
        });
      }

    }

    // --- SELECT MENUS ---
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;

      if (customId === "menu_ticket") {
        const tipo = interaction.values[0];
        if (tipo === "abrir_farm") {
          const canal = await criarSalaFarm(
            interaction.guild,
            interaction.member,
            configFarm,
          );

          await interaction.reply({
            content: `✅ Sua sala de farm foi criada: ${canal}`,
            flags: 64,
          });
        }
      }

      if (customId === "menu_produtos_farm") {
        const itemKey = interaction.values[0];
        const produto = configFarm[itemKey];
        if (!produto) {
          return interaction.reply({ content: "Produto não encontrado.", flags: 64 });
        }
        farmEmAndamento.set(interaction.channel.id, {
          itemKey: itemKey,
          itemNome: produto.nome,
          userId: interaction.user.id,
        });

        const modal = new ModalBuilder()
          .setCustomId("modal_qtd_farm")
          .setTitle("Quantidade do Farm");
        const input = new TextInputBuilder()
          .setCustomId("qtd_farm")
          .setLabel("Quantidade")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
      }

      if (customId === "menu_vendas_produtos") {
        const prodId = interaction.values[0];
        const sessao = sessoesVenda.get(interaction.user.id);
        if (!sessao)
          return interaction.reply({
            content: "Sessão não encontrada.",
            flags: 64,
          });

        sessao.itens.push({ key: prodId, quantidade: 0 });

        const modal = new ModalBuilder()
          .setCustomId("modal_venda_qtd")
          .setTitle("Quantidade do Produto");
        const input = new TextInputBuilder()
          .setCustomId("venda_qtd")
          .setLabel("Quantidade")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
      }

      if (customId === "select_role_upar") {
        const roleId = interaction.values[0];
        const sessao = sessoesUpar.get(interaction.user.id);
        const targetMember = await interaction.guild.members
          .fetch(sessao.targetId)
          .catch(() => null);

        if (targetMember) {
          const rolesToRemove = Object.keys(cargosUpar);
          await targetMember.roles.remove(rolesToRemove).catch(console.error);
          await targetMember.roles.add(roleId).catch(console.error);

          const metadata = cargosUpar[roleId];
          const sigla = metadata?.sigla || "MB";

          const nickBase = targetMember.nickname || targetMember.user.username;
          const nomeLimpo = nickBase.includes("|")
            ? nickBase
                .split("|")[0]
                .replace(/\[.*?\]/, "")
                .trim()
            : nickBase.replace(/\[.*?\]/, "").trim();

          const newNick = safeNickname(
            `[${sigla}] ${nomeLimpo} | ${targetMember.id}`,
          );
          await targetMember.setNickname(newNick).catch(console.error);

          const logChannelId = "1499574962191728721";
          const logChannel = interaction.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            let titulo = "";
            let texto = "";
            let cor = "";

            if (sessao.tipo === "promocao") {
              titulo = "🎊 PROMOÇÃO NA TURQUIA";
              cor = "#57F287";
              texto =
                "É com grande satisfação que celebramos sua merecida promoção, resultado de sua dedicação exemplar e desempenho consistente.\nSua trajetória demonstra profissionalismo, compromisso e excelência, qualidades que o destacam e inspiram todos ao seu redor.\nDesejamos pleno sucesso nesta nova etapa, certos de que continuará alcançando conquistas ainda mais significativas.";
            } else {
              titulo = "📉 RECLASSIFICAÇÃO NA TURQUIA";
              cor = "#ED4245";
              texto =
                "Informamos, de forma respeitosa, a redefinição de sua posição, medida adotada após criteriosa avaliação interna e alinhamento estratégico.\nA decisão não invalida suas contribuições, mas busca promover um melhor enquadramento às necessidades atuais da organização.\nSeguimos confiantes em sua capacidade de adaptação e contamos com seu profissionalismo para esta nova etapa.";
            }

            const embed = new EmbedBuilder()
              .setColor(cor)
              .setTitle(titulo)
              .setDescription(
                `**Membro:** <@${targetMember.id}>\n**Novo Cargo:** <@&${roleId}>\n\n${texto}`,
              )
              .setThumbnail(targetMember.user.displayAvatarURL())
              .setTimestamp();

            await logChannel.send({
              content: `<@${targetMember.id}>`,
              embeds: [embed],
            });
          }
          await interaction.update({
            content: `✅ Membro atualizado para **${metadata?.nome || "---"}**`,
            components: [],
          });
        }
        sessoesUpar.delete(interaction.user.id);
      }
    }

    if (interaction.isUserSelectMenu()) {
      if (interaction.customId === "selecionar_jogador_edit_farm") {
        const userId = interaction.values[0];

        let conta = bancoDeFarm.get(userId);
        if (!conta) {
          conta = { plastico: 0, aluminio: 0, polvora: 0, ferro: 0, sd: 0 };
          bancoDeFarm.set(userId, conta);
        }

        const embedStatus = new EmbedBuilder()
          .setTitle(`📊 Farm Atual: <@${userId}>`)
          .setColor(COR_PADRAO)
          .setDescription(
            `Aqui está o total que o jogador já entregou:\n\n📦 **${configFarm.plastico.nome}:** ${conta.plastico}\n📦 **${configFarm.aluminio.nome}:** ${conta.aluminio}\n📦 **${configFarm.polvora.nome}:** ${conta.polvora}\n📦 **${configFarm.ferro.nome}:** ${conta.ferro}\n📦 **${configFarm.sd.nome}:** ${conta.sd}`,
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`abrir_modal_valores_edit_${userId}`)
            .setLabel("✏️ Editar Quantidades")
            .setStyle(ButtonStyle.Primary),
        );

        await interaction.reply({
          embeds: [embedStatus],
          components: [row],
          flags: 64,
        });
      }

      if (interaction.customId === "select_user_upar") {
        const targetId = interaction.values[0];
        const sessao = sessoesUpar.get(interaction.user.id);
        sessao.targetId = targetId;

        const roleSelect = new RoleSelectMenuBuilder()
          .setCustomId("select_role_upar")
          .setPlaceholder("Selecione o novo cargo...");
        await interaction.update({
          content: `Membro selecionado: <@${targetId}>. Agora selecione o novo cargo:`,
          components: [new ActionRowBuilder().addComponents(roleSelect)],
        });
      }
    }
  } catch (error) {
    console.error("Erro no Interaction Handler:", error);
    if (interaction.replied || interaction.deferred) {
      await interaction
        .followUp({
          content: "Ocorreu um erro ao processar sua interação.",
          flags: 64,
        })
        .catch(() => {});
    } else {
      await interaction
        .reply({
          content: "Ocorreu um erro ao processar sua interação.",
          flags: 64,
        })
        .catch(() => {});
    }
  }
};
