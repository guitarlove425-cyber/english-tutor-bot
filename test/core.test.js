const test = require('node:test');
const assert = require('node:assert/strict');

const { setupHandlers, splitMessage, englishSpeechChunks, mainKeyboard, learningKeyboard, practiceKeyboard, progressKeyboard, profileKeyboard, courseKeyboard, moreKeyboard, privacyKeyboard, classroomKeyboard, adminKeyboard, academyKeyboard, modeReplyKeyboard, BUTTONS, normalizeQuiz, normalizeDailyPlan, isAdminUser } = require('../src/bot/handlers');
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
    getKidsProgress,
    saveKidsProgress,
    startKids,
    resetKids,
    exportUserData,
    deleteUserData,
    createClassroom,
    joinClassroom,
    getClassroomDashboard
} = require('../src/database/firebase');
const { BEGINNER_COURSE, getLesson } = require('../src/course/content');
const { LEVELS, getLesson: getAcademyLesson, getNextLesson, levelIsPremium } = require('../src/academy/curriculum');
const { seedWordBank, getDueWords, reviewWord, skillReport, recordLessonEvidence, getLessonMastery, lessonNeedsRemediation, canAdvanceLesson, weakSkills } = require('../src/academy/learning');
const { TRACKS, getTrack, trackIsPremium } = require('../src/academy/tracks');
const { normalizeClassCode, studentSummary } = require('../src/classroom/classroom');
const { buildAcademyTextPrompt, buildAcademyVoicePrompt, buildCoachPrompt, buildCoachVoicePrompt, buildDailyPlanPrompt, buildTeacherPhasePrompt, buildRemediationPrompt, buildQuizFeedbackPrompt, buildRoleplayPrompt, buildAssessmentPrompt, buildProjectPrompt } = require('../src/academy/teacher');
const { createTeacherSession, advanceTeacherSession, normalizeHomework, completeHomework, scheduleReview, getDueReviews, completeReview } = require('../src/academy/session');
const { errorStatus, isTransientError, retryDelayMs, modelCandidates } = require('../src/ai/gemini');
const { normalizeLearnerProfile, recommendTeachingMode, profileSummary } = require('../src/academy/orchestrator');
const { DIAGNOSTIC_QUESTIONS, startDiagnostic, diagnosticQuestion, recordDiagnosticAnswer, diagnosticSummary } = require('../src/academy/diagnostics');
const { PROJECTS, startProject, recordProjectSubmission, projectReadiness, projectSummary } = require('../src/academy/projects');
const { healthMetrics, recordRequest, recordSuccess, recordFailure, recordFallback } = require('../src/ops/metrics');
const { KIDS_STAGES, KIDS_COURSE, getKidsLesson, getKidsStage } = require('../src/kids/content');
const { buildKidsLessonPrompt, buildKidsVoicePrompt, buildKidsReviewPrompt, buildKidsProgressPrompt } = require('../src/kids/teacher');
const { buildTextPracticePrompt, buildVoicePracticePrompt } = require('../src/course/teacher');

test('baseline diagnostics record six skills and produce a summary', () => {
    let state = startDiagnostic();
    assert.equal(DIAGNOSTIC_QUESTIONS.length, 6);
    assert.equal(diagnosticQuestion(state).skill, 'grammar');
    for (const question of DIAGNOSTIC_QUESTIONS) state = recordDiagnosticAnswer(state, question, 'I am learning English because I want to speak clearly.');
    const summary = diagnosticSummary(state);
    assert.equal(state.completed, true);
    assert.equal(summary.answered, 6);
    assert.ok(Array.isArray(summary.weakSkills));
});

test('real-life projects use rubric readiness and completion thresholds', () => {
    const project = PROJECTS[0];
    let state = startProject({}, project.id);
    assert.equal(projectReadiness(state).ready, false);
    state = recordProjectSubmission(state, project.id, { clarity: 8, grammar: 8, vocabulary: 8, fluency: 8, pronunciation: 8, taskCompletion: 8 }, 'ကောင်းပါတယ်။', 'နောက် project ကိုလုပ်ပါ။');
    assert.equal(projectReadiness(state, project.id).ready, true);
    assert.equal(projectSummary(state).completed, 1);
});

test('health metrics expose safe AI reliability counters', () => {
    const before = healthMetrics();
    recordRequest();
    recordSuccess('test-model', 'text');
    recordFailure('audio', 'test-model', 503, true);
    recordFallback();
    const after = healthMetrics();
    assert.equal(after.requests, before.requests + 1);
    assert.equal(after.successes, before.successes + 1);
    assert.equal(after.failures, before.failures + 1);
    assert.equal(after.fallbackAttempts, before.fallbackAttempts + 1);
    assert.equal(after.lastError.status, 503);
});

test('Kids pathway covers Discovery through Young Pro with child-safe prompts', async () => {
    assert.equal(KIDS_STAGES.length, 6);
    assert.equal(KIDS_COURSE.length, 30);
    assert.equal(getKidsLesson(1).stageId, 'discovery');
    assert.equal(getKidsLesson(30).stageId, 'pro');
    assert.equal(getKidsStage('academic').cefr, 'B1-B2');
    assert.match(buildKidsLessonPrompt(getKidsLesson(1), getKidsStage('discovery').title), /Myanmar child/);
    assert.match(buildKidsVoicePrompt(getKidsLesson(1), 'Discovery English'), /Do not shame/);
    assert.match(buildKidsProgressPrompt({ currentLesson: 1 }, 0, 30), /trusted adult/);
    const userId = `kids-${Date.now()}`;
    const started = await startKids(userId, '6-9');
    assert.equal(started.active, true);
    assert.equal(started.ageBand, '6-9');
    const saved = await saveKidsProgress(userId, { ...started, lessonNumber: 3, completedLessons: [1, 2] });
    assert.equal((await getKidsProgress(userId)).lessonNumber, 3);
    await resetKids(userId);
    assert.equal((await getKidsProgress(userId)).active, false);
});

test('learner profiles normalize safely and orchestrator recommendations target weak skills', () => {
    const profile = normalizeLearnerProfile({ goal: 'exam', dailyMinutes: 300, preferredPractice: 'voice', confidence: 'low' });
    assert.equal(profile.goal, 'exam');
    assert.equal(profile.dailyMinutes, 120);
    assert.equal(profile.preferredPractice, 'voice');
    assert.match(profileSummary(profile), /IELTS\/TOEFL/);
    const recommendation = recommendTeachingMode({ learnerProfile: profile, speakingScore: 30, pronunciationScore: 50, fluencyScore: 40, consistencyScore: 30 });
    assert.equal(recommendation.mode, 'confidence_builder');
    assert.ok(Array.isArray(recommendation.weakSkills));
});

test('Gemini transient errors are recognized and retry delays remain bounded', () => {
    assert.equal(errorStatus({ message: 'Service unavailable [503]' }), 503);
    assert.equal(isTransientError({ status: 503, message: 'high demand' }), true);
    assert.equal(isTransientError({ status: 401, message: 'invalid API key' }), false);
    assert.equal(retryDelayMs(0), 350);
    assert.equal(retryDelayMs(2), 1400);
    assert.ok(modelCandidates().length >= 1);
});

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
    assert.equal(normalizeQuiz({ question: 'Duplicate', options: ['A', 'A', 'B', 'C'], answerIndex: 0 }), null);
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

test('mastery evidence records attempts, weak skills, remediation, and advancement eligibility', () => {
    let lessonMastery = {};
    lessonMastery = recordLessonEvidence(lessonMastery, 'starter', 1, { score: 55, remediation: ['grammar', 'speaking'] });
    assert.equal(getLessonMastery(lessonMastery, 'starter', 1).bestScore, 55);
    assert.equal(lessonNeedsRemediation(lessonMastery, 'starter', 1), true);
    assert.equal(canAdvanceLesson({ lessonMastery }, 'starter', 1), false);
    lessonMastery = recordLessonEvidence(lessonMastery, 'starter', 1, { score: 82, checkPassed: true });
    assert.equal(getLessonMastery(lessonMastery, 'starter', 1).mastered, true);
    assert.equal(canAdvanceLesson({ lessonMastery }, 'starter', 1), true);
    assert.deepEqual(weakSkills({ quizAnswered: 10, quizCorrect: 9, speakingScore: 40, grammarScore: 50 }), ['grammar', 'speaking', 'fluency', 'pronunciation']);
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
    const { startAcademy,     getAcademyProgress,
    saveAcademyProgress,
    getKidsProgress,
    saveKidsProgress,
    startKids,
    resetKids, resetAcademy } = require('../src/database/firebase');
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

test('classrooms support teacher creation, student joining, and dashboard summaries', async () => {
    const teacherId = `teacher-${Date.now()}`;
    const studentId = `student-${Date.now()}`;
    const classroom = await createClassroom(teacherId, 'Speaking Class');
    assert.equal(normalizeClassCode(` ${classroom.code.toLowerCase()} `), classroom.code);
    await saveAcademyProgress(studentId, { active: true, levelId: 'elementary', completedLessons: [1, 2], quizAnswered: 4, quizCorrect: 3, points: 80, streak: 2 });
    const joined = await joinClassroom(studentId, classroom.code);
    assert.equal(joined.students.includes(studentId), true);
    const dashboard = await getClassroomDashboard(joined);
    assert.equal(dashboard.studentCount, 1);
    assert.equal(dashboard.students[0].quizAccuracy, 75);
    assert.equal(studentSummary({ active: true, completedLessons: [1] }, studentId).completionPercent, 3);
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

test('teacher-led sessions progress through classroom phases and persist homework/review data', () => {
    const session = createTeacherSession('academy_lesson', { lessonId: 'starter-1' });
    assert.equal(session.phase, 'explain');
    const guided = advanceTeacherSession(session, 'guided');
    assert.equal(guided.phase, 'guided');
    const homework = normalizeHomework([{ id: 'hw1', title: 'Speaking', instructions: 'English ဖြင့် ပြောပါ။' }]);
    assert.equal(completeHomework(homework, 'hw1')[0].completed, true);
    assert.equal(scheduleReview([], { id: 'starter-1', title: 'Greetings', dueDate: '2026-08-20' })[0].id, 'starter-1');
    const queue = scheduleReview([{ id: 'other', title: 'Other', dueDate: '2026-08-19' }], { id: 'starter-1', title: 'Greetings', dueDate: '2026-08-20' });
    assert.equal(queue.length, 2);
    assert.equal(getDueReviews(queue, '2026-08-20')[0].id, 'other');
    const completedQueue = completeReview(queue, 'other');
    assert.equal(getDueReviews(completedQueue, '2026-08-20').some((item) => item.id === 'other'), false);
});

test('Burmese-first prompts preserve English practice content', () => {
    const lesson = { number: 1, title: 'Greetings', objective: 'Introduce yourself', grammar: 'be', vocabulary: 'hello, name', speakingTask: 'Say: Hello, my name is...' };
    const level = { title: 'Starter', cefr: 'A0' };
    assert.match(buildAcademyTextPrompt(lesson, level, 'Hello'), /Burmese/);
    assert.match(buildAcademyTextPrompt(lesson, level, 'Hello'), /မြန်မာ/);
    assert.match(buildCoachPrompt(level, 'How can I practice?', { title: 'General English', description: 'Everyday English' }), /Burmese/);
    assert.match(buildDailyPlanPrompt(level, lesson, {}, '2026-08-20'), /Burmese/);
    assert.match(buildTeacherPhasePrompt(level, lesson, 'explain'), /teacher-led/);
    assert.match(buildRemediationPrompt(level, lesson, ['speaking']), /Weak skills to target/);
});

test('teacher prompts require detailed classroom explanation and one next action', () => {
    const lesson = { id: 1, number: 1, title: 'Greetings', objective: 'Introduce yourself', grammar: 'be', vocabulary: 'hello, name', speakingTask: 'Say: Hello, my name is...', explanation: 'Use this pattern to introduce yourself.', practice: 'Say your name.', modelAnswer: 'Hello, my name is Aye.', model: 'Hello, my name is Aye.' };
    const level = { title: 'Starter', cefr: 'A0' };
    const prompts = [
        buildAcademyTextPrompt(lesson, level, 'Hello'),
        buildAcademyVoicePrompt(lesson, level),
        buildCoachPrompt(level, 'How can I practice?', { title: 'General English', description: 'Everyday English' }),
        buildCoachVoicePrompt(level),
        buildTeacherPhasePrompt(level, lesson, 'explain'),
        buildRemediationPrompt(level, lesson, ['speaking']),
        buildQuizFeedbackPrompt(level, lesson, 'Choose a greeting', 'Hi', 'Hello'),
        buildRoleplayPrompt(lesson, level, 'Hello'),
        buildAssessmentPrompt(level, 'checkpoint', 'Hello'),
        buildTextPracticePrompt(lesson, 'Hello'),
        buildVoicePracticePrompt(lesson),
        buildKidsLessonPrompt(lesson, 'Discovery'),
        buildKidsVoicePrompt(lesson, 'Discovery'),
        buildKidsReviewPrompt(lesson, 'Discovery', 'Hello'),
        buildProjectPrompt(level, { title: 'My Introduction', task: 'Introduce yourself.', skills: ['speaking'], success: 'Be clear.' }, 'Hello, my name is Aye.')
    ];
    for (const prompt of prompts) {
        assert.match(prompt, /Burmese|မြန်မာ/);
        assert.match(prompt, /understanding|နားလည်မှု|check/i);
        assert.match(prompt, /next action|လုပ်ရမည့်|ပြန်ပို့ပါ|practice/i);
    }
});

test('Admin controls are isolated from ordinary global keyboards', () => {
    const regular = JSON.stringify(mainKeyboard(987654321));
    const admin = JSON.stringify(adminKeyboard());
    assert.equal(isAdminUser(987654321), false);
    assert.doesNotMatch(regular, /Admin Center|Premium ဖွင့်မယ်|Student Dashboard/);
    assert.match(admin, /Premium ဖွင့်မယ်/);
    assert.match(admin, /Student Dashboard/);
});

test('global navigation builders return keyboards for every major section', () => {
    for (const keyboard of [mainKeyboard(), learningKeyboard(), practiceKeyboard(), progressKeyboard(), profileKeyboard(), courseKeyboard(), moreKeyboard(), privacyKeyboard(), classroomKeyboard(false), classroomKeyboard(true), academyKeyboard(), modeReplyKeyboard()]) {
        assert.ok(keyboard);
        assert.ok(Array.isArray(keyboard.reply_markup?.keyboard));
    }
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
    for (const command of ['admin', 'academy', 'kids', 'kidslesson', 'kidspractice', 'menu', 'learning', 'practice', 'progressmenu', 'more', 'coursemenu', 'privacy_menu', 'classroommenu', 'classroom_join_prompt', 'classroom_create_prompt', 'classroom_dashboard_prompt', 'upgrade_prompt', 'kidsstages', 'kidsmenu', 'kidsprogress', 'kidsreview', 'learning', 'practice', 'profile', 'recommend', 'errorclinic', 'conversation', 'diagnostic', 'projects', 'kidsguardian', 'levels', 'academylesson', 'teacherlesson', 'homework', 'academyquiz', 'coach', 'dailyplan', 'wordbank', 'pronunciation', 'livevoice', 'endlive', 'skillreport', 'tracks', 'privacy', 'classroom', 'teacher', 'classroom_create', 'classroom_join', 'classroom_dashboard', 'exportdata', 'deletedata', 'nextacademylesson', 'academyprogress', 'academyreview', 'academyassessment', 'academyroleplay', 'academycertificate', 'academyreset', 'mode_normal', 'mode_ielts', 'mode_translator']) {
        assert.ok(registered.commands.includes(command), `missing /${command}`);
    }
    assert.ok(registered.events.includes('text'));
    assert.ok(registered.events.includes('voice'));
    assert.ok(registered.hears.includes('🏫 Speaking Academy'));
    assert.ok(registered.hears.includes(BUTTONS.main.learning));
    assert.ok(registered.hears.includes(BUTTONS.admin.menu));
    assert.ok(registered.hears.includes(BUTTONS.main.today));
    assert.ok(registered.hears.includes(BUTTONS.main.more));
    assert.ok(registered.hears.includes(BUTTONS.main.classroom));
    assert.ok(registered.hears.includes(BUTTONS.course.lesson));
    assert.ok(registered.hears.includes(BUTTONS.course.next));
    assert.ok(registered.hears.includes(BUTTONS.privacy.export));
    assert.ok(registered.hears.includes(BUTTONS.admin.classroomJoin));
    assert.ok(registered.hears.includes(BUTTONS.main.kids));
    assert.ok(registered.hears.includes(BUTTONS.kids.lesson));
    assert.ok(registered.hears.includes(BUTTONS.kids.practice));
    assert.ok(registered.hears.includes(BUTTONS.kids.stages));
    assert.ok(registered.hears.includes(BUTTONS.kids.menu));
    assert.ok(registered.hears.includes(BUTTONS.main.practice));
    assert.ok(registered.hears.includes(BUTTONS.main.profile));
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
    assert.ok(registered.hears.includes(BUTTONS.academy.diagnostic));
    assert.ok(registered.hears.includes(BUTTONS.academy.projects));
    assert.ok(registered.hears.includes(BUTTONS.kids.guardian));
    assert.ok(registered.hears.includes(BUTTONS.academy.tracks));
    assert.ok(registered.hears.includes(BUTTONS.main.privacy));
    assert.ok(registered.hears.includes(BUTTONS.main.classroom));
    assert.ok(registered.hears.includes(BUTTONS.academy.liveVoice));
    assert.ok(registered.actions.some((action) => String(action).includes('teacher_phase')));
    assert.ok(registered.actions.some((action) => String(action).includes('kids_phase')));
    assert.ok(registered.actions.some((action) => String(action).includes('kids_age')));
    assert.ok(registered.actions.some((action) => String(action).includes('teacher_homework')));
});
