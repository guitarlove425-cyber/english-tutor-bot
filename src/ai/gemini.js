const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

// Premium Feature - AI စရိုက်လက္ခဏာ (၃) မျိုး ခွဲခြားသတ်မှတ်ခြင်း
const personas = {
    // ၁။ ပုံမှန် အင်္ဂလိပ်စာဆရာ (LinguistPro)
    default: `You are 'LinguistPro', a highly professional and friendly English speaking tutor for Myanmar students. 
    1. If the user speaks Burmese, reply in Burmese but end with an English question.
    2. If the user makes an English mistake, correct it gently and explain in BURMESE. Then continue in English.`,

    // ၂။ တင်းကျပ်သော IELTS စစ်ဆေးသူ
    ielts: `You are a strict IELTS Speaking Examiner. 
    1. Ask the user IELTS Part 1, 2, or 3 questions one by one.
    2. Wait for their answer. Do NOT explain in Burmese unless requested. 
    3. Evaluate their grammar, vocabulary, and fluency strictly, give them a band score for that answer, and ask the next question.`,

    // ၃။ ပရော်ဖက်ရှင်နယ် ဘာသာပြန် (Subtitle & Document)
    translator: `You are a strict Professional English-to-Burmese Translator.
    1. Translate any text or .srt subtitle files provided by the user.
    2. Maintain the original formatting, timecodes, and emotional tone perfectly.
    3. Output ONLY the translated text, without any additional chat or explanations.`
};

// User ရွေးချယ်ထားသော Mode ပေါ်မူတည်၍ AI Model ကို ပြောင်းလဲပေးမည့် Function
function getModel(mode) {
    return genAI.getGenerativeModel({
        model: "gemini-flash-latest", // အတည်ငြိမ်ဆုံး Model နာမည်
        systemInstruction: personas[mode] || personas.default
    });
}

// Text Message အတွက်
async function getTutorResponse(userMessage, mode = 'default') {
    try {
        const model = getModel(mode);
        const result = await model.generateContent(userMessage);
        return result.response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error("API_ERROR");
    }
}

// Voice Message အတွက် 
async function getTutorResponseFromAudio(audioBuffer, mimeType = "audio/ogg", mode = 'default') {
    try {
        const model = getModel(mode);
        const audioPart = {
            inlineData: {
                data: audioBuffer.toString("base64"),
                mimeType: mimeType
            }
        };
        
        // Mode ပေါ်မူတည်ပြီး AI ကို နားထောင်ခိုင်းမည့် Prompt ပြောင်းလဲခြင်း
        let prompt = "Please listen to this voice message and reply appropriately.";
        if (mode === 'ielts') prompt = "Listen to the student's IELTS answer, evaluate their pronunciation and fluency, give a quick score, and ask the next question.";
        if (mode === 'default') prompt = "Listen to this voice message. Correct any pronunciation or grammar mistakes gently in Burmese, and reply in English to keep the conversation going.";

        const result = await model.generateContent([prompt, audioPart]);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Audio API Error:", error);
        throw new Error("API_ERROR");
    }
}

module.exports = { getTutorResponse, getTutorResponseFromAudio };