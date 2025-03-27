// src/setupTests.js
import "@testing-library/jest-dom";

// Add any other global setup for tests here
// For example, mocking global objects or libraries

// Example: Mock matchMedia (often needed for UI libraries)
// Object.defineProperty(window, 'matchMedia', {
//   writable: true,
//   value: vi.fn().mockImplementation(query => ({
//     matches: false,
//     media: query,
//     onchange: null,
//     addListener: vi.fn(), // deprecated
//     removeListener: vi.fn(), // deprecated
//     addEventListener: vi.fn(),
//     removeEventListener: vi.fn(),
//     dispatchEvent: vi.fn(),
//   })),
// });
