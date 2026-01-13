import { describe, it, expect } from 'vitest';
import { EMOTE_REGISTRY } from '../../../src/config/emotes';

describe('Emote Registry', () => {
    it('should have required standard emotes', () => {
        expect(EMOTE_REGISTRY.heart).toBeDefined();
        expect(EMOTE_REGISTRY.ghost).toBeDefined();
        expect(EMOTE_REGISTRY.ai).toBeDefined();
    });

    it('standard emotes should be unlocked and free', () => {
        const heart = EMOTE_REGISTRY.heart;
        expect(heart.type).toBe('standard');
        expect(heart.cost).toBe(0);
        expect(heart.locked).toBe(false);
    });

    it('premium emotes should be locked', () => {
        const human = EMOTE_REGISTRY.human;
        expect(human).toBeDefined();
        expect(human.type).toBe('premium');
        expect(human.cost).toBeGreaterThan(0);
        expect(human.locked).toBe(true);
    });
});
