import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { apiClient } from '../api/client';
import { safeLog } from '../utils/logger';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User };

const initialState: AuthState = {
  user: null,
  isLoading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { ...state, user: action.payload, isLoading: false, error: null };
    case 'LOGIN_FAILURE':
      return { ...state, user: null, isLoading: false, error: action.payload };
    case 'LOGOUT':
      return { ...state, user: null, isLoading: false, error: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  googleLogin: () => Promise<{ success: boolean; error?: string }>;
  handleGoogleCallback: (code: string, state: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: User) => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check for existing user on mount
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        try {
          // Try to get current user (cookies will be sent automatically)
          const user = await apiClient.getCurrentUser();
          dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        } catch (error) {
          // If current user fails, try to refresh token first
          try {
            await apiClient.refreshToken();
            const user = await apiClient.getCurrentUser();
            dispatch({ type: 'LOGIN_SUCCESS', payload: user });
            localStorage.setItem('user', JSON.stringify(user));
          } catch (refreshError) {
            // Both current user and refresh failed, clear storage
            localStorage.removeItem('user');
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    // Listen for token expiration events from API client
    const handleTokenExpired = () => {
      dispatch({ type: 'LOGOUT' });
    };

    // Check token validity when page becomes visible again
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            await apiClient.getCurrentUser();
          } catch (error) {
            // Try to refresh token first
            try {
              await apiClient.refreshToken();
              const user = await apiClient.getCurrentUser();
              dispatch({ type: 'UPDATE_USER', payload: user });
              localStorage.setItem('user', JSON.stringify(user));
            } catch (refreshError) {
              // Token refresh failed, trigger logout
              dispatch({ type: 'LOGOUT' });
              localStorage.removeItem('user');
            }
          }
        }
      }
    };

    window.addEventListener('auth-token-expired', handleTokenExpired);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    initializeAuth();

    // Cleanup event listeners
    return () => {
      window.removeEventListener('auth-token-expired', handleTokenExpired);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await apiClient.login(email, password);
      
      // With httpOnly cookies, tokens are automatically stored securely by the server
      localStorage.setItem('user', JSON.stringify(response.user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: response.user });
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.non_field_errors?.[0] ||
                          error.message ||
                          'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const { user } = await apiClient.register(email, password, fullName);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.email?.[0] ||
                          error.response?.data?.password?.[0] ||
                          error.response?.data?.error ||
                          'Registration failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const googleLogin = async () => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const { auth_url } = await apiClient.getGoogleAuthUrl();
      // Redirect to Google OAuth
      window.location.href = auth_url;
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Google login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const handleGoogleCallback = async (code: string, state: string) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const { user } = await apiClient.googleLogin(code, state);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Google login callback failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      safeLog.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateUser = (user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
    localStorage.setItem('user', JSON.stringify(user));
  };

  const refreshAuth = async () => {
    try {
      // First try to refresh tokens, then get current user
      await apiClient.refreshToken();
      const user = await apiClient.getCurrentUser();
      dispatch({ type: 'UPDATE_USER', payload: user });
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      // If refresh fails, logout the user
      dispatch({ type: 'LOGOUT' });
      localStorage.removeItem('user');
      throw error;
    }
  };

  const value = {
    state,
    login,
    register,
    googleLogin,
    handleGoogleCallback,
    logout,
    clearError,
    updateUser,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}