import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const storedToken = localStorage.getItem('authToken');
if (storedToken) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (token) {
            localStorage.setItem('authToken', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            localStorage.removeItem('authToken');
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    useEffect(() => {
        const handleStorage = (event) => {
            if (event.key === 'authToken') {
                if (!event.newValue) {
                    setToken(null); // Token removed in another tab, log out here
                } else {
                    setToken(event.newValue); // Token added/changed in another tab
                }
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const login = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
            if (response.data && response.data.access_token) {
                setToken(response.data.access_token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
                return true;
            } else {
                throw new Error('Login failed: No token received');
            }
        } catch (err) {
            console.error("Login error:", err);
            setError(err.response?.data?.detail || 'Login failed. Please check credentials.');
            setToken(null); // Ensure token is null on error
            delete axios.defaults.headers.common['Authorization'];
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const register = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/register`, { email, password });
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
        setToken(null);
    }, []);

    const value = {
        token,
        login,
        register,
        logout,
        loading,
        error,
        isAuthenticated: !!token,
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
