const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = async (interaction, client) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) await command.execute(interaction);
    }

    if (interaction.isButton()) {
        const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config) return interaction.reply({ content: "O bot não foi configurado.", ephemeral: true });

        // ABRIR TICKET
        if (interaction.customId === 'open_ticket') {
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: config.ticketCategoryId,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: config.supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            const embed = new EmbedBuilder()
                .setTitle('Suporte Solicitado')
                .setDescription('Aguarde um staff. Utilize os botões abaixo para gerenciar.')
                .setColor('Blue');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('Reivindicar').setStyle(ButtonStyle.Success)
            );

            await channel.send({ embeds: [embed], components: [row] });
            interaction.reply({ content: `Ticket aberto em ${channel}`, ephemeral: true });
        }

        // REIVINDICAR TICKET
        if (interaction.customId === 'claim_ticket') {
            if (!interaction.member.roles.cache.has(config.supportRoleId)) {
                return interaction.reply({ content: "Apenas a staff pode reivindicar!", ephemeral: true });
            }
            interaction.reply({ content: `O ticket foi assumido por ${interaction.user}` });
            interaction.message.edit({ components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('claimed').setLabel('Reivindicado').setStyle(ButtonStyle.Secondary).setDisabled(true)
                )
            ]});
        }

        // FECHAR TICKET
        if (interaction.customId === 'close_ticket') {
            interaction.reply("O canal será excluído em 5 segundos...");
            setTimeout(() => interaction.channel.delete(), 5000);
        }
    }
};
