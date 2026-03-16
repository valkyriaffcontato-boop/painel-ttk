const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, REST, Routes } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const cors = require('cors');
const users = require('./users.json');

// --- INICIALIZAÇÃO DO SITE (OBRIGATÓRIO PARA O RENDER NÃO DESLIGAR) ---
const app = express();
const port = process.env.PORT || 10000; // Render usa a porta 10000 por padrão

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req, res) => res.send('OK')); // Rota de teste para o Render

app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    if (users[user] && users[user].pass === pass) return res.json({ success: true, user, cargo: users[user].cargo });
    res.status(401).json({ success: false });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Servidor Web ativo na porta ${port}`);
});

// --- CONFIGURAÇÃO DO BOT ---
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ] 
});

const sb = createClient(process.env.SB_URL, process.env.SB_KEY);

client.once('ready', async () => {
    console.log(`✅ BOT CONECTADO COM SUCESSO: ${client.user.tag}`);
    
    // Registrar comandos
    const commands = [
        { name: 'setup', description: 'Painel de verificação TTK' },
        { 
            name: 'atualizarrank', 
            description: 'Atualiza pontos de um membro',
            options: [
                { name: 'membro', description: 'Nick do soldado', type: 3, required: true },
                { name: 'honra', description: 'Nova Honra', type: 4, required: true },
                { name: 'guerra', description: 'Nova Guerra', type: 4, required: true }
            ]
        }
    ];

    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Comandos registrados!');
    } catch (e) { console.error("❌ Erro ao registrar comandos:", e); }
});

// Mensagem de erro caso o login falhe
client.on('error', console.error);

// Tenta logar e captura erro de token
console.log("⏳ Tentando logar no Discord...");
client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("❌ FALHA CRÍTICA NO LOGIN DO BOT:");
    console.error(err);
});
