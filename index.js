const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits 
} = require('discord.js');
require('dotenv').config();
const express = require('express');

const app = express();
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// --- CONFIGURAÇÃO DE PREÇOS (Lucrativos para R$ 200 de banca) ---
const produtos = [
    { label: "💎 85 Diamantes", value: "p1", price: "4.50", desc: "Custo aprox: R$ 3.80" },
    { label: "💎 285 Diamantes", value: "p2", price: "12.00", desc: "Custo aprox: R$ 10.50" },
    { label: "💎 610 Diamantes", value: "p3", price: "24.00", desc: "Custo aprox: R$ 20.99" },
    { label: "💎 1240 Diamantes", value: "p4", price: "48.00", desc: "Custo aprox: R$ 44.00" },
    { label: "💎 2490 Diamantes", value: "p5", price: "95.00", desc: "Custo aprox: R$ 87.00" },
    { label: "📦 Assinatura Semanal", value: "p6", price: "11.00", desc: "Vantagem acumulativa" },
    { label: "📅 Assinatura Mensal", value: "p7", price: "42.00", desc: "Melhor custo-benefício" }
];

// --- COMANDOS ---
client.on('ready', async () => {
    console.log(`✅ Bot logado como ${client.user.tag}`);
    
    // Registro dos comandos Slash
    const commands = [
        { name: 'setup', description: 'Configura o canal de vendas' },
        { name: 'tabela', description: 'Mostra a tabela de preços' },
        { name: 'ticket', description: 'Envia a mensagem de suporte/compras' }
    ];
    await client.application.commands.set(commands);
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        
        if (interaction.commandName === 'setup' || interaction.commandName === 'tabela') {
            const embed = new EmbedBuilder()
                .setTitle('💎 TABELA DE PREÇOS - LOJA FF')
                .setDescription('Selecione o produto que deseja comprar no menu abaixo.\n\n' + 
                    produtos.map(p => `**${p.label}** - R$ ${p.price}`).join('\n'))
                .setColor('#facc15')
                .setImage('https://i.imgur.com/8N8K1k6.png'); // Imagem decorativa

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_compras')
                    .setPlaceholder('Escolha seus diamantes...')
                    .addOptions(produtos)
            );

            await interaction.reply({ embeds: [embed], components: [menu] });
        }

        if (interaction.commandName === 'ticket') {
            const embed = new EmbedBuilder()
                .setTitle('🎫 Central de Atendimento')
                .setDescription('Precisa de ajuda ou quer finalizar uma compra personalizada?\nClique no botão abaixo para abrir um ticket.')
                .setColor('#2b2d31');

            const btn = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('abrir_ticket')
                    .setLabel('Abrir Ticket')
                    .setEmoji('📩')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({ embeds: [embed], components: [btn] });
        }
    }

    // --- LÓGICA DO TICKET ---
    if (interaction.isButton()) {
        if (interaction.customId === 'abrir_ticket') {
            const channel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            const embedTicket = new EmbedBuilder()
                .setTitle('Atendimento Iniciado')
                .setDescription(`Olá ${interaction.user}, aguarde um atendente.\nPara fechar este ticket, clique no botão abaixo.`)
                .setColor('Green');

            const btnFechar = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('fechar_ticket')
                    .setLabel('Fechar Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({ embeds: [embedTicket], components: [btnFechar] });
            await interaction.reply({ content: `Ticket aberto em ${channel}`, ephemeral: true });
        }

        if (interaction.customId === 'fechar_ticket') {
            await interaction.reply('O ticket será fechado em 5 segundos...');
            setTimeout(() => interaction.channel.delete(), 5000);
        }
    }

    // --- LÓGICA DA COMPRA ---
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'menu_compras') {
            const selecionado = produtos.find(p => p.value === interaction.values[0]);
            
            await interaction.reply({ 
                content: `✅ Você escolheu **${selecionado.label}** por **R$ ${selecionado.price}**.\nEnvie o comprovante no ticket de compra!`, 
                ephemeral: true 
            });
            
            // Aqui você poderia criar um ticket de compra automaticamente se quisesse
        }
    }
});

// Manter o servidor online
app.get('/', (req, res) => res.send('Bot Online!'));
app.listen(3000);

client.login(process.env.DISCORD_TOKEN);        await canal.send(`🔥 **Novo Pedido:** ${item.label}\n💵 **Valor:** ${item.price}\n👤 **Cliente:** ${interaction.user}`);
        await interaction.update({ content: `✅ Ticket aberto: ${canal}`, components: [], ephemeral: true });
    }
});

client.login(process.env.TOKEN);
