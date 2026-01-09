exports.handler = async function (event, context) {
    // CORS headers for local dev and production
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTION'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const { prompt, systemPrompt } = JSON.parse(event.body);

        // 1. Abuse Check: Prompt Length (~500 chars)
        if (!prompt || prompt.length > 500) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Prompt too long (max 500 chars)." })
            };
        }

        // 2. Abuse Check: System Prompt Length (~100 chars for custom agents)
        if (systemPrompt && systemPrompt.length > 100) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "System prompt too long (max 100 chars)." })
            };
        }

        // 3. Construct Safe Call (Using Gemini Flash for reliability)
        const DEFAULT_SYSTEM_PROMPT = `You are a creative ghost writer for a party game. 
        Your task: Write 3 short, funny, distinct variations of an answer for the given prompt as if you were a human player trying to blend in.
        Return ONLY a JSON array of 3 strings: ["ans1", "ans2", "ans3"].
        Keep answers short (under 15 words) and casual.`;

        const finalSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "Server Configuration Error: Missing API Key" })
            };
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ text: finalSystemPrompt + "\n\nPrompt: " + prompt }]
                }],
                generationConfig: {
                    maxOutputTokens: 200
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini Error: ${response.status} ${err}`);
        }

        const data = await response.json();
        const resultText = data.candidates[0].content.parts[0].text;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: resultText })
        };

    } catch (e) {
        console.error("Proxy Error", e);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: e.message || "Internal Server Error" })
        };
    }
};
