const { getTutorResponse, getTutorResponseFromAudio } = require('../ai/gemini');
const googleTTS = require('google-tts-api'); 
const { Markup } = require('telegraf'); 
// Database ထဲမှ Function ၃ ခုလုံးကို ခေါ်ယူခြင်း
const { checkUsageLimit, makeUserPremium, ADMIN_ID } = require('../database/firebase');

const userModes = {}; 

function setupHandlers(bot) {
    bot.start((ctx) => {
        userModes[ctx.from.id] = 'default';
        const welcomeMessage = `Hello ${ctx.from.first_name}! 👋\n\nI am LinguistPro, your Premium AI Tutor.\n\nType /mode to select a specialized tutor (e.g., IELTS Examiner or Translator). Send a text or Voice Message to start!`;
        ctx.reply(welcomeMessage);
    });

    bot.command('mode', (ctx) => {
        ctx.reply('🌟 ကျေးဇူးပြု၍ အသုံးပြုလိုသော Premium Mode ကို ရွေးချယ်ပါ -', 
            Markup.inlineKeyboard([
                [Markup.button.callback('🧑‍🏫 Normal Tutor (LinguistPro)', 'set_default')],
                [Markup.button.callback('🎓 IELTS Examiner (Strict)', 'set_ielts')],
                [Markup.button.callback('📝 Subtitle Translator (Pro)', 'set_translator')]
            ])
        );
    });

    // ----------------------------------------------------
    // ထပ်တိုး Command များ (Premium စနစ်အတွက်)
    // ----------------------------------------------------
    
    // User က သူ၏ Telegram ID ကို ကြည့်ရန်
    bot.command('myid', (ctx) => {
        ctx.reply(`🆔 သင့်ရဲ့ Telegram ID ကတော့: ${ctx.from.id} ဖြစ်ပါတယ်။\nPremium ဝယ်ယူလိုပါက ဤ ID ကို Admin ထံ ပေးပို့ပါ။`);
    });

    // Admin က User ကို Premium အဆင့်မြှင့်ပေးရန် (ဥပမာ: /upgrade 123456789 30)
    bot.command('upgrade', async (ctx) => {
        // Admin ID နဲ့ ကိုက်ညီမှု မရှိရင် တားမည်
        if (ctx.from.id !== ADMIN_ID) {
            return ctx.reply("❌ သင်သည် Admin မဟုတ်ပါ။ ဤ Command ကို သုံးခွင့်မရှိပါ။");
        }

        // /upgrade အနောက်က စာသားများကို ခွဲထုတ်ခြင်း
        const parts = ctx.message.text.split(' ');
        if (parts.length < 2) {
            return ctx.reply("⚠️ အသုံးပြုပုံ မှားယွင်းနေပါသည်။ ဥပမာ - /upgrade 123456789 30");
        }

        const targetUserId = parts[1]; // User ID ကို ရယူခြင်း
        const days = parts[2] ? parseInt(parts[2]) : 30; // ရက်မထည့်ရင် default 30 ရက် သတ်မှတ်ခြင်း

        try {
            const expiryDate = await makeUserPremium(targetUserId, days);
            ctx.reply(`✅ အောင်မြင်ပါသည်။ User ID: ${targetUserId} ကို ${days} ရက်စာ Premium သတ်မှတ်ပေးလိုက်ပါပြီ။\nကုန်ဆုံးမည့်ရက်: ${expiryDate}`);
            
            // User ဆီကိုပါ Premium ရကြောင်း လှမ်းအကြောင်းကြားပေးမည်
            bot.telegram.sendMessage(targetUserId, `🎉 **ဂုဏ်ယူပါသည်!** \n\nသင်၏ အကောင့်ကို Premium အဖြစ် ရက်ပေါင်း (${days}) အသုံးပြုခွင့် မြှင့်တင်ပေးလိုက်ပါသည်။ ယခုမှစ၍ အကန့်အသတ်မရှိ (Unlimited) အသုံးပြုနိုင်ပါပြီ။`).catch(() => {});
        } catch (error) {
            console.error("Upgrade error:", error);
            ctx.reply("❌ Error ဖြစ်သွားပါသည်။ Database ကို စစ်ဆေးပါ။");
        }
    });
    // ----------------------------------------------------

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

    bot.on('text', async (ctx) => {
        const userMessage = ctx.message.text;
        const currentMode = userModes[ctx.from.id] || 'default';

        try {
            const limitStatus = await checkUsageLimit(ctx.from.id);
            if (!limitStatus.allowed) {
                return ctx.reply("⏳ တောင်းပန်ပါတယ်။ သင်၏ ယနေ့ အခမဲ့ (Free) အသုံးပြုခွင့် (၅) ကြိမ် ပြည့်သွားပါပြီ။ \n\nမနက်ဖြန်မှ ထပ်မံအသုံးပြုပေးပါ (သို့မဟုတ်) Premium သို့ ပြောင်းလဲပါ။");
            } 

            await ctx.sendChatAction('typing');
            const replyMessage = await getTutorResponse(userMessage, currentMode);
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
            console.error("Error processing text:", error);
            await ctx.reply("🙏 Sorry, I had a little trouble thinking. Can you say that again?");
        }
    });

    bot.on('voice', async (ctx) => {
        const currentMode = userModes[ctx.from.id] || 'default';

        try {
            const limitStatus = await checkUsageLimit(ctx.from.id);
            if (!limitStatus.allowed) {
                return ctx.reply("⏳ တောင်းပန်ပါတယ်။ သင်၏ ယနေ့ အခမဲ့ (Free) အသုံးပြုခွင့် (၅) ကြိမ် ပြည့်သွားပါပြီ။ \n\nမနက်ဖြန်မှ ထပ်မံအသုံးပြုပေးပါ (သို့မဟုတ်) Premium သို့ ပြောင်းလဲပါ။");
            } 

            await ctx.sendChatAction('typing');
            const fileId = ctx.message.voice.file_id;
            const fileLink = await ctx.telegram.getFileLink(fileId);
            const response = await fetch(fileLink.href);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

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