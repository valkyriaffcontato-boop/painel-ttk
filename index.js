const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits,
    MessageFlags 
} = require('discord.js');
require('dotenv').config();
const express = require('express');

const app = express();
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// --- CONFIGURAÇÕES DA BIEL STORE (PREENCHA OS IDs!) ---
const ID_CARGO_SUPORTE = "1488541167443382414";  
const ID_BIEL_ADMIN = "1447297460635697202";      
const CAT_COMPRAS = "1489395360257282138";   
const CAT_SUPORTE = "1489395552448942313";   
const CHAVE_PIX_MANUAL = "eb3c66aa-c6f7-454c-833d-b6e66a2a7261

    "; // Chave para o cliente ver no ticket
const WHATSAPP_LINK = "https://wa.me/5533991160044"; // Seu link do zap

// --- TABELA DE PREÇOS ATUALIZADA ---
const produtos = [
    { label: "💎 110 Diamantes", value: "v1", price: "5.50" },
    { label: "💎 341 Diamantes", value: "v2", price: "16.00" },
    { label: "💎 572 Diamantes 🔥", value: "v3", price: "24.00" },
    { label: "💎 1.166 Diamantes", value: "v4", price: "50.00" },
    { label: "💎 2.398 Diamantes", value: "v5", price: "95.00" },
    { label: "💎 6.160 Diamantes", value: "v6", price: "230.00" },
    { label: "💎 24.640 Diamantes", value: "v7", price: "899.00" }
];

client.on('ready', async () => {
    console.log(`✅ BIEL STORE ONLINE: ${client.user.tag}`);
    const commands = [
        { name: 'setup', description: 'Mostra a vitrine de produtos' },
        { name: 'ticket', description: 'Abre a central de atendimento' }
    ];
    await client.application.commands.set(commands).catch(console.error);
});

client.on('interactionCreate', async (interaction) => {
    try {
        // --- COMANDO /SETUP ---
        if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
            const embed = new EmbedBuilder()
                .setTitle('💎 BIEL STORE - DIAMANTES FREE FIRE')
                .setDescription('✅ Entrega imediata via PIN Garena\n✅ Suporte rápido\n\n' + 
                    produtos.map(p => `> **${p.label}** ➔ \`R$ ${p.price}\``).join('\n'))
                .setColor('#EAB308') // Amarelo Ouro
                .setThumbnail(interaction.guild.iconURL())
                .setFooter({ text: 'Selecione abaixo para comprar seu pacote!' });

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_compras')
                    .setPlaceholder('🛒 Escolha seus diamantes aqui...')
                    .addOptions(produtos.map(p => ({ label: p.label, value: p.value, description: `Valor: R$ ${p.price}` })))
            );

            return await interaction.reply({ embeds: [embed], components: [menu] });
        }

        // --- COMANDO /TICKET ---
        if (interaction.isChatInputCommand() && interaction.commandName === 'ticket') {
            const embed = new EmbedBuilder()
                .setTitle('🎫 ATENDIMENTO - BIEL STORE')
                .setDescription('Precisa de ajuda?\n\n🛠️ **SUPORTE:** Dúvidas ou Erros.\n👑 **ADMIN:** Falar com o Biel.')
                .setColor('#3B82F6');

            const menuTicket = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('tipo_ticket')
                    .setPlaceholder('Selecione o motivo...')
                    .addOptions([
                        { label: 'Suporte Técnico', value: 'suporte', emoji: '🛠️' },
                        { label: 'Falar com o Biel', value: 'admin', emoji: '👑' }
                    ])
            );

            return await interaction.reply({ embeds: [embed], components: [menuTicket] });
        }

        // --- LÓGICA: AO SELECIONAR UM PRODUTO (CRIA CANAL DE COMPRA) ---
        if (interaction.isStringSelectMenu() && interaction.customId === 'menu_compras') {
            const item = produtos.find(x => x.value === interaction.values[0]);

            const channel = await interaction.guild.channels.create({
                name: `🛒-${interaction.user.username}`,
                parent: CAT_COMPRAS,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: ID_CARGO_SUPORTE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            const embedCompra = new EmbedBuilder()
                .setTitle('🛒 PEDIDO INICIADO - BIEL STORE')
                .setDescription(`Olá ${interaction.user}!\n\n` +
                    `📦 Produto: **${item.label}**\n` +
                    `💰 Valor: **R$ ${item.price}**\n\n` +
                    `**PARA FINALIZAR:**\n` +
                    `1. Realize o pagamento na chave PIX:\n\`${CHAVE_PIX_MANUAL}\`\n` +
                    `2. Envie o **Comprovante** aqui.\n` +
                    `3. Mande seu **ID** e **Nick** do jogo.\n\n` +
                    `📢 *Suporte rápido no WhatsApp:* [Clique Aqui](${WHATSAPP_LINK})`)
                .setColor('#22C55E')
                .setThumbnail('https://i.imgur.com/8N8K1k6.png'); // Imagem de dima

            const btnFechar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: `<@&${ID_CARGO_SUPORTE}> | <@${ID_BIEL_ADMIN}> | ${interaction.user}`, embeds: [embedCompra], components: [btnFechar] });
            
            return await interaction.reply({ 
                content: `✅ Canal de compra criado: ${channel}`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // --- LÓGICA: SUPORTE ---
        if (interaction.isStringSelectMenu() && interaction.customId === 'tipo_ticket') {
            const escolha = interaction.values[0];
            const channel = await interaction.guild.channels.create({
                name: `🛠️-${interaction.user.username}`,
                parent: CAT_SUPORTE,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: ID_CARGO_SUPORTE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            const embedSuporte = new EmbedBuilder()
                .setTitle('🛠️ ATENDIMENTO - BIEL STORE')
                .setDescription(`Olá ${interaction.user}, como podemos te ajudar?`)
                .setColor('#3B82F6');

            await channel.send({ content: `<@&${ID_CARGO_SUPORTE}>`, embeds: [embedSuporte], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar').setStyle(ButtonStyle.Danger))] });
            return await interaction.reply({ content: `✅ Ticket aberto: ${channel}`, flags: [MessageFlags.Ephemeral] });
        }

        // --- BOTÃO FECHAR ---
        if (interaction.isButton() && interaction.customId === 'fechar_ticket') {
            await interaction.reply('⚠️ Encerrando em 5 segundos...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }

    } catch (error) {
        console.error(error);
    }
});

app.get('/', (req, res) => res.send('Biel Store Online!'));
app.listen(3000);
client.login(process.env.DISCORD_TOKEN);
