// frontend/src/components/InactiveLinkPage.jsx
import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';

function InactiveLinkPage() {
  const [searchParams] = useSearchParams();
  const shortCode = searchParams.get('code');

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-200 px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 text-yellow-400 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h2 className="text-2xl font-semibold text-gray-100 mb-3">Link Inactive</h2>
        <p className="text-gray-400 mb-6">
          The short link associated with the code{' '}
          {shortCode ? (
            <code className="bg-gray-700 px-1.5 py-0.5 rounded text-purple-300 font-mono">
              {shortCode}
            </code>
          ) : (
            '(unknown)'
          )}{' '}
          is currently inactive.
        </p>
        <p className="text-gray-400 mb-8">
          Please activate it in your Linkly history to enable redirection.
        </p>
        <Link
          to="/" // Link back to the main application page
          className="inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-semibold transition duration-200 ease-in-out"
        >
          Go to Linkly Home
        </Link>
      </div>
    </div>
  );
}

export default InactiveLinkPage;