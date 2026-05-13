require("dotenv").config();
const { REST, Routes } = require("discord.js");

// Definição do comando que vai aparecer no Discord
const commands = [
  {
    name: "registrar",
    description: "Abrir formulário de registro",
  },
  {
    name: "configurar",
    description: "Configurar o sistema de registro",
    options: [
      {
        type: 1,
        name: "canal",
        description: "Configurar canal de log de registro",
        options: [
          { type: 7, name: "canal", description: "Canal de log", required: true },
        ],
      },
      {
        type: 1,
        name: "cargo-registrar",
        description: "Configurar cargo necessário para se registrar",
        options: [
          { type: 8, name: "cargo", description: "Cargo requerido", required: true },
        ],
      },
      {
        type: 1,
        name: "changelog",
        description: "Configurar canal de changelogs",
        options: [
          { type: 7, name: "canal", description: "Canal de changelogs", required: true },
        ],
      },
      {
        type: 1,
        name: "cargo-aprovado",
        description: "Configurar cargo de aprovado",
        options: [
          { type: 8, name: "cargo", description: "Cargo de aprovado", required: true },
        ],
      },
      {
        type: 1,
        name: "cargo-aprovado2",
        description: "Configurar segundo cargo de aprovado",
        options: [
          { type: 8, name: "cargo", description: "Segundo cargo de aprovado", required: true },
        ],
      },
    ],
  },
  {
    name: "ticket",
    description: "Envia o painel de atendimento (Ticket).",
  },
  {
    name: "hierarquia",
    description:
      "Exibe a lista de membros e seus respectivos cargos na hierarquia.",
  },
  {
    name: "punicao",
    description: "Aplica punição via barra de comando.",
    options: [
      {
        type: 6,
        name: "usuario",
        description: "Selecione o usuário que será punido",
        required: true,
      },
      {
        type: 3,
        name: "id",
        description: "Digite o iD do registro",
        required: true,
      },
      {
        type: 3,
        name: "cargo",
        description: "Selecione o cargo de punição",
        required: true,
        choices: [
          { name: "Punição 1499037580480483469", value: "1499037580480483469" },
          { name: "Punição 1498816024735387889", value: "1498816024735387889" },
          { name: "Punição 1498816083241603234", value: "1498816083241603234" },
          { name: "Punição 1498816086777401444", value: "1498816086777401444" },
        ],
      },
    ],
  },
  {
    name: "ausencia",
    description: "Solicita período de ausência.",
    options: [
      {
        type: 3,
        name: "motivo",
        description: "Motivo da ausência",
        required: true,
      },
      {
        type: 4,
        name: "dias",
        description: "Defina o tempo de ausência em dias",
        required: true,
        min_value: 1,
        max_value: 30,
      },
    ],
  },
  {
    name: "painel_ausencia",
    description: "Envia o painel de ausência com calendário.",
  },
  {
    name: "painel_vendas",
    description: "Envia o painel de registro de vendas.",
  },
  {
    name: "acao",
    description:
      "Inicia a marcação de uma nova ação (Apenas Organizadores/Líderes).",
  },
  {
    name: "upar",
    description: "Abre o painel de promoção e rebaixamento de membros.",
  },
  {
    name: "suporte",
    description: "Envia o painel de suporte para abertura de tickets.",
  },
  {
    name: "limpar",
    description: "Limpa as mensagens do canal atual.",
    options: [
      {
        type: 4,
        name: "quantidade",
        description: "Quantidade de mensagens a serem limpas (máximo 100).",
        required: false,
        min_value: 1,
        max_value: 100,
      },
    ],
  },
];

// VARIÁVEIS IMPORTANTES - PREENCHA COM OS SEUS DADOS
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.DISCORD_TOKEN;

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log(
      `Iniciando o registro de ${commands.length} comandos de barra (/) no servidor...`,
    );

    // O método PUT é usado para atualizar todos os comandos no servidor com o conjunto atual
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );

    console.log(
      `Sucesso! ${data.length} comandos de barra (/) foram registrados.`,
    );
  } catch (error) {
    console.error("Ocorreu um erro ao registrar os comandos:", error);
  }
})();
