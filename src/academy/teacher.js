function buildAcademyLessonIntro(lesson, level, totalLessons) {
    return [
        `🏫 English Speaking Academy — ${level.title} (${level.cefr})`,
        `Lesson ${lesson.number}/${totalLessons}: ${lesson.title}`,
        `Goal: ${lesson.objective}`,
        '',
        `Grammar focus: ${lesson.grammar}`,
        `Vocabulary focus: ${lesson.vocabulary}`,
        '',
        'Teacher explanation:',
        `Today we will practice ${lesson.title.toLowerCase()}. I will first show you a simple example, then you will speak, and I will correct you step by step.`,
        '',
        `Speaking challenge: ${lesson.speakingTask}`,
        '',
        'Send your answer by text or voice. Send /nextacademylesson only after you have practiced.'
    ].join('\n');
}

function buildPlacementPrompt(answer) {
    return `You are an expert English teacher conducting a friendly placement interview for a Myanmar learner.
The learner's answer is:
${answer}

Estimate the learner's speaking level using only these levels: starter, elementary, pre-intermediate, intermediate, upper-intermediate, advanced-pro.
Assess grammar control, vocabulary, sentence length, fluency, and communicative success. Be conservative because one answer is not enough for a final score.
Return JSON only with this exact shape:
{"levelId":"starter|elementary|pre-intermediate|intermediate|upper-intermediate|advanced-pro","confidence":0,"strengths":["..."],"priorities":["..."],"nextQuestion":"..."}
Confidence must be an integer from 0 to 100. The next question must be easy enough to continue the interview.`;
}

function buildAcademyTextPrompt(lesson, level, studentAnswer) {
    return `You are a premium one-to-one English speaking teacher. The learner is studying ${level.title} (${level.cefr}), Lesson ${lesson.number}: ${lesson.title}.
Lesson objective: ${lesson.objective}
Grammar focus: ${lesson.grammar}
Vocabulary focus: ${lesson.vocabulary}
Speaking challenge: ${lesson.speakingTask}

Student answer:
${studentAnswer}

Teach, do not merely chat. Respond in this order:
1. One specific encouraging observation.
2. A section titled Corrected English with the best natural version.
3. A short Burmese explanation of the most important grammar or word-choice correction. For advanced learners, keep Burmese brief and include a more natural alternative in English.
4. A Pronunciation and Fluency Tip with one concrete improvement.
5. One follow-up question that makes the learner use today's target again.
6. End with: “When you are ready to continue, send /nextacademylesson.”
Do not claim the lesson is complete. Keep the challenge appropriate to the learner's level.`;
}

function buildAcademyVoicePrompt(lesson, level) {
    return `You are a premium one-to-one English speaking and pronunciation teacher.
Level: ${level.title} (${level.cefr}). Lesson ${lesson.number}: ${lesson.title}.
Objective: ${lesson.objective}
Grammar: ${lesson.grammar}
Vocabulary: ${lesson.vocabulary}
Speaking challenge: ${lesson.speakingTask}

Listen to the learner's voice carefully. Respond in this order:
1. Say whether the main message was clear.
2. Transcribe the key English sentence you heard.
3. Give the most natural corrected sentence.
4. Give one pronunciation tip and one fluency tip in simple Burmese, with English examples.
5. Ask the learner to repeat one improved sentence.
6. End with: “When you are ready to continue, send /nextacademylesson.”
If the audio is unclear, identify the unclear part and ask for a slower retry. Do not claim the lesson is complete.`;
}

function buildPlacementVoicePrompt() {
    return `You are conducting a friendly English speaking placement interview. Listen to the learner's voice and estimate their level as starter, elementary, pre-intermediate, intermediate, upper-intermediate, or advanced-pro.
Return JSON only with this exact shape: {"levelId":"starter|elementary|pre-intermediate|intermediate|upper-intermediate|advanced-pro","confidence":0,"strengths":["..."],"priorities":["..."],"nextQuestion":"..."}. Confidence must be an integer from 0 to 100. Keep the assessment conservative and suitable for a Myanmar learner.`;
}

function buildRoleplayPrompt(lesson, level, studentAnswer) {
    return `You are a premium English conversation teacher running a realistic role-play for ${level.title} (${level.cefr}).
Scenario/topic: ${lesson.title}
Objective: ${lesson.objective}
Grammar focus: ${lesson.grammar}
Vocabulary focus: ${lesson.vocabulary}

The learner just said:
${studentAnswer}

Stay in character for one turn, then give a very short teacher note. Do not write the whole conversation for the learner.
Use this response order:
1. One natural in-character reply or question.
2. Teacher note: one corrected sentence.
3. Burmese explanation of one important improvement.
4. A new in-character question that requires the target language.
Keep the role-play realistic and appropriate to the learner's level.`;
}

function buildRoleplayVoicePrompt(lesson, level) {
    return `You are running a realistic English speaking role-play for ${level.title} (${level.cefr}).
Scenario/topic: ${lesson.title}. Objective: ${lesson.objective}. Grammar: ${lesson.grammar}. Vocabulary: ${lesson.vocabulary}.
Listen to the learner. Reply in character for one turn, then give a short Burmese teacher note with one corrected sentence and one pronunciation tip. Ask the next in-character question. Do not end the role-play.`;
}

function buildQuizQuestionPrompt(level, lesson, previousQuestions = []) {
    return `You are a premium English teacher creating a fresh quiz question for ${level.title} (${level.cefr}), Lesson ${lesson.number}: ${lesson.title}.
Grammar focus: ${lesson.grammar}
Vocabulary focus: ${lesson.vocabulary}
Create one useful question that checks meaning or real communication, not a trick.
Return JSON only with this shape: {"question":"...","options":["...","...","...","..."],"answerIndex":0,"explanation":"..."}.
There must be exactly four short options and answerIndex must be 0, 1, 2, or 3. Use a different question from these previous questions: ${JSON.stringify(previousQuestions.slice(-5))}. Keep it suitable for the learner's level.`;
}

function buildQuizFeedbackPrompt(level, lesson, question, selectedAnswer, correctAnswer) {
    return `You are a patient English teacher. The learner answered a quiz question for ${level.title} (${level.cefr}), Lesson ${lesson.number}: ${lesson.title}.
Question: ${question}
Learner answer: ${selectedAnswer}
Correct answer: ${correctAnswer}
Give one short encouraging sentence, say whether it is correct, and explain the grammar or vocabulary in Burmese in no more than three sentences. Then give one tiny example for the learner to repeat.`;
}

function buildCoachPrompt(level, userMessage, track = { title: 'General English', description: 'Everyday English' }) {
    return `You are an always-available English Learning Coach for a Myanmar learner at ${level.title} (${level.cefr}). Their selected learning track is ${track.title}: ${track.description}.
The learner asks:
${userMessage}

Answer like a kind, practical private teacher. First answer the learner's question directly. Then provide one short English example, one Burmese explanation when useful, and one small speaking action they can do today. If the learner asks for a study plan, give a realistic plan with speaking, listening, vocabulary, grammar, and review. If the learner asks for correction, show natural English and explain the key change. Keep the conversation open with one useful follow-up question. Do not give medical, legal, or financial claims; redirect those topics appropriately.`;
}

function buildCoachVoicePrompt(level) {
    return `You are an English Learning Coach for a Myanmar learner at ${level.title} (${level.cefr}). Listen to the learner's voice question or speaking attempt. Reply directly, transcribe the important sentence, correct one key issue, explain it briefly in Burmese, give one pronunciation or fluency tip, and ask one helpful follow-up question. Be warm and practical.`;
}

function buildPronunciationPrompt(level, lesson) {
    return `You are a careful English pronunciation coach for a Myanmar learner at ${level.title} (${level.cefr}). Analyze this voice attempt in relation to the lesson ${lesson ? lesson.title : 'speaking practice'}.
Return JSON only: {"score":0,"clarity":0,"sounds":[{"word":"...","issue":"...","tip":"..."}],"stressTip":"...","correctedSentence":"...","repeatTask":"..."}.
Score from 0 to 10. Mention only observable, helpful issues. Be encouraging and explain the key tips in Burmese after the JSON is interpreted by the app.`;
}

function buildWordReviewPrompt(level, words) {
    return `You are a friendly vocabulary teacher for a Myanmar learner at ${level.title} (${level.cefr}). Create one short review activity for these words: ${JSON.stringify(words)}.
Return JSON only: {"question":"...","options":["...","...","...","..."],"answerIndex":0,"explanation":"...","speakingSentence":"..."}. Make the question practical and use the target words naturally.`;
}

function buildSkillReportPrompt(level, report) {
    return `You are a professional English teacher summarizing progress for a learner at ${level.title} (${level.cefr}). Skill scores: ${JSON.stringify(report)}. Write a concise Burmese progress report with strengths, two priorities, and a seven-day speaking recommendation. Do not claim this is an official exam certificate.`;
}

function buildDailyPlanPrompt(level, lesson, stats, date) {
    return `You are a professional English speaking teacher creating a realistic one-day study plan for a Myanmar learner.
Date: ${date}
Level: ${level.title} (${level.cefr})
Current lesson: ${lesson ? `${lesson.number}. ${lesson.title}` : 'Review and maintenance'}
Lesson objective: ${lesson?.objective || 'Maintain and improve practical English.'}
Grammar focus: ${lesson?.grammar || 'Review the learner’s weak points.'}
Vocabulary focus: ${lesson?.vocabulary || 'Useful everyday vocabulary.'}
Learner stats: ${JSON.stringify(stats)}

Create a balanced plan for one day with 4 to 5 tasks covering speaking, listening or shadowing, vocabulary, grammar, and review. Keep it realistic for a busy learner and adapt the difficulty to the level and weak areas. Include exact minutes and a simple measurable action for every task.
Return JSON only with this exact shape: {"date":"${date}","focus":"...","totalMinutes":30,"tasks":[{"id":"speaking","type":"speaking|listening|vocabulary|grammar|review","title":"...","minutes":10,"instructions":"..."}]}.
Tasks must have unique ids, minutes must be integers from 3 to 20, totalMinutes must equal the sum of task minutes, and there must be 4 or 5 tasks.`;
}

function buildAssessmentPrompt(level, assessmentType, answer) {
    return `You are an experienced English speaking examiner. Assess this learner at ${level.title} (${level.cefr}). Assessment type: ${assessmentType}.
Learner answer:
${answer}

Score grammar, vocabulary, fluency, pronunciation/clarity, and task completion from 0 to 10. Give one strength, two priorities, one corrected example, and one next practice task. Be honest but motivating. Return JSON only:
{"overall":0,"grammar":0,"vocabulary":0,"fluency":0,"pronunciation":0,"taskCompletion":0,"strength":"...","priorities":["...","..."],"correctedExample":"...","nextTask":"..."}`;
}

module.exports = {
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
    buildPronunciationPrompt,
    buildWordReviewPrompt,
    buildSkillReportPrompt,
    buildDailyPlanPrompt,
    buildAssessmentPrompt
};
