const {
  EmbedBuilder,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
} = require("discord.js");
const { sessoesUpar } = require("../../database/memoryDb");
const { safeNickname } = require("../../utils/nickHelpers");

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

async function handleButton(interaction) {
  const id = interaction.customId;

  if (id === "btn_promover" || id === "btn_rebaixar") {
    sessoesUpar.set(interaction.user.id, {
      tipo: id === "btn_promover" ? "PROMOÇÃO" : "REBAIXAMENTO",
    });
    await interaction.reply({
      content: "Selecione o membro:",
      components: [new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder().setCustomId("select_user_upar").setPlaceholder("Selecione o membro..."),
      )],
      flags: 64,
    });
    return true;
  }

  return false;
}

async function handleRoleSelect(interaction) {
  if (interaction.customId !== "select_role_upar") return false;

  const roleId = interaction.values[0];
  const sessao = sessoesUpar.get(interaction.user.id);
  const targetMember = await interaction.guild.members.fetch(sessao.targetId).catch(() => null);

  if (targetMember) {
    await targetMember.roles.remove(Object.keys(cargosUpar)).catch(console.error);
    await targetMember.roles.add(roleId).catch(console.error);

    const metadata = cargosUpar[roleId];
    const sigla = metadata?.sigla || "MB";

    const nickBase = targetMember.nickname || targetMember.user.username;
    const nomeLimpo = nickBase.includes("|")
      ? nickBase.split("|")[0].replace(/\[.*?\]/, "").trim()
      : nickBase.replace(/\[.*?\]/, "").trim();

    await targetMember.setNickname(safeNickname(`[${sigla}] ${nomeLimpo} | ${targetMember.id}`)).catch(console.error);

    const logChannel = interaction.guild.channels.cache.get("1499574962191728721");
    if (logChannel) {
      const isPromocao = sessao.tipo === "PROMOÇÃO";
      await logChannel.send({
        content: `<@${targetMember.id}>`,
        embeds: [new EmbedBuilder()
          .setColor(isPromocao ? "#57F287" : "#ED4245")
          .setTitle(isPromocao ? "🎊 PROMOÇÃO NA TURQUIA" : "📉 RECLASSIFICAÇÃO NA TURQUIA")
          .setDescription(`**Membro:** <@${targetMember.id}>\n**Novo Cargo:** <@&${roleId}>\n\n${isPromocao
            ? "É com grande satisfação que celebramos sua merecida promoção, resultado de sua dedicação exemplar e desempenho consistente.\nSua trajetória demonstra profissionalismo, compromisso e excelência, qualidades que o destacam e inspiram todos ao seu redor.\nDesejamos pleno sucesso nesta nova etapa, certos de que continuará alcançando conquistas ainda mais significativas."
            : "Informamos, de forma respeitosa, a redefinição de sua posição, medida adotada após criteriosa avaliação interna e alinhamento estratégico.\nA decisão não invalida suas contribuições, mas busca promover um melhor enquadramento às necessidades atuais da organização.\nSeguimos confiantes em sua capacidade de adaptação e contamos com seu profissionalismo para esta nova etapa."
          }`)
          .setThumbnail(targetMember.user.displayAvatarURL()).setTimestamp()],
      });
    }

    await interaction.update({
      content: `✅ Membro atualizado para **${metadata?.nome || "---"}**`,
      components: [],
    });
  }

  sessoesUpar.delete(interaction.user.id);
  return true;
}

async function handleUserSelect(interaction) {
  if (interaction.customId !== "select_user_upar") return false;

  const targetId = interaction.values[0];
  const sessao = sessoesUpar.get(interaction.user.id);
  sessao.targetId = targetId;

  await interaction.update({
    content: `Membro selecionado: <@${targetId}>. Agora selecione o novo cargo:`,
    components: [new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder().setCustomId("select_role_upar").setPlaceholder("Selecione o novo cargo..."),
    )],
  });
  return true;
}

module.exports = { handleButton, handleRoleSelect, handleUserSelect };
