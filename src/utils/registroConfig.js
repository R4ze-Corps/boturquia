const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "..", "registroConfig.json");

const defaults = {
  canalRegistro: "",
  canalChangelog: "",
  cargos: {
    registrar: "",
    aprovado: "",
    aprovado2: "",
  },
};

function load() {
  try {
    if (fs.existsSync(configPath)) {
      return { ...defaults, ...JSON.parse(fs.readFileSync(configPath, "utf-8")) };
    }
  } catch {
    console.error("[RegistroConfig] Erro ao ler config, usando defaults");
  }
  save(defaults);
  return { ...defaults };
}

function save(data) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[RegistroConfig] Erro ao salvar:", err);
  }
}

const configRegistro = load();

function setConfigValue(key, value) {
  if (key === "canalRegistro") {
    configRegistro.canalRegistro = value;
  } else if (key === "canalChangelog") {
    configRegistro.canalChangelog = value;
  } else if (key.startsWith("cargos.")) {
    const sub = key.split(".")[1];
    if (sub in configRegistro.cargos) {
      configRegistro.cargos[sub] = value;
    }
  }
  save(configRegistro);
}

module.exports = { configRegistro, setConfigValue };
