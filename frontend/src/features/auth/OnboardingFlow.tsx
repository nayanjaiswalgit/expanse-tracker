import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useCompleteOnboardingStep } from '../../hooks/auth';

const OnboardingFlow: React.FC = () => {
  const { authState, fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const completeStep = useCompleteOnboardingStep();

  const [currentStep, setCurrentStep] = useState(1); // Start at step 1: Welcome
  const [profileData, setProfileData] = useState({
    default_currency: authState.user?.profile?.default_currency || 'USD',
    timezone: authState.user?.profile?.timezone || 'UTC',
    language: authState.user?.profile?.language || 'en',
  });

  const handleNextStep = async (data: any) => {
    try {
      const res = await completeStep.mutateAsync({
        ...data,
        onboarding_step: currentStep + 1,
      });
      showSuccess('Progress Saved!', 'Your preferences have been updated.');
      await fetchUserProfile();
      if (currentStep === 1) {
        setCurrentStep(2);
      } else if (currentStep === 2) {
        setCurrentStep(3);
      } else {
        showSuccess('Onboarding Complete!', 'Welcome to your dashboard!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      showError('Error', error?.response?.data?.error || 'An unexpected error occurred.');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-md w-full"
          >
            <h2 className="text-3xl font-bold mb-4">Welcome to Finance Tracker!</h2>
            <p className="text-lg mb-6">
              Let's get you set up to take control of your finances.
            </p>
            <Button onClick={() => handleNextStep({})} size="lg">
              Get Started
            </Button>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full"
          >
            <h2 className="text-2xl font-bold mb-4 text-center">Profile Setup</h2>
            <p className="text-md mb-6 text-center">
              Tell us a bit about your preferences.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleNextStep(profileData);
            }} className="space-y-4">
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Currency</label>
                <select
                  id="currency"
                  name="currency"
                  value={profileData.default_currency}
                  onChange={(e) => setProfileData({ ...profileData, default_currency: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="USD">USD - United States Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
              </div>
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                <input
                  type="text"
                  id="timezone"
                  name="timezone"
                  value={profileData.timezone}
                  onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  placeholder="e.g., America/New_York"
                />
              </div>
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                <select
                  id="language"
                  name="language"
                  value={profileData.language}
                  onChange={(e) => setProfileData({ ...profileData, language: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
              <Button type="submit" size="lg" className="w-full">
                Save & Continue
              </Button>
            </form>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4"
    >
      {renderStep()}
    </motion.div>
  );
};

export default OnboardingFlow;
