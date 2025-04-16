
import React from 'react';

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold text-gray-100 mb-4">{title}</h3>
                <p className="text-sm text-gray-300 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose} // Close the modal on cancel
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-gray-200 font-medium rounded-md transition duration-150 ease-in-out"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm} // Call the confirm handler
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition duration-150 ease-in-out"
                    >
                        Confirm Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;
