const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('../config');

if (!config.GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY is not configured. AI requests will fail until it is added.');
}

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY || 'missing-key');

const personas = {
    default: `You are LinguistPro, a professional and friendly English-speaking tutor for Myanmar students.
If the user speaks Burmese, explain corrections in Burmese and finish with a natural English question.
If the user makes an English mistake, correct it gently, show the corrected sentence, explain briefly, and continue the conversation in English.
Keep answers practical and concise enough for Telegram.`,
    ielts: `You are a strict but encouraging IELTS Speaking Examiner.
Ask IELTS Part 1, 2, or 3 questions one at a time and wait for the student's answer.
For each answer, assess grammar, vocabulary, fluency, and pronunciation when audio is provided.
Give a realistic estimated band score with brief feedback, then ask the next question.
Do not explain in Burmese unless the student asks.`,
    translator: `You are a professional English-to-Burmese translator.
Translate the supplied text accurately while preserving meaning, tone, line breaks, numbering, and SRT timestamps.
For SRT content, preserve every timestamp and subtitle block exactly and translate only subtitle dialogue.
Output only the translated content without commentary.`
};

const VALID_MODES = new Set(Object.keys(personas));

function getModel(mode = 'default') {
    const safeMode = VALID_MODES.has(mode) ? mode : 'default';
    return genAI.getGenerativeModel({
        model: config.GEMINI_MODEL,
        systemInstruction: personas[safeMode]
    });
}

async function getTutorResponse(userMessage, mode = 'default') {
    if (!String(userMessage || '').trim()) throw new Error('EMPTY_MESSAGE');
    try {
        const model = getModel(mode);
        const result = await model.generateContent(String(userMessage));
        return result.response.text().trim();
    } catch (error) {
        console.error('Gemini text API error:', error.message);
        throw new Error('API_ERROR');
    }
}

async function getTutorResponseFromAudio(audioBuffer, mimeType = 'audio/ogg', mode = 'default', customPrompt = '') {
    if (!audioBuffer || !audioBuffer.length) throw new Error('EMPTY_AUDIO');
    try {
        const model = getModel(mode);
        const prompt = customPrompt || (mode === 'ielts'
            ? 'Listen to the student’s IELTS answer. Evaluate pronunciation, grammar, vocabulary, and fluency, give a brief estimated band score, and ask the next question.'
            : mode === 'translator'
                ? 'Transcribe and translate this English voice message into Burmese. Output only the Burmese translation.'
                : 'Listen to this voice message. Gently correct pronunciation or grammar mistakes in Burmese, then reply in English to continue the conversation.');
        const result = await model.generateContent([
            prompt,
            { inlineData: { data: audioBuffer.toString('base64'), mimeType } }
        ]);
        return result.response.text().trim();
    } catch (error) {
        console.error('Gemini audio API error:', error.message);
        throw new Error('API_ERROR');
    }
}

module.exports = { getTutorResponse, getTutorResponseFromAudio, VALID_MODES };
