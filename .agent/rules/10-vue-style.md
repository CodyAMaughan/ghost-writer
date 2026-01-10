---
trigger: glob
globs: **/*.vue
---

# Vue.js Coding Standards
> **Activation:** `**/*.vue`

## 1. Component Structure
*   Use **Vue 3 `<script setup>`** exclusively.
*   Order: `<script setup>`, `<template>`, `<style>` (if needed).

## 2. Styling
*   **Tailwind CSS** is mandatory for all layout and design.
*   Avoid `<style>` blocks unless creating complex animations (e.g., Glitch effects).
*   **Icons:** Use `lucide-vue-next`.

## 3. Theming (CRITICAL)
*   **NO HARDCODED COLORS.**
*   You **MUST** use the `theme` object from `src/config/themes.js`.
*   **Usage:**
    *   `src/config/themes.js` defines the palette (`bg`, `text`, `accent`, `border`, `button`).
    *   Bind styles dynamically: `:class="theme.colors.bg"` or `:class="[theme.colors.text, theme.font]"`.
    *   You can create new theme properties as needed, but you **MUST** documentation appropriately and update all themes in themes.js to include the new properties.

## 4. State Access
*   Access global state via `usePeer()`: `const { gameState } = usePeer()`.
*   Computed properties for UI logic are preferred over watchers.
