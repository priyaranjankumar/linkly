// frontend/src/components/LinkHistoryTable.jsx
import React from "react";
import LinkHistoryRow from "./LinkHistoryRow";

// Added onUpdateStatus prop
function LinkHistoryTable({ links, loading, apiBaseUrl, onUpdateStatus }) {
  return (
    <section className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
      <h2 className="text-xl font-semibold p-4 border-b border-gray-700 text-gray-200">
        Shortened URL History
      </h2>
      <div className="overflow-x-auto">
        {loading && (
          <p className="p-6 text-center text-gray-400">Loading history...</p>
        )}
        {!loading && links.length === 0 && (
          <p className="p-6 text-center text-gray-500">
            You haven't shortened any links yet.
          </p>
        )}
        {!loading && links.length > 0 && (
          <table className="w-full text-left text-sm table-auto">
            <thead className="bg-gray-700 text-gray-400 uppercase tracking-wider text-xs">
              <tr>
                <th scope="col" className="px-5 py-3">
                  Short Link
                </th>
                <th scope="col" className="px-5 py-3">
                  Original Link
                </th>
                <th scope="col" className="px-5 py-3 text-center">
                  QR Code
                </th>
                <th scope="col" className="px-5 py-3 text-center">
                  Clicks
                </th>
                {/* Status column header is already there */}
                <th scope="col" className="px-5 py-3 text-center">
                  Status / Action
                </th>
                <th scope="col" className="px-5 py-3">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 text-gray-300">
              {links.slice(0, 50).map((link) => (
                <LinkHistoryRow
                  key={link.id || link.short_code}
                  link={link}
                  apiBaseUrl={apiBaseUrl}
                  onUpdateStatus={onUpdateStatus} // Pass handler down
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading && links.length > 50 && (
        <p className="p-4 text-center text-xs text-gray-500">
          Showing latest 50 entries.
        </p>
      )}
    </section>
  );
}

export default LinkHistoryTable;