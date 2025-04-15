import { config } from 'dotenv';
import { Client, GatewayIntentBits, REST, Routes, Collection, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

config(); // โหลด .env

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// คำสั่ง SlashCommand
const gameCommand = new SlashCommandBuilder()
    .setName('game')
    .setDescription('เริ่มเกมทายเลข')
    .addSubcommand(subcommand =>
        subcommand.setName('start').setDescription('เริ่มเกมทายเลข'))
    .addSubcommand(subcommand =>
        subcommand.setName('guess').setDescription('ทายตัวเลข')
            .addIntegerOption(option =>
                option.setName('number')
                    .setDescription('ทายตัวเลข')
                    .setRequired(true)
            ));

// เก็บคำสั่งไว้
const commands = [gameCommand.toJSON()];
const rest = new REST({ version: '10' }).setToken(TOKEN);

// ลงทะเบียน Slash Commands ตอนบอทออนไลน์
client.once('ready', async () => {
    console.log(`✅ เข้าสู่ระบบแล้วในชื่อ ${client.user.tag}`);

    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );
        console.log('📥 ลงทะเบียน Slash Commands แล้ว');
    } catch (error) {
        console.error('❌ ลงทะเบียนคำสั่งล้มเหลว:', error);
    }
});

let games = new Map();
let leaderboard = new Map();

// จัดการการใช้คำสั่ง
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'game') {
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        if (sub === 'start') {
            if (games.has(userId)) {
                return interaction.reply({
                    content: '⚠️ คุณกำลังเล่นเกมอยู่แล้ว! ทายเลขก่อนที่จะเริ่มใหม่',
                    ephemeral: true
                });
            }

            const targetNumber = Math.floor(Math.random() * 100) + 1;
            games.set(userId, { targetNumber, attemptsLeft: 5, startTime: Date.now() });

            const embed = new EmbedBuilder()
                .setTitle('🎲 เริ่มเกมทายเลข!')
                .setDescription('ทายตัวเลขระหว่าง 1 ถึง 100\n🔹 ใช้ `/game guess <number>` เพื่อทาย\n🔹 เหลือโอกาส 5 ครั้ง')
                .setColor('Blue');

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'guess') {
            if (!games.has(userId)) {
                return interaction.reply({
                    content: '❌ เกมยังไม่เริ่ม! ใช้ `/game start` เพื่อเริ่มเกม',
                    ephemeral: true
                });
            }

            const number = interaction.options.getInteger('number');
            const game = games.get(userId);
            game.attemptsLeft--;

            let response = '';
            let color = 'Yellow';
            let encouragements = ['อย่ายอมแพ้! 🔥', 'ลองอีกครั้ง! 💪', 'คุณใกล้แล้ว! 🎯', 'คิดดีๆ แล้วลองใหม่ 🤔'];

            if (number === game.targetNumber) {
                const timeTaken = ((Date.now() - game.startTime) / 1000).toFixed(2);
                response = `🎉 **ถูกต้อง!** ตัวเลขคือ ${game.targetNumber} คุณใช้เวลา ${timeTaken} วินาที`;
                color = 'Green';

                if (!leaderboard.has(userId) || leaderboard.get(userId) > timeTaken) {
                    leaderboard.set(userId, timeTaken);
                }
                games.delete(userId);
            } else if (game.attemptsLeft === 0) {
                response = `💥 **คุณแพ้!** ตัวเลขคือ ${game.targetNumber}`;
                color = 'Red';
                games.delete(userId);
            } else {
                const hint = number < game.targetNumber ? '🔼 สูงขึ้น' : '🔽 ต่ำลง';
                response = `${hint}! (${game.attemptsLeft} ครั้งที่เหลือ)\n${encouragements[Math.floor(Math.random() * encouragements.length)]}`;
            }

            const embed = new EmbedBuilder()
                .setTitle('🔍 ทายตัวเลข')
                .setDescription(response)
                .setColor(color);

            return interaction.reply({ embeds: [embed] });
        }
    }
});

client.login(TOKEN);
