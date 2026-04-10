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
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

// --- SERVIDOR WEB PARA O RENDER ---
const app = express();
app.get('/', (req, res) => res.send('Bot de Ticket Profissional Online! 🚀'));
app.listen(process.env.PORT || 3000, () => console.log("Servidor Web Iniciado."));

// --- REGISTRO DE COMANDOS ---
client.once('ready', async () => {
    console.log(`✅ Logado como ${client.user.tag}`);
    
    const commands = [
        new SlashCommandBuilder()
            .setName('config')
            .setDescription('Configura o sistema de suporte')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addRoleOption(opt => opt.setName('cargo_suporte').setDescription('Cargo que atende os tickets').setRequired(true))
            .addChannelOption(opt => opt.setName('categoria').setDescription('Categoria onde os tickets serão criados').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
            .addChannelOption(opt => opt.setName('logs').setDescription('Canal onde os logs serão enviados').addChannelTypes(ChannelType.GuildText).setRequired(true)),

        new SlashCommandBuilder()
            .setName('ticketchannel')
            .setDescription('Envia a mensagem inicial de suporte')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(opt => opt.setName('titulo').setDescription('Título do painel').setRequired(true))
            .addStringOption(opt => opt.setName('descricao').setDescription('Descrição do suporte').setRequired(true))
    ];

    try {
        await client.application.commands.set(commands);
        console.log("🚀 Comandos Slash registrados!");
    } catch (error) {
        console.error("Erro ao registrar comandos:", error);
    }
});

// --- LOGICA DAS INTERAÇÕES ---
client.on('interactionCreate', async (interaction) => {
    
    // 1. Tratamento de Comandos Slash
    if (interaction.isChatInputCommand()) {
        const { commandName, options, guildId } = interaction;

        if (commandName === 'config') {
            const role = options.getRole('cargo_suporte');
            const category = options.getChannel('categoria');
            const logs = options.getChannel('logs');

            db.set(`config_${guildId}`, {
                supportRole: role.id,
                categoryId: category.id,
                logsId: logs.id
            });

            return interaction.reply({ content: '✅ Configuração salva com sucesso!', ephemeral: true });
        }

        if (commandName === 'ticketchannel') {
            const titulo = options.getString('titulo');
            const desc = options.getString('descricao');

            const embed = new EmbedBuilder()
                .setTitle(titulo)
                .setDescription(desc)
                .setColor('#5865F2')
                .setThumbnail(interaction.guild.iconURL())
                .setFooter({ text: 'Sistema de Suporte Profissional', iconURL: client.user.displayAvatarURL() });

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('abrir_ticket')
                    .setPlaceholder('Escolha uma categoria para abrir um ticket')
                    .addOptions([
                        { label: 'Suporte Geral', value: 'Geral', emoji: '🛠️', description: 'Dúvidas e problemas gerais' },
                        { label: 'Financeiro', value: 'Financeiro', emoji: '💰', description: 'Assuntos sobre pagamentos' },
                        { label: 'Denúncias', value: 'Denúncia', emoji: '⚠️', description: 'Reportar infrações' },
                        { label: 'Parcerias', value: 'Parceria', emoji: '🤝', description: 'Interesse em parcerias' },
                        { label: 'Cursos/Aulas', value: 'Cursos', emoji: '📚', description: 'Suporte para alunos' }
                    ])
            );

            await interaction.channel.send({ embeds: [embed], components: [menu] });
            return interaction.reply({ content: 'Painel enviado!', ephemeral: true });
        }
    }

    // 2. Tratamento de Menus e Botões
    const config = db.get(`config_${interaction.guildId}`);

    if (interaction.isStringSelectMenu() && interaction.customId === 'abrir_ticket') {
        if (!config) return interaction.reply({ content: "⚠️ O bot não foi configurado! Use /config primeiro.", ephemeral: true });

        await interaction.deferReply({ ephemeral: true });
        const tipo = interaction.values[0];

        // Criação do Canal
        const channel = await interaction.guild.channels.create({
            name: `ticket-${tipo}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: config.categoryId,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: config.supportRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const embedTicket = new EmbedBuilder()
            .setTitle(`🎫 Ticket de ${tipo}`)
            .setDescription(`Olá ${interaction.user}, bem-vindo ao seu ticket.\nA equipe <@&${config.supportRole}> entrará em contato em breve.\n\nUse os botões abaixo para gerenciar o atendimento.`)
            .setColor('Green')
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('reivindicar_ticket').setLabel('Reivindicar').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️')
        );

        await channel.send({ content: `<@&${config.supportRole}> | ${interaction.user}`, embeds: [embedTicket], components: [row] });
        
        // Log no canal de logs
        const logChannel = interaction.guild.channels.cache.get(config.logsId);
        if (logChannel) {
            logChannel.send({ content: `✅ **Ticket Aberto:** ${channel.name} por ${interaction.user.tag}` });
        }

        return interaction.editReply({ content: `✅ Seu ticket foi aberto: ${channel}` });
    }

    if (interaction.isButton()) {
        if (!config) return;

        // Botão Reivindicar
        if (interaction.customId === 'reivindicar_ticket') {
            if (!interaction.member.roles.cache.has(config.supportRole)) {
                return interaction.reply({ content: "❌ Você não tem permissão para reivindicar este ticket.", ephemeral: true });
            }

            const embedClaim = EmbedBuilder.from(interaction.message.embeds[0])
                .addFields({ name: 'Staff Responsável', value: `${interaction.user}`, inline: true });

            const rowDisabled = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                new ButtonBuilder().setCustomId('reivindicado').setLabel('Reivindicado por ' + interaction.user.username).setStyle(ButtonStyle.Secondary).setDisabled(true)
            );

            await interaction.update({ embeds: [embedClaim], components: [rowDisabled] });
            return interaction.followUp({ content: `🙋‍♂️ ${interaction.user} assumiu este atendimento!` });
        }

        // Botão Fechar
        if (interaction.customId === 'fechar_ticket') {
            await interaction.reply({ content: "🔒 Este ticket será fechado e excluído em 5 segundos..." });
            
            // Log de fechamento
            const logChannel = interaction.guild.channels.cache.get(config.logsId);
            if (logChannel) {
                logChannel.send({ content: `❌ **Ticket Fechado:** ${interaction.channel.name} por ${interaction.user.tag}` });
            }

            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 5000);
        }
    }
});

// LOGIN (O Render lerá o TOKEN das Environment Variables)
client.login(process.env.TOKEN);
