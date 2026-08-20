const BEGINNER_COURSE = [
    {
        id: 1,
        title: 'Greetings and Introductions',
        objective: 'Say hello, introduce yourself, and ask someone’s name.',
        explanation: 'Today we learn three useful patterns: Hello, my name is ___. / I am ___. / What is your name?',
        examples: ['Hello! My name is Aung.', 'I am Aung.', 'Nice to meet you.'],
        practice: 'Reply in English: Hello, my name is ___. Nice to meet you.',
        modelAnswer: 'Hello, my name is Aung. Nice to meet you.'
    },
    {
        id: 2,
        title: 'Alphabet and Clear Sounds',
        objective: 'Say your name slowly and spell simple words.',
        explanation: 'Speak clearly one sound at a time. Use: My name is ___. It is spelled ___.',
        examples: ['My name is Su Su.', 'It is spelled S-U-S-U.', 'Please say it again.'],
        practice: 'Send a voice message or type: My name is ___. It is spelled ___.',
        modelAnswer: 'My name is Su Su. It is spelled S-U-S-U.'
    },
    {
        id: 3,
        title: 'I am, You are, He is, She is',
        objective: 'Use the verb be to describe people.',
        explanation: 'Use I am, you are, he is, and she is. Example: I am happy. You are kind. She is a student.',
        examples: ['I am a student.', 'You are my friend.', 'She is happy.'],
        practice: 'Make three short sentences about yourself or a friend using am, are, or is.',
        modelAnswer: 'I am a student. I am happy. My friend is kind.'
    },
    {
        id: 4,
        title: 'Numbers, Age, and Phone Numbers',
        objective: 'Say your age and numbers clearly.',
        explanation: 'Use: I am ___ years old. / My phone number is ___. Say each number clearly.',
        examples: ['I am twenty years old.', 'I am thirty years old.', 'My phone number is ...'],
        practice: 'Answer: How old are you? Use the sentence I am ___ years old.',
        modelAnswer: 'I am twenty years old.'
    },
    {
        id: 5,
        title: 'Family and Possessives',
        objective: 'Talk about your family with my, your, his, and her.',
        explanation: 'Use my for yourself and his or her for another person. Example: This is my mother. Her name is May.',
        examples: ['This is my brother.', 'His name is Ko Ko.', 'Her name is May.'],
        practice: 'Tell the teacher two simple sentences about someone in your family.',
        modelAnswer: 'This is my mother. Her name is May.'
    },
    {
        id: 6,
        title: 'Daily Routines',
        objective: 'Describe simple daily activities in the present simple.',
        explanation: 'Use I + verb for routines: I wake up, I eat breakfast, I go to work, and I study English.',
        examples: ['I wake up at seven.', 'I go to work.', 'I study English every day.'],
        practice: 'Tell the teacher three things you do every day.',
        modelAnswer: 'I wake up at seven. I eat breakfast. I study English.'
    },
    {
        id: 7,
        title: 'Simple Questions and Answers',
        objective: 'Ask and answer basic questions.',
        explanation: 'Useful questions are What is your name? Where are you from? What do you do?',
        examples: ['Where are you from?', 'I am from Myanmar.', 'What do you do?', 'I am a student.'],
        practice: 'Answer these two questions: Where are you from? What do you do?',
        modelAnswer: 'I am from Myanmar. I am a student.'
    },
    {
        id: 8,
        title: 'Time, Days, and Plans',
        objective: 'Talk about time and simple plans.',
        explanation: 'Use at for clock time: I study at seven. Use on for days: I study on Monday.',
        examples: ['I work at nine.', 'I study on Monday.', 'I will call you tomorrow.'],
        practice: 'Tell the teacher when you study English and one plan for tomorrow.',
        modelAnswer: 'I study English at seven. I will study tomorrow.'
    },
    {
        id: 9,
        title: 'Food and Shopping',
        objective: 'Ask for things politely in a shop or restaurant.',
        explanation: 'Use I would like ___, please. / How much is it? / Can I have ___?',
        examples: ['I would like tea, please.', 'How much is it?', 'Can I have some water?'],
        practice: 'Pretend you are in a café. Order one drink and one food politely.',
        modelAnswer: 'I would like tea and rice, please.'
    },
    {
        id: 10,
        title: 'Directions and Places',
        objective: 'Ask for and give simple directions.',
        explanation: 'Useful phrases are Where is ___? Go straight. Turn left. Turn right. It is next to ___.',
        examples: ['Where is the bank?', 'Go straight.', 'Turn left at the corner.'],
        practice: 'Ask for directions to a market, then give one simple direction.',
        modelAnswer: 'Where is the market? Go straight and turn left.'
    },
    {
        id: 11,
        title: 'Yesterday and Tomorrow',
        objective: 'Talk about a simple past event and a future plan.',
        explanation: 'Use yesterday for the past and tomorrow for the future: Yesterday I worked. Tomorrow I will study.',
        examples: ['Yesterday I watched a movie.', 'I went to school.', 'Tomorrow I will practice English.'],
        practice: 'Say one sentence about yesterday and one sentence about tomorrow.',
        modelAnswer: 'Yesterday I studied. Tomorrow I will practice English.'
    },
    {
        id: 12,
        title: 'Real-Life Conversation',
        objective: 'Use the course language in a short natural conversation.',
        explanation: 'We will practice a complete conversation: greeting, introduction, daily life, and a polite goodbye.',
        examples: ['Hello, my name is ...', 'Where are you from?', 'Nice to meet you.', 'See you tomorrow.'],
        practice: 'Send a short voice or text conversation with at least five English sentences.',
        modelAnswer: 'Hello, my name is Aung. I am from Myanmar. I am a student. I study English every day. Nice to meet you.'
    }
];

function getLesson(lessonId) {
    return BEGINNER_COURSE.find((lesson) => lesson.id === Number(lessonId)) || null;
}

module.exports = { BEGINNER_COURSE, getLesson };
