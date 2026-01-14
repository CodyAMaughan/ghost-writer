
/**
 * Logic for retrieving ICE servers (STUN/TURN) for PeerJS.
 * Handles both legacy environment variables and secure backend fetching.
 */
export async function getIceServers() {
    const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' }, // Default Free STUN
    ];

    // 1. JSON Config (Advanced - Legacy)
    if (import.meta.env.VITE_ICE_SERVERS) {
        try {
            const custom = JSON.parse(import.meta.env.VITE_ICE_SERVERS);
            iceServers.push(...custom);
        } catch (e) {
            console.error("Failed to parse VITE_ICE_SERVERS", e);
        }
    }

    // 2. Simple TURN Config (Easy Mode - Legacy)
    if (import.meta.env.VITE_TURN_URL && import.meta.env.VITE_TURN_USERNAME) {
        iceServers.push({
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_PASSWORD
        });
    }

    // 3. Secure Backend (New Standard)
    try {
        // 3s timeout to prevent hanging if the function is cold/down
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch('/.netlify/functions/get-turn-credentials', {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.iceServers)) {
                iceServers.push(...data.iceServers);
            }
        }
    } catch (e) {
        // Non-blocking warning
        console.warn("Failed to fetch secure TURN credentials. Relying on STUN/Legacy config.", e);
    }

    return iceServers;
}
