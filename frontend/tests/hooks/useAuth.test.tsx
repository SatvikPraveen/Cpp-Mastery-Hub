import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { AuthProvider, useAuth } from '../../src/hooks/useAuth';
import { authService } from '../../src/services/auth';

jest.mock('../../src/services/auth', () => ({
  getTokenExpiry: jest.fn(() => null),
  authService: {
    user: null,
    getToken: jest.fn(() => null),
    isTokenExpired: jest.fn(() => false),
    onAuthStateChange: jest.fn(() => () => undefined),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
}));

const mocked = authService as unknown as {
  login: jest.Mock;
  register: jest.Mock;
  logout: jest.Mock;
};

const ada = { id: 'u1', email: 'ada@example.com', username: 'ada', role: 'USER' };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws when used outside an AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useAuth())).toThrow();
    spy.mockRestore();
  });

  it('starts unauthenticated when no token is stored', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('stores the user returned by a successful login', async () => {
    mocked.login.mockResolvedValue({ user: ada, token: 't', expiresIn: 900 });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.login({ email: ada.email, password: 'Secret123!' }));

    expect(mocked.login).toHaveBeenCalledWith({ email: ada.email, password: 'Secret123!' });
    expect(result.current.user).toEqual(ada);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('propagates login failures and keeps the user signed out', async () => {
    mocked.login.mockRejectedValue(new Error('Invalid credentials'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(() => result.current.login({ email: ada.email, password: 'wrong' }))
    ).rejects.toThrow('Invalid credentials');
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('clears the user on logout', async () => {
    mocked.login.mockResolvedValue({ user: ada, token: 't', expiresIn: 900 });
    mocked.logout.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.login({ email: ada.email, password: 'Secret123!' }));
    await act(() => result.current.logout());

    expect(mocked.logout).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
