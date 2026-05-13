const c = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  reset: "\x1b[0m",
};

function info(label, msg) {
  console.log(`${c.cyan}[ 🛰️ TURQUIA ]${c.reset} ${msg}`);
}

function auth(label, msg) {
  console.log(`${c.green}[ 🔐 AUTH ]${c.reset} ${msg}`);
}

function success(label, msg) {
  console.log(`${c.blue}[ 🎮 ${label} ]${c.reset} ${msg}`);
}

function warn(msg) {
  console.log(`${c.yellow}[ ⚠️ WARN ]${c.reset} ${msg}`);
}

function error(msg, detail) {
  console.log(`${c.red}[ ❌ ERRO ]${c.reset} ${msg}`);
  if (detail) console.log(`${c.gray}  └─ ${detail}${c.reset}`);
}

function separator() {
  console.log(`${c.gray}────────────────────────────────────────────────────────${c.reset}`);
}

function banner(client) {
  const latencia = client?.ws?.ping ?? 0;
  const status = client?.ws?.status === 0 ? "ONLINE" : "OFFLINE";
  console.log(`
${c.gray}______________________________________________________${c.reset}
${c.gray}|${c.reset}                                                     ${c.gray}|${c.reset}
${c.gray}|${c.reset}   ${c.cyan}RAZE CORP - Turquia System v1.0${c.reset}              ${c.gray}|${c.reset}
${c.gray}|${c.reset}   ${c.green}Status:${c.reset} [ ${status} ] ${c.gray}|${c.reset} ${c.yellow}Latência:${c.reset} ${latencia}ms          ${c.gray}|${c.reset}
${c.gray}|_____________________________________________________|${c.reset}
`);
}

module.exports = { info, auth, success, warn, error, separator, banner, c };
