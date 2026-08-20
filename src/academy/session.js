const TEACHER_PHASES = Object.freeze([
    { id: 'explain', label: 'ဆရာရှင်းပြချက်', instruction: 'အရင်ဆုံး အကြောင်းအရာကို နားလည်အောင် ရှင်းပြပါမယ်။' },
    { id: 'model', label: 'ဥပမာပြခြင်း', instruction: 'ဆရာက English ဥပမာနဲ့ အသံထွက်ကို ပြပါမယ်။' },
    { id: 'check', label: 'နားလည်မှုစစ်ခြင်း', instruction: 'နားလည်မလည် စစ်ရန် မေးခွန်းတိုတစ်ခု ဖြေပါ။' },
    { id: 'guided', label: 'အကူအညီဖြင့် လေ့ကျင့်ခြင်း', instruction: 'Hint နှင့် sentence starter ဖြင့် လိုက်လေ့ကျင့်ပါ။' },
    { id: 'independent', label: 'ကိုယ်တိုင်အသုံးချခြင်း', instruction: 'အခု သင်ကိုယ်တိုင် English ဖြင့် ပြောပါ သို့မဟုတ် ရေးပါ။' },
    { id: 'assess', label: 'အကဲဖြတ်ခြင်း', instruction: 'ဒီနေ့သင်ယူထားတာကို ဆရာက စစ်ဆေးပါမယ်။' },
    { id: 'homework', label: 'အိမ်စာ', instruction: 'နောက်တစ်ကြိမ်မလာမီ ဒီလေ့ကျင့်ခန်းကို လုပ်ပါ။' },
    { id: 'review', label: 'ပြန်လည်လေ့ကျင့်ခြင်း', instruction: 'နောက် lesson မစမီ အရင်သင်ခန်းစာကို ပြန်နွေးပါမယ်။' }
]);

const PHASE_IDS = new Set(TEACHER_PHASES.map((phase) => phase.id));

function phaseIndex(phaseId) {
    const index = TEACHER_PHASES.findIndex((phase) => phase.id === phaseId);
    return index >= 0 ? index : 0;
}

function phaseInfo(phaseId) {
    return TEACHER_PHASES.find((phase) => phase.id === phaseId) || TEACHER_PHASES[0];
}

function createTeacherSession(type, context = {}) {
    const now = new Date().toISOString();
    return {
        type,
        phase: 'explain',
        phaseIndex: 0,
        attempts: 0,
        hintsUsed: 0,
        checksPassed: 0,
        homeworkAssigned: false,
        startedAt: now,
        updatedAt: now,
        phaseHistory: [{ phase: 'explain', at: now }],
        ...context
    };
}

function normalizeTeacherSession(session, fallbackType = 'lesson') {
    const source = session && typeof session === 'object' ? session : {};
    const phase = PHASE_IDS.has(source.phase) ? source.phase : 'explain';
    return {
        ...createTeacherSession(source.type || fallbackType),
        ...source,
        phase,
        phaseIndex: phaseIndex(phase),
        attempts: Math.max(0, Number(source.attempts || 0)),
        hintsUsed: Math.max(0, Number(source.hintsUsed || 0)),
        checksPassed: Math.max(0, Number(source.checksPassed || 0)),
        phaseHistory: Array.isArray(source.phaseHistory) ? source.phaseHistory.slice(-20) : [{ phase, at: source.updatedAt || new Date().toISOString() }]
    };
}

function advanceTeacherSession(session, nextPhase = null, patch = {}) {
    const current = normalizeTeacherSession(session);
    const nextIndex = nextPhase && PHASE_IDS.has(nextPhase)
        ? phaseIndex(nextPhase)
        : Math.min(current.phaseIndex + 1, TEACHER_PHASES.length - 1);
    const info = TEACHER_PHASES[nextIndex];
    const now = new Date().toISOString();
    return {
        ...current,
        ...patch,
        phase: info.id,
        phaseIndex: nextIndex,
        updatedAt: now,
        phaseHistory: [...current.phaseHistory, { phase: info.id, at: now }].slice(-20)
    };
}

function isTeacherPhase(session, phase) {
    return normalizeTeacherSession(session).phase === phase;
}

function teacherPhaseMessage(session) {
    const info = phaseInfo(normalizeTeacherSession(session).phase);
    return `${info.label}: ${info.instruction}`;
}

function normalizeHomework(items = []) {
    return items
        .filter(Boolean)
        .map((item, index) => ({
            id: String(item.id || `homework_${index + 1}`).slice(0, 80),
            title: String(item.title || 'English လေ့ကျင့်ခန်း').slice(0, 160),
            instructions: String(item.instructions || 'ဒီလေ့ကျင့်ခန်းကို English ဖြင့် လုပ်ပါ။').slice(0, 600),
            dueDate: item.dueDate || null,
            completed: Boolean(item.completed),
            completedAt: item.completedAt || null
        }))
        .slice(0, 12);
}

function assignHomework(items, dueDate = null) {
    return normalizeHomework(items).map((item) => ({
        ...item,
        dueDate: item.dueDate || dueDate
    }));
}

function completeHomework(items, homeworkId) {
    const now = new Date().toISOString();
    return normalizeHomework(items).map((item) => item.id === String(homeworkId)
        ? { ...item, completed: true, completedAt: now }
        : item);
}

function scheduleReview(queue, item) {
    const source = Array.isArray(queue) ? queue : [];
    const existing = source.find((entry) => entry.id === String(item.id || '')) || {};
    const entry = {
        id: String(item.id || `review_${Date.now()}`),
        type: item.type || 'lesson',
        title: String(item.title || 'ပြန်လည်လေ့ကျင့်ရန်').slice(0, 160),
        dueDate: item.dueDate || existing.dueDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        reason: String(item.reason || 'ဒီနေ့သင်ခန်းစာကို ပြန်နွေးရန်').slice(0, 240),
        completed: false,
        completedAt: null
    };
    return [...source.filter((queued) => queued.id !== entry.id), entry].slice(-30);
}

function getDueReviews(queue = [], date = new Date().toISOString().slice(0, 10)) {
    return (Array.isArray(queue) ? queue : [])
        .filter((entry) => !entry.completed && (!entry.dueDate || entry.dueDate <= date))
        .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
}

function completeReview(queue = [], reviewId) {
    const completedAt = new Date().toISOString();
    return (Array.isArray(queue) ? queue : []).map((entry) => entry.id === String(reviewId)
        ? { ...entry, completed: true, completedAt }
        : entry);
}

module.exports = {
    TEACHER_PHASES,
    phaseInfo,
    phaseIndex,
    createTeacherSession,
    normalizeTeacherSession,
    advanceTeacherSession,
    isTeacherPhase,
    teacherPhaseMessage,
    normalizeHomework,
    assignHomework,
    completeHomework,
    scheduleReview,
    getDueReviews,
    completeReview
};
