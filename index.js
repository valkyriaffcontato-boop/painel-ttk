const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, REST, Routes } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const cors = require('cors');
const users = require('./users.json');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const sb = createClient(process.env.SB_URL, process.env.SB_KEY);

// ROTA DE LOGIN SEGURA
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    if (users[user] && users[user].pass === pass) {
        return res.json({ success: true, user, cargo: users[user].cargo });
    }
    res.status(401).json({ success: false });
});

app.listen(process.env.PORT || 3000, () => console.log("🌐 Servidor Web Rodando"));

// --- BOT DISCORD ---
const client = new Client({ intents: [32767] });
let msgRankingID = null;

client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} Online`);
    
    // Registrar comando /setup
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: [{ name: 'setup', description: 'Painel de verificação TTK' }]
        });
    } catch (e) { console.log(e); }

    // LOOP RANKING (1 MINUTO - EDITANDO MSG)
    setInterval(async () => {
        const { data: m } = await sb.from('membros').select('*').order('honra', { ascending: false });
        if(!m) return;

        const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        let tabela = "NOME            | HONRA | GUERRA\n--------------------------------\n";
        m.forEach((s) => {
            tabela += `${s.nome.padEnd(15, ' ')} | ${s.honra.toString().padStart(5, ' ')} | ${s.guerra.toString().padStart(4, ' ')}\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle('🏆 RANKING TTK BRASIL')
            .setColor('#fbbf24')
            .setDescription(`\`\`\`\n${tabela}\n\`\`\``)
            .setFooter({ text: `Sincronizado: ${agora}` });

        const canal = client.channels.cache.get(process.env.CANAL_RANKING);
        if(canal) {
            if(!msgRankingID) {
                const sent = await canal.send({ embeds: [embed] });
                msgRankingID = sent.id;
            } else {
                try {
                    const msg = await canal.messages.fetch(msgRankingID);
                    await msg.edit({ embeds: [embed] });
                } catch { msgRankingID = null; }
            }
        }
    }, 60000);
});

// INTERAÇÃO VERIFICAÇÃO (SALVA UID NO BANCO)
client.on('interactionCreate', async (i) => {
    if (i.commandName === 'setup') {
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('v').setLabel('VERIFICAR').setStyle(ButtonStyle.Success));
        await i.reply({ content: 'Clique para se verificar:', components: [btn] });
    }
    if (i.customId === 'v') {
        const modal = new ModalBuilder().setCustomId('mv').setTitle('CADASTRO TTK');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('NICK').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('uid').setLabel('UID (ID DO JOGO)').setStyle(TextInputStyle.Short).setRequired(true))
        );
        await i.showModal(modal);
    }
    if (i.type === InteractionType.ModalSubmit && i.customId === 'mv') {
        const nick = i.fields.getTextInputValue('n');
        const uid = i.fields.getTextInputValue('uid');
        await sb.from('membros').upsert({ nome: nick, uid: uid }, { onConflict: 'nome' });
        try { await i.member.setNickname(`TTK | ${nick}`); } catch(e){}
        await i.reply({ content: `✅ Verificado! UID: ${uid}`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
