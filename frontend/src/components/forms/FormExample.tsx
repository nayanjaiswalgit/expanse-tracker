import React from 'react';
import { ObjectForm } from './ObjectForm';
import { createAccountFormConfig } from '../../features/finance/forms';
import { createLoginFormConfig } from '../../features/auth/forms';
import { createProfileFormConfig } from '../../features/settings/forms';
import { AccountFormData } from '../../features/finance/schemas';
import { LoginFormData } from '../../features/auth/schemas';
import { ProfileFormData } from '../../features/settings/schemas';

export const FormExample: React.FC = () => {
  const handleAccountSubmit = async (data: AccountFormData) => {
    console.log('Account Form Data:', data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('Account created successfully!');
  };

  const handleLoginSubmit = async (data: LoginFormData) => {
    console.log('Login Form Data:', data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('Login successful!');
  };

  const handleProfileSubmit = async (data: ProfileFormData) => {
    console.log('Profile Form Data:', data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('Profile updated successfully!');
  };

  const accountConfig = createAccountFormConfig(handleAccountSubmit);
  const loginConfig = createLoginFormConfig(handleLoginSubmit);
  const profileConfig = createProfileFormConfig(handleProfileSubmit);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Object-Driven Form Examples
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Demonstration of react-hook-form with object-driven configuration
        </p>
      </div>

      {/* Login Form Example */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Login Form
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Simple login form with email and password validation.
        </p>
        <ObjectForm config={loginConfig} />
      </div>

      {/* Account Creation Form Example */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Account Creation Form
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Complex form with various field types, conditional logic, and advanced validation.
        </p>
        <ObjectForm config={accountConfig} />
      </div>

      {/* Profile Form Example */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Profile Settings Form
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          User profile form with optional fields and URL validation.
        </p>
        <ObjectForm config={profileConfig} />
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Benefits of Object-Driven Forms
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              ✅ Type Safety
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Full TypeScript support with Zod schema validation ensures type safety from form definition to submission.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              🎯 Consistency
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Standardized form behavior, styling, and validation across the entire application.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              🔄 Reusability
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Form configurations can be shared, extended, and reused across different components.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              ⚡ Performance
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Optimized re-renders with react-hook-form and intelligent field change detection.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              🎨 Flexibility
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Support for conditional fields, dynamic layouts, and custom field types.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              🛠️ Developer Experience
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Intuitive API for creating forms with minimal boilerplate code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};