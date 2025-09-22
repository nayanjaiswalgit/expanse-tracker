import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api';
import { User, Camera, Lock, Shield, Upload, Edit3 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { ObjectForm } from '../../components/forms';
import { createProfileFormConfig, createPasswordChangeFormConfig } from './forms';
import { ProfileFormData } from './schemas/forms';
import { useToast } from '../../components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const ProfileSettings: React.FC = () => {
  const { state: authState, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);


  const handleProfileUpdate = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedUser = await apiClient.updateUserPreferences(data);
      updateUser(updatedUser);
      showSuccess('Profile Updated', 'Your profile information has been saved successfully.');
    } catch (err: any) {
      console.error('Profile update failed:', err);
      const errorMessage = err.message || err.response?.data?.detail || 'Unable to update your profile. Please try again.';
      setError(errorMessage);
      showError('Update Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile picture must be smaller than 5MB.');
      showError('Upload Failed', 'Profile picture must be smaller than 5MB.');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      showError('Upload Failed', 'Please upload an image file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('profile_picture', file);

      const updatedUser = await apiClient.updateUserPreferences(formData);
      updateUser(updatedUser);
      showSuccess('Profile Picture Updated', 'Your profile picture has been updated successfully.');
    } catch (err: any) {
      console.error('Profile picture upload failed:', err);
      const errorMessage = err.message || err.response?.data?.detail || 'Unable to upload profile picture. Please try again.';
      setError(errorMessage);
      showError('Upload Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (data: { current_password: string; new_password: string; confirm_password: string }) => {
    setPasswordLoading(true);

    try {
      await apiClient.changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      });

      showSuccess('Password changed successfully!');
      setShowPasswordChange(false);
    } catch (error: any) {
      console.error('Password change failed:', error);
      showError(error.message || 'Unable to change your password. Please check your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile & Appearance</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your personal information, profile picture, and security settings
        </p>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <Alert variant="error" title="Error" dismissible onDismiss={() => setError(null)}>
              {error}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {/* Profile Picture Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-start space-x-6">
            <div className="relative group">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center overflow-hidden shadow-lg border-4 border-white dark:border-gray-700">
                {authState.user?.profile_picture ? (
                  <img
                    src={authState.user.profile_picture}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                )}
              </div>

              {/* Upload Overlay */}
              <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                <div className="text-white text-center">
                  <Upload className="h-6 w-6 mx-auto mb-1" />
                  <span className="text-xs font-medium">Upload</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                  disabled={isLoading}
                />
              </label>

              {/* Camera Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-colors duration-200"
                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                disabled={isLoading}
              >
                <Camera className="h-4 w-4" />
              </motion.button>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {authState.user?.full_name || 'Your Name'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {authState.user?.email}
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Upload a professional photo to personalize your profile
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-400">
                  <span>• Max file size: 5MB</span>
                  <span>• Formats: JPG, PNG, GIF</span>
                  <span>• Recommended: 400x400px</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Profile Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-2">
              <Edit3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Update your personal details and contact information</p>
            </div>
          </div>

          <ObjectForm
            config={createProfileFormConfig(
              handleProfileUpdate,
              isLoading,
              {
                full_name: authState.user?.full_name || '',
                email: authState.user?.email || '',
              }
            )}
          />
        </motion.div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-green-100 dark:bg-green-900 rounded-lg p-2">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage your password and account security</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Password Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Password</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Keep your account secure with a strong password</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  variant={showPasswordChange ? "ghost" : "primary"}
                  size="sm"
                  className="min-w-[120px]"
                >
                  {showPasswordChange ? 'Cancel' : 'Change Password'}
                </Button>
              </div>

              <AnimatePresence>
                {showPasswordChange && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4"
                  >
                    <ObjectForm
                      config={createPasswordChangeFormConfig(
                        handlePasswordChange,
                        passwordLoading
                      )}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Two-Factor Authentication */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security to your account</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileSettings;