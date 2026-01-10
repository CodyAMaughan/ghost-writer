
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import GameScreen from '../../../src/components/GameScreen.vue';
import { THEMES } from '../../../src/config/themes';
import { reactive, nextTick, ref } from 'vue';
import Lobby from '../../../src/components/Lobby.vue';

// --- State Factory ---
// Ensures clean state for every test
const createDefaultState = () => ({
    phase: 'LOBBY',
    currentTheme: 'viral',
    players: [],
    round: 1,
    maxRounds: 3,
    timer: 60,
    submissions: [],
    roomCode: '',
    prompt: "Default Mock Prompt",
    settings: { roundDuration: 60, provider: 'gemini', apiKey: '' },
    finishedVotingIDs: [],
    revealedIndex: -1,
    revealStep: 0
});

// We use a reactive object that we will mutate/reset in beforeEach
const mockGameState = reactive(createDefaultState());

// --- Mock Actions ---
// We define these as spies so we can assert they were called
const mockActions = {
    submitAnswer: vi.fn((text, source, agentId) => {
        mockGameState.submissions.push({
            authorId: 'p1', // Default to 'me'
            text,
            source,
            agent: agentId,
            votes: {}
        });
    }),
    submitVote: vi.fn(),
    lockVotes: vi.fn(() => {
        mockGameState.finishedVotingIDs.push('p1');
    }),
    nextReveal: vi.fn(() => {
        mockGameState.revealedIndex++;
        mockGameState.revealStep = 0;
    }),
    nextRevealStep: vi.fn(() => {
        if (mockGameState.revealStep < 4) {
            mockGameState.revealStep++;
        } else {
            mockActions.nextReveal();
        }
    }),
    nextRound: vi.fn(() => {
        mockGameState.round++;
        mockGameState.phase = 'PROMPT';
    }),
    startGame: vi.fn(() => {
        mockGameState.phase = 'PROMPT'; // Simulate start
    }),
    getGhostOptions: vi.fn(async () => {
        return ["Ghost A", "Ghost B", "Ghost C"];
    }),
    initHost: vi.fn((name, provider, apiKey) => {
        mockGameState.players.push({ id: 'p1', name: name, isHost: true });
        mockGameState.settings.provider = provider;
        mockGameState.settings.apiKey = apiKey;
        mockGameState.roomCode = 'TEST_CODE';
    }),
    joinGame: vi.fn((code, name) => {
        mockGameState.players.push({ id: 'p1', name: name, isHost: false });
        mockGameState.roomCode = code;
    })
};

// --- Module Mock ---
vi.mock('../../../src/composables/usePeer', () => ({
    usePeer: () => ({
        gameState: mockGameState,
        myId: ref('p1'),
        // In our tests, we often want to be Host. 
        // We can create a computed-like ref for isHost or just hardcode it?
        // The real usePeer uses a ref. Mocking it as a simple property is easiest,
        // but if the component relies on reactivity for isHost, we might need a reactive ref.
        // However, usually checking `player.isHost` or matching IDs is robust.
        // Let's assume property is sufficient or the component reads `gameState.hostId`.
        // Actually LOBBY uses `const { isHost } = usePeer()`.
        // So we need to return `isHost`. Let's assume true for most integration tests unless specified.
        isHost: true,
        ...mockActions
    })
}));

const stubs = {
    PhaseTransition: {
        template: '<div><slot /></div>'
    }
};

// --- Global Mocks ---
const storage = {};
vi.stubGlobal('localStorage', {
    getItem: (key) => storage[key] || null,
    setItem: (key, val) => storage[key] = val,
    removeItem: (key) => delete storage[key],
    clear: () => { }
});

vi.stubGlobal('alert', vi.fn());

// --- TESTS ---

describe('Lobby Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset State completely
        Object.assign(mockGameState, createDefaultState());
        Object.keys(storage).forEach(key => delete storage[key]);

        // Setup initial lobby state
        mockGameState.phase = 'LOBBY';
    });

    it('Host can initialize game', async () => {
        const wrapper = mount(Lobby);

        await wrapper.find('[data-testid="landing-host-btn"]').trigger('click');

        await wrapper.find('[data-testid="host-name-input"]').setValue('HostUser');

        // Click "Bring Your Own Key" to reveal provider options
        const buttons = wrapper.findAll('button');
        const bringOwnKeyBtn = buttons.find(btn => btn.text().includes('Bring Your Own Key'));
        await bringOwnKeyBtn.trigger('click');
        await nextTick();

        await wrapper.find('[data-testid="host-api-input"]').setValue('sk-fake-key');

        await wrapper.find('[data-testid="host-init-btn"]').trigger('click');

        // Assert mock was called correctly (now includes lobbySettings parameter)
        expect(mockActions.initHost).toHaveBeenCalledWith('HostUser', 'gemini', 'sk-fake-key', {
            requirePassword: false,
            password: '',
            enableWaitingRoom: false
        });
    });

    it('Client can join game', async () => {
        const wrapper = mount(Lobby);
        await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
        await wrapper.find('[data-testid="join-name-input"]').setValue('JoinUser');
        await wrapper.find('[data-testid="join-code-input"]').setValue('ABCD');
        await wrapper.find('[data-testid="join-connect-btn"]').trigger('click');

        // Now includes password parameter (empty string by default)
        expect(mockActions.joinGame).toHaveBeenCalledWith('ABCD', 'JoinUser', '');
    });

    it('Host can start game when players present', async () => {
        // Setup waiting room state
        mockGameState.players = [
            { id: 'p1', name: 'Host', isHost: true },
            { id: 'p2', name: 'Client', isHost: false }
        ];
        mockGameState.roomCode = 'CODE';

        const wrapper = mount(Lobby);

        // Navigate to Waiting Room UI (manually triggering mode change simulation)
        // In real app, initHost sets this. We bypassed initHost in this test setup.
        // We can manipulate the component's internal state if exposed, OR just trigger the host flow again.
        // Easier: Trigger the UI flow to get to WAITING mode.
        await wrapper.find('[data-testid="landing-host-btn"]').trigger('click');
        await wrapper.find('[data-testid="host-name-input"]').setValue('Host');

        // Click "Bring Your Own Key" to reveal provider options
        const buttons = wrapper.findAll('button');
        const bringOwnKeyBtn = buttons.find(btn => btn.text().includes('Bring Your Own Key'));
        await bringOwnKeyBtn.trigger('click');
        await nextTick();

        await wrapper.find('[data-testid="host-api-input"]').setValue('sk-key');
        await wrapper.find('[data-testid="host-init-btn"]').trigger('click');

        await nextTick();

        const startBtn = wrapper.find('[data-testid="start-game-btn"]');
        expect(startBtn.exists()).toBe(true);
        expect(startBtn.attributes('disabled')).toBeUndefined();

        await startBtn.trigger('click');
        expect(mockActions.startGame).toHaveBeenCalled();
    });
});

describe('GameScreen Integration', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        Object.assign(mockGameState, createDefaultState());

        // Setup default game state for these tests (Input Phase)
        mockGameState.phase = 'INPUT';
        mockGameState.players = [
            { id: 'p1', name: 'Player 1', score: 0 },
            { id: 'p2', name: 'Player 2', score: 0 }
        ];
    });

    it('Allows user to submit a manual answer', async () => {
        const wrapper = mount(GameScreen, { global: { stubs } });

        expect(wrapper.text()).toContain(mockGameState.prompt);

        const input = wrapper.find('[data-testid="manual-input"]');
        expect(input.exists()).toBe(true);
        await input.setValue("My funny answer");

        const btn = wrapper.find('[data-testid="submit-manual-btn"]');
        await btn.trigger('click');

        await nextTick();

        expect(mockActions.submitAnswer).toHaveBeenCalledWith("My funny answer", 'HUMAN', null);
        expect(wrapper.text()).toContain("POST UPLOADED");
    });

    it('Allows user to generate and select a Ghost Answer', async () => {
        const wrapper = mount(GameScreen, { global: { stubs } });

        await wrapper.find('[data-testid="open-ghost-modal-btn"]').trigger('click');
        await nextTick();

        const targetAgent = THEMES.viral.agents[0];
        const agentBtn = wrapper.find(`[data-testid="agent-select-btn-${targetAgent.id}"]`);
        await agentBtn.trigger('click');

        // Wait for async options logic
        await flushPromises();
        await nextTick();

        const options = wrapper.findAll('[data-testid^="ghost-option-btn-"]');
        await options[0].trigger('click');

        await nextTick();

        expect(mockActions.submitAnswer).toHaveBeenCalledWith("Ghost A", 'AI', targetAgent.id);
        expect(wrapper.text()).toContain("POST UPLOADED");
    });

    it('Handles Custom Agent generation', async () => {
        const wrapper = mount(GameScreen, { global: { stubs } });

        await wrapper.find('[data-testid="open-ghost-modal-btn"]').trigger('click');
        await nextTick();

        await wrapper.find('[data-testid="agent-custom-btn"]').trigger('click');
        await nextTick();

        await wrapper.find('[data-testid="custom-agent-name"]').setValue("RoboCop");
        await wrapper.find('[data-testid="custom-agent-prompt"]').setValue("Be strict.");

        await wrapper.find('[data-testid="custom-agent-generate-btn"]').trigger('click');

        expect(mockActions.getGhostOptions).toHaveBeenCalledWith('custom', 'Be strict.');

        await flushPromises();
        await nextTick();

        const options = wrapper.findAll('[data-testid^="ghost-option-btn-"]');
        await options[0].trigger('click');

        await nextTick();
        expect(mockActions.submitAnswer).toHaveBeenCalledWith("Ghost A", 'AI', 'custom');
    });

    it('Auto-submits Ghost answer when timer hits 0', async () => {
        // 1. Mount component
        mount(GameScreen, { global: { stubs } });

        // 2. Simulate timer hitting 0 
        // (The component should be watching gameState.timer)
        mockGameState.timer = 0;
        await nextTick();

        // 3. Expect an AI submission happened automatically
        // We expect random text, source='AI', and a random agent ID
        expect(mockActions.submitAnswer).toHaveBeenCalledWith(
            expect.any(String),
            'AI',
            expect.anything()
        );
    });

    it('Updates UI styling and text based on Theme Settings', async () => {
        // 1. Test "Academia" Theme
        mockGameState.currentTheme = 'academia';
        const wrapper = mount(GameScreen, { global: { stubs } });
        await nextTick();

        // Check for Serif font and distinct theme subtext ("Automated Séance")
        // "Consult the Spirit" was removed in favor of generic "Use Ghost Writer"
        expect(wrapper.text()).toContain("Automated Séance");
        // Check if a known academia class exists (e.g., bg-stone-900 or font-serif)
        // Note: You might need to inspect the specific button or container
        expect(wrapper.html()).toContain('font-serif');

        // 2. Switch to "Viral" Theme
        mockGameState.currentTheme = 'viral';
        await nextTick();

        // Check for Sans font and "Auto-Generate" text
        expect(wrapper.text()).toContain("Auto-Generate");
        expect(wrapper.html()).toContain('font-sans');
    });

    it('Handles AI Failure gracefully', async () => {
        // Setup: Mock failure
        mockActions.getGhostOptions.mockRejectedValueOnce(new Error("Network Error"));

        const wrapper = mount(GameScreen, { global: { stubs } });

        // Trigger ghost generation
        await wrapper.find('[data-testid="open-ghost-modal-btn"]').trigger('click');
        await nextTick();

        const targetAgent = THEMES.viral.agents[0];
        const agentBtn = wrapper.find(`[data-testid="agent-select-btn-${targetAgent.id}"]`);
        await agentBtn.trigger('click');

        await flushPromises();

        // Should verify alert called
        expect(window.alert).toHaveBeenCalledWith("Ghost Uplink Failed");
    });

    it('Voting Phase: Renders all candidates and allows voting (Self-Voting Checked)', async () => {
        mockGameState.phase = 'VOTING';
        // Need to replace array to trigger reactivity if needed
        mockGameState.submissions.push(
            { authorId: 'p2', text: 'P2 Answer', votes: {} },
            { authorId: 'p1', text: 'P1 Answer', votes: {} }
        );

        const wrapper = mount(GameScreen, { global: { stubs } });
        await nextTick();

        expect(wrapper.text()).toContain("P2 Answer");

        // 1. Check I can vote for P2
        const voteHuman = wrapper.find('[data-testid="vote-human-btn-p2"]');
        expect(voteHuman.exists()).toBe(true);

        await voteHuman.trigger('click');

        // 2. Check I CANNOT vote for myself (P1)
        const voteSelfHuman = wrapper.find('[data-testid="vote-human-btn-p1"]');
        const voteSelfBot = wrapper.find('[data-testid="vote-bot-btn-p1"]');
        expect(voteSelfHuman.exists()).toBe(false);
        expect(voteSelfBot.exists()).toBe(false);

        await wrapper.find('[data-testid="submit-votes-btn"]').trigger('click');
        expect(mockActions.lockVotes).toHaveBeenCalled();
    });

    it('Reveal Phase: Shows stats and allows Host navigation', async () => {
        mockGameState.phase = 'REVEAL';
        mockGameState.revealedIndex = 0;
        mockGameState.submissions.push(
            { authorId: 'p2', text: 'P2 Answer', votes: { 'p1': 'HUMAN' }, source: 'HUMAN', agent: null }
        );

        const wrapper = mount(GameScreen, { global: { stubs } });
        await nextTick();

        expect(wrapper.text()).toContain("P2 Answer");

        const nextBtn = wrapper.find('[data-testid="reveal-advance-btn"]');
        expect(nextBtn.exists()).toBe(true);

        // Drumroll has 5 steps (0->4), so we click 5 times to trigger nextReveal
        for (let i = 0; i < 5; i++) {
            await nextBtn.trigger('click');
        }
        expect(mockActions.nextReveal).toHaveBeenCalled();
    });

    it('Finish Phase: Shows scores and restart controls', async () => {
        mockGameState.phase = 'FINISH';
        mockGameState.round = 1;

        const wrapper = mount(GameScreen, { global: { stubs } });
        await nextTick();

        expect(wrapper.text()).toContain("OPERATION COMPLETE");

        const nextRoundBtn = wrapper.find('[data-testid="next-round-btn"]');
        await nextRoundBtn.trigger('click');
        expect(mockActions.nextRound).toHaveBeenCalled();
    });

});
