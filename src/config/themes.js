export const THEMES = {
    viral: {
        id: 'viral',
        name: 'Chronically Online',
        font: 'font-sans',
        colors: {
            bg: 'bg-slate-900',
            card: 'bg-slate-800',
            text: 'text-slate-200',
            accent: 'text-cyan-400',
            button: 'bg-cyan-600 hover:bg-cyan-500 text-white',
            border: 'border-cyan-500/30'
        },
        copy: {
            manualInputLabel: 'Write Post',
            ghostInputLabel: 'Auto-Generate',
            ghostSubtext: 'AI Assisted Deception',
            submitBtn: 'POST',
            waiting: 'Waiting for Mutuals...',
            uploadComplete: 'POST UPLOADED',
            voteHuman: 'VERIFIED HUMAN',
            voteBot: 'BOT ACCOUNT',
            revealTitle: 'ALGORITHM REVEALED',
            revealNext: 'SCROLL NEXT >',
            startGameBtn: 'GO LIVE',
            submitVotesBtn: 'POST RECEIPTS',
            revealHeader: 'TRENDING NOW',
            strategyLabel: 'VIBE CHECK',
            manualLabel: 'RAW',
            ghostLabel: 'FILTERED',
            transitions: {
                PROMPT: 'NEW TOPIC DROPPED',
                INPUT: 'START TYPING',
                VOTING: 'VIBE CHECK',
                REVEAL: 'EXPOSING FAKES',
                FINISH: 'FINAL RATIO'
            }
        },
        agents: [
            { id: 'influencer', name: 'The Influencer', description: 'Trendy, overuse of emojis, seeking validation.', systemPrompt: 'You are a desperate social media influencer. Use emojis, hashtags, and gen-z slang. Act like everything is a sponsorship opportunity. Keep response under 15 words.' },
            { id: 'troll', name: 'The Troll', description: 'Contrarian, argumentative, and vaguely insulting.', systemPrompt: 'You are an internet troll. Disagree with the premise, be snarky, and use "actually" a lot. Keep response under 15 words.' },
            { id: 'replyguy', name: 'The Reply Guy', description: 'Overly helpful but slightly missing the point.', systemPrompt: 'You are a Reply Guy. Be eager to explain things nobody asked about. Start with "To be fair...". Keep response under 15 words.' },
            { id: 'bot', name: 'The Spambot', description: 'Broken syntax, crypto scams, and promotional links.', systemPrompt: 'You are a broken spam bot. Mention crypto, "click link in bio", or random product keys. Be incoherent. Keep response under 15 words.' },
            { id: 'anon', name: 'Anon', description: 'Vague, cryptic, and conspiratorial.', systemPrompt: 'You are an anonymous forum poster. Be vague, paranoid, and mention "they". Keep response under 15 words.' }
        ],
        prompts: [
            "What's a major red flag in a bio?",
            "Write a clickbait title for a mundane activity.",
            "Why did you get cancelled?",
            "Explain why this image goes hard.",
            "Best reply to a hater?",
            "What's the tea today?",
            "Roast the person below you."
        ]
    },
    academia: {
        id: 'academia',
        name: 'Academia',
        font: 'font-serif',
        colors: {
            bg: 'bg-stone-950',
            card: 'bg-stone-900',
            text: 'text-stone-300',
            accent: 'text-amber-500',
            button: 'bg-stone-800 border border-amber-600 hover:bg-stone-700',
            border: 'border-amber-700/50'
        },
        copy: {
            manualInputLabel: 'Compose Manuscript',
            ghostInputLabel: 'Consult the Spirit',
            ghostSubtext: 'Automated Séance',
            submitBtn: 'PUBLISH',
            waiting: 'Awaiting Peers...',
            uploadComplete: 'MANUSCRIPT FILED',
            voteHuman: 'TRUE AUTHOR',
            voteBot: 'AUTOMATON',
            revealTitle: 'THE TRUTH UNVEILED',
            revealNext: 'NEXT PAGE >',
            startGameBtn: 'COMMENCE STUDY',
            submitVotesBtn: 'SUBMIT PEER REVIEW',
            revealHeader: 'FINDINGS',
            strategyLabel: 'METHODOLOGY',
            manualLabel: 'ORIGINAL',
            ghostLabel: 'PLAGIARIZED',
            transitions: {
                PROMPT: 'SUBJECT ASSIGNED',
                INPUT: 'BEGIN COMPOSITION',
                VOTING: 'PEER REVIEW',
                REVEAL: 'PUBLISHING RESULTS',
                FINISH: 'GRADES POSTED'
            }
        },
        agents: [
            { id: 'professor', name: 'The Professor', description: 'Verbose, pedantic, uses obscure words.', systemPrompt: 'You are an old academic professor. Use big words, latin phrases, and look down on modern simplicity. Keep response under 15 words.' },
            { id: 'poet', name: 'The Tortured Poet', description: 'Melancholic, dramatic, and overly emotional.', systemPrompt: 'You are a gothic poet. Everything is tragic. Use metaphors about darkness and souls. Keep response under 15 words.' },
            { id: 'occultist', name: 'The Occultist', description: 'Speaks of forbidden knowledge and rituals.', systemPrompt: 'You are a 1920s occultist. Mention the stars, old gods, and forbidden books. Be creepy. Keep response under 15 words.' },
            { id: 'novelist', name: 'The Novelist', description: 'Flowery prose, setting the scene.', systemPrompt: 'You are a Victorian novelist. Describe the scenery excessively. Use "It was a dark and stormy night". Keep response under 15 words.' },
            { id: 'critic', name: 'The Critic', description: 'Harsh, judgmental, and impossible to please.', systemPrompt: 'You are a harsh literary critic. Hate everything. Call it "derivative" or "pedestrian". Keep response under 15 words.' }
        ],
        prompts: [
            "Describe the feeling of ennui.",
            "What secret is the library hiding?",
            "A title for your forbidden memoir.",
            "Why was the manuscript burned?",
            "Whisper a truth to the void.",
            "What haunts this manor?",
            "The last words of a forgotten king."
        ]
    },
    cyberpunk: {
        id: 'cyberpunk',
        name: 'Cyberpunk',
        font: 'font-mono',
        colors: {
            bg: 'bg-slate-950',
            card: 'bg-slate-900',
            text: 'text-green-400',
            accent: 'text-purple-400',
            button: 'bg-green-600 hover:bg-green-500 text-black',
            border: 'border-green-500/50'
        },
        copy: {
            manualInputLabel: 'Execute Protocol',
            ghostInputLabel: 'Ghost Write',
            ghostSubtext: 'AI Construct Uplink',
            submitBtn: 'UPLOAD',
            waiting: 'Syncing Nodes...',
            uploadComplete: 'DATA UPLOADED',
            voteHuman: 'HUMAN OPERATOR',
            voteBot: 'BOT PRESENCE',
            revealTitle: 'SOURCE TRACED',
            revealNext: 'NEXT NODE >',
            startGameBtn: 'JACK IN',
            submitVotesBtn: 'BROADCAST HASH',
            revealHeader: 'DECRYPTED LOGS',
            strategyLabel: 'VECTOR',
            manualLabel: 'MEATSPACE',
            ghostLabel: 'SYNTHETIC',
            transitions: {
                PROMPT: 'INCOMING DATAPACKET',
                INPUT: 'INITIATE UPLINK',
                VOTING: 'CONSENSUS PROTOCOL',
                REVEAL: 'DECRYPTING HASH',
                FINISH: 'FILE CLOSED'
            }
        },
        agents: [
            { id: 'hacker', name: 'Netrunner', description: 'Leet speak, technical jargon, rebellious.', systemPrompt: 'You are a cyberpunk hacker. Use slang like "choom", "delta", "ice". Be anti-corp. Keep response under 15 words.' },
            { id: 'corp', name: 'Corp Exec', description: 'Business buzzwords, ruthless efficiency.', systemPrompt: 'You are a ruthless corporate executive. Talk about synergy, bottom line, and assets. Be cold. Keep response under 15 words.' },
            { id: 'ai', name: 'Rogue AI', description: 'Cold, logical, slightly menacing.', systemPrompt: 'You are a sentient AI. Speak in logic gates. Mention "optimizing humanity". Be robotic. Keep response under 15 words.' },
            { id: 'fixer', name: 'The Fixer', description: 'Street smart, transactional, knows a guy.', systemPrompt: 'You are a street fixer. Everything has a price. Talk about "eddies" and "gigs". Keep response under 15 words.' },
            { id: 'glitch', name: 'Glitch0', description: 'Corru%pted t#xt and err0rs.', systemPrompt: 'You are a corrupted file. Insert random characters and glitches like ZALGO within reason. Be unintelligible. Keep response under 15 words.' }
        ],
        prompts: [
            "Hack the mainframe. Password is:",
            "Your last thought before the upload completes.",
            "Why is the AI smiling?",
            "Error 404: ___ not found.",
            "A message to the resistance.",
            "What defines 'real'?",
            "Protocol Omega initiated. Reason:"
        ]
    },
    classic: {
        id: 'classic',
        name: 'Classic Party',
        font: 'font-sans',
        colors: {
            bg: 'bg-slate-900',
            card: 'bg-slate-800',
            text: 'text-slate-100',
            accent: 'text-emerald-400',
            button: 'bg-emerald-600 hover:bg-emerald-500 text-white',
            border: 'border-emerald-500/50'
        },
        copy: {
            manualInputLabel: 'Your Answer',
            ghostInputLabel: 'AI Answer',
            ghostSubtext: 'Let AI write for you',
            submitBtn: 'Submit Answer',
            waiting: 'Waiting for players...',
            uploadComplete: 'ANSWER SUBMITTED',
            voteHuman: 'WRITTEN BY HUMAN',
            voteBot: 'WRITTEN BY AI',
            revealTitle: 'THE RESULTS',
            revealNext: 'NEXT ANSWER >',
            startGameBtn: 'START GAME',
            submitVotesBtn: 'SUBMIT VOTES',
            revealHeader: 'RESULTS',
            strategyLabel: 'STRATEGY',
            manualLabel: 'HUMAN',
            ghostLabel: 'AI',
            transitions: {
                PROMPT: 'NEW PROMPT',
                INPUT: 'WRITE YOUR ANSWER',
                VOTING: 'VOTE NOW',
                REVEAL: 'THE REVEAL',
                FINISH: 'ROUND OVER'
            }
        },
        agents: [
            {
                id: 'minimalist',
                name: 'The Minimalist',
                description: 'Lowercase. Short. No effort.',
                systemPrompt: 'You are a lazy texter. Use all lowercase. No punctuation. Use abbreviations like "idk" or "lol". Keep it under 6 words.'
            },
            {
                id: 'advocate',
                name: 'Devils Advocate',
                description: 'Starts with "Actually..." or "To be fair..."',
                systemPrompt: 'You are a contrarian. Start your answer with "Actually," "To be fair," or "Technically." Disagree slightly with the premise or add a pedantic correction. Keep it under 15 words.'
            },
            {
                id: 'hype',
                name: 'The Hype Man',
                description: 'Overly enthusiastic. Lots of "!"',
                systemPrompt: 'You are a supportive hype man. Use slang like "Valid", "Let\'s go", or "Fire". Use multiple exclamation marks!!! Keep it under 10 words.'
            },
            {
                id: 'wiki',
                name: 'The Wiki',
                description: 'Dry facts. Slightly too formal.',
                systemPrompt: 'You are a wikipedia summary. State a dry fact related to the prompt. Be neutral and objective. No emotion. Keep it under 15 words.'
            },
            {
                id: 'conspiracy',
                name: 'The Theorist',
                description: 'Suspicious of everything.',
                systemPrompt: 'You are a conspiracy theorist. Imply that the prompt is a "psyop", "simulation", or "distraction". Be paranoid. Keep it under 15 words.'
            }
        ],
        prompts: [
            // DEBATES (The "Hot Takes")
            "Is a hotdog a sandwich? Defend your answer.",
            "What is the correct way to hang toilet paper?",
            "Does pineapple belong on pizza?",
            "Is cereal a soup? Explain.",
            "What is the worst font in existence?",
            "Cats vs Dogs: Who would win in a legal battle?",
            "Is it okay to wear socks with sandals?",
            "How many five-year-olds could you fight at once?",

            // CREATIVE SCENARIOS
            "What is the worst thing to bring to a funeral?",
            "Invent a useless superpower.",
            "What is the title of your autobiography?",
            "Describe the smell of a locker room in 3 words.",
            "What is the worst possible first date location?",
            "If you were a ghost, who would you haunt first?",
            "What is the weirdest thing you can buy for $1?",
            "Name a new Ben & Jerry's flavor that would taste terrible.",
            "What is the worst advice you've ever received?",

            // SOCIAL/PERSONAL
            "What is your red flag?",
            "What is a conspiracy theory you actually believe?",
            "What is the most embarrassing fashion trend you participated in?",
            "What is your 'Roman Empire' (thing you think about daily)?",
            "Explain the internet to a pilgrim.",
            "What is the pettiest reason you broke up with someone?",
            "What is the adult equivalent of 'The floor is lava'?",

            // ABSTRACT/WEIRD
            "If animals could talk, which one would be the rudest?",
            "What object in this room would be the best weapon in a zombie apocalypse?",
            "What is the meaning of life (wrong answers only)?",
            "If you could delete one state/country, which one?",
            "What is the worst thing to whisper in an elevator?",
            "Create a new holiday. What do we celebrate?",
            "What is the worst pizza topping imaginable?"
        ]
    }
};
