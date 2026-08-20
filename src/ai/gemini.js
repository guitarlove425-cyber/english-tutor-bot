const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('../config');

if (!config.GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY is not configured. AI requests will fail until it is added.');
}

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY || 'missing-key');
const MAX_RETRIES_PER_MODEL = 2;
const BASE_RETRY_DELAY_MS = 350;
const TRANSIENT_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

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

function getModel(mode = 'default', modelName = config.GEMINI_MODEL) {
    const safeMode = VALID_MODES.has(mode) ? mode : 'default';
    return genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: personas[safeMode]
    });
}

function errorStatus(error) {
    const direct = Number(error?.status || error?.response?.status || error?.statusCode);
    if (Number.isInteger(direct) && direct > 0) return direct;
    const match = String(error?.message || '').match(/\[(\d{3})\]/);
    return match ? Number(match[1]) : null;
}

function isTransientError(error) {
    const status = errorStatus(error);
    if (status && TRANSIENT_STATUS_CODES.has(status)) return true;
    return /(high demand|temporarily unavailable|service unavailable|overloaded|rate.?limit|too many requests|timeout|timed out)/i.test(String(error?.message || ''));
}

function retryDelayMs(attempt) {
    return BASE_RETRY_DELAY_MS * (2 ** Math.max(0, Number(attempt) || 0));
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function modelCandidates() {
    return [...new Set([config.GEMINI_MODEL, config.GEMINI_FALLBACK_MODEL].filter(Boolean))];
}

function logGeminiError(operation, modelName, error, retrying = false) {
    console.error(`Gemini ${operation} API error:`, {
        model: modelName,
        name: error?.name || 'UnknownError',
        status: errorStatus(error),
        retrying,
        message: error?.message || 'Unknown Gemini error'
    });
}

async function generateWithRecovery(mode, operation, requestFactory) {
    let lastError = null;
    for (const modelName of modelCandidates()) {
        const model = getModel(mode, modelName);
        for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt += 1) {
            try {
                const result = await requestFactory(model);
                return result.response.text().trim();
            } catch (error) {
                lastError = error;
                const transient = isTransientError(error);
                const retrying = transient && attempt < MAX_RETRIES_PER_MODEL;
                logGeminiError(operation, modelName, error, retrying);
                if (!transient) break;
                if (retrying) await sleep(retryDelayMs(attempt));
            }
        }
    }
    const apiError = new Error('API_ERROR');
    apiError.cause = lastError;
    apiError.status = errorStatus(lastError);
    throw apiError;
}

async function getTutorResponse(userMessage, mode = 'default') {
    if (!String(userMessage || '').trim()) throw new Error('EMPTY_MESSAGE');
    return generateWithRecovery(mode, 'text', (model) => model.generateContent(String(userMessage)));
}

async function getTutorResponseFromAudio(audioBuffer, mimeType = 'audio/ogg', mode = 'default', customPrompt = '') {
    if (!audioBuffer || !audioBuffer.length) throw new Error('EMPTY_AUDIO');
    const prompt = customPrompt || (mode === 'ielts'
        ? 'Listen to the student’s IELTS answer. Evaluate pronunciation, grammar, vocabulary, and fluency, give a brief estimated band score, and ask the next question.'
        : mode === 'translator'
            ? 'Transcribe and translate this English voice message into Burmese. Output only the Burmese translation.'
            : 'Listen to this voice message. Gently correct pronunciation or grammar mistakes in Burmese, then reply in English to continue the conversation.');
    return generateWithRecovery(mode, 'audio', (model) => model.generateContent([
        prompt,
        { inlineData: { data: audioBuffer.toString('base64'), mimeType } }
    ]));
}

module.exports = {
    getTutorResponse,
    getTutorResponseFromAudio,
    VALID_MODES,
    errorStatus,
    isTransientError,
    retryDelayMs,
    modelCandidates
};
