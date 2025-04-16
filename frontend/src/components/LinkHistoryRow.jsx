// frontend/src/components/LinkHistoryRow.jsx
import React, { useState } from "react";
import QRCode from "qrcode.react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import ConfirmModal from "./ConfirmModal"; // Import the modal component

// Added onUpdateStatus and onDeleteLink props
function LinkHistoryRow({ link, onUpdateStatus, onDeleteLink }) {
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false); // Row-specific loading state for status toggle
  const [isDeleting, setIsDeleting] = useState(false); // Row-specific loading state for delete
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility

  const fullShortUrl = link.short_url;

  const truncateUrl = (url, startLength = 30, endLength = 15) => {
    if (!url || url.length <= startLength + endLength + 3) return url;
    return (
      url.substring(0, startLength) +
      "..." +
      url.substring(url.length - endLength)
    );
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleToggleClick = async () => {
    if (isUpdating || !link.short_code) return; // Prevent multiple clicks or if no code
    setIsUpdating(true);
    try {
      await onUpdateStatus(link.short_code, link.status);
      // No need to set state here, parent (App.jsx) will update the 'links' prop
    } catch (error) {
      // Error is handled and displayed in App.jsx
      console.error("Row update status caught error (but handled by parent):", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Opens the confirmation modal
  const handleDeleteClick = () => {
    if (isDeleting || isUpdating) return; // Prevent opening if already busy
    setIsModalOpen(true);
  };

  // Called when the user confirms deletion in the modal
  const confirmDelete = async () => {
    setIsModalOpen(false); // Close modal first
    if (isDeleting || !link.id) return; // Prevent multiple clicks or if no id

    setIsDeleting(true);
    try {
      await onDeleteLink(link.id); // Call the handler passed from App.jsx
      // No need to set state here, parent (App.jsx) will update the 'links' prop
    } catch (error) {
      // Error is handled and displayed in App.jsx
      console.error("Row delete link caught error (but handled by parent):", error);
    } finally {
      setIsDeleting(false); // Ensure loading state is reset even on error
    }
  };

  const formattedDate = link.created_at
    ? new Date(link.created_at).toLocaleDateString("en-CA")
    : "N/A";

  const isActive = link.status === "Active";

  return (
    <>
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
              {link.short_code || fullShortUrl?.split("/").pop()}
            </a>
            <CopyToClipboard text={fullShortUrl} onCopy={handleCopy}>
              <button
                title="Copy short link"
                className={`ml-1 px-2 py-0.5 text-xs rounded transition-colors duration-150 ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-gray-600 hover:bg-gray-500 text-gray-200"
                }`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </CopyToClipboard>
          </div>
        </td>

        {/* Original Link */}
        <td className="px-5 py-4 max-w-xs" title={link.original_url}>
          <a
            href={link.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-200 transition duration-150 block overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {truncateUrl(link.original_url)}
          </a>
        </td>

        {/* QR Code */}
        <td className="px-5 py-4 text-center align-middle">
          <div className="inline-block p-1 bg-white rounded-sm shadow">
            <QRCode
              value={fullShortUrl}
              size={40}
              level="L"
              renderAs="svg"
              fgColor="#000000"
            />
          </div>
        </td>

        {/* Clicks */}
        <td className="px-5 py-4 text-center align-middle font-mono text-gray-300">
          {link.visit_count ?? 0}
        </td>

        {/* Status & Action Buttons */}
        <td className="px-5 py-4 text-center align-middle">
          <div className="flex flex-col items-center gap-1">
            {/* Status Badge */}
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
                isActive
                  ? "bg-green-200 text-green-800"
                  : "bg-red-200 text-red-800"
              }`}
            >
              {link.status}
            </span>
            {/* Action Buttons Container */}
            <div className="flex items-center gap-1 mt-1">
                {/* Toggle Button */}
                <button
                  onClick={handleToggleClick}
                  disabled={isUpdating || isDeleting} // Disable if updating or deleting
                  className={`px-2 py-0.5 text-xs rounded transition-colors duration-150 font-medium ${
                    isUpdating
                      ? "bg-gray-500 text-gray-300 cursor-wait"
                      : isActive
                      ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isActive ? 'Deactivate this link' : 'Activate this link'}
                >
                  {isUpdating ? "..." : isActive ? "Deactivate" : "Activate"}
                </button>
                {/* Delete Button - Now opens the modal */}
                <button
                  onClick={handleDeleteClick} // Changed to open modal
                  disabled={isDeleting || isUpdating}
                  className={`px-2 py-0.5 text-xs rounded transition-colors duration-150 font-medium ${
                      isDeleting
                      ? "bg-gray-500 text-gray-300 cursor-wait"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Delete this link permanently"
                >
                  {isDeleting ? "..." : "Delete"}
                </button>
            </div>
          </div>
        </td>

        {/* Date */}
        <td className="px-5 py-4 whitespace-nowrap text-gray-400">
          {formattedDate}
        </td>
      </tr>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)} // Close modal on cancel
        onConfirm={confirmDelete} // Call confirmDelete on confirmation
        title="Confirm Deletion"
        message={`Are you sure you want to permanently delete the link for: ${truncateUrl(link.original_url, 50, 20)}? This action cannot be undone.`}
      />
    </>
  );
}

export default LinkHistoryRow;