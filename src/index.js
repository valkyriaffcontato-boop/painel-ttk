require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, PermissionFlagsBits, ChannelType, StringSelectMenuBuilder } = require('discord.js');
const express = require('express');
const JSONDatabase = require('easy-json-database');
const db = new JSONDatabase('./database.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const app = express();
app.get('/', (req, res) => res.send('Bot Status: Online ✅'));
app.listen(process.env.PORT || 3000, () => console.log("🟢 [WEB] Servidor Express rodando."));

// Monitor de Erros Globais
client.on('error', (err) => console.error("❌ [DISCORD ERROR]:", err));
process.on('unhandledRejection', (reason, p) => console.error("❌ [UNHANDLED REJECTION]:", reason));

client.once('ready', async () => {
    console.log(`✅ [LOGIN] Sucesso! Bot: ${client.user.tag}`);
    
    const commands = [
        new SlashCommandBuilder()
            .setName('config')
            .setDescription('Configura o sistema de suporte')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addRoleOption(opt => opt.setName('cargo_suporte').setDescription('Cargo que atende os tickets').setRequired(true))
            .addChannelOption(opt => opt.setName('categoria').setDescription('Categoria dos tickets').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
            .addChannelOption(opt => opt.setName('logs').setDescription('Canal de logs').addChannelTypes(ChannelType.GuildText).setRequired(true)),

        new SlashCommandBuilder()
            .setName('ticketchannel')
            .setDescription('Envia o painel de suporte')
            .addStringOption(opt => opt.setName('titulo').setDescription('Título do painel').setRequired(true))
            .addStringOption(opt => opt.setName('descricao').setDescription('Descrição').setRequired(true))
    ];

    try {
        console.log("⏳ [SLASH] Registrando comandos...");
        await client.application.commands.set(commands);
        console.log("🚀 [SLASH] Comandos prontos para uso.");
    } catch (error) {
        console.error("❌ [SLASH ERROR]:", error);
    }
});

// Lógica simplificada para teste inicial
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'config') {
        const role = interaction.options.getRole('cargo_suporte');
        const category = interaction.options.getChannel('categoria');
        const logs = interaction.options.getChannel('logs');

        db.set(`config_${interaction.guildId}`, { 
            supportRole: role.id, 
            categoryId: category.id, 
            logsId: logs.id 
        });

        await interaction.reply({ content: `✅ Configurado!\nCargo: ${role.name}\nCategoria: ${category.name}`, ephemeral: true });
    }

    if (interaction.commandName === 'ticketchannel') {
        const titulo = interaction.options.getString('titulo');
        const desc = interaction.options.getString('descricao');

        const embed = new EmbedBuilder()
            .setTitle(titulo)
            .setDescription(desc)
            .setColor('Blue');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('abrir_geral').setLabel('Abrir Ticket').setStyle(ButtonStyle.Primary).setEmoji('📩')
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: 'Painel enviado!', ephemeral: true });
    }
});

// LOG DE TENTATIVA DE LOGIN
console.log("⏳ [AUTH] Tentando conectar ao Discord...");
if (!process.env.TOKEN) {
    console.error("❌ [AUTH] TOKEN não encontrado nas variáveis do Render!");
} else {
    console.log(`🔍 [AUTH] Token detectado (Inicia com: ${process.env.TOKEN.substring(0, 10)}...)`);
}

client.login(process.env.TOKEN).catch(err => {
    console.error("❌ [AUTH ERROR] Falha ao logar:");
    if (err.message.includes("Privileged intents")) {
        console.error("👉 ERRO: Você esqueceu de ligar as INTENTS no Developer Portal!");
    } else {
        console.error(err);
    }
});
