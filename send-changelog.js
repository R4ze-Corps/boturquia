require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { configRegistro } = require("./src/utils/registroConfig");

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.log("[SendChangelog] DISCORD_TOKEN não definido.");
  process.exit(1);
}

const changelogPath = path.join(__dirname, "CHANGELOG.md");
if (!fs.existsSync(changelogPath)) {
  console.log("[SendChangelog] CHANGELOG.md não encontrado.");
  process.exit(1);
}

const content = fs.readFileSync(changelogPath, "utf-8");
const versionMatch = content.match(/## \[(.+?)\]\s*-\s*(\d{4}[\d-]+)/);
if (!versionMatch) {
  console.log("[SendChangelog] Nenhuma versão encontrada no CHANGELOG.md.");
  process.exit(1);
}

const version = versionMatch[1];
const afterVersion = content.slice(content.indexOf(versionMatch[0]) + versionMatch[0].length);

const adicoes = [];
const modificacoes = [];
let currentSection = null;

for (const line of afterVersion.split("\n")) {
  const trimmed = line.trim();
  if (trimmed.startsWith("### ")) {
    const section = trimmed.replace("### ", "").toLowerCase();
    if (section.includes("adi")) currentSection = "adicoes";
    else if (section.includes("modif") || section.includes("mudan") || section.includes("alter")) currentSection = "modificacoes";
    else currentSection = null;
  } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
    const item = trimmed.replace(/^[-•]\s*/, "");
    if (currentSection === "adicoes") adicoes.push(item);
    else if (currentSection === "modificacoes") modificacoes.push(item);
  } else if (trimmed.startsWith("## [")) {
    break;
  }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("clientReady", async () => {
  console.log(`[SendChangelog] Conectado como ${client.user.tag}`);

  const canalId = configRegistro.canalChangelog;
  if (!canalId) {
    console.log("[SendChangelog] Canal de changelogs não configurado.");
    await client.destroy();
    process.exit(1);
  }

  const canal = await client.channels.fetch(canalId).catch(() => null);
  if (!canal) {
    console.log(`[SendChangelog] Canal ${canalId} não encontrado.`);
    await client.destroy();
    process.exit(1);
  }

  const data = new Date();
  const dataBR = data.toLocaleDateString("pt-BR");
  const horaBR = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const descricao = [
    "Confira as atualizações e modificações recentes aplicadas aos nossos sistemas e scripts.",
    "",
    adicoes.length > 0 ? `**🟢 Adições**\n${adicoes.map(l => `• ${l}`).join("\n")}` : "",
    "",
    modificacoes.length > 0 ? `**🟡 Modificações**\n${modificacoes.map(l => `• ${l}`).join("\n")}` : "",
  ].filter(Boolean).join("\n");

  const embed = new EmbedBuilder()
    .setColor(0xFFFFFF)
    .setTitle(`Turquia Bot | Changelog ${version}`)
    .setDescription(descricao)
    .setFooter({ text: `Raze Corporation • (${dataBR} ${horaBR})` });

  await canal.send({ embeds: [embed] });
  console.log(`[SendChangelog] Changelog ${version} enviado com sucesso!`);
  await client.destroy();
  process.exit(0);
});

client.login(token).catch((err) => {
  console.log("[SendChangelog] Erro ao logar:", err);
  process.exit(1);
});
