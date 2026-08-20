const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { config } = require('../config');

function loadServiceAccount() {
    if (config.FIREBASE_SERVICE_ACCOUNT_JSON) {
        return JSON.parse(config.FIREBASE_SERVICE_ACCOUNT_JSON);
    }
    if (config.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        return JSON.parse(Buffer.from(config.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
    }

    const configuredPath = config.FIREBASE_SERVICE_ACCOUNT_FILE;
    const defaultPath = path.resolve(__dirname, '../../firebase-key.json');
    const filePath = configuredPath ? path.resolve(configuredPath) : defaultPath;
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return null;
}

let db = null;
let firebaseEnabled = false;
const memoryUsers = new Map();
const memoryDailyUsage = new Map();

try {
    const serviceAccount = loadServiceAccount();
    if (serviceAccount) {
        if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
        db = getFirestore();
        firebaseEnabled = true;
        console.log('✅ Firebase Firestore is enabled.');
    } else {
        console.warn('⚠️ Firebase credentials were not found. Using in-memory usage storage for this process.');
    }
} catch (error) {
    console.error('⚠️ Firebase initialization failed. Using in-memory usage storage:', error.message);
}

const ADMIN_ID = config.ADMIN_ID;
const DAILY_FREE_LIMIT = config.DAILY_FREE_LIMIT;

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

function getMemoryUser(userId) {
    return memoryUsers.get(String(userId)) || {};
}

async function checkUsageLimit(userId) {
    if (Number(userId) === ADMIN_ID) {
        return { allowed: true, remaining: 'Unlimited (Admin)' };
    }

    const userKey = String(userId);
    const userData = firebaseEnabled
        ? (await db.collection('users').doc(userKey).get()).data() || {}
        : getMemoryUser(userKey);

    if (userData.isPremium && userData.premiumExpiry && new Date(userData.premiumExpiry) > new Date()) {
        return { allowed: true, remaining: 'Unlimited (Premium)' };
    }

    if (userData.isPremium && (!userData.premiumExpiry || new Date(userData.premiumExpiry) <= new Date())) {
        if (firebaseEnabled) {
            await db.collection('users').doc(userKey).set({ isPremium: false }, { merge: true });
        } else {
            memoryUsers.set(userKey, { ...userData, isPremium: false });
        }
    }

    const usageKey = `${userKey}_${todayKey()}`;
    if (!firebaseEnabled) {
        const currentCount = memoryDailyUsage.get(usageKey) || 0;
        if (currentCount >= DAILY_FREE_LIMIT) return { allowed: false, remaining: 0 };
        const nextCount = currentCount + 1;
        memoryDailyUsage.set(usageKey, nextCount);
        return { allowed: true, remaining: DAILY_FREE_LIMIT - nextCount };
    }

    const usageRef = db.collection('user_daily_usage').doc(usageKey);
    return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(usageRef);
        const currentCount = snapshot.exists ? Number(snapshot.data().count || 0) : 0;
        if (currentCount >= DAILY_FREE_LIMIT) return { allowed: false, remaining: 0 };
        const nextCount = currentCount + 1;
        transaction.set(usageRef, { count: nextCount, date: todayKey(), userId: userKey }, { merge: true });
        return { allowed: true, remaining: DAILY_FREE_LIMIT - nextCount };
    });
}

async function makeUserPremium(userId, days = 30) {
    const parsedDays = Number(days);
    if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 3650) {
        throw new Error('Premium days must be an integer between 1 and 3650.');
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parsedDays);
    const userKey = String(userId);
    const data = { isPremium: true, premiumExpiry: expiryDate.toISOString() };

    if (firebaseEnabled) {
        await db.collection('users').doc(userKey).set(data, { merge: true });
    } else {
        memoryUsers.set(userKey, { ...getMemoryUser(userKey), ...data });
    }
    return expiryDate.toISOString().slice(0, 10);
}

async function getUserMode(userId) {
    const userKey = String(userId);
    if (firebaseEnabled) {
        const snapshot = await db.collection('users').doc(userKey).get();
        return snapshot.exists && snapshot.data().mode ? snapshot.data().mode : 'default';
    }
    return getMemoryUser(userKey).mode || 'default';
}

async function setUserMode(userId, mode) {
    const userKey = String(userId);
    if (firebaseEnabled) {
        await db.collection('users').doc(userKey).set({ mode }, { merge: true });
    } else {
        memoryUsers.set(userKey, { ...getMemoryUser(userKey), mode });
    }
}

function isFirebaseEnabled() {
    return firebaseEnabled;
}

function defaultCourseProgress() {
    return {
        active: false,
        currentLesson: 1,
        completedLessons: [],
        practiceAttempts: 0,
        speakingAttempts: 0,
        lastScore: null,
        startedAt: null,
        updatedAt: null
    };
}

async function getCourseProgress(userId) {
    const userKey = String(userId);
    if (firebaseEnabled) {
        const snapshot = await db.collection('course_progress').doc(userKey).get();
        return { ...defaultCourseProgress(), ...(snapshot.exists ? snapshot.data() : {}) };
    }
    return { ...defaultCourseProgress(), ...(getMemoryUser(userKey).courseProgress || {}) };
}

async function saveCourseProgress(userId, progress) {
    const userKey = String(userId);
    const data = {
        ...defaultCourseProgress(),
        ...progress,
        updatedAt: new Date().toISOString()
    };
    if (firebaseEnabled) {
        await db.collection('course_progress').doc(userKey).set(data, { merge: true });
    } else {
        memoryUsers.set(userKey, { ...getMemoryUser(userKey), courseProgress: data });
    }
    return data;
}

async function startCourse(userId) {
    const existing = await getCourseProgress(userId);
    return saveCourseProgress(userId, {
        ...existing,
        active: true,
        currentLesson: existing.currentLesson || 1,
        startedAt: existing.startedAt || new Date().toISOString()
    });
}

async function completeCourseLesson(userId, lessonId, score = null) {
    const progress = await getCourseProgress(userId);
    const completedLessons = [...new Set([...(progress.completedLessons || []), Number(lessonId)])].sort((a, b) => a - b);
    const nextLesson = Math.min(Math.max(progress.currentLesson, Number(lessonId) + 1), 12);
    return saveCourseProgress(userId, {
        ...progress,
        active: true,
        currentLesson: nextLesson,
        completedLessons,
        practiceAttempts: Number(progress.practiceAttempts || 0) + 1,
        lastScore: score
    });
}

async function resetCourse(userId) {
    return saveCourseProgress(userId, { ...defaultCourseProgress(), updatedAt: new Date().toISOString() });
}

function defaultAcademyProgress() {
    return {
        active: false,
        placementCompleted: false,
        levelId: 'starter',
        trackId: 'general',
        trackHistory: [],
        lessonNumber: 1,
        completedLessons: [],
        reviewQueue: [],
        practiceAttempts: 0,
        speakingAttempts: 0,
        assessmentCount: 0,
        points: 0,
        streak: 0,
        lastPracticeDate: null,
        lastScore: null,
        placement: null,
        lastAssessment: null,
        quizAnswered: 0,
        quizCorrect: 0,
        quizStreak: 0,
        quizHistory: [],
        lastQuiz: null,
        coachQuestions: 0,
        dailyPlan: null,
        dailyPlanDate: null,
        dailyPlanCompleted: [],
        wordBank: [],
        vocabularyReviewCount: 0,
        lastVocabularyReview: null,
        pronunciationAttempts: 0,
        lastPronunciation: null,
        grammarScore: null,
        vocabularyScore: null,
        speakingScore: null,
        fluencyScore: null,
        pronunciationScore: null,
        consistencyScore: null,
        startedAt: null,
        updatedAt: null
    };
}

async function getAcademyProgress(userId) {
    const userKey = String(userId);
    if (firebaseEnabled) {
        const snapshot = await db.collection('academy_progress').doc(userKey).get();
        return { ...defaultAcademyProgress(), ...(snapshot.exists ? snapshot.data() : {}) };
    }
    return { ...defaultAcademyProgress(), ...(getMemoryUser(userKey).academyProgress || {}) };
}

async function saveAcademyProgress(userId, progress) {
    const userKey = String(userId);
    const data = { ...defaultAcademyProgress(), ...progress, updatedAt: new Date().toISOString() };
    if (firebaseEnabled) {
        await db.collection('academy_progress').doc(userKey).set(data, { merge: true });
    } else {
        memoryUsers.set(userKey, { ...getMemoryUser(userKey), academyProgress: data });
    }
    return data;
}

async function startAcademy(userId) {
    const existing = await getAcademyProgress(userId);
    return saveAcademyProgress(userId, {
        ...existing,
        active: true,
        startedAt: existing.startedAt || new Date().toISOString()
    });
}

async function resetAcademy(userId) {
    return saveAcademyProgress(userId, defaultAcademyProgress());
}

async function isPremiumUser(userId) {
    if (Number(userId) === ADMIN_ID) return true;
    const userKey = String(userId);
    const userData = firebaseEnabled
        ? (await db.collection('users').doc(userKey).get()).data() || {}
        : getMemoryUser(userKey);
    return Boolean(userData.isPremium && userData.premiumExpiry && new Date(userData.premiumExpiry) > new Date());
}

async function exportUserData(userId) {
    const userKey = String(userId);
    if (firebaseEnabled) {
        const [user, courseProgress, academyProgress] = await Promise.all([
            db.collection('users').doc(userKey).get(),
            db.collection('course_progress').doc(userKey).get(),
            db.collection('academy_progress').doc(userKey).get()
        ]);
        return {
            user: user.exists ? user.data() : {},
            courseProgress: courseProgress.exists ? courseProgress.data() : defaultCourseProgress(),
            academyProgress: academyProgress.exists ? academyProgress.data() : defaultAcademyProgress()
        };
    }
    const memory = getMemoryUser(userKey);
    return {
        user: memory,
        courseProgress: memory.courseProgress || defaultCourseProgress(),
        academyProgress: memory.academyProgress || defaultAcademyProgress()
    };
}

async function deleteUserData(userId) {
    const userKey = String(userId);
    if (firebaseEnabled) {
        await Promise.all([
            db.collection('users').doc(userKey).delete(),
            db.collection('course_progress').doc(userKey).delete(),
            db.collection('academy_progress').doc(userKey).delete()
        ]);
    }
    memoryUsers.delete(userKey);
    for (const key of memoryDailyUsage.keys()) {
        if (key.startsWith(`${userKey}_`)) memoryDailyUsage.delete(key);
    }
    return true;
}

module.exports = {
    checkUsageLimit,
    makeUserPremium,
    getUserMode,
    setUserMode,
    getCourseProgress,
    saveCourseProgress,
    startCourse,
    completeCourseLesson,
    resetCourse,
    getAcademyProgress,
    saveAcademyProgress,
    startAcademy,
    resetAcademy,
    isPremiumUser,
    exportUserData,
    deleteUserData,
    isFirebaseEnabled,
    ADMIN_ID
};
