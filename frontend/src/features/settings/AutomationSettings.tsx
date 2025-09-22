import React from 'react';
import AutomationRules from './AutomationRules';
import MerchantPatterns from '../finance/MerchantPatterns';
import { Zap, Target, ShoppingBag, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const AutomationSettings: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Automation Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Set up automated rules and patterns to streamline your financial data processing
        </p>
      </div>

      <div className="space-y-8">
        {/* Transaction Processing Rules Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-2">
              <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction Processing Rules</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically categorize, tag, or modify transactions based on custom criteria
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Target className="h-4 w-4" />
            <span>Smart Rules & Conditions</span>
          </div>

          <AutomationRules />
        </motion.div>

        {/* Merchant Categorization Patterns Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-green-100 dark:bg-green-900 rounded-lg p-2">
              <ShoppingBag className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Merchant Categorization Patterns</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage patterns for merchants to ensure consistent categorization of your spending
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Settings className="h-4 w-4" />
            <span>Pattern Management</span>
          </div>

          <MerchantPatterns />
        </motion.div>
      </div>
    </div>
  );
};

export default AutomationSettings;
