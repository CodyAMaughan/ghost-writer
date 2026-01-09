export const SOUNDS = {
    // UI INTERACTIONS
    CLICK: { src: '/sfx/click.ogg', volume: 0.5, variance: 0.1 },
    HOVER: { src: '/sfx/hover.ogg', volume: 0.15, variance: 0.2 },
    CONFIRM: { src: '/sfx/confirm.ogg', volume: 0.6 },
    ERROR: { src: '/sfx/error.ogg', volume: 0.5 },
    TOGGLE: { src: '/sfx/hover.ogg', volume: 0.4 }, // Reusing hover for toggle

    // GAME LOOP
    START_GAME: { src: '/sfx/start_game.ogg', volume: 0.8 },
    TIMER_TICK: { src: '/sfx/timer_tick.ogg', volume: 0.3 },
    TIMER_URGENT: { src: '/sfx/timer_urgent.ogg', volume: 0.6 },
    TIME_UP: { src: '/sfx/time_up.ogg', volume: 0.8 },

    // PHASES
    SUBMIT: { src: '/sfx/submit.ogg', volume: 0.6 },
    VOTE_CAST: { src: '/sfx/vote.ogg', volume: 0.5, variance: 0.1 },
    VOTES_LOCKED: { src: '/sfx/lock.ogg', volume: 0.7 },

    // REVEAL
    REVEAL_STEP: { src: '/sfx/reveal_step.ogg', volume: 0.6, variance: 0.05 },
    STAMP: { src: '/sfx/stamp.ogg', volume: 1.0 }, // The Bass Thud
    WINNER: { src: '/sfx/winner.ogg', volume: 0.8 },
    LOOSER: { src: '/sfx/looser.ogg', volume: 0.7 },

    // MUSIC
    BGM_LOBBY: { src: '/music/lobby_bg_music.mp3', volume: 0.4, loop: true },

    // Theme Tracks
    BGM_VIRAL: { src: '/music/viral_bg_music.mp3', volume: 0.4, loop: true },
    BGM_ACADEMIA: { src: '/music/dark_academia_bg_music.mp3', volume: 0.4, loop: true },
    BGM_CLASSIC: { src: '/music/classic_party_bg_music.mp3', volume: 0.4, loop: true },
    BGM_CYBERPUNK: { src: '/music/cyberpunk_bg_music.mp3', volume: 0.4, loop: true },
};
