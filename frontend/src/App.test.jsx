import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import App from './App';

// --- Mocks ---
vi.mock('axios'); // Mock the entire axios library

// Mock child components to isolate testing App.jsx logic
vi.mock('./components/Header', () => ({
  default: () => <header data-testid="mock-header">Linkly Header</header>
}));

// Mock UrlShortenerForm, allowing us to trigger its callback `onNewUrl`
// We also check if apiBaseUrl prop is passed correctly
let triggerNewUrl; // Function to simulate form submission callback
vi.mock('./components/UrlShortenerForm', () => ({
  default: ({ onNewUrl, apiBaseUrl }) => {
    triggerNewUrl = onNewUrl; // Assign the callback for use in tests
    return (
      <form data-testid="mock-form">
        <p>API Base URL Prop: {apiBaseUrl}</p> {/* Check prop passing */}
        <button onClick={() => triggerNewUrl && triggerNewUrl({ id: 99, short_url: 'http://mock.co/new', short_code: 'new', original_url: 'https://newlyadded.com', status: 'Active', created_at: new Date().toISOString(), visit_count: 0 })}>
          Simulate Shorten
        </button>
      </form>
    );
  }
}));

// Mock LinkHistoryTable to verify props passed down (links, loading)
vi.mock('./components/LinkHistoryTable', () => ({
  default: ({ links, loading, apiBaseUrl }) => (
    <div data-testid="mock-table">
      <p>History Loading: {loading ? 'true' : 'false'}</p>
      <p>API Base URL Prop (Table): {apiBaseUrl}</p> {/* Check prop passing */}
      <p>Link Count: {links.length}</p>
      {links.map(link => <div key={link.id}>Link: {link.original_url}</div>)}
    </div>
  )
}));

// Mock qrcode.react (might be needed if rendering fails in JSDOM)
vi.mock('qrcode.react', () => ({
    default: ({ value }) => <canvas data-testid="mock-qrcode" data-value={value}></canvas>
}));

// Mock react-copy-to-clipboard
vi.mock('react-copy-to-clipboard', () => ({
    CopyToClipboard: ({ children }) => <div>{children}</div> // Simple wrapper
}));

// --- Tests ---
describe('App Component', () => {
  const mockApiBaseUrl = '/api'; // Consistent with VITE_API_BASE_URL usage
  const initialLink = { id: 1, short_code: 'abc', original_url: 'https://google.com', short_url: 'http://mock.co/abc', status: 'Active', created_at: new Date().toISOString(), visit_count: 5 };

  beforeEach(() => {
    // Reset mocks and state before each test
    vi.resetAllMocks();
    triggerNewUrl = undefined; // Reset trigger function

    // Default mock for successful initial fetch
    axios.get.mockResolvedValue({
      data: { links: [initialLink] }
    });
  });

  it('renders header and passes correct API base URL to children', async () => {
    render(<App />);
    // Check header is rendered
    expect(screen.getByTestId('mock-header')).toBeInTheDocument();
    // Check API URL prop passed to form
    expect(screen.getByText(`API Base URL Prop: ${mockApiBaseUrl}`)).toBeInTheDocument();
     // Check API URL prop passed to table (needs to wait for render)
     await waitFor(() => {
       expect(screen.getByText(`API Base URL Prop (Table): ${mockApiBaseUrl}`)).toBeInTheDocument();
     });
  });

  it('fetches link history on initial load and displays it', async () => {
    render(<App />);

    // Check loading state is shown initially in the mocked table
    expect(screen.getByText('History Loading: true')).toBeInTheDocument();

    // Wait for the API call to resolve and links to be rendered
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(1);
      // Ensure the correct endpoint relative to the base URL is called
      expect(axios.get).toHaveBeenCalledWith(`${mockApiBaseUrl}/links`);
      // Check loading state is false after fetch
      expect(screen.getByText('History Loading: false')).toBeInTheDocument();
       // Check link count and content rendered by mock table
       expect(screen.getByText('Link Count: 1')).toBeInTheDocument();
       expect(screen.getByText(`Link: ${initialLink.original_url}`)).toBeInTheDocument();
    });
  });

  it('displays an error message if fetching history fails', async () => {
    const errorMessage = 'Network Error';
    axios.get.mockRejectedValueOnce(new Error(errorMessage)); // Simulate API error

    render(<App />);

    // Check loading state initially
    expect(screen.getByText('History Loading: true')).toBeInTheDocument();

    // Wait for the error message to be displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch link history. Please try again later.')).toBeInTheDocument();
       // Ensure loading state is false even on error
       expect(screen.getByText('History Loading: false')).toBeInTheDocument();
       // Ensure link count is 0 on error
       expect(screen.getByText('Link Count: 0')).toBeInTheDocument();
    });
  });

  it('adds a new link to the history when handleNewUrl is called', async () => {
    render(<App />);

    // Wait for initial load to complete
    await waitFor(() => {
      expect(screen.getByText(`Link: ${initialLink.original_url}`)).toBeInTheDocument();
      expect(screen.getByText('Link Count: 1')).toBeInTheDocument();
    });

    // Simulate the UrlShortenerForm calling the onNewUrl callback
    const simulateButton = screen.getByRole('button', { name: /Simulate Shorten/i });
    expect(triggerNewUrl).toBeDefined(); // Ensure the callback function was captured
    fireEvent.click(simulateButton); // This indirectly calls triggerNewUrl(newLinkData)

    // Wait for the App component's state to update and re-render the mock table
    await waitFor(() => {
      // Check that the new link is now displayed
      expect(screen.getByText('Link: https://newlyadded.com')).toBeInTheDocument();
      // Check that the link count has increased
      expect(screen.getByText('Link Count: 2')).toBeInTheDocument();
      // Check if the old link is still there (prepended)
      expect(screen.getByText(`Link: ${initialLink.original_url}`)).toBeInTheDocument();
    });
  });
});