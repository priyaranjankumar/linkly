// frontend/src/App.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth, apiClient } from "./context/AuthContext"; // Import useAuth AND apiClient
import Header from "./components/Header";
import UrlShortenerForm from "./components/UrlShortenerForm";
import LinkHistoryTable from "./components/LinkHistoryTable";
import InactiveLinkPage from "./components/InactiveLinkPage";
import AuthForm from "./components/AuthForm";

function App() {
  // Get currentUser from context
  const { isAuthenticated, logout, token, currentUser } = useAuth();
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
      const response = await apiClient.get("/links");
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
        const response = await apiClient.patch(
          `/links/${shortCode}/status`,
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

  const handleDeleteLink = useCallback(async (shortCode) => {
    setUpdateError("");
    try {
      const response = await apiClient.delete(`/links/${shortCode}`);

      if (response.status === 204) {
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
    }
  }, [logout]);

  const MainLayout = () => (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <Header />
      {isAuthenticated ? (
        <>
          {/* User Info and Logout Button - Aligned Right */}
          <div className="flex justify-end items-center mb-4">
            {currentUser && (
              <span className="text-gray-400 text-sm mr-4">
                Logged in as: {currentUser.email}
              </span>
            )}
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition duration-150 ease-in-out"
            >
              Logout
            </button>
          </div>

          <UrlShortenerForm onNewUrl={handleNewUrl} />
          {updateError && (
            <p className="text-red-400 mb-4 text-center bg-red-900/30 p-2 rounded">
              {updateError}
            </p>
          )}
          {errorHistory && (
            <p className="text-red-400 text-center mb-4">{errorHistory}</p>
          )}
          <LinkHistoryTable
            links={links}
            loading={loadingHistory}
            onUpdateStatus={handleUpdateStatus}
            onDeleteLink={handleDeleteLink}
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
