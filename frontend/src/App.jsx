// frontend/src/App.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
// Remove global axios import
// import axios from "axios";
import { useAuth, apiClient } from "./context/AuthContext"; // Import useAuth AND apiClient
import Header from "./components/Header";
import UrlShortenerForm from "./components/UrlShortenerForm";
import LinkHistoryTable from "./components/LinkHistoryTable";
import InactiveLinkPage from "./components/InactiveLinkPage";
import AuthForm from "./components/AuthForm";

// API_BASE_URL is now implicitly handled by apiClient's baseURL
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function App() {
  const { isAuthenticated, logout, token } = useAuth();
  const [links, setLinks] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorHistory, setErrorHistory] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [authMode, setAuthMode] = useState("login");

  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setLinks([]);
      setLoadingHistory(false);
      return;
    }
    setLoadingHistory(true);
    setErrorHistory("");
    try {
      // Use apiClient - token is added by interceptor
      const response = await apiClient.get("/links"); // Use relative path
      if (response.data && Array.isArray(response.data.links)) {
        setLinks(response.data.links);
      } else {
        setLinks([]);
      }
    } catch (err) {
      console.error("History fetch error:", err);
      if (err.response?.status === 401) {
          logout();
          setErrorHistory("Session expired. Please log in again.");
      } else {
          setErrorHistory("Failed to fetch link history. Please try again later.");
      }
      setLinks([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [isAuthenticated, logout]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, token]);

  const handleNewUrl = (newLink) => {
    setLinks((prevLinks) => [newLink, ...prevLinks]);
    setErrorHistory("");
    setUpdateError("");
  };

  const handleUpdateStatus = useCallback(
    async (shortCode, currentStatus) => {
      const newStatus =
        currentStatus === "Active" ? "Inactive" : "Active";
      setUpdateError("");

      try {
        // Use apiClient
        const response = await apiClient.patch(
          `/links/${shortCode}/status`, // Use relative path
          { status: newStatus }
        );

        if (response.status === 200 && response.data) {
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
        if (err.response?.status === 401) logout();
      }
    },
    [logout]
  );

  // Handler for deleting a link (Note: endpoint uses short_code now)
  const handleDeleteLink = useCallback(async (shortCode) => { // Changed param from linkId to shortCode
    setUpdateError("");

    try {
      // Use apiClient and correct identifier (short_code)
      const response = await apiClient.delete(`/links/${shortCode}`); // Use relative path and shortCode

      if (response.status === 204) {
        // Remove the link from the state based on shortCode
        setLinks((prevLinks) => prevLinks.filter((link) => link.short_code !== shortCode));
      } else {
        throw new Error("Failed to delete link - unexpected response");
      }
    } catch (err) {
      console.error("Link delete error:", err);
      setUpdateError(
        `Failed to delete link (${shortCode}). ${
          err.response?.data?.detail || "Please try again."
        }`
      );
      if (err.response?.status === 401) logout();
      throw err;
    }
  }, [logout]);

  const MainLayout = () => (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <Header />
      {isAuthenticated ? (
        <>
          <button
            onClick={logout}
            className="mb-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition duration-150 ease-in-out"
          >
            Logout
          </button>
          {/* Pass apiClient to form if it makes direct calls */}
          <UrlShortenerForm onNewUrl={handleNewUrl} /* apiClient={apiClient} */ />
          {updateError && (
            <p className="text-red-400 mb-4 text-center bg-red-900/30 p-2 rounded">
              {updateError}
            </p>
          )}
          {errorHistory && (
            <p className="text-red-400 text-center mb-4">{errorHistory}</p>
          )}
          {/* Pass handlers and potentially apiClient to table */}
          <LinkHistoryTable
            links={links}
            loading={loadingHistory}
            onUpdateStatus={handleUpdateStatus}
            onDeleteLink={handleDeleteLink}
            // Pass apiClient if rows make direct calls, though handlers here use it already
            // apiClient={apiClient}
          />
        </>
      ) : (
        <div className="max-w-md mx-auto">
          <AuthForm mode={authMode} onSwitchMode={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} />
        </div>
      )}
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={<MainLayout />} />
      <Route path="/inactive" element={<InactiveLinkPage />} />
    </Routes>
  );
}

export default App;
