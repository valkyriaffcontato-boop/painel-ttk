const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configura o sistema de tickets')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(option => option.setName('staff_role').setDescription('Cargo que atende os tickets').setRequired(true))
        .addChannelOption(option => option.setName('category').setDescription('Categoria onde os tickets serão abertos').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
        .addChannelOption(option => option.setName('logs').setDescription('Canal de logs').addChannelTypes(ChannelType.GuildText).setRequired(true)),

    async execute(interaction) {
        const staffRole = interaction.options.getRole('staff_role');
        const category = interaction.options.getChannel('category');
        const logs = interaction.options.getChannel('logs');

        await GuildConfig.findOneAndUpdate(
            { guildId: interaction.guild.id },
            { 
                supportRoleId: staffRole.id, 
                ticketCategoryId: category.id, 
                logsChannelId: logs.id 
            },
            { upsert: true }
        );

        return interaction.reply({ content: '✅ Configuração salva com sucesso!', ephemeral: true });
    }
};

// Adicione outro comando no mesmo arquivo ou novo para enviar a mensagem do ticket
// /ticket-send
