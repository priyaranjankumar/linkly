import React, { useState } from 'react';
// import axios from 'axios'; // Remove global axios import
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { apiClient } from '../context/AuthContext'; // Import the configured client

function UrlShortenerForm({ onNewUrl, apiBaseUrl }) { // apiBaseUrl is likely unused now
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLastResult(null);
    setCopied(false);

    if (!url.trim()) {
      setError('Please enter a URL.');
      return;
    }

    setIsLoading(true);

    try {
      // Use the apiClient instance. Base URL is already set in apiClient.
      // The endpoint is '/shorten' relative to the API_BASE_URL
      const response = await apiClient.post(`/shorten`, { url }); // Using apiClient

      if (response.status === 201 && response.data) {
        onNewUrl(response.data); // Notify parent (App.jsx)
        setLastResult(response.data); // Show result below the form
        setUrl(''); // Clear input field
      } else {
          setError('Failed to shorten URL. Unexpected response status.');
      }
    } catch (err) {
      console.error("Shortening error:", err);
      if (err.response && err.response.data && err.response.data.detail) {
          const detail = err.response.data.detail;
          if (Array.isArray(detail)) {
             setError(`Invalid input: ${detail[0].loc ? detail[0].loc.join('.') + ': ' : ''}${detail[0].msg}`);
          } else if (typeof detail === 'string') {
             setError(detail);
          } else {
             setError('An unexpected error occurred during validation.');
          }
      } else if (err.request) {
          setError('Could not reach the server. Please check your connection.');
      } else {
         setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };


  return (
    <section className="mb-10 p-6 bg-gray-800 rounded-lg shadow-xl">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4">
        <label htmlFor="url-input" className="sr-only">Enter URL to shorten</label>
        <input
          id="url-input"
          type="url"
          placeholder="Enter the link here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          aria-required="true"
          aria-describedby={error ? "error-message" : undefined}
          className="flex-grow w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-100 placeholder-gray-400 text-lg"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-semibold transition duration-200 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed text-lg"
        >
          {isLoading ? 'Processing...' : 'Shorten Now!'}
        </button>
      </form>
      {error && <p id="error-message" role="alert" className="text-red-400 mt-3 text-sm">{error}</p>}
       {lastResult && (
           <div className="mt-5 p-4 bg-gray-700/50 rounded text-center border border-gray-600">
               <p className="text-gray-300 mb-2">Your shortened link:</p>
               <div className="flex items-center justify-center gap-3 flex-wrap">
                    <a href={lastResult.short_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline break-all text-lg font-medium">
                        {lastResult.short_url.replace(/^https?:\/\//, '')}
                     </a>
                    <CopyToClipboard text={lastResult.short_url} onCopy={handleCopy}>
                        <button
                          title="Copy short link"
                          className={`px-3 py-1 text-sm rounded ${copied ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'} text-white transition-colors duration-150`}
                          >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </CopyToClipboard>
               </div>
           </div>
       )}
    </section>
  );
}

export default UrlShortenerForm;
