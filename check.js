require('dotenv').config();

async function checkModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    try {
        console.log("🔍 Checking available Gemini models...");
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.models) {
            console.log("\n✅ သင့် API Key ဖြင့် အသုံးပြုနိုင်သော Model များ:\n");
            data.models.forEach(model => {
                // Text တွေထုတ်ပေးနိုင်တဲ့ (generateContent) Model တွေကိုပဲ ရွေးထုတ်ပြပါမယ်
                if (model.supportedGenerationMethods.includes("generateContent")) {
                    const modelName = model.name.replace('models/', '');
                    console.log(`👉 ${modelName}`);
                }
            });
        } else {
            console.log("❌ Error fetching models:", data);
        }
    } catch (error) {
        console.error("Connection Error:", error);
    }
}

checkModels();