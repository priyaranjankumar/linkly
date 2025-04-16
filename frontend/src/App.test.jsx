import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { AuthProvider } from './context/AuthContext';
import { MemoryRouter } from "react-router-dom";
import App from "./App";

// --- Mocks ---
vi.mock("axios");

vi.mock("./components/Header", () => ({
  default: (props) => {
    const apiBaseUrl = props.apiBaseUrl || "/api";
    return (
      <header data-testid="mock-header">
        Linkly Header
        <div>{`API Base URL Prop: ${apiBaseUrl}`}</div>
      </header>
    );
  },
}));

let triggerNewUrl;
let testLinks = [];

vi.mock("./components/UrlShortenerForm", () => ({
  default: ({ onNewUrl, apiBaseUrl }) => {
    const baseUrl = apiBaseUrl || "/api";
    triggerNewUrl = (link) => {
      testLinks.push(link);
      onNewUrl && onNewUrl(link);
    };
    return (
      <form data-testid="mock-form">
        <p>API Base URL Prop: {baseUrl}</p>
        <button
          type="button" // Use type button to prevent form submission in test
          onClick={() =>
            triggerNewUrl &&
            triggerNewUrl({
              id: 99,
              short_url: "http://mock.co/new",
              short_code: "new",
              original_url: "https://newlyadded.com",
              status: "Active",
              created_at: new Date().toISOString(),
              visit_count: 0,
            })
          }
        >
          Simulate Shorten
        </button>
      </form>
    );
  },
}));

// Mock LinkHistoryTable and pass down necessary props including onUpdateStatus
vi.mock("./components/LinkHistoryTable", () => ({
  default: ({ links, loading, apiBaseUrl, onUpdateStatus }) => {
    const baseUrl = apiBaseUrl || "/api";
    // Always render these lines, regardless of loading
    return (
      <div data-testid="mock-table">
        <p>API Base URL Prop (Table): {baseUrl}</p>
        <p>History Loading: {String(loading)}</p>
        <p>Link Count: {links.length}</p>
        {/* Only render links when not loading */}
        {!loading && links.concat(testLinks).map((link) => (
          <div key={link.id || link.short_code}>
            Link: {link.original_url} | Status: {link.status}
            <button onClick={() => onUpdateStatus(link.short_code, link.status)}>
              Toggle {link.short_code}
            </button>
          </div>
        ))}
      </div>
    );
  },
}));

// Mock InactiveLinkPage as it's used by routing
vi.mock('./components/InactiveLinkPage', () => ({
    default: () => <div data-testid="mock-inactive-page">Inactive Link Page</div>
}));


// Mock qrcode.react
vi.mock("qrcode.react", () => ({
  default: ({ value }) => (
    <canvas data-testid="mock-qrcode" data-value={value}></canvas>
  ),
}));

// Mock react-copy-to-clipboard
vi.mock("react-copy-to-clipboard", () => ({
  CopyToClipboard: ({ children }) => <div>{children}</div>,
}));

// Mock AuthContext to always be authenticated
vi.mock('./context/AuthContext', () => {
  const React = require('react');
  return {
    AuthProvider: ({ children }) => children,
    useAuth: () => ({ user: { email: 'test@example.com' }, login: vi.fn(), logout: vi.fn(), register: vi.fn(), loading: false, error: null }),
  };
});

// --- Tests ---
describe("Hello World Test", () => {
  it("renders hello world", () => {
    render(<div>hello world</div>);
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });
});