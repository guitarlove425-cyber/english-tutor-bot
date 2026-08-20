const { getTutorResponse, getTutorResponseFromAudio } = require('../ai/gemini');
const googleTTS = require('google-tts-api');
const { Markup } = require('telegraf');
const {
    checkUsageLimit,
    makeUserPremium,
    getUserMode,
    setUserMode,
    getCourseProgress,
    saveCourseProgress,
    startCourse,
    completeCourseLesson,
    resetCourse,
    ADMIN_ID
} = require('../database/firebase');
const { BEGINNER_COURSE, getLesson } = require('../course/content');
const { buildLessonIntro, buildTextPracticePrompt, buildVoicePracticePrompt } = require('../course/teacher');

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

async function sendCurrentLesson(ctx, progress) {
    const lesson = getLesson(progress.currentLesson) || BEGINNER_COURSE[0];
    await replyLongText(ctx, buildLessonIntro(lesson, BEGINNER_COURSE.length));
    await sendEnglishVoiceReply(ctx, lesson.examples.join('. '));
}

function courseProgressMessage(progress) {
    const completed = Array.isArray(progress.completedLessons) ? progress.completedLessons.length : 0;
    const currentLesson = getLesson(progress.currentLesson) || BEGINNER_COURSE[BEGINNER_COURSE.length - 1];
    const percentage = Math.round((completed / BEGINNER_COURSE.length) * 100);
    return `📊 Beginner Course Progress\n\nCompleted: ${completed}/${BEGINNER_COURSE.length} lessons (${percentage}%)\nCurrent lesson: ${currentLesson.id}. ${currentLesson.title}\nPractice attempts: ${progress.practiceAttempts || 0}\nSpeaking attempts: ${progress.speakingAttempts || 0}\n\nUse /lesson to see the current lesson, /nextlesson when you are ready, or /resetcourse to start again.`;
}

async function savePracticeAttempt(userId, progress, isSpeaking) {
    await saveCourseProgress(userId, {
        ...progress,
        practiceAttempts: Number(progress.practiceAttempts || 0) + 1,
        speakingAttempts: Number(progress.speakingAttempts || 0) + (isSpeaking ? 1 : 0)
    });
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
        await ctx.reply(`Hello ${ctx.from.first_name || 'there'}!\n\nI am LinguistPro, your AI English Tutor.\n\nCurrent mode: ${mode}\n\nIf you are a complete beginner, send /course and I will teach you step by step like a personal teacher.\nUse /help for all commands, /mode for tutor modes, or send text/voice to begin.`);
    });

    bot.help((ctx) => ctx.reply('Commands:\n/start - Start the tutor\n/help - Show help\n/course - Start or resume the beginner speaking course\n/lesson - Show your current lesson\n/nextlesson - Complete the current lesson and move forward\n/progress - Show course progress\n/resetcourse - Start the course again from Lesson 1\n/mode - Choose tutor mode\n/myid - Show your Telegram ID\n/upgrade USER_ID DAYS - Admin only\n\nIn the course, send text or voice practice answers and I will correct you like a personal teacher. Outside the course, you can also send .srt/.vtt/.txt files in Translator mode.'));

    bot.command('mode', (ctx) => ctx.reply('Choose a tutor mode:', modeKeyboard()));

    bot.command('course', async (ctx) => {
        try {
            const progress = await startCourse(ctx.from.id);
            await ctx.reply('🎓 Beginner Speaking Course started. I will teach you step by step like a personal teacher. Complete the practice, then send /nextlesson when you are ready.');
            await sendCurrentLesson(ctx, progress);
        } catch (error) {
            console.error('Course start error:', error.message);
            await ctx.reply('🙏 I could not start the course right now. Please try again.');
        }
    });

    bot.command('lesson', async (ctx) => {
        try {
            const progress = await getCourseProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('The course has not started yet. Send /course to begin from Lesson 1.');
            await sendCurrentLesson(ctx, progress);
        } catch (error) {
            console.error('Lesson display error:', error.message);
            await ctx.reply('🙏 I could not load your lesson right now.');
        }
    });

    bot.command('progress', async (ctx) => {
        try {
            await ctx.reply(courseProgressMessage(await getCourseProgress(ctx.from.id)));
        } catch (error) {
            console.error('Progress error:', error.message);
            await ctx.reply('🙏 I could not load your progress right now.');
        }
    });

    bot.command('nextlesson', async (ctx) => {
        try {
            const progress = await getCourseProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('Send /course to start the beginner course first.');
            const currentLesson = getLesson(progress.currentLesson);
            if (!currentLesson) return ctx.reply('🎉 You have completed the beginner course! Use /course to review it again.');
            if ((progress.completedLessons || []).includes(currentLesson.id)) {
                return ctx.reply('This lesson is already complete. Send /lesson to review it or continue with your practice.');
            }
            const updated = await completeCourseLesson(ctx.from.id, currentLesson.id, null);
            if (currentLesson.id >= BEGINNER_COURSE.length) {
                return ctx.reply('🎉 Congratulations! You completed all 12 beginner speaking lessons. Keep practicing with /course or use /mode for IELTS practice.');
            }
            await ctx.reply(`✅ Lesson ${currentLesson.id} completed. Now let us continue with Lesson ${updated.currentLesson}.`);
            await sendCurrentLesson(ctx, updated);
        } catch (error) {
            console.error('Next lesson error:', error.message);
            await ctx.reply('🙏 I could not move to the next lesson right now.');
        }
    });

    bot.command('resetcourse', async (ctx) => {
        try {
            await resetCourse(ctx.from.id);
            await ctx.reply('🔄 Your beginner course progress has been reset. Send /course to start again from Lesson 1.');
        } catch (error) {
            console.error('Course reset error:', error.message);
            await ctx.reply('🙏 I could not reset your course right now.');
        }
    });

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
            const progress = await getCourseProgress(ctx.from.id);
            const activeLesson = progress.active ? getLesson(progress.currentLesson) : null;
            const status = await usageOrReply(ctx);
            if (!status) return;
            await ctx.sendChatAction('typing');

            if (activeLesson) {
                const replyMessage = await getTutorResponse(buildTextPracticePrompt(activeLesson, userMessage), 'default');
                await replyLongText(ctx, replyMessage);
                await savePracticeAttempt(ctx.from.id, progress, false);
                await sendEnglishVoiceReply(ctx, replyMessage);
                return;
            }

            const currentMode = await getCurrentMode(ctx.from.id);
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
            const progress = await getCourseProgress(ctx.from.id);
            const activeLesson = progress.active ? getLesson(progress.currentLesson) : null;
            const status = await usageOrReply(ctx);
            if (!status) return;
            const currentMode = activeLesson ? 'default' : await getCurrentMode(ctx.from.id);
            await ctx.sendChatAction('typing');
            const fileId = ctx.message.voice.file_id;
            const fileLink = await ctx.telegram.getFileLink(fileId);
            const response = await fetch(fileLink.href);
            if (!response.ok) throw new Error(`Telegram file download failed: ${response.status}`);
            const buffer = Buffer.from(await response.arrayBuffer());
            const replyMessage = await getTutorResponseFromAudio(
                buffer,
                ctx.message.voice.mime_type || 'audio/ogg',
                currentMode,
                activeLesson ? buildVoicePracticePrompt(activeLesson) : ''
            );
            await replyLongText(ctx, replyMessage);
            if (activeLesson) {
                await savePracticeAttempt(ctx.from.id, progress, true);
                await sendEnglishVoiceReply(ctx, replyMessage);
            } else if (currentMode !== 'translator') {
                await sendEnglishVoiceReply(ctx, replyMessage);
            }
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
