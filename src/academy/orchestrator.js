const { skillReport, weakSkills } = require('./learning');

const PROFILE_GOALS = new Set(['speaking', 'work', 'travel', 'exam', 'confidence']);
const PROFILE_PRACTICE = new Set(['voice', 'text', 'mixed']);
const PROFILE_CONFIDENCE = new Set(['low', 'medium', 'high']);

function normalizeLearnerProfile(profile = {}) {
    const source = profile && typeof profile === 'object' ? profile : {};
    const goal = PROFILE_GOALS.has(String(source.goal)) ? String(source.goal) : 'speaking';
    const preferredPractice = PROFILE_PRACTICE.has(String(source.preferredPractice)) ? String(source.preferredPractice) : 'mixed';
    const confidence = PROFILE_CONFIDENCE.has(String(source.confidence)) ? String(source.confidence) : 'medium';
    const parsedMinutes = Number(source.dailyMinutes);
    const dailyMinutes = Number.isInteger(parsedMinutes) ? Math.min(120, Math.max(5, parsedMinutes)) : 20;
    return {
        goal,
        preferredPractice,
        confidence,
        dailyMinutes,
        updatedAt: source.updatedAt || null
    };
}

function profileGoalLabel(goal) {
    return {
        speaking: 'နေ့စဉ် Speaking',
        work: 'အလုပ်အတွက် English',
        travel: 'ခရီးသွား English',
        exam: 'IELTS/TOEFL စာမေးပွဲ',
        confidence: 'English ပြောရဲမှု'
    }[goal] || 'နေ့စဉ် Speaking';
}

function practiceLabel(practice) {
    return { voice: 'အသံဖြင့်လေ့ကျင့်ခြင်း', text: 'စာရေးလေ့ကျင့်ခြင်း', mixed: 'စာရေး + အသံ နှစ်မျိုး' }[practice] || 'စာရေး + အသံ နှစ်မျိုး';
}

function recommendationFor(mode, reason, action, weak = []) {
    return { mode, reason, action, weakSkills: weak };
}

function recommendTeachingMode(progress = {}) {
    const report = skillReport(progress);
    const weak = weakSkills(progress);
    const profile = normalizeLearnerProfile(progress.learnerProfile);
    const current = profile.goal === 'exam' ? 'exam' : null;
    let recommendation;
    if (profile.confidence === 'low' || (report.speaking < 45 && report.consistency < 45)) {
        recommendation = recommendationFor('confidence_builder', 'အရင်ဆုံး အလွယ်ဆုံး sentence များနဲ့ အောင်မြင်မှုအတွေ့အကြုံ ရအောင်လုပ်သင့်ပါတယ်။', 'Confidence Builder ကို စပြီး ၃ ကြောင်း English ဖြင့် ပြောပါ။', weak);
    } else if (current === 'exam') {
        recommendation = recommendationFor('exam_simulator', 'သင့်ရည်မှန်းချက်က စာမေးပွဲဖြစ်လို့ timer နဲ့ rubric အတိုင်း လေ့ကျင့်သင့်ပါတယ်။', 'Exam Simulator မှာ မေးခွန်းတစ်ခုကို အချိန်ကန့်သတ်ပြီး ဖြေပါ။', weak);
    } else if (weak.includes('pronunciation') || report.pronunciation < 55) {
        recommendation = recommendationFor('pronunciation_lab', 'အသံထွက်အားနည်းချက်ကို အရင်ပြင်ရင် speaking confidence ပိုမြန်တက်လာပါမယ်။', 'Pronunciation Lab မှာ model sentence ကို နားထောင်ပြီး voice ဖြင့် ပြန်ပြောပါ။', weak);
    } else if (weak.includes('fluency') || report.fluency < 55) {
        recommendation = recommendationFor('conversation_ladder', 'စကားဆက်ပြောနိုင်မှုကို တိုးရန် အဖြေတိုကနေ ရှည်တဲ့အဖြေအထိ အဆင့်လိုက်တက်သင့်ပါတယ်။', 'Conversation Ladder မှာ 15 seconds speaking challenge ကို စပါ။', weak);
    } else if (weak.includes('grammar') || report.grammar < 55) {
        recommendation = recommendationFor('error_clinic', 'Grammar အမှားထပ်ခါထပ်ခါဖြစ်နေလို့ အမှားတစ်မျိုးချင်း သီးသန့်ပြန်သင်သင့်ပါတယ်။', 'Error Clinic မှာ ဒီနေ့ weak grammar point တစ်ခုကို ပြန်လေ့ကျင့်ပါ။', weak);
    } else if (profile.goal === 'travel' || profile.goal === 'work') {
        recommendation = recommendationFor('scenario_simulation', `${profileGoalLabel(profile.goal)} အတွက် လက်တွေ့အခြေအနေထဲမှာ သုံးနိုင်အောင် လေ့ကျင့်သင့်ပါတယ်။`, 'Real-life Scenario တစ်ခုရွေးပြီး role-play ဖြင့် ဖြေပါ။', weak);
    } else {
        recommendation = recommendationFor('conversation_ladder', 'လက်ရှိ skill များကို စကားပြောအသုံးချမှုထဲမှာ ပေါင်းစပ်လေ့ကျင့်သင့်ပါတယ်။', 'Conversation Ladder မှာ English question တစ်ခုကို ဖြေပြီး follow-up မေးခွန်းကို ဆက်ဖြေပါ။', weak);
    }
    return { ...recommendation, profile, report };
}

function profileSummary(profile = {}) {
    const normalized = normalizeLearnerProfile(profile);
    return `ရည်မှန်းချက်: ${profileGoalLabel(normalized.goal)}\nတစ်နေ့လေ့လာချိန်: ${normalized.dailyMinutes} မိနစ်\nလေ့ကျင့်ပုံ: ${practiceLabel(normalized.preferredPractice)}\nလက်ရှိယုံကြည်မှု: ${normalized.confidence}`;
}

module.exports = {
    PROFILE_GOALS,
    PROFILE_PRACTICE,
    PROFILE_CONFIDENCE,
    normalizeLearnerProfile,
    profileGoalLabel,
    practiceLabel,
    recommendTeachingMode,
    profileSummary
};
