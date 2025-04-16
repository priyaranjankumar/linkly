// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // Import BrowserRouter
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Wrap App with BrowserRouter */}
    <BrowserRouter>
      <AuthProvider> {/* Wrap App with AuthProvider */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);