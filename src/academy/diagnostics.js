const DIAGNOSTIC_QUESTIONS = Object.freeze([
    { id: 'grammar_1', skill: 'grammar', title: 'ဝါကျတည်ဆောက်ပုံ', prompt: 'Write one English sentence about yourself using “I am …”.', hint: 'ဥပမာကို မကူးဘဲ ကိုယ့်အကြောင်းကို ရေးပါ။' },
    { id: 'vocabulary_1', skill: 'vocabulary', title: 'စကားလုံးအသုံးပြုမှု', prompt: 'Write one English sentence using the word “because”.', hint: 'အကြောင်းပြချက်တစ်ခု ထည့်ရေးပါ။' },
    { id: 'reading_1', skill: 'reading', prompt: 'Read this sentence and answer in English: “Mya goes to school by bus every morning.” Where does Mya go?', hint: 'ဝါကျထဲက နေရာကို ရှာပါ။' },
    { id: 'listening_1', skill: 'listening', prompt: 'Imagine your teacher says: “Please open your book to page five.” What should you do?', hint: 'လုပ်ရမယ့် action ကို English ဖြင့်ရေးပါ။' },
    { id: 'speaking_1', skill: 'speaking', prompt: 'Write what you would say when meeting a new friend for the first time.', hint: 'Greeting နဲ့ your name ပါအောင်ရေးပါ။' },
    { id: 'fluency_1', skill: 'fluency', prompt: 'Write three connected English sentences about your daily routine.', hint: 'First, then, and after that လို linking words သုံးနိုင်ပါတယ်။' }
]);

const DIAGNOSTIC_SKILLS = Object.freeze(['grammar', 'vocabulary', 'reading', 'listening', 'speaking', 'fluency']);

function clampScore(value) {
    const score = Number(value);
    return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
}

function normalizeDiagnosticState(state = {}) {
    const source = state && typeof state === 'object' ? state : {};
    const answers = Array.isArray(source.answers)
        ? source.answers.filter(Boolean).slice(-DIAGNOSTIC_QUESTIONS.length).map((answer) => ({
            questionId: String(answer.questionId || ''),
            skill: DIAGNOSTIC_SKILLS.includes(answer.skill) ? answer.skill : 'grammar',
            answer: String(answer.answer || '').slice(0, 1200),
            score: clampScore(answer.score),
            at: answer.at || null
        }))
        : [];
    const scores = {};
    for (const skill of DIAGNOSTIC_SKILLS) scores[skill] = clampScore(source.scores?.[skill]);
    for (const answer of answers) scores[answer.skill] = Math.max(scores[answer.skill], clampScore(answer.score));
    return {
        active: Boolean(source.active),
        completed: Boolean(source.completed),
        questionIndex: Math.max(0, Math.min(DIAGNOSTIC_QUESTIONS.length, Number(source.questionIndex || answers.length))),
        answers,
        scores,
        startedAt: source.startedAt || null,
        completedAt: source.completedAt || null,
        lastUpdatedAt: source.lastUpdatedAt || null
    };
}

function startDiagnostic(previous = {}) {
    const now = new Date().toISOString();
    return {
        ...normalizeDiagnosticState(previous),
        active: true,
        completed: false,
        questionIndex: 0,
        answers: [],
        scores: Object.fromEntries(DIAGNOSTIC_SKILLS.map((skill) => [skill, 0])),
        startedAt: now,
        completedAt: null,
        lastUpdatedAt: now
    };
}

function diagnosticQuestion(state = {}) {
    const normalized = normalizeDiagnosticState(state);
    return DIAGNOSTIC_QUESTIONS[normalized.questionIndex] || null;
}

function evaluateDiagnosticAnswer(question, answer) {
    const text = String(answer || '').trim();
    if (!text) return 0;
    const words = text.split(/\s+/).filter(Boolean);
    const englishLetters = (text.match(/[A-Za-z]/g) || []).length;
    const englishRatio = englishLetters / Math.max(1, text.replace(/\s/g, '').length);
    let score = Math.min(45, words.length * 9) + (englishRatio >= 0.65 ? 25 : englishRatio >= 0.35 ? 10 : 0);
    if (question?.skill === 'grammar' && /\b(i am|i'm|i work|i live)\b/i.test(text)) score += 25;
    if (question?.skill === 'vocabulary' && /because/i.test(text)) score += 20;
    if (question?.skill === 'reading' && /school/i.test(text)) score += 25;
    if (question?.skill === 'listening' && /open|book|page|read/i.test(text)) score += 25;
    if (question?.skill === 'speaking' && /hello|hi|name|nice/i.test(text)) score += 20;
    if (question?.skill === 'fluency' && words.length >= 12) score += 25;
    return clampScore(score);
}

function recordDiagnosticAnswer(state, question, answer, score = null) {
    const current = normalizeDiagnosticState(state);
    const item = question || diagnosticQuestion(current);
    if (!item) return current;
    const calculated = score == null ? evaluateDiagnosticAnswer(item, answer) : clampScore(score);
    const nextAnswers = [...current.answers.filter((entry) => entry.questionId !== item.id), {
        questionId: item.id,
        skill: item.skill,
        answer: String(answer || '').slice(0, 1200),
        score: calculated,
        at: new Date().toISOString()
    }];
    const nextIndex = Math.min(DIAGNOSTIC_QUESTIONS.length, Math.max(current.questionIndex + 1, nextAnswers.length));
    const completed = nextIndex >= DIAGNOSTIC_QUESTIONS.length;
    return normalizeDiagnosticState({
        ...current,
        active: !completed,
        completed,
        questionIndex: nextIndex,
        answers: nextAnswers,
        scores: { ...current.scores, [item.skill]: calculated },
        completedAt: completed ? new Date().toISOString() : null,
        lastUpdatedAt: new Date().toISOString()
    });
}

function diagnosticWeakSkills(state, threshold = 70) {
    const normalized = normalizeDiagnosticState(state);
    return DIAGNOSTIC_SKILLS.filter((skill) => normalized.scores[skill] < threshold)
        .sort((a, b) => normalized.scores[a] - normalized.scores[b]);
}

function diagnosticSummary(state) {
    const normalized = normalizeDiagnosticState(state);
    const weak = diagnosticWeakSkills(normalized);
    const average = Math.round(DIAGNOSTIC_SKILLS.reduce((sum, skill) => sum + normalized.scores[skill], 0) / DIAGNOSTIC_SKILLS.length);
    return { completed: normalized.completed, answered: normalized.answers.length, average, scores: normalized.scores, weakSkills: weak };
}

module.exports = {
    DIAGNOSTIC_QUESTIONS,
    DIAGNOSTIC_SKILLS,
    normalizeDiagnosticState,
    startDiagnostic,
    diagnosticQuestion,
    evaluateDiagnosticAnswer,
    recordDiagnosticAnswer,
    diagnosticWeakSkills,
    diagnosticSummary
};
