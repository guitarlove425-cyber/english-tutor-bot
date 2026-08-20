const TRACKS = [
    {
        id: 'general',
        title: 'General English',
        icon: '🌍',
        description: 'Everyday speaking, grammar, vocabulary, and confidence.',
        premium: false
    },
    {
        id: 'travel',
        title: 'Travel English',
        icon: '✈️',
        description: 'Airport, hotel, restaurant, directions, and travel problems.',
        premium: false
    },
    {
        id: 'ielts',
        title: 'IELTS Speaking',
        icon: '🎓',
        description: 'Part 1, Part 2, Part 3, band-style feedback, and timed answers.',
        premium: true
    },
    {
        id: 'toefl',
        title: 'TOEFL Speaking',
        icon: '🏛️',
        description: 'Independent and integrated speaking tasks with academic English.',
        premium: true
    },
    {
        id: 'business',
        title: 'Business English',
        icon: '💼',
        description: 'Meetings, presentations, emails, negotiation, and workplace fluency.',
        premium: true
    },
    {
        id: 'job-interview',
        title: 'Job Interview',
        icon: '🎤',
        description: 'Professional answers, STAR stories, confidence, and follow-up questions.',
        premium: true
    }
];

function getTrack(trackId = 'general') {
    return TRACKS.find((track) => track.id === trackId) || TRACKS[0];
}

function trackIsPremium(trackId) {
    return getTrack(trackId).premium;
}

module.exports = { TRACKS, getTrack, trackIsPremium };
