require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const express = require('express');
const fs = require('fs');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Conexão MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ MongoDB Conectado"));

// Servidor Express (Para o Render não derrubar o bot e para o futuro site)
const app = express();
app.get('/', (req, res) => res.send('Bot Online!'));
app.listen(process.env.PORT || 3000);

client.commands = new Collection();
const commands = [];

// Carregar Comandos
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

// Registro de Slash Commands
client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log(`🚀 ${client.user.tag} está online!`);
});

// Handler de Interações (Botões e Comandos)
const interactionHandler = require('./events/interactionCreate');
client.on('interactionCreate', (interaction) => interactionHandler(interaction, client));

client.login(process.env.TOKEN);
