import '@testing-library/jest-dom';

// Polyfill scroll/resize observers for jsdom when components rely on them.
class ResizeObserver {
    observe() { /* noop */ }
    unobserve() { /* noop */ }
    disconnect() { /* noop */ }
}

// @ts-ignore
global.ResizeObserver = global.ResizeObserver || ResizeObserver;
