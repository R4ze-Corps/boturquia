require("dotenv").config();
const { REST, Routes } = require("discord.js");
const { banner, info, success, error, separator, c } = require("./src/utils/logger");

const commands = [
  { name: "registrar", description: "Inicia o processo de registro na Raze Store." },
  { name: "ticket", description: "Envia o painel de atendimento (Ticket)." },
  { name: "hierarquia", description: "Exibe a lista de membros e seus respectivos cargos na hierarquia." },
  { name: "punicao", description: "Aplica punição via barra de comando.", options: [
    { type: 6, name: "membro", description: "Selecione o usuário que será punido", required: true },
    { type: 8, name: "cargo", description: "Selecione o cargo de punição", required: true },
  ]},
  { name: "ausencia", description: "Solicita período de ausência.", options: [
    { type: 3, name: "motivo", description: "Motivo da ausência", required: true },
    { type: 4, name: "dias", description: "Defina o tempo de ausência em dias", required: true, min_value: 1, max_value: 30 },
  ]},
  { name: "painel_ausencia", description: "Envia o painel de ausência com calendário." },
  { name: "painel_vendas", description: "Envia o painel de registro de vendas." },
  { name: "acao", description: "Inicia a marcação de uma nova ação (Apenas Organizadores/Líderes)." },
  { name: "upar", description: "Abre o painel de promoção e rebaixamento de membros." },
  { name: "suporte", description: "Envia o painel de suporte para abertura de tickets." },
  { name: "limpar", description: "Limpa as mensagens do canal atual.", options: [
    { type: 4, name: "quantidade", description: "Quantidade de mensagens a serem limpas (máximo 100).", required: false, min_value: 1, max_value: 100 },
  ]},
];

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID || "1498669897914253384";
const TOKEN = process.env.DISCORD_TOKEN;

(async () => {
  banner();
  info("DEPLOY", "Registrando comandos de barra (/)...");

  if (!TOKEN || !CLIENT_ID) {
    return error("DEPLOY", "TOKEN ou CLIENT_ID não definidos no .env");
  }

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    const data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    data.forEach(cmd => success("DEPLOY", `✔  /${cmd.name}`));
    separator();
    console.log(`  ${c.green}${data.length} comandos registrados com sucesso.${c.reset}`);
  } catch (err) {
    error("DEPLOY", `Falha ao registrar comandos: ${err.message}`);
    if (err.rawError?.errors) {
      console.log(`  ${c.red}Detalhes:${c.reset}`, JSON.stringify(err.rawError.errors, null, 2));
    }
  }

  separator();
})();
