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
            ['Classroom requests', 'Ask for repetition, help, and permission politely.', 'Can you repeat? / I do not understand. / May I ...?', 'repeat, help, understand, please', 'Use three classroom requests in a mini-dialogue.'],
            ['Needs and preferences', 'Say what you need, like, and do not like.', 'I need ... / I like ... / I do not like ...', 'need, like, food, water, music', 'Tell the teacher two needs and two preferences.'],
            ['Location and simple routes', 'Say where an object is and give one simple direction.', 'It is next to ... / Go left / Go straight', 'near, next to, left, right, street', 'Give directions from your room to the door.'],
            ['Listening for key words', 'Identify names, numbers, and places in a short message.', 'Is it ...? / Did you say ...?', 'name, number, place, again', 'Listen to a short message and write three key words.'],
            ['Starter checkpoint', 'Complete a short greeting, information exchange, and request.', 'Starter review: questions and polite requests', 'review vocabulary', 'Complete a two-person role-play with the teacher.']
        ]
    },
    {
        id: 'elementary',
        cefr: 'A1',
        title: 'Elementary',
        subtitle: 'Everyday basic communication',
        premium: false,
        goal: 'Handle routine conversations about family, work, services, time, and daily life.',
        lessons: [
            ['Relationships and responsibilities', 'Talk about family roles and simple responsibilities.', 'my, your, his, her / have got', 'family, partner, parent, help, responsible', 'Describe two people and what each person does.'],
            ['Habits, frequency, and exceptions', 'Describe regular habits and one unusual day.', 'always, usually, sometimes, never / present simple', 'often, early, late, habit, weekend', 'Explain three habits and one exception.'],
            ['Appointments and availability', 'Arrange a time and say when you are free or busy.', 'Are you free ...? / I can ... at ...', 'available, appointment, morning, afternoon', 'Arrange a short English appointment.'],
            ['Service requests and problems', 'Ask for a service and explain a simple problem.', 'Can I have ...? / There is a problem with ...', 'receipt, order, wrong, missing, change', 'Solve a simple café or shop problem politely.'],
            ['Landmarks and route explanations', 'Give a route using landmarks and sequence words.', 'first, then, after that / next to', 'corner, bridge, traffic light, opposite', 'Explain a route from a bus stop to a shop.'],
            ['Short messages and invitations', 'Write and answer a short invitation or message.', 'Would you like to ...? / See you at ...', 'invite, message, meet, bring, reply', 'Write a four-line invitation and answer it.'],
            ['Shopping quantities and prices', 'Ask about quantity, price, and choice.', 'How much / How many / I would like ...', 'cheap, expensive, kilo, bottle, enough', 'Buy three items in a shop role-play.'],
            ['Health appointments', 'Describe a basic symptom and arrange help safely.', 'I have ... / I need to see ...', 'headache, fever, clinic, appointment, rest', 'Make a simple clinic appointment; do not give medical advice.'],
            ['Listening for specific details', 'Find time, place, and action in a short announcement.', 'What time? Where? What should I do?', 'schedule, station, open, close, meeting', 'Write the three details after listening.'],
            ['A1 practical mission', 'Use everyday English to plan and complete a small task.', 'A1 review: requests, time, route, message', 'plan, choose, confirm, finish', 'Complete a five-minute everyday conversation.']
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
            ['Past experiences', 'Talk about what happened yesterday or last week.', 'past simple regular and common irregular verbs', 'visited, went, saw, bought', 'Tell a one-minute story about yesterday.'],
            ['Future arrangements', 'Discuss plans, predictions, and arrangements.', 'going to / will / present continuous for plans', 'plan, tomorrow, weekend, decide', 'Explain your plan for next weekend.'],
            ['Comparisons and preferences', 'Compare options and explain a preference.', 'comparatives, superlatives, because', 'better, cheaper, useful, best', 'Compare two phones, places, or study methods.'],
            ['Health advice and obligations', 'Explain a problem and ask for practical advice.', 'should / have to / need to', 'pain, appointment, advice, rest', 'Role-play a patient and receptionist without diagnosing.'],
            ['Travel problem solving', 'Check in, ask questions, and solve a travel problem.', 'Could you ...? / Would you mind ...?', 'ticket, reservation, luggage, delay', 'Solve a missed-connection role-play.'],
            ['Making plans together', 'Suggest, accept, refuse, and change a plan.', 'Let us ... / How about ...? / I would rather ...', 'suggest, agree, refuse, change, reason', 'Plan a weekend activity with a partner.'],
            ['Describing places and experiences', 'Describe a place using detail and personal reaction.', 'there is/are / past and present description', 'crowded, quiet, view, experience, comfortable', 'Describe a place you know in eight connected sentences.'],
            ['Messages, forms, and notes', 'Complete a simple form and write a useful note.', 'short answers / polite written requests', 'address, purpose, contact, note, attachment', 'Write a message explaining a change of plan.'],
            ['Listening for gist and detail', 'Identify the main idea and two supporting details.', 'I heard that ... / The main point is ...', 'main point, detail, reason, example', 'Summarize a short spoken message in three sentences.'],
            ['A2 scenario project', 'Complete a connected real-life task from planning to report.', 'past, future, comparison, polite requests', 'experience, goal, option, solution', 'Present a three-minute solution to an everyday problem.']
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
            ['Discussion and reasons', 'Give an opinion, support it, and respond politely.', 'I think / In my view / however / although', 'agree, disagree, reason, benefit', 'Discuss whether a common technology is useful.'],
            ['Meetings and clarification', 'Participate in a meeting and clarify ideas.', 'modals for politeness and suggestion', 'agenda, deadline, suggest, clarify', 'Lead a five-minute team meeting.'],
            ['Negotiating solutions', 'Explain a problem and negotiate a workable solution.', 'conditionals: if / unless / would', 'solution, risk, option, possible', 'Solve a customer complaint diplomatically.'],
            ['News and evidence', 'Summarize information and distinguish fact from opinion.', 'reported speech and linking words', 'report, claim, source, evidence', 'Summarize a short news topic and label fact versus opinion.'],
            ['Online collaboration', 'Agree responsibilities and update a shared task.', 'need to / should / have to / progress updates', 'shared, task, update, deadline, deliver', 'Write and present a team task update.'],
            ['Customer service repair', 'Apologize, explain a cause, and offer a remedy.', 'I am sorry that ... / We can ...', 'refund, replace, delay, inconvenience, resolve', 'Role-play a service recovery conversation.'],
            ['Summarizing a short talk', 'Take key notes and give an organized spoken summary.', 'firstly, in addition, as a result', 'topic, example, conclusion, summary', 'Give a ninety-second summary of a familiar topic.'],
            ['Writing a clear opinion', 'Write a short opinion with reasons and an example.', 'because, although, therefore, for example', 'position, reason, impact, example', 'Write 150 words on a practical community issue.'],
            ['B1 integrated project', 'Speak for five minutes with structure, examples, and follow-up answers.', 'mixed review and fluency', 'narrative and abstract vocabulary', 'Give a mini-presentation and answer questions.']
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
            ['Nuanced claims', 'Qualify claims and express degrees of certainty.', 'hedging: may, might, tends to, appears to', 'likely, significant, arguably, generally', 'Give a balanced view of a controversial issue.'],
            ['Persuasive presentations', 'Deliver an organized presentation with transitions.', 'signposting and emphasis', 'firstly, moreover, in contrast, therefore', 'Present a proposal with a clear call to action.'],
            ['Negotiation and concessions', 'Protect your interests while reaching agreement.', 'conditionals, concessions, would rather', 'offer, compromise, priority, agreement', 'Negotiate a contract or project deadline.'],
            ['Academic discussion', 'Compare evidence and challenge an idea respectfully.', 'passives, nominalization, complex clauses', 'research, finding, implication, factor', 'Discuss the strengths and limits of a study.'],
            ['Interview mastery', 'Answer difficult professional questions with examples.', 'STAR structure and advanced linking', 'achievement, challenge, leadership, outcome', 'Complete a mock job interview.'],
            ['Data and trends', 'Describe change and make a cautious interpretation.', 'whereas, compared with, has increased', 'trend, proportion, peak, decline, indicate', 'Explain a simple data story without inventing facts.'],
            ['Diplomatic email and response', 'Write a formal request, concern, and constructive reply.', 'formal register and softening', 'regarding, appreciate, concern, resolve', 'Draft a formal email and a helpful response.'],
            ['Mediation: explain information', 'Explain complex information clearly to a non-expert.', 'definitions, examples, paraphrase', 'process, outcome, requirement, context', 'Explain a workplace rule in plain English.'],
            ['Listening for implied meaning', 'Infer attitude, intention, and unstated priorities.', 'It sounds as if ... / The speaker implies ...', 'attitude, implication, emphasis, reservation', 'Explain what a speaker means beyond the literal words.'],
            ['B2 debate project', 'Defend a position in an extended discussion with evidence.', 'accuracy, fluency, register', 'professional and abstract vocabulary', 'Take part in a formal debate and reflect on your strategy.']
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
            ['Executive briefings', 'Sound concise, confident, and authoritative.', 'fronting, inversion, concise clause design', 'priority, outcome, strategic, accountable', 'Give a two-minute executive briefing.'],
            ['Strategic persuasion', 'Influence an audience through framing and evidence.', 'rhetorical devices and concession', 'premise, counterargument, compelling, warrant', 'Persuade a panel to fund an idea.'],
            ['Diplomatic disagreement', 'Disagree firmly without damaging relationships.', 'register, softening, pragmatic nuance', 'concern, perspective, reservation, appreciate', 'Handle a difficult stakeholder conversation.'],
            ['Expert explanation', 'Explain complex ideas to expert and non-expert listeners.', 'definition, analogy, passive and active choices', 'hypothesis, mechanism, context, limitation', 'Teach a complex topic in two versions.'],
            ['Idiomatic fluency', 'Use natural collocations and idioms appropriately.', 'collocation, phrasal verbs, discourse markers', 'take into account, on balance, as a result', 'Retell a story using natural expressions.'],
            ['Cross-cultural communication', 'Adjust directness, tone, and examples for an audience.', 'pragmatic choices and cultural framing', 'assumption, expectation, nuance, inclusive', 'Adapt one message for two different audiences.'],
            ['Critical response and synthesis', 'Combine several ideas into a careful position.', 'synthesis, qualification, citation language', 'converge, contrast, implication, limitation', 'Give a reasoned response using two supplied viewpoints.'],
            ['Facilitation and leadership', 'Guide a group toward a decision and manage turns.', 'turn-taking, reframing, consensus language', 'facilitate, priority, consensus, agenda', 'Facilitate a decision meeting and summarize the outcome.'],
            ['Register and tone control', 'Rewrite a message for formal, neutral, and friendly contexts.', 'register, stance, politeness, ellipsis', 'appropriate, concise, diplomatic, informal', 'Produce three versions of the same professional message.'],
            ['C1 capstone defense', 'Complete an advanced speaking assessment across contexts.', 'full grammar, register, pronunciation review', 'personal specialization vocabulary', 'Deliver a ten-minute capstone and defend it in Q&A.']
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
