import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create a dedicated Axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL
});

// --- Remove setting default header on initial load ---
// const storedToken = localStorage.getItem('authToken');
// if (storedToken) {
//     apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
// }

// Add a request interceptor to attach the token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        // console.log('Interceptor added header:', config.headers.Authorization);
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem('authToken')); // Initialize state directly
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Effect to update localStorage when token state changes
    useEffect(() => {
        if (token) {
            localStorage.setItem('authToken', token);
            // --- Remove setting default header here ---
            // apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            localStorage.removeItem('authToken');
            // --- Remove deleting default header here ---
            // delete apiClient.defaults.headers.common['Authorization'];
        }
    }, [token]);

    // Effect to sync between tabs
    useEffect(() => {
        const handleStorage = (event) => {
            if (event.key === 'authToken') {
                const newToken = event.newValue;
                setToken(newToken); // Update state based on storage change
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const login = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            // Use the apiClient instance for the request
            const response = await apiClient.post(`/auth/login`, { email, password });
            if (response.data && response.data.access_token) {
                setToken(response.data.access_token);
                // --- Remove setting default header here ---
                // apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
                return true;
            } else {
                throw new Error('Login failed: No token received');
            }
        } catch (err) {
            console.error("Login error:", err);
            setError(err.response?.data?.detail || 'Login failed. Please check credentials.');
            setToken(null); // Ensure token is null on error
             // --- Remove deleting default header here ---
            // delete apiClient.defaults.headers.common['Authorization'];
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const register = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            // Use the apiClient instance
            await apiClient.post(`/auth/register`, { email, password });
            // Auto-login after registration
            const loginSuccess = await login(email, password); // login already uses apiClient
            return loginSuccess;
        } catch (err) {
            console.error("Registration error:", err);
            setError(err.response?.data?.detail || 'Registration failed.');
            return false;
        } finally {
            setLoading(false);
        }
    }, [login]);

    const logout = useCallback(() => {
        setToken(null); // This triggers the useEffect to remove from localStorage
    }, []);

    const value = {
        token,
        login,
        register,
        logout,
        loading,
        error,
        isAuthenticated: !!token,
        apiClient // Expose the configured apiClient instance if needed elsewhere
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Export the configured apiClient so other parts of the app can use it
export { apiClient };
