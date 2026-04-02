const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits 
} = require('discord.js');
require('dotenv').config();
const express = require('express');

const app = express();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

// --- TABELA DE PREÇOS (Otimizada para seu lucro) ---
const produtos = [
    { label: "💎 85 Diamantes", value: "p1", price: "4.50", description: "O mais barato!" },
    { label: "💎 120 Diamantes", value: "p2", price: "6.50", description: "Recarga rápida" },
    { label: "💎 372 Diamantes", value: "p3", price: "17.50", description: "Melhor custo" },
    { label: "💎 624 Diamantes", value: "p4", price: "26.00", description: "Mais vendido" },
    { label: "💎 1.272 Diamantes", value: "p5", price: "53.00", description: "Recarga Grande" },
    { label: "📦 Assinatura Semanal", value: "p6", price: "13.50", description: "Vantagem Diária" },
    { label: "📅 Assinatura Mensal", value: "p7", price: "46.00", description: "Economia máxima" }
];

client.on('ready', async () => {
    console.log(`✅ BOT CONECTADO: ${client.user.tag}`);
    
    const commands = [
        { name: 'setup', description: 'Configura a vitrine de vendas' },
        { name: 'tabela', description: 'Mostra apenas a tabela de preços' },
        { name: 'ticket', description: 'Envia o sistema de suporte/compras' }
    ];

    try {
        await client.application.commands.set(commands);
        console.log('✅ Comandos Slash registrados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        // --- COMANDOS SLASH ---
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'setup' || interaction.commandName === 'tabela') {
                const embed = new EmbedBuilder()
                    .setTitle('💎 TABELA DE RECARGAS - VALKYRIA FF')
                    .setDescription('Escolha seus diamantes no menu abaixo.\n\n' + 
                        produtos.map(p => `> **${p.label}** - \`R$ ${p.price}\``).join('\n'))
                    .setColor('#facc15');

                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('menu_compras')
                        .setPlaceholder('🛒 Clique aqui para escolher...')
                        .addOptions(produtos.map(p => ({ label: p.label, value: p.value, description: `R$ ${p.price}` })))
                );

                return await interaction.reply({ embeds: [embed], components: [menu] });
            }

            if (interaction.commandName === 'ticket') {
                const embed = new EmbedBuilder()
                    .setTitle('🎫 CENTRAL DE ATENDIMENTO')
                    .setDescription('Clique no botão abaixo para abrir um ticket de suporte ou compra.')
                    .setColor('#3B82F6');

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Ticket').setEmoji('📩').setStyle(ButtonStyle.Primary)
                );

                return await interaction.reply({ embeds: [embed], components: [row] });
            }
        }

        // --- MENU DE SELEÇÃO ---
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'menu_compras') {
                const selecionado = produtos.find(p => p.value === interaction.values[0]);
                return await interaction.reply({ 
                    content: `✅ **${selecionado.label}** selecionado!\nValor: **R$ ${selecionado.price}**\n\nAbra um ticket para pagar via PIX.`, 
                    ephemeral: true 
                });
            }
        }

        // --- BOTÕES DE TICKET ---
        if (interaction.isButton()) {
            if (interaction.customId === 'abrir_ticket') {
                // Criar o canal
                const channel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    ],
                });

                const embedWelcome = new EmbedBuilder()
                    .setTitle('👋 Olá! Como podemos ajudar?')
                    .setDescription(`Bem-vindo ao seu ticket, ${interaction.user}!\nEnvie o comprovante ou sua dúvida aqui.\n\nPara fechar, use o botão abaixo.`)
                    .setColor('#22c55e');

                const btnFechar = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
                );

                await channel.send({ embeds: [embedWelcome], components: [btnFechar] });
                return await interaction.reply({ content: `✅ Ticket criado em ${channel}`, ephemeral: true });
            }

            if (interaction.customId === 'fechar_ticket') {
                await interaction.reply('⚠️ Excluindo canal em 5 segundos...');
                setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
            }
        }

    } catch (err) {
        console.error('❌ ERRO NA INTERAÇÃO:', err);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Houve um erro ao processar essa ação!', ephemeral: true }).catch(() => {});
        } else {
            await interaction.reply({ content: 'Houve um erro ao processar essa ação!', ephemeral: true }).catch(() => {});
        }
    }
});

// Servidor obrigatório para o Render
app.get('/', (req, res) => res.send('Bot da Loja Online!'));
app.listen(3000, () => console.log('🌐 Servidor Web Rodando'));

client.login(process.env.DISCORD_TOKEN);
