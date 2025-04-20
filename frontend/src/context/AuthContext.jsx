import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create a dedicated Axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL
});

// Add a request interceptor to attach the token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Helper function to decode JWT payload (basic)
const decodeToken = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Failed to decode token:", error);
        return null;
    }
};


export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem('authToken'));
    const [currentUser, setCurrentUser] = useState(null); // State for user info
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Effect to update localStorage and decode token when token state changes
    useEffect(() => {
        if (token) {
            localStorage.setItem('authToken', token);
            const decoded = decodeToken(token);
             // Assuming email is in 'sub' claim based on backend code
            setCurrentUser(decoded ? { email: decoded.sub } : null);
        } else {
            localStorage.removeItem('authToken');
            setCurrentUser(null); // Clear user info on logout
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
            const response = await apiClient.post(`/auth/login`, { email, password });
            if (response.data && response.data.access_token) {
                setToken(response.data.access_token); // This triggers useEffect to decode
                return true;
            } else {
                throw new Error('Login failed: No token received');
            }
        } catch (err) {
            console.error("Login error:", err);
            setError(err.response?.data?.detail || 'Login failed. Please check credentials.');
            setToken(null); // Ensure token is null on error
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const register = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            await apiClient.post(`/auth/register`, { email, password });
            // Auto-login after registration
            const loginSuccess = await login(email, password);
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
        setToken(null); // This triggers the useEffect to remove from localStorage & clear user
    }, []);

    const value = {
        token,
        currentUser, // Provide current user info
        login,
        register,
        logout,
        loading,
        error,
        isAuthenticated: !!token,
        apiClient
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
