// frontend/src/App.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route } from "react-router-dom"; // Import Routes and Route
import axios from "axios";
import { useAuth } from "./context/AuthContext"; // Import useAuth
import Header from "./components/Header";
import UrlShortenerForm from "./components/UrlShortenerForm";
import LinkHistoryTable from "./components/LinkHistoryTable";
import InactiveLinkPage from "./components/InactiveLinkPage"; // Import the new page
import AuthForm from "./components/AuthForm"; // Import AuthForm

// Get API Base URL from environment variable set during build/runtime
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function App() {
  const { isAuthenticated, logout, token } = useAuth(); // Get auth state and logout function
  const [links, setLinks] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false); // Don't load history initially if not logged in
  const [errorHistory, setErrorHistory] = useState("");
  const [updateError, setUpdateError] = useState(""); // State for update/delete errors
  // Add state for auth form mode
  const [authMode, setAuthMode] = useState("login");

  // Fetch initial link history only if authenticated
  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setLinks([]); // Clear links if not authenticated
      setLoadingHistory(false);
      return;
    }
    setLoadingHistory(true);
    setErrorHistory("");
    try {
      // Token is automatically added by AuthContext effect
      const response = await axios.get(`${API_BASE_URL}/links`);
      if (response.data && Array.isArray(response.data.links)) {
        setLinks(response.data.links);
      } else {
        setLinks([]); // Set empty if response is not as expected
      }
    } catch (err) {
      console.error("History fetch error:", err);
      // Handle potential 401 Unauthorized if token expires
      if (err.response?.status === 401) {
          logout(); // Log out if token is invalid
          setErrorHistory("Session expired. Please log in again.");
      } else {
          setErrorHistory("Failed to fetch link history. Please try again later.");
      }
      setLinks([]); // Clear links on error
    } finally {
      setLoadingHistory(false);
    }
  }, [isAuthenticated, logout]); // Depend on isAuthenticated and logout

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, token]); // Refetch when token changes (login/logout)

  // Handler for when a new URL is successfully shortened
  const handleNewUrl = (newLink) => {
    // Add the new link to the beginning of the list
    setLinks((prevLinks) => [newLink, ...prevLinks]);
    setErrorHistory(""); // Clear any previous fetch errors
    setUpdateError(""); // Clear update errors
  };

  // Handler for updating link status
  const handleUpdateStatus = useCallback(
    async (shortCode, currentStatus) => {
      const newStatus =
        currentStatus === "Active" ? "Inactive" : "Active"; // Determine the opposite status
      setUpdateError(""); // Clear previous update errors

      // Optimistic UI update (optional but improves perceived performance)
      // setLinks(prevLinks =>
      //   prevLinks.map(link =>
      //     link.short_code === shortCode ? { ...link, status: newStatus } : link
      //   )
      // );

      try {
        const response = await axios.patch(
          `${API_BASE_URL}/links/${shortCode}/status`,
          { status: newStatus } // Send the new status in the request body
        );

        if (response.status === 200 && response.data) {
          // Update the state with the confirmed data from the backend
          setLinks((prevLinks) =>
            prevLinks.map((link) =>
              link.short_code === shortCode ? response.data : link
            )
          );
        } else {
          throw new Error("Failed to update status - unexpected response");
        }
      } catch (err) {
        console.error("Status update error:", err);
        setUpdateError(
          `Failed to update status for ${shortCode}. ${
            err.response?.data?.detail || "Please try again."
          }`
        );
        if (err.response?.status === 401) logout(); // Logout on auth error
        // Revert optimistic update if it failed (if you implemented optimistic UI)
        // fetchHistory(); // Or refetch to be absolutely sure
      }
    },
    [logout] // Add logout dependency
  );

  // Handler for deleting a link
  const handleDeleteLink = useCallback(async (linkId) => {
    setUpdateError(""); // Clear previous errors

    try {
      const response = await axios.delete(`${API_BASE_URL}/links/${linkId}`);

      if (response.status === 204) {
        // Remove the link from the state
        setLinks((prevLinks) => prevLinks.filter((link) => link.id !== linkId));
      } else {
        throw new Error("Failed to delete link - unexpected response");
      }
    } catch (err) {
      console.error("Link delete error:", err);
      setUpdateError(
        `Failed to delete link (ID: ${linkId}). ${
          err.response?.data?.detail || "Please try again."
        }`
      );
      if (err.response?.status === 401) logout(); // Logout on auth error
      // Re-throw the error so the row can potentially handle its loading state
      throw err;
    }
  }, [logout]); // Add logout dependency

  // Main application layout component
  const MainLayout = () => (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <Header />
      {isAuthenticated ? (
        // --- Logged In View ---
        <>
          <button
            onClick={logout}
            className="mb-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition duration-150 ease-in-out"
          >
            Logout
          </button>
          <UrlShortenerForm onNewUrl={handleNewUrl} apiBaseUrl={API_BASE_URL} />
          {updateError && ( // Display update/delete errors above the table
            <p className="text-red-400 mb-4 text-center bg-red-900/30 p-2 rounded">
              {updateError}
            </p>
          )}
          {errorHistory && ( // Display history fetch errors
            <p className="text-red-400 text-center mb-4">{errorHistory}</p>
          )}
          <LinkHistoryTable
            links={links}
            loading={loadingHistory}
            apiBaseUrl={API_BASE_URL}
            onUpdateStatus={handleUpdateStatus} // Pass the handler down
            onDeleteLink={handleDeleteLink} // Pass delete handler down
          />
        </>
      ) : (
        // --- Logged Out View ---
        <div className="max-w-md mx-auto">
          <AuthForm mode={authMode} onSwitchMode={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} />
        </div>
      )}
    </div>
  );

  return (
    <Routes>
      {/* Route for the main application page */}
      <Route path="/" element={<MainLayout />} />
      {/* Route for the inactive link information page */}
      <Route path="/inactive" element={<InactiveLinkPage />} />
      {/* Optional: Add a catch-all route for 404 */}
      {/* <Route path="*" element={<NotFoundPage />} /> */}
    </Routes>
  );
}

export default App;