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

// LOGIN
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    if (users[user] && users[user].pass === pass) return res.json({ success: true, user, cargo: users[user].cargo });
    res.status(401).json({ success: false });
});

app.listen(process.env.PORT || 3000, () => console.log("🌐 Painel TTK Online"));

// --- BOT DISCORD ---
const client = new Client({ intents: [32767] });
let msgRankingID = null;

client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} Online`);
    
    // REGISTRO DE COMANDOS /
    const commands = [
        { name: 'setup', description: 'Painel de verificação TTK' },
        { 
            name: 'pontos', 
            description: 'Gerenciar pontos de um membro',
            options: [
                { name: 'membro', description: 'Nome do membro', type: 3, required: true },
                { name: 'honra', description: 'Quantidade de honra', type: 4, required: true },
                { name: 'guerra', description: 'Quantidade de guerra', type: 4, required: true }
            ]
        }
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    } catch (e) { console.log(e); }

    // LOOP RANKING (1 MINUTO)
    setInterval(async () => {
        const { data: m } = await sb.from('membros').select('*').order('honra', { ascending: false });
        const { data: c } = await sb.from('config_bot').select('*');
        if(!m || !c) return;

        const canalID = c.find(x => x.chave === 'canal_ranking')?.valor;
        if(!canalID || canalID === '0') return;

        const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        let tabela = "NOME            | HONRA | GUERRA\n--------------------------------\n";
        m.forEach(s => tabela += `${(s.nome || '---').padEnd(15, ' ')} | ${(s.honra || 0).toString().padStart(5, ' ')} | ${(s.guerra || 0).toString().padStart(4, ' ')}\n`);

        const embed = new EmbedBuilder()
            .setTitle('🏆 RANKING TTK BRASIL')
            .setColor('#fbbf24')
            .setDescription(`\`\`\`\n${tabela}\n\`\`\``)
            .setFooter({ text: `Atualizado: ${agora}` });

        const canal = client.channels.cache.get(canalID);
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

// COMANDOS E INTERAÇÕES
client.on('interactionCreate', async (i) => {
    // Gerenciar Rank via Bot
    if (i.commandName === 'pontos') {
        const nome = i.options.getString('membro');
        const h = i.options.getInteger('honra');
        const g = i.options.getInteger('guerra');

        const { error } = await sb.from('membros').update({ honra: h, guerra: g }).ilike('nome', nome);
        if(error) return i.reply({ content: '❌ Membro não encontrado!', ephemeral: true });
        i.reply({ content: `✅ Pontos de **${nome}** atualizados: H: ${h} | G: ${g}`, ephemeral: true });
    }

    if (i.commandName === 'setup') {
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('v').setLabel('VERIFICAR').setStyle(ButtonStyle.Success));
        await i.reply({ content: 'Painel de Verificação TTK:', components: [btn] });
    }

    if (i.customId === 'v') {
        const modal = new ModalBuilder().setCustomId('mv').setTitle('CADASTRO TTK');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('NICK').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('uid').setLabel('UID').setStyle(TextInputStyle.Short).setRequired(true))
        );
        await i.showModal(modal);
    }

    if (i.type === InteractionType.ModalSubmit && i.customId === 'mv') {
        const nick = i.fields.getTextInputValue('n');
        const uid = i.fields.getTextInputValue('uid');
        await sb.from('membros').upsert({ nome: nick, uid: uid }, { onConflict: 'nome' });
        try { await i.member.setNickname(`TTK | ${nick}`); } catch(e){}
        await i.reply({ content: `✅ Verificado!`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
