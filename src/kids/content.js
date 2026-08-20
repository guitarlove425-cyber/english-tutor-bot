const KIDS_STAGES = [
    { id: 'discovery', title: 'Discovery English', cefr: 'Pre-A1', ageBand: '5-7', description: 'အက္ခရာ၊ phonics၊ ရုပ်ပုံနဲ့ ပထမဆုံးစကားလုံးများ' },
    { id: 'primary', title: 'Primary Foundations', cefr: 'Pre-A1-A1', ageBand: '6-9', description: 'အခြေခံဝေါဟာရ၊ ဝါကျတိုနဲ့ နားထောင်/ပြောခြင်း' },
    { id: 'elementary', title: 'Elementary English', cefr: 'A1-A2', ageBand: '8-11', description: 'နေ့စဉ်အကြောင်းအရာ၊ ဖတ်ခြင်း၊ ရေးခြင်းနဲ့ conversation' },
    { id: 'junior', title: 'Junior Communicator', cefr: 'A2-B1', ageBand: '10-13', description: 'အမြင်ပြောခြင်း၊ story၊ role-play နဲ့ fluency' },
    { id: 'academic', title: 'Academic Bridge', cefr: 'B1-B2', ageBand: '12-15', description: 'စာပိုဒ်၊ project၊ presentation နဲ့ critical thinking' },
    { id: 'pro', title: 'Young Pro English', cefr: 'B2-C1+', ageBand: '14+', description: 'အဆင့်မြင့် speaking၊ writing၊ debate နဲ့ leadership' }
];

const LESSON_DATA = [
    ['A is for Apple', 'A/a ကို သိပြီး /æ/ အသံနဲ့ apple ကို ပြောရန်', 'letter A; /æ/', 'A, a, apple, ant', 'A is for apple.', 'A ကိုရေးပြီး apple ကို ၃ ကြိမ် ပြောပါ။', 'discovery'],
    ['B is for Ball', 'B/b ကို သိပြီး /b/ အသံနဲ့ ball ကို ပြောရန်', 'letter B; /b/', 'B, b, ball, book', 'B is for ball.', 'B နဲ့စတဲ့ စကားလုံးတစ်လုံး ပြောပါ။', 'discovery'],
    ['C and D Sounds', 'C/c နဲ့ D/d အသံကို ခွဲပြောရန်', 'letter C/D; /k/ /d/', 'cat, cup, dog, door', 'C is for cat. D is for dog.', 'cat နဲ့ dog ကို အသံခွဲပြောပါ။', 'discovery'],
    ['Vowel Friends', 'a, e, i, o, u ကို ခွဲသိရန်', 'short vowels', 'a, e, i, o, u', 'A, E, I, O, U are vowels.', 'vowel တစ်လုံးစီကို လက်ခုပ်တီးပြီး ပြောပါ။', 'discovery'],
    ['Sound Blending', 'အသံခွဲပြီး CVC word ဖတ်ရန်', 'phonics blending', 'cat, sun, map, pen', 'c-a-t makes cat.', 'စကားလုံး ၃ လုံးကို အသံခွဲပြီး ပေါင်းဖတ်ပါ။', 'discovery'],
    ['Colors Around Me', 'အရောင်များကို သိပြီး ဝါကျထဲ အသုံးပြုရန်', 'This is + color', 'red, blue, green, yellow, black', 'This is red.', 'အနီးရှိ အရာ ၂ ခုရဲ့အရောင်ကို ပြောပါ။', 'primary'],
    ['Numbers 1 to 20', '1 ကနေ 20 အထိ ရေတွက်ရန်', 'How many?', 'one, two, three, ten, twenty', 'I have three pencils.', 'အရာဝတ္ထုများကို ရေတွက်ပြီး ပြောပါ။', 'primary'],
    ['My Family', 'မိသားစုဝင်များကို မိတ်ဆက်ရန်', 'This is my...', 'mother, father, brother, sister', 'This is my mother.', 'မိသားစုဝင် ၂ ယောက်ကို English ဖြင့် မိတ်ဆက်ပါ။', 'primary'],
    ['My Body and Health Habits', 'ကိုယ်ခန္ဓာနဲ့ သန့်ရှင်းရေးအလေ့အကျင့် ပြောရန်', 'I have / I wash', 'eyes, hands, teeth, wash, clean', 'I wash my hands.', 'လုံခြုံတဲ့ နေ့စဉ်သန့်ရှင်းရေးအလုပ် ၃ ခု ပြောပါ။', 'primary'],
    ['My Toys and Things', 'ပိုင်ဆိုင်မှုနဲ့ အရာဝတ္ထုကို ဖော်ပြရန်', 'I have a / It is', 'ball, doll, car, big, small', 'I have a red ball.', 'ကိုယ်ပိုင်ပစ္စည်းတစ်ခုကို အရောင်/အရွယ်ထည့်ပြောပါ။', 'primary'],
    ['I Like and I Can', 'ကြိုက်နှစ်သက်မှုနဲ့ လုပ်နိုင်မှု ပြောရန်', 'I like / I can', 'like, love, read, sing, draw', 'I like music. I can sing.', 'ကြိုက်တာနဲ့ လုပ်နိုင်တာ တစ်ခုစီ ပြောပါ။', 'elementary'],
    ['My Day', 'နေ့စဉ်လုပ်ရိုးလုပ်စဉ်ကို အစဉ်လိုက်ပြောရန်', 'I wake up / I go', 'wake up, eat, go, play, sleep', 'I wake up at seven.', 'မနက်ကနေ ညအထိ လုပ်တာ ၄ ခု ပြောပါ။', 'elementary'],
    ['At School', 'ကျောင်းမှာ ယဉ်ကျေးစွာ တောင်းဆိုရန်', 'Can I have...?', 'teacher, friend, book, pencil, desk', 'Can I have a pencil, please?', 'classroom role-play မှာ ပစ္စည်းတစ်ခု တောင်းပါ။', 'elementary'],
    ['Good Manners', 'please, thank you, sorry ကို အခြေအနေအလိုက် အသုံးပြုရန်', 'Please / Thank you / Sorry', 'please, thank you, sorry, welcome', 'Thank you very much.', 'အခြေအနေ ၃ ခုကို manners sentence နဲ့ ပြောပါ။', 'elementary'],
    ['Feelings and Reasons', 'ခံစားချက်နဲ့ အကြောင်းရင်းကို ပြောရန်', 'I feel... because...', 'happy, sad, tired, hungry, excited', 'I am happy because I played.', 'ခံစားချက်တစ်ခုနဲ့ အကြောင်းရင်းကို ပြောပါ။', 'elementary'],
    ['Weather and Clothes', 'ရာသီဥတုနဲ့ သင့်တော်သောအဝတ်အစား ပြောရန်', 'It is... so I wear...', 'sunny, rainy, hot, cold, jacket', 'It is rainy, so I wear a jacket.', 'ရာသီဥတု ၂ မျိုးအတွက် ဝါကျပြောပါ။', 'junior'],
    ['Tell a Short Story', 'First/Then/Finally နဲ့ ပုံပြင်တိုပြောရန်', 'First / Then / Finally', 'first, then, finally, home, friend', 'First, I see a dog. Then, we play.', 'ပုံတစ်ပုံအကြောင်း ဝါကျ ၃ ကြောင်းပြောပါ။', 'junior'],
    ['Ask and Answer Questions', 'မေးခွန်းနဲ့ အဖြေကို ဆက်တိုက်ပြောရန်', 'Wh- questions', 'who, what, where, when, why', 'Where do you live? I live in Myanmar.', 'မေးခွန်း ၃ ခုမေးပြီး အဖြေ ၃ ခု ပေးပါ။', 'junior'],
    ['Real-life Role-play', 'ဆိုင်၊ ခရီးနဲ့ သူငယ်ချင်းအခြေအနေများကို သရုပ်ဆောင်ရန်', 'Could I...? / I would like...', 'shop, ticket, price, please, help', 'I would like a ticket, please.', 'real-life role-play တစ်ခုကို အစအဆုံးလုပ်ပါ။', 'junior'],
    ['Opinion and Choice', 'ကိုယ်ပိုင်ရွေးချယ်မှုနဲ့ အကြောင်းပြချက်ကို ပြောရန်', 'I prefer... because...', 'prefer, better, important, reason', 'I prefer reading because it is useful.', 'ရွေးချယ်မှုတစ်ခုကို အကြောင်းပြချက် ၂ ခုနဲ့ ပြောပါ။', 'junior'],
    ['Read for Main Idea', 'စာပိုဒ်တိုရဲ့ အဓိကအကြောင်းကို ရှာရန်', 'main idea / detail', 'main idea, detail, same, different', 'The main idea is about friendship.', 'စာပိုဒ်တစ်ပိုဒ်ကို ကိုယ့်စကားနဲ့ ပြန်ရှင်းပါ။', 'academic'],
    ['Write a Clear Paragraph', 'topic sentence နဲ့ supporting sentences ရေးရန်', 'because / also / but', 'topic, example, reason, conclusion', 'I like my school because it is friendly.', 'အကြောင်းအရာတစ်ခုအပေါ် ဝါကျ ၅ ကြောင်းရေးပါ။', 'academic'],
    ['Mini Presentation', 'အကြောင်းအရာတစ်ခုကို အစ၊ အလယ်၊ အဆုံးနဲ့ တင်ပြရန်', 'First / Next / Finally', 'introduce, explain, example, thank you', 'Today I will talk about animals.', '၁ မိနစ် mini presentation ပြောပါ။', 'academic'],
    ['Compare and Explain', 'အရာ ၂ ခုကို နှိုင်းယှဉ်ရှင်းပြရန်', 'more... than / both', 'similar, different, larger, useful', 'Both books are useful, but this one is easier.', 'အရာ ၂ ခုကို အချက် ၃ ချက်နဲ့ နှိုင်းယှဉ်ပါ။', 'academic'],
    ['Project: My World', 'ကိုယ့်စိတ်ဝင်စားရာအကြောင်း project တစ်ခု ပြုလုပ်ရန်', 'project language', 'research, plan, create, share', 'My project is about protecting animals.', 'project အကြောင်း ၂ မိနစ် ပြောပြီး မေးခွန်း ၂ ခု ဖြေပါ။', 'academic'],
    ['Confident Discussion', 'အမြင်ကို ယဉ်ကျေးစွာ ထောက်ခံ/မထောက်ခံရန်', 'I agree / I see your point', 'agree, disagree, opinion, example', 'I see your point, but I have another idea.', 'အမြင်တစ်ခုကို supporting example နဲ့ ဆွေးနွေးပါ။', 'pro'],
    ['Advanced Storytelling', 'story ကို detail၊ feeling နဲ့ သဘာဝကျကျ ပြောရန်', 'narrative tenses', 'suddenly, meanwhile, fortunately, lesson', 'Fortunately, we found a safe way home.', '၃ မိနစ် story တစ်ခု ပြောပါ။', 'pro'],
    ['Academic and Professional Writing', 'ရှင်းလင်းပြီး ယဉ်ကျေးသော email/argument ရေးရန်', 'formal register and linking', 'purpose, evidence, however, therefore', 'I am writing to explain my proposal.', 'formal message တစ်စောင်ရေးပြီး ပြန်ဖတ်ပါ။', 'pro'],
    ['Young Pro Showcase', 'speaking၊ writing၊ listening နဲ့ Q&A ကို ပေါင်းစပ်ပြရန်', 'integrated communication', 'present, explain, defend, reflect', 'Thank you for listening. I am happy to answer questions.', '၅ မိနစ် presentation နဲ့ Q&A ဖြေဆိုပါ။', 'pro'],
    ['Young Pro Capstone', 'အကြောင်းအရာတစ်ခုကို research၊ presentation နဲ့ Q&A ဖြင့် ကာကွယ်ရှင်းပြရန်', 'advanced linking and register', 'evidence, perspective, impact, conclusion', 'My position is clear, and my evidence supports it.', 'ကိုယ်စိတ်ဝင်စားတဲ့အကြောင်းအရာကို ၅ မိနစ်တင်ပြပြီး မေးခွန်း ၃ ခု ဖြေပါ။', 'pro']
];

const KIDS_COURSE = LESSON_DATA.map((item, index) => ({
    id: index + 1,
    stageId: item[6],
    title: item[0],
    objective: item[1],
    grammar: item[2],
    vocabulary: item[3],
    model: item[4],
    speakingTask: item[5],
    ageBand: KIDS_STAGES.find((stage) => stage.id === item[6])?.ageBand || '5-15',
    minutes: index < 5 ? 8 : index < 15 ? 12 : index < 25 ? 18 : 25
}));

function getKidsStage(stageId) {
    return KIDS_STAGES.find((stage) => stage.id === stageId) || KIDS_STAGES[0];
}

function getKidsLesson(lessonNumber = 1) {
    return KIDS_COURSE[Math.max(0, Number(lessonNumber) - 1)] || null;
}

function getNextKidsLesson(lessonNumber = 1) {
    return getKidsLesson(Number(lessonNumber) + 1);
}

module.exports = { KIDS_STAGES, KIDS_COURSE, getKidsStage, getKidsLesson, getNextKidsLesson };
