require('dotenv').config();

function getOptional(name) {
    const value = process.env[name];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

const config = {
    BOT_TOKEN: getOptional('BOT_TOKEN'),
    GEMINI_API_KEY: getOptional('GEMINI_API_KEY'),
    GEMINI_MODEL: getOptional('GEMINI_MODEL') || 'gemini-flash-latest',
    GEMINI_FALLBACK_MODEL: getOptional('GEMINI_FALLBACK_MODEL') || 'gemini-2.5-flash',
    PORT: Number.parseInt(process.env.PORT || '3000', 10) || 3000,
    ADMIN_ID: Number.parseInt(process.env.ADMIN_ID || process.env.ADMIN_TELEGRAM_ID || '0', 10),
    DAILY_FREE_LIMIT: Number.parseInt(process.env.DAILY_FREE_LIMIT || '5', 10) || 5,
    FIREBASE_SERVICE_ACCOUNT_JSON: getOptional('FIREBASE_SERVICE_ACCOUNT_JSON'),
    FIREBASE_SERVICE_ACCOUNT_BASE64: getOptional('FIREBASE_SERVICE_ACCOUNT_BASE64'),
    FIREBASE_SERVICE_ACCOUNT_FILE: getOptional('FIREBASE_SERVICE_ACCOUNT_FILE')
};

function validateRuntimeConfig() {
    const missing = [];
    if (!config.BOT_TOKEN) missing.push('BOT_TOKEN');
    if (!config.GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
    if (missing.length) {
        throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
    }
    if (!Number.isInteger(config.ADMIN_ID) || config.ADMIN_ID <= 0) {
        throw new Error('ADMIN_ID must be a positive Telegram user ID');
    }
    if (!Number.isInteger(config.DAILY_FREE_LIMIT) || config.DAILY_FREE_LIMIT < 1) {
        throw new Error('DAILY_FREE_LIMIT must be a positive integer');
    }
}

module.exports = { config, validateRuntimeConfig };
