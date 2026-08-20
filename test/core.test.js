const test = require('node:test');
const assert = require('node:assert/strict');

const { setupHandlers, splitMessage, englishSpeechChunks, mainKeyboard, academyKeyboard, modeReplyKeyboard, BUTTONS, normalizeQuiz, normalizeDailyPlan } = require('../src/bot/handlers');
const {
    checkUsageLimit,
    makeUserPremium,
    getUserMode,
    setUserMode,
    startCourse,
    getCourseProgress,
    completeCourseLesson,
    resetCourse,
    saveCourseProgress,
    saveAcademyProgress,
    exportUserData,
    deleteUserData
} = require('../src/database/firebase');
const { BEGINNER_COURSE, getLesson } = require('../src/course/content');
const { LEVELS, getLesson: getAcademyLesson, getNextLesson, levelIsPremium } = require('../src/academy/curriculum');
const { seedWordBank, getDueWords, reviewWord, skillReport } = require('../src/academy/learning');
const { TRACKS, getTrack, trackIsPremium } = require('../src/academy/tracks');

test('splitMessage keeps Telegram chunks under the configured limit', () => {
    const chunks = splitMessage('a'.repeat(8000), 3900);
    assert.equal(chunks.length, 3);
    assert.ok(chunks.every((chunk) => chunk.length <= 3900));
});

test('englishSpeechChunks removes Burmese characters and splits long audio text', () => {
    const chunks = englishSpeechChunks(`Hello မင်္ဂလာပါ ${'world '.repeat(500)}`);
    assert.ok(chunks.length > 1);
    assert.ok(chunks.every((chunk) => /^[\x00-\x7F]*$/.test(chunk)));
});

test('memory usage fallback enforces the daily free limit', async () => {
    const userId = `test-${Date.now()}`;
    for (let count = 1; count <= 5; count += 1) {
        const result = await checkUsageLimit(userId);
        assert.equal(result.allowed, true);
    }
    const blocked = await checkUsageLimit(userId);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
});

test('mode persistence and Premium day validation work', async () => {
    const userId = `mode-${Date.now()}`;
    await setUserMode(userId, 'ielts');
    assert.equal(await getUserMode(userId), 'ielts');
    await assert.rejects(() => makeUserPremium(userId, 0), /between 1 and 3650/);
    const expiry = await makeUserPremium(userId, 30);
    assert.match(expiry, /^\d{4}-\d{2}-\d{2}$/);
});

test('beginner course has 12 ordered lessons with practice content', () => {
    assert.equal(BEGINNER_COURSE.length, 12);
    assert.deepEqual(BEGINNER_COURSE.map((lesson) => lesson.id), Array.from({ length: 12 }, (_, index) => index + 1));
    assert.ok(BEGINNER_COURSE.every((lesson) => lesson.objective && lesson.practice && lesson.modelAnswer));
    assert.equal(getLesson(1).title, 'Greetings and Introductions');
});

test('course progress starts, advances, and resets in memory fallback', async () => {
    const userId = `course-${Date.now()}`;
    const started = await startCourse(userId);
    assert.equal(started.active, true);
    assert.equal(started.currentLesson, 1);
    const advanced = await completeCourseLesson(userId, 1, 8);
    assert.deepEqual(advanced.completedLessons, [1]);
    assert.equal(advanced.currentLesson, 2);
    assert.equal(advanced.lastScore, 8);
    const reset = await resetCourse(userId);
    assert.equal(reset.active, false);
    assert.deepEqual(reset.completedLessons, []);
    assert.equal((await getCourseProgress(userId)).currentLesson, 1);
});

test('quiz normalization accepts four-option questions and rejects malformed questions', () => {
    const valid = normalizeQuiz({ question: 'Choose the correct sentence.', options: ['I am student.', 'I am a student.', 'I student.', 'I is student.'], answerIndex: 1, explanation: 'Use a before a singular job or identity noun.' });
    assert.equal(valid.answerIndex, 1);
    assert.equal(valid.options.length, 4);
    assert.equal(normalizeQuiz({ question: 'Broken', options: ['A'], answerIndex: 0 }), null);
    assert.equal(normalizeQuiz({ question: 'Broken', options: ['A', 'B', 'C', 'D'], answerIndex: 4 }), null);
});

test('daily plan normalization creates measurable tasks and rejects invalid plans', () => {
    const plan = normalizeDailyPlan({ date: '2026-08-20', focus: 'Speaking confidence', totalMinutes: 99, tasks: [
        { type: 'speaking', title: 'Self introduction', minutes: 10, instructions: 'Speak for one minute.' },
        { type: 'listening', title: 'Shadowing', minutes: 8, instructions: 'Repeat the sample aloud.' },
        { type: 'vocabulary', title: 'Daily words', minutes: 6, instructions: 'Use five new words.' },
        { type: 'grammar', title: 'Be verb review', minutes: 7, instructions: 'Make five sentences.' }
    ] }, '2026-08-20');
    assert.equal(plan.date, '2026-08-20');
    assert.equal(plan.tasks.length, 4);
    assert.equal(plan.totalMinutes, 31);
    assert.equal(normalizeDailyPlan({ tasks: [] }, '2026-08-20'), null);
});

test('spaced repetition seeds, schedules, and reports learner skills', () => {
    const words = seedWordBank([], 'greetings, introductions, confidence', '2026-08-20');
    assert.equal(words.length, 3);
    assert.equal(getDueWords(words, '2026-08-20').length, 3);
    const reviewed = reviewWord(words[0], true, '2026-08-20');
    assert.equal(reviewed.dueDate, '2026-08-21');
    assert.equal(reviewed.repetitions, 1);
    const report = skillReport({ quizAnswered: 10, quizCorrect: 8, speakingAttempts: 3, streak: 4, lastAssessment: { grammar: 7, fluency: 6, pronunciation: 5, overall: 6 } });
    assert.equal(report.grammar, 70);
    assert.equal(report.vocabulary, 80);
    assert.equal(report.speaking, 60);
    assert.ok(report.consistency > 0);
});

test('learning tracks expose free and Premium paths', () => {
    assert.equal(TRACKS.length, 6);
    assert.equal(getTrack('general').premium, false);
    assert.equal(getTrack('job-interview').title, 'Job Interview');
    assert.equal(trackIsPremium('ielts'), true);
    assert.equal(trackIsPremium('travel'), false);
});

test('academy curriculum covers Starter through Advanced/Pro with Premium gating', () => {
    assert.equal(LEVELS.length, 6);
    assert.deepEqual(LEVELS.map((level) => level.cefr), ['A0', 'A1', 'A2', 'B1', 'B2', 'C1+']);
    assert.equal(LEVELS.reduce((sum, level) => sum + level.lessons.length, 0), 36);
    assert.equal(getAcademyLesson('starter', 1).title, 'Greetings and names');
    assert.equal(getNextLesson('starter', 6).levelId, 'elementary');
    assert.equal(levelIsPremium('starter'), false);
    assert.equal(levelIsPremium('advanced-pro'), true);
});

test('academy progress persists placement, points, assessment, and reset in memory fallback', async () => {
    const userId = `academy-${Date.now()}`;
    const { startAcademy, getAcademyProgress, saveAcademyProgress, resetAcademy } = require('../src/database/firebase');
    const started = await startAcademy(userId);
    assert.equal(started.active, true);
    const placed = await saveAcademyProgress(userId, { ...started, placementCompleted: true, levelId: 'intermediate', lessonNumber: 2, points: 120, streak: 3 });
    assert.equal(placed.levelId, 'intermediate');
    const saved = await getAcademyProgress(userId);
    assert.equal(saved.points, 120);
    assert.equal(saved.trackId, 'general');
    assert.deepEqual(saved.dailyPlanCompleted, []);
    await resetAcademy(userId);
    const reset = await getAcademyProgress(userId);
    assert.equal(reset.active, false);
    assert.equal(reset.levelId, 'starter');
});

test('privacy export and deletion remove learner records in memory fallback', async () => {
    const userId = `privacy-${Date.now()}`;
    await saveCourseProgress(userId, { active: true, currentLesson: 3 });
    await saveAcademyProgress(userId, { active: true, wordBank: [{ id: 'word_1', word: 'hello' }] });
    const exported = await exportUserData(userId);
    assert.equal(exported.courseProgress.currentLesson, 3);
    assert.equal(exported.academyProgress.wordBank.length, 1);
    await deleteUserData(userId);
    const after = await exportUserData(userId);
    assert.equal(after.courseProgress.active, false);
    assert.equal(after.academyProgress.active, false);
});

test('reply keyboards are constructed with persistent Telegram layouts', () => {
    const main = mainKeyboard();
    const academy = academyKeyboard();
    const mode = modeReplyKeyboard();
    assert.ok(main.reply_markup.keyboard.length >= 3);
    assert.ok(academy.reply_markup.keyboard.length >= 4);
    assert.equal(main.reply_markup.resize_keyboard, true);
    assert.equal(academy.reply_markup.is_persistent, true);
    assert.deepEqual(mode.reply_markup.keyboard.flat(), [
        BUTTONS.mode.normal,
        BUTTONS.mode.ielts,
        BUTTONS.mode.translator,
        BUTTONS.academy.home
    ]);
});

test('Academy Telegram handlers register all public flows', () => {
    const registered = { commands: [], actions: [], events: [], hears: [] };
    const fakeBot = {
        start: () => {},
        help: () => {},
        command: (name) => registered.commands.push(name),
        action: (name) => registered.actions.push(name),
        on: (name) => registered.events.push(name),
        hears: (label) => registered.hears.push(label),
        handleUpdate: async () => {},
        telegram: { sendMessage: async () => {} }
    };
    setupHandlers(fakeBot);
    for (const command of ['academy', 'levels', 'academylesson', 'academyquiz', 'coach', 'dailyplan', 'wordbank', 'pronunciation', 'skillreport', 'tracks', 'privacy', 'exportdata', 'deletedata', 'nextacademylesson', 'academyprogress', 'academyreview', 'academyassessment', 'academyroleplay', 'academycertificate', 'academyreset', 'mode_normal', 'mode_ielts', 'mode_translator']) {
        assert.ok(registered.commands.includes(command), `missing /${command}`);
    }
    assert.ok(registered.events.includes('text'));
    assert.ok(registered.events.includes('voice'));
    assert.ok(registered.hears.includes('🏫 Speaking Academy'));
    assert.ok(registered.hears.includes('📘 ဒီသင်ခန်းစာ'));
    assert.ok(registered.hears.includes('➡️ နောက်သင်ခန်းစာ'));
    assert.ok(registered.hears.includes(BUTTONS.mode.normal));
    assert.ok(registered.hears.includes(BUTTONS.mode.ielts));
    assert.ok(registered.hears.includes(BUTTONS.mode.translator));
    assert.ok(registered.hears.includes(BUTTONS.academy.quiz));
    assert.ok(registered.hears.includes(BUTTONS.academy.coach));
    assert.ok(registered.hears.includes(BUTTONS.academy.dailyPlan));
    assert.ok(registered.hears.includes(BUTTONS.academy.wordBank));
    assert.ok(registered.hears.includes(BUTTONS.academy.pronunciation));
    assert.ok(registered.hears.includes(BUTTONS.academy.report));
    assert.ok(registered.hears.includes(BUTTONS.academy.tracks));
    assert.ok(registered.hears.includes(BUTTONS.main.privacy));
});
