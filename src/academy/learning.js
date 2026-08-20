const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];

function todayUtc() {
    return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
    const date = new Date(`${dateString}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
}

function parseVocabularyItems(value) {
    return String(value || '')
        .split(/[,;|]/)
        .map((item) => item.trim().replace(/^[\-–—•\d.\s]+/, ''))
        .filter((item) => item.length >= 2 && item.length <= 60)
        .slice(0, 12);
}

function seedWordBank(wordBank = [], vocabulary, date = todayUtc()) {
    const existing = Array.isArray(wordBank) ? wordBank : [];
    const byWord = new Map(existing.map((entry) => [String(entry.word || '').toLowerCase(), entry]));
    for (const word of parseVocabularyItems(vocabulary)) {
        const key = word.toLowerCase();
        if (!byWord.has(key)) {
            byWord.set(key, {
                id: `word_${Buffer.from(key).toString('base64url').slice(0, 18)}`,
                word,
                source: 'academy-lesson',
                firstSeen: date,
                dueDate: date,
                interval: 1,
                repetitions: 0,
                correct: 0,
                incorrect: 0,
                lastReviewed: null
            });
        }
    }
    return [...byWord.values()].slice(-200);
}

function getDueWords(wordBank = [], date = todayUtc()) {
    return (Array.isArray(wordBank) ? wordBank : [])
        .filter((entry) => !entry.dueDate || entry.dueDate <= date)
        .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
}

function reviewWord(entry, remembered, date = todayUtc()) {
    const current = entry || {};
    const repetitions = Number(current.repetitions || 0);
    const interval = remembered
        ? REVIEW_INTERVALS[Math.min(repetitions, REVIEW_INTERVALS.length - 1)]
        : 1;
    return {
        ...current,
        dueDate: addDays(date, interval),
        interval,
        repetitions: remembered ? repetitions + 1 : 0,
        correct: Number(current.correct || 0) + (remembered ? 1 : 0),
        incorrect: Number(current.incorrect || 0) + (remembered ? 0 : 1),
        lastReviewed: date
    };
}

function mergeReviewedWord(wordBank, updated) {
    return (Array.isArray(wordBank) ? wordBank : []).map((entry) => entry.id === updated.id ? updated : entry);
}

function clampScore(value, fallback = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(100, Math.round(number)));
}

const MASTERY_THRESHOLD = 70;
const MASTERY_SKILLS = Object.freeze(['grammar', 'vocabulary', 'speaking', 'fluency', 'pronunciation']);

function normalizeLessonMastery(value = {}) {
    const source = value && typeof value === 'object' ? value : {};
    return {
        attempts: Math.max(0, Number(source.attempts || 0)),
        checksPassed: Math.max(0, Number(source.checksPassed || 0)),
        bestScore: clampScore(source.bestScore, 0),
        lastScore: clampScore(source.lastScore, 0),
        lastAttempt: source.lastAttempt || null,
        mastered: Boolean(source.mastered),
        remediation: Array.isArray(source.remediation) ? source.remediation.slice(-5) : []
    };
}

function lessonMasteryKey(levelId, lessonNumber) {
    return `${levelId}-${lessonNumber}`;
}

function recordLessonEvidence(lessonMastery = {}, levelId, lessonNumber, evidence = {}) {
    const key = lessonMasteryKey(levelId, lessonNumber);
    const current = normalizeLessonMastery(lessonMastery[key]);
    const score = clampScore(evidence.score, current.lastScore);
    const remediation = Array.isArray(evidence.remediation) ? evidence.remediation.map(String).slice(-5) : current.remediation;
    const next = {
        ...current,
        attempts: current.attempts + 1,
        checksPassed: current.checksPassed + (evidence.checkPassed ? 1 : 0),
        bestScore: Math.max(current.bestScore, score),
        lastScore: score,
        lastAttempt: evidence.attemptedAt || new Date().toISOString(),
        remediation,
        mastered: current.mastered || Boolean(evidence.mastered) || (Math.max(current.bestScore, score) >= MASTERY_THRESHOLD && (current.checksPassed + (evidence.checkPassed ? 1 : 0)) >= 1)
    };
    return { ...lessonMastery, [key]: next };
}

function getLessonMastery(lessonMastery = {}, levelId, lessonNumber) {
    return normalizeLessonMastery((lessonMastery || {})[lessonMasteryKey(levelId, lessonNumber)]);
}

function lessonNeedsRemediation(lessonMastery = {}, levelId, lessonNumber) {
    const record = getLessonMastery(lessonMastery, levelId, lessonNumber);
    return record.attempts > 0 && !record.mastered;
}

function canAdvanceLesson(progress = {}, levelId, lessonNumber) {
    const record = getLessonMastery(progress.lessonMastery, levelId, lessonNumber);
    const session = progress.teacherSession || {};
    const hasTeacherEvidence = Number(session.attempts || 0) > 0 || Number(record.attempts || 0) > 0;
    return record.mastered || (hasTeacherEvidence && record.bestScore >= MASTERY_THRESHOLD) || (session.phase === 'homework' && Number(session.attempts || 0) >= 2);
}

function weakSkills(progress = {}) {
    const report = skillReport(progress);
    return MASTERY_SKILLS.filter((skill) => report[skill] < MASTERY_THRESHOLD);
}

function skillReport(progress = {}) {
    const quizAnswered = Number(progress.quizAnswered || 0);
    const quizCorrect = Number(progress.quizCorrect || 0);
    const quizScore = quizAnswered ? (quizCorrect / quizAnswered) * 100 : 0;
    const assessment = progress.lastAssessment || {};
    const pronunciation = progress.lastPronunciation || {};
    return {
        grammar: clampScore(progress.grammarScore ?? (assessment.grammar != null ? Number(assessment.grammar) * 10 : quizScore)),
        vocabulary: clampScore(progress.vocabularyScore ?? quizScore),
        speaking: clampScore(progress.speakingScore ?? (assessment.overall != null ? Number(assessment.overall) * 10 : progress.speakingAttempts ? 45 : 0)),
        fluency: clampScore(progress.fluencyScore ?? (assessment.fluency != null ? Number(assessment.fluency) * 10 : progress.speakingAttempts ? 40 : 0)),
        pronunciation: clampScore(progress.pronunciationScore ?? (pronunciation.score != null ? Number(pronunciation.score) * 10 : assessment.pronunciation != null ? Number(assessment.pronunciation) * 10 : 0)),
        consistency: clampScore(progress.consistencyScore ?? Math.min(100, Number(progress.streak || 0) * 10 + Number(progress.practiceAttempts || 0) * 2))
    };
}

module.exports = {
    REVIEW_INTERVALS,
    todayUtc,
    addDays,
    parseVocabularyItems,
    seedWordBank,
    getDueWords,
    reviewWord,
    mergeReviewedWord,
    skillReport,
    MASTERY_THRESHOLD,
    MASTERY_SKILLS,
    normalizeLessonMastery,
    lessonMasteryKey,
    recordLessonEvidence,
    getLessonMastery,
    lessonNeedsRemediation,
    canAdvanceLesson,
    weakSkills
};

// Pure helper module: no network access and safe to use in tests.
// eslint-disable-next-line no-unused-expressions
true;
