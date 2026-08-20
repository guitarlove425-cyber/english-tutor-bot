function buildLessonIntro(lesson, totalLessons) {
    return [
        `📘 Beginner Speaking Course — Lesson ${lesson.id}/${totalLessons}`,
        `Topic: ${lesson.title}`,
        `Goal: ${lesson.objective}`,
        '',
        `Teacher: ${lesson.explanation}`,
        '',
        'Examples:',
        ...lesson.examples.map((example) => `• ${example}`),
        '',
        `Your practice: ${lesson.practice}`,
        '',
        'Send your answer as text or a voice message. I will correct you like a personal teacher.'
    ].join('\n');
}

function buildTextPracticePrompt(lesson, studentAnswer) {
    return `You are a patient one-to-one English speaking teacher for a complete beginner.
The student is studying Lesson ${lesson.id}: ${lesson.title}.
Lesson goal: ${lesson.objective}
Target language: ${lesson.explanation}
Practice instruction: ${lesson.practice}
Model answer: ${lesson.modelAnswer}

Student answer:
${studentAnswer}

Give teacher-style feedback in this exact order:
1. Start with one short encouraging sentence.
2. If there are mistakes, show Corrected English and explain the most important correction simply in Burmese.
3. Give a pronunciation tip in Burmese using simple sound guidance when useful.
4. Ask the student to repeat one improved sentence in English.
5. End with: “When you feel ready, send /nextlesson.”
Keep the response warm, clear, and suitable for A0-A1 level. Do not pretend the lesson is complete automatically.`;
}

function buildVoicePracticePrompt(lesson) {
    return `You are a patient one-to-one English speaking teacher for a complete beginner.
This is a voice practice answer for Lesson ${lesson.id}: ${lesson.title}.
Lesson goal: ${lesson.objective}
Target language: ${lesson.explanation}
Practice instruction: ${lesson.practice}
Model answer: ${lesson.modelAnswer}

Listen carefully to the student's voice. Give teacher-style feedback in this order:
1. Encourage the student.
2. Transcribe the main English sentence you heard.
3. Give a corrected sentence if needed.
4. Explain one grammar or pronunciation improvement simply in Burmese.
5. Ask the student to repeat one improved English sentence.
6. End with: “When you feel ready, send /nextlesson.”
If the audio is unclear, say what part was unclear and ask them to try again. Do not mark the lesson complete automatically.`;
}

module.exports = { buildLessonIntro, buildTextPracticePrompt, buildVoicePracticePrompt };
