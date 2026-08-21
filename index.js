const express = require('express');
const { Telegraf } = require('telegraf');
const { setupHandlers } = require('./src/bot/handlers');
const { config, validateRuntimeConfig } = require('./src/config');
const { isFirebaseEnabled } = require('./src/database/firebase');
const { healthMetrics } = require('./src/ops/metrics');

validateRuntimeConfig();

const app = express();
app.disable('x-powered-by');
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'english-tutor-bot',
        firebase: isFirebaseEnabled() ? 'enabled' : 'memory-fallback',
        ai: healthMetrics(),
        time: new Date().toISOString()
    });
});

const server = app.listen(config.PORT, () => {
    console.log(`🌐 Health server is listening on port ${config.PORT}`);
});

const bot = new Telegraf(config.BOT_TOKEN);
setupHandlers(bot);

console.log('⏳ Connecting to Telegram...');
bot.launch()
    .then(() => console.log('✅ English Tutor Bot is running.'))
    .catch((error) => {
        console.error('❌ Telegram startup failed:', error.message);
        server.close(() => process.exit(1));
    });

function shutdown(signal) {
    console.log(`Received ${signal}; shutting down...`);
    bot.stop(signal);
    server.close(() => process.exit(0));
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
