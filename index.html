const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, REST, Routes } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const path = require('path');

// --- CONFIGURAÇÕES ---
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const SB_URL = process.env.SB_URL;
const SB_KEY = process.env.SB_KEY;
const CANAL_RANKING = 'ID_CANAL_RANKING';
const CANAL_AVISOS = 'ID_CANAL_AVISOS';

// --- INICIALIZAÇÃO DO SITE (EXPRESS) ---
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public')); // O site ficará na pasta /public

app.listen(port, () => {
    console.log(`🌐 Site rodando na porta ${port}`);
});

// --- INICIALIZAÇÃO DO BOT ---
const client = new Client({ intents: [32767] });
const sb = createClient(SB_URL, SB_KEY);

// Comandos /
const commands = [
    { name: 'setup', description: 'Cria o botão de verificação TTK.' },
    { name: 'ranking_post', description: 'Cria a mensagem fixa de ranking.' }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`✅ Bot TTK Online: ${client.user.tag}`);
    
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    } catch (e) { console.error(e); }

    // LOOP: Atualizar Ranking Fixo (1 em 1 min)
    let msgRankingID = null;
    setInterval(async () => {
        const { data: membros } = await sb.from('membros').select('*').order('honra', { ascending: false });
        if(!membros) return;

        const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        let tabela = "RANK | NOME         | HONRA | GUERRA\n-----------------------------------\n";
        membros.forEach((m, i) => {
            tabela += `${(i + 1).toString().padStart(2, '0')}   | ${m.nome.padEnd(12, ' ')} | ${m.honra.toString().padStart(5, ' ')} | ${m.guerra.toString().padStart(4, ' ')}\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle('🏆 RANKING DE ELITE TTK')
            .setColor('#fbbf24')
            .setDescription(`\`\`\`\n${tabela}\n\`\`\``)
            .setFooter({ text: `Sincronizado: ${agora}` });

        const canal = client.channels.cache.get(CANAL_RANKING);
        if(canal) {
            // Lógica para editar mensagem fixa ou criar nova
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

// INTERAÇÃO: /SETUP E VERIFICAÇÃO (SALVAR NO BANCO + MUDAR NICK)
client.on('interactionCreate', async (i) => {
    if (i.commandName === 'setup') {
        const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verif').setLabel('INICIAR VERIFICAÇÃO').setStyle(ButtonStyle.Success));
        await i.reply({ content: 'Painel de Verificação:', components: [btn] });
    }

    if (i.customId === 'verif') {
        const modal = new ModalBuilder().setCustomId('mod_v').setTitle('CADASTRO TTK');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('NICK NO JOGO').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('uid').setLabel('SEU ID (UID)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('f').setLabel('FUNÇÃO (Curan, Gás ou Rush)').setStyle(TextInputStyle.Short).setRequired(true))
        );
        await i.showModal(modal);
    }

    if (i.type === InteractionType.ModalSubmit && i.customId === 'mod_v') {
        const nick = i.fields.getTextInputValue('n');
        const uid = i.fields.getTextInputValue('uid');
        
        // Salva no Supabase
        await sb.from('membros').upsert({ nome: nick, uid: uid, status: 'ONLINE' }, { onConflict: 'nome' });
        
        // Tenta mudar nick
        try { await i.member.setNickname(`TTK | ${nick}`); } catch(e){}
        
        await i.reply({ content: `✅ Registrado! Nick e UID salvos no banco.`, ephemeral: true });
    }
});

// MONITOR DE BANIMENTO E ADVs (Avisa no canal automaticamente quando o site envia)
let lastCount = 0;
setInterval(async () => {
    const { data: bans } = await sb.from('banidos').select('*').order('id', {ascending: false});
    if(bans && bans.length > lastCount) {
        const last = bans[0];
        const embed = new EmbedBuilder().setTitle('🚫 NOVO BANIMENTO').setColor('#ff0000').addFields({name: 'Nick', value: last.nick}, {name: 'Motivo', value: last.motivo});
        client.channels.cache.get(CANAL_AVISOS)?.send({ embeds: [embed] });
        lastCount = bans.length;
    }
}, 10000);

client.login(TOKEN);
