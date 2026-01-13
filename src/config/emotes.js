export const EMOTE_REGISTRY = {
    // Standard (Free)
    heart: { id: 'heart', char: '❤️', type: 'standard', cost: 0, locked: false },
    laugh: { id: 'laugh', char: '😂', type: 'standard', cost: 0, locked: false },
    fire: { id: 'fire', char: '🔥', type: 'standard', cost: 0, locked: false },
    ghost: { id: 'ghost', char: '👻', type: 'standard', cost: 0, locked: false },
    ai: { id: 'ai', char: '🤖', type: 'standard', cost: 0, locked: false },

    // New Additions
    thumbs_up: { id: 'thumbs_up', char: '👍', type: 'standard', cost: 0, locked: false },
    clap: { id: 'clap', char: '👏', type: 'standard', cost: 0, locked: false },
    cry: { id: 'cry', char: '😭', type: 'standard', cost: 0, locked: false },
    rage: { id: 'rage', char: '😡', type: 'standard', cost: 0, locked: false },
    surprise: { id: 'surprise', char: '😮', type: 'standard', cost: 0, locked: false },
    party: { id: 'party', char: '🎉', type: 'standard', cost: 0, locked: false },
    skull: { id: 'skull', char: '💀', type: 'standard', cost: 0, locked: false },
    alien: { id: 'alien', char: '👽', type: 'standard', cost: 0, locked: false },
    rocket: { id: 'rocket', char: '🚀', type: 'standard', cost: 0, locked: false },

    // Premium (Locked)
    human: { id: 'human', char: '👤', type: 'premium', cost: 100, locked: true },
    custom_gif: { id: 'custom_gif', char: 'GIF', type: 'premium', cost: 200, locked: true },
};

export const getEmote = (id) => EMOTE_REGISTRY[id];
