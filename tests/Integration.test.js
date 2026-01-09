
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import GameScreen from '../src/components/GameScreen.vue';
import { usePeer } from '../src/composables/usePeer';
import { AGENTS } from '../src/constants/agents';
import { reactive, nextTick } from 'vue';
import Lobby from '../src/components/Lobby.vue';

// --- State Factory ---
// Ensures clean state for every test
const createDefaultState = () => ({
    phase: 'LOBBY',
    players: [],
    round: 1,
    maxRounds: 3,
    timer: 60,
    submissions: [],
    roomCode: '',
    prompt: "Default Mock Prompt",
    settings: { roundDuration: 60, provider: 'gemini', apiKey: '' },
    finishedVotingIDs: [],
    revealedIndex: -1
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
vi.mock('../src/composables/usePeer', () => ({
    usePeer: () => ({
        gameState: mockGameState,
        myId: 'p1',
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
        await wrapper.find('[data-testid="host-api-input"]').setValue('sk-fake-key');

        await wrapper.find('[data-testid="host-init-btn"]').trigger('click');

        // Assert mock was called correctly
        expect(mockActions.initHost).toHaveBeenCalledWith('HostUser', 'gemini', 'sk-fake-key');
    });

    it('Client can join game', async () => {
        const wrapper = mount(Lobby);
        await wrapper.find('[data-testid="landing-join-btn"]').trigger('click');
        await wrapper.find('[data-testid="join-name-input"]').setValue('JoinUser');
        await wrapper.find('[data-testid="join-code-input"]').setValue('ABCD');
        await wrapper.find('[data-testid="join-connect-btn"]').trigger('click');

        expect(mockActions.joinGame).toHaveBeenCalledWith('ABCD', 'JoinUser');
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
        expect(wrapper.text()).toContain("DATA UPLOADED");
    });

    it('Allows user to generate and select a Ghost Answer', async () => {
        const wrapper = mount(GameScreen, { global: { stubs } });

        await wrapper.find('[data-testid="open-ghost-modal-btn"]').trigger('click');
        await nextTick();

        const agentBtn = wrapper.find(`[data-testid="agent-select-btn-${AGENTS[0].id}"]`);
        await agentBtn.trigger('click');

        // Wait for async options logic
        await flushPromises();
        await nextTick();

        const options = wrapper.findAll('[data-testid^="ghost-option-btn-"]');
        await options[0].trigger('click');

        await nextTick();

        expect(mockActions.submitAnswer).toHaveBeenCalledWith("Ghost A", 'AI', AGENTS[0].id);
        expect(wrapper.text()).toContain("DATA UPLOADED");
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

    it('Handles AI Failure gracefully', async () => {
        // Setup: Mock failure
        mockActions.getGhostOptions.mockRejectedValueOnce(new Error("Network Error"));

        const wrapper = mount(GameScreen, { global: { stubs } });

        // Trigger ghost generation
        await wrapper.find('[data-testid="open-ghost-modal-btn"]').trigger('click');
        await nextTick();

        const agentBtn = wrapper.find(`[data-testid="agent-select-btn-${AGENTS[0].id}"]`);
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

        const nextBtn = wrapper.find('[data-testid="next-reveal-btn"]');
        expect(nextBtn.exists()).toBe(true);

        await nextBtn.trigger('click');
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
