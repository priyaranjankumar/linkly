import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function AuthForm({ mode, onSwitchMode }) { // mode can be 'login' or 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [registrationSuccess, setRegistrationSuccess] = useState(false); // State for success message
    const { login, register, loading, error } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setRegistrationSuccess(false); // Clear success message on new submission

        if (mode === 'login') {
            await login(email, password);
        } else {
            const success = await register(email, password);
            if (success) {
                // Auto-login after registration
                await login(email, password);
                setRegistrationSuccess(true); // Show success message (optional, but will redirect on login)
                setEmail('');
                setPassword('');
            }
        }
    };

    const title = mode === 'login' ? 'Login' : 'Register';
    const switchText = mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login';

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">{title}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor={`${mode}-email`} className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                    <input
                        type="email"
                        id={`${mode}-email`}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="you@example.com"
                    />
                </div>
                <div>
                    <label htmlFor={`${mode}-password`} className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                    <input
                        type="password"
                        id={`${mode}-password`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="••••••••"
                    />
                </div>

                {/* Display Registration Success Message */}
                {registrationSuccess && mode === 'register' && (
                    <p className="text-sm text-green-400 bg-green-900/30 p-2 rounded">
                        Registration successful! You are now logged in.
                    </p>
                )}

                {/* Display Login/Registration Error Message */}
                {error && !registrationSuccess && (
                     <p className="text-sm text-red-400">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-wait"
                >
                    {loading ? 'Processing...' : title}
                </button>
            </form>
            {onSwitchMode && (
                <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={onSwitchMode}
                        className="text-purple-400 hover:underline text-sm"
                    >
                        {switchText}
                    </button>
                </div>
            )}
        </div>
    );
}

export default AuthForm;
