const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const express = require('express');
require('dotenv').config();

// --- SERVIDOR WEB PARA O RENDER NÃO DESLIGAR ---
const app = express();
app.get('/', (req, res) => res.send('Bot Online!'));
app.listen(process.env.PORT || 3000, () => console.log('Porta aberta para o Render.'));

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// --- IDs DA SUA LOJA (Troque pelos seus!) ---
const CATEGORIA_TICKETS = "ID_DA_CATEGORIA"; 
const CARGO_SUPORTE = "ID_DO_CARGO_ADM"; 

const PRODUTOS = [
    { label: "🎟️ Passe Booyah", value: "passe", price: "R$ 6,00", desc: "Entrega rápida" },
    { label: "💎 120 Diamantes", value: "d120", price: "R$ 4,49", desc: "Via ID" },
    { label: "💎 310 Diamantes", value: "d310", price: "R$ 13,99", desc: "Via ID" }
];

const commands = [
    new SlashCommandBuilder().setName('tabela').setDescription('Ver preços de Dimas e Passes'),
    new SlashCommandBuilder().setName('setup').setDescription('Botão de ticket de vendas'),
].map(c => c.toJSON());

client.on('ready', async () => {
    console.log(`🔥 Loja FF no Render: ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('interactionCreate', async interaction => {
    if (interaction.commandName === 'tabela') {
        const embed = new EmbedBuilder()
            .setTitle("🔥 LOJA FF - PREÇOS 🔥")
            .setDescription("Selecione o produto desejado abaixo:")
            .setColor("#FF4500");
        
        PRODUTOS.forEach(p => embed.addFields({ name: p.label, value: `💰 ${p.price}`, inline: true }));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('comprar').setLabel('🛒 COMPRAR').setStyle(ButtonStyle.Success)
        );
        await interaction.reply({ embeds: [embed], components: [row] });
    }

    if (interaction.isButton() && interaction.customId === 'comprar') {
        const menu = new StringSelectMenuBuilder()
            .setCustomId('menu_p')
            .setPlaceholder('Selecione o item...')
            .addOptions(PRODUTOS.map(p => ({ label: p.label, description: p.price, value: p.value })));
        await interaction.reply({ content: "Escolha o que deseja:", components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_p') {
        const item = PRODUTOS.find(p => p.value === interaction.values[0]);
        const canal = await interaction.guild.channels.create({
            name: `🛒-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: CATEGORIA_TICKETS,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: CARGO_SUPORTE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        await canal.send(`🔥 **Novo Pedido:** ${item.label}\n💵 **Valor:** ${item.price}\n👤 **Cliente:** ${interaction.user}`);
        await interaction.update({ content: `✅ Ticket aberto: ${canal}`, components: [], ephemeral: true });
    }
});

client.login(process.env.TOKEN);
