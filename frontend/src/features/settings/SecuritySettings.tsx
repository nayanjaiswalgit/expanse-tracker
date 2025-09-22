import React, { useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { ObjectForm } from '../../components/forms';
import { createPasswordChangeFormConfig } from './forms';

const SecuritySettings: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);


  const handlePasswordChange = async (data: { current_password: string; new_password: string; confirm_password: string }) => {
    setIsLoading(true);

    try {
      await apiClient.changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      });

      showSuccess('Password Changed', 'Your password has been updated successfully.');
      setShowPasswordChange(false);
    } catch (error) {
      console.error('Password change failed:', error);
      showError('Password Change Failed', 'Unable to change your password. Please check your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold theme-text-primary mb-6">Security Settings</h2>
      
      {/* Change Password Section */}
      <div className="border-b border-gray-200 pb-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium theme-text-primary">Password</h3>
            <p className="text-sm theme-text-secondary">Keep your account secure with a strong password</p>
          </div>
          <Button
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            variant="secondary"
            size="sm"
          >
            {showPasswordChange ? 'Cancel' : 'Change Password'}
          </Button>
        </div>

        {showPasswordChange && (
          <div className="theme-card p-6 mt-4">
            <ObjectForm
              config={createPasswordChangeFormConfig(
                handlePasswordChange,
                isLoading
              )}
            />
          </div>
        )}
      </div>

      {/* Two-Factor Authentication Section */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium theme-text-primary">Two-Factor Authentication</h3>
            <p className="text-sm theme-text-secondary">Add an extra layer of security to your account</p>
          </div>
          <span className="px-3 py-1 theme-bg-secondary theme-text-muted text-sm rounded-full">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
