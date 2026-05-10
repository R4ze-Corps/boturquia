const fs = require("fs");
const path = require("path");
const { info, success, error } = require("../utils/logger");

module.exports = (client) => {
  client.commands = new Map();
  const commandsPath = path.join(__dirname, "../commands");
  const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));
  let loaded = 0;
  let failed = 0;

  for (const file of commandFiles) {
    try {
      const command = require(`../commands/${file}`);
      client.commands.set(command.name, command);
      success(`Comandos  `, `✔  ${command.name}`);
      loaded++;
    } catch (err) {
      error("Falha ao carregar módulo de comandos", `${file}: ${err.message}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.log(`  ${failed} comando(s) com falha`);
  }

  const eventFiles = fs.readdirSync(path.join(__dirname, "../events")).filter((f) => f.endsWith(".js"));
  for (const file of eventFiles) {
    try {
      const event = require(`../events/${file}`);
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      success(`Eventos   `, `✔  ${event.name}`);
    } catch (err) {
      error("Falha ao carregar módulo de eventos", `${file}: ${err.message}`);
    }
  }
};
