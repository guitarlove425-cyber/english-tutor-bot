const { Telegraf } = require('telegraf');
const config = require('./src/config');
const { setupHandlers } = require('./src/bot/handlers');

// Token မထည့်ထားရင် Bot ကို Run ခွင့်မပေးဘဲ သတိပေးမည်
if (!config.BOT_TOKEN || !config.GEMINI_API_KEY) {
    console.error("❌ CRITICAL ERROR: BOT_TOKEN or GEMINI_API_KEY is missing in .env file.");
    process.exit(1);
}

// Bot ကို တည်ဆောက်ခြင်း
const bot = new Telegraf(config.BOT_TOKEN);

// Handlers များကို ချိတ်ဆက်ခြင်း
setupHandlers(bot);
console.log("⏳ Connecting to Telegram Server...");
// Bot ကို စတင် Run ခြင်း
bot.launch()
    .then(() => {
        console.log("✅ Professional English Tutor Bot is running smoothly!");
    })
    .catch((error) => {
        console.error("❌ Failed to launch bot:", error);
    });

// Server (သို့) စက်ကို ပိတ်လိုက်သည့်အခါ Bot ကိုပါ သပ်သပ်ရပ်ရပ် ရပ်တန့်ပေးရန်
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));