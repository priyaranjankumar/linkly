import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
// --- FIX: Import MemoryRouter ---
import { MemoryRouter } from "react-router-dom";
import App from "./App";

// --- Mocks ---
vi.mock("axios");

vi.mock("./components/Header", () => ({
  default: () => <header data-testid="mock-header">Linkly Header</header>,
}));

let triggerNewUrl;
// Mock UrlShortenerForm and pass down necessary props including onUpdateStatus
vi.mock("./components/UrlShortenerForm", () => ({
  default: ({ onNewUrl, apiBaseUrl }) => {
    triggerNewUrl = onNewUrl;
    return (
      <form data-testid="mock-form">
        <p>API Base URL Prop: {apiBaseUrl}</p>
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
  default: ({ links, loading, apiBaseUrl, onUpdateStatus }) => ( // Added onUpdateStatus mock prop
    <div data-testid="mock-table">
      <p>History Loading: {loading ? "true" : "false"}</p>
      <p>API Base URL Prop (Table): {apiBaseUrl}</p>
      <p>Link Count: {links.length}</p>
      {links.map((link) => (
        <div key={link.id || link.short_code}>
          Link: {link.original_url} | Status: {link.status}
           {/* Simulate button click for testing status update */}
          <button onClick={() => onUpdateStatus(link.short_code, link.status)}>
            Toggle {link.short_code}
          </button>
        </div>
      ))}
    </div>
  ),
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

// --- Tests ---
describe("App Component", () => {
  const mockApiBaseUrl = "/api";
  const initialLink = {
    id: 1,
    short_code: "abc",
    original_url: "https://google.com",
    short_url: "http://mock.co/abc",
    status: "Active", // Initial status
    created_at: new Date().toISOString(),
    visit_count: 5,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    triggerNewUrl = undefined;
    axios.get.mockResolvedValue({
      data: { links: [initialLink] },
    });
    // Mock PATCH for status updates to resolve successfully by default
    axios.patch.mockResolvedValue({
        status: 200,
        data: { ...initialLink, status: 'Inactive' } // Simulate backend response
    });
  });

  // Helper function to render App within MemoryRouter
  const renderApp = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>
    );
  };


  it("renders header and passes correct API base URL to children", async () => {
    renderApp(); // Use helper
    expect(screen.getByTestId("mock-header")).toBeInTheDocument();
    expect(
      screen.getByText(`API Base URL Prop: ${mockApiBaseUrl}`)
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(`API Base URL Prop (Table): ${mockApiBaseUrl}`)
      ).toBeInTheDocument();
    });
  });

  it("fetches link history on initial load and displays it", async () => {
    renderApp(); // Use helper

    expect(screen.getByText("History Loading: true")).toBeInTheDocument();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith(`${mockApiBaseUrl}/links`);
      expect(screen.getByText("History Loading: false")).toBeInTheDocument();
      expect(screen.getByText("Link Count: 1")).toBeInTheDocument();
      // Check content including status
      expect(
        screen.getByText(`Link: ${initialLink.original_url} | Status: ${initialLink.status}`)
      ).toBeInTheDocument();
    });
  });

  it("displays an error message if fetching history fails", async () => {
    const errorMessage = "Network Error";
    axios.get.mockRejectedValueOnce(new Error(errorMessage));

    renderApp(); // Use helper

    expect(screen.getByText("History Loading: true")).toBeInTheDocument();

    await waitFor(() => {
      // Check for the specific error message displayed in App.jsx
      expect(
        screen.getByText("Failed to fetch link history. Please try again later.")
      ).toBeInTheDocument();
      expect(screen.getByText("History Loading: false")).toBeInTheDocument();
      expect(screen.getByText("Link Count: 0")).toBeInTheDocument();
    });
  });

  it("adds a new link to the history when handleNewUrl is called", async () => {
    renderApp(); // Use helper

    await waitFor(() => {
      expect(
        screen.getByText(`Link: ${initialLink.original_url} | Status: Active`)
      ).toBeInTheDocument();
      expect(screen.getByText("Link Count: 1")).toBeInTheDocument();
    });

    const simulateButton = screen.getByRole("button", { name: /Simulate Shorten/i });
    expect(triggerNewUrl).toBeDefined();
    fireEvent.click(simulateButton);

    await waitFor(() => {
      expect(
        screen.getByText("Link: https://newlyadded.com | Status: Active")
      ).toBeInTheDocument();
      expect(screen.getByText("Link Count: 2")).toBeInTheDocument();
      expect(
        screen.getByText(`Link: ${initialLink.original_url} | Status: Active`)
      ).toBeInTheDocument();
    });
  });

  // --- NEW TEST for status update ---
  it("updates link status when toggle button is clicked", async () => {
    renderApp(); // Use helper

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(`Link: ${initialLink.original_url} | Status: Active`)).toBeInTheDocument();
    });

    // Find the toggle button for the specific link (using text content from mock)
    const toggleButton = screen.getByRole('button', { name: `Toggle ${initialLink.short_code}` });

    // Mock the successful PATCH response (updating from Active to Inactive)
    const updatedLinkData = { ...initialLink, status: 'Inactive' };
    axios.patch.mockResolvedValueOnce({
        status: 200,
        data: updatedLinkData
    });

    // Click the button
    fireEvent.click(toggleButton);

    // Verify PATCH call
    await waitFor(() => {
        expect(axios.patch).toHaveBeenCalledTimes(1);
        expect(axios.patch).toHaveBeenCalledWith(
            `${mockApiBaseUrl}/links/${initialLink.short_code}/status`,
            { status: 'Inactive' } // Expecting to send the NEW status
        );
    });

    // Verify UI update based on the mocked response
    await waitFor(() => {
        expect(screen.getByText(`Link: ${initialLink.original_url} | Status: Inactive`)).toBeInTheDocument();
        // Link count should remain the same
        expect(screen.getByText("Link Count: 1")).toBeInTheDocument();
    });

     // --- Test toggling back ---
     axios.patch.mockResolvedValueOnce({
        status: 200,
        data: { ...initialLink, status: 'Active' } // Mock response for activating again
    });

     // Button text/name might not change in mock, re-find it
    const toggleButtonAgain = screen.getByRole('button', { name: `Toggle ${initialLink.short_code}` });
    fireEvent.click(toggleButtonAgain);

    await waitFor(() => {
        expect(axios.patch).toHaveBeenCalledTimes(2); // Called twice now
         expect(axios.patch).toHaveBeenLastCalledWith(
            `${mockApiBaseUrl}/links/${initialLink.short_code}/status`,
            { status: 'Active' } // Expecting to send the NEW status (Active)
        );
    });

    // Verify UI update back to Active
    await waitFor(() => {
        expect(screen.getByText(`Link: ${initialLink.original_url} | Status: Active`)).toBeInTheDocument();
    });
  });

   // --- NEW TEST for inactive page route ---
   it("renders the InactiveLinkPage for the /inactive route", () => {
    renderApp(['/inactive?code=xyz']); // Render with initial route
    expect(screen.getByTestId("mock-inactive-page")).toBeInTheDocument();
    // Check that the main layout components are NOT rendered
    expect(screen.queryByTestId("mock-header")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mock-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mock-table")).not.toBeInTheDocument();
  });


});