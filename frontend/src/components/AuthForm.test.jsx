import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthForm from './AuthForm';
import { AuthContext } from '../context/AuthContext';

const mockLogin = vi.fn();
const mockRegister = vi.fn();

function renderWithAuthContext(mode) {
  return render(
    <AuthContext.Provider value={{
      login: mockLogin,
      register: mockRegister,
      loading: false,
      error: null,
      isAuthenticated: false
    }}>
      <AuthForm mode={mode} />
    </AuthContext.Provider>
  );
}

describe('AuthForm', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockRegister.mockReset();
  });

  it('renders login form and submits', async () => {
    renderWithAuthContext('login');
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password'));
  });

  it('renders register form and submits', async () => {
    renderWithAuthContext('register');
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'newpass' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith('new@example.com', 'newpass'));
  });

  it('shows error message', () => {
    render(
      <AuthContext.Provider value={{
        login: mockLogin,
        register: mockRegister,
        loading: false,
        error: 'Test error',
        isAuthenticated: false
      }}>
        <AuthForm mode="login" />
      </AuthContext.Provider>
    );
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });
});
