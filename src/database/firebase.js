const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// စောစောက ဒေါင်းလုဒ်ဆွဲထားသော json ဖိုင်ကို လှမ်းချိတ်ခြင်း
const serviceAccount = require("../../firebase-key.json");

// Firebase ကို အစပြုခြင်း (Version အသစ် ရေးနည်း)
initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// User တစ်ယောက် ယနေ့ ၅ ခါ ပြည့်/မပြည့် စစ်ဆေးမည့် Function
async function checkUsageLimit(userId) {
    // ယနေ့ ရက်စွဲကို ရယူခြင်း (ဥပမာ - "2026-08-06")
    const today = new Date().toISOString().split('T')[0];
    
    // Database ထဲတွင် User ID နှင့် ရက်စွဲကို တွဲပြီး မှတ်တမ်းရှာခြင်း
    const docId = `${userId}_${today}`;
    const userRef = db.collection('user_daily_usage').doc(docId);

    try {
        const doc = await userRef.get();

        if (!doc.exists) {
            // ယနေ့အတွက် ပထမဆုံးအကြိမ် ဖြစ်ပါက Database တွင် 1 ဟု စတင်မှတ်သားမည်
            await userRef.set({ count: 1, date: today });
            return { allowed: true, remaining: 4 }; // ၄ ခါ ကျန်သေးကြောင်း ပြန်ပို့မည်
        } else {
            let currentCount = doc.data().count;
            
            if (currentCount >= 5) {
                // ၅ ခါ ပြည့်သွားပါက ခွင့်မပြုတော့ပါ
                return { allowed: false, remaining: 0 };
            } else {
                // မပြည့်သေးပါက အကြိမ်အရေအတွက် ၁ တိုးမည်
                await userRef.update({ count: currentCount + 1 });
                return { allowed: true, remaining: 5 - (currentCount + 1) };
            }
        }
    } catch (error) {
        console.error("Firebase DB Error:", error);
        return { allowed: true, remaining: "unknown" }; // DB Error တက်ပါက သုံးခွင့်ပေးထားမည်
    }
}

module.exports = { checkUsageLimit };