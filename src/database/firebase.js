const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("../../firebase-key.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// 🛑 သင့်ရဲ့ Telegram ID ကို အောက်ပါနေရာတွင် ပြောင်းထည့်ပါ။ (ဂဏန်းချည်းပဲ ဖြစ်ရပါမည်)
// ID မသိသေးရင် အခုလောလောဆယ် ဒီအတိုင်းထားခဲ့ပါ။ Bot ကနေ ပြန်ကြည့်လို့ရအောင် အောက်မှာ လုပ်ပေးထားပါတယ်။
const ADMIN_ID = 2035091217; 

// User တစ်ယောက်ကို Premium/Admin ဟုတ်မဟုတ်နှင့် ၅ ခါ ပြည့်/မပြည့် စစ်ဆေးမည့် Function
async function checkUsageLimit(userId) {
    // ၁။ Admin ဟုတ်မဟုတ် အရင်စစ်မည် (Admin ဆိုလျှင် Limit မရှိပါ)
    if (userId === ADMIN_ID) {
        return { allowed: true, remaining: "Unlimited (Admin)" };
    }

    // ၂။ Premium User ဟုတ်မဟုတ် စစ်ဆေးမည်
    const userDoc = await db.collection('users').doc(userId.toString()).get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.isPremium) {
            const expiryDate = new Date(userData.premiumExpiry);
            const now = new Date();
            
            // Premium သက်တမ်း မကုန်သေးလျှင် (Limit မရှိပါ)
            if (expiryDate > now) {
                return { allowed: true, remaining: "Unlimited (Premium)" };
            } else {
                // သက်တမ်းကုန်သွားပါက Premium ကို ပိတ်ပစ်မည် (false လုပ်မည်)
                await db.collection('users').doc(userId.toString()).update({ isPremium: false });
            }
        }
    }

    // ၃။ Free User (သို့) Premium သက်တမ်းကုန်သွားသူများအတွက် နေ့စဉ် ၅ ခါ စစ်ဆေးခြင်း
    const today = new Date().toISOString().split('T')[0];
    const docId = `${userId}_${today}`;
    const limitRef = db.collection('user_daily_usage').doc(docId);

    try {
        const doc = await limitRef.get();
        if (!doc.exists) {
            await limitRef.set({ count: 1, date: today });
            return { allowed: true, remaining: 4 }; 
        } else {
            let currentCount = doc.data().count;
            if (currentCount >= 5) {
                return { allowed: false, remaining: 0 };
            } else {
                await limitRef.update({ count: currentCount + 1 });
                return { allowed: true, remaining: 5 - (currentCount + 1) };
            }
        }
    } catch (error) {
        console.error("Firebase DB Error:", error);
        return { allowed: true, remaining: "unknown" }; 
    }
}

// Admin မှ User အား Premium သက်တမ်း ထည့်ပေးမည့် Function
async function makeUserPremium(userId, days = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days); // ယနေ့မှစ၍ ရက်ပေါင်းထည့်ခြင်း
    
    await db.collection('users').doc(userId.toString()).set({
        isPremium: true,
        premiumExpiry: expiryDate.toISOString()
    }, { merge: true }); // ရှိပြီးသား Data မပျက်အောင် merge သုံးခြင်း
    
    return expiryDate.toISOString().split('T')[0]; // ကုန်ဆုံးမည့်ရက်ကို ပြန်ပို့မည်
}

// အခြားဖိုင်များမှ လှမ်းသုံးနိုင်ရန် Export ထုတ်ခြင်း
module.exports = { checkUsageLimit, makeUserPremium, ADMIN_ID };