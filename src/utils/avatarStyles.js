export const AVATAR_STYLES = {
    cyan: {
        text: 'text-cyan-400',
        border: 'border-cyan-500',
        glow: 'rgba(207, 250, 254, 0.6)',
        bg: 'bg-cyan-900/20',
        outline: 'rgba(15, 23, 42, 0.9)' // Slate-900 (Dark)
    },
    slate: {
        text: 'text-slate-300',
        border: 'border-slate-300',
        glow: 'rgba(241, 245, 249, 0.6)',
        bg: 'bg-slate-800/50',
        outline: 'rgba(15, 23, 42, 0.9)' // Slate-900
    },
    pink: {
        text: 'text-pink-400',
        border: 'border-pink-400',
        glow: 'rgba(252, 231, 243, 0.6)',
        bg: 'bg-pink-900/20',
        outline: 'rgba(15, 23, 42, 0.9)' // Slate-900
    },
    amber: {
        text: 'text-amber-500',
        border: 'border-amber-500',
        glow: 'rgba(254, 243, 199, 0.6)',
        bg: 'bg-amber-900/20',
        outline: 'rgba(15, 23, 42, 0.9)' // Slate-900
    },
    monochrome: {
        text: 'text-slate-900',
        border: 'border-slate-800',
        glow: 'rgba(255, 255, 255, 0.6)',
        bg: 'bg-slate-900/50',
        outline: 'rgba(255, 255, 255, 0.9)' // White
    },
    yellow: {
        text: 'text-yellow-400',
        border: 'border-yellow-400',
        glow: 'rgba(254, 249, 195, 0.6)',
        bg: 'bg-yellow-900/20',
        outline: 'rgba(15, 23, 42, 0.9)' // Slate-900
    },
    red: {
        text: 'text-red-500',
        border: 'border-red-500',
        glow: 'rgba(254, 226, 226, 0.6)',
        bg: 'bg-red-900/20',
        outline: 'rgba(255, 255, 255, 0.9)' // White (Red can go either way, trying white)
    },
    purple: {
        text: 'text-purple-500',
        border: 'border-purple-500',
        glow: 'rgba(243, 232, 255, 0.6)',
        bg: 'bg-purple-900/20',
        outline: 'rgba(255, 255, 255, 0.9)' // White
    },
    green: {
        text: 'text-green-500',
        border: 'border-green-500',
        glow: 'rgba(220, 252, 231, 0.6)',
        bg: 'bg-green-900/20',
        outline: 'rgba(15, 23, 42, 0.9)' // Slate-900
    },
    orange: {
        text: 'text-orange-500',
        border: 'border-orange-500',
        glow: 'rgba(255, 237, 213, 0.6)',
        bg: 'bg-orange-900/20',
        outline: 'rgba(15, 23, 42, 0.9)' // Slate-900
    },
    rust: {
        text: 'text-amber-700',
        border: 'border-amber-700',
        glow: 'rgba(254, 215, 170, 0.6)',
        bg: 'bg-amber-950/20',
        outline: 'rgba(255, 255, 255, 0.9)' // White
    },
    gray: {
        text: 'text-gray-400',
        border: 'border-gray-500',
        glow: 'rgba(243, 244, 246, 0.6)',
        bg: 'bg-gray-800/50',
        outline: 'rgba(15, 23, 42, 0.9)' // Slate-900
    }
};

export const getAvatarStyle = (themeName) => {
    return AVATAR_STYLES[themeName] || AVATAR_STYLES.cyan;
};
