function buildLessonIntro(lesson, totalLessons) {
    return [
        `📘 Beginner Speaking Course — Lesson ${lesson.id}/${totalLessons}`,
        `အကြောင်းအရာ: ${lesson.title}`,
        `ရည်မှန်းချက်: ${lesson.objective}`,
        '',
        `ဆရာရှင်းပြချက်: ${lesson.explanation}`,
        '',
        'English ဥပမာများ:',
        ...lesson.examples.map((example) => `• ${example}`),
        '',
        `သင့်လေ့ကျင့်ခန်း: ${lesson.practice}`,
        '',
        'အဖြေကို စာသားဖြင့်ဖြစ်စေ၊ အသံဖြင့်ဖြစ်စေ ပို့ပါ။ ဆရာတစ်ယောက်လို အမှားပြင်ပေးပါမယ်။'
    ].join('\n');
}

function buildTextPracticePrompt(lesson, studentAnswer) {
    return `You are a patient one-to-one English speaking teacher for a Myanmar complete beginner. Write all learner-facing instructions, feedback, labels, and explanations in Burmese; keep target English, corrected sentences, examples, and questions in English.
The student is studying Lesson ${lesson.id}: ${lesson.title}.
Lesson goal: ${lesson.objective}
Target language: ${lesson.explanation}
Practice instruction: ${lesson.practice}
Model answer: ${lesson.modelAnswer}

Student answer:
${studentAnswer}

Give teacher-style feedback in this exact order, using Burmese for the instructions and feedback:
1. မြန်မာလို အားပေးစကားတိုတစ်ကြောင်း။
2. Corrected English နှင့် အရေးကြီးဆုံးအမှားကို မြန်မာလို ရှင်းပြပါ။
3. Pronunciation tip ကို မြန်မာလို ပေးပါ။
4. ပြင်ဆင်ထားသော English ဝါကျတစ်ကြောင်းကို ပြန်ပြောခိုင်းပါ။
5. နောက်ဆုံးတွင် "အဆင်သင့်ဖြစ်ရင် /nextlesson ကိုနှိပ်ပါ။" ဟုရေးပါ။
A0-A1 အဆင့်နှင့်ကိုက်ညီအောင် နွေးထွေးပြီး ရှင်းလင်းစွာပြောပါ။ Lesson ပြီးပြီဟု အလိုအလျောက် မပြောပါနှင့်။`;
}

function buildVoicePracticePrompt(lesson) {
    return `You are a patient one-to-one English speaking teacher for a Myanmar complete beginner. Write all learner-facing instructions, feedback, labels, and explanations in Burmese; keep the transcription, corrected sentence, and practice sentence in English.
This is a voice practice answer for Lesson ${lesson.id}: ${lesson.title}.
Lesson goal: ${lesson.objective}
Target language: ${lesson.explanation}
Practice instruction: ${lesson.practice}
Model answer: ${lesson.modelAnswer}

Listen carefully to the student's voice. Give teacher-style feedback in this order, using Burmese for all instructions and feedback:
1. မြန်မာလို အားပေးစကား။
2. ကြားရသော အဓိက English ဝါကျကို ရေးပြပါ။
3. လိုအပ်လျှင် Corrected English ပြပါ။
4. Grammar သို့မဟုတ် pronunciation တိုးတက်စရာတစ်ခုကို မြန်မာလို ရှင်းပြပါ။
5. English ဝါကျတစ်ကြောင်းကို ပြန်ပြောခိုင်းပါ။
6. နောက်ဆုံးတွင် "အဆင်သင့်ဖြစ်ရင် /nextlesson ကိုနှိပ်ပါ။" ဟုရေးပါ။
အသံမရှင်းလျှင် မရှင်းသည့်အပိုင်းကို မြန်မာလိုပြောပြီး ပြန်ပို့ခိုင်းပါ။ Lesson ပြီးပြီဟု အလိုအလျောက် မပြောပါနှင့်။`;
}

module.exports = { buildLessonIntro, buildTextPracticePrompt, buildVoicePracticePrompt };
