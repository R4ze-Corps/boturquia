const { configRegistro } = require("../utils/registroConfig");

module.exports = {
  name: "guildMemberAdd",
  once: false,
  async execute(member) {
    const cargoId = configRegistro.cargos.registrar;
    if (!cargoId) return;

    await member.roles.add(cargoId).catch(console.error);
  },
};
