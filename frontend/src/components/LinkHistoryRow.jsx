import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

function LinkHistoryRow({ link }) { // Removed apiBaseUrl prop, assuming full URL in link object
  const [copied, setCopied] = useState(false);

  // Use the full short_url provided by the backend response
  const fullShortUrl = link.short_url;

  // Function to truncate long URLs for better display
  const truncateUrl = (url, startLength = 30, endLength = 15) => {
    if (!url || url.length <= startLength + endLength + 3) return url;
    // Keep start, add ellipsis, keep end
    return url.substring(0, startLength) + '...' + url.substring(url.length - endLength);
  };

  const handleCopy = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500); // Feedback duration
  };

  // Format date nicely
  const formattedDate = link.created_at
    ? new Date(link.created_at).toLocaleDateString('en-CA') // YYYY-MM-DD format
    : 'N/A';

  return (
    <tr className="hover:bg-gray-700/50 transition-colors duration-150 ease-in-out">
      {/* Short Link & Copy Button */}
      <td className="px-5 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <a
            href={fullShortUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Visit ${fullShortUrl}`}
            className="text-purple-400 hover:text-purple-300 hover:underline font-medium"
            >
            {/* Display relative path or just code */}
            {link.short_code || fullShortUrl?.split('/').pop()}
          </a>
          <CopyToClipboard text={fullShortUrl} onCopy={handleCopy}>
            <button
              title="Copy short link"
              className={`ml-1 px-2 py-0.5 text-xs rounded transition-colors duration-150 ${
                copied ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </CopyToClipboard>
        </div>
      </td>

      {/* Original Link */}
      <td className="px-5 py-4 max-w-xs" title={link.original_url}> {/* Set max width */}
         <a
            href={link.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-200 transition duration-150 block overflow-hidden text-ellipsis whitespace-nowrap" // Style for truncation
          >
            {/* Use a utility or just display truncated */}
             {truncateUrl(link.original_url)}
        </a>
      </td>

      {/* QR Code */}
      <td className="px-5 py-4 text-center align-middle">
        <div className="inline-block p-1 bg-white rounded-sm shadow"> {/* White background for QR */}
            <QRCode
                value={fullShortUrl}
                size={40} // Smaller size for table row
                level="L" // Lower error correction for smaller size
                renderAs="svg" // SVG is usually sharper
                // bgColor="#ffffff" // Background handled by wrapper div
                fgColor="#000000" // Standard black foreground
             />
        </div>
      </td>

      {/* Clicks */}
      <td className="px-5 py-4 text-center align-middle font-mono text-gray-300">{link.visit_count ?? 0}</td>

      {/* Status */}
      <td className="px-5 py-4 text-center align-middle">
        <span
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
            link.status === 'Active'
                ? 'bg-green-200 text-green-800'
                : 'bg-red-200 text-red-800'
            }`}
        >
          {link.status}
        </span>
      </td>

      {/* Date */}
      <td className="px-5 py-4 whitespace-nowrap text-gray-400">{formattedDate}</td>
    </tr>
  );
}

export default LinkHistoryRow;
