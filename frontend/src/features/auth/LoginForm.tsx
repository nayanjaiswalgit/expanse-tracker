import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, CheckCircle, BarChart3, Users, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ObjectForm } from '../../components/forms';
import { createLoginFormConfig, createRegisterFormConfig } from './forms';
import { LoginFormData, RegisterFormData } from './schemas';
import { Button } from '../../components/ui/Button';
import clsx from 'clsx';

export const LoginForm = () => {
  const [isRegister, setIsRegister] = useState(false);
  const { state, login, register, googleLogin, clearError } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if user is already logged in
  useEffect(() => {
    if (state.user && !state.isLoading) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [state.user, state.isLoading, navigate, location]);

  const handleLogin = async (data: LoginFormData) => {
    clearError();
    const result = await login(data.email, data.password);

    if (result.success) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    clearError();
    const result = await register(data.email, data.password, data.fullName);

    if (result.success) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  };

  const handleGoogleLogin = async () => {
    await googleLogin();
  };

  const loginConfig = createLoginFormConfig(handleLogin, state.isLoading);
  const registerConfig = createRegisterFormConfig(handleRegister, state.isLoading);

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {isRegister ? 'Create Account' : 'Welcome Back'}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {isRegister
                  ? 'Start your financial journey with us'
                  : 'Sign in to access your financial dashboard'
                }
              </p>
            </motion.div>
          </div>

          {/* Error Message */}
          {state.error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-md bg-red-50 dark:bg-red-900/20 p-4"
            >
              <p className="text-sm text-red-800 dark:text-red-200">
                {state.error}
              </p>
            </motion.div>
          )}

          {/* Form */}
          <motion.div
            key={isRegister ? 'register' : 'login'}
            initial={{ opacity: 0, x: isRegister ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRegister ? -20 : 20 }}
            transition={{ duration: 0.4 }}
          >
            <ObjectForm
              config={isRegister ? registerConfig : loginConfig}
              className="space-y-6"
            />
          </motion.div>

          {/* Google Sign In */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={handleGoogleLogin}
                disabled={state.isLoading}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign {isRegister ? 'up' : 'in'} with Google
              </Button>
            </div>
          </div>

          {/* Toggle Login/Register */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {isRegister ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>

          {/* Theme Toggle */}
          <div className="flex justify-center">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Right side - Features showcase */}
      <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-md text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="flex justify-center mb-8">
              <div className="p-3 bg-blue-600 rounded-full">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Smart Financial Management
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Track expenses, set budgets, and achieve your financial goals with our intelligent platform.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center text-left">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Automated expense tracking
              </span>
            </div>
            <div className="flex items-center text-left">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                AI-powered financial insights
              </span>
            </div>
            <div className="flex items-center text-left">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Secure bank-level encryption
              </span>
            </div>
            <div className="flex items-center text-left">
              <Users className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Collaborative budget planning
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};