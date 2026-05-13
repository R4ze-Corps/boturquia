module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        const interactionHandler = require('../handlers/interactionHandler');
        await interactionHandler(interaction, client);
    },
};
