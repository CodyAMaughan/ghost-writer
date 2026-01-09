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

        // 2. Abuse Check: System Prompt Length (~500 chars)
        if (systemPrompt && systemPrompt.length > 500) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "System prompt too long (max 100 chars)." })
            };
        }

        // 3. Construct Safe Call (Using Gemini Flash for reliability)
        const DEFAULT_SYSTEM_PROMPT = `You are a creative ghost writer for a party game. 
        Your task: Write 3 short, funny, distinct variations of an answer for the given prompt as if you were a human player trying to blend in.
        Return ONLY a valid JSON array of 3 strings: ["ans1", "ans2", "ans3"].
        CRITICAL: Ensure all internal quotes within the strings are escaped with backslash (e.g. "He said \\"Hello\\"").
        Keep answers short (under 15 words) and casual.
        Do not use markdown code blocks.`;

        const finalSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "Server Configuration Error: Missing API Key" })
            };
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

        // Append critical formatting instructions (same as client-side)
        const fullPrompt = `${finalSystemPrompt}\n\nTask: ${prompt}\n\nProvide 3 distinct variations of this persona answering the prompt. Return ONLY a valid JSON array of strings: ["ans1", "ans2", "ans3"]. CRITICAL: You must escape all internal quotes with backslashes. Do not use markdown code blocks.`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ text: fullPrompt }]
                }],
                generationConfig: {
                    maxOutputTokens: 1000
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
