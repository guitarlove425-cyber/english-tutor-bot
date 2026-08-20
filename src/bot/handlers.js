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
    buildTeacherPhasePrompt,
    buildAssessmentPrompt
} = require('../academy/teacher');
const {
    createTeacherSession,
    normalizeTeacherSession,
    advanceTeacherSession,
    teacherPhaseMessage,
    assignHomework,
    completeHomework,
    scheduleReview
} = require('../academy/session');

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

function teacherLessonKeyboard(session) {
    const current = normalizeTeacherSession(session);
    return Markup.inlineKeyboard([
        [Markup.button.callback('📖 ဆရာရှင်းပြချက်', 'teacher_phase_explain'), Markup.button.callback('🔊 ဥပမာပြရန်', 'teacher_phase_model')],
        [Markup.button.callback('🧪 နားလည်မှုစစ်ရန်', 'teacher_phase_check'), Markup.button.callback('✍️ အကူအညီဖြင့်လေ့ကျင့်ရန်', 'teacher_phase_guided')],
        [Markup.button.callback('🗣️ ကိုယ်တိုင်ပြောရန်', 'teacher_phase_independent')],
        [Markup.button.callback('📝 အကဲဖြတ်ရန်', 'teacher_phase_assess'), Markup.button.callback('🏠 အိမ်စာ', 'teacher_phase_homework')],
        [Markup.button.callback('🔁 ပြန်လေ့ကျင့်ရန်', 'teacher_phase_review'), Markup.button.callback('➡️ နောက်အဆင့်', 'teacher_phase_next')]
    ]);
}

function homeworkKeyboard(items = []) {
    const buttons = items.map((item, index) => [Markup.button.callback(`${item.completed ? '✅' : '⬜'} ${item.title}`, `teacher_homework_${index}`)]);
    buttons.push([Markup.button.callback('📘 Lesson သို့ပြန်ရန်', 'teacher_homework_lesson')]);
    return Markup.inlineKeyboard(buttons);
}

function homeworkMessage(items = []) {
    if (!items.length) return '🏠 အိမ်စာ မသတ်မှတ်ရသေးပါ။ သင်ခန်းစာအတွင်း 🏠 အိမ်စာ ခလုတ်ကိုနှိပ်ပါ။';
    const lines = items.map((item) => `${item.completed ? '✅' : '⬜'} ${item.title}\n   ${item.instructions}${item.dueDate ? `\n   ပြီးရမည့်ရက်: ${item.dueDate}` : ''}`);
    return `🏠 ဒီနေ့အတွက် အိမ်စာ\n\n${lines.join('\n\n')}\n\nအိမ်စာလုပ်ပြီးတိုင်း သက်ဆိုင်ရာခလုတ်ကိုနှိပ်ပါ။`;
}

async function getTeacherContext(ctx) {
    const academy = await getAcademyProgress(ctx.from.id);
    if (academy.active) {
        const lesson = getAcademyLesson(academy.levelId, academy.lessonNumber);
        if (lesson) return { kind: 'academy', progress: academy, lesson, level: getLevel(academy.levelId) };
    }
    const course = await getCourseProgress(ctx.from.id);
    if (course.active) {
        const lesson = getBeginnerLesson(course.currentLesson);
        if (lesson) return { kind: 'course', progress: course, lesson, level: { title: 'Beginner', cefr: 'A0-A1' } };
    }
    return null;
}

async function saveTeacherContext(ctx, context, progress) {
    if (context.kind === 'academy') return saveAcademyProgress(ctx.from.id, progress);
    return saveCourseProgress(ctx.from.id, progress);
}

async function runTeacherPhase(ctx, requestedPhase = 'explain', learnerAnswer = '') {
    const context = await getTeacherContext(ctx);
    if (!context) return ctx.reply('သင်ခန်းစာဆရာစနစ် စတင်ရန် /academy သို့မဟုတ် /course ကို အရင်နှိပ်ပါ။');
    const fallbackType = context.kind === 'academy' ? 'academy_lesson' : 'course_lesson';
    const current = normalizeTeacherSession(context.progress.teacherSession, fallbackType);
    const phase = requestedPhase === 'next' ? null : requestedPhase;
    const raw = await getTutorResponse(buildTeacherPhasePrompt(context.level, context.lesson, phase || current.phase, learnerAnswer), 'default');
    const next = advanceTeacherSession(current, phase, {
        lessonId: String(context.lesson.id || context.lesson.number),
        attempts: current.attempts + (learnerAnswer ? 1 : 0),
        checksPassed: phase === 'check' ? current.checksPassed + 1 : current.checksPassed,
        lastAnswer: learnerAnswer || current.lastAnswer || null
    });
    const isHomework = next.phase === 'homework';
    const homework = isHomework
        ? assignHomework([
            { id: `${fallbackType}_${context.lesson.id}_speaking`, title: 'Speaking အိမ်စာ', instructions: `${context.lesson.speakingTask || 'ဒီနေ့သင်ခန်းစာအကြောင်းကို English ဖြင့် ၁ မိနစ်ပြောပါ။'}`, dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10) },
            { id: `${fallbackType}_${context.lesson.id}_review`, title: 'Vocabulary/Grammar ပြန်လေ့ကျင့်ရန်', instructions: `ဒီ lesson ရဲ့ vocabulary နဲ့ grammar ကို ပြန်လေ့လာပြီး English ဝါကျ ၅ ကြောင်းရေးပါ။`, dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10) }
        ], new Date(Date.now() + 86400000).toISOString().slice(0, 10))
        : (context.progress.homework || []);
    const reviewQueue = next.phase === 'homework'
        ? scheduleReview(context.progress.reviewQueue || [], { id: String(context.lesson.id || context.lesson.number), title: context.lesson.title, reason: 'နောက် lesson မစမီ ဒီ lesson ကို ပြန်နွေးရန်' })
        : (context.progress.reviewQueue || []);
    const updated = await saveTeacherContext(ctx, context, {
        ...context.progress,
        teacherSession: next,
        homework,
        reviewQueue
    });
    await replyLongText(ctx, `👩‍🏫 ${teacherPhaseMessage(next)}\n\n${raw}`);
    await ctx.reply('အောက်ကခလုတ်နဲ့ နောက်တစ်ဆင့်ကို ဆက်လုပ်ပါ။', teacherLessonKeyboard(next));
    await ctx.reply('အခြားလေ့ကျင့်မှုများကို ရွေးချယ်ရန် Academy menu ကို အသုံးပြုပါ။', academyKeyboard());
    return updated;
}

async function runTeacherVoicePhase(ctx, buffer, mimeType = 'audio/ogg') {
    const context = await getTeacherContext(ctx);
    if (!context) return ctx.reply('သင်ခန်းစာဆရာစနစ် စတင်ရန် /academy သို့မဟုတ် /course ကို အရင်နှိပ်ပါ။');
    const current = normalizeTeacherSession(context.progress.teacherSession, context.kind === 'academy' ? 'academy_lesson' : 'course_lesson');
    const raw = await getTutorResponseFromAudio(buffer, mimeType, 'default', buildTeacherPhasePrompt(context.level, context.lesson, current.phase, 'Voice ဖြင့် အဖြေ ပို့ထားသည်။'));
    const next = advanceTeacherSession(current, null, {
        attempts: current.attempts + 1,
        lastVoiceAt: new Date().toISOString()
    });
    const updated = await saveTeacherContext(ctx, context, {
        ...context.progress,
        teacherSession: next,
        speakingAttempts: Number(context.progress.speakingAttempts || 0) + 1,
        practiceAttempts: Number(context.progress.practiceAttempts || 0) + 1,
        points: Number(context.progress.points || 0) + 10
    });
    await replyLongText(ctx, `👩‍🏫 ${teacherPhaseMessage(next)}\n\n${raw}`);
    await sendEnglishVoiceReply(ctx, raw);
    await ctx.reply('အောက်ကခလုတ်နဲ့ နောက်တစ်ဆင့်ကို ဆက်လုပ်ပါ။', teacherLessonKeyboard(next));
    await ctx.reply('အခြားလေ့ကျင့်မှုများကို ရွေးချယ်ရန် Academy menu ကို အသုံးပြုပါ။', academyKeyboard());
    return updated;
}

async function sendCurrentLesson(ctx, progress) {
    const lesson = getBeginnerLesson(progress.currentLesson) || BEGINNER_COURSE[0];
    const existingSession = normalizeTeacherSession(progress.teacherSession, 'course_lesson');
    const teacherSession = existingSession.lessonId === String(lesson.id)
        ? existingSession
        : createTeacherSession('course_lesson', { lessonId: String(lesson.id) });
    const updated = await saveCourseProgress(ctx.from.id, { ...progress, teacherSession });
    await replyLongText(ctx, buildLessonIntro(lesson, BEGINNER_COURSE.length));
    await sendEnglishVoiceReply(ctx, lesson.examples.join('. '));
    await ctx.reply('👩‍🏫 အခု ဆရာဦးဆောင်သင်ကြားမည့်အဆင့်ကို အောက်ကခလုတ်မှ ရွေးပါ။', teacherLessonKeyboard(updated.teacherSession));
    await ctx.reply('အခြား Beginner Course လုပ်ဆောင်ချက်များကို ရွေးချယ်ရန် Main menu ကို အသုံးပြုပါ။', mainKeyboard());
}

function courseProgressMessage(progress) {
    const completed = Array.isArray(progress.completedLessons) ? progress.completedLessons.length : 0;
    const currentLesson = getBeginnerLesson(progress.currentLesson) || BEGINNER_COURSE[BEGINNER_COURSE.length - 1];
    const percentage = Math.round((completed / BEGINNER_COURSE.length) * 100);
    return `📊 Beginner Course တိုးတက်မှု\n\nပြီးဆုံးပြီးသော lesson: ${completed}/${BEGINNER_COURSE.length} (${percentage}%)\nလက်ရှိ lesson: ${currentLesson.id}. ${currentLesson.title}\nလေ့ကျင့်မှုအကြိမ်: ${progress.practiceAttempts || 0}\nSpeaking အကြိမ်: ${progress.speakingAttempts || 0}\n\nလက်ရှိ lesson ကြည့်ရန် /lesson၊ အဆင်သင့်ဖြစ်ရင် နောက် lesson သွားရန် /nextlesson၊ ပြန်စရန် /resetcourse ကိုနှိပ်ပါ။`;
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
    return `🏫 English Speaking Academy\n\nအဆင့်: ${level.title} (${level.cefr}) — ${premiumLabel}\nလေ့လာမည့်လမ်းကြောင်း: ${track.title}\nလက်ရှိ lesson: ${lesson ? `${lesson.number}. ${lesson.title}` : 'ပြီးဆုံးပါပြီ'}\nပြီးဆုံးပြီးသော lesson: ${completed}/${total} (${percent}%)\nPoints: ${progress.points || 0}\nလေ့ကျင့်မှုအကြိမ်: ${progress.practiceAttempts || 0}\nSpeaking အကြိမ်: ${progress.speakingAttempts || 0}\nQuiz အမှတ်: ${progress.quizCorrect || 0}/${progress.quizAnswered || 0}\nQuiz streak: ${progress.quizStreak || 0}\nCoach မေးမြန်းမှု: ${progress.coachQuestions || 0}\nဒီနေ့ plan: ${dailyDone}\nStreak: ${progress.streak || 0} ရက်\n\nLesson ပြန်ကြည့်ရန် /academylesson၊ Quiz အသစ်အတွက် /academyquiz၊ အကြံဉာဏ်မေးရန် /coach၊ ဒီနေ့ plan အတွက် /dailyplan၊ Review အတွက် /academyreview၊ Assessment အတွက် /academyassessment၊ ပြန်စရန် /academyreset ကိုနှိပ်ပါ။`;
}

async function hasAcademyAccess(ctx, levelId) {
    if (!levelIsPremium(levelId)) return true;
    if (await isPremiumUser(ctx.from.id)) return true;
    await ctx.reply('🔒 ဒီအဆင့်က Premium Academy ထဲမှာ ပါပါတယ်။ သင့် Telegram ID ကို Admin ထံပေးပြီး Premium ဖွင့်ခိုင်းကာ ပြန်စမ်းပါ။');
    return false;
}

async function sendAcademyLesson(ctx, progress) {
    const level = getLevel(progress.levelId);
    const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
    if (!lesson) {
        await ctx.reply('🎓 English Speaking Academy အပြည့်ကို ပြီးမြောက်ပါပြီ။ Final assessment ဖြေရန် /academyassessment ကိုနှိပ်ပါ။');
        return;
    }
    if (!(await hasAcademyAccess(ctx, level.id))) return;
    const wordBank = seedWordBank(progress.wordBank, lesson.vocabulary, todayUtc());
    const existingSession = normalizeTeacherSession(progress.teacherSession, 'academy_lesson');
    const teacherSession = existingSession.lessonId === String(lesson.id) && existingSession.levelId === level.id
        ? existingSession
        : createTeacherSession('academy_lesson', { lessonId: String(lesson.id), levelId: level.id });
    const updated = await saveAcademyProgress(ctx.from.id, {
        ...progress,
        wordBank,
        teacherSession
    });
    await replyLongText(ctx, buildAcademyLessonIntro(lesson, level, level.lessons.length));
    await sendEnglishVoiceReply(ctx, `${lesson.title}. ${lesson.objective}. ${lesson.grammar}.`);
    await ctx.reply('👩‍🏫 အခု ဆရာဦးဆောင်သင်ကြားမည့်အဆင့်ကို အောက်ကခလုတ်မှ ရွေးပါ။', teacherLessonKeyboard(updated.teacherSession));
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
        teachingNote: String(data.teachingNote || 'အရင်ဆုံး ဒီမေးခွန်းနဲ့ဆိုင်တဲ့ အချက်ကို စဉ်းစားပါ။ မသိရင် clue ကို အသုံးပြုပါ။').trim(),
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
    await ctx.reply(`🧑‍🏫 ဆရာရှင်းပြချက်\n${quiz.teachingNote}\n\n🧠 ${level.title} Quiz — ${lesson.title}\n\n${quiz.question}\n\nအကောင်းဆုံးအဖြေကို ရွေးပါ။`, quizKeyboard(quiz));
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
    await ctx.reply(`${correct ? '✅ မှန်ပါတယ်။' : `❌ မမှန်သေးပါ။ မှန်ကန်သောအဖြေ: ${correctAnswer}`}\n\n${feedback}\n\nQuiz အမှတ်: ${updated.quizCorrect}/${updated.quizAnswered}\nPoints: ${updated.points}`, quizNextKeyboard());
}

function wordBankMessage(progress) {
    const words = Array.isArray(progress.wordBank) ? progress.wordBank : [];
    const due = getDueWords(words, todayUtc());
    const mastered = words.filter((entry) => Number(entry.repetitions || 0) >= 3).length;
    const preview = due.slice(0, 12).map((entry) => `• ${entry.word} — ပြန်လေ့ကျင့်ရမည့်ရက် ${entry.dueDate || 'ယနေ့'}${entry.repetitions ? ` (${entry.repetitions} ကြိမ် ပြန်လေ့ကျင့်ပြီး)` : ''}`).join('\n') || 'ဒီနေ့ပြန်လေ့ကျင့်ရန် စကားလုံးမရှိသေးပါ။ ဆက်လေ့လာပြီး မနက်ဖြန် ပြန်လာပါ။';
    return `📖 My Word Bank\n\nစကားလုံးစုစုပေါင်း: ${words.length}\nဒီနေ့ပြန်လေ့ကျင့်ရန်: ${due.length}\nကျွမ်းကျင်ပြီး: ${mastered}\n\n${preview}\n\nခက်သောစကားလုံးများကို ပိုမိုမေးနိုင်ရန် spaced repetition စနစ်ဖြင့် အချိန်ဇယားဆွဲထားပါတယ်။`;
}

function wordBankKeyboard(progress) {
    const due = getDueWords(progress.wordBank, todayUtc()).length;
    return Markup.inlineKeyboard([
        ...(due ? [[Markup.button.callback(`🔁 စကားလုံး ${Math.min(due, 8)} လုံး ပြန်လေ့ကျင့်ရန်`, 'word_review')]] : []),
        [Markup.button.callback('🌱 လက်ရှိ lesson စကားလုံးများ ထည့်ရန်', 'word_seed')],
        [Markup.button.callback('🏠 ပင်မ Menu', 'word_home')]
    ]);
}

async function showWordBank(ctx) {
    const progress = await getAcademyProgress(ctx.from.id);
    if (!progress.active) return ctx.reply('မိမိအတွက် Word Bank တည်ဆောက်ရန် အရင်ဆုံး /academy ကိုနှိပ်ပါ။');
    const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
    const wordBank = seedWordBank(progress.wordBank, lesson?.vocabulary, todayUtc());
    const updated = wordBank.length !== (progress.wordBank || []).length
        ? await saveAcademyProgress(ctx.from.id, { ...progress, wordBank })
        : progress;
    await ctx.reply(wordBankMessage(updated), wordBankKeyboard(updated));
}

async function seedCurrentLessonWords(ctx) {
    const progress = await getAcademyProgress(ctx.from.id);
    if (!progress.active) return ctx.reply('မိမိအတွက် Word Bank တည်ဆောက်ရန် အရင်ဆုံး /academy ကိုနှိပ်ပါ။');
    const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
    const wordBank = seedWordBank(progress.wordBank, lesson?.vocabulary, todayUtc());
    const updated = await saveAcademyProgress(ctx.from.id, { ...progress, wordBank });
    await ctx.reply(`🌱 လက်ရှိ lesson vocabulary ကို ထည့်ပြီးပါပြီ။ Word Bank မှာ စကားလုံး ${updated.wordBank.length} လုံး ရှိပါပြီ။`, wordBankKeyboard(updated));
}

async function startWordReview(ctx) {
    const progress = await getAcademyProgress(ctx.from.id);
    const due = getDueWords(progress.wordBank, todayUtc()).slice(0, 8);
    if (!due.length) return ctx.reply('✅ ဒီနေ့ပြန်လေ့ကျင့်ရန် vocabulary မရှိသေးပါ။ လက်ရှိ lesson ကို ဆက်လေ့လာပါ သို့မဟုတ် မနက်ဖြန် ပြန်လာပါ။');
    const status = await usageOrReply(ctx);
    if (!status) return;
    const level = getLevel(progress.levelId);
    const raw = await getTutorResponse(buildWordReviewPrompt(level, due.map((entry) => entry.word)), 'default');
    const quiz = normalizeQuiz(parseJsonResponse(raw));
    if (!quiz) return replyLongText(ctx, raw);
    await saveAcademyProgress(ctx.from.id, { ...progress, session: { type: 'word_review', question: quiz, wordId: due[0].id } });
    await ctx.reply(`🧑‍🏫 ဆရာရှင်းပြချက်\n${quiz.teachingNote}\n\n🔁 Vocabulary ပြန်လေ့ကျင့်ရန်\n\n${quiz.question}`, wordQuizKeyboard(quiz));
}

async function answerWordReview(ctx, selectedIndex) {
    const progress = await getAcademyProgress(ctx.from.id);
    const session = progress.session?.type === 'word_review' ? progress.session : null;
    if (!session) return ctx.reply('အရင်ဆုံး /wordbank မှာ Review ကို စတင်ပါ။');
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
    await ctx.reply(`${correct ? '✅ မှန်ပါတယ်။' : `❌ မှန်ကန်သောအဖြေ: ${answer}`}\n\n${quiz.explanation || 'ဒီစကားလုံးကို ပြန်လေ့လာပြီး မိမိကိုယ်တိုင် English ဝါကျတစ်ကြောင်း ဖန်တီးပါ။'}\n\nVocabulary points: ${updated.points}`, wordBankKeyboard(updated));
}

function normalizeDailyPlan(data, date) {
    if (!data || !Array.isArray(data.tasks) || data.tasks.length < 4 || data.tasks.length > 5) return null;
    const allowedTypes = new Set(['speaking', 'listening', 'vocabulary', 'grammar', 'review']);
    const tasks = data.tasks.map((task, index) => ({
        id: `task_${index + 1}`,
        type: allowedTypes.has(task.type) ? task.type : 'review',
        title: String(task.title || `English လေ့ကျင့်ခန်း ${index + 1}`).trim().slice(0, 120),
        minutes: Math.max(3, Math.min(20, Number.parseInt(task.minutes, 10) || 5)),
        instructions: String(task.instructions || 'ဒီ skill ကို English ဖြင့် လေ့ကျင့်ပါ။').trim().slice(0, 500)
    }));
    return {
        date,
        focus: String(data.focus || 'English skill များကို မျှတစွာ လေ့ကျင့်ရန်').trim().slice(0, 200),
        totalMinutes: tasks.reduce((sum, task) => sum + task.minutes, 0),
        tasks
    };
}

function dailyPlanKeyboard(plan, completed = []) {
    const buttons = plan.tasks.map((task, index) => [Markup.button.callback(`${completed.includes(task.id) ? '✅' : '⬜'} ${task.title}`, `daily_done_${index}`)]);
    buttons.push([Markup.button.callback('🔄 ဒီနေ့ Plan ကို ပြန်ဆွဲရန်', 'daily_refresh')]);
    buttons.push([Markup.button.callback('🏠 ပင်မ Menu', 'daily_home')]);
    return Markup.inlineKeyboard(buttons);
}

function dailyPlanMessage(plan, completed = []) {
    const done = plan.tasks.filter((task) => completed.includes(task.id)).length;
    const lines = plan.tasks.map((task) => `${completed.includes(task.id) ? '✅' : '⬜'} ${task.title} — ${task.minutes} min\n   ${task.instructions}`);
    return `📅 ဒီနေ့အတွက် Study Plan — ${plan.date}\n\nအဓိကလေ့ကျင့်ရန်: ${plan.focus}\nစုစုပေါင်းအချိန်: ${plan.totalMinutes} မိနစ်\nပြီးစီးမှု: ${done}/${plan.tasks.length}\n\n${lines.join('\n\n')}\n\nTask တစ်ခုလုပ်ပြီးတိုင်း သက်ဆိုင်ရာခလုတ်ကို နှိပ်ပါ။ သင့်နေ့စဉ် progress ကို သိမ်းပေးပါမယ်။`;
}

async function generateDailyPlan(ctx, force = false) {
    const progress = await getAcademyProgress(ctx.from.id);
    const level = getLevel(progress.levelId);
    const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
    if (!progress.active) return ctx.reply('သင့်အဆင့်နဲ့ကိုက်ညီတဲ့ plan ဆွဲရန် အရင်ဆုံး /academy ကိုနှိပ်ပါ။');
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
        await ctx.reply(`မင်္ဂလာပါ ${ctx.from.first_name || 'သူငယ်ချင်း'}!\n\nကျွန်တော်က သင့်ရဲ့ AI English Tutor LinguistPro ဖြစ်ပါတယ်။\n\nလက်ရှိ Mode: ${mode}\n\nBeginner မှ Pro အထိ အဆင့်လိုက်လေ့လာရန် /academy ကိုနှိပ်ပါ။ ၁၂ ခန်းပါ အခြေခံသင်တန်းအတွက် /course ကိုနှိပ်ပါ။\nအောက်က မြန်စာခလုတ်များကို အသုံးပြုပါ။ Command အားလုံးကြည့်ရန် /help ကိုနှိပ်ပါ။`, mainKeyboard());
    });

    bot.help((ctx) => ctx.reply('📚 အသုံးပြုနိုင်သော Command များ\n\n/start - Tutor ကိုစတင်ရန်\n/help - ဒီအကူအညီစာမျက်နှာကို ပြရန်\n/academy - Speaking Academy ကို စတင်ရန် သို့မဟုတ် ပြန်ဆက်ရန်\n/levels - Free/Premium အဆင့်များကြည့်ရန်\n/academylesson - လက်ရှိ Academy lesson ပြန်ကြည့်ရန်\n/teacherlesson - ဆရာဦးဆောင်သင်ခန်းစာ စရန်\n/homework - ဒီနေ့အိမ်စာကြည့်ရန်\n/academyquiz - လက်ရှိ lesson အတွက် Quiz မေးခွန်းအသစ်ရရန်\n/coach - English Learning Coach ကို မေးမြန်းရန်\n/dailyplan - ဒီနေ့အတွက် ကိုယ်ပိုင် Study Plan ဆွဲရန်\n/wordbank - Vocabulary ပြန်လေ့ကျင့်ရန်\n/pronunciation - Pronunciation Coach ဖြင့် အသံလေ့ကျင့်ရန်\n/livevoice - Premium voice conversation စရန်\n/endlive - Voice conversation ပြီးဆုံးရန်\n/skillreport - မိမိ English Skill Report ကြည့်ရန်\n/tracks - General, Travel, IELTS, TOEFL, Business, Job Interview track ရွေးရန်\n/nextacademylesson - လက်ရှိ lesson ပြီးပြီး နောက် lesson သွားရန်\n/academyprogress - Level, points, streak, progress ကြည့်ရန်\n/academyreview - ပြီးခဲ့သော lesson ပြန်လေ့ကျင့်ရန်\n/academyassessment - Checkpoint assessment ဖြေရန်\n/academyroleplay - Real-life role-play စရန်\n/academycertificate - Pro completion status ကြည့်ရန်\n/academyreset - Academy progress ပြန်စရန်\n/course - ၁၂ ခန်းပါ အခြေခံသင်တန်းဖွင့်ရန်\n/teacherlesson - Beginner/Academy lesson ကို ဆရာလို အဆင့်လိုက်သင်ရန်\n/mode - Normal, IELTS, Translator Mode ရွေးရန်\n/myid - Telegram ID ကြည့်ရန်\n/privacy - Privacy controls ကြည့်ရန်\n/exportdata - မိမိ learning data export ရယူရန်\n/deletedata - မိမိ learning data ဖျက်ရန်\n/classroom - မိမိ Classroom ကြည့်ရန်\n/classroom_join CODE - ဆရာ့ Classroom ထဲဝင်ရန်\n/teacher - ဆရာအတွက် Teacher Center\n/classroom_create CLASS_NAME - ဆရာက အတန်းဖန်တီးရန်\n/classroom_dashboard CODE - ဆရာက ကျောင်းသားတိုးတက်မှုကြည့်ရန်\n/upgrade USER_ID DAYS - Admin က Premium ကို ကိုယ်တိုင်ဖွင့်ပေးရန်\n\nအောက်က မြန်စာခလုတ်များကို အသုံးပြုပါ။ Academy ထဲမှာ စာသား သို့မဟုတ် အသံပို့ပါ။ ကျွန်တော်က ဆရာလို သင်ပေး၊ ပြင်ပေး၊ Quiz မေးပြီး အကြံပေးပါမယ်။', mainKeyboard()));

    bot.command('menu', (ctx) => ctx.reply('🏠 ပင်မ Menu', mainKeyboard()));

    setupButtonRouting(bot);

    async function selectMode(ctx, mode, message) {
        try {
            await setUserMode(ctx.from.id, mode);
            await ctx.reply(message, mainKeyboard());
        } catch (error) {
            console.error('Mode selection error:', error.message);
            await ctx.reply('🙏 Mode ကို သိမ်းမရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    }

    bot.command('mode', (ctx) => ctx.reply('🎛 သင်ယူမည့် Tutor Mode ကို ရွေးပါ။', modeReplyKeyboard()));
    bot.command('mode_normal', (ctx) => selectMode(ctx, 'default', '✅ Normal Tutor Mode ကို ရွေးပြီးပါပြီ။ English စာ သို့မဟုတ် အသံဖြင့် စတင်လေ့ကျင့်ပါ။'));
    bot.command('mode_ielts', (ctx) => selectMode(ctx, 'ielts', '✅ IELTS Examiner Mode ကို ရွေးပြီးပါပြီ။ Speaking အဖြေကို ပို့ပြီး စတင်ပါ။'));
    bot.command('mode_translator', (ctx) => selectMode(ctx, 'translator', '✅ Subtitle Translator Mode ကို ရွေးပြီးပါပြီ။ English စာ သို့မဟုတ် subtitle ဖိုင် ပို့နိုင်ပါပြီ။'));

    bot.command('levels', async (ctx) => {
        const lines = LEVELS.map((level) => `${level.premium ? '🔒' : '✅'} ${level.title} (${level.cefr}) — ${level.premium ? 'Premium' : 'Free'}\n${level.goal}`);
        await replyLongText(ctx, `🏫 English Speaking Academy အဆင့်များ\n\n${lines.join('\n\n')}\n\nအဆင့်စစ်ဆေးပြီး စတင်ရန် /academy ကိုနှိပ်ပါ။`);
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
            await ctx.reply('🏫 Premium English Speaking Academy မှ ကြိုဆိုပါတယ်။ သင့်အဆင့်နဲ့ကိုက်ညီအောင် သင်ပေးနိုင်ရန် အရင်ဆုံး အဆင့်စစ်ဆေးပါမယ်။\n\nအောက်ပါအတိုင်း English ဖြင့် စာရေးပါ သို့မဟုတ် အသံပို့ပါ။\n“Hello, my name is ___. I am from ___. I am a ___. I want to improve my English because ___.”\n\nအမှားလုပ်မိလည်း ရပါတယ်။ ဒါဟာ အဆင့်သတ်မှတ်ရန် ရင်းနှီးစွာမေးမြန်းခြင်းသာ ဖြစ်ပါတယ်။');
        } catch (error) {
            console.error('Academy start error:', error.message);
            await ctx.reply('🙏 Academy ကို အခုစတင်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('academylesson', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('Academy သင်တန်းစတင်ရန် /academy ကိုနှိပ်ပါ။');
            await sendAcademyLesson(ctx, progress);
        } catch (error) {
            console.error('Academy lesson error:', error.message);
            await ctx.reply('🙏 Academy lesson ကို အခုဖွင့်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('academyquiz', async (ctx) => {
        try {
            await sendNewQuiz(ctx);
        } catch (error) {
            console.error('Academy quiz error:', error.message);
            await ctx.reply('🙏 Quiz မေးခွန်းအသစ်ကို အခုဖန်တီးမရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('coach', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('သင့်အဆင့်နဲ့ကိုက်ညီအောင် သင်ပေးနိုင်ရန် အရင်ဆုံး /academy ကိုနှိပ်ပါ။');
            await saveAcademyProgress(ctx.from.id, { ...progress, session: { type: 'coach' } });
            const level = getLevel(progress.levelId);
            await ctx.reply(`💬 English Learning Coach အဆင်သင့်ဖြစ်ပါပြီ။\n\nသင့်လက်ရှိအဆင့်: ${level.title} (${level.cefr})\n\nEnglish speaking၊ grammar၊ vocabulary၊ pronunciation၊ study plan သို့မဟုတ် သင်ကြုံနေရသောအခက်အခဲများကို မေးနိုင်ပါတယ်။ စာရေးပြီးမေးနိုင်သလို အသံဖြင့်လည်း မေးနိုင်ပါတယ်။`, academyKeyboard());
        } catch (error) {
            console.error('Coach start error:', error.message);
            await ctx.reply('🙏 Learning Coach ကို အခုဖွင့်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('dailyplan', async (ctx) => {
        try {
            await generateDailyPlan(ctx);
        } catch (error) {
            console.error('Daily plan error:', error.message);
            await ctx.reply(error.message === 'API_ERROR' ? '🙏 AI service ခဏမရသေးလို့ Daily Study Plan မဆွဲပေးနိုင်သေးပါ။' : '🙏 Daily Study Plan ကို အခုမဆွဲပေးနိုင်သေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('wordbank', async (ctx) => {
        try {
            await showWordBank(ctx);
        } catch (error) {
            console.error('Word Bank error:', error.message);
            await ctx.reply('🙏 Word Bank ကို အခုဖွင့်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('pronunciation', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('သင့်အဆင့်နဲ့ကိုက်ညီတဲ့ pronunciation လေ့ကျင့်မှုရရန် အရင်ဆုံး /academy ကိုနှိပ်ပါ။');
            if (!(await hasAcademyAccess(ctx, progress.levelId))) return;
            await saveAcademyProgress(ctx.from.id, { ...progress, session: { type: 'pronunciation' } });
            await ctx.reply('🗣️ Pronunciation Coach အဆင်သင့်ဖြစ်ပါပြီ။ English ဖြင့် အသံပို့ပါ။ အသံရှင်းလင်းမှု၊ အသံထွက်အခက်အခဲနဲ့ ပြန်လေ့ကျင့်ရမယ့်အလုပ်ကို ပြောပေးပါမယ်။', academyKeyboard());
        } catch (error) {
            console.error('Pronunciation start error:', error.message);
            await ctx.reply('🙏 Pronunciation Coach ကို အခုဖွင့်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('livevoice', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('သင့်အဆင့်နဲ့ကိုက်ညီတဲ့ conversation စတင်ရန် အရင်ဆုံး /academy ကိုနှိပ်ပါ။');
            if (!(await hasAcademyAccess(ctx, progress.levelId))) return;
            await saveAcademyProgress(ctx.from.id, { ...progress, session: { type: 'live_voice', turns: 0, startedAt: new Date().toISOString() } });
            const track = getTrack(progress.trackId);
            await ctx.reply(`🎙️ Live Voice Conversation အဆင်သင့်ဖြစ်ပါပြီ။\n\nလေ့လာမည့်လမ်းကြောင်း: ${track.title}\nEnglish ဖြင့် အသံပို့ပါ။ သဘာဝကျစွာ ပြန်ပြောပြီး မေးခွန်းတစ်ခု ဆက်မေးပေးပါမယ်။\n\nပြီးဆုံးလိုပါက /endlive ကိုနှိပ်ပါ။ ပြီးဆုံးသည့်အကြောင်း အကျဉ်းချုပ် ပြန်ပေးပါမယ်။`, academyKeyboard());
        } catch (error) {
            console.error('Live voice start error:', error.message);
            await ctx.reply('🙏 Live Voice Conversation ကို အခုစတင်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('endlive', async (ctx) => {
        const progress = await getAcademyProgress(ctx.from.id);
        const turns = progress.session?.type === 'live_voice' ? Number(progress.session.turns || 0) : 0;
        await saveAcademyProgress(ctx.from.id, { ...progress, session: null });
        await ctx.reply(`🎙️ Live Voice Conversation ပြီးဆုံးပါပြီ။\nပြောဆိုခဲ့သည့်အကြိမ်: ${turns}\nမနက်ဖြန်လည်း ဆက်လေ့ကျင့်ပြီး ယုံကြည်မှုနဲ့ fluency ကို တိုးတက်အောင်လုပ်ပါ။`, academyKeyboard());
    });

    bot.command('skillreport', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('Skill Report ဆွဲပေးနိုင်ရန် အရင်ဆုံး /academy ကိုနှိပ်ပါ။');
            const status = await usageOrReply(ctx);
            if (!status) return;
            const report = skillReport(progress);
            const raw = await getTutorResponse(buildSkillReportPrompt(getLevel(progress.levelId), report), 'default');
            await replyLongText(ctx, `📈 သင့် Skill Report\n\nGrammar: ${report.grammar}/100\nVocabulary: ${report.vocabulary}/100\nSpeaking: ${report.speaking}/100\nFluency: ${report.fluency}/100\nPronunciation: ${report.pronunciation}/100\nပုံမှန်လေ့ကျင့်မှု: ${report.consistency}/100\n\n${raw}`);
        } catch (error) {
            console.error('Skill report error:', error.message);
            await ctx.reply('🙏 Skill Report ကို အခုဆွဲမရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('tracks', async (ctx) => {
        const progress = await getAcademyProgress(ctx.from.id);
        if (!progress.active) return ctx.reply('သင့်အတွက် သင့်တော်တဲ့ learning track ရွေးပေးနိုင်ရန် အရင်ဆုံး /academy ကိုနှိပ်ပါ။');
        await ctx.reply(tracksMessage(progress.trackId), tracksKeyboard());
    });

    bot.action(/^track_(.+)$/, async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const trackId = String(ctx.match[1]);
            const track = getTrack(trackId);
            if (!track || track.id !== trackId) return ctx.reply('ဒီ learning track ကို ရှာမတွေ့ပါ။');
            if (trackIsPremium(track.id) && !(await isPremiumUser(ctx.from.id))) {
                return ctx.reply(`🔒 ${track.title} က Premium Academy ထဲမှာ ပါပါတယ်။ Admin ကို Premium ဖွင့်ပေးရန် ပြောပြီး ဒီ track ကို ပြန်ရွေးပါ။`);
            }
            const progress = await getAcademyProgress(ctx.from.id);
            const history = [...(progress.trackHistory || []), { trackId: track.id, date: todayUtc() }].slice(-20);
            const updated = await saveAcademyProgress(ctx.from.id, { ...progress, trackId: track.id, trackHistory: history });
            await ctx.reply(`✅ Learning track ပြောင်းပြီးပါပြီ: ${track.icon} ${track.title}\n\n${track.description}\n\nCoach၊ Daily Study Plan၊ Quiz နဲ့ Role-play တွေက ဒီ track အတိုင်း လိုက်လျောညီထွေ ပြောင်းလဲပေးပါမယ်။`, academyKeyboard());
            return updated;
        } catch (error) {
            console.error('Track selection error:', error.message);
            await ctx.reply('🙏 Learning track ကို အခုသိမ်းမရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('classroom', async (ctx) => {
        try {
            const teacher = Number(ctx.from.id) === Number(ADMIN_ID);
            if (teacher) {
                const classes = await getTeacherClassrooms(ctx.from.id);
                const text = classes.length
                    ? `👩‍🏫 သင့်အတန်းများ\n\n${classes.map((item) => `• ${item.title} — code: ${item.code} — ကျောင်းသား ${item.students.length} ယောက်`).join('\n')}`
                    : '👩‍🏫 အတန်းမရှိသေးပါ။ /classroom_create CLASS_NAME ကိုသုံးပြီး အတန်းဖန်တီးပါ။';
                return ctx.reply(`${text}\n\nကျောင်းသားတိုးတက်မှုကြည့်ရန် /classroom_dashboard CODE ကိုသုံးပါ။`, mainKeyboard());
            }
            const classes = await getUserClassrooms(ctx.from.id);
            return ctx.reply(classes.length
                ? `🏫 သင်ဝင်ထားသောအတန်းများ\n\n${classes.map((item) => `• ${item.title} — ${item.code}`).join('\n')}\n\nဆရာက သင့် Academy တိုးတက်မှုကို ကြည့်နိုင်ပါမယ်။`
                : '🏫 အတန်းထဲ မဝင်ရသေးပါ။ ဆရာထံမှ code ရယူပြီး /classroom_join CODE ကိုသုံးပါ။', mainKeyboard());
        } catch (error) {
            console.error('Classroom list error:', error.message);
            await ctx.reply('🙏 Classroom အချက်အလက်ကို အခုဖွင့်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('teacher', (ctx) => {
        if (Number(ctx.from.id) !== Number(ADMIN_ID)) return ctx.reply('🔒 Teacher tools ကို သတ်မှတ်ထားသော ဆရာ account မှသာ အသုံးပြုနိုင်ပါသည်။');
        return ctx.reply('👩‍🏫 Teacher Center\n\n/classroom_create CLASS_NAME — အတန်းဖန်တီးရန်\n/classroom — မိမိအတန်းများကြည့်ရန်\n/classroom_dashboard CODE — ကျောင်းသားတိုးတက်မှုကြည့်ရန်\n/upgrade USER_ID DAYS — Premium ကို ကိုယ်တိုင်ဖွင့်ပေးရန်', mainKeyboard());
    });

    bot.command('classroom_create', async (ctx) => {
        if (Number(ctx.from.id) !== Number(ADMIN_ID)) return ctx.reply('🔒 အတန်းဖန်တီးခွင့်ကို သတ်မှတ်ထားသော ဆရာ account မှသာ အသုံးပြုနိုင်ပါသည်။');
        const title = String(ctx.message.text || '').replace(/^\/classroom_create\s*/i, '').trim();
        if (!title) return ctx.reply('အသုံးပြုပုံ: /classroom_create CLASS_NAME\nဥပမာ: /classroom_create Evening Speaking Class');
        try {
            const classroom = await createClassroom(ctx.from.id, title);
            await ctx.reply(`✅ Classroom ဖန်တီးပြီးပါပြီ။\n\nအမည်: ${classroom.title}\nဝင်ရန် code: ${classroom.code}\n\nဒီ code ကို ကျောင်းသားများထံ ပေးပါ။ သူတို့က /classroom_join ${classroom.code} ဖြင့် ဝင်နိုင်ပါမယ်။`);
        } catch (error) {
            console.error('Classroom create error:', error.message);
            await ctx.reply('🙏 Classroom ကို အခုဖန်တီးမရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('classroom_join', async (ctx) => {
        const code = String(ctx.message.text || '').replace(/^\/classroom_join\s*/i, '').trim();
        if (!code) return ctx.reply('အသုံးပြုပုံ: /classroom_join CODE\nဥပမာ: /classroom_join AB12CD');
        try {
            const classroom = await joinClassroom(ctx.from.id, code);
            await ctx.reply(`✅ ${classroom.title} ထဲ ဝင်ပြီးပါပြီ။\nသင့်ဆရာက သင့် Academy တိုးတက်မှုကို အခုကြည့်နိုင်ပါပြီ။`, mainKeyboard());
        } catch (error) {
            await ctx.reply(error.message === 'CLASSROOM_NOT_FOUND' ? '❌ Classroom code ကို ရှာမတွေ့ပါ။ code ကို ပြန်စစ်ပြီး စမ်းပါ။' : '🙏 Classroom ထဲ အခုဝင်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('classroom_dashboard', async (ctx) => {
        if (Number(ctx.from.id) !== Number(ADMIN_ID)) return ctx.reply('🔒 Classroom dashboard ကို သတ်မှတ်ထားသော ဆရာ account မှသာ ကြည့်နိုင်ပါသည်။');
        const code = String(ctx.message.text || '').replace(/^\/classroom_dashboard\s*/i, '').trim();
        if (!code) return ctx.reply('အသုံးပြုပုံ: /classroom_dashboard CODE');
        try {
            const classroom = await getClassroomByCode(code);
            if (!classroom || String(classroom.teacherId) !== String(ctx.from.id)) return ctx.reply('❌ သင့် teacher account အောက်မှာ ဒီ Classroom ကို ရှာမတွေ့ပါ။');
            const dashboard = await getClassroomDashboard(classroom);
            const rows = dashboard.students.length
                ? dashboard.students.map((student) => `• ${student.userId} — ${student.levelId} — ပြီးစီးမှု ${student.completionPercent}% — Quiz ${student.quizAccuracy}% — points ${student.points} — streak ${student.streak}`).join('\n')
                : 'ကျောင်းသား မဝင်ရသေးပါ။';
            await replyLongText(ctx, `📊 ${dashboard.title}\n\nဝင်ရန် code: ${dashboard.code}\nကျောင်းသား: ${dashboard.studentCount}\nလက်ရှိလေ့လာနေသူ: ${dashboard.activeStudents}\nပျမ်းမျှပြီးစီးမှု: ${dashboard.averageCompletion}%\n\n${rows}`);
        } catch (error) {
            console.error('Classroom dashboard error:', error.message);
            await ctx.reply('🙏 Classroom dashboard ကို အခုဖွင့်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('academyprogress', async (ctx) => {
        try {
            await ctx.reply(academyProgressMessage(await getAcademyProgress(ctx.from.id)));
        } catch (error) {
            console.error('Academy progress error:', error.message);
            await ctx.reply('🙏 သင့် Academy တိုးတက်မှုကို အခုဖွင့်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('academyreview', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            const review = progress.lastCompletedLesson || (progress.completedLessons || []).slice(-1)[0];
            if (!review) return ctx.reply('Review စတင်ရန် Academy lesson အနည်းဆုံးတစ်ခု ပြီးအောင်လုပ်ပါ။');
            const position = typeof review === 'object' ? review : (() => { const parts = String(review).split('-'); return { levelId: parts.slice(0, -1).join('-'), lessonNumber: parts.at(-1) }; })();
            const lesson = getAcademyLesson(position.levelId, position.lessonNumber);
            const level = getLevel(position.levelId);
            await replyLongText(ctx, `🔁 ပြန်လေ့ကျင့်ရန်: ${level.title} — ${lesson.title}\n\nရည်မှန်းချက်: ${lesson.objective}\nGrammar: ${lesson.grammar}\nVocabulary: ${lesson.vocabulary}\n\nအခု English ဖြင့် ပြန်ဖြေပါ:\n${lesson.speakingTask}`);
        } catch (error) {
            console.error('Academy review error:', error.message);
            await ctx.reply('🙏 Review ကို အခုဖွင့်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('academyassessment', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber) || (progress.lessonNumber === 999 ? getAcademyLesson('advanced-pro', 6) : null);
            const level = getLevel(progress.levelId);
            if (!progress.active || !lesson) return ctx.reply('စတင်ရန် /academy ကိုနှိပ်ပါ။ Final assessment မဖြေမီ လက်ရှိသင်တန်းကို ပြီးအောင်လုပ်ပါ။');
            if (!(await hasAcademyAccess(ctx, level.id))) return;
            await saveAcademyProgress(ctx.from.id, { ...progress, session: { type: 'assessment', assessmentType: `${level.title} checkpoint` } });
            await ctx.reply(`📝 ${level.title} checkpoint\n\nဒီအကြောင်းအရာအကြောင်းကို English ဖြင့် တစ်မိနစ်ခန့် စာရေးပါ သို့မဟုတ် အသံပို့ပါ။\n${lesson.speakingTask}\n\nGrammar၊ vocabulary၊ fluency၊ pronunciation နဲ့ task ပြီးစီးမှုကို 0 မှ 10 အထိ အမှတ်ပေးပါမယ်။`);
        } catch (error) {
            console.error('Academy assessment error:', error.message);
            await ctx.reply('🙏 Assessment ကို အခုစတင်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('academyroleplay', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
            const level = getLevel(progress.levelId);
            if (!progress.active || !lesson) return ctx.reply('Academy စတင်ရန် /academy ကိုနှိပ်ပါ။');
            if (!(await hasAcademyAccess(ctx, level.id))) return;
            await saveAcademyProgress(ctx.from.id, { ...progress, session: { type: 'roleplay', scenario: lesson.title } });
            await ctx.reply(`🎭 Premium Role-play: ${lesson.title}\n\nကျွန်တော်က အခြားလူတစ်ယောက်အဖြစ် သရုပ်ဆောင်ပါမယ်။ သင်က English ဖြင့် စာသား သို့မဟုတ် အသံဖြင့် သဘာဝကျစွာ ပြန်ဖြေပါ။ အလှည့်တိုင်းမှာ ဆရာလို ပြန်ညွှန်ပြပါမယ်။\n\nအခုစတင်ပါ: ${lesson.speakingTask}`);
        } catch (error) {
            console.error('Academy role-play error:', error.message);
            await ctx.reply('🙏 Role-play ကို အခုစတင်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('academycertificate', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            const completed = (progress.completedLessons || []).includes('advanced-pro-6') || progress.lessonNumber === 999;
            if (!completed) return ctx.reply('Pro completion certificate တောင်းရန် Academy lesson အားလုံးကို ပြီးအောင်လုပ်ပါ။');
            await ctx.reply(`🏆 English Speaking Academy — Pro Completion\n\nဂုဏ်ယူပါတယ် ${ctx.from.first_name || 'Learner'}!\nStarter မှ Advanced/Pro အထိ Speaking path အပြည့်ကို ပြီးမြောက်ပါပြီ။\n\nPoints: ${progress.points || 0}\nAssessment: ${progress.assessmentCount || 0}\n\nFluency ဆက်လက်ထိန်းသိမ်းရန် /academyroleplay နဲ့ /academyassessment ကို ဆက်သုံးပါ။`);
        } catch (error) {
            console.error('Academy certificate error:', error.message);
            await ctx.reply('🙏 Certificate status ကို အခုဖွင့်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('nextacademylesson', async (ctx) => {
        try {
            const progress = await getAcademyProgress(ctx.from.id);
            const lesson = getAcademyLesson(progress.levelId, progress.lessonNumber);
            if (!progress.active || !lesson) return ctx.reply('Academy ကို စတင်ရန် သို့မဟုတ် ပြန်ဆက်ရန် /academy ကိုနှိပ်ပါ။');
            const next = getNextLesson(progress.levelId, progress.lessonNumber);
            const completed = [...new Set([...(progress.completedLessons || []), lesson.id])];
            if (!next) {
                await saveAcademyProgress(ctx.from.id, { ...progress, completedLessons: completed, lessonNumber: 999, session: null, lastCompletedLesson: { levelId: lesson.levelId, lessonNumber: lesson.number }, points: Number(progress.points || 0) + 100 });
                return ctx.reply('🏆 ဂုဏ်ယူပါတယ်။ English Speaking Academy အပြည့်ကို ပြီးမြောက်ပါပြီ။ Final Pro-level assessment ဖြေရန် /academyassessment ကိုနှိပ်ပါ။');
            }
            const nextLevel = getLevel(next.levelId);
            if (nextLevel.premium && !(await isPremiumUser(ctx.from.id))) {
                await saveAcademyProgress(ctx.from.id, { ...progress, completedLessons: completed, lessonNumber: next.lessonNumber, levelId: next.levelId, lastCompletedLesson: { levelId: lesson.levelId, lessonNumber: lesson.number }, points: Number(progress.points || 0) + 100 });
                return ctx.reply(`✅ ${lesson.title} ကို ပြီးပါပြီ။ နောက်အဆင့်က ${nextLevel.title} (${nextLevel.cefr}) ဖြစ်ပြီး Premium Academy ထဲမှာ ပါပါတယ်။ Admin ကို Premium ဖွင့်ပေးရန် ပြောပြီး /academylesson ကိုနှိပ်ပါ။`);
            }
            const today = new Date().toISOString().slice(0, 10);
            const streak = progress.lastPracticeDate === today ? Number(progress.streak || 0) : Number(progress.streak || 0) + 1;
            const updated = await saveAcademyProgress(ctx.from.id, { ...progress, completedLessons: completed, levelId: next.levelId, lessonNumber: next.lessonNumber, session: null, lastCompletedLesson: { levelId: lesson.levelId, lessonNumber: lesson.number }, practiceAttempts: Number(progress.practiceAttempts || 0) + 1, points: Number(progress.points || 0) + 100, streak, lastPracticeDate: today });
            await ctx.reply(`✅ အရမ်းကောင်းပါတယ်။ Lesson ${lesson.number} ပြီးပါပြီ။ နောက်တစ်ခု: ${nextLevel.title} (${nextLevel.cefr})။`);
            await sendAcademyLesson(ctx, updated);
        } catch (error) {
            console.error('Next Academy lesson error:', error.message);
            await ctx.reply('🙏 နောက် Academy lesson ကို အခုမပြောင်းနိုင်သေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('teacherlesson', async (ctx) => {
        try { await runTeacherPhase(ctx, 'explain'); } catch (error) { console.error('Teacher lesson error:', error.message); await ctx.reply('🙏 ဆရာသင်ခန်းစာကို အခုဖွင့်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။'); }
    });

    bot.command('homework', async (ctx) => {
        const context = await getTeacherContext(ctx);
        if (!context) return ctx.reply('အိမ်စာကြည့်ရန် /academy သို့မဟုတ် /course ကို အရင်စတင်ပါ။');
        await ctx.reply(homeworkMessage(context.progress.homework || []), homeworkKeyboard(context.progress.homework || []));
    });

    bot.action(/^teacher_phase_(explain|model|check|guided|independent|assess|homework|review|next)$/, async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await runTeacherPhase(ctx, ctx.match[1]);
        } catch (error) {
            console.error('Teacher phase error:', error.message);
            await ctx.reply('🙏 ဒီသင်ကြားရေးအဆင့်ကို အခုလုပ်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.action(/^teacher_homework_(\d+)$/, async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const context = await getTeacherContext(ctx);
            if (!context) return ctx.reply('အိမ်စာကြည့်ရန် သင်တန်းကို အရင်စတင်ပါ။');
            const index = Number(ctx.match[1]);
            const item = (context.progress.homework || [])[index];
            if (!item) return ctx.reply('ဒီအိမ်စာကို ရှာမတွေ့ပါ။');
            const updated = await saveTeacherContext(ctx, context, { ...context.progress, homework: completeHomework(context.progress.homework || [], item.id), points: Number(context.progress.points || 0) + (item.completed ? 0 : 5) });
            await ctx.reply(`✅ အိမ်စာပြီးစီးပါပြီ။\n\n${item.title}\n${item.instructions}`, homeworkKeyboard(updated.homework));
        } catch (error) {
            console.error('Homework completion error:', error.message);
            await ctx.reply('🙏 အိမ်စာပြီးစီးမှုကို အခုသိမ်းမရသေးပါ။');
        }
    });

    bot.action('teacher_homework_lesson', async (ctx) => {
        await ctx.answerCbQuery();
        const context = await getTeacherContext(ctx);
        if (context?.kind === 'academy') return sendAcademyLesson(ctx, context.progress);
        if (context?.kind === 'course') return sendCurrentLesson(ctx, context.progress);
        return ctx.reply('သင်ခန်းစာကို အရင်စတင်ပါ။');
    });

    bot.action(/^quiz_answer_([0-3])$/, async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await answerQuiz(ctx, Number(ctx.match[1]));
        } catch (error) {
            console.error('Quiz answer error:', error.message);
            await ctx.reply('🙏 ဒီအဖြေကို အခုစစ်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.action('quiz_new', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await sendNewQuiz(ctx);
        } catch (error) {
            console.error('New quiz error:', error.message);
            await ctx.reply('🙏 မေးခွန်းအသစ်ကို အခုဖန်တီးမရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.action('quiz_home', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply('🏠 ပင်မ Menu', mainKeyboard());
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
        await ctx.reply('🏠 ပင်မ Menu', mainKeyboard());
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
            await ctx.reply('🙏 လက်ရှိ lesson စကားလုံးများကို Word Bank ထဲ အခုထည့်မရသေးပါ။');
        }
    });

    bot.action('word_home', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply('🏠 ပင်မ Menu', mainKeyboard());
    });

    bot.command('academyreset', async (ctx) => {
        try {
            await resetAcademy(ctx.from.id);
            await ctx.reply('🔄 Academy progress ကို ပြန်စပြီးပါပြီ။ အဆင့်စစ်ဆေးရန် /academy ကိုနှိပ်ပါ။');
        } catch (error) {
            console.error('Academy reset error:', error.message);
            await ctx.reply('🙏 Academy progress ကို အခု reset မလုပ်နိုင်သေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('course', async (ctx) => {
        try {
            const progress = await startCourse(ctx.from.id);
            await ctx.reply('🎓 Beginner Speaking Course စတင်ပြီးပါပြီ။ ဆရာတစ်ယောက်လို အဆင့်ဆင့် သင်ပေးပါမယ်။ လေ့ကျင့်ခန်းလုပ်ပြီး အဆင်သင့်ဖြစ်ရင် /nextlesson ကိုနှိပ်ပါ။');
            await sendCurrentLesson(ctx, progress);
        } catch (error) {
            console.error('Course start error:', error.message);
            await ctx.reply('🙏 Beginner Course ကို အခုစတင်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('lesson', async (ctx) => {
        try {
            const progress = await getCourseProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('သင်တန်းမစရသေးပါ။ Lesson 1 ကနေစရန် /course ကိုနှိပ်ပါ။');
            await sendCurrentLesson(ctx, progress);
        } catch (error) {
            console.error('Lesson display error:', error.message);
            await ctx.reply('🙏 လက်ရှိ lesson ကို အခုဖွင့်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('progress', async (ctx) => {
        try {
            await ctx.reply(courseProgressMessage(await getCourseProgress(ctx.from.id)));
        } catch (error) {
            console.error('Progress error:', error.message);
            await ctx.reply('🙏 သင့် progress ကို အခုဖွင့်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('nextlesson', async (ctx) => {
        try {
            const progress = await getCourseProgress(ctx.from.id);
            if (!progress.active) return ctx.reply('Beginner Course စတင်ရန် အရင်ဆုံး /course ကိုနှိပ်ပါ။');
            const currentLesson = getBeginnerLesson(progress.currentLesson);
            if (!currentLesson) return ctx.reply('🎉 Beginner Course ကို ပြီးမြောက်ပါပြီ။ ပြန်လေ့ကျင့်ရန် /course ကိုနှိပ်ပါ။');
            if ((progress.completedLessons || []).includes(currentLesson.id)) {
                return ctx.reply('ဒီ lesson ကို ပြီးပြီးသားပါ။ ပြန်လေ့ကျင့်ရန် /lesson ကိုနှိပ်ပါ။');
            }
            const updated = await completeCourseLesson(ctx.from.id, currentLesson.id, null);
            if (currentLesson.id >= BEGINNER_COURSE.length) {
                return ctx.reply('🎉 ဂုဏ်ယူပါတယ်။ Beginner Speaking lesson ၁၂ ခန်းလုံး ပြီးမြောက်ပါပြီ။ /course ဖြင့် ဆက်လေ့ကျင့်နိုင်သလို IELTS လေ့ကျင့်ရန် /mode ကိုနှိပ်နိုင်ပါတယ်။');
            }
            await ctx.reply(`✅ Lesson ${currentLesson.id} ပြီးပါပြီ။ အခု Lesson ${updated.currentLesson} ကို ဆက်သင်ပါမယ်။`);
            await sendCurrentLesson(ctx, updated);
        } catch (error) {
            console.error('Next lesson error:', error.message);
            await ctx.reply('🙏 နောက် lesson ကို အခုမပြောင်းနိုင်သေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('resetcourse', async (ctx) => {
        try {
            await resetCourse(ctx.from.id);
            await ctx.reply('🔄 Beginner Course progress ကို ပြန်စပြီးပါပြီ။ Lesson 1 ကနေပြန်စရန် /course ကိုနှိပ်ပါ။');
        } catch (error) {
            console.error('Course reset error:', error.message);
            await ctx.reply('🙏 Beginner Course progress ကို အခု reset မလုပ်နိုင်သေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('myid', (ctx) => ctx.reply(`သင့် Telegram ID က ${ctx.from.id} ဖြစ်ပါတယ်။`));

    bot.command('privacy', (ctx) => ctx.reply('🔐 Privacy Controls\n\nသင့် learning progress၊ vocabulary၊ quiz၊ voice diagnostics နဲ့ Premium status ကို ဝန်ဆောင်မှုပေးရန်အတွက်သာ သိမ်းထားပါတယ်။ သိမ်းထားသော data ကြည့်ရန် /exportdata၊ data အပြီးဖျက်ရန် /deletedata ကိုသုံးပါ။', mainKeyboard()));

    bot.command('exportdata', async (ctx) => {
        try {
            const data = await exportUserData(ctx.from.id);
            await replyLongText(ctx, `📦 သင့် Learning Data Export\n\n${JSON.stringify(data, null, 2)}`);
        } catch (error) {
            console.error('Data export error:', error.message);
            await ctx.reply('🙏 သင့် data ကို အခု export မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.command('deletedata', (ctx) => ctx.reply('⚠️ သင့် profile mode၊ Premium record၊ course progress၊ Academy progress၊ Word Bank၊ quiz၊ pronunciation data နဲ့ daily plan အားလုံးကို အပြီးဖျက်ပါမယ်။ ပြန်ယူလို့မရပါ။', Markup.inlineKeyboard([
        [Markup.button.callback('🗑️ Data အားလုံးဖျက်မည်', 'confirm_delete_data')],
        [Markup.button.callback('မဖျက်တော့ပါ', 'cancel_delete_data')]
    ])));

    bot.action('confirm_delete_data', async (ctx) => {
        await ctx.answerCbQuery();
        try {
            await deleteUserData(ctx.from.id);
            await ctx.reply('✅ သင့် learning data အားလုံးကို ဖျက်ပြီးပါပြီ။', mainKeyboard());
        } catch (error) {
            console.error('Data deletion error:', error.message);
            await ctx.reply('🙏 သင့် data ကို အခုဖျက်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
        }
    });

    bot.action('cancel_delete_data', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply('Data ဖျက်ခြင်းကို ပယ်ဖျက်လိုက်ပါပြီ။', mainKeyboard());
    });

    bot.command('upgrade', async (ctx) => {
        if (ctx.from.id !== ADMIN_ID) return ctx.reply('❌ ဒီ command ကို Admin account မှသာ အသုံးပြုနိုင်ပါသည်။');
        const parts = String(ctx.message.text || '').trim().split(/\s+/);
        const targetUserId = parts[1];
        const days = parts[2] || '30';
        if (!/^\d{3,20}$/.test(targetUserId || '')) {
            return ctx.reply('အသုံးပြုပုံ: /upgrade USER_ID DAYS\nဥပမာ: /upgrade 123456789 30');
        }
        try {
            const expiryDate = await makeUserPremium(targetUserId, days);
            await ctx.reply(`✅ ${targetUserId} အတွက် Premium ဖွင့်ပြီးပါပြီ။\nသက်တမ်းကုန်မည့်ရက်: ${expiryDate}`);
            await bot.telegram.sendMessage(targetUserId, `🎉 Premium ကို ${days} ရက်အတွက် ဖွင့်ပေးပြီးပါပြီ။ Daily free limit မရှိဘဲ Tutor ကို အသုံးပြုနိုင်ပါပြီ။`).catch(() => {});
        } catch (error) {
            console.error('Upgrade error:', error.message);
            await ctx.reply(`❌ ဒီ user ကို Premium ဖွင့်မရပါ: ${error.message}`);
        }
    });

    for (const [callback, mode, message] of [
        ['set_default', 'default', '✅ Normal Tutor Mode ကို ရွေးပြီးပါပြီ။ စာ သို့မဟုတ် အသံဖြင့် စတင်လေ့ကျင့်ပါ။'],
        ['set_ielts', 'ielts', '✅ IELTS Examiner Mode ကို ရွေးပြီးပါပြီ။ အဖြေကို ပို့ပြီး စတင်ပါ။'],
        ['set_translator', 'translator', '✅ Translator Mode ကို ရွေးပြီးပါပြီ။ စာ သို့မဟုတ် .srt/.vtt/.txt ဖိုင် ပို့နိုင်ပါပြီ။']
    ]) {
        bot.action(callback, async (ctx) => {
            try {
                await setUserMode(ctx.from.id, mode);
                await ctx.answerCbQuery();
                await ctx.reply(message, mainKeyboard());
            } catch (error) {
                console.error('Mode update error:', error.message);
                await ctx.answerCbQuery('Mode သိမ်းမရသေးပါ။ ပြန်စမ်းပါ။');
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
                await replyLongText(ctx, `✅ အဆင့်စစ်ဆေးမှု ပြီးပါပြီ။\n\nအကြံပြုအဆင့်: ${getLevel(recommended).title} (${getLevel(recommended).cefr})\nစတင်မည့်အဆင့်: ${getLevel(chosenLevel).title} (${getLevel(chosenLevel).cefr})\nယုံကြည်စိတ်ချရမှု: ${placement.confidence || 0}%\n\nအားသာချက်များ: ${(placement.strengths || []).join('; ') || 'အင်တာဗျူးကို ပြီးအောင်ဖြေဆိုနိုင်ပါတယ်။'}\nဦးစားပေးလေ့ကျင့်ရန်: ${(placement.priorities || []).join('; ') || 'ပုံမှန်လေ့ကျင့်ပြီး ယုံကြည်မှုတိုးပါ။'}${premiumBlocked ? '\n\nသင့်အတွက် အကြံပြုထားသောအဆင့်က Premium Academy ထဲမှာ ပါပါတယ်။ လက်ရှိမှာ Free level နဲ့ စတင်ပေးထားပြီး Premium ဖွင့်လျှင် အကြံပြုအဆင့်ကို ဆက်တက်နိုင်ပါမယ်။' : ''}`);
                await sendAcademyLesson(ctx, updated);
                return;
            }

            if (sessionType === 'live_voice') {
                return ctx.reply('🎙️ Live Voice Conversation အတွက် အသံမက်ဆေ့ချ် ပို့ပါ။ ပြီးဆုံးလိုပါက /endlive ကိုနှိပ်ပါ။');
            }

            if (sessionType === 'pronunciation') {
                return ctx.reply('🗣️ Pronunciation စစ်ဆေးရန် အသံမက်ဆေ့ချ် ပို့ပါ။');
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
                await replyLongText(ctx, `📝 ${level.title} Assessment ရလဒ်\n\nစုစုပေါင်း: ${assessment.overall || 0}/10\nGrammar: ${assessment.grammar || 0}/10\nVocabulary: ${assessment.vocabulary || 0}/10\nFluency: ${assessment.fluency || 0}/10\nPronunciation/အသံရှင်းလင်းမှု: ${assessment.pronunciation || 0}/10\nTask ပြီးစီးမှု: ${assessment.taskCompletion || 0}/10\n\nအားသာချက်: ${assessment.strength || 'ဆက်လက်လေ့ကျင့်ပါ။'}\nဦးစားပေးပြင်ရန်: ${(assessment.priorities || []).join('; ') || 'ပုံမှန် speaking practice ဆက်လုပ်ပါ။'}\nပြင်ဆင်ထားသော ဥပမာ: ${assessment.correctedExample || 'Complete sentence များကို ဆက်တည်ဆောက်ပါ။'}\nနောက်လေ့ကျင့်ရန်: ${assessment.nextTask || 'ဒီအဖြေကို အသေးစိတ်ပိုပြောပြီး ပြန်လေ့ကျင့်ပါ။'}\n\nPoints: ${updated.points}`);
                return;
            }

            if (academy.active && academyLesson && academy.teacherSession?.type === 'academy_lesson') {
                if (!(await hasAcademyAccess(ctx, academy.levelId))) return;
                return runTeacherPhase(ctx, normalizeTeacherSession(academy.teacherSession).phase, userMessage);
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
            if (activeLesson && progress.teacherSession?.type === 'course_lesson') {
                return runTeacherPhase(ctx, normalizeTeacherSession(progress.teacherSession).phase, userMessage);
            }
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
                ? '🙏 AI service ခဏမရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။'
                : '🙏 ဒီ message ကို အခုလုပ်ဆောင်မရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။');
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
                await replyLongText(ctx, `✅ အသံဖြင့် အဆင့်စစ်ဆေးမှု ပြီးပါပြီ။\nအကြံပြုအဆင့်: ${getLevel(recommended).title} (${getLevel(recommended).cefr})\nစတင်မည့်အဆင့်: ${getLevel(chosenLevel).title} (${getLevel(chosenLevel).cefr})\nယုံကြည်စိတ်ချရမှု: ${placement.confidence || 0}%${premiumBlocked ? '\n\nအကြံပြုအဆင့်က Premium Academy ထဲမှာ ပါပါတယ်။ Premium ဖွင့်ပြီးမှ အဲဒီအဆင့်ကို ဆက်တက်နိုင်ပါမယ်။' : ''}`);
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
                await replyLongText(ctx, `🗣️ Pronunciation Report\n\nအမှတ်: ${score}/10\nအသံရှင်းလင်းမှု: ${pronunciation.clarity || 0}/10\n\n${(pronunciation.sounds || []).map((item) => `${item.word || 'Sound'}: ${item.issue || 'ဆက်လေ့ကျင့်ပါ'} — ${item.tip || ''}`).join('\n') || 'သီးခြားအသံထွက်အမှား မတွေ့ရပါ။'}\n\nStress အကြံပြုချက်: ${pronunciation.stressTip || 'အရေးကြီးသောစကားလုံးများကို ရှင်းရှင်းပြောပါ။'}\nပြန်လေ့ကျင့်ရန်: ${pronunciation.repeatTask || 'ဝါကျကို ဖြည်းဖြည်း သုံးကြိမ် ပြန်ပြောပါ။'}\n\nSpeaking points: ${updated.points}`);
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
                const scorePrompt = `ဒီ ${level.title} (${level.cefr}) speaking assessment အသံကို နားထောင်ပြီး စစ်ဆေးပါ။ strength, priorities, task instructions နဲ့ feedback ကို မြန်မာလိုရေးပါ။ correctedExample ကိုတော့ English ဖြင့်ရေးပါ။ JSON သက်သက် ပြန်ပါ: {"overall":0,"grammar":0,"vocabulary":0,"fluency":0,"pronunciation":0,"taskCompletion":0,"strength":"...","priorities":["...","..."],"correctedExample":"...","nextTask":"..."}. အမျိုးအစားတိုင်းကို 0 မှ 10 အထိ အမှတ်ပေးပါ။`;
                const raw = await getTutorResponseFromAudio(buffer, ctx.message.voice.mime_type || 'audio/ogg', 'default', scorePrompt);
                const assessment = parseJsonResponse(raw) || { overall: 0, strength: raw, priorities: ['Repeat the task with clearer sentences.'] };
                const updated = await saveAcademyProgress(ctx.from.id, { ...academy, session: null, assessmentCount: Number(academy.assessmentCount || 0) + 1, lastAssessment: assessment, lastScore: assessment.overall, grammarScore: assessment.grammar != null ? Number(assessment.grammar) * 10 : academy.grammarScore, vocabularyScore: assessment.vocabulary != null ? Number(assessment.vocabulary) * 10 : academy.vocabularyScore, fluencyScore: assessment.fluency != null ? Number(assessment.fluency) * 10 : academy.fluencyScore, pronunciationScore: assessment.pronunciation != null ? Number(assessment.pronunciation) * 10 : academy.pronunciationScore, speakingScore: assessment.overall != null ? Number(assessment.overall) * 10 : academy.speakingScore, points: Number(academy.points || 0) + Number(assessment.overall || 0) * 10 });
                await replyLongText(ctx, `📝 Speaking assessment ရလဒ်\n\nစုစုပေါင်း: ${assessment.overall || 0}/10\nGrammar: ${assessment.grammar || 0}/10\nVocabulary: ${assessment.vocabulary || 0}/10\nFluency: ${assessment.fluency || 0}/10\nPronunciation: ${assessment.pronunciation || 0}/10\n\nအားသာချက်: ${assessment.strength || 'ဆက်လက်လေ့ကျင့်ပါ။'}\nဦးစားပေးပြင်ရန်: ${(assessment.priorities || []).join('; ')}\nပြင်ဆင်ထားသော ဥပမာ: ${assessment.correctedExample || 'English ဝါကျတစ်ကြောင်း ထပ်ပြောကြည့်ပါ။'}\nနောက်လေ့ကျင့်ရန်: ${assessment.nextTask || 'အဖြေကို ဖြည်းဖြည်းနဲ့ ရှင်းရှင်းပြန်ပြောပါ။'}\n\nPoints: ${updated.points}`);
                return;
            }

            if (academy.active && academyLesson && academy.teacherSession?.type === 'academy_lesson') {
                if (!(await hasAcademyAccess(ctx, academy.levelId))) return;
                return runTeacherVoicePhase(ctx, buffer, ctx.message.voice.mime_type || 'audio/ogg');
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
            if (activeLesson && progress.teacherSession?.type === 'course_lesson') {
                return runTeacherVoicePhase(ctx, buffer, ctx.message.voice.mime_type || 'audio/ogg');
            }
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
                ? '🙏 AI service ခဏမရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။'
                : '🙏 အသံကို ရှင်းရှင်းမကြားရသေးပါ။ အသံမက်ဆေ့ချ်ကို ပြန်ပို့ပါ။');
        }
    });

    bot.on('document', async (ctx) => {
        try {
            const currentMode = await getCurrentMode(ctx.from.id);
            if (currentMode !== 'translator') {
                return ctx.reply('Subtitle သို့မဟုတ် text ဖိုင် မပို့မီ /mode မှာ Translator Mode ကို အရင်ရွေးပါ။');
            }
            const document = ctx.message.document;
            const fileName = String(document.file_name || 'document.txt');
            const extension = fileName.toLowerCase().split('.').pop();
            if (!['srt', 'vtt', 'txt'].includes(extension)) {
                return ctx.reply('.srt, .vtt, .txt ဖိုင်များကိုသာ အသုံးပြုနိုင်ပါသည်။');
            }
            if (document.file_size && document.file_size > MAX_DOCUMENT_BYTES) {
                return ctx.reply('ဖိုင်အရွယ်အစား ကြီးလွန်းပါသည်။ 10 MB ထက်သေးသောဖိုင် ပို့ပါ။');
            }
            const status = await usageOrReply(ctx);
            if (!status) return;
            await ctx.sendChatAction('typing');
            const fileLink = await ctx.telegram.getFileLink(document.file_id);
            const response = await fetch(fileLink.href);
            if (!response.ok) throw new Error(`Telegram file download failed: ${response.status}`);
            const sourceText = await response.text();
            if (!sourceText.trim()) return ctx.reply('ဒီဖိုင်ထဲမှာ စာမပါပါ။');
            const replyMessage = await getTutorResponse(sourceText.slice(0, 120000), 'translator');
            await replyLongText(ctx, replyMessage);
        } catch (error) {
            console.error('Error processing document:', error.message);
            await ctx.reply(error.message === 'API_ERROR'
                ? '🙏 Translation service ခဏမရသေးပါ။ ခဏနေပြီး ပြန်စမ်းပါ။'
                : '🙏 ဒီဖိုင်ကို အခုလုပ်ဆောင်မရသေးပါ။ ဖိုင်ပုံစံကို စစ်ပြီး ပြန်စမ်းပါ။');
        }
    });
}

module.exports = { setupHandlers, splitMessage, englishSpeechChunks, mainKeyboard, academyKeyboard, modeReplyKeyboard, BUTTONS, normalizeQuiz, quizKeyboard, quizNextKeyboard, normalizeDailyPlan, dailyPlanKeyboard };
