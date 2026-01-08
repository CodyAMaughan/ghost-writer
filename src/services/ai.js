
export async function fetchAI(provider, apiKey, prompt, systemPrompt) {
    const fullPrompt = `${systemPrompt}\n\nTask: ${prompt}\n\nProvide 3 distinct variations of this persona answering the prompt. Return ONLY a valid JSON array of strings: ["ans1", "ans2", "ans3"]. Do not use markdown code blocks.`;

    try {
        if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-preview-02-05:generateContent?key=${apiKey}`;
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

            if (!response.ok) throw new Error(`Gemini Error: ${response.statusText}`);

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            return parseResponse(text);

        } else if (provider === 'openai') {
            const url = 'https://api.openai.com/v1/chat/completions';
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini", // Using a likely available model
                    messages: [
                        { role: "system", content: "You are a creative writing assistant." },
                        { role: "user", content: fullPrompt }
                    ],
                    temperature: 0.9
                })
            });

            if (!response.ok) throw new Error(`OpenAI Error: ${response.statusText}`);

            const data = await response.json();
            const text = data.choices[0].message.content;
            return parseResponse(text);
        }
    } catch (err) {
        console.error("AI Fetch Error:", err);
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
