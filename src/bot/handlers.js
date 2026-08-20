const { getTutorResponse, getTutorResponseFromAudio } = require('../ai/gemini');
const googleTTS = require('google-tts-api');
const { Markup } = require('telegraf');
const {
    checkUsageLimit,
    makeUserPremium,
    getUserMode,
    setUserMode,
    getCourseProgress,
    saveCourseProgress,
    startCourse,
    completeCourseLesson,
    resetCourse,
    getAcademyProgress,
    saveAcademyProgress,
    startAcademy,
    resetAcademy,
    isPremiumUser,
    exportUserData,
    deleteUserData,
    createClassroom,
    getClassroomByCode,
    joinClassroom,
    getTeacherClassrooms,
    getUserClassrooms,
    getClassroomDashboard,
    ADMIN_ID
} = require('../database/firebase');
const { BEGINNER_COURSE, getLesson: getBeginnerLesson } = require('../course/content');
const { buildLessonIntro, buildTextPracticePrompt, buildVoicePracticePrompt } = require('../course/teacher');
const {
    LEVELS,
    LEVEL_ORDER,
    getLevel,
    getLesson: getAcademyLesson,
    getNextLesson,
    levelIsPremium
} = require('../academy/curriculum');
const {
    todayUtc,
    seedWordBank,
    getDueWords,
    reviewWord,
    mergeReviewedWord,
    skillReport
} = require('../academy/learning');
const { TRACKS, getTrack, trackIsPremium } = require('../academy/tracks');
const {
    buildAcademyLessonIntro,
    buildPlacementPrompt,
    buildAcademyTextPrompt,
    buildAcademyVoicePrompt,
    buildPlacementVoicePrompt,
    buildRoleplayPrompt,
    buildRoleplayVoicePrompt,
    buildQuizQuestionPrompt,
    buildQuizFeedbackPrompt,
    buildCoachPrompt,
    buildCoachVoicePrompt,
    buildLiveVoicePrompt,
    buildPronunciationPrompt,
    buildWordReviewPrompt,
    buildSkillReportPrompt,
    buildDailyPlanPrompt,
    buildAssessmentPrompt
} = require('../academy/teacher');

const TELEGRAM_TEXT_LIMIT = 3900;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const VALID_MODES = new Set(['default', 'ielts', 'translator']);

function splitMessage(text, maxLength = TELEGRAM_TEXT_LIMIT) {
    const value = String(text || '').trim();
    if (!value) return [];
    const chunks = [];
    for (let index = 0; index < value.length; index += maxLength) {
        chunks.push(value.slice(index, index + maxLength));
    }
    return chunks;
}

async function replyLongText(ctx, text) {
    for (const chunk of splitMessage(text)) await ctx.reply(chunk);
}

function englishSpeechChunks(text) {
    const english = String(text || '').replace(/[^\x00-\x7F]/g, ' ').replace(/\s+/g, ' ').trim();
    return splitMessage(english, 1800);
}

async function sendEnglishVoiceReply(ctx, text) {
    const chunks = englishSpeechChunks(text);
    if (!chunks.length) return;
    await ctx.sendChatAction('record_voice');
    for (const chunk of chunks) {
        const audioUrl = googleTTS.getAudioUrl(chunk, {
            lang: 'en',
            slow: false,
            host: 'https://translate.google.com'
        });
        await ctx.replyWithVoice(audioUrl);
    }
}

async function usageOrReply(ctx) {
    const status = await checkUsageLimit(ctx.from.id);
    if (!status.allowed) {
        await ctx.reply('⏳ ယနေ့ Free အသုံးပြုခွင့် ပြည့်သွားပါပြီ။ မနက်ဖြန်အထိ စောင့်ပါ သို့မဟုတ် Premium အတွက် Admin ကို ဆက်သွယ်ပါ။');
        return null;
    }
    return status;
}

async function getCurrentMode(userId) {
    const mode = await getUserMode(userId);
    return VALID_MODES.has(mode) ? mode : 'default';
}

async function sendCurrentLesson(ctx, progress) {
    const lesson = getBeginnerLesson(progress.currentLesson) || BEGINNER_COURSE[0];
    await replyLongText(ctx, buildLessonIntro(lesson, BEGINNER_COURSE.length));
    await sendEnglishVoiceReply(ctx, lesson.examples.join('. '));
}

function courseProgressMessage(progress) {
    const completed = Array.isArray(progress.completedLessons) ? progress.completedLessons.length : 0;
    const currentLesson = getBeginnerLesson(progress.currentLesson) || BEGINNER_COURSE[BEGINNER_COURSE.length - 1];
    const percentage = Math.round((completed / BEGINNER_COURSE.length) * 100);
    return `📊 Beginner Course Progress\n\nCompleted: ${completed}/${BEGINNER_COURSE.length} lessons (${percentage}%)\nCurrent lesson: ${currentLesson.id}. ${currentLesson.title}\nPractice attempts: ${progress.practiceAttempts || 0}\nSpeaking attempts: ${progress.speakingAttempts || 0}\n\nUse /lesson to see the current lesson, /nextlesson when you are ready, or /resetcourse to start again.`;
}

async function savePracticeAttempt(userId, progress, isSpeaking) {
    await saveCourseProgress(userId, {
        ...progress,
        practiceAttempts: Number(progress.practiceAttempts || 0) + 1,
        speakingAttempts: Number(progress.speakingAttempts || 0) + (isSpeaking ? 1 : 0)
    });
}

function academyLessonKey(levelId, lessonNumber) {
    return `${levelId}-${lessonNumber}`;
}

function academyProgressMessage(progress) {
    const completed = Array.isArray(progress.completedLessons) ? progress.completedLessons.length : 0;
    const total = LEVELS.reduce((sum, level) => sum + level.lessons.length, 0);
    const level = getLevel(progress.levelId);
    const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
    const percent = Math.round((completed / total) * 100);
    const premiumLabel = level.premium ? 'Premium' : 'Free';
    const track = getTrack(progress.trackId);
    const dailyDone = progress.dailyPlan ? `${(progress.dailyPlanCompleted || []).length}/${progress.dailyPlan.tasks.length}` : 'Not started';
    return `🏫 English Speaking Academy\n\nLevel: ${level.title} (${level.cefr}) — ${premiumLabel}\nTrack: ${track.title}\nCurrent lesson: ${lesson ? `${lesson.number}. ${lesson.title}` : 'Completed'}\nCompleted: ${completed}/${total} lessons (${percent}%)\nPoints: ${progress.points || 0}\nPractice attempts: ${progress.practiceAttempts || 0}\nSpeaking attempts: ${progress.speakingAttempts || 0}\nQuiz score: ${progress.quizCorrect || 0}/${progress.quizAnswered || 0}\nQuiz streak: ${progress.quizStreak || 0}\nCoach questions: ${progress.coachQuestions || 0}\nDaily plan: ${dailyDone}\nStreak: ${progress.streak || 0} day(s)\n\nUse /academylesson to repeat, /academyquiz for a fresh question, /coach to ask for advice, /dailyplan for today’s plan, /academyreview to review, /academyassessment for a checkpoint, and /academyreset to start again.`;
}

async function hasAcademyAccess(ctx, levelId) {
    if (!levelIsPremium(levelId)) return true;
    if (await isPremiumUser(ctx.from.id)) return true;
    await ctx.reply('🔒 This level is part of Premium Academy. Ask the admin to activate Premium for your Telegram ID, then try again.');
    return false;
}

async function sendAcademyLesson(ctx, progress) {
    const level = getLevel(progress.levelId);
    const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
    if (!lesson) {
        await ctx.reply('🎓 You completed the full English Speaking Academy. Use /academyassessment for a final assessment.');
        return;
    }
    if (!(await hasAcademyAccess(ctx, level.id))) return;
    const wordBank = seedWordBank(progress.wordBank, lesson.vocabulary, todayUtc());
    if (wordBank.length !== (progress.wordBank || []).length) {
        await saveAcademyProgress(ctx.from.id, { ...progress, wordBank });
    }
    await replyLongText(ctx, buildAcademyLessonIntro(lesson, level, level.lessons.length));
    await sendEnglishVoiceReply(ctx, `${lesson.title}. ${lesson.objective}. ${lesson.grammar}.`);
    await ctx.reply('Use the quick buttons below to continue your Academy lesson.', academyKeyboard());
}

function parseJsonResponse(text) {
    const raw = String(text || '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    try {
        return JSON.parse(raw);
    } catch (_) {
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) {
            try { return JSON.parse(raw.slice(start, end + 1)); } catch (error) { return null; }
        }
        return null;
    }
}

function normalizeQuiz(data) {
    if (!data || typeof data.question !== 'string' || !Array.isArray(data.options) || data.options.length !== 4) return null;
    const answerIndex = Number(data.answerIndex);
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) return null;
    return {
        question: data.question.trim(),
        options: data.options.map((option) => String(option).trim()),
        answerIndex,
        explanation: String(data.explanation || '')
    };
}

function quizKeyboard(quiz) {
    return Markup.inlineKeyboard(quiz.options.map((option, index) => [Markup.button.callback(`${String.fromCharCode(65 + index)}. ${option}`, `quiz_answer_${index}`)]));
}

function quizNextKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🧠 မေးခွန်းအသစ်', 'quiz_new')],
        [Markup.button.callback('🏠 ပင်မ Menu', 'quiz_home')]
    ]);
}

function wordQuizKeyboard(quiz) {
    return Markup.inlineKeyboard(quiz.options.map((option, index) => [Markup.button.callback(`${String.fromCharCode(65 + index)}. ${option}`, `word_answer_${index}`)]));
}

async function sendNewQuiz(ctx) {
    const status = await usageOrReply(ctx);
    if (!status) return;
    const progress = await getAcademyProgress(ctx.from.id);
    const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
    const level = getLevel(progress.levelId);
    if (!progress.active || !lesson) return ctx.reply('Send /academy to begin your Academy before starting a quiz.');
    if (!(await hasAcademyAccess(ctx, level.id))) return;
    const previousQuestions = (progress.quizHistory || []).map((item) => item.question || item);
    const raw = await getTutorResponse(buildQuizQuestionPrompt(level, lesson, previousQuestions), 'default');
    const quiz = normalizeQuiz(parseJsonResponse(raw));
    if (!quiz) return replyLongText(ctx, raw);
    const history = [...(progress.quizHistory || []), { question: quiz.question, lessonId: lesson.id }].slice(-20);
    await saveAcademyProgress(ctx.from.id, {
        ...progress,
        session: { type: 'quiz', question: quiz },
        lastQuiz: quiz,
        quizHistory: history
    });
    await ctx.reply(`🧠 ${level.title} Quiz — ${lesson.title}\n\n${quiz.question}\n\nChoose the best answer:`, quizKeyboard(quiz));
}

async function answerQuiz(ctx, selectedIndex) {
    const status = await usageOrReply(ctx);
    if (!status) return;
    const progress = await getAcademyProgress(ctx.from.id);
    const quiz = progress.session?.type === 'quiz' ? progress.session.question : null;
    if (!quiz) return ctx.reply('Start a new quiz with /academyquiz.');
    const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
    const level = getLevel(progress.levelId);
    const index = Number(selectedIndex);
    const selectedAnswer = quiz.options[index] || 'Unknown answer';
    const correctAnswer = quiz.options[quiz.answerIndex];
    const correct = index === Number(quiz.answerIndex);
    const feedback = await getTutorResponse(buildQuizFeedbackPrompt(level, lesson, quiz.question, selectedAnswer, correctAnswer), 'default');
    const updated = await saveAcademyProgress(ctx.from.id, {
        ...progress,
        session: null,
        quizAnswered: Number(progress.quizAnswered || 0) + 1,
        quizCorrect: Number(progress.quizCorrect || 0) + (correct ? 1 : 0),
        quizStreak: correct ? Number(progress.quizStreak || 0) + 1 : 0,
        points: Number(progress.points || 0) + (correct ? 20 : 5),
        lastQuiz: { ...quiz, selectedIndex: index, correct }
    });
    await ctx.reply(`${correct ? '✅ Correct!' : `❌ Not quite. Correct answer: ${correctAnswer}`}\n\n${feedback}\n\nQuiz score: ${updated.quizCorrect}/${updated.quizAnswered}\nPoints: ${updated.points}`, quizNextKeyboard());
}

function wordBankMessage(progress) {
    const words = Array.isArray(progress.wordBank) ? progress.wordBank : [];
    const due = getDueWords(words, todayUtc());
    const mastered = words.filter((entry) => Number(entry.repetitions || 0) >= 3).length;
    const preview = due.slice(0, 12).map((entry) => `• ${entry.word} — due ${entry.dueDate || 'today'}${entry.repetitions ? ` (${entry.repetitions} reviews)` : ''}`).join('\n') || 'No words are due today. Keep learning and come back tomorrow.';
    return `📖 My Word Bank\n\nTotal words: ${words.length}\nDue today: ${due.length}\nMastered: ${mastered}\n\n${preview}\n\nWords are scheduled with spaced repetition so difficult words return more often.`;
}

function wordBankKeyboard(progress) {
    const due = getDueWords(progress.wordBank, todayUtc()).length;
    return Markup.inlineKeyboard([
        ...(due ? [[Markup.button.callback(`🔁 Review ${Math.min(due, 8)} words`, 'word_review')]] : []),
        [Markup.button.callback('🌱 Add current lesson words', 'word_seed')],
        [Markup.button.callback('🏠 Main menu', 'word_home')]
    ]);
}

async function showWordBank(ctx) {
    const progress = await getAcademyProgress(ctx.from.id);
    if (!progress.active) return ctx.reply('Send /academy first so I can build your personalized Word Bank.');
    const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
    const wordBank = seedWordBank(progress.wordBank, lesson?.vocabulary, todayUtc());
    const updated = wordBank.length !== (progress.wordBank || []).length
        ? await saveAcademyProgress(ctx.from.id, { ...progress, wordBank })
        : progress;
    await ctx.reply(wordBankMessage(updated), wordBankKeyboard(updated));
}

async function seedCurrentLessonWords(ctx) {
    const progress = await getAcademyProgress(ctx.from.id);
    if (!progress.active) return ctx.reply('Send /academy first so I can build your personalized Word Bank.');
    const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
    const wordBank = seedWordBank(progress.wordBank, lesson?.vocabulary, todayUtc());
    const updated = await saveAcademyProgress(ctx.from.id, { ...progress, wordBank });
    await ctx.reply(`🌱 Added current lesson vocabulary. Your Word Bank now has ${updated.wordBank.length} words.`, wordBankKeyboard(updated));
}

async function startWordReview(ctx) {
    const progress = await getAcademyProgress(ctx.from.id);
    const due = getDueWords(progress.wordBank, todayUtc()).slice(0, 8);
    if (!due.length) return ctx.reply('✅ No vocabulary is due today. Learn the current lesson or come back tomorrow.');
    const status = await usageOrReply(ctx);
    if (!status) return;
    const level = getLevel(progress.levelId);
    const raw = await getTutorResponse(buildWordReviewPrompt(level, due.map((entry) => entry.word)), 'default');
    const quiz = normalizeQuiz(parseJsonResponse(raw));
    if (!quiz) return replyLongText(ctx, raw);
    await saveAcademyProgress(ctx.from.id, { ...progress, session: { type: 'word_review', question: quiz, wordId: due[0].id } });
    await ctx.reply(`🔁 Vocabulary Review\n\n${quiz.question}`, wordQuizKeyboard(quiz));
}

async function answerWordReview(ctx, selectedIndex) {
    const progress = await getAcademyProgress(ctx.from.id);
    const session = progress.session?.type === 'word_review' ? progress.session : null;
    if (!session) return ctx.reply('Start a review from /wordbank first.');
    const quiz = session.question;
    const index = Number(selectedIndex);
    const correct = index === Number(quiz.answerIndex);
    const word = (progress.wordBank || []).find((entry) => entry.id === session.wordId);
    const updatedWord = word ? reviewWord(word, correct, todayUtc()) : null;
    const updated = await saveAcademyProgress(ctx.from.id, {
        ...progress,
        session: null,
        wordBank: updatedWord ? mergeReviewedWord(progress.wordBank, updatedWord) : progress.wordBank,
        vocabularyReviewCount: Number(progress.vocabularyReviewCount || 0) + 1,
        lastVocabularyReview: todayUtc(),
        vocabularyScore: updatedWord ? Math.round((Number(updatedWord.correct || 0) / Math.max(1, Number(updatedWord.correct || 0) + Number(updatedWord.incorrect || 0))) * 100) : progress.vocabularyScore,
        points: Number(progress.points || 0) + (correct ? 15 : 5)
    });
    const answer = quiz.options[quiz.answerIndex];
    await ctx.reply(`${correct ? '✅ Correct!' : `❌ Correct answer: ${answer}`}\n\n${quiz.explanation || 'Review the word and use it in your own sentence.'}\n\nVocabulary points: ${updated.points}`, wordBankKeyboard(updated));
}

function normalizeDailyPlan(data, date) {
    if (!data || !Array.isArray(data.tasks) || data.tasks.length < 4 || data.tasks.length > 5) return null;
    const allowedTypes = new Set(['speaking', 'listening', 'vocabulary', 'grammar', 'review']);
    const tasks = data.tasks.map((task, index) => ({
        id: `task_${index + 1}`,
        type: allowedTypes.has(task.type) ? task.type : 'review',
        title: String(task.title || `English practice ${index + 1}`).trim().slice(0, 120),
        minutes: Math.max(3, Math.min(20, Number.parseInt(task.minutes, 10) || 5)),
        instructions: String(task.instructions || 'Practice this skill in English.').trim().slice(0, 500)
    }));
    return {
        date,
        focus: String(data.focus || 'Balanced English practice').trim().slice(0, 200),
        totalMinutes: tasks.reduce((sum, task) => sum + task.minutes, 0),
        tasks
    };
}

function dailyPlanKeyboard(plan, completed = []) {
    const buttons = plan.tasks.map((task, index) => [Markup.button.callback(`${completed.includes(task.id) ? '✅' : '⬜'} ${task.title}`, `daily_done_${index}`)]);
    buttons.push([Markup.button.callback('🔄 Generate today’s plan again', 'daily_refresh')]);
    buttons.push([Markup.button.callback('🏠 Main menu', 'daily_home')]);
    return Markup.inlineKeyboard(buttons);
}

function dailyPlanMessage(plan, completed = []) {
    const done = plan.tasks.filter((task) => completed.includes(task.id)).length;
    const lines = plan.tasks.map((task) => `${completed.includes(task.id) ? '✅' : '⬜'} ${task.title} — ${task.minutes} min\n   ${task.instructions}`);
    return `📅 Daily Study Plan — ${plan.date}\n\nFocus: ${plan.focus}\nTotal time: ${plan.totalMinutes} minutes\nCompleted: ${done}/${plan.tasks.length}\n\n${lines.join('\n\n')}\n\nTap a task after completing it. I will keep your daily progress.`;
}

async function generateDailyPlan(ctx, force = false) {
    const progress = await getAcademyProgress(ctx.from.id);
    const level = getLevel(progress.levelId);
    const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
    if (!progress.active) return ctx.reply('Send /academy first so I can build a plan for your level.');
    if (!(await hasAcademyAccess(ctx, level.id))) return;
    const date = new Date().toISOString().slice(0, 10);
    if (!force && progress.dailyPlanDate === date && progress.dailyPlan?.tasks?.length) {
        return ctx.reply(dailyPlanMessage(progress.dailyPlan, progress.dailyPlanCompleted || []), dailyPlanKeyboard(progress.dailyPlan, progress.dailyPlanCompleted || []));
    }
    const status = await usageOrReply(ctx);
    if (!status) return;
    const stats = {
        track: getTrack(progress.trackId).title,
        quizAnswered: progress.quizAnswered || 0,
        quizCorrect: progress.quizCorrect || 0,
        quizStreak: progress.quizStreak || 0,
        practiceAttempts: progress.practiceAttempts || 0,
        speakingAttempts: progress.speakingAttempts || 0,
        lastScore: progress.lastScore || null,
        streak: progress.streak || 0,
        previousPlanCompleted: progress.dailyPlanCompleted || []
    };
    const raw = await getTutorResponse(buildDailyPlanPrompt(level, lesson, stats, date), 'default');
    const plan = normalizeDailyPlan(parseJsonResponse(raw), date);
    if (!plan) return replyLongText(ctx, raw);
    const updated = await saveAcademyProgress(ctx.from.id, { ...progress, dailyPlan: plan, dailyPlanDate: date, dailyPlanCompleted: [] });
    await ctx.reply(dailyPlanMessage(plan), dailyPlanKeyboard(plan));
    return updated;
}

async function completeDailyPlanTask(ctx, index) {
    const progress = await getAcademyProgress(ctx.from.id);
    const plan = progress.dailyPlan;
    if (!plan || progress.dailyPlanDate !== new Date().toISOString().slice(0, 10)) return ctx.reply('Generate today’s plan first with /dailyplan.');
    const task = plan.tasks[Number(index)];
    if (!task) return ctx.reply('That study task is not available.');
    const completed = [...new Set([...(progress.dailyPlanCompleted || []), task.id])];
    const updated = await saveAcademyProgress(ctx.from.id, { ...progress, dailyPlanCompleted: completed, points: Number(progress.points || 0) + (completed.includes(task.id) && !(progress.dailyPlanCompleted || []).includes(task.id) ? 5 : 0) });
    await ctx.reply(`✅ Marked complete: ${task.title}\n\n${dailyPlanMessage(plan, completed)}`, dailyPlanKeyboard(plan, completed));
    return updated;
}

const BUTTONS = {
    main: {
        academy: '🏫 Speaking Academy',
        levels: '📚 Academy Levels',
        beginner: '🧑‍🏫 Beginner Course',
        progress: '📊 My Progress',
        mode: '🎛 Tutor Mode',
        help: '❓ Help',
        myid: '🆔 My ID',
        privacy: '🔐 Privacy',
        classroom: '🏫 Classroom'
    },
    mode: {
        normal: '🧑‍🏫 Normal Tutor',
        ielts: '🎓 IELTS Examiner',
        translator: '📝 Subtitle Translator'
    },
    academy: {
        lesson: '📘 ဒီသင်ခန်းစာ',
        next: '➡️ နောက်သင်ခန်းစာ',
        progress: '📊 Academy Progress',
        review: '🔁 Review',
        roleplay: '🎭 Role-play',
        quiz: '🧠 Lesson Quiz',
        coach: '💬 Learning Coach',
        dailyPlan: '📅 Daily Study Plan',
        wordBank: '📖 My Word Bank',
        pronunciation: '🗣️ Pronunciation Coach',
        liveVoice: '🎙️ Live Voice',
        report: '📈 Skill Report',
        tracks: '🎯 Learning Tracks',
        assessment: '📝 Assessment',
        certificate: '🏆 Certificate',
        home: '🏠 ပင်မ Menu'
    }
};

function mainKeyboard() {
    return Markup.keyboard([
        [BUTTONS.main.academy, BUTTONS.main.levels],
        [BUTTONS.main.beginner, BUTTONS.main.progress],
        [BUTTONS.main.mode, BUTTONS.main.help],
        [BUTTONS.main.myid, BUTTONS.main.privacy],
        [BUTTONS.main.classroom]
    ]).resize().persistent();
}

function academyKeyboard() {
    return Markup.keyboard([
        [BUTTONS.academy.lesson, BUTTONS.academy.next],
        [BUTTONS.academy.progress, BUTTONS.academy.review],
        [BUTTONS.academy.roleplay, BUTTONS.academy.quiz],
        [BUTTONS.academy.coach, BUTTONS.academy.dailyPlan],
        [BUTTONS.academy.wordBank, BUTTONS.academy.pronunciation],
        [BUTTONS.academy.liveVoice, BUTTONS.academy.report],
        [BUTTONS.academy.tracks, BUTTONS.academy.assessment],
        [BUTTONS.academy.certificate],
        [BUTTONS.academy.home]
    ]).resize().persistent();
}

function modeKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('Normal Tutor (LinguistPro)', 'set_default')],
        [Markup.button.callback('IELTS Examiner', 'set_ielts')],
        [Markup.button.callback('Subtitle Translator', 'set_translator')]
    ]);
}

function tracksKeyboard() {
    return Markup.inlineKeyboard(TRACKS.map((track) => [Markup.button.callback(`${track.icon} ${track.title}${track.premium ? ' 🔒' : ''}`, `track_${track.id}`)]));
}

function tracksMessage(currentTrackId = 'general') {
    const lines = TRACKS.map((track) => `${track.icon} ${track.title} — ${track.premium ? 'Premium' : 'Free'}\n${track.description}${track.id === currentTrackId ? ' ✅ Current' : ''}`);
    return `🎯 Learning Tracks\n\nChoose a path for your examples, role-plays, study plans, and Coach advice.\n\n${lines.join('\n\n')}`;
}

function modeReplyKeyboard() {
    return Markup.keyboard([
        [BUTTONS.mode.normal],
        [BUTTONS.mode.ielts],
        [BUTTONS.mode.translator],
        [BUTTONS.academy.home]
    ]).resize().persistent();
}

function commandUpdate(ctx, command) {
    const message = {
        ...ctx.update.message,
        text: command,
        entities: [{ type: 'bot_command', offset: 0, length: command.length }]
    };
    return { ...ctx.update, message };
}

function setupButtonRouting(bot) {
    const routes = [
        [BUTTONS.main.academy, '/academy'],
        [BUTTONS.main.levels, '/levels'],
        [BUTTONS.main.beginner, '/course'],
        [BUTTONS.main.progress, '/academyprogress'],
        [BUTTONS.main.mode, '/mode'],
        [BUTTONS.main.help, '/help'],
        [BUTTONS.main.myid, '/myid'],
        [BUTTONS.main.privacy, '/privacy'],
        [BUTTONS.main.classroom, '/classroom'],
        [BUTTONS.mode.normal, '/mode_normal'],
        [BUTTONS.mode.ielts, '/mode_ielts'],
        [BUTTONS.mode.translator, '/mode_translator'],
        [BUTTONS.academy.lesson, '/academylesson'],
        [BUTTONS.academy.next, '/nextacademylesson'],
        [BUTTONS.academy.progress, '/academyprogress'],
        [BUTTONS.academy.review, '/academyreview'],
        [BUTTONS.academy.roleplay, '/academyroleplay'],
        [BUTTONS.academy.quiz, '/academyquiz'],
        [BUTTONS.academy.coach, '/coach'],
        [BUTTONS.academy.dailyPlan, '/dailyplan'],
        [BUTTONS.academy.wordBank, '/wordbank'],
        [BUTTONS.academy.pronunciation, '/pronunciation'],
        [BUTTONS.academy.liveVoice, '/livevoice'],
        [BUTTONS.academy.report, '/skillreport'],
        [BUTTONS.academy.tracks, '/tracks'],
        [BUTTONS.academy.assessment, '/academyassessment'],
        [BUTTONS.academy.certificate, '/academycertificate'],
        [BUTTONS.academy.home, '/menu']
    ];
    for (const [label, command] of routes) {
        bot.hears(label, (ctx) => bot.handleUpdate(commandUpdate(ctx, command)));
    }
}

function setupHandlers(bot) {
    bot.start(async (ctx) => {
        const mode = await getCurrentMode(ctx.from.id);
        await ctx.reply(`Hello ${ctx.from.first_name || 'there'}!\n\nI am LinguistPro, your AI English Tutor.\n\nCurrent mode: ${mode}\n\nFor a complete step-by-step journey from beginner to Pro, send /academy. For the original beginner lessons, send /course.\nUse the quick buttons below or /help for all commands.`, mainKeyboard());
    });

    bot.help((ctx) => ctx.reply('Commands:\n/start - Start the tutor\n/help - Show help\n/academy - Start or resume the full Speaking Academy\n/levels - View Free and Premium levels\n/academylesson - Show the current Academy lesson\n/academyquiz - Get a fresh lesson quiz question\n/coach - Ask the English Learning Coach anything\n/dailyplan - Generate today’s level-based study plan\n/wordbank - Review vocabulary with spaced repetition\n/pronunciation - Practice with the Pronunciation Coach\n/livevoice - Start a Premium multi-turn voice conversation\n/endlive - End the live voice session\n/skillreport - View your English skill report\n/tracks - Choose General, Travel, IELTS, TOEFL, Business, or Job Interview\n/nextacademylesson - Complete the current Academy lesson\n/academyprogress - View level, points, streak, and progress\n/academyreview - Review a completed lesson\n/academyassessment - Take a checkpoint assessment\n/academyroleplay - Start a realistic role-play\n/academycertificate - View Pro completion status\n/academyreset - Reset Academy progress\n/course - Open the original 12-lesson beginner course\n/mode - Choose Normal, IELTS, or Translator mode\n/myid - Show your Telegram ID\n/privacy - View privacy controls\n/exportdata - Export your learning data\n/deletedata - Permanently delete your learning data\n/classroom - View your classroom(s)\n/classroom_join CODE - Join a teacher classroom\n/teacher - Teacher Center for the configured admin\n/classroom_create CLASS_NAME - Teacher-only class creation\n/classroom_dashboard CODE - Teacher-only student dashboard\n/upgrade USER_ID DAYS - Admin only\n\nUse the quick buttons below. In Academy practice, send text or voice and I will teach, correct, quiz, and coach you like a personal teacher.', mainKeyboard()));

    bot.command('menu', (ctx) => ctx.reply('🏠 Main menu', mainKeyboard()));

    setupButtonRouting(bot);

    async function selectMode(ctx, mode, message) {
        try {
            await setUserMode(ctx.from.id, mode);
            await ctx.reply(message, mainKeyboard());
        } catch (error) {
            console.error('Mode selection error:', error.message);
            await ctx.reply('🙏 I could not save your mode. Please try again.');
        }
    }

    bot.command('mode', (ctx) => ctx.reply('Choose a tutor mode:', modeReplyKeyboard()));
    bot.command('mode_normal', (ctx) => selectMode(ctx, 'default', '✅ Normal Tutor mode is active.'));
    bot.command('mode_ielts', (ctx) => selectMode(ctx, 'ielts', '✅ IELTS Examiner mode is active.'));
    bot.command('mode_translator', (ctx) => selectMode(ctx, 'translator', '✅ Subtitle Translator mode is active.'));

    bot.command('levels', async (ctx) => {
        const lines = LEVELS.map((level) => `${level.premium ? '🔒' : '✅'} ${level.title} (${level.cefr}) — ${level.premium ? 'Premium' : 'Free'}\n${level.goal}`);
        await replyLongText(ctx, `🏫 English Speaking Academy Levels\n\n${lines.join('\n\n')}\n\nSend /academy to start with a friendly placement interview.`);
    });

    bot.command('academy', async (ctx) => {
        try {
            const progress = await startAcademy(ctx.from.id);
            if (progress.placementCompleted) return sendAcademyLesson(ctx, progress);
            await saveAcademyProgress(ctx.from.id, {
                ...progress,
                active: true,
                session: { type: 'placement' }
            });
            await ctx.reply('🏫 Welcome to the Premium English Speaking Academy. I will first check your level so I do not teach too fast or too slowly.\n\nPlease answer in English, by text or voice:\n“Hello, my name is ___. I am from ___. I am a ___. I want to improve my English because ___.”\n\nIt is okay to make mistakes. This is only a friendly placement interview.');
        } catch (error) {
            console.error('Academy start error:', error.message);
            await ctx.reply('🙏 I could not start the Academy right now. Please try again.');
        }
    });

    bot.command('academylesson', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('Send /academy to start your Academy journey.');
            await sendAcademyLesson(ctx, progress);
        } catch (error) {
            console.error('Academy lesson error:', error.message);
            await ctx.reply('🙏 I could not load your Academy lesson right now.');
        }
    });

    bot.command('academyquiz', async (ctx) => {
        try {
            await sendNewQuiz(ctx);
        } catch (error) {
            console.error('Academy quiz error:', error.message);
            await ctx.reply('🙏 I could not create a quiz question right now. Please try again.');
        }
    });

    bot.command('coach', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('Send /academy first so I can teach at the right level.');
            await saveAcademyProgress(ctx.from.id, { ...progress, session: { type: 'coach' } });
            const level = getLevel(progress.levelId);
            await ctx.reply(`💬 English Learning Coach is ready.\n\nYour current level: ${level.title} (${level.cefr})\n\nAsk me anything about English speaking, grammar, vocabulary, pronunciation, study plans, or your learning problems. You can type or send a voice message.`, academyKeyboard());
        } catch (error) {
            console.error('Coach start error:', error.message);
            await ctx.reply('🙏 I could not open the Learning Coach right now.');
        }
    });

    bot.command('dailyplan', async (ctx) => {
        try {
            await generateDailyPlan(ctx);
        } catch (error) {
            console.error('Daily plan error:', error.message);
            await ctx.reply(error.message === 'API_ERROR' ? '🙏 I could not build your plan because the AI service is temporarily unavailable.' : '🙏 I could not build your daily plan right now.');
        }
    });

    bot.command('wordbank', async (ctx) => {
        try {
            await showWordBank(ctx);
        } catch (error) {
            console.error('Word Bank error:', error.message);
            await ctx.reply('🙏 I could not load your Word Bank right now.');
        }
    });

    bot.command('pronunciation', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('Send /academy first so I can coach your pronunciation at the right level.');
            if (!(await hasAcademyAccess(ctx, progress.levelId))) return;
            await saveAcademyProgress(ctx.from.id, { ...progress, session: { type: 'pronunciation' } });
            await ctx.reply('🗣️ Pronunciation Coach is ready. Send a voice message in English. I will score clarity, identify useful sound issues, and give you a repeat task.', academyKeyboard());
        } catch (error) {
            console.error('Pronunciation start error:', error.message);
            await ctx.reply('🙏 I could not open Pronunciation Coach right now.');
        }
    });

    bot.command('livevoice', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('Send /academy first so I can start a conversation at your level.');
            if (!(await hasAcademyAccess(ctx, progress.levelId))) return;
            await saveAcademyProgress(ctx.from.id, { ...progress, session: { type: 'live_voice', turns: 0, startedAt: new Date().toISOString() } });
            const track = getTrack(progress.trackId);
            await ctx.reply(`🎙️ Live Voice Conversation is ready.\n\nTrack: ${track.title}\nSend a voice message in English. I will reply naturally, ask one question, and keep the conversation moving.\n\nUse /endlive when you want to finish and receive a short summary.`, academyKeyboard());
        } catch (error) {
            console.error('Live voice start error:', error.message);
            await ctx.reply('🙏 I could not start Live Voice Conversation right now.');
        }
    });

    bot.command('endlive', async (ctx) => {
        const progress = await getAcademyProgress(ctx.from.id);
        const turns = progress.session?.type === 'live_voice' ? Number(progress.session.turns || 0) : 0;
        await saveAcademyProgress(ctx.from.id, { ...progress, session: null });
        await ctx.reply(`🎙️ Live Voice Conversation ended.\nTurns completed: ${turns}\nKeep practicing tomorrow to build fluency and confidence.`, academyKeyboard());
    });

    bot.command('skillreport', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('Send /academy first so I can build your skill report.');
            const status = await usageOrReply(ctx);
            if (!status) return;
            const report = skillReport(progress);
            const raw = await getTutorResponse(buildSkillReportPrompt(getLevel(progress.levelId), report), 'default');
            await replyLongText(ctx, `📈 Skill Report\n\nGrammar: ${report.grammar}/100\nVocabulary: ${report.vocabulary}/100\nSpeaking: ${report.speaking}/100\nFluency: ${report.fluency}/100\nPronunciation: ${report.pronunciation}/100\nConsistency: ${report.consistency}/100\n\n${raw}`);
        } catch (error) {
            console.error('Skill report error:', error.message);
            await ctx.reply('🙏 I could not build your skill report right now.');
        }
    });

    bot.command('tracks', async (ctx) => {
        const progress = await getAcademyProgress(ctx.from.id);
        if (!progress.active) return ctx.reply('Send /academy first so I can personalize your learning track.');
        await ctx.reply(tracksMessage(progress.trackId), tracksKeyboard());
    });

    bot.action(/^track_(.+)$/, async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const trackId = String(ctx.match[1]);
            const track = getTrack(trackId);
            if (!track || track.id !== trackId) return ctx.reply('That learning track is not available.');
            if (trackIsPremium(track.id) && !(await isPremiumUser(ctx.from.id))) {
                return ctx.reply(`🔒 ${track.title} is part of Premium Academy. Ask the admin to activate Premium, then choose this track again.`);
            }
            const progress = await getAcademyProgress(ctx.from.id);
            const history = [...(progress.trackHistory || []), { trackId: track.id, date: todayUtc() }].slice(-20);
            const updated = await saveAcademyProgress(ctx.from.id, { ...progress, trackId: track.id, trackHistory: history });
            await ctx.reply(`✅ Learning track updated: ${track.icon} ${track.title}\n\n${track.description}\n\nYour Coach, Daily Study Plan, quizzes, and role-plays will now use this track.`, academyKeyboard());
            return updated;
        } catch (error) {
            console.error('Track selection error:', error.message);
            await ctx.reply('🙏 I could not save that learning track right now.');
        }
    });

    bot.command('classroom', async (ctx) => {
        try {
            const teacher = Number(ctx.from.id) === Number(ADMIN_ID);
            if (teacher) {
                const classes = await getTeacherClassrooms(ctx.from.id);
                const text = classes.length
                    ? `👩‍🏫 Your classrooms\n\n${classes.map((item) => `• ${item.title} — code: ${item.code} — ${item.students.length} student(s)`).join('\n')}`
                    : '👩‍🏫 You have no classrooms yet. Use /classroom_create CLASS_NAME.';
                return ctx.reply(`${text}\n\nUse /classroom_dashboard CODE to view student progress.`, mainKeyboard());
            }
            const classes = await getUserClassrooms(ctx.from.id);
            return ctx.reply(classes.length
                ? `🏫 Your classrooms\n\n${classes.map((item) => `• ${item.title} — ${item.code}`).join('\n')}\n\nYour teacher can monitor your Academy progress.`
                : '🏫 You are not in a classroom yet. Ask your teacher for a code, then use /classroom_join CODE.', mainKeyboard());
        } catch (error) {
            console.error('Classroom list error:', error.message);
            await ctx.reply('🙏 I could not load classroom information right now.');
        }
    });

    bot.command('teacher', (ctx) => {
        if (Number(ctx.from.id) !== Number(ADMIN_ID)) return ctx.reply('🔒 Teacher tools are available to the configured teacher account.');
        return ctx.reply('👩‍🏫 Teacher Center\n\n/classroom_create CLASS_NAME — create a class\n/classroom — list your classes\n/classroom_dashboard CODE — view student progress\n/upgrade USER_ID DAYS — manually activate Premium', mainKeyboard());
    });

    bot.command('classroom_create', async (ctx) => {
        if (Number(ctx.from.id) !== Number(ADMIN_ID)) return ctx.reply('🔒 Only the configured teacher account can create classrooms.');
        const title = String(ctx.message.text || '').replace(/^\/classroom_create\s*/i, '').trim();
        if (!title) return ctx.reply('Usage: /classroom_create CLASS_NAME\nExample: /classroom_create Evening Speaking Class');
        try {
            const classroom = await createClassroom(ctx.from.id, title);
            await ctx.reply(`✅ Classroom created\n\nName: ${classroom.title}\nJoin code: ${classroom.code}\n\nShare this code with students. They can join with /classroom_join ${classroom.code}`);
        } catch (error) {
            console.error('Classroom create error:', error.message);
            await ctx.reply('🙏 I could not create that classroom right now.');
        }
    });

    bot.command('classroom_join', async (ctx) => {
        const code = String(ctx.message.text || '').replace(/^\/classroom_join\s*/i, '').trim();
        if (!code) return ctx.reply('Usage: /classroom_join CODE\nExample: /classroom_join AB12CD');
        try {
            const classroom = await joinClassroom(ctx.from.id, code);
            await ctx.reply(`✅ You joined ${classroom.title}.\nYour teacher can now see your Academy progress.`, mainKeyboard());
        } catch (error) {
            await ctx.reply(error.message === 'CLASSROOM_NOT_FOUND' ? '❌ Classroom code not found. Check the code and try again.' : '🙏 I could not join that classroom right now.');
        }
    });

    bot.command('classroom_dashboard', async (ctx) => {
        if (Number(ctx.from.id) !== Number(ADMIN_ID)) return ctx.reply('🔒 Only the configured teacher account can view classroom dashboards.');
        const code = String(ctx.message.text || '').replace(/^\/classroom_dashboard\s*/i, '').trim();
        if (!code) return ctx.reply('Usage: /classroom_dashboard CODE');
        try {
            const classroom = await getClassroomByCode(code);
            if (!classroom || String(classroom.teacherId) !== String(ctx.from.id)) return ctx.reply('❌ That classroom was not found under your teacher account.');
            const dashboard = await getClassroomDashboard(classroom);
            const rows = dashboard.students.length
                ? dashboard.students.map((student) => `• ${student.userId} — ${student.levelId} — ${student.completionPercent}% complete — ${student.quizAccuracy}% quiz — ${student.points} pts — streak ${student.streak}`).join('\n')
                : 'No students have joined yet.';
            await replyLongText(ctx, `📊 ${dashboard.title}\n\nJoin code: ${dashboard.code}\nStudents: ${dashboard.studentCount}\nActive: ${dashboard.activeStudents}\nAverage completion: ${dashboard.averageCompletion}%\n\n${rows}`);
        } catch (error) {
            console.error('Classroom dashboard error:', error.message);
            await ctx.reply('🙏 I could not load that classroom dashboard right now.');
        }
    });

    bot.command('academyprogress', async (ctx) => {
        try {
            await ctx.reply(academyProgressMessage(await getAcademyProgress(ctx.from.id)));
        } catch (error) {
            console.error('Academy progress error:', error.message);
            await ctx.reply('🙏 I could not load your Academy progress right now.');
        }
    });

    bot.command('academyreview', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            const review = progress.lastCompletedLesson || (progress.completedLessons || []).slice(-1)[0];
            if (!review) return ctx.reply('Complete your first Academy lesson before starting a review.');
            const position = typeof review === 'object' ? review : (() => { const parts = String(review).split('-'); return { levelId: parts.slice(0, -1).join('-'), lessonNumber: parts.at(-1) }; })();
            const lesson = getAcademyLesson(position.levelId, position.lessonNumber);
            const level = getLevel(position.levelId);
            await replyLongText(ctx, `🔁 Review: ${level.title} — ${lesson.title}\n\nGoal: ${lesson.objective}\nGrammar: ${lesson.grammar}\nVocabulary: ${lesson.vocabulary}\n\nNow answer again:\n${lesson.speakingTask}`);
        } catch (error) {
            console.error('Academy review error:', error.message);
            await ctx.reply('🙏 I could not load your review right now.');
        }
    });

    bot.command('academyassessment', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber) || (progress.lessonNumber === 999 ? getAcademyLesson('advanced-pro', 6) : null);
            const level = getLevel(progress.levelId);
            if (!progress.active || !lesson) return ctx.reply('Send /academy to begin, or complete the current course before taking the final assessment.');
            if (!(await hasAcademyAccess(ctx, level.id))) return;
            await saveAcademyProgress(ctx.from.id, { ...progress, session: { type: 'assessment', assessmentType: `${level.title} checkpoint` } });
            await ctx.reply(`📝 ${level.title} checkpoint\n\nSpeak or type for one minute about this topic:\n${lesson.speakingTask}\n\nI will score grammar, vocabulary, fluency, pronunciation, and task completion from 0 to 10.`);
        } catch (error) {
            console.error('Academy assessment error:', error.message);
            await ctx.reply('🙏 I could not start the assessment right now.');
        }
    });

    bot.command('academyroleplay', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
            const level = getLevel(progress.levelId);
            if (!progress.active || !lesson) return ctx.reply('Send /academy to start your Academy first.');
            if (!(await hasAcademyAccess(ctx, level.id))) return;
            await saveAcademyProgress(ctx.from.id, { ...progress, session: { type: 'roleplay', scenario: lesson.title } });
            await ctx.reply(`🎭 Premium Role-play: ${lesson.title}\n\nI will act as the other person. You reply naturally in English by text or voice. I will stay in character and coach you after each turn.\n\nStart now: ${lesson.speakingTask}`);
        } catch (error) {
            console.error('Academy role-play error:', error.message);
            await ctx.reply('🙏 I could not start role-play right now.');
        }
    });

    bot.command('academycertificate', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            const completed = (progress.completedLessons || []).includes('advanced-pro-6') || progress.lessonNumber === 999;
            if (!completed) return ctx.reply('Complete all Academy lessons before requesting the Pro completion certificate.');
            await ctx.reply(`🏆 English Speaking Academy — Pro Completion\n\nCongratulations, ${ctx.from.first_name || 'Learner'}!\nYou completed the full Starter-to-Advanced/Pro speaking path.\n\nPoints: ${progress.points || 0}\nAssessments: ${progress.assessmentCount || 0}\n\nKeep using /academyroleplay and /academyassessment to maintain your fluency.`);
        } catch (error) {
            console.error('Academy certificate error:', error.message);
            await ctx.reply('🙏 I could not load your certificate status right now.');
        }
    });

    bot.command('nextacademylesson', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
            if (!progress.active || !lesson) return ctx.reply('Send /academy to start or resume your Academy.');
            const next = getNextLesson(progress.levelId, progress.lessonNumber);
            const completed = [...new Set([...(progress.completedLessons || []), lesson.id])];
            if (!next) {
                await saveAcademyProgress(ctx.from.id, { ...progress, completedLessons: completed, lessonNumber: 999, session: null, lastCompletedLesson: { levelId: lesson.levelId, lessonNumber: lesson.number }, points: Number(progress.points || 0) + 100 });
                return ctx.reply('🏆 Congratulations! You completed the full English Speaking Academy. Send /academyassessment for your final Pro-level assessment.');
            }
            const nextLevel = getLevel(next.levelId);
            if (nextLevel.premium && !(await isPremiumUser(ctx.from.id))) {
                await saveAcademyProgress(ctx.from.id, { ...progress, completedLessons: completed, lessonNumber: next.lessonNumber, levelId: next.levelId, lastCompletedLesson: { levelId: lesson.levelId, lessonNumber: lesson.number }, points: Number(progress.points || 0) + 100 });
                return ctx.reply(`✅ ${lesson.title} completed. Your next level is ${nextLevel.title} (${nextLevel.cefr}), which is included in Premium Academy. Ask the admin to activate Premium, then send /academylesson.`);
            }
            const today = new Date().toISOString().slice(0, 10);
            const streak = progress.lastPracticeDate === today ? Number(progress.streak || 0) : Number(progress.streak || 0) + 1;
            const updated = await saveAcademyProgress(ctx.from.id, { ...progress, completedLessons: completed, levelId: next.levelId, lessonNumber: next.lessonNumber, session: null, lastCompletedLesson: { levelId: lesson.levelId, lessonNumber: lesson.number }, practiceAttempts: Number(progress.practiceAttempts || 0) + 1, points: Number(progress.points || 0) + 100, streak, lastPracticeDate: today });
            await ctx.reply(`✅ Great work. Lesson ${lesson.number} is complete. Next: ${nextLevel.title} (${nextLevel.cefr}).`);
            await sendAcademyLesson(ctx, updated);
        } catch (error) {
            console.error('Next Academy lesson error:', error.message);
            await ctx.reply('🙏 I could not move to the next Academy lesson right now.');
        }
    });

    bot.action(/^quiz_answer_([0-3])$/, async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await answerQuiz(ctx, Number(ctx.match[1]));
        } catch (error) {
            console.error('Quiz answer error:', error.message);
            await ctx.reply('🙏 I could not check that answer right now. Please try again.');
        }
    });

    bot.action('quiz_new', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await sendNewQuiz(ctx);
        } catch (error) {
            console.error('New quiz error:', error.message);
            await ctx.reply('🙏 I could not create a new question right now.');
        }
    });

    bot.action('quiz_home', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply('🏠 Main menu', mainKeyboard());
    });

    bot.action(/^daily_done_(\d+)$/, async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await completeDailyPlanTask(ctx, Number(ctx.match[1]));
        } catch (error) {
            console.error('Daily plan task error:', error.message);
            await ctx.reply('🙏 I could not update that daily task right now.');
        }
    });

    bot.action('daily_refresh', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await generateDailyPlan(ctx, true);
        } catch (error) {
            console.error('Daily plan refresh error:', error.message);
            await ctx.reply('🙏 I could not refresh your daily plan right now.');
        }
    });

    bot.action('daily_home', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply('🏠 Main menu', mainKeyboard());
    });

    bot.action(/^word_answer_(\d+)$/, async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await answerWordReview(ctx, Number(ctx.match[1]));
        } catch (error) {
            console.error('Word review answer error:', error.message);
            await ctx.reply('🙏 I could not check that vocabulary answer right now.');
        }
    });

    bot.action('word_review', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await startWordReview(ctx);
        } catch (error) {
            console.error('Word review start error:', error.message);
            await ctx.reply('🙏 I could not start vocabulary review right now.');
        }
    });

    bot.action('word_seed', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await seedCurrentLessonWords(ctx);
        } catch (error) {
            console.error('Word seed error:', error.message);
            await ctx.reply('🙏 I could not add the current lesson words right now.');
        }
    });

    bot.action('word_home', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply('🏠 Main menu', mainKeyboard());
    });

    bot.command('academyreset', async (ctx) => {
        try {
            await resetAcademy(ctx.from.id);
            await ctx.reply('🔄 Academy progress reset. Send /academy to take the placement interview again.');
        } catch (error) {
            console.error('Academy reset error:', error.message);
            await ctx.reply('🙏 I could not reset your Academy progress right now.');
        }
    });

    bot.command('course', async (ctx) => {
        try {
            const progress = await startCourse(ctx.from.id);
            await ctx.reply('🎓 Beginner Speaking Course started. I will teach you step by step like a personal teacher. Complete the practice, then send /nextlesson when you are ready.');
            await sendCurrentLesson(ctx, progress);
        } catch (error) {
            console.error('Course start error:', error.message);
            await ctx.reply('🙏 I could not start the course right now. Please try again.');
        }
    });

    bot.command('lesson', async (ctx) => {
        try {
            const progress = await getCourseProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('The course has not started yet. Send /course to begin from Lesson 1.');
            await sendCurrentLesson(ctx, progress);
        } catch (error) {
            console.error('Lesson display error:', error.message);
            await ctx.reply('🙏 I could not load your lesson right now.');
        }
    });

    bot.command('progress', async (ctx) => {
        try {
            await ctx.reply(courseProgressMessage(await getCourseProgress(ctx.from.id)));
        } catch (error) {
            console.error('Progress error:', error.message);
            await ctx.reply('🙏 I could not load your progress right now.');
        }
    });

    bot.command('nextlesson', async (ctx) => {
        try {
            const progress = await getCourseProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('Send /course to start the beginner course first.');
            const currentLesson = getBeginnerLesson(progress.currentLesson);
            if (!currentLesson) return ctx.reply('🎉 You have completed the beginner course! Use /course to review it again.');
            if ((progress.completedLessons || []).includes(currentLesson.id)) {
                return ctx.reply('This lesson is already complete. Send /lesson to review it or continue with your practice.');
            }
            const updated = await completeCourseLesson(ctx.from.id, currentLesson.id, null);
            if (currentLesson.id >= BEGINNER_COURSE.length) {
                return ctx.reply('🎉 Congratulations! You completed all 12 beginner speaking lessons. Keep practicing with /course or use /mode for IELTS practice.');
            }
            await ctx.reply(`✅ Lesson ${currentLesson.id} completed. Now let us continue with Lesson ${updated.currentLesson}.`);
            await sendCurrentLesson(ctx, updated);
        } catch (error) {
            console.error('Next lesson error:', error.message);
            await ctx.reply('🙏 I could not move to the next lesson right now.');
        }
    });

    bot.command('resetcourse', async (ctx) => {
        try {
            await resetCourse(ctx.from.id);
            await ctx.reply('🔄 Your beginner course progress has been reset. Send /course to start again from Lesson 1.');
        } catch (error) {
            console.error('Course reset error:', error.message);
            await ctx.reply('🙏 I could not reset your course right now.');
        }
    });

    bot.command('myid', (ctx) => ctx.reply(`Your Telegram ID is: ${ctx.from.id}`));

    bot.command('privacy', (ctx) => ctx.reply('🔐 Privacy controls\n\nYour learning progress, vocabulary, quizzes, voice diagnostics, and Premium status are stored only to provide the service. Use /exportdata to view your stored learning data, or /deletedata to permanently delete your learning data and Premium record.', mainKeyboard()));

    bot.command('exportdata', async (ctx) => {
        try {
            const data = await exportUserData(ctx.from.id);
            await replyLongText(ctx, `📦 Your learning data export\n\n${JSON.stringify(data, null, 2)}`);
        } catch (error) {
            console.error('Data export error:', error.message);
            await ctx.reply('🙏 I could not export your data right now.');
        }
    });

    bot.command('deletedata', (ctx) => ctx.reply('⚠️ This permanently deletes your profile mode, Premium record, course progress, Academy progress, Word Bank, quizzes, pronunciation data, and daily plans. This cannot be undone.', Markup.inlineKeyboard([
        [Markup.button.callback('🗑️ Confirm delete everything', 'confirm_delete_data')],
        [Markup.button.callback('Cancel', 'cancel_delete_data')]
    ])));

    bot.action('confirm_delete_data', async (ctx) => {
        await ctx.answerCbQuery();
        try {
            await deleteUserData(ctx.from.id);
            await ctx.reply('✅ Your learning data has been deleted.', mainKeyboard());
        } catch (error) {
            console.error('Data deletion error:', error.message);
            await ctx.reply('🙏 I could not delete your data right now. Please try again.');
        }
    });

    bot.action('cancel_delete_data', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply('Deletion cancelled.', mainKeyboard());
    });

    bot.command('upgrade', async (ctx) => {
        if (ctx.from.id !== ADMIN_ID) return ctx.reply('❌ This command is available to the admin only.');
        const parts = String(ctx.message.text || '').trim().split(/\s+/);
        const targetUserId = parts[1];
        const days = parts[2] || '30';
        if (!/^\d{3,20}$/.test(targetUserId || '')) {
            return ctx.reply('Usage: /upgrade USER_ID DAYS\nExample: /upgrade 123456789 30');
        }
        try {
            const expiryDate = await makeUserPremium(targetUserId, days);
            await ctx.reply(`✅ Premium enabled for ${targetUserId}.\nExpires: ${expiryDate}`);
            await bot.telegram.sendMessage(targetUserId, `🎉 Premium has been enabled for ${days} days. You can now use the tutor without the daily free limit.`).catch(() => {});
        } catch (error) {
            console.error('Upgrade error:', error.message);
            await ctx.reply(`❌ Could not upgrade this user: ${error.message}`);
        }
    });

    for (const [callback, mode, message] of [
        ['set_default', 'default', '✅ Normal Tutor mode is active.'],
        ['set_ielts', 'ielts', '✅ IELTS Examiner mode is active. Send your answer to begin.'],
        ['set_translator', 'translator', '✅ Translator mode is active. Send text or a .srt/.vtt/.txt file.']
    ]) {
        bot.action(callback, async (ctx) => {
            try {
                await setUserMode(ctx.from.id, mode);
                await ctx.answerCbQuery();
                await ctx.reply(message, mainKeyboard());
            } catch (error) {
                console.error('Mode update error:', error.message);
                await ctx.answerCbQuery('Could not save mode. Try again.');
            }
        });
    }

    bot.on('text', async (ctx) => {
        const userMessage = String(ctx.message.text || '').trim();
        if (!userMessage || userMessage.startsWith('/')) return;
        try {
            const academy = await getAcademyProgress(ctx.from.id);
            const sessionType = academy.session?.type;
            const academyLesson = academy.active ? getAcademyLesson(academy.levelId, academy.lessonNumber) : null;
            const status = await usageOrReply(ctx);
            if (!status) return;
            await ctx.sendChatAction('typing');

            if (sessionType === 'placement') {
                const raw = await getTutorResponse(buildPlacementPrompt(userMessage), 'default');
                const placement = parseJsonResponse(raw);
                if (!placement) return replyLongText(ctx, raw);
                const recommended = LEVEL_ORDER.includes(placement.levelId) ? placement.levelId : 'starter';
                const premiumBlocked = levelIsPremium(recommended) && !(await isPremiumUser(ctx.from.id));
                const chosenLevel = premiumBlocked ? 'elementary' : recommended;
                const updated = await saveAcademyProgress(ctx.from.id, {
                    ...academy,
                    placementCompleted: true,
                    active: true,
                    levelId: chosenLevel,
                    lessonNumber: 1,
                    session: null,
                    placement: { ...placement, recommendedLevel: recommended, placedLevel: chosenLevel }
                });
                await replyLongText(ctx, `✅ Placement interview complete.\n\nRecommended level: ${getLevel(recommended).title} (${getLevel(recommended).cefr})\nStarting level: ${getLevel(chosenLevel).title} (${getLevel(chosenLevel).cefr})\nConfidence: ${placement.confidence || 0}%\n\nStrengths: ${(placement.strengths || []).join('; ') || 'You completed the interview.'}\nPriorities: ${(placement.priorities || []).join('; ') || 'Build confidence through regular practice.'}${premiumBlocked ? '\n\nYour recommended level is in Premium Academy, so I am starting you with the free level. Upgrade Premium to unlock the recommended path.' : ''}`);
                await sendAcademyLesson(ctx, updated);
                return;
            }

            if (sessionType === 'live_voice') {
                return ctx.reply('🎙️ Live Voice Conversation needs a voice message. Send your answer by voice, or use /endlive to finish.');
            }

            if (sessionType === 'pronunciation') {
                return ctx.reply('🗣️ Please send a voice message so I can analyze your pronunciation.');
            }

            if (sessionType === 'coach') {
                const level = getLevel(academy.levelId);
                const replyMessage = await getTutorResponse(buildCoachPrompt(level, userMessage, getTrack(academy.trackId)), 'default');
                await replyLongText(ctx, replyMessage);
                await saveAcademyProgress(ctx.from.id, { ...academy, session: { type: 'coach' }, coachQuestions: Number(academy.coachQuestions || 0) + 1 });
                await sendEnglishVoiceReply(ctx, replyMessage);
                return;
            }

            if (sessionType === 'roleplay' && academyLesson) {
                if (!(await hasAcademyAccess(ctx, academy.levelId))) return;
                const level = getLevel(academy.levelId);
                const replyMessage = await getTutorResponse(buildRoleplayPrompt(academyLesson, level, userMessage), 'default');
                await replyLongText(ctx, replyMessage);
                const today = new Date().toISOString().slice(0, 10);
                await saveAcademyProgress(ctx.from.id, { ...academy, practiceAttempts: Number(academy.practiceAttempts || 0) + 1, points: Number(academy.points || 0) + 12, lastPracticeDate: today });
                await sendEnglishVoiceReply(ctx, replyMessage);
                return;
            }

            if (sessionType === 'assessment') {
                const level = getLevel(academy.levelId);
                const assessmentLesson = academyLesson || getAcademyLesson('advanced-pro', 6);
                const raw = await getTutorResponse(buildAssessmentPrompt(level, academy.session.assessmentType, userMessage), 'default');
                const assessment = parseJsonResponse(raw);
                if (!assessment) return replyLongText(ctx, raw);
                const updated = await saveAcademyProgress(ctx.from.id, {
                    ...academy,
                    session: null,
                    assessmentCount: Number(academy.assessmentCount || 0) + 1,
                    lastAssessment: assessment,
                    lastScore: assessment.overall,
                    grammarScore: assessment.grammar != null ? Number(assessment.grammar) * 10 : academy.grammarScore,
                    vocabularyScore: assessment.vocabulary != null ? Number(assessment.vocabulary) * 10 : academy.vocabularyScore,
                    fluencyScore: assessment.fluency != null ? Number(assessment.fluency) * 10 : academy.fluencyScore,
                    pronunciationScore: assessment.pronunciation != null ? Number(assessment.pronunciation) * 10 : academy.pronunciationScore,
                    speakingScore: assessment.overall != null ? Number(assessment.overall) * 10 : academy.speakingScore,
                    points: Number(academy.points || 0) + Number(assessment.overall || 0) * 10,
                    lastAssessmentLesson: assessmentLesson?.id || null
                });
                await replyLongText(ctx, `📝 ${level.title} Assessment Result\n\nOverall: ${assessment.overall || 0}/10\nGrammar: ${assessment.grammar || 0}/10\nVocabulary: ${assessment.vocabulary || 0}/10\nFluency: ${assessment.fluency || 0}/10\nPronunciation/clarity: ${assessment.pronunciation || 0}/10\nTask completion: ${assessment.taskCompletion || 0}/10\n\nStrength: ${assessment.strength || 'Keep practicing.'}\nPriorities: ${(assessment.priorities || []).join('; ') || 'Continue regular speaking practice.'}\nCorrected example: ${assessment.correctedExample || 'Keep building complete sentences.'}\nNext task: ${assessment.nextTask || 'Repeat this answer with more detail.'}\n\nPoints: ${updated.points}`);
                return;
            }

            if (academy.active && academyLesson) {
                if (!(await hasAcademyAccess(ctx, academy.levelId))) return;
                const level = getLevel(academy.levelId);
                const replyMessage = await getTutorResponse(buildAcademyTextPrompt(academyLesson, level, userMessage), 'default');
                await replyLongText(ctx, replyMessage);
                const today = new Date().toISOString().slice(0, 10);
                const streak = academy.lastPracticeDate === today ? Number(academy.streak || 0) : Number(academy.streak || 0) + 1;
                await saveAcademyProgress(ctx.from.id, { ...academy, practiceAttempts: Number(academy.practiceAttempts || 0) + 1, points: Number(academy.points || 0) + 10, streak, lastPracticeDate: today });
                await sendEnglishVoiceReply(ctx, replyMessage);
                return;
            }

            const progress = await getCourseProgress(ctx.from.id);
            const activeLesson = progress.active ? getBeginnerLesson(progress.currentLesson) : null;
            if (activeLesson) {
                const replyMessage = await getTutorResponse(buildTextPracticePrompt(activeLesson, userMessage), 'default');
                await replyLongText(ctx, replyMessage);
                await savePracticeAttempt(ctx.from.id, progress, false);
                await sendEnglishVoiceReply(ctx, replyMessage);
                return;
            }

            const currentMode = await getCurrentMode(ctx.from.id);
            const replyMessage = await getTutorResponse(userMessage, currentMode);
            await replyLongText(ctx, replyMessage);
            if (currentMode !== 'translator') await sendEnglishVoiceReply(ctx, replyMessage);
        } catch (error) {
            console.error('Error processing text:', error.message);
            await ctx.reply(error.message === 'API_ERROR'
                ? '🙏 AI service is temporarily unavailable. Please try again shortly.'
                : '🙏 I could not process that message. Please try again.');
        }
    });

    bot.on('voice', async (ctx) => {
        try {
            const academy = await getAcademyProgress(ctx.from.id);
            const sessionType = academy.session?.type;
            const academyLesson = academy.active ? getAcademyLesson(academy.levelId, academy.lessonNumber) : null;
            const status = await usageOrReply(ctx);
            if (!status) return;
            await ctx.sendChatAction('typing');
            const fileId = ctx.message.voice.file_id;
            const fileLink = await ctx.telegram.getFileLink(fileId);
            const response = await fetch(fileLink.href);
            if (!response.ok) throw new Error(`Telegram file download failed: ${response.status}`);
            const buffer = Buffer.from(await response.arrayBuffer());

            if (sessionType === 'placement') {
                const raw = await getTutorResponseFromAudio(buffer, ctx.message.voice.mime_type || 'audio/ogg', 'default', buildPlacementVoicePrompt());
                const placement = parseJsonResponse(raw) || { levelId: 'starter', confidence: 0, strengths: [], priorities: ['Build confidence with simple speaking practice.'] };
                const recommended = LEVEL_ORDER.includes(placement.levelId) ? placement.levelId : 'starter';
                const premiumBlocked = levelIsPremium(recommended) && !(await isPremiumUser(ctx.from.id));
                const chosenLevel = premiumBlocked ? 'elementary' : recommended;
                const updated = await saveAcademyProgress(ctx.from.id, { ...academy, placementCompleted: true, session: null, levelId: chosenLevel, lessonNumber: 1, placement: { ...placement, voiceInterview: true, recommendedLevel: recommended, placedLevel: chosenLevel } });
                await replyLongText(ctx, `✅ Voice placement complete.\nRecommended level: ${getLevel(recommended).title} (${getLevel(recommended).cefr})\nStarting level: ${getLevel(chosenLevel).title} (${getLevel(chosenLevel).cefr})\nConfidence: ${placement.confidence || 0}%${premiumBlocked ? '\n\nYour recommended level is part of Premium Academy. Upgrade to unlock it.' : ''}`);
                await sendAcademyLesson(ctx, updated);
                return;
            }

            if (sessionType === 'live_voice') {
                const level = getLevel(academy.levelId);
                const track = getTrack(academy.trackId);
                const turns = Number(academy.session.turns || 0);
                const replyMessage = await getTutorResponseFromAudio(buffer, ctx.message.voice.mime_type || 'audio/ogg', 'default', buildLiveVoicePrompt(level, track, turns));
                const updated = await saveAcademyProgress(ctx.from.id, { ...academy, session: { ...academy.session, type: 'live_voice', turns: turns + 1 }, practiceAttempts: Number(academy.practiceAttempts || 0) + 1, speakingAttempts: Number(academy.speakingAttempts || 0) + 1, points: Number(academy.points || 0) + 15, speakingScore: Math.max(Number(academy.speakingScore || 0), 50) });
                await replyLongText(ctx, replyMessage);
                await sendEnglishVoiceReply(ctx, replyMessage);
                return updated;
            }

            if (sessionType === 'pronunciation') {
                const level = getLevel(academy.levelId);
                const raw = await getTutorResponseFromAudio(buffer, ctx.message.voice.mime_type || 'audio/ogg', 'default', buildPronunciationPrompt(level, academyLesson));
                const pronunciation = parseJsonResponse(raw) || { score: 0, clarity: 0, sounds: [], stressTip: 'Speak slowly and repeat the sentence.', correctedSentence: '', repeatTask: raw };
                const score = Math.max(0, Math.min(10, Number(pronunciation.score || 0)));
                const updated = await saveAcademyProgress(ctx.from.id, {
                    ...academy,
                    session: null,
                    pronunciationAttempts: Number(academy.pronunciationAttempts || 0) + 1,
                    lastPronunciation: pronunciation,
                    pronunciationScore: Math.round(score * 10),
                    speakingScore: Math.max(Number(academy.speakingScore || 0), Math.round(score * 10)),
                    points: Number(academy.points || 0) + Math.round(score * 3)
                });
                await replyLongText(ctx, `🗣️ Pronunciation Report\n\nScore: ${score}/10\nClarity: ${pronunciation.clarity || 0}/10\n\n${(pronunciation.sounds || []).map((item) => `${item.word || 'Sound'}: ${item.issue || 'Keep practicing'} — ${item.tip || ''}`).join('\n') || 'No single sound issue was detected.'}\n\nStress tip: ${pronunciation.stressTip || 'Keep the important words clear.'}\nRepeat task: ${pronunciation.repeatTask || 'Repeat the sentence three times slowly.'}\n\nSpeaking points: ${updated.points}`);
                await sendEnglishVoiceReply(ctx, pronunciation.correctedSentence || pronunciation.repeatTask || 'Repeat the sentence slowly and clearly.');
                return;
            }

            if (sessionType === 'coach') {
                const level = getLevel(academy.levelId);
                const replyMessage = await getTutorResponseFromAudio(buffer, ctx.message.voice.mime_type || 'audio/ogg', 'default', buildCoachVoicePrompt(level));
                await replyLongText(ctx, replyMessage);
                await saveAcademyProgress(ctx.from.id, { ...academy, session: { type: 'coach' }, coachQuestions: Number(academy.coachQuestions || 0) + 1 });
                await sendEnglishVoiceReply(ctx, replyMessage);
                return;
            }

            if (sessionType === 'roleplay' && academyLesson) {
                if (!(await hasAcademyAccess(ctx, academy.levelId))) return;
                const level = getLevel(academy.levelId);
                const replyMessage = await getTutorResponseFromAudio(buffer, ctx.message.voice.mime_type || 'audio/ogg', 'default', buildRoleplayVoicePrompt(academyLesson, level));
                await replyLongText(ctx, replyMessage);
                const today = new Date().toISOString().slice(0, 10);
                await saveAcademyProgress(ctx.from.id, { ...academy, practiceAttempts: Number(academy.practiceAttempts || 0) + 1, speakingAttempts: Number(academy.speakingAttempts || 0) + 1, points: Number(academy.points || 0) + 15, lastPracticeDate: today });
                await sendEnglishVoiceReply(ctx, replyMessage);
                return;
            }

            if (sessionType === 'assessment') {
                const level = getLevel(academy.levelId);
                const scorePrompt = `Listen to this speaking assessment at ${level.title} (${level.cefr}). Return JSON only: {"overall":0,"grammar":0,"vocabulary":0,"fluency":0,"pronunciation":0,"taskCompletion":0,"strength":"...","priorities":["...","..."],"correctedExample":"...","nextTask":"..."}. Score every category from 0 to 10 and give concise feedback.`;
                const raw = await getTutorResponseFromAudio(buffer, ctx.message.voice.mime_type || 'audio/ogg', 'default', scorePrompt);
                const assessment = parseJsonResponse(raw) || { overall: 0, strength: raw, priorities: ['Repeat the task with clearer sentences.'] };
                const updated = await saveAcademyProgress(ctx.from.id, { ...academy, session: null, assessmentCount: Number(academy.assessmentCount || 0) + 1, lastAssessment: assessment, lastScore: assessment.overall, grammarScore: assessment.grammar != null ? Number(assessment.grammar) * 10 : academy.grammarScore, vocabularyScore: assessment.vocabulary != null ? Number(assessment.vocabulary) * 10 : academy.vocabularyScore, fluencyScore: assessment.fluency != null ? Number(assessment.fluency) * 10 : academy.fluencyScore, pronunciationScore: assessment.pronunciation != null ? Number(assessment.pronunciation) * 10 : academy.pronunciationScore, speakingScore: assessment.overall != null ? Number(assessment.overall) * 10 : academy.speakingScore, points: Number(academy.points || 0) + Number(assessment.overall || 0) * 10 });
                await replyLongText(ctx, `📝 Speaking assessment result\n\nOverall: ${assessment.overall || 0}/10\nGrammar: ${assessment.grammar || 0}/10\nVocabulary: ${assessment.vocabulary || 0}/10\nFluency: ${assessment.fluency || 0}/10\nPronunciation: ${assessment.pronunciation || 0}/10\n\nStrength: ${assessment.strength || 'Keep practicing.'}\nPriorities: ${(assessment.priorities || []).join('; ')}\nCorrected example: ${assessment.correctedExample || 'Try one more clear sentence.'}\nNext task: ${assessment.nextTask || 'Repeat the answer slowly and clearly.'}\n\nPoints: ${updated.points}`);
                return;
            }

            if (academy.active && academyLesson) {
                if (!(await hasAcademyAccess(ctx, academy.levelId))) return;
                const level = getLevel(academy.levelId);
                const replyMessage = await getTutorResponseFromAudio(buffer, ctx.message.voice.mime_type || 'audio/ogg', 'default', buildAcademyVoicePrompt(academyLesson, level));
                await replyLongText(ctx, replyMessage);
                const today = new Date().toISOString().slice(0, 10);
                const streak = academy.lastPracticeDate === today ? Number(academy.streak || 0) : Number(academy.streak || 0) + 1;
                await saveAcademyProgress(ctx.from.id, { ...academy, practiceAttempts: Number(academy.practiceAttempts || 0) + 1, speakingAttempts: Number(academy.speakingAttempts || 0) + 1, points: Number(academy.points || 0) + 15, streak, lastPracticeDate: today });
                await sendEnglishVoiceReply(ctx, replyMessage);
                return;
            }

            const progress = await getCourseProgress(ctx.from.id);
            const activeLesson = progress.active ? getBeginnerLesson(progress.currentLesson) : null;
            const currentMode = activeLesson ? 'default' : await getCurrentMode(ctx.from.id);
            const replyMessage = await getTutorResponseFromAudio(buffer, ctx.message.voice.mime_type || 'audio/ogg', currentMode, activeLesson ? buildVoicePracticePrompt(activeLesson) : '');
            await replyLongText(ctx, replyMessage);
            if (activeLesson) {
                await savePracticeAttempt(ctx.from.id, progress, true);
                await sendEnglishVoiceReply(ctx, replyMessage);
            } else if (currentMode !== 'translator') {
                await sendEnglishVoiceReply(ctx, replyMessage);
            }
        } catch (error) {
            console.error('Error processing voice:', error.message);
            await ctx.reply(error.message === 'API_ERROR'
                ? '🙏 AI service is temporarily unavailable. Please try again shortly.'
                : '🙏 I could not hear that clearly. Please send the voice message again.');
        }
    });

    bot.on('document', async (ctx) => {
        try {
            const currentMode = await getCurrentMode(ctx.from.id);
            if (currentMode !== 'translator') {
                return ctx.reply('Please select Translator mode with /mode before sending a subtitle or text file.');
            }
            const document = ctx.message.document;
            const fileName = String(document.file_name || 'document.txt');
            const extension = fileName.toLowerCase().split('.').pop();
            if (!['srt', 'vtt', 'txt'].includes(extension)) {
                return ctx.reply('Only .srt, .vtt, and .txt files are supported.');
            }
            if (document.file_size && document.file_size > MAX_DOCUMENT_BYTES) {
                return ctx.reply('The file is too large. Please send a file smaller than 10 MB.');
            }
            const status = await usageOrReply(ctx);
            if (!status) return;
            await ctx.sendChatAction('typing');
            const fileLink = await ctx.telegram.getFileLink(document.file_id);
            const response = await fetch(fileLink.href);
            if (!response.ok) throw new Error(`Telegram file download failed: ${response.status}`);
            const sourceText = await response.text();
            if (!sourceText.trim()) return ctx.reply('The file is empty.');
            const replyMessage = await getTutorResponse(sourceText.slice(0, 120000), 'translator');
            await replyLongText(ctx, replyMessage);
        } catch (error) {
            console.error('Error processing document:', error.message);
            await ctx.reply(error.message === 'API_ERROR'
                ? '🙏 Translation service is temporarily unavailable. Please try again shortly.'
                : '🙏 I could not process that file. Please check the format and try again.');
        }
    });
}

module.exports = { setupHandlers, splitMessage, englishSpeechChunks, mainKeyboard, academyKeyboard, modeReplyKeyboard, BUTTONS, normalizeQuiz, quizKeyboard, quizNextKeyboard, normalizeDailyPlan, dailyPlanKeyboard };
