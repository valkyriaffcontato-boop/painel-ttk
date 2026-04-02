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

// --- CONFIGURAÇÕES DA BIEL STORE (COLOQUE SEUS IDs AQUI!) ---
const ID_CARGO_SUPORTE = "1488541167443382414";    // Cargo que atende
const ID_BIEL_ADMIN = "1447297460635697202";            // Seu ID (Biel)
const CAT_COMPRAS = "1489395360257282138";     // Categoria de Vendas
const CAT_SUPORTE = "1489395552448942313";     // Categoria de Suporte
const CHAVE_PIX = "SUA_CHAVE_PIX_AQUI";         // Sua chave PIX

// --- TABELA DE PRODUTOS ---
const produtos = [
    { label: "💎 85 Diamantes", value: "d1", price: "4.50" },
    { label: "💎 285 Diamantes", value: "d2", price: "12.50" },
    { label: "💎 610 Diamantes", value: "d3", price: "25.00" },
    { label: "💎 1.240 Diamantes", value: "d4", price: "52.00" },
    { label: "💎 2.490 Diamantes", value: "d5", price: "98.00" },
    { label: "🎟️ Passe Booyah", value: "p1", price: "12.00" },
    { label: "🎟️ Passe Booyah Premium Plus", value: "p2", price: "32.00" }
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
                .setTitle('🛒 BIEL STORE - RECARGAS FF')
                .setDescription('Selecione os itens desejados no menu abaixo para iniciar a compra.\n\n' + 
                    produtos.map(p => `> **${p.label}** - \`R$ ${p.price}\``).join('\n'))
                .setColor('#facc15')
                .setThumbnail(interaction.guild.iconURL());

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_compras')
                    .setPlaceholder('🛒 Clique para comprar um produto...')
                    .addOptions(produtos.map(p => ({ label: p.label, value: p.value, description: `Valor: R$ ${p.price}` })))
            );

            return await interaction.reply({ embeds: [embed], components: [menu] });
        }

        // --- COMANDO /TICKET ---
        if (interaction.isChatInputCommand() && interaction.commandName === 'ticket') {
            const embed = new EmbedBuilder()
                .setTitle('🎫 ATENDIMENTO - BIEL STORE')
                .setDescription('Escolha uma opção abaixo:\n\n🛠️ **SUPORTE:** Dúvidas ou Erros.\n👑 **ADMIN:** Falar com o Biel.')
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
                .setTitle('🛒 NOVO PEDIDO - BIEL STORE')
                .setDescription(`Olá ${interaction.user}!\nVocê escolheu: **${item.label}**\nValor total: **R$ ${item.price}**\n\n**Como pagar:**\nUse a chave PIX abaixo:\n\`${CHAVE_PIX}\`\n\nApós pagar, envie o **Comprovante**, seu **ID** e seu **Nick** aqui no chat.`)
                .setColor('#22c55e')
                .setFooter({ text: 'Aguarde um atendente após enviar o comprovante.' });

            const btnFechar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Pedido').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: `<@&${ID_CARGO_SUPORTE}> | <@${ID_BIEL_ADMIN}> | ${interaction.user}`, embeds: [embedCompra], components: [btnFechar] });
            
            return await interaction.reply({ 
                content: `✅ Canal de compra criado: ${channel}`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // --- LÓGICA: AO SELECIONAR SUPORTE/ADMIN ---
        if (interaction.isStringSelectMenu() && interaction.customId === 'tipo_ticket') {
            const escolha = interaction.values[0];
            let mencao = `<@&${ID_CARGO_SUPORTE}>`;
            if (escolha === 'admin') mencao = `<@${ID_BIEL_ADMIN}>`;

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
                .setDescription(`Olá ${interaction.user}, descreva sua dúvida ou problema.\nEquipe ${mencao} irá te ajudar.`)
                .setColor('#3B82F6');

            const btnFechar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: `${mencao} | ${interaction.user}`, embeds: [embedSuporte], components: [btnFechar] });
            
            return await interaction.reply({ content: `✅ Ticket aberto: ${channel}`, flags: [MessageFlags.Ephemeral] });
        }

        // --- BOTÃO DE FECHAR ---
        if (interaction.isButton() && interaction.customId === 'fechar_ticket') {
            await interaction.reply('⚠️ Encerrando em 5 segundos...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }

    } catch (error) {
        console.error("Erro:", error);
    }
});

app.get('/', (req, res) => res.send('Biel Store Rodando!'));
app.listen(3000);
client.login(process.env.DISCORD_TOKEN);
