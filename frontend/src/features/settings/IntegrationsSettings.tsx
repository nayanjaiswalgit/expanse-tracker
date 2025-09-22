import React from 'react';
import GmailAccounts from '../finance/GmailAccounts';
import { Mail, Puzzle } from 'lucide-react';
import { motion } from 'framer-motion';

const IntegrationsSettings: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Connect external services to automate your financial workflow
        </p>
      </div>

      {/* Gmail Integration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 dark:bg-red-900/20 rounded-lg p-2">
              <Mail className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gmail Integration</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically extract transactions from email receipts
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <GmailAccounts />
        </div>
      </motion.div>

      {/* Coming Soon */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-blue-100 dark:bg-blue-900/20 rounded-lg p-2">
            <Puzzle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">More Coming Soon</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Additional integrations to enhance your experience
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { name: 'Bank APIs', icon: '🏦' },
            { name: 'Slack', icon: '💬' },
            { name: 'Telegram', icon: '📱' },
            { name: 'Webhooks', icon: '🔗' },
            { name: 'CSV Import', icon: '📊' },
            { name: 'API Access', icon: '🔌' },
          ].map((integration) => (
            <div
              key={integration.name}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center opacity-60"
            >
              <div className="text-xl mb-1">{integration.icon}</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">{integration.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Coming Soon</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default IntegrationsSettings;
