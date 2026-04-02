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

// --- IDs (COLOQUE OS SEUS IDs AQUI!) ---
const ID_CARGO_SUPORTE = "1489329885385326725"; // ID do cargo que atende
const ID_RICK_ADMIN = "1447297460635697202";   // Seu ID de usuário

// --- TABELA DE PRODUTOS (Diamantes e Passes) ---
// Preços sugeridos para lucro com banca de R$ 200
const produtos = [
    { label: "💎 85 Diamantes", value: "d1", price: "4.50", description: "Custo: R$ 3,00" },
    { label: "💎 285 Diamantes", value: "d2", price: "12.50", description: "Custo: R$ 10,00" },
    { label: "💎 610 Diamantes", value: "d3", price: "25.00", description: "Custo: R$ 21,00" },
    { label: "💎 1.240 Diamantes", value: "d4", price: "52.00", description: "Custo: R$ 45,00" },
    { label: "💎 2.490 Diamantes", value: "d5", price: "98.00", description: "Custo: R$ 88,00" },
    { label: "🎟️ Passe Booyah", value: "p1", price: "12.00", description: "Passe Simples" },
    { label: "🎟️ Passe Booyah Premium Plus", value: "p2", price: "32.00", description: "Passe Completo + Níveis" }
];

client.on('ready', async () => {
    console.log(`✅ BOT ONLINE: ${client.user.tag}`);
    const commands = [
        { name: 'setup', description: 'Configura a vitrine de vendas' },
        { name: 'ticket', description: 'Envia o sistema de atendimento' }
    ];
    await client.application.commands.set(commands).catch(console.error);
});

client.on('interactionCreate', async (interaction) => {
    try {
        // --- COMANDO SETUP (VITRINE) ---
        if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
            const embed = new EmbedBuilder()
                .setTitle('💎 VALKYRIA STORE - TABELA DE PREÇOS')
                .setDescription('Selecione os diamantes ou o passe desejado abaixo.\n\n' + 
                    produtos.map(p => `> **${p.label}** - \`R$ ${p.price}\``).join('\n'))
                .setColor('#facc15')
                .setThumbnail(interaction.guild.iconURL());

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_compras')
                    .setPlaceholder('🛒 Clique aqui para comprar...')
                    .addOptions(produtos.map(p => ({ label: p.label, value: p.value, description: `R$ ${p.price}` })))
            );

            return await interaction.reply({ embeds: [embed], components: [menu] });
        }

        // --- COMANDO TICKET (SUPORTE) ---
        if (interaction.isChatInputCommand() && interaction.commandName === 'ticket') {
            const embed = new EmbedBuilder()
                .setTitle('🎫 CENTRAL DE ATENDIMENTO')
                .setDescription('Como podemos te ajudar hoje?\n\n💰 **COMPRAS:** Finalizar pedido.\n🛠️ **SUPORTE:** Dúvidas e Erros.\n👑 **RICK:** Falar com o Dono.')
                .setColor('#3B82F6');

            const menuTicket = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selecionar_tipo_ticket')
                    .setPlaceholder('Selecione o motivo do contato...')
                    .addOptions([
                        { label: 'Finalizar Compra / Enviar PIX', value: 'ticket_compra', emoji: '💰' },
                        { label: 'Suporte Técnico / Erros', value: 'ticket_suporte', emoji: '🛠️' },
                        { label: 'Falar com o Rick (Admin)', value: 'ticket_admin', emoji: '👑' }
                    ])
            );

            return await interaction.reply({ embeds: [embed], components: [menuTicket] });
        }

        // --- LÓGICA DE ABRIR TICKET ---
        if (interaction.isStringSelectMenu() && interaction.customId === 'selecionar_tipo_ticket') {
            const tipo = interaction.values[0];
            let mencao = `<@&${ID_CARGO_SUPORTE}>`;
            if (tipo === 'ticket_admin') mencao = `<@${ID_RICK_ADMIN}>`;

            const channel = await interaction.guild.channels.create({
                name: `${tipo.replace('ticket_', '')}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: ID_CARGO_SUPORTE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            const embedTicket = new EmbedBuilder()
                .setTitle(`Atendimento Valkyria`)
                .setDescription(`Olá ${interaction.user}! Aguarde, ${mencao} irá te atender.\n\n**Se for compra:** Envie o Nick, ID e o comprovante.\n**Se for suporte:** Descreva o erro.`)
                .setColor('#22c55e');

            const btnFechar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: `${mencao} | ${interaction.user}`, embeds: [embedTicket], components: [btnFechar] });
            
            return await interaction.reply({ 
                content: `✅ Ticket aberto: ${channel}`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // --- SELEÇÃO DE PRODUTO NO MENU ---
        if (interaction.isStringSelectMenu() && interaction.customId === 'menu_compras') {
            const p = produtos.find(x => x.value === interaction.values[0]);
            return await interaction.reply({ 
                content: `✅ Você escolheu: **${p.label}**\n💰 Valor: **R$ ${p.price}**\n\nAbra um **Ticket de Compra** para receber a chave PIX!`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // --- FECHAR TICKET ---
        if (interaction.isButton() && interaction.customId === 'fechar_ticket') {
            await interaction.reply('⚠️ Fechando em 5 segundos...');
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        }

    } catch (error) {
        console.error("Erro na interação:", error);
    }
});

app.get('/', (req, res) => res.send('Valkyria Store Online!'));
app.listen(3000);
client.login(process.env.DISCORD_TOKEN);
