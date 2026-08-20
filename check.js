require('dotenv').config();

async function checkModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY is missing. Copy .env.example to .env and add your key.');
        process.exitCode = 1;
        return;
    }

    try {
        console.log('🔍 Checking Gemini models available to this API key...');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || `HTTP ${response.status}`);
        }
        const models = (data.models || []).filter((model) => (model.supportedGenerationMethods || []).includes('generateContent'));
        if (!models.length) {
            console.log('No generateContent model is available for this API key.');
            return;
        }
        console.log('\nAvailable generateContent models:\n');
        for (const model of models) console.log(`- ${model.name.replace(/^models\//, '')}`);
    } catch (error) {
        console.error('❌ Could not fetch Gemini models:', error.message);
        process.exitCode = 1;
    }
}

checkModels();
