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

// --- CONFIGURAÇÕES DA BIEL STORE (COLOQUE OS IDs AQUI!) ---
const ID_CARGO_SUPORTE = "1482212414211756154";    // Cargo que atende
const ID_BIEL_ADMIN = "1447297460635697202";            // Seu ID de usuário (Biel)
const CAT_COMPRAS = "1489329885385326725";     // ID da categoria para Vendas
const CAT_SUPORTE = "1489392329730297966";     // ID da categoria para Suporte

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
        // --- COMANDO /SETUP (VITRINE) ---
        if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
            const embed = new EmbedBuilder()
                .setTitle('🛒 BIEL STORE - RECARGAS FF')
                .setDescription('Selecione os itens desejados no menu abaixo.\n\n' + 
                    produtos.map(p => `> **${p.label}** - \`R$ ${p.price}\``).join('\n'))
                .setColor('#facc15')
                .setThumbnail(interaction.guild.iconURL());

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_compras')
                    .setPlaceholder('🛒 Clique para escolher um produto...')
                    .addOptions(produtos.map(p => ({ label: p.label, value: p.value, description: `Valor: R$ ${p.price}` })))
            );

            return await interaction.reply({ embeds: [embed], components: [menu] });
        }

        // --- COMANDO /TICKET (ATENDIMENTO) ---
        if (interaction.isChatInputCommand() && interaction.commandName === 'ticket') {
            const embed = new EmbedBuilder()
                .setTitle('🎫 CENTRAL DE ATENDIMENTO - BIEL STORE')
                .setDescription('Como podemos te ajudar hoje?\n\n💰 **COMPRAS:** Finalizar pedido e enviar PIX.\n🛠️ **SUPORTE:** Dúvidas, Erros ou Reclamações.\n👑 **BIEL:** Falar diretamente com o dono.')
                .setColor('#3B82F6');

            const menuTicket = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('tipo_ticket')
                    .setPlaceholder('Selecione o motivo do contato...')
                    .addOptions([
                        { label: 'Finalizar Compra / Enviar PIX', value: 'compras', emoji: '💰' },
                        { label: 'Suporte Técnico / Erros', value: 'suporte', emoji: '🛠️' },
                        { label: 'Falar com o Biel (Dono)', value: 'admin', emoji: '👑' }
                    ])
            );

            return await interaction.reply({ embeds: [embed], components: [menuTicket] });
        }

        // --- LÓGICA DE CRIAÇÃO DO TICKET POR CATEGORIA ---
        if (interaction.isStringSelectMenu() && interaction.customId === 'tipo_ticket') {
            const escolha = interaction.values[0];
            let categoriaFinal = CAT_SUPORTE; // Padrão
            let mencao = `<@&${ID_CARGO_SUPORTE}>`;
            let prefixo = "🛠️-";

            if (escolha === 'compras') {
                categoriaFinal = CAT_COMPRAS;
                prefixo = "💰-";
            } else if (escolha === 'admin') {
                mencao = `<@${ID_BIEL_ADMIN}>`;
                prefixo = "👑-";
            }

            const channel = await interaction.guild.channels.create({
                name: `${prefixo}${interaction.user.username}`,
                parent: categoriaFinal, // Coloca na categoria certa!
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: ID_CARGO_SUPORTE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            const embedTicket = new EmbedBuilder()
                .setTitle(`Atendimento Biel Store`)
                .setDescription(`Olá ${interaction.user}! Você iniciou um atendimento de **${escolha.toUpperCase()}**.\n\nAguarde um instante, ${mencao} irá te responder.\n\n**Dica:** Já envie o ID do jogo e o comprovante se for compra!`)
                .setColor('#22c55e');

            const btnFechar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: `${mencao} | ${interaction.user}`, embeds: [embedTicket], components: [btnFechar] });
            
            return await interaction.reply({ 
                content: `✅ Seu ticket foi aberto em ${channel}`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // --- SELEÇÃO DE PRODUTO ---
        if (interaction.isStringSelectMenu() && interaction.customId === 'menu_compras') {
            const item = produtos.find(x => x.value === interaction.values[0]);
            return await interaction.reply({ 
                content: `✅ Você escolheu **${item.label}** por **R$ ${item.price}**.\nAbra um **Ticket de Compra** para pagar e receber!`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // --- BOTÃO DE FECHAR TICKET ---
        if (interaction.isButton() && interaction.customId === 'fechar_ticket') {
            await interaction.reply('⚠️ Encerrando atendimento em 5 segundos...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }

    } catch (error) {
        console.error("Erro:", error);
    }
});

app.get('/', (req, res) => res.send('Biel Store Online!'));
app.listen(3000);
client.login(process.env.DISCORD_TOKEN);
