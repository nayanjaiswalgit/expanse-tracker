import React, { useState } from 'react';

import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
// Auth not needed for cookie-based requests here
import {
  useBankAccounts,
  useSupportedBanks,
  useParsingHistory,
  useUploadStatement,
  useParseTextStatement,
} from '../../hooks/finance';

interface Account {
  id: string;
  name: string;
  entity_type: string;
  data: {
    type: string;
    balance?: number;
  };
}

interface SupportedBank {
  key: string;
  name: string;
  csv_formats: number;
  indicators: string[];
}

interface ParsingHistory {
  id: string;
  title: string;
  created_at: string;
  file_size: number;
  bank_format: string;
  success: boolean;
  transactions_parsed: number;
  transactions_created: number;
  confidence: number;
  errors: string[];
}

const BankStatementUpload: React.FC = () => {
  const { data: accountsData } = useBankAccounts();
  const { data: banksData } = useSupportedBanks();
  const { data: historyData, refetch: refetchParsingHistory, isLoading: historyLoading } = useParsingHistory();
  const uploadMutation = useUploadStatement();
  const parseTextMutation = useParseTextStatement();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [bankFormat, setBankFormat] = useState<string>('auto');
  const [textContent, setTextContent] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [showTextInput, setShowTextInput] = useState(false);

  const { addToast } = useToast();

  const accounts: Account[] = accountsData?.accounts || [];
  const supportedBanks: SupportedBank[] = banksData?.supported_banks || [];
  const parsingHistory: ParsingHistory[] = historyData?.parsing_history || [];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['.csv', '.txt', '.tsv'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        addToast('Please select a CSV, TXT, or TSV file', 'error');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        addToast('File size must be less than 10MB', 'error');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const uploadStatement = async () => {
    if (!selectedFile) {
      addToast('Please select a file to upload', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      if (selectedAccount) {
        formData.append('account_id', selectedAccount);
      }
      
      if (bankFormat !== 'auto') {
        formData.append('bank_format', bankFormat);
      }
      const data = await uploadMutation.mutateAsync(formData);
      if (data?.success) {
        const result = data.parsing_result;
        addToast(`Successfully imported ${result.created_count} transactions from ${result.parsed_count} parsed entries`, 'success');
        
        // Reset form
        setSelectedFile(null);
        setSelectedAccount('');
        setBankFormat('auto');
        
        // Refresh history
        await refetchParsingHistory();
        
        // Clear file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
      } else {
        addToast((data as any)?.message || 'Failed to parse bank statement', 'error');
      }
    } catch {
      addToast('Error uploading bank statement', 'error');
    } finally {
      setUploading(false);
    }
  };

  const parseTextStatement = async () => {
    if (!textContent.trim()) {
      addToast('Please enter bank statement content', 'error');
      return;
    }

    setUploading(true);
    try {
      const data = await parseTextMutation.mutateAsync({
        content: textContent,
        account_id: selectedAccount || null,
        bank_format: bankFormat !== 'auto' ? bankFormat : null,
      });

      if (data?.success) {
        const result = data.parsing_result;
        addToast(`Successfully parsed ${result.created_count || result.parsed_count || 0} transactions`, 'success');
        
        // Reset form
        setTextContent('');
        setSelectedAccount('');
        setBankFormat('auto');
        setShowTextInput(false);
        
        // Refresh history
        await refetchParsingHistory();
        
      } else {
        addToast((data as any)?.parsing_result?.error || 'Failed to parse bank statement text', 'error');
      }
    } catch {
      addToast('Error parsing bank statement text', 'error');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (success: boolean) => {
    if (success) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const tabs = [
    { id: 'upload', label: 'Upload Statement', icon: Upload },
    { id: 'history', label: 'Parsing History', icon: FileText },
    { id: 'banks', label: 'Supported Banks', icon: CheckCircle },
  ];

  if (historyLoading && activeTab !== 'upload') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
          Bank Statement Import
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Import transactions from bank statements with automatic parsing for major banks
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-8 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-secondary-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                  Upload Bank Statement
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTextInput(!showTextInput)}
                >
                  {showTextInput ? 'Upload File' : 'Paste Text'}
                </Button>
              </div>

              {!showTextInput ? (
                <div className="space-y-4">
                  {/* File Upload */}
                  <div className="border-2 border-dashed border-secondary-300 dark:border-secondary-600 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                    <div className="mb-4">
                      <label
                        htmlFor="file-input"
                        className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-500"
                      >
                        Choose file to upload
                      </label>
                      <input
                        id="file-input"
                        type="file"
                        accept=".csv,.txt,.tsv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                        CSV, TXT, or TSV files up to 10MB
                      </p>
                    </div>
                    
                    {selectedFile && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center justify-center space-x-2">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            {selectedFile.name}
                          </span>
                          <span className="text-sm text-blue-600 dark:text-blue-400">
                            ({formatFileSize(selectedFile.size)})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Text Input */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Paste Bank Statement Content
                    </label>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      rows={10}
                      className="w-full rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-secondary-900 dark:text-secondary-100 font-mono text-sm"
                      placeholder="Paste your bank statement content here (CSV format preferred)..."
                    />
                  </div>
                </div>
              )}

              {/* Configuration Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Account (Optional)
                  </label>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-secondary-900 dark:text-secondary-100"
                  >
                    <option value="">Select account (optional)</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.data.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Bank Format
                  </label>
                  <select
                    value={bankFormat}
                    onChange={(e) => setBankFormat(e.target.value)}
                    className="w-full rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-secondary-900 dark:text-secondary-100"
                  >
                    <option value="auto">Auto-detect</option>
                    {supportedBanks.map((bank) => (
                      <option key={bank.key} value={bank.key}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload Button */}
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={showTextInput ? parseTextStatement : uploadStatement}
                  disabled={uploading || (!selectedFile && !textContent.trim())}
                >
                  {uploading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? 'Processing...' : (showTextInput ? 'Parse Text' : 'Upload & Parse')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                  Parsing History
                </h3>
                <Button variant="ghost" size="sm" onClick={() => refetchParsingHistory()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {parsingHistory.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                    No Statements Processed
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400">
                    Upload your first bank statement to see parsing history.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {parsingHistory.map((item) => (
                    <div key={item.id} className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusIcon(item.success, item.confidence)}
                            <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                              {item.title}
                            </h4>
                            <span className="px-2 py-1 text-xs bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 rounded">
                              {item.bank_format}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">Parsed:</span>
                              <span className="ml-2 font-medium">{item.transactions_parsed}</span>
                            </div>
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">Created:</span>
                              <span className="ml-2 font-medium">{item.transactions_created}</span>
                            </div>
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">Size:</span>
                              <span className="ml-2 font-medium">{formatFileSize(item.file_size)}</span>
                            </div>
                            <div>
                              <span className="text-secondary-600 dark:text-secondary-400">Date:</span>
                              <span className="ml-2 font-medium">
                                {new Date(item.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          {item.errors && item.errors.length > 0 && (
                            <div className="mt-2">
                              <details className="text-sm">
                                <summary className="cursor-pointer text-red-600 dark:text-red-400">
                                  {item.errors.length} error{item.errors.length > 1 ? 's' : ''}
                                </summary>
                                <div className="mt-2 space-y-1">
                                  {item.errors.slice(0, 3).map((error, index) => (
                                    <p key={index} className="text-red-600 dark:text-red-400 text-xs">
                                      {error}
                                    </p>
                                  ))}
                                </div>
                              </details>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2 ml-4">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Supported Banks Tab */}
      {activeTab === 'banks' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                Supported Bank Formats
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {supportedBanks.map((bank) => (
                  <div key={bank.key} className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                        {bank.name}
                      </h4>
                    </div>
                    
                    <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-2">
                      {bank.csv_formats} CSV format{bank.csv_formats > 1 ? 's' : ''} supported
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      {bank.indicators.map((indicator, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded"
                        >
                          {indicator}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Don't see your bank?
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  The system can automatically detect and parse most CSV formats using AI. 
                  If your bank isn't listed, try uploading your statement - it will likely work anyway!
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BankStatementUpload;