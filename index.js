require('dotenv').config();
const { Telegraf } = require('telegraf');
const { setupHandlers } = require('./src/bot/handlers');
const express = require('express'); // 🌐 ထပ်တိုးထားသော Web Server Package

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- Render အတွက် Dummy Web Server ဖန်တီးခြင်း အစ ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('✅ English Tutor Bot is running smoothly!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web server is listening on port ${PORT}`);
});
// --- Dummy Web Server အဆုံး ---

console.log("⏳ Connecting to Telegram Server...");
setupHandlers(bot);

bot.launch().then(() => {
    console.log("✅ Professional English Tutor Bot is running smoothly!");
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));