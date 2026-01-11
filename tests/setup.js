// Mock localStorage globally for all tests
const mockStorage = {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; },
    clear() { this.data = {}; }
};

global.localStorage = mockStorage;
global.sessionStorage = { ...mockStorage, data: {} };

// Mock Howler audio library
import { vi } from 'vitest';

vi.mock('howler', () => {
    const mockHowl = vi.fn(function () {
        return {
            play: vi.fn().mockReturnValue(1),
            pause: vi.fn(),
            stop: vi.fn(),
            volume: vi.fn().mockReturnThis(),
            fade: vi.fn().mockReturnThis(),
            rate: vi.fn().mockReturnThis(),
            playing: vi.fn().mockReturnValue(false),
            on: vi.fn().mockReturnThis(),
            once: vi.fn().mockReturnThis(),
            off: vi.fn().mockReturnThis()
        };
    });

    const mockHowler = {
        volume: vi.fn(),
        mute: vi.fn(),
        ctx: {
            state: 'running',
            resume: vi.fn().mockResolvedValue(undefined)
        },
        autoSuspend: false
    };

    return {
        Howl: mockHowl,
        Howler: mockHowler
    };
});
