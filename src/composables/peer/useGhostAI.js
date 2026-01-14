
import { fetchAI } from '../../services/ai';
import { THEMES } from '../../config/themes';

// Shared state for pending request
let pendingResolve = null;

export function useGhostAI() {

    const generateOptions = (settings, prompt, themeId, agentId, customSysPrompt) => {
        let systemPrompt = "";

        if (agentId === 'custom') {
            systemPrompt = (customSysPrompt || "You are a generic helper.") + " Keep it under 15 words.";
        } else {
            const themeObj = THEMES[themeId] || THEMES.viral;
            if (themeObj && themeObj.agents) {
                const agentDef = themeObj.agents.find(a => a.id === agentId);
                if (agentDef) systemPrompt = agentDef.systemPrompt;
            }
        }

        if (!systemPrompt) {
            console.warn("GhostAI: No system prompt found for agent", agentId);
            return Promise.resolve([]);
        }

        return fetchAI(settings.provider, settings.apiKey, prompt, systemPrompt);
    };

    const createGhostRequest = () => {
        return new Promise((resolve) => {
            pendingResolve = resolve;
        });
    };

    const resolveGhostRequest = (options) => {
        console.log("Resolving Ghost Request with options", options);
        if (pendingResolve) {
            pendingResolve(options);
            pendingResolve = null;
        }
    };

    return {
        generateOptions,
        createGhostRequest,
        resolveGhostRequest
    };
}
