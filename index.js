const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');

// --- MAŁY SERWER WWW DLA RENDER.COM ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('PipVault Bot działa poprawnie!');
});

app.listen(PORT, () => {
    console.log(`Serwer www bota słucha na porcie ${PORT}`);
});
// -------------------------------------

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

const ADMIN_ID = '463437979168407555';
const TOKEN = 'MTUzMzk2NzY2NjI0MTM0MzU1OA.G0J5EG.Q3O-mAEDrWcTZVRwLdoT0Aa7C-yLH5rlXBpGr0';

client.once('ready', async () => {
    console.log(`Zalogowano pomyślnie jako ${client.user.tag}! Bot PipVault jest gotowy.`);

    // Rejestracja obu komend slash: /massdm oraz /testdm
    const commands = [
        new SlashCommandBuilder()
            .setName('massdm')
            .setDescription('Wysyła wiadomość prywatną do wszystkich członków serwera')
            .addStringOption(option =>
                option.setName('tresc')
                .setDescription('Treść wiadomości do wysłania')
                .setRequired(true)),
        new SlashCommandBuilder()
            .setName('testdm')
            .setDescription('Wysyła wiadomość testową wyłącznie do Ciebie na PW')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Zarejestrowano pomyślnie komendy /massdm oraz /testdm!');
    } catch (error) {
        console.error('Błąd rejestracji komend:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // 1. OBSŁUGA KOMENDY TESTOWEJ /testdm
    if (interaction.commandName === 'testdm') {
        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({ content: '❌ Nie masz uprawnień do użycia tej komendy!', ephemeral: true });
        }

        await interaction.reply({ content: '⏳ Wysyłam wiadomość testową na Twoje PW...', ephemeral: true });

        try {
            await interaction.user.send('🔑 **[PipVault Test]** — Jeśli widzisz tę wiadomość, to znaczy, że system wysyłania wiadomości prywatnych działa idealnie!');
            await interaction.followUp({ content: '✅ Wiadomość testowa została pomyślnie wysłana na Twoje PW!', ephemeral: true });
        } catch (error) {
            console.error('Błąd testu DM:', error);
            await interaction.followUp({ content: '❌ Nie udało się wysłać wiadomości. Upewnij się, że nie masz zablokowanych PW od botów na serwerze!', ephemeral: true });
        }
    }

    // 2. OBSŁUGA KOMENDY MASOWEJ /massdm
    if (interaction.commandName === 'massdm') {
        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({ content: '❌ Nie masz uprawnień do użycia tej komendy!', ephemeral: true });
        }

        const messageContent = interaction.options.getString('tresc');
        await interaction.reply({ content: '⏳ Rozpoczynam rozsyłanie wiadomości prywatnych do członków skarbca...', ephemeral: true });

        try {
            await interaction.guild.members.fetch();
            const members = interaction.guild.members.cache;

            let successCount = 0;
            let failCount = 0;

            for (const [id, member] of members) {
                if (member.user.bot || member.user.id === client.user.id) continue;

                try {
                    await member.send(`🔑 **[PipVault Academy - Wiadomość ze Skarbca]**\n\n${messageContent}`);
                    successCount++;
                    await new Promise(resolve => setTimeout(resolve, 1500));
                } catch (err) {
                    failCount++;
                }
            }

            await interaction.followUp({ content: `✅ Zakończono wysyłanie wiadomości!\nWysłano pomyślnie: **${successCount}**\nNie doręczono (np. zablokowane PW): **${failCount}**`, ephemeral: true });

        } catch (error) {
            console.error('Błąd podczas masowego wysyłania:', error);
            await interaction.followUp({ content: '❌ Wystąpił błąd podczas pobierania listy członków serwera.', ephemeral: true });
        }
    }
});

client.login(TOKEN);
