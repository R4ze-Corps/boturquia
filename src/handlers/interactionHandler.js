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
  CANAL_AVALIACAO_ID,
  CANAL_LOG_FARM_ID,
  CANAL_LOG_TRANSCRIPT_ID,
  CANAL_LOG_PROMO_ID,
  CARGO_AUSENCIA_ID,
  CARGO_ENTRADA_ID,
  CARGOS_APROVADORES_AUSENCIA,
  CARGOS_LIDER_ORGANIZADOR,
  CATEGORIA_FARM_ID,
  CATEGORIA_SUPORTE_ID,
  COR_PADRAO,
  COR_PRETO,
} = require("../config/constants");

const {
  sessoesDeRegistro,
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
      if (customId === "iniciar_registro") {
        const modal = new ModalBuilder()
          .setCustomId("modal_registro")
          .setTitle("Formulário de Registro");

        const nomeInput = new TextInputBuilder()
          .setCustomId("reg_nome")
          .setLabel("Nome")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const idInput = new TextInputBuilder()
          .setCustomId("reg_id")
          .setLabel("ID")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const telefoneInput = new TextInputBuilder()
          .setCustomId("reg_telefone")
          .setLabel("Telefone")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(nomeInput),
          new ActionRowBuilder().addComponents(idInput),
          new ActionRowBuilder().addComponents(telefoneInput),
        );

        await interaction.showModal(modal);
      }

      if (customId.startsWith("aprovar_") || customId.startsWith("negar_")) {
        const [acao, userId] = customId.split("_");
        const targetMember = await interaction.guild.members
          .fetch(userId)
          .catch(() => null);

        if (acao === "aprovar") {
          if (!targetMember)
            return interaction.reply({
              content: "Membro não encontrado.",
              ephemeral: true,
            });

          const dados = sessoesDeRegistro.get(userId);
          if (!dados)
            return interaction.reply({
              content: "Dados do registro não encontrados.",
              ephemeral: true,
            });

          const nick = safeNickname(`[AV] ${dados.nome} | ${dados.id}`);
          await targetMember.setNickname(nick).catch(console.error);

          // Adiciona Cargos: Aviãozinho e extra
          await targetMember.roles
            .add(["1499161311354032319", "1499172261549314170"])
            .catch(console.error);
          await targetMember.roles
            .remove(CARGO_ENTRADA_ID)
            .catch(console.error);

          // Criar Sala de Farm
          await criarSalaFarm(
            interaction.guild,
            targetMember,
            configFarm,
          ).catch(console.error);

          const embedLog = new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("✅ REGISTRO APROVADO")
            .addFields(
              { name: "Membro", value: `<@${userId}>`, inline: true },
              { name: "Nome", value: dados.nome || "---", inline: true },
              { name: "ID", value: dados.id || "---", inline: true },
              {
                name: "Telefone",
                value: dados.telefone || "---",
                inline: true,
              },
              {
                name: "Recrutador",
                value: dados.recrutadorId ? `<@${dados.recrutadorId}>` : "---",
                inline: true,
              },
              {
                name: "Aprovado Por",
                value: `<@${interaction.user.id}>`,
                inline: true,
              },
            )
            .setTimestamp();

          const logCanalId = "1498895146203353221";
          const logCanal = interaction.guild.channels.cache.get(logCanalId);
          if (logCanal && logCanal.id !== interaction.channel.id) {
            await logCanal.send({ embeds: [embedLog] });
          }

          await interaction.update({
            content: null,
            embeds: [embedLog],
            components: [],
          });
          sessoesDeRegistro.delete(userId);
        } else {
          const dados = sessoesDeRegistro.get(userId);
          const embedLog = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("❌ REGISTRO NEGADO")
            .addFields(
              { name: "Membro", value: `<@${userId}>`, inline: true },
              { name: "Nome", value: dados?.nome || "---", inline: true },
              { name: "ID", value: dados?.id || "---", inline: true },
              {
                name: "Telefone",
                value: dados?.telefone || "---",
                inline: true,
              },
              {
                name: "Recrutador",
                value: dados?.recrutadorId ? `<@${dados.recrutadorId}>` : "---",
                inline: true,
              },
              {
                name: "Negado Por",
                value: `<@${interaction.user.id}>`,
                inline: true,
              },
            )
            .setTimestamp();

          const logCanalId = "1498895146203353221";
          const logCanal = interaction.guild.channels.cache.get(logCanalId);
          if (logCanal && logCanal.id !== interaction.channel.id) {
            await logCanal.send({ embeds: [embedLog] });
          }

          await interaction.update({
            content: null,
            embeds: [embedLog],
            components: [],
          });
          sessoesDeRegistro.delete(userId);
        }
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
      if (customId === "btn_abrir_carrinho") {
        const itens = sessoesVenda.get(interaction.user.id) || [];
        if (itens.length === 0) {
          sessoesVenda.set(interaction.user.id, []);
        }

        const options = Object.entries(catalogoVendas).map(([key, value]) => ({
          label: value.nome,
          value: key,
          description: `Parceria: R$${value.parceria} | Pista: R$${value.pista}`,
        }));

        const menu = new StringSelectMenuBuilder()
          .setCustomId("menu_vendas_produtos")
          .setPlaceholder("Selecione um produto para adicionar...")
          .addOptions(options);

        const rowMenu = new ActionRowBuilder().addComponents(menu);

        let descricao = "";
        let totalParceria = 0;
        let totalPista = 0;

        if (itens.length > 0) {
          descricao = "**Itens no Carrinho:**\n\n";
          itens.forEach((item) => {
            const prod = catalogoVendas[item.id];
            descricao += `• ${item.qtd}x **${prod.nome}**\n`;
            totalParceria += prod.parceria * item.qtd;
            totalPista += prod.pista * item.qtd;
          });
        } else {
          descricao =
            "Seu carrinho está vazio.\nSelecione um produto no menu abaixo para adicionar.";
        }

        const embed = new EmbedBuilder()
          .setColor(COR_PADRAO)
          .setTitle("🛒 SEU CARRINHO")
          .setDescription(descricao);

        if (itens.length > 0) {
          embed.addFields(
            {
              name: "Subtotal Parceria",
              value: formatarMoeda(totalParceria),
              inline: true,
            },
            {
              name: "Subtotal Pista",
              value: formatarMoeda(totalPista),
              inline: true,
            },
          );
        }

        const rowBtns = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("btn_finalizar_venda")
            .setLabel("Finalizar Venda")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("btn_limpar_carrinho")
            .setLabel("Limpar Carrinho")
            .setStyle(ButtonStyle.Danger),
        );

        const components = itens.length > 0 ? [rowMenu, rowBtns] : [rowMenu];

        await interaction.reply({
          embeds: [embed],
          components: components,
          ephemeral: true,
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
        const itens = sessoesVenda.get(interaction.user.id);
        if (!itens || itens.length === 0)
          return interaction.reply({
            content: "Seu carrinho está vazio.",
            ephemeral: true,
          });

        let totalParceria = 0;
        let totalPista = 0;
        let listaProdutos = "";

        itens.forEach((item) => {
          const prod = catalogoVendas[item.id];
          totalParceria += prod.parceria * item.qtd;
          totalPista += prod.pista * item.qtd;
          listaProdutos += `• ${item.qtd}x **${prod.nome}**\n`;
        });

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
              { name: "Produtos", value: listaProdutos || "---" },
              {
                name: "Total Parceria",
                value: formatarMoeda(totalParceria),
                inline: true,
              },
              {
                name: "Total Pista",
                value: formatarMoeda(totalPista),
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
            ephemeral: true,
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
              ephemeral: true,
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
            ephemeral: true,
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
            ephemeral: true,
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
          ephemeral: true,
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
          ephemeral: true,
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
          ephemeral: true,
        });
      }

      if (customId === "configurar_farm") {
        if (
          !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
        ) {
          return interaction.reply({
            content: "❌ Apenas administradores podem configurar o painel.",
            ephemeral: true,
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
          ephemeral: true,
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
          ephemeral: true,
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
            ephemeral: true,
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
            ephemeral: true,
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
            ephemeral: true,
          });
          farmEmAndamento.delete(interaction.channel.id);
        });
      }
    }

    // --- MODALS ---
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      if (customId === "modal_registro") {
        const nome = interaction.fields.getTextInputValue("reg_nome");
        const id = interaction.fields.getTextInputValue("reg_id");
        const telefone = interaction.fields.getTextInputValue("reg_telefone");

        sessoesDeRegistro.set(interaction.user.id, { nome, id, telefone });

        await interaction.guild.members.fetch();
        const recruiters = interaction.guild.members.cache.filter((m) =>
          m.roles.cache.has("1498812659993280542"),
        );

        if (recruiters.size === 0) {
          return interaction.reply({
            content: "Nenhum recrutador disponível no momento.",
            ephemeral: true,
          });
        }

        const menu = new StringSelectMenuBuilder()
          .setCustomId("selecionar_recrutador")
          .setPlaceholder("Selecione o recrutador que te avaliou...")
          .addOptions(
            recruiters
              .map((r) => ({
                label: r.user.tag,
                value: r.id,
              }))
              .slice(0, 25),
          );

        await interaction.reply({
          content: "Selecione seu recrutador:",
          components: [new ActionRowBuilder().addComponents(menu)],
          ephemeral: true,
        });
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
            ephemeral: true,
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
          ephemeral: true,
        });
      }

      if (customId === "modal_venda_qtd") {
        const qtd = parseInt(interaction.fields.getTextInputValue("venda_qtd"));
        if (isNaN(qtd) || qtd <= 0)
          return interaction.reply({
            content: "Quantidade inválida.",
            ephemeral: true,
          });

        const dados = sessoesVenda.get(interaction.user.id);
        const itemAtual = dados[dados.length - 1];
        itemAtual.qtd = qtd;

        let descricao = "**Itens no Carrinho:**\n\n";
        let totalParceria = 0;
        let totalPista = 0;

        dados.forEach((item) => {
          const prod = catalogoVendas[item.id];
          descricao += `• ${item.qtd}x **${prod.nome}**\n`;
          totalParceria += prod.parceria * item.qtd;
          totalPista += prod.pista * item.qtd;
        });

        const embed = new EmbedBuilder()
          .setColor(COR_PADRAO)
          .setTitle("🛒 SEU CARRINHO")
          .setDescription(descricao)
          .addFields(
            {
              name: "Subtotal Parceria",
              value: formatarMoeda(totalParceria),
              inline: true,
            },
            {
              name: "Subtotal Pista",
              value: formatarMoeda(totalPista),
              inline: true,
            },
          );

        const options = Object.entries(catalogoVendas).map(([key, value]) => ({
          label: value.nome,
          value: key,
          description: `Parceria: R$${value.parceria} | Pista: R$${value.pista}`,
        }));

        const menu = new StringSelectMenuBuilder()
          .setCustomId("menu_vendas_produtos")
          .setPlaceholder("Adicionar mais produtos...")
          .addOptions(options);

        const rowMenu = new ActionRowBuilder().addComponents(menu);

        const rowBtns = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("btn_finalizar_venda")
            .setLabel("Finalizar Venda")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("btn_limpar_carrinho")
            .setLabel("Limpar Carrinho")
            .setStyle(ButtonStyle.Danger),
        );

        await interaction.update({
          embeds: [embed],
          components: [rowMenu, rowBtns],
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
            ephemeral: true,
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
          ephemeral: true,
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
            ephemeral: true,
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
          ephemeral: true,
        });
      }
    }

    // --- SELECT MENUS ---
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;

      if (customId === "selecionar_recrutador") {
        const staffId = interaction.values[0];
        const dados = sessoesDeRegistro.get(interaction.user.id);
        if (dados) {
          dados.recrutadorId = staffId;
          sessoesDeRegistro.set(interaction.user.id, dados);
        }

        const canalAvaliacao =
          interaction.guild.channels.cache.get(CANAL_AVALIACAO_ID);
        if (canalAvaliacao) {
          const embed = new EmbedBuilder()
            .setColor(COR_PRETO)
            .setTitle("📋 NOVA AVALIAÇÃO DE REGISTRO")
            .addFields(
              {
                name: "Candidato",
                value: `<@${interaction.user.id}>`,
                inline: true,
              },
              { name: "ID", value: dados.id || "---", inline: true },
              {
                name: "Telefone",
                value: dados.telefone || "---",
                inline: true,
              },
              { name: "Recrutador", value: `<@${staffId}>` },
            );

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`aprovar_${interaction.user.id}`)
              .setLabel("Aprovar")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`negar_${interaction.user.id}`)
              .setLabel("Negar")
              .setStyle(ButtonStyle.Danger),
          );

          await canalAvaliacao.send({ embeds: [embed], components: [row] });
        }
        await interaction.update({
          content: "Seus dados foram enviados para avaliação. Aguarde.",
          components: [],
        });
      }

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
            ephemeral: true,
          });
        }
      }

      if (customId === "menu_produtos_farm") {
        const itemKey = interaction.values[0];
        farmEmAndamento.set(interaction.channel.id, {
          itemKey: itemKey,
          itemNome: configFarm[itemKey].nome,
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
        if (!sessoesVenda.has(interaction.user.id))
          sessoesVenda.set(interaction.user.id, []);
        sessoesVenda.get(interaction.user.id).push({ id: prodId, qtd: 0 });

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
          ephemeral: true,
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
          ephemeral: true,
        })
        .catch(() => {});
    } else {
      await interaction
        .reply({
          content: "Ocorreu um erro ao processar sua interação.",
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
};
