require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, SlashCommandBuilder, 
    PermissionFlagsBits, ChannelType, StringSelectMenuBuilder 
} = require('discord.js');
const express = require('express');
const JSONDatabase = require('easy-json-database');
const db = new JSONDatabase('./database.json');

// Inicialização do Bot com Intents completas
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Servidor Web para o Render
const app = express();
app.get('/', (req, res) => res.send('Bot Status: Online ✅'));
app.listen(process.env.PORT || 3000, () => console.log("🟢 Servidor Web Iniciado."));

client.once('ready', async () => {
    console.log(`✅ SUCESSO: Logado como ${client.user.tag}`);
    
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
        console.log("⏳ Registrando comandos Slash...");
        await client.application.commands.set(commands);
        console.log("🚀 Comandos Slash registrados com sucesso!");
    } catch (error) {
        console.error("❌ Erro ao registrar comandos:", error);
    }
});

// --- LÓGICA DE INTERAÇÃO (Botões e Menus) ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, guildId } = interaction;

        if (commandName === 'config') {
            const role = options.getRole('cargo_suporte');
            const category = options.getChannel('categoria');
            const logs = options.getChannel('logs');
            db.set(`config_${guildId}`, { supportRole: role.id, categoryId: category.id, logsId: logs.id });
            return interaction.reply({ content: '✅ Configuração salva!', ephemeral: true });
        }

        if (commandName === 'ticketchannel') {
            const titulo = options.getString('titulo');
            const desc = options.getString('descricao');
            const embed = new EmbedBuilder().setTitle(titulo).setDescription(desc).setColor('#5865F2');
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('abrir_ticket').setPlaceholder('Escolha uma categoria')
                .addOptions([
                    { label: 'Suporte Geral', value: 'Geral', emoji: '🛠️' },
                    { label: 'Financeiro', value: 'Financeiro', emoji: '💰' },
                    { label: 'Denúncias', value: 'Denúncia', emoji: '⚠️' }
                ])
            );
            await interaction.channel.send({ embeds: [embed], components: [menu] });
            return interaction.reply({ content: 'Painel enviado!', ephemeral: true });
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'abrir_ticket') {
        const config = db.get(`config_${interaction.guildId}`);
        if (!config) return interaction.reply({ content: "⚠️ Use /config primeiro.", ephemeral: true });
        
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.values[0]}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: config.categoryId,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: config.supportRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });
        interaction.reply({ content: `✅ Ticket aberto: ${channel}`, ephemeral: true });
    }
});

// Verificação de Erro de Login
console.log("⏳ Tentando conectar ao Discord...");
client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERRO NO LOGIN:");
    console.error(err);
});
