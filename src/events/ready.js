const { info, auth, warn, separator, c } = require("../utils/logger");

module.exports = {
  name: "clientReady",
  once: true,
  execute(client) {
    info("TURQUIA", "Conectando ao Ecossistema ONE...");
    auth("AUTH", `Login realizado como ${c.green}${client.user.tag}${c.reset}`);

    const ping = client.ws.ping > 0 ? client.ws.ping : "<calculando>";

    console.log(`
${c.gray}______________________________________________________${c.reset}
${c.gray}|${c.reset}                                                     ${c.gray}|${c.reset}
${c.gray}|${c.reset}   ${c.cyan}RAZE CORP - Turquia System v1.0${c.reset}              ${c.gray}|${c.reset}
${c.gray}|${c.reset}   ${c.green}Status:${c.reset} [ ONLINE ] ${c.gray}|${c.reset} ${c.yellow}Latência:${c.reset} ${ping}ms             ${c.gray}|${c.reset}
${c.gray}|_____________________________________________________|${c.reset}
`);

    if (typeof ping === "number" && ping > 200) {
      warn(`Latência alta detectada na API: ${ping}ms`);
    }

    separator();
  },
};
