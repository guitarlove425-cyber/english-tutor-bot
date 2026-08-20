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

module.exports = { checkUsageLimit, makeUserPremium, getUserMode, setUserMode, isFirebaseEnabled, ADMIN_ID };
