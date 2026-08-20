const { getTutorResponse, getTutorResponseFromAudio } = require('../ai/gemini');
const googleTTS = require('google-tts-api');
const { Markup } = require('telegraf');
const {
    checkUsageLimit,
    makeUserPremium,
    getUserMode,
    setUserMode,
    ADMIN_ID
} = require('../database/firebase');

const TELEGRAM_TEXT_LIMIT = 3900;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const VALID_MODES = new Set(['default', 'ielts', 'translator']);

function splitMessage(text, maxLength = TELEGRAM_TEXT_LIMIT) {
    const value = String(text || '').trim();
    if (!value) return [];
    const chunks = [];
    for (let index = 0; index < value.length; index += maxLength) {
        chunks.push(value.slice(index, index + maxLength));
    }
    return chunks;
}

async function replyLongText(ctx, text) {
    for (const chunk of splitMessage(text)) await ctx.reply(chunk);
}

function englishSpeechChunks(text) {
    const english = String(text || '').replace(/[^\x00-\x7F]/g, ' ').replace(/\s+/g, ' ').trim();
    return splitMessage(english, 1800);
}

async function sendEnglishVoiceReply(ctx, text) {
    const chunks = englishSpeechChunks(text);
    if (!chunks.length) return;
    await ctx.sendChatAction('record_voice');
    for (const chunk of chunks) {
        const audioUrl = googleTTS.getAudioUrl(chunk, {
            lang: 'en',
            slow: false,
            host: 'https://translate.google.com'
        });
        await ctx.replyWithVoice(audioUrl);
    }
}

async function usageOrReply(ctx) {
    const status = await checkUsageLimit(ctx.from.id);
    if (!status.allowed) {
        await ctx.reply('⏳ ယနေ့ Free အသုံးပြုခွင့် ပြည့်သွားပါပြီ။ မနက်ဖြန်အထိ စောင့်ပါ သို့မဟုတ် Premium အတွက် Admin ကို ဆက်သွယ်ပါ။');
        return null;
    }
    return status;
}

async function getCurrentMode(userId) {
    const mode = await getUserMode(userId);
    return VALID_MODES.has(mode) ? mode : 'default';
}

function modeKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('Normal Tutor (LinguistPro)', 'set_default')],
        [Markup.button.callback('IELTS Examiner', 'set_ielts')],
        [Markup.button.callback('Subtitle Translator', 'set_translator')]
    ]);
}

function setupHandlers(bot) {
    bot.start(async (ctx) => {
        const mode = await getCurrentMode(ctx.from.id);
        await ctx.reply(`Hello ${ctx.from.first_name || 'there'}!\n\nI am LinguistPro, your AI English Tutor.\n\nCurrent mode: ${mode}\nUse /help for commands, /mode to change tutor mode, or send text/voice to begin.`);
    });

    bot.help((ctx) => ctx.reply('Commands:\n/start - Start the tutor\n/help - Show help\n/mode - Choose tutor mode\n/myid - Show your Telegram ID\n/upgrade USER_ID DAYS - Admin only\n\nYou can send English text, voice messages, or .srt/.vtt/.txt files in Translator mode.'));

    bot.command('mode', (ctx) => ctx.reply('Choose a tutor mode:', modeKeyboard()));

    bot.command('myid', (ctx) => ctx.reply(`Your Telegram ID is: ${ctx.from.id}`));

    bot.command('upgrade', async (ctx) => {
        if (ctx.from.id !== ADMIN_ID) return ctx.reply('❌ This command is available to the admin only.');
        const parts = String(ctx.message.text || '').trim().split(/\s+/);
        const targetUserId = parts[1];
        const days = parts[2] || '30';
        if (!/^\d{3,20}$/.test(targetUserId || '')) {
            return ctx.reply('Usage: /upgrade USER_ID DAYS\nExample: /upgrade 123456789 30');
        }
        try {
            const expiryDate = await makeUserPremium(targetUserId, days);
            await ctx.reply(`✅ Premium enabled for ${targetUserId}.\nExpires: ${expiryDate}`);
            await bot.telegram.sendMessage(targetUserId, `🎉 Premium has been enabled for ${days} days. You can now use the tutor without the daily free limit.`).catch(() => {});
        } catch (error) {
            console.error('Upgrade error:', error.message);
            await ctx.reply(`❌ Could not upgrade this user: ${error.message}`);
        }
    });

    for (const [callback, mode, message] of [
        ['set_default', 'default', '✅ Normal Tutor mode is active.'],
        ['set_ielts', 'ielts', '✅ IELTS Examiner mode is active. Send your answer to begin.'],
        ['set_translator', 'translator', '✅ Translator mode is active. Send text or a .srt/.vtt/.txt file.']
    ]) {
        bot.action(callback, async (ctx) => {
            try {
                await setUserMode(ctx.from.id, mode);
                await ctx.answerCbQuery();
                await ctx.reply(message);
            } catch (error) {
                console.error('Mode update error:', error.message);
                await ctx.answerCbQuery('Could not save mode. Try again.');
            }
        });
    }

    bot.on('text', async (ctx) => {
        const userMessage = String(ctx.message.text || '').trim();
        if (!userMessage || userMessage.startsWith('/')) return;
        try {
            const status = await usageOrReply(ctx);
            if (!status) return;
            const currentMode = await getCurrentMode(ctx.from.id);
            await ctx.sendChatAction('typing');
            const replyMessage = await getTutorResponse(userMessage, currentMode);
            await replyLongText(ctx, replyMessage);
            if (currentMode !== 'translator') await sendEnglishVoiceReply(ctx, replyMessage);
        } catch (error) {
            console.error('Error processing text:', error.message);
            await ctx.reply(error.message === 'API_ERROR'
                ? '🙏 AI service is temporarily unavailable. Please try again shortly.'
                : '🙏 I could not process that message. Please try again.');
        }
    });

    bot.on('voice', async (ctx) => {
        try {
            const status = await usageOrReply(ctx);
            if (!status) return;
            const currentMode = await getCurrentMode(ctx.from.id);
            await ctx.sendChatAction('typing');
            const fileId = ctx.message.voice.file_id;
            const fileLink = await ctx.telegram.getFileLink(fileId);
            const response = await fetch(fileLink.href);
            if (!response.ok) throw new Error(`Telegram file download failed: ${response.status}`);
            const buffer = Buffer.from(await response.arrayBuffer());
            const replyMessage = await getTutorResponseFromAudio(buffer, ctx.message.voice.mime_type || 'audio/ogg', currentMode);
            await replyLongText(ctx, replyMessage);
            if (currentMode !== 'translator') await sendEnglishVoiceReply(ctx, replyMessage);
        } catch (error) {
            console.error('Error processing voice:', error.message);
            await ctx.reply(error.message === 'API_ERROR'
                ? '🙏 AI service is temporarily unavailable. Please try again shortly.'
                : '🙏 I could not hear that clearly. Please send the voice message again.');
        }
    });

    bot.on('document', async (ctx) => {
        try {
            const currentMode = await getCurrentMode(ctx.from.id);
            if (currentMode !== 'translator') {
                return ctx.reply('Please select Translator mode with /mode before sending a subtitle or text file.');
            }
            const document = ctx.message.document;
            const fileName = String(document.file_name || 'document.txt');
            const extension = fileName.toLowerCase().split('.').pop();
            if (!['srt', 'vtt', 'txt'].includes(extension)) {
                return ctx.reply('Only .srt, .vtt, and .txt files are supported.');
            }
            if (document.file_size && document.file_size > MAX_DOCUMENT_BYTES) {
                return ctx.reply('The file is too large. Please send a file smaller than 10 MB.');
            }
            const status = await usageOrReply(ctx);
            if (!status) return;
            await ctx.sendChatAction('typing');
            const fileLink = await ctx.telegram.getFileLink(document.file_id);
            const response = await fetch(fileLink.href);
            if (!response.ok) throw new Error(`Telegram file download failed: ${response.status}`);
            const sourceText = await response.text();
            if (!sourceText.trim()) return ctx.reply('The file is empty.');
            const replyMessage = await getTutorResponse(sourceText.slice(0, 120000), 'translator');
            await replyLongText(ctx, replyMessage);
        } catch (error) {
            console.error('Error processing document:', error.message);
            await ctx.reply(error.message === 'API_ERROR'
                ? '🙏 Translation service is temporarily unavailable. Please try again shortly.'
                : '🙏 I could not process that file. Please check the format and try again.');
        }
    });
}

module.exports = { setupHandlers, splitMessage, englishSpeechChunks };
