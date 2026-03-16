const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, REST, Routes } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const users = require('./users.json');

// --- CONFIGURAÇÃO ---
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const SB_URL = process.env.SB_URL;
const SB_KEY = process.env.SB_KEY;
const CANAL_RANKING = process.env.CANAL_RANKING;
const CANAL_BANS = process.env.CANAL_BANS;

const app = express();
app.use(express.json());
app.use(express.static('public'));

const sb = createClient(SB_URL, SB_KEY);

// ROTA DE LOGIN DO SITE
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    if (users[user] && users[user].pass === pass) {
        res.json({ success: true, cargo: users[user].cargo });
    } else {
        res.status(401).json({ success: false });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("🌐 Servidor Web Ativo"));

// --- BOT DISCORD ---
const client = new Client({ intents: [32767] });

client.once('ready', async () => {
    console.log(`✅ Bot Online: ${client.user.tag}`);
    
    // Comando Slash /setup
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), {
            body: [{ name: 'setup', description: 'Envia o painel de verificação TTK.' }]
        });
    } catch (e) { console.error(e); }

    // LOOP: Ranking Automático (Edita Mensagem Fixa)
    let msgRankingID = null;
    setInterval(async () => {
        const { data: membros } = await sb.from('membros').select('*').order('honra', { ascending: false });
        if(!membros) return;

        const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        let corpo = "RANK | NOME         | HONRA | GUERRA\n-----------------------------------\n";
        membros.forEach((m, i) => {
            corpo += `${(i + 1).toString().padStart(2, '0')}   | ${m.nome.padEnd(12, ' ')} | ${m.honra.toString().padStart(5, ' ')} | ${m.guerra.toString().padStart(4, ' ')}\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle('🏆 RANKING OFICIAL TTK BRASIL')
            .setColor('#fbbf24')
            .setDescription(`\`\`\`\n${corpo}\n\`\`\``)
            .setFooter({ text: `Atualizado em: ${agora}` });

        const canal = client.channels.cache.get(CANAL_RANKING);
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

// Interações do Bot (Verificação e Setup)
client.on('interactionCreate', async (i) => {
    if (i.commandName === 'setup') {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verificar').setLabel('VERIFICAR-SE').setStyle(ButtonStyle.Success).setEmoji('🛡️'));
        const embed = new EmbedBuilder().setTitle('CENTRO DE VERIFICAÇÃO').setDescription('Clique abaixo para registrar seu UID e entrar no sistema.').setColor('#fbbf24');
        await i.reply({ embeds: [embed], components: [row] });
    }

    if (i.isButton() && i.customId === 'verificar') {
        const modal = new ModalBuilder().setCustomId('mod_v').setTitle('CADASTRO TTK');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('NICK NO JOGO').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id').setLabel('ID (UID)').setStyle(TextInputStyle.Short).setRequired(true))
        );
        await i.showModal(modal);
    }

    if (i.type === InteractionType.ModalSubmit && i.customId === 'mod_v') {
        const nick = i.fields.getTextInputValue('n');
        const uid = i.fields.getTextInputValue('id');
        await sb.from('membros').upsert({ nome: nick, uid: uid, status: 'ONLINE' }, { onConflict: 'nome' });
        try { await i.member.setNickname(`TTK | ${nick}`); } catch(e){}
        await i.reply({ content: `✅ Registrado com sucesso! Nick salvo no banco.`, ephemeral: true });
    }
});

// Alertas de Banimento em Tempo Real
let lastBanCount = 0;
setInterval(async () => {
    const { data: bans } = await sb.from('banidos').select('*').order('id', {ascending: false});
    if(bans && bans.length > lastBanCount) {
        const b = bans[0];
        const embed = new EmbedBuilder()
            .setTitle('🚫 BANIMENTO CONFIRMADO')
            .setColor('#ff0000')
            .addFields({ name: 'Soldado', value: b.nick, inline: true }, { name: 'Por', value: b.aplicado_por, inline: true }, { name: 'Motivo', value: b.motivo })
            .setTimestamp();
        client.channels.cache.get(CANAL_BANS)?.send({ embeds: [embed] });
        lastBanCount = bans.length;
    }
}, 10000);

client.login(TOKEN);
