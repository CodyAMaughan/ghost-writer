
export async function fetchAI(provider, apiKey, prompt, systemPrompt) {
    const fullPrompt = `${systemPrompt}\n\nTask: ${prompt}\n\nProvide 3 distinct variations of this persona answering the prompt. Return ONLY a valid JSON array of strings: ["ans1", "ans2", "ans3"]. Ensure all internal quotes are escaped. Do not use markdown code blocks.`;

    try {
        if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{ text: fullPrompt }]
                    }]
                })
            });

            if (!response.ok) {
                if (response.status === 429) throw new Error("Gemini Quota Exceeded");
                throw new Error(`Gemini Error: ${response.statusText}`);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            return parseResponse(text);

        } else if (provider === 'official-server') {
            // Netlify Proxy Call
            const response = await fetch('/.netlify/functions/proxy-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    systemPrompt: systemPrompt
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server Error: ${response.statusText}`);
            }

            const data = await response.json();
            return parseResponse(data.result);

        } else if (provider === 'openai') {
            const url = 'https://api.openai.com/v1/chat/completions';
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-5-mini",
                    reasoning_effort: "minimal",
                    max_completion_tokens: 500, // Includes reasoning + output
                    messages: [
                        { role: "system", content: "You are a creative writing assistant." },
                        { role: "user", content: fullPrompt }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("OpenAI Error Details:", errorData);
                if (response.status === 429) throw new Error("OpenAI Quota Exceeded");
                const errorMsg = errorData.error?.message || response.statusText;
                throw new Error(`OpenAI Error: ${errorMsg}`);
            }

            const data = await response.json();
            const text = data.choices[0].message.content;
            return parseResponse(text);

        } else if (provider === 'anthropic') {
            const url = 'https://api.anthropic.com/v1/messages';
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true' // Attempt to bypass SDK-like check?
                },
                body: JSON.stringify({
                    model: "claude-3-5-haiku-20241022", // As requested (closest match to 4-5)
                    max_tokens: 1024,
                    system: "You are a creative writing assistant.",
                    messages: [
                        { role: "user", content: fullPrompt }
                    ]
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error("Anthropic Error Data:", errData);
                if (response.status === 429) throw new Error("Anthropic Quota Exceeded");
                throw new Error(`Anthropic Error: ${response.statusText} - ${errData.error?.message || ''}`);
            }

            const data = await response.json();
            const text = data.content[0].text;
            return parseResponse(text);
        }
    } catch (err) {
        console.error("AI Fetch Error:", err);
        if (err.message.includes("Quota")) return ["Error: Quota Exceeded", "Check your API credits", "Try another provider"];
        return ["AI Error: Could not generate.", "AI Error: Try again.", "AI Error: Systems failing."];
    }
}

function parseResponse(text) {
    // Clean up markdown if present
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
        const list = JSON.parse(cleanText);
        if (Array.isArray(list)) return list.slice(0, 3);
        return [cleanText, "Error parsing AI", "Try manual entry"];
    } catch (e) {
        console.error("JSON Parse Error", e);
        // Attempt fallback split
        return [cleanText, "JSON Parse Error", "Manual Only"];
    }
}
