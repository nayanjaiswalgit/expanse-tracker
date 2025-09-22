import React from 'react';
import { Lock } from 'lucide-react';
import { ObjectForm } from './ObjectForm';
import { createPasswordPromptFormConfig } from '../../shared/forms';
import { PasswordPromptFormData } from '../../shared/schemas';

interface PasswordPromptFormProps {
  filename: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const PasswordPromptForm: React.FC<PasswordPromptFormProps> = ({
  filename,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const handleSubmit = async (data: PasswordPromptFormData) => {
    onSubmit(data.password);
  };

  const formConfig = createPasswordPromptFormConfig(handleSubmit, filename, onCancel);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
        <div className="flex items-center mb-4">
          <Lock className="h-6 w-6 text-yellow-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Password Protected File
          </h3>
        </div>

        <ObjectForm
          config={{
            ...formConfig,
            className: 'space-y-4'
          }}
        />
      </div>
    </div>
  );
};