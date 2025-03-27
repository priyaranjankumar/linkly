import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Header from './components/Header';
import UrlShortenerForm from './components/UrlShortenerForm';
import LinkHistoryTable from './components/LinkHistoryTable';

// Get API base URL from environment variable set during build by Vite/Docker
// Fallback for local dev without proper env var setup (less ideal)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'; // Use relative /api which Nginx proxies

function App() {
  const [links, setLinks] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorHistory, setErrorHistory] = useState(null);

  const fetchLinks = useCallback(async () => {
    setLoadingHistory(true);
    setErrorHistory(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/links`); // Corrected path based on backend/nginx
      setLinks(response.data.links || []);
    } catch (err) {
      console.error("Error fetching links:", err);
      setErrorHistory('Failed to fetch link history. Please try again later.');
      setLinks([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []); // API_BASE_URL is constant during component lifecycle

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]); // Fetch links on initial mount

  const handleNewUrl = (newLink) => {
     // Add the new link to the top of the list for immediate feedback
     // Limit the number of items shown client-side if needed
     setLinks(prevLinks => [newLink, ...prevLinks]);
     // Alternatively, refetch the whole list:
     // fetchLinks();
  };

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="max-w-5xl mx-auto"> {/* Increased max-width slightly */}
        <Header />
        <UrlShortenerForm onNewUrl={handleNewUrl} apiBaseUrl={API_BASE_URL} />
        {errorHistory && <p className="text-red-400 bg-red-900/50 p-3 rounded-md text-center my-4">{errorHistory}</p>}
        <LinkHistoryTable links={links} loading={loadingHistory} apiBaseUrl={API_BASE_URL}/>
      </div>
      <footer className="text-center text-gray-500 mt-8 text-sm">
          Linkly URL Shortener - Built with React & FastAPI
      </footer>
    </div>
  );
}

export default App;
