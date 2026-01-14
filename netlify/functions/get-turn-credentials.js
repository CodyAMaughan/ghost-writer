// eslint-disable-next-line no-unused-vars
export default async (request, context) => {
    // Only allow GET requests
    if (request.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const METERED_SECRET_KEY = process.env.METERED_SECRET_KEY;

    if (!METERED_SECRET_KEY) {
        console.error("Missing METERED_SECRET_KEY");
        return new Response("Server Configuration Error", { status: 500 });
    }

    try {
        const METERED_DOMAIN = process.env.METERED_DOMAIN || "giggl.metered.live"; // Default or user provided
        const apiKey = METERED_SECRET_KEY;

        // We use the "Easy" endpoint which returns the full ICE server array
        // Docs: https://www.metered.ca/docs/turn-rest-api/get-credentials
        const response = await fetch(`https://${METERED_DOMAIN}/api/v1/turn/credentials?secretKey=${apiKey}`, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("Metered API Error:", text);
            return new Response("Failed to generate credentials", { status: 502 });
        }

        const iceServers = await response.json();

        // 2. Return the ICE servers to the frontend
        return new Response(JSON.stringify({ iceServers }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Gateway Error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
};
