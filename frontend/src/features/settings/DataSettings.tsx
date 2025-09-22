import React, { useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../api/client';
import { Upload, Trash2, Download, Shield, FileText, Database, AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { motion } from 'framer-motion';

const DataSettings: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeRange] = useState('30');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleDataExport = async () => {
    setIsLoading(true);
    
    try {
      const blob = await apiClient.exportTransactions('json');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance-data-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Data Exported', 'Your financial data has been exported successfully.');
    } catch (error) {
      console.error('Data export failed:', error);
      showError('Export Failed', 'Unable to export your data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = async (format: 'csv' | 'json' | 'excel' | 'pdf') => {
    try {
      setIsLoading(true);
      
      // Simplified filters for export
      const exportFilters = {
        dateFrom: selectedTimeRange !== 'all' ? 
          new Date(Date.now() - parseInt(selectedTimeRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
          undefined,
        dateTo: undefined
      };
      
      const blob = await apiClient.exportTransactions(format, undefined, exportFilters);
      
      if (!blob || blob.size === 0) {
        throw new Error('Empty response from server');
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financial-report-${selectedTimeRange}days-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Report Downloaded', `Your financial report has been downloaded in ${format.toUpperCase()} format`);
    } catch (error: unknown) {
      console.error('Export failed:', error);
      const errorMessage = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || (error as Error)?.message || 'Unknown error occurred';
      showError('Export Failed', `Unable to generate report: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataImport = async () => {
    if (!importFile) {
      showError('No File Selected', 'Please select a file to import.');
      return;
    }

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      // Determine import type based on file extension
      const fileName = importFile.name.toLowerCase();
      let importType = 'json';
      if (fileName.endsWith('.csv')) importType = 'csv';
      else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) importType = 'excel';
      
      await apiClient.importTransactions(formData, importType);
      
      setImportFile(null);
      setShowImportModal(false);
      showSuccess('Data Imported', 'Your financial data has been imported successfully.');
      
      // Refresh the page to show imported data
      window.location.reload();
    } catch (error) {
      console.error('Data import failed:', error);
      showError('Import Failed', 'Unable to import your data. Please check the file format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountDeletion = async () => {
    setIsLoading(true);
    
    try {
      await apiClient.deleteUserAccount();
      
      showSuccess('Account Deleted', 'Your account has been permanently deleted.');
      
      // Redirect to login after account deletion
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      console.error('Account deletion failed:', error);
      showError('Deletion Failed', 'Unable to delete your account. Please try again or contact support.');
    } finally {
      setIsLoading(false);
      setShowDeleteConfirmModal(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data & Privacy</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your data exports, imports, and privacy settings
        </p>
      </div>

      <div className="space-y-8">
        {/* Data Export Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-green-100 dark:bg-green-900 rounded-lg p-2">
              <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Export Your Data</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Download a complete backup of your financial data in various formats
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <FileText className="h-4 w-4" />
            <span>Multiple Format Support</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { format: 'json', icon: '📄', label: 'JSON Backup', description: 'Complete data export' },
              { format: 'csv', icon: '📊', label: 'CSV Export', description: 'Spreadsheet compatible' },
              { format: 'excel', icon: '📈', label: 'Excel File', description: 'For analysis' },
              { format: 'pdf', icon: '📕', label: 'PDF Report', description: 'Formatted report' }
            ].map(({ format, icon, label, description }) => (
              <motion.button
                key={format}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => format === 'json' ? handleDataExport() : handleExportReport(format as 'csv' | 'json' | 'excel' | 'pdf')}
                disabled={isLoading}
                className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 disabled:opacity-50"
              >
                <div className="text-3xl mb-2">{icon}</div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm">{label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Data Import Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-2">
              <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import Data</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload financial data from JSON, CSV, or Excel files
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowImportModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Import Data</span>
            </motion.button>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Database className="h-4 w-4" />
            <span>Supports JSON, CSV, and Excel formats</span>
          </div>
        </motion.div>

        {/* Privacy & Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-2">
              <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy & Security</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your privacy settings and data retention preferences
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2">Data Retention</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Your data is stored securely and retained according to your preferences
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-xs p-2 rounded">
                  ✓ All data encrypted at rest and in transit
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2">Data Processing</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Your financial data is processed locally and never shared
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-xs p-2 rounded">
                  ✓ GDPR and privacy compliant
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-red-100 dark:bg-red-900 rounded-lg p-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Danger Zone</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Irreversible actions that will permanently affect your account
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
              onClick={() => setShowDeleteConfirmModal(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Account</span>
            </motion.button>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200 text-sm">Account Deletion</h4>
                <p className="text-red-700 dark:text-red-300 text-xs mt-1">
                  This will permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Import Data Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Financial Data"
      >
        <div className="space-y-6">
          <div className="theme-alert-info">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Supported Formats</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• <strong>JSON:</strong> Complete data export from this application</li>
              <li>• <strong>CSV:</strong> Transaction data in comma-separated format</li>
              <li>• <strong>Excel:</strong> Spreadsheet files (.xlsx, .xls)</li>
            </ul>
          </div>

          <div>
            <label className="theme-form-label mb-2">
              Select File
            </label>
            <input
              type="file"
              accept=".json,.csv,.xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="theme-input transition-all duration-200"
            />
            {importFile && (
              <p className="text-sm theme-text-secondary mt-2">
                Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Importing data will add new transactions to your account. 
              Duplicate transactions may be created if the same data is imported multiple times.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 theme-border-light border-t">
            <button
              onClick={() => setShowImportModal(false)}
              className="theme-btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleDataImport}
              disabled={!importFile || isLoading}
              className="theme-btn-primary text-sm disabled:opacity-50"
            >
              {isLoading ? 'Importing...' : 'Import Data'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="Delete Account"
      >
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <Trash2 className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h4 className="text-lg font-medium text-red-900">Permanent Account Deletion</h4>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">This action cannot be undone.</p>
              </div>
            </div>
          </div>

          <div className="theme-text-primary">
            <p className="mb-4">
              <strong>Deleting your account will permanently remove:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>All your financial transactions and data</li>
              <li>Account settings and preferences</li>
              <li>Goals, budgets, and categories</li>
              <li>Group expenses and lending records</li>
              <li>All uploaded statements and receipts</li>
            </ul>
            <p className="mt-4 text-sm theme-text-secondary">
              <strong>Recommendation:</strong> Export your data before deletion if you want to keep a backup.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 theme-border-light border-t">
            <button
              onClick={() => setShowDeleteConfirmModal(false)}
              className="theme-btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAccountDeletion}
              disabled={isLoading}
              className="theme-btn-danger text-sm disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete My Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DataSettings;
