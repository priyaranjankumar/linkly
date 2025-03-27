// frontend/src/App.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route } from "react-router-dom"; // Import Routes and Route
import axios from "axios";
import Header from "./components/Header";
import UrlShortenerForm from "./components/UrlShortenerForm";
import LinkHistoryTable from "./components/LinkHistoryTable";
import InactiveLinkPage from "./components/InactiveLinkPage"; // Import the new page

// Get API Base URL from environment variable set during build/runtime
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function App() {
  const [links, setLinks] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorHistory, setErrorHistory] = useState("");
  const [updateError, setUpdateError] = useState(""); // State for update errors

  // Fetch initial link history
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    setErrorHistory("");
    try {
      const response = await axios.get(`${API_BASE_URL}/links`);
      if (response.data && Array.isArray(response.data.links)) {
        setLinks(response.data.links);
      } else {
        setLinks([]); // Set empty if response is not as expected
      }
    } catch (err) {
      console.error("History fetch error:", err);
      setErrorHistory(
        "Failed to fetch link history. Please try again later."
      );
      setLinks([]); // Clear links on error
    } finally {
      setLoadingHistory(false);
    }
  }, []); // Empty dependency array means this useCallback version is created once

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]); // fetchHistory is stable due to useCallback

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
        // Revert optimistic update if it failed (if you implemented optimistic UI)
        // fetchHistory(); // Or refetch to be absolutely sure
      }
    },
    [] // No dependencies needed here as it doesn't rely on changing props/state directly
  );

  // Main application layout component
  const MainLayout = () => (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <Header />
      <UrlShortenerForm onNewUrl={handleNewUrl} apiBaseUrl={API_BASE_URL} />
      {updateError && ( // Display update errors above the table
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
      />
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