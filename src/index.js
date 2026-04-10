require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// Inicialização mínima para teste
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Servidor Web para o Render
const app = express();
app.get('/', (req, res) => res.send('Site do Bot Ativo!'));
app.listen(process.env.PORT || 3000, () => console.log("🟢 [WEB] Servidor Express rodando."));

console.log("⏳ [AUTH] Tentando login simples...");

client.once('ready', () => {
    console.log("✅✅✅ [LOGIN] O BOT ESTÁ ONLINE! ✅✅✅");
    console.log(`Nome: ${client.user.tag}`);
});

client.on('error', (err) => {
    console.error("❌ [ERRO DE CONEXÃO]:", err);
});

client.login(process.env.TOKEN).catch(err => {
    console.error("❌ [FALHA TOTAL NO LOGIN]:");
    console.error(err);
});
