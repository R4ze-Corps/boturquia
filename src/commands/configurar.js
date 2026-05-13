const { setConfigValue } = require("../utils/registroConfig");

module.exports = {
  name: "configurar",
  data: {
    name: "configurar",
    description: "Configurar o sistema de registro",
    options: [
      {
        type: 1,
        name: "canal",
        description: "Configurar canal de log de registro",
        options: [
          {
            type: 7,
            name: "canal",
            description: "Canal de log",
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: "cargo-registrar",
        description: "Configurar cargo necessário para se registrar",
        options: [
          {
            type: 8,
            name: "cargo",
            description: "Cargo requerido",
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: "cargo-aprovado",
        description: "Configurar cargo de aprovado",
        options: [
          {
            type: 8,
            name: "cargo",
            description: "Cargo de aprovado",
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: "cargo-aprovado2",
        description: "Configurar segundo cargo de aprovado",
        options: [
          {
            type: 8,
            name: "cargo",
            description: "Segundo cargo de aprovado",
            required: true,
          },
        ],
      },
    ],
  },
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "canal") {
      const channel = interaction.options.getChannel("canal");
      setConfigValue("canalRegistro", channel.id);
      await interaction.reply({
        content: `Canal de registro configurado: ${channel}`,
        flags: 64,
      });
    } else if (sub === "cargo-registrar") {
      const role = interaction.options.getRole("cargo");
      setConfigValue("cargos.registrar", role.id);
      await interaction.reply({
        content: `Cargo para registrar configurado: ${role}`,
        flags: 64,
      });
    } else if (sub === "cargo-aprovado") {
      const role = interaction.options.getRole("cargo");
      setConfigValue("cargos.aprovado", role.id);
      await interaction.reply({
        content: `Cargo de aprovado configurado: ${role}`,
        flags: 64,
      });
    } else if (sub === "changelog") {
      const channel = interaction.options.getChannel("canal");
      setConfigValue("canalChangelog", channel.id);
      await interaction.reply({
        content: `Canal de changelogs configurado: ${channel}`,
        flags: 64,
      });
    } else if (sub === "cargo-aprovado2") {
      const role = interaction.options.getRole("cargo");
      setConfigValue("cargos.aprovado2", role.id);
      await interaction.reply({
        content: `Segundo cargo de aprovado configurado: ${role}`,
        flags: 64,
      });
    }
  },
};
