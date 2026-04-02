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

// --- CONFIGURAÇÕES DE IDs (COLOQUE OS SEUS IDs AQUI) ---
const ID_CARGO_SUPORTE = "1482212414211756154"; // ID do cargo que atende o suporte
const ID_RICK_ADMIN = "1482212414211756154";   // Seu ID de usuário (Rick)
const ID_CATEGORIA_TICKETS = "1489329885385326725"; // Opcional: ID da categoria onde os tickets serão criados

// --- TABELA DE PREÇOS ---
const produtos = [
    { label: "💎 85 Diamantes", value: "p1", price: "3.50" },
    { label: "💎 120 Diamantes", value: "p2", price: "t.50" },
    { label: "💎 372 Diamantes", value: "p3", price: "14.50" },
    { label: "💎 624 Diamantes", value: "p4", price: "25.00" },
    { label: "📦 Passe Elite", value: "p6", price: "11.50" },
    { label: "📦 Passe elite pass, value: "p7", price: "28.00" }
];

client.on('ready', async () => {
    console.log(`✅ LOGADO COMO: ${client.user.tag}`);
    const commands = [
        { name: 'setup', description: 'Configura a vitrine de vendas' },
        { name: 'ticket', description: 'Envia o sistema de atendimento' }
    ];
    await client.application.commands.set(commands);
});

client.on('interactionCreate', async (interaction) => {
    
    // --- COMANDO SETUP / TABELA ---
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
        const embed = new EmbedBuilder()
            .setTitle('💎 LOJA VALKYRIA - TABELA DE PREÇOS')
            .setDescription('Confira nossos valores e selecione o que deseja comprar.\n\n' + 
                produtos.map(p => `> **${p.label}** - \`R$ ${p.price}\``).join('\n'))
            .setColor('#facc15');

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_compras')
                .setPlaceholder('🛒 Clique aqui para escolher um pacote...')
                .addOptions(produtos.map(p => ({ label: p.label, value: p.value, description: `R$ ${p.price}` })))
        );

        await interaction.reply({ embeds: [embed], components: [menu] });
    }

    // --- COMANDO TICKET (COM MENU DE ESCOLHA) ---
    if (interaction.isChatInputCommand() && interaction.commandName === 'ticket') {
        const embed = new EmbedBuilder()
            .setTitle('🎫 CENTRAL DE ATENDIMENTO')
            .setDescription('Como podemos te ajudar hoje?\n\n' +
                '💰 **COMPRAS:** Para finalizar um pedido e enviar comprovante.\n' +
                '🛠️ **SUPORTE:** Para dúvidas, erros ou problemas técnicos.')
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

        await interaction.reply({ embeds: [embed], components: [menuTicket] });
    }

    // --- LÓGICA DE CRIAÇÃO DO TICKET ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'selecionar_tipo_ticket') {
        const tipo = interaction.values[0];
        let nomeCanal = "";
        let corEmbed = "";
        let mencao = "";

        if (tipo === 'ticket_compra') {
            nomeCanal = `💰-compra-${interaction.user.username}`;
            corEmbed = "#22c55e";
            mencao = `<@&${ID_CARGO_SUPORTE}>`;
        } else if (tipo === 'ticket_suporte') {
            nomeCanal = `🛠️-suporte-${interaction.user.username}`;
            corEmbed = "#3b82f6";
            mencao = `<@&${ID_CARGO_SUPORTE}>`;
        } else {
            nomeCanal = `👑-admin-${interaction.user.username}`;
            corEmbed = "#a855f7";
            mencao = `<@${ID_RICK_ADMIN}>`; // Marca você (Rick) diretamente
        }

        const channel = await interaction.guild.channels.create({
            name: nomeCanal,
            parent: ID_CATEGORIA_TICKETS || null,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: ID_CARGO_SUPORTE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        const embedTicket = new EmbedBuilder()
            .setTitle(`Atendimento: ${interaction.user.username}`)
            .setDescription(`Olá! Você abriu um ticket de **${tipo.replace('ticket_', '').toUpperCase()}**.\n\n` +
                `Aguarde, ${mencao} irá te atender em breve.\n` +
                `Já pode adiantar o assunto ou enviar o print do seu erro/pagamento.`)
            .setColor(corEmbed);

        const btnFechar = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `${mencao} | ${interaction.user}`, embeds: [embedTicket], components: [btnFechar] });
        await interaction.reply({ content: `✅ Seu ticket foi aberto em ${channel}`, ephemeral: true });
    }

    // --- BOTÃO DE FECHAR TICKET ---
    if (interaction.isButton() && interaction.customId === 'fechar_ticket') {
        await interaction.reply('⚠️ O ticket será encerrado e deletado em 5 segundos...');
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
});

app.get('/', (req, res) => res.send('Bot da Loja Online!'));
app.listen(3000);
client.login(process.env.DISCORD_TOKEN);
