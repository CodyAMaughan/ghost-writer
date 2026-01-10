# Refactor Test Architecture

## Context & Goals
The current test suite violates the project's testing rules defined in `.agent/rules/20-testing.md`. Specifically:
1.  **Strict Separation:** Unit tests (mocking modules) and Integration tests (mocking network) are mixed.
2.  **Mocking Strategy:** Some integration tests incorrectly mock the `usePeer` module instead of the `peerjs` network layer.
3.  **Inline Mocks:** Several tests use inline mocks for `peerjs` instead of the shared `tests/mocks/peerjs.js`.

The goal is to reorganize the `tests/` directory into `tests/unit/` and `tests/integration/` and refactor the mocking strategy to comply with the rules, without altering the actual test logic or coverage.

## Architecture Changes
No changes to the production architecture (`src/`).
The change is strictly limited to the `tests/` directory structure and the mocking patterns used within.

- **New Directory:** `tests/unit/` for tests that calculate outcomes by mocking `usePeer`.
- **New Directory:** `tests/integration/` for tests that verify the interaction between components and the real `usePeer` logic, using a mocked `peerjs` layer.

## Proposed Implementation

### 1. Directory Restructuring
Move existing files to their appropriate semantic location based on their current implementation (mostly Unit):

- `tests/Integration.test.js` -> `tests/unit/components/LobbyAndGameScreen.test.js`
(Reasoning: It mocks `usePeer` module, so it is a Unit test by our definition).
- `tests/LobbyAuthIntegration.test.js` -> `tests/unit/components/LobbyAuth.test.js`
- `tests/FeatureIntegration.test.js` -> `tests/unit/components/FeatureIntegration.test.js`
- `tests/LobbyAdvanced.test.js` -> `tests/unit/components/LobbyAdvanced.test.js`
- `tests/AIService.test.js` -> `tests/unit/services/AIService.test.js`
- `tests/AppVerify.test.js` -> `tests/unit/AppVerify.test.js`
- `tests/InviteLink.test.js` -> `tests/unit/components/InviteLink.test.js`
- `tests/PhaseFinish.test.js` -> `tests/unit/components/PhaseFinish.test.js`
- `tests/UsePeerLogic.test.js` -> `tests/integration/UsePeerLogic.test.js`

### 2. Refactoring Mocks (`tests/integration/UsePeerLogic.test.js`)
This is the only true Integration test identified. It currently uses an inline mock for `peerjs`.
- **Change:** Logic will be updated to import `MockPeer` from the shared `tests/mocks/peerjs.js`.
- **Setup:** `beforeEach` will call `MockPeer.reset()`.
- **Verification:** Assertions will check `MockPeer.instances` instead of the current `sharedMocks` approach.

## Testing Strategy
Since this is a refactor of the tests themselves, the verification strategy is to run the test suite and ensure all tests pass and that the "Integration" tests are indeed using the shared mock correctly.

1.  **Run All Tests:** `npm run test` (or `npx vitest`) to verify green state.
2.  **Manual Check:** Verify `tests/integration/UsePeerLogic.test.js` imports `../../mocks/peerjs.js`.
