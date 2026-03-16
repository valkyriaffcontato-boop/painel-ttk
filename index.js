const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const users = require('./users.json');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const SB_URL = process.env.SB_URL;
const SB_KEY = process.env.SB_KEY;
const sb = createClient(SB_URL, SB_KEY);

// ROTA DE LOGIN
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    if (users[user] && users[user].pass === pass) {
        res.json({ success: true, cargo: users[user].cargo });
    } else {
        res.status(401).json({ success: false });
    }
});

// INICIAR SITE
app.listen(process.env.PORT || 3000, () => console.log("🌐 Site ON"));

// BOT DISCORD
const client = new Client({ intents: [32767] });
client.once('ready', () => {
    console.log(`✅ Bot ${client.user.tag} ON`);
    // Lógica de ranking fixa a cada 1 min aqui...
});
client.login(process.env.DISCORD_TOKEN);
