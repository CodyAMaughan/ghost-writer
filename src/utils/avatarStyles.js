export const AVATAR_STYLES = {
    cyan: {
        text: 'text-cyan-400',
        border: 'border-cyan-500',
        glow: 'rgba(207, 250, 254, 0.6)',  // cyan-100/white w/ slight tint
        bg: 'bg-cyan-900/20'
    },
    slate: {
        text: 'text-slate-300',
        border: 'border-slate-300',
        glow: 'rgba(241, 245, 249, 0.6)',  // slate-100
        bg: 'bg-slate-800/50'
    },
    pink: {
        text: 'text-pink-400',
        border: 'border-pink-400',
        glow: 'rgba(252, 231, 243, 0.6)',  // pink-100
        bg: 'bg-pink-900/20'
    },
    amber: {
        text: 'text-amber-500',
        border: 'border-amber-500',
        glow: 'rgba(254, 243, 199, 0.6)',  // amber-100
        bg: 'bg-amber-900/20'
    },
    monochrome: {
        text: 'text-slate-900',
        border: 'border-slate-800',
        glow: 'rgba(255, 255, 255, 0.6)',  // Pure white, subtle
        bg: 'bg-slate-900/50'
    },
    yellow: {
        text: 'text-yellow-400',
        border: 'border-yellow-400',
        glow: 'rgba(254, 249, 195, 0.6)',  // yellow-100
        bg: 'bg-yellow-900/20'
    },
    red: {
        text: 'text-red-500',
        border: 'border-red-500',
        glow: 'rgba(254, 226, 226, 0.6)',  // red-100
        bg: 'bg-red-900/20'
    },
    purple: {
        text: 'text-purple-500',
        border: 'border-purple-500',
        glow: 'rgba(243, 232, 255, 0.6)',  // purple-100
        bg: 'bg-purple-900/20'
    },
    green: {
        text: 'text-green-500',
        border: 'border-green-500',
        glow: 'rgba(220, 252, 231, 0.6)',  // green-100
        bg: 'bg-green-900/20'
    },
    orange: {
        text: 'text-orange-500',
        border: 'border-orange-500',
        glow: 'rgba(255, 237, 213, 0.6)',  // orange-100
        bg: 'bg-orange-900/20'
    },
    rust: {
        text: 'text-amber-700',
        border: 'border-amber-700',
        glow: 'rgba(254, 215, 170, 0.6)',  // orange-200 (light rust)
        bg: 'bg-amber-950/20'
    },
    gray: {
        text: 'text-gray-400',
        border: 'border-gray-500',
        glow: 'rgba(243, 244, 246, 0.6)',  // gray-100
        bg: 'bg-gray-800/50'
    }
};

export const getAvatarStyle = (themeName) => {
    return AVATAR_STYLES[themeName] || AVATAR_STYLES.cyan;
};
