const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, REST, Routes } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const cors = require('cors');
const users = require('./users.json');

// --- SERVIDOR WEB ---
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    const u = user.toUpperCase();
    if (users[u] && users[u].pass === pass) return res.json({ success: true, user: u, cargo: users[u].cargo });
    res.status(401).json({ success: false });
});

app.listen(process.env.PORT || 10000, '0.0.0.0', () => console.log("🌐 Servidor Web Ativo"));

// --- BOT DISCORD (INTENTS TOTAIS) ---
const client = new Client({ intents: 32767 }); 
const sb = createClient(process.env.SB_URL, process.env.SB_KEY);

let msgRankingID = null;

client.once('ready', async () => {
    console.log(`✅ BOT CONECTADO: ${client.user.tag}`);

    // Registrar Comandos /
    const commands = [
        { name: 'setup', description: 'Painel de verificação TTK' },
        { 
            name: 'atualizarrank', 
            description: 'Muda honra/guerra de um membro',
            options: [
                { name: 'membro', description: 'Nick exato', type: 3, required: true },
                { name: 'honra', description: 'Pontos', type: 4, required: true },
                { name: 'guerra', description: 'Pontos', type: 4, required: true }
            ]
        }
    ];

    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Comandos / registrados');
    } catch (e) { console.error(e); }

    // LOOP RANKING (1 MINUTO) - Edita a mesma mensagem
    setInterval(async () => {
        try {
            const { data: config } = await sb.from('config_bot').select('*');
            const canalID = config?.find(x => x.chave === 'canal_ranking')?.valor;
            if (!canalID || canalID === '0') return;

            const { data: membros } = await sb.from('membros').select('*').order('honra', { ascending: false });
            if (!membros) return;

            const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            let txt = "RANK | NOME         | HONRA | GUERRA\n-----------------------------------\n";
            membros.forEach((m, i) => {
                txt += `${(i + 1).toString().padStart(2, '0')}   | ${(m.nome || '---').padEnd(12, ' ')} | ${(m.honra || 0).toString().padStart(5, ' ')} | ${(m.guerra || 0).toString().padStart(4, ' ')}\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle('🏆 RANKING OFICIAL TTK BRASIL')
                .setColor('#fbbf24')
                .setDescription(`\`\`\`\n${txt}\n\`\`\``)
                .setFooter({ text: `Última Atualização: ${agora}` });

            const canal = client.channels.cache.get(canalID);
            if (canal) {
                if (!msgRankingID) {
                    const sent = await canal.send({ embeds: [embed] });
                    msgRankingID = sent.id;
                } else {
                    const msg = await canal.messages.fetch(msgRankingID).catch(() => null);
                    if (msg) await msg.edit({ embeds: [embed] });
                    else { const sent = await canal.send({ embeds: [embed] }); msgRankingID = sent.id; }
                }
            }
        } catch (err) { console.log("Erro no Loop:", err.message); }
    }, 60000);
});

// INTERAÇÕES
client.on('interactionCreate', async (i) => {
    if (i.commandName === 'atualizarrank') {
        const n = i.options.getString('membro');
        const h = i.options.getInteger('honra');
        const g = i.options.getInteger('guerra');
        await sb.from('membros').update({ honra: h, guerra: g }).ilike('nome', n);
        return i.reply({ content: `✅ Pontos de **${n}** atualizados!`, ephemeral: true });
    }

    if (i.commandName === 'setup') {
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('v').setLabel('VERIFICAR').setStyle(ButtonStyle.Success));
        await i.reply({ content: '🛡️ **Painel de Verificação TTK BRASIL**', components: [btn] });
    }

    if (i.isButton() && i.customId === 'v') {
        const modal = new ModalBuilder().setCustomId('mv').setTitle('CADASTRO TTK');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('NICK NO JOGO').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('uid').setLabel('UID (ID DO JOGO)').setStyle(TextInputStyle.Short).setRequired(true))
        );
        await i.showModal(modal);
    }

    if (i.type === InteractionType.ModalSubmit && i.customId === 'mv') {
        const nick = i.fields.getTextInputValue('n');
        const uid = i.fields.getTextInputValue('uid');
        await sb.from('membros').upsert({ nome: nick, uid: uid }, { onConflict: 'nome' });
        try { await i.member.setNickname(`TTK | ${nick}`); } catch(e){}
        await i.reply({ content: `✅ Verificado com sucesso! Seus dados foram salvos.`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN).catch(e => console.error("❌ ERRO LOGIN:", e.message));
