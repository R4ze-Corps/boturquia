const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder,
} = require("discord.js");
const { CATEGORIA_SUPORTE_ID, CANAL_LOG_TRANSCRIPT_ID, COR_PRETO } = require("../../config/constants");

async function handleButton(interaction) {
  const id = interaction.customId;

  if (id === "btn_abrir_suporte") {
    const canal = await interaction.guild.channels.create({
      name: `suporte-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: CATEGORIA_SUPORTE_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ],
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_fechar_suporte").setLabel("Fechar Suporte").setStyle(ButtonStyle.Danger),
    );

    await canal.send({
      content: `<@${interaction.user.id}>`,
      embeds: [new EmbedBuilder().setColor(COR_PRETO).setTitle("Atendimento").setDescription("Aguarde um membro da gerência. Para fechar, clique no botão abaixo.")],
      components: [row],
    });
    await interaction.reply({ content: `Canal criado: ${canal}`, ephemeral: true });
    return true;
  }

  if (id === "btn_fechar_suporte") {
    const canal = interaction.channel;
    const logs = await canal.messages.fetch();
    let transcript = `Transcript do canal ${canal.name}\n\n`;
    logs.reverse().forEach(m => {
      transcript += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
    });

    const logChannel = interaction.guild.channels.cache.get(CANAL_LOG_TRANSCRIPT_ID);
    if (logChannel) {
      await logChannel.send({
        content: `Suporte de <@${interaction.user.id}> fechado.`,
        files: [new AttachmentBuilder(Buffer.from(transcript, "utf-8"), { name: "transcript.txt" })],
      });
    }

    await interaction.reply("O canal será deletado em 5 segundos...");
    setTimeout(() => canal.delete(), 5000);
    return true;
  }

  return false;
}

module.exports = { handleButton };
