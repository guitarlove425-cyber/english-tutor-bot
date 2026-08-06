const { getTutorResponse, getTutorResponseFromAudio } = require('../ai/gemini');
const googleTTS = require('google-tts-api'); 
const { Markup } = require('telegraf'); // Telegram ခလုတ်များအတွက်

// Database မသုံးသေးသဖြင့် User တွေရဲ့ Mode ကို ယာယီမှတ်ထားမည့် နေရာ
const userModes = {}; 

function setupHandlers(bot) {
    bot.start((ctx) => {
        // User အသစ်ရောက်လာရင် Default Mode ကို အလိုအလျောက် သတ်မှတ်ပေးမည်
        userModes[ctx.from.id] = 'default';
        const welcomeMessage = `Hello ${ctx.from.first_name}! 👋\n\nI am LinguistPro, your Premium AI Tutor.\n\nType /mode to select a specialized tutor (e.g., IELTS Examiner or Translator). Send a text or Voice Message to start!`;
        ctx.reply(welcomeMessage);
    });

    // Premium Feature - Mode ရွေးချယ်ရန် Command
    bot.command('mode', (ctx) => {
        ctx.reply('🌟 ကျေးဇူးပြု၍ အသုံးပြုလိုသော Premium Mode ကို ရွေးချယ်ပါ -', 
            Markup.inlineKeyboard([
                [Markup.button.callback('🧑‍🏫 Normal Tutor (LinguistPro)', 'set_default')],
                [Markup.button.callback('🎓 IELTS Examiner (Strict)', 'set_ielts')],
                [Markup.button.callback('📝 Subtitle Translator (Pro)', 'set_translator')]
            ])
        );
    });

    // User က ခလုတ်တစ်ခုခုကို နှိပ်လိုက်သည့်အခါ အလုပ်လုပ်မည့်အပိုင်း
    bot.action('set_default', (ctx) => {
        userModes[ctx.from.id] = 'default';
        ctx.reply('✅ ပုံမှန် အင်္ဂလိပ်စာဆရာ (LinguistPro) Mode သို့ ပြောင်းလဲပြီးပါပြီ။ စကားစပြောလို့ ရပါပြီ။');
    });

    bot.action('set_ielts', (ctx) => {
        userModes[ctx.from.id] = 'ielts';
        ctx.reply('✅ IELTS Examiner Mode သို့ ပြောင်းလဲပြီးပါပြီ။ "Let\'s start the interview" လို့ စပို့လိုက်ပါ။');
    });

    bot.action('set_translator', (ctx) => {
        userModes[ctx.from.id] = 'translator';
        ctx.reply('✅ Subtitle & Document Translator Mode သို့ ပြောင်းလဲပြီးပါပြီ။ ဘာသာပြန်လိုသော အင်္ဂလိပ်စာများကို ပို့ပေးပါ။');
    });

    // Text Message ဝင်လာလျှင်
    bot.on('text', async (ctx) => {
        const userMessage = ctx.message.text;
        const currentMode = userModes[ctx.from.id] || 'default'; // User ရဲ့ Mode ကို စစ်ဆေးခြင်း

        try {
            await ctx.sendChatAction('typing');
            
            // Mode ကိုပါ AI ဆီ ထည့်ပို့ပေးခြင်း
            const replyMessage = await getTutorResponse(userMessage, currentMode);
            await ctx.reply(replyMessage);

            // Translator Mode မဟုတ်ရင်သာ အသံဖိုင် (TTS) ပြန်ပို့ပေးမည်
            if (currentMode !== 'translator') {
                await ctx.sendChatAction('record_voice');
                const englishOnlyText = replyMessage.replace(/[^\x00-\x7F]/g, "").trim(); 
                if (englishOnlyText.length > 0) {
                     const audioUrl = googleTTS.getAudioUrl(englishOnlyText, {
                        lang: 'en', slow: false, host: 'https://translate.google.com',
                    });
                    await ctx.replyWithVoice(audioUrl);
                }
            }
        } catch (error) {
            console.error("Error processing text:", error);
            await ctx.reply("🙏 Sorry, I had a little trouble thinking. Can you say that again?");
        }
    });

    // Voice Message ဝင်လာလျှင်
    bot.on('voice', async (ctx) => {
        const currentMode = userModes[ctx.from.id] || 'default';

        try {
            await ctx.sendChatAction('typing');
            const fileId = ctx.message.voice.file_id;
            const fileLink = await ctx.telegram.getFileLink(fileId);
            const response = await fetch(fileLink.href);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Mode ကိုပါ AI ဆီ ထည့်ပို့ပေးခြင်း
            const replyMessage = await getTutorResponseFromAudio(buffer, "audio/ogg", currentMode);
            await ctx.reply(replyMessage);

            if (currentMode !== 'translator') {
                await ctx.sendChatAction('record_voice');
                const englishOnlyText = replyMessage.replace(/[^\x00-\x7F]/g, "").trim(); 
                if (englishOnlyText.length > 0) {
                     const audioUrl = googleTTS.getAudioUrl(englishOnlyText, {
                        lang: 'en', slow: false, host: 'https://translate.google.com',
                    });
                    await ctx.replyWithVoice(audioUrl);
                }
            }
        } catch (error) {
            console.error("Error processing voice:", error);
            await ctx.reply("🙏 Sorry, I couldn't hear that properly. Could you send the voice message again?");
        }
    });
}

module.exports = { setupHandlers };