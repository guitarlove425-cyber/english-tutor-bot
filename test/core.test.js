const test = require('node:test');
const assert = require('node:assert/strict');

const { splitMessage, englishSpeechChunks } = require('../src/bot/handlers');
const {
    checkUsageLimit,
    makeUserPremium,
    getUserMode,
    setUserMode,
    startCourse,
    getCourseProgress,
    completeCourseLesson,
    resetCourse
} = require('../src/database/firebase');
const { BEGINNER_COURSE, getLesson } = require('../src/course/content');

test('splitMessage keeps Telegram chunks under the configured limit', () => {
    const chunks = splitMessage('a'.repeat(8000), 3900);
    assert.equal(chunks.length, 3);
    assert.ok(chunks.every((chunk) => chunk.length <= 3900));
});

test('englishSpeechChunks removes Burmese characters and splits long audio text', () => {
    const chunks = englishSpeechChunks(`Hello မင်္ဂလာပါ ${'world '.repeat(500)}`);
    assert.ok(chunks.length > 1);
    assert.ok(chunks.every((chunk) => /^[\x00-\x7F]*$/.test(chunk)));
});

test('memory usage fallback enforces the daily free limit', async () => {
    const userId = `test-${Date.now()}`;
    for (let count = 1; count <= 5; count += 1) {
        const result = await checkUsageLimit(userId);
        assert.equal(result.allowed, true);
    }
    const blocked = await checkUsageLimit(userId);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
});

test('mode persistence and Premium day validation work', async () => {
    const userId = `mode-${Date.now()}`;
    await setUserMode(userId, 'ielts');
    assert.equal(await getUserMode(userId), 'ielts');
    await assert.rejects(() => makeUserPremium(userId, 0), /between 1 and 3650/);
    const expiry = await makeUserPremium(userId, 30);
    assert.match(expiry, /^\d{4}-\d{2}-\d{2}$/);
});

test('beginner course has 12 ordered lessons with practice content', () => {
    assert.equal(BEGINNER_COURSE.length, 12);
    assert.deepEqual(BEGINNER_COURSE.map((lesson) => lesson.id), Array.from({ length: 12 }, (_, index) => index + 1));
    assert.ok(BEGINNER_COURSE.every((lesson) => lesson.objective && lesson.practice && lesson.modelAnswer));
    assert.equal(getLesson(1).title, 'Greetings and Introductions');
});

test('course progress starts, advances, and resets in memory fallback', async () => {
    const userId = `course-${Date.now()}`;
    const started = await startCourse(userId);
    assert.equal(started.active, true);
    assert.equal(started.currentLesson, 1);
    const advanced = await completeCourseLesson(userId, 1, 8);
    assert.deepEqual(advanced.completedLessons, [1]);
    assert.equal(advanced.currentLesson, 2);
    assert.equal(advanced.lastScore, 8);
    const reset = await resetCourse(userId);
    assert.equal(reset.active, false);
    assert.deepEqual(reset.completedLessons, []);
    assert.equal((await getCourseProgress(userId)).currentLesson, 1);
});
