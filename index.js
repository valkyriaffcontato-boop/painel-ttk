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

// --- TABELA DE PREÇOS (Lucrativa e Barata) ---
// Baseado nos seus prints de R$ 3,00 / R$ 4,49 / R$ 13,99 etc.
const produtos = [
    { label: "💎 85 Diamantes", value: "p1", price: "4.20", description: "Custo: R$ 3,00 | Lucro: R$ 1,20" },
    { label: "💎 120 Diamantes", value: "p2", price: "6.00", description: "Custo: R$ 4,49 | Lucro: R$ 1,51" },
    { label: "💎 372 Diamantes", value: "p3", price: "17.00", description: "Custo: R$ 13,99 | Lucro: R$ 3,01" },
    { label: "💎 624 Diamantes", value: "p4", price: "25.00", description: "Custo: R$ 20,99 | Lucro: R$ 4,01" },
    { label: "💎 1.272 Diamantes", value: "p5", price: "52.00", description: "Custo: R$ 44,99 | Lucro: R$ 7,01" },
    { label: "💎 2.616 Diamantes", value: "p6", price: "98.00", description: "Custo: R$ 87,99 | Lucro: R$ 10,01" },
    { label: "📦 Assinatura Semanal", value: "p7", price: "13.00", description: "Custo: R$ 10,15 | Muito vendido!" },
    { label: "📅 Assinatura Mensal", price: "45.00", value: "p8", description: "Custo: R$ 27,24 | Alto Lucro!" }
];

client.on('ready', async () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
    
    // Registra os comandos no Discord
    const commands = [
        { name: 'setup', description: 'Configura a vitrine de vendas' },
        { name: 'tabela', description: 'Mostra apenas a tabela de preços' },
        { name: 'ticket', description: 'Envia o sistema de suporte/compras' }
    ];
    await client.application.commands.set(commands);
});

client.on('interactionCreate', async (interaction) => {
    
    // --- COMANDOS SLASH ---
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'setup' || commandName === 'tabela') {
            const embed = new EmbedBuilder()
                .setTitle('💎 TABELA DE RECARGAS - VALKYRIA FF')
                .setDescription('Selecione o pacote desejado abaixo para comprar via PIX.\n\n' + 
                    produtos.map(p => `> **${p.label}** - \`R$ ${p.price}\``).join('\n'))
                .setColor('#EAB308')
                .setThumbnail(interaction.guild.iconURL())
                .setFooter({ text: 'Entrega imediata após confirmação do PIX' });

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selecionar_produto')
                    .setPlaceholder('🛒 Escolha os diamantes que deseja...')
                    .addOptions(produtos.map(p => ({ label: p.label, value: p.value, description: `Apenas R$ ${p.price}` })))
            );

            await interaction.reply({ embeds: [embed], components: [menu] });
        }

        if (commandName === 'ticket') {
            const embed = new EmbedBuilder()
                .setTitle('🎫 CENTRAL DE ATENDIMENTO')
                .setDescription('Clique no botão abaixo para abrir um ticket de:\n\n' +
                    '❌ **Erro na Recarga**\n' +
                    '💰 **Dúvidas sobre Compras**\n' +
                    '📞 **Falar com Suporte**')
                .setColor('#3B82F6');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_ticket').setLabel('Abrir Ticket').setEmoji('📩').setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        }
    }

    // --- LÓGICA DO MENU DE COMPRAS ---
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'selecionar_produto') {
            const item = produtos.find(p => p.value === interaction.values[0]);
            
            await interaction.reply({ 
                content: `✅ **Você selecionou ${item.label}!**\nPreço: **R$ ${item.price}**\n\nAbra um **Ticket** de suporte para receber a chave PIX e enviar o comprovante.`, 
                ephemeral: true 
            });
        }
    }

    // --- LÓGICA DE ABRIR TICKET ---
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_ticket') {
            const nomeCanal = `ticket-${interaction.user.username}`.toLowerCase();
            
            // Criar canal de ticket
            const channel = await interaction.guild.channels.create({
                name: nomeCanal,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                ],
            });

            const embedTicket = new EmbedBuilder()
                .setTitle('👋 Atendimento Valkyria FF')
                .setDescription(`Olá ${interaction.user}, explique o seu problema ou envie o comprovante da compra.\n\n**Aguarde um atendente.**`)
                .setColor('#22C55E');

            const btnFechar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar_canal').setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ embeds: [embedTicket], components: [btnFechar] });
            await interaction.reply({ content: `✅ Ticket aberto: ${channel}`, ephemeral: true });
        }

        if (interaction.customId === 'fechar_canal') {
            await interaction.reply('⚠️ Este ticket será excluído em 5 segundos...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }
    }
});

// Servidor Web para o Render não dar erro
app.get('/', (req, res) => res.send('Bot Online!'));
app.listen(3000, () => console.log('Servidor HTTP rodando na porta 3000'));

client.login(process.env.DISCORD_TOKEN);
