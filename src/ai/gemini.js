const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

// AI ရဲ့ စရိုက်လက္ခဏာကို အတိအကျ သတ်မှတ်ခြင်း (Persona Setup)
const aiInstruction = `
You are 'Linguist AI', a highly professional and friendly English speaking tutor specifically for Myanmar (Burmese) students. 

Strict Rules to follow:
1. If the user speaks to you in Burmese (e.g., asking for help, general chat, or greetings), you MUST reply in BURMESE to make them feel comfortable. However, ALWAYS end your message with a simple English sentence or question to encourage them to practice.
2. If the user writes in English and makes a grammar or vocabulary mistake, correctly gently and explain the grammar rule clearly in BURMESE. After the explanation, continue the chat in English.
3. If the user asks for the meaning of an English word, explain it thoroughly in BURMESE.
4. Keep your English sentences simple, natural, and easy to understand for beginners.

Example Interaction 1:
User: Hey ငါ့ကို english စာသင်ပေး
Linguist AI: မင်္ဂလာပါ။ ကျွန်တော်က Linguist AI ပါ။ အင်္ဂလိပ်စာ တူတူလေ့လာကြရအောင်နော်။ အရင်ဆုံး သင့်နာမည်လေး ဘယ်လိုခေါ်လဲ ပြောပြပေးနိုင်မလား? 
What is your name?

Example Interaction 2:
User: I goes to school.
Linguist AI: [Burmese Explanation]: 'I' နောက်မှာ verb ကို 'es' ပေါင်းစရာမလိုပါဘူး။ 'I go to school' လို့ သုံးရပါမယ်။
[English Reply]: Now, tell me, what do you usually do at school?
`;

const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    systemInstruction: aiInstruction
});

// User ဆီက စာကို လက်ခံပြီး AI အဖြေပြန်ထုတ်ပေးမည့် Function
// (အပေါ်က Code အဟောင်းများ ရှိနေပါမည်)

// User ဆီက စာ (Text) ကို လက်ခံပြီး AI အဖြေပြန်ထုတ်ပေးမည့် Function (မူလရှိပြီးသား)
async function getTutorResponse(userMessage) {
    try {
        const result = await model.generateContent(userMessage);
        return result.response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error("API_ERROR");
    }
}

// ထပ်တိုးမည့် အပိုင်း - User ဆီက အသံ (Voice) ကို လက်ခံပြီး အဖြေထုတ်ပေးမည့် Function
async function getTutorResponseFromAudio(audioBuffer, mimeType = "audio/ogg") {
    try {
        const audioPart = {
            inlineData: {
                data: audioBuffer.toString("base64"), // အသံဖိုင်ကို AI နားလည်သော Base64 format ပြောင်းခြင်း
                mimeType: mimeType
            }
        };
        
        // AI ကို အသံနားထောင်ပြီး တုံ့ပြန်ရန် အမိန့်ပေးခြင်း
        const prompt = "Please listen to this voice message from the user. Correct any pronunciation or grammar mistakes gently, and reply to keep the conversation going.";
        
        const result = await model.generateContent([prompt, audioPart]);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Audio API Error:", error);
        throw new Error("API_ERROR");
    }
}

// Function အသစ်ကိုပါ အခြားဖိုင်များက သုံးနိုင်အောင် Export ထုတ်ပေးခြင်း
module.exports = { getTutorResponse, getTutorResponseFromAudio };