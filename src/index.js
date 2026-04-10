require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, SlashCommandBuilder, 
    PermissionFlagsBits, ChannelType, StringSelectMenuBuilder 
} = require('discord.js');
const express = require('express');
const JSONDatabase = require('easy-json-database');
const db = new JSONDatabase('./database.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Servidor para o Render não desligar o bot
const app = express();
app.get('/', (req, res) => res.send('Bot de Ticket Online! ✅'));
app.listen(process.env.PORT || 3000);

client.once('ready', async () => {
    console.log(`🤖 Logado como ${client.user.tag}`);
    
    // Registro dos comandos Slash
    const commands = [
        new SlashCommandBuilder()
            .setName('config')
            .setDescription('Configura o sistema de suporte')
            .addRoleOption(opt => opt.setName('cargo_suporte').setDescription('Cargo que atende os tickets').setRequired(true))
            .addChannelOption(opt => opt.setName('categoria').setDescription('Onde os tickets serão criados').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
            .addChannelOption(opt => opt.setName('logs').setDescription('Canal de logs').setRequired(true)),

        new SlashCommandBuilder()
            .setName('ticketchannel')
            .setDescription('Envia a mensagem inicial de suporte')
            .addStringOption(opt => opt.setName('titulo').setDescription('Título do painel').setRequired(true))
            .addStringOption(opt => opt.setName('descricao').setDescription('Descrição do suporte').setRequired(true))
    ];

    await client.application.commands.set(commands);
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, guildId } = interaction;

        // COMANDO CONFIG
        if (commandName === 'config') {
            const role = options.getRole('cargo_suporte');
            const category = options.getChannel('categoria');
            const logs = options.getChannel('logs');

            db.set(`config_${guildId}`, {
                supportRole: role.id,
                categoryId: category.id,
                logsId: logs.id
            });

            return interaction.reply({ content: '✅ Configurações salvas com sucesso!', ephemeral: true });
        }

        // COMANDO TICKETCHANNEL
        if (commandName === 'ticketchannel') {
            const titulo = options.getString('titulo');
            const desc = options.getString('descricao');

            const embed = new EmbedBuilder()
                .setTitle(titulo)
                .setDescription(desc)
                .setColor('Blue')
                .setFooter({ text: 'Clique no menu abaixo para abrir um chamado' });

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_ticket')
                    .setPlaceholder('Selecione o departamento...')
                    .addOptions([
                        { label: 'Suporte Geral', value: 'geral', emoji: '🛠️' },
                        { label: 'Financeiro', value: 'financeiro', emoji: '💰' },
                        { label: 'Denúncias', value: 'denuncia', emoji: '⚠️' },
                        { label: 'Parcerias', value: 'parceria', emoji: '🤝' },
                        { label: 'Outros', value: 'outros', emoji: '📁' }
                    ])
            );

            await interaction.channel.send({ embeds: [embed], components: [menu] });
            return interaction.reply({ content: 'Painel enviado!', ephemeral: true });
        }
    }

    // LÓGICA DAS INTERAÇÕES (Botões e Menus)
    if (interaction.isStringSelectMenu() || interaction.isButton()) {
        const config = db.get(`config_${interaction.guildId}`);
        if (!config) return interaction.reply({ content: "⚠️ Configure o bot primeiro usando /config", ephemeral: true });

        // ABRIR TICKET
        if (interaction.customId === 'select_ticket') {
            const tipo = interaction.values[0];
            
            const channel = await interaction.guild.channels.create({
                name: `ticket-${tipo}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: config.categoryId,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: config.supportRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const embed = new EmbedBuilder()
                .setTitle(`Atendimento: ${tipo.toUpperCase()}`)
                .setDescription(`Olá ${interaction.user}, aguarde um momento. A equipe responsável logo virá te ajudar.\n\nUse os botões abaixo para gerenciar este ticket.`)
                .setColor('Green');

            const btns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                new ButtonBuilder().setCustomId('reivindicar').setLabel('Reivindicar').setStyle(ButtonStyle.Primary).setEmoji('🙋‍♂️')
            );

            await channel.send({ content: `<@&${config.supportRole}> | ${interaction.user}`, embeds: [embed], components: [btns] });
            return interaction.reply({ content: `✅ Ticket aberto com sucesso: ${channel}`, ephemeral: true });
        }

        // BOTÃO REIVINDICAR
        if (interaction.customId === 'reivindicar') {
            if (!interaction.member.roles.cache.has(config.supportRole)) {
                return interaction.reply({ content: "Apenas a staff pode fazer isso!", ephemeral: true });
            }
            const embedReivindicado = new EmbedBuilder()
                .setDescription(`Ticket reivindicado por ${interaction.user}`)
                .setColor('Yellow');
            
            interaction.reply({ embeds: [embedReivindicado] });
            interaction.message.edit({ components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('fechar').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                    new ButtonBuilder().setCustomId('reivindicado').setLabel('Assumido').setStyle(ButtonStyle.Secondary).setDisabled(true)
                )
            ]});
        }

        // BOTÃO FECHAR
        if (interaction.customId === 'fechar') {
            await interaction.reply("🔒 O ticket será fechado em 5 segundos...");
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
});

client.login(process.env.TOKEN);
