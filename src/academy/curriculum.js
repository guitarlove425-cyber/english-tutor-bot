const LEVELS = [
    {
        id: 'starter',
        cefr: 'A0',
        title: 'Starter',
        subtitle: 'Absolute beginner',
        premium: false,
        goal: 'Understand and speak essential English for introductions, needs, and simple everyday situations.',
        lessons: [
            ['Greetings and names', 'Say hello, introduce yourself, and ask a name.', 'I am / My name is / What is your name?', 'hello, name, nice, meet', 'Record a 30-second self-introduction.'],
            ['Numbers and spelling', 'Say numbers, ages, and spell your name clearly.', 'I am ... years old / It is spelled ...', 'number, age, phone, letter', 'Spell your name and say your phone number.'],
            ['People and things', 'Use this, that, a, and the to identify objects.', 'This is / That is / It is a ...', 'book, phone, bag, pen', 'Show three objects and describe them.'],
            ['Be: am, is, are', 'Describe yourself and other people with be.', 'I am / You are / He is / She is', 'happy, tired, student, teacher', 'Make five true sentences about people.'],
            ['Basic questions', 'Ask and answer who, what, and where questions.', 'What is ...? Who is ...? Where are ...?', 'who, what, where, from', 'Answer five basic questions in voice.'],
            ['Starter checkpoint', 'Hold a short greeting and introduction conversation.', 'Review of Starter grammar', 'review vocabulary', 'Complete a two-person role-play with the teacher.']
        ]
    },
    {
        id: 'elementary',
        cefr: 'A1',
        title: 'Elementary',
        subtitle: 'Everyday basic communication',
        premium: false,
        goal: 'Handle routine conversations about family, work, food, time, and daily life.',
        lessons: [
            ['Family and possessions', 'Talk about family and ownership.', 'my, your, his, her / have got', 'family, mother, brother, friend', 'Describe your family in six sentences.'],
            ['Daily routines', 'Describe what you do every day.', 'Present simple: I work / She works', 'wake up, eat, go, study', 'Explain your weekday routine.'],
            ['Time and schedules', 'Tell the time and discuss a simple schedule.', 'at, on, every / What time do you ...?', 'morning, evening, today, Monday', 'Create and explain your daily schedule.'],
            ['Food and polite requests', 'Order food and ask for things politely.', 'I would like / Can I have ...?', 'menu, water, rice, bill', 'Role-play a café order with the teacher.'],
            ['Places and directions', 'Ask for and give simple directions.', 'There is / There are / imperatives', 'street, bank, market, left, right', 'Give directions from home to a shop.'],
            ['Elementary project', 'Hold a three-minute everyday conversation.', 'Review of A1 grammar', 'personal information and routines', 'Complete a guided conversation without reading.']
        ]
    },
    {
        id: 'pre-intermediate',
        cefr: 'A2',
        title: 'Pre-Intermediate',
        subtitle: 'Independent everyday speaking',
        premium: true,
        goal: 'Describe experiences, plans, preferences, and problems with connected sentences.',
        lessons: [
            ['Past experiences', 'Talk about what happened yesterday or last week.', 'Past simple regular and common irregular verbs', 'visited, went, saw, bought', 'Tell a one-minute story about yesterday.'],
            ['Future plans', 'Discuss plans, predictions, and arrangements.', 'going to / will / present continuous for plans', 'plan, tomorrow, weekend, decide', 'Explain your plan for next weekend.'],
            ['Comparisons and opinions', 'Compare people, places, and products.', 'comparatives, superlatives, because', 'better, cheaper, interesting, best', 'Compare two cities or two phones.'],
            ['Health and problems', 'Explain a simple problem and ask for advice.', 'should / have to / need to', 'pain, appointment, advice, rest', 'Role-play a patient and receptionist.'],
            ['Travel and service English', 'Check in, ask questions, and solve a travel problem.', 'Could you ...? / Would you mind ...?', 'ticket, reservation, luggage, delay', 'Solve a missed-flight role-play.'],
            ['A2 project', 'Give a connected three-minute personal talk.', 'Past, future, comparison review', 'life, goals, experiences', 'Present your life story and future plans.']
        ]
    },
    {
        id: 'intermediate',
        cefr: 'B1',
        title: 'Intermediate',
        subtitle: 'Confident conversations',
        premium: true,
        goal: 'Express reasons, stories, opinions, and decisions naturally in work and social conversations.',
        lessons: [
            ['Storytelling', 'Tell a clear story with a beginning, middle, and ending.', 'past continuous, past perfect, sequencing', 'while, suddenly, after that, finally', 'Tell a surprising story with five events.'],
            ['Opinions and discussion', 'Give an opinion, support it, and respond politely.', 'I think / In my view / however / although', 'agree, disagree, reason, benefit', 'Discuss whether social media is useful.'],
            ['Workplace communication', 'Participate in a meeting and clarify ideas.', 'modals for politeness and suggestion', 'agenda, deadline, suggest, clarify', 'Lead a five-minute team meeting.'],
            ['Problem-solving', 'Explain a problem and negotiate a solution.', 'conditionals: if / unless / would', 'solution, risk, option, possible', 'Solve a customer complaint diplomatically.'],
            ['News and media', 'Summarize information and distinguish fact from opinion.', 'reported speech and linking words', 'report, claim, source, evidence', 'Summarize a short news topic.'],
            ['B1 project', 'Speak for five minutes with structure and examples.', 'mixed review and fluency', 'narrative and abstract vocabulary', 'Give a mini-presentation and answer questions.']
        ]
    },
    {
        id: 'upper-intermediate',
        cefr: 'B2',
        title: 'Upper-Intermediate',
        subtitle: 'Professional and persuasive speaking',
        premium: true,
        goal: 'Speak with nuance, persuasion, precision, and flexibility in professional and academic situations.',
        lessons: [
            ['Nuanced opinions', 'Qualify claims and express degrees of certainty.', 'hedging: may, might, tends to, appears to', 'likely, significant, arguably, generally', 'Give a balanced view of a controversial issue.'],
            ['Presentations', 'Deliver an organized presentation with transitions.', 'signposting and emphasis', 'firstly, moreover, in contrast, therefore', 'Present a proposal with a clear call to action.'],
            ['Negotiation', 'Protect your interests while reaching agreement.', 'conditionals, concessions, would rather', 'offer, compromise, priority, agreement', 'Negotiate a contract or project deadline.'],
            ['Academic discussion', 'Compare evidence and challenge an idea respectfully.', 'passives, nominalization, complex clauses', 'research, finding, implication, factor', 'Discuss the strengths of a study.'],
            ['Interview mastery', 'Answer difficult professional questions with examples.', 'STAR structure and advanced linking', 'achievement, challenge, leadership, outcome', 'Complete a mock job interview.'],
            ['B2 project', 'Defend a position in an extended discussion.', 'accuracy, fluency, register', 'professional and abstract vocabulary', 'Take part in a formal debate.']
        ]
    },
    {
        id: 'advanced-pro',
        cefr: 'C1+',
        title: 'Advanced / Pro',
        subtitle: 'Executive, academic, and near-fluent communication',
        premium: true,
        goal: 'Communicate with precision, strategic control, natural idioms, and audience awareness.',
        lessons: [
            ['Executive presence', 'Sound concise, confident, and authoritative.', 'fronting, inversion, concise clause design', 'priority, outcome, strategic, accountable', 'Give a two-minute executive briefing.'],
            ['High-level persuasion', 'Influence an audience through framing and evidence.', 'rhetorical devices and concession', 'premise, counterargument, compelling, warrant', 'Persuade a panel to fund an idea.'],
            ['Diplomatic disagreement', 'Disagree firmly without damaging relationships.', 'register, softening, pragmatic nuance', 'concern, perspective, reservation, appreciate', 'Handle a difficult stakeholder conversation.'],
            ['Academic and expert speaking', 'Explain complex ideas to expert and non-expert listeners.', 'definition, analogy, passive and active choices', 'hypothesis, mechanism, context, limitation', 'Teach a complex topic in two versions.'],
            ['Idiomatic fluency', 'Use natural collocations and idioms appropriately.', 'collocation, phrasal verbs, discourse markers', 'take into account, on balance, as a result', 'Retell a story using natural expressions.'],
            ['Pro capstone', 'Complete an advanced speaking assessment across contexts.', 'full grammar, register, pronunciation review', 'personal specialization vocabulary', 'Deliver a ten-minute capstone and defend it in Q&A.']
        ]
    }
];

const LEVEL_MAP = new Map(LEVELS.map((level) => [level.id, level]));
const LEVEL_ORDER = LEVELS.map((level) => level.id);

function getLevel(levelId) {
    return LEVEL_MAP.get(levelId) || LEVELS[0];
}

function getLesson(levelId, lessonNumber) {
    const level = getLevel(levelId);
    const index = Number(lessonNumber) - 1;
    const item = level.lessons[index];
    if (!item) return null;
    const [title, objective, grammar, vocabulary, speakingTask] = item;
    return {
        id: `${level.id}-${index + 1}`,
        levelId: level.id,
        levelTitle: level.title,
        cefr: level.cefr,
        number: index + 1,
        title,
        objective,
        grammar,
        vocabulary,
        speakingTask,
        examples: [`Today we will practice ${title.toLowerCase()}.`, `A useful focus is ${grammar}.`],
        modelAnswer: speakingTask
    };
}

function getNextLesson(levelId, lessonNumber) {
    const levelIndex = LEVEL_ORDER.indexOf(levelId);
    const level = getLevel(levelId);
    if (Number(lessonNumber) < level.lessons.length) return { levelId, lessonNumber: Number(lessonNumber) + 1 };
    if (levelIndex < LEVEL_ORDER.length - 1) return { levelId: LEVEL_ORDER[levelIndex + 1], lessonNumber: 1 };
    return null;
}

function levelIsPremium(levelId) {
    return getLevel(levelId).premium;
}

module.exports = { LEVELS, LEVEL_ORDER, getLevel, getLesson, getNextLesson, levelIsPremium };
