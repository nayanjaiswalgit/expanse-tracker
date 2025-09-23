import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import { useObjectForm } from '../../hooks/useObjectForm';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/ui/Button';
import { createPreferencesFormConfig } from './forms';
import { PreferencesFormData } from './schemas/forms';
import { Globe, Bell, Palette, Clock, DollarSign, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCurrency } from '../finance/hooks/queries/useCurrency';

const PreferencesSettings: React.FC = () => {
  const { state: authState, updateUser } = useAuth();
  const { setTheme } = useTheme();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { currencies } = useCurrency();

  const handlePreferencesUpdate = async (data: PreferencesFormData) => {
    setIsLoading(true);

    try {
      console.log('Updating preferences with data:', data);
      const updatedUser = await apiClient.updateUserPreferences(data);
      updateUser(updatedUser);

      // Update theme context if theme was changed
      if (data.theme) {
        setTheme(data.theme);
      }

      showSuccess('Preferences Updated', 'Your preferences have been saved successfully.');
    } catch (error) {
      console.error('Preferences update failed:', error);
      console.error('Error details:', error.response?.data || error);
      showError('Update Failed', 'Unable to update your preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formConfig = createPreferencesFormConfig(
    handlePreferencesUpdate,
    isLoading,
    {
      preferred_currency: authState.user?.preferred_currency || 'USD',
      preferred_date_format: authState.user?.preferred_date_format || 'YYYY-MM-DD',
      timezone: authState.user?.timezone || 'America/New_York',
      language: authState.user?.language || 'en',
      theme: authState.user?.theme || 'system',
      notifications_enabled: authState.user?.notifications_enabled ?? true,
      email_notifications: authState.user?.email_notifications ?? true,
      push_notifications: authState.user?.push_notifications ?? false,
    },
    currencies
  );

  const { form, submit, isFieldVisible } = useObjectForm(formConfig);
  const { control, formState: { errors } } = form;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit();
  };

  const getFieldsBySection = () => {
    const regionalFields = ['preferred_currency', 'preferred_date_format', 'timezone', 'language'];
    const appearanceFields = ['theme'];
    const notificationFields = ['notifications_enabled', 'email_notifications', 'push_notifications'];

    return {
      regional: formConfig.fields.filter(field => regionalFields.includes(field.name)),
      appearance: formConfig.fields.filter(field => appearanceFields.includes(field.name)),
      notifications: formConfig.fields.filter(field => notificationFields.includes(field.name)),
    };
  };

  const fieldsBySection = getFieldsBySection();


  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Preferences</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Customize your app experience, regional settings, and notifications
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Regional Settings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-2">
              <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Regional Settings</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Configure your location, currency, and date preferences</p>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <DollarSign className="h-4 w-4" />
                <span>Currency & Formatting</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fieldsBySection.regional
                  .filter(field => ['preferred_currency', 'preferred_date_format'].includes(field.name))
                  .filter(field => isFieldVisible(field))
                  .map((fieldConfig) => (
                    <FormField
                      key={fieldConfig.name}
                      name={fieldConfig.name as any}
                      control={control}
                      error={errors[fieldConfig.name]}
                      config={fieldConfig}
                      disabled={isLoading}
                    />
                  ))}
              </div>
            </div>

            <div className="pb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <Clock className=" w-4" />
                <span>Time & Language</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fieldsBySection.regional
                  .filter(field => ['timezone', 'language'].includes(field.name))
                  .filter(field => isFieldVisible(field))
                  .map((fieldConfig) => (
                    <FormField
                      key={fieldConfig.name}
                      name={fieldConfig.name as any}
                      control={control}
                      error={errors[fieldConfig.name]}
                      config={fieldConfig}
                      disabled={isLoading}
                    />
                  ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Appearance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-2">
              <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Choose your preferred color scheme and theme</p>
            </div>
          </div>

          <div className="space-y-4">
            {fieldsBySection.appearance
              .filter(field => isFieldVisible(field))
              .map((fieldConfig) => (
                <FormField
                  key={fieldConfig.name}
                  name={fieldConfig.name as any}
                  control={control}
                  error={errors[fieldConfig.name]}
                  config={fieldConfig}
                  disabled={isLoading}
                />
              ))}
          </div>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-green-100 dark:bg-green-900 rounded-lg p-2">
              <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage how you receive notifications and updates</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Mail className="h-4 w-4" />
            <span>Email & Push Preferences</span>
          </div>

          <div className="space-y-4">
            {fieldsBySection.notifications
              .filter(field => isFieldVisible(field))
              .map((fieldConfig) => (
                <FormField
                  key={fieldConfig.name}
                  name={fieldConfig.name as any}
                  control={control}
                  error={errors[fieldConfig.name]}
                  config={fieldConfig}
                  disabled={isLoading}
                />
              ))}
          </div>
        </motion.div>

        {/* Form Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-end"
        >
          <Button
            type="submit"
            loading={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            Save Preferences
          </Button>
        </motion.div>
      </form>
    </div>
  );
};

export default PreferencesSettings;