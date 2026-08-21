const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { config } = require('../config');
const { normalizeClassCode, classroomCode, studentSummary, classroomSummary } = require('../classroom/classroom');

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
const memoryClassrooms = new Map();

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
        teacherSession: null,
        homework: [],
        reviewQueue: [],
        lessonHistory: [],
        lessonMastery: {},
        learnerProfile: null,
        adaptiveRecommendation: null,
        diagnosticState: null,
        projectState: null,
        retentionStats: {},
        navigationSection: 'main',
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

function defaultKidsProgress() {
    return {
        active: false,
        ageBand: '6-9',
        stageId: 'discovery',
        lessonNumber: 1,
        completedLessons: [],
        lessonMastery: {},
        teacherSession: null,
        reviewQueue: [],
        practiceAttempts: 0,
        speakingAttempts: 0,
        points: 0,
        streak: 0,
        lastPracticeDate: null,
        lastScore: null,
        learnerProfile: null,
        guardianSummaryEnabled: true,
        safetyFlags: [],
        navigationSection: 'main',
        startedAt: null,
        updatedAt: null
    };
}

async function getKidsProgress(userId) {
    const userKey = String(userId);
    if (firebaseEnabled) {
        const snapshot = await db.collection('kids_progress').doc(userKey).get();
        return { ...defaultKidsProgress(), ...(snapshot.exists ? snapshot.data() : {}) };
    }
    return { ...defaultKidsProgress(), ...(getMemoryUser(userKey).kidsProgress || {}) };
}

async function saveKidsProgress(userId, progress) {
    const userKey = String(userId);
    const data = { ...defaultKidsProgress(), ...progress, updatedAt: new Date().toISOString() };
    if (firebaseEnabled) {
        await db.collection('kids_progress').doc(userKey).set(data, { merge: true });
    } else {
        memoryUsers.set(userKey, { ...getMemoryUser(userKey), kidsProgress: data });
    }
    return data;
}

async function startKids(userId, ageBand = '6-9') {
    const existing = await getKidsProgress(userId);
    return saveKidsProgress(userId, { ...existing, active: true, ageBand: String(ageBand || existing.ageBand || '6-9'), startedAt: existing.startedAt || new Date().toISOString() });
}

async function resetKids(userId) {
    return saveKidsProgress(userId, { ...defaultKidsProgress(), updatedAt: new Date().toISOString() });
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
        teacherSession: null,
        homework: [],
        lessonHistory: [],
        lessonMastery: {},
        learnerProfile: null,
        adaptiveRecommendation: null,
        diagnosticState: null,
        projectState: null,
        retentionStats: {},
        navigationSection: 'main',
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

function defaultClassroom(teacherId, title, code) {
    return {
        id: `class_${code}`,
        code,
        title: String(title || 'English Classroom').trim().slice(0, 80),
        teacherId: String(teacherId),
        students: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

async function createClassroom(teacherId, title) {
    let code = classroomCode();
    if (firebaseEnabled) {
        const collection = db.collection('classrooms');
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const existing = await collection.where('code', '==', code).limit(1).get();
            if (existing.empty) break;
            code = classroomCode(Date.now() + attempt);
        }
        const ref = collection.doc();
        const data = { ...defaultClassroom(teacherId, title, code), id: ref.id };
        await ref.set(data);
        return data;
    }
    while ([...memoryClassrooms.values()].some((classroom) => classroom.code === code)) code = classroomCode(Date.now());
    const data = defaultClassroom(teacherId, title, code);
    memoryClassrooms.set(data.id, data);
    return data;
}

async function getClassroomByCode(value) {
    const code = normalizeClassCode(value);
    if (!code) return null;
    if (firebaseEnabled) {
        const snapshot = await db.collection('classrooms').where('code', '==', code).limit(1).get();
        return snapshot.empty ? null : snapshot.docs[0].data();
    }
    return [...memoryClassrooms.values()].find((classroom) => classroom.code === code) || null;
}

async function joinClassroom(userId, value) {
    const classroom = await getClassroomByCode(value);
    if (!classroom) throw new Error('CLASSROOM_NOT_FOUND');
    const userKey = String(userId);
    if (userKey === String(classroom.teacherId)) return classroom;
    if (firebaseEnabled) {
        const ref = db.collection('classrooms').doc(classroom.id);
        const updated = await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(ref);
            if (!snapshot.exists) throw new Error('CLASSROOM_NOT_FOUND');
            const data = snapshot.data();
            const students = [...new Set([...(data.students || []), userKey])];
            const next = { ...data, students, updatedAt: new Date().toISOString() };
            transaction.set(ref, next, { merge: true });
            return next;
        });
        return updated;
    }
    const next = { ...classroom, students: [...new Set([...(classroom.students || []), userKey])], updatedAt: new Date().toISOString() };
    memoryClassrooms.set(classroom.id, next);
    return next;
}

async function getTeacherClassrooms(teacherId) {
    const teacherKey = String(teacherId);
    if (firebaseEnabled) {
        const snapshot = await db.collection('classrooms').where('teacherId', '==', teacherKey).get();
        return snapshot.docs.map((doc) => doc.data());
    }
    return [...memoryClassrooms.values()].filter((classroom) => String(classroom.teacherId) === teacherKey);
}

async function getUserClassrooms(userId) {
    const userKey = String(userId);
    if (firebaseEnabled) {
        const snapshot = await db.collection('classrooms').where('students', 'array-contains', userKey).get();
        return snapshot.docs.map((doc) => doc.data());
    }
    return [...memoryClassrooms.values()].filter((classroom) => (classroom.students || []).includes(userKey));
}

async function getClassroomDashboard(classroom) {
    const studentIds = classroom?.students || [];
    const progress = await Promise.all(studentIds.map(async (studentId) => studentSummary(await getAcademyProgress(studentId), studentId)));
    return classroomSummary(classroom, progress);
}

async function exportUserData(userId) {
    const userKey = String(userId);
    if (firebaseEnabled) {
        const [user, courseProgress, academyProgress, kidsProgress] = await Promise.all([
            db.collection('users').doc(userKey).get(),
            db.collection('course_progress').doc(userKey).get(),
            db.collection('academy_progress').doc(userKey).get(),
            db.collection('kids_progress').doc(userKey).get()
        ]);
        return {
            user: user.exists ? user.data() : {},
            courseProgress: courseProgress.exists ? courseProgress.data() : defaultCourseProgress(),
            academyProgress: academyProgress.exists ? academyProgress.data() : defaultAcademyProgress(),
            kidsProgress: kidsProgress.exists ? kidsProgress.data() : defaultKidsProgress()
        };
    }
    const memory = getMemoryUser(userKey);
    return {
        user: memory,
        courseProgress: memory.courseProgress || defaultCourseProgress(),
        academyProgress: memory.academyProgress || defaultAcademyProgress(),
        kidsProgress: memory.kidsProgress || defaultKidsProgress()
    };
}

async function deleteUserData(userId) {
    const userKey = String(userId);
    if (firebaseEnabled) {
        await Promise.all([
            db.collection('users').doc(userKey).delete(),
            db.collection('course_progress').doc(userKey).delete(),
            db.collection('academy_progress').doc(userKey).delete(),
            db.collection('kids_progress').doc(userKey).delete()
        ]);
        const owned = await db.collection('classrooms').where('teacherId', '==', userKey).get();
        const joined = await db.collection('classrooms').where('students', 'array-contains', userKey).get();
        const batch = db.batch();
        owned.docs.forEach((doc) => batch.delete(doc.ref));
        joined.docs.forEach((doc) => {
            if (!owned.docs.some((ownedDoc) => ownedDoc.id === doc.id)) {
                const students = (doc.data().students || []).filter((studentId) => String(studentId) !== userKey);
                batch.update(doc.ref, { students, updatedAt: new Date().toISOString() });
            }
        });
        await batch.commit();
    }
    memoryUsers.delete(userKey);
    for (const key of memoryDailyUsage.keys()) {
        if (key.startsWith(`${userKey}_`)) memoryDailyUsage.delete(key);
    }
    for (const [classroomId, classroom] of memoryClassrooms.entries()) {
        if (String(classroom.teacherId) === userKey) memoryClassrooms.delete(classroomId);
        else if ((classroom.students || []).includes(userKey)) memoryClassrooms.set(classroomId, { ...classroom, students: classroom.students.filter((studentId) => String(studentId) !== userKey) });
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
    getKidsProgress,
    saveKidsProgress,
    startKids,
    resetKids,
    startCourse,
    completeCourseLesson,
    resetCourse,
    getAcademyProgress,
    saveAcademyProgress,
    startAcademy,
    resetAcademy,
    isPremiumUser,
    createClassroom,
    getClassroomByCode,
    joinClassroom,
    getTeacherClassrooms,
    getUserClassrooms,
    getClassroomDashboard,
    exportUserData,
    deleteUserData,
    isFirebaseEnabled,
    ADMIN_ID
};
