const { getTutorResponse, getTutorResponseFromAudio } = require('../ai/gemini');
const googleTTS = require('google-tts-api'); 

function setupHandlers(bot) {
    bot.start((ctx) => {
        const welcomeMessage = `Hello ${ctx.from.first_name}! 👋\n\nI am Linguist AI, your personal English speaking tutor.\nWe can chat casually, practice job interviews, or improve your grammar.\n\nSend me a text or a VOICE MESSAGE in English to get started!`;
        ctx.reply(welcomeMessage);
    });

    // 1. Text Message ဝင်လာလျှင် အလုပ်လုပ်မည့်အပိုင်း (မူလရှိပြီးသား)
    bot.on('text', async (ctx) => {
        const userMessage = ctx.message.text;
        try {
            await ctx.sendChatAction('typing');
            const replyMessage = await getTutorResponse(userMessage);
            await ctx.reply(replyMessage);

            await ctx.sendChatAction('record_voice');
            const englishOnlyText = replyMessage.replace(/[^\x00-\x7F]/g, "").trim(); 
            if (englishOnlyText.length > 0) {
                 const audioUrl = googleTTS.getAudioUrl(englishOnlyText, {
                    lang: 'en', 
                    slow: false, 
                    host: 'https://translate.google.com',
                });
                await ctx.replyWithVoice(audioUrl);
            }
        } catch (error) {
            console.error("Error processing text:", error);
            await ctx.reply("🙏 Sorry, I had a little trouble thinking. Can you say that again?");
        }
    });

    // 2. ထပ်တိုးအပိုင်း - Voice Message (အသံဖိုင်) ဝင်လာလျှင် အလုပ်လုပ်မည့်အပိုင်း
    bot.on('voice', async (ctx) => {
        try {
            await ctx.sendChatAction('typing');

            // Telegram ဆီမှ အသံဖိုင်၏ ID ကို ယူခြင်း
            const fileId = ctx.message.voice.file_id;
            
            // ထို ID ကိုအသုံးပြု၍ အသံဖိုင် Download လုပ်ရမည့် Link ကို တောင်းယူခြင်း
            const fileLink = await ctx.telegram.getFileLink(fileId);

            // အသံဖိုင်ကို Download ဆွဲခြင်း (Buffer Data အဖြစ်ပြောင်းခြင်း)
            const response = await fetch(fileLink.href);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Download ဆွဲထားသော အသံဖိုင်ကို Gemini ဆီသို့ ပို့၍ အဖြေတောင်းခြင်း
            // (Telegram ၏ Voice Message များသည် အမြဲတမ်း audio/ogg format ဖြစ်သည်)
            const replyMessage = await getTutorResponseFromAudio(buffer, "audio/ogg");

            // AI ပြန်ဖြေသော စာကို User ဆီ ပြန်ပို့ခြင်း
            await ctx.reply(replyMessage);

            // ထိုစာကို AI ကပါ အသံထွက်ဖတ်ပြစေရန် (TTS)
            await ctx.sendChatAction('record_voice');
            const englishOnlyText = replyMessage.replace(/[^\x00-\x7F]/g, "").trim(); 
            if (englishOnlyText.length > 0) {
                 const audioUrl = googleTTS.getAudioUrl(englishOnlyText, {
                    lang: 'en', 
                    slow: false, 
                    host: 'https://translate.google.com',
                });
                await ctx.replyWithVoice(audioUrl);
            }

        } catch (error) {
            console.error("Error processing voice:", error);
            await ctx.reply("🙏 Sorry, I couldn't hear that properly. Could you send the voice message again?");
        }
    });
}

module.exports = { setupHandlers };