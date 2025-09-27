import React, { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Wallet,
  Building,
  Eye,
  EyeOff,
  Upload as UploadIcon,
  FileText,
  History,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SummaryCards } from "../../components/ui/SummaryCards";
import { FinancePageHeader } from "../../components/ui/FinancePageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency } from "../../utils/preferences";
import { Modal } from "../../components/ui/Modal";
import { Upload } from "./Upload";
import { UploadList } from "./UploadList";
import { BalanceHistory } from "./BalanceHistory";
import { Button } from "../../components/ui/Button";
import type { Account } from "../../types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useBalanceRecords } from "./hooks/queries/useAccounts";
import { Alert } from "../../components/ui/Alert";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";
import type { UploadSession } from "../../types";

// Object-driven form imports
import { ObjectForm } from "../../components/forms/ObjectForm";
import { createAccountManagementFormConfig } from "./forms";
import { AccountManagementFormData } from "./schemas";


const accountTypeIcons = {
  checking: Building,
  savings: PiggyBank,
  credit: CreditCard,
  investment: TrendingUp,
  loan: Building,
  cash: Wallet,
  other: Building,
};

const accountTypeColors = {
  checking: "bg-blue-100 text-blue-600",
  savings: "bg-green-100 text-green-600",
  credit: "bg-red-100 text-red-600",
  investment: "bg-purple-100 text-purple-600",
  loan: "bg-orange-100 text-orange-600",
  cash: "bg-gray-100 text-gray-600",
  other: "bg-gray-100 text-gray-600",
};

const accountStatusConfig = {
  active: {
    icon: "🟢",
    label: "Active",
    color: "bg-green-100 text-green-700 border-green-200"
  },
  inactive: {
    icon: "🟡",
    label: "Inactive",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200"
  },
  closed: {
    icon: "🔴",
    label: "Closed",
    color: "bg-red-100 text-red-700 border-red-200"
  },
  frozen: {
    icon: "🧊",
    label: "Frozen",
    color: "bg-blue-100 text-blue-700 border-blue-200"
  },
  pending: {
    icon: "⏳",
    label: "Pending",
    color: "bg-gray-100 text-gray-700 border-gray-200"
  },
};

const accountPriorityConfig = {
  low: {
    icon: "🔵",
    label: "Low",
    color: "bg-blue-50 text-blue-600 border-blue-200"
  },
  medium: {
    icon: "🟡",
    label: "Medium",
    color: "bg-yellow-50 text-yellow-600 border-yellow-200"
  },
  high: {
    icon: "🟠",
    label: "High",
    color: "bg-orange-50 text-orange-600 border-orange-200"
  },
  critical: {
    icon: "🔴",
    label: "Critical",
    color: "bg-red-50 text-red-600 border-red-200"
  },
};

const CompactUploadList: React.FC = () => {
  const [sessions, setSessions] = React.useState<UploadSession[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await apiClient.getUploadSessions();
        setSessions(data.slice(0, 10)); // Only show last 10 uploads
      } catch (error) {
        console.error('Failed to load upload sessions:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center p-8 text-slate-500 dark:text-slate-400">
        <FileText className="h-8 w-8 mx-auto mb-2 text-slate-400" />
        <p className="text-sm">No uploads yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <div key={session.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              {session.status === 'completed' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : session.status === 'failed' ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : session.status === 'processing' ? (
                <Clock className="h-4 w-4 text-blue-500 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {session.original_filename}
              </p>
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{session.file_type.toUpperCase()}</span>
                {session.account_name && <span>→ {session.account_name}</span>}
                {session.total_transactions > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    {session.successful_imports} imported
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="text-xs text-slate-400">
            {new Date(session.created_at).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
};

export const AccountsManagement = () => {
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: accounts = [],
    isLoading: isLoadingAccounts,
    error: accountsError,
  } = useQuery<Account[], Error>({
    queryKey: ["accounts"],
    queryFn: () => apiClient.getAccounts(),
  });

  const { data: currencies = [] } = useQuery<{ code: string; name: string }[], Error>({
    queryKey: ["currencies"],
    queryFn: () => apiClient.getCurrencies(),
  });

  const createAccountMutation = useMutation<
    Account,
    Error,
    Omit<Account, "id" | "user_id" | "created_at" | "updated_at">
  >({
    mutationFn: async (accountData) => {
      console.log('Mutation function called with:', accountData);
      console.log('apiClient:', apiClient);
      console.log('apiClient.createAccount:', apiClient.createAccount);

      // Call the method with explicit binding
      const result = await apiClient.createAccount.call(apiClient, accountData);
      console.log('Account creation result:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setShowAddModal(false);
    },
  });

  const updateAccountMutation = useMutation<
    Account,
    Error,
    { id: number; account: Partial<Account> }
  >({
    mutationFn: (variables) =>
      apiClient.updateAccount(variables.id, variables.account),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setShowAddModal(false);
    },
  });

  const deleteAccountMutation = useMutation<void, Error, number>({
    mutationFn: apiClient.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  // Account management state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showBalances, setShowBalances] = useState(true);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [dragOverAccount, setDragOverAccount] = useState<number | null>(null);
  const { showSuccess, showError } = useToast();

  const [showAccountSelectModal, setShowAccountSelectModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<Account | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isPageDragOver, setIsPageDragOver] = useState(false);



  const handleAccountSubmit = async (data: AccountManagementFormData) => {
    try {
      const accountData = {
        name: data.name,
        account_type: data.account_type,
        balance: typeof data.balance === 'number' ? data.balance.toString() : data.balance.toString(),
        currency: data.currency || 'USD',
        institution: data.institution || '',
        account_number: data.account_number || '',
        is_active: data.is_active !== false, // Default to true if undefined
      };

      console.log('Sending account data to API:', accountData);

      let savedAccount;
      if (editingAccount) {
        savedAccount = await updateAccountMutation.mutateAsync({
          id: editingAccount.id,
          account: accountData,
        });
      } else {
        savedAccount = await createAccountMutation.mutateAsync(accountData);
      }

      console.log('Account saved successfully:', savedAccount);

      setShowAddModal(false);
      setEditingAccount(null);
    } catch (err: any) {
      console.error('Error saving account:', err);
      throw new Error(err.message || "An error occurred while saving the account.");
    }
  };

  const handleDelete = (account: Account) => {
    setAccountToDelete(account);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (accountToDelete) {
      try {
        await deleteAccountMutation.mutateAsync(accountToDelete.id);
        setShowConfirmDelete(false);
        setAccountToDelete(null);
      } catch (err: any) {
        console.error("Error deleting account:", err.message || "An error occurred while deleting the account.");
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, accountId: number) => {
    e.preventDefault();
    setDragOverAccount(accountId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverAccount(null);
  };

  const handleDrop = async (e: React.DragEvent, accountId: number) => {
    e.preventDefault();
    setDragOverAccount(null);

    const files = Array.from(e.dataTransfer.files);
    const supportedFiles = files.filter(file =>
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ||
      file.type === 'application/json' || file.name.toLowerCase().endsWith('.json') ||
      file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
    );

    if (supportedFiles.length === 0) {
      showError('Invalid file type', 'Please upload PDF, JSON, or CSV files only.');
      return;
    }

    // Upload each file to this account
    for (const file of supportedFiles) {
      try {
        showSuccess('Uploading...', `Uploading ${file.name}`);
        const response = await apiClient.uploadFile(file, undefined, accountId) as any;
        showSuccess('Upload successful', `${file.name} uploaded to account successfully`);
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || 'Upload failed';
        if (errorMessage.toLowerCase().includes('password')) {
          showError('Password required', `${file.name} is password protected. Please use the upload modal instead.`);
        } else {
          showError('Upload failed', `Failed to upload ${file.name}: ${errorMessage}`);
        }
      }
    }
  };

  // Page-wide drag and drop handlers
  const handlePageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsPageDragOver(true);
  };

  const handlePageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only hide if leaving the main container
    if (e.currentTarget === e.target) {
      setIsPageDragOver(false);
    }
  };

  const handlePageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsPageDragOver(false);

    if (accounts.length === 0) {
      showError('No accounts', 'Please add an account first before uploading files.');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    const supportedFiles = files.filter(file =>
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ||
      file.type === 'application/json' || file.name.toLowerCase().endsWith('.json') ||
      file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
    );

    if (supportedFiles.length === 0) {
      showError('Invalid file type', 'Please upload PDF, JSON, or CSV files only.');
      return;
    }

    setSelectedFiles(supportedFiles);
    setShowAccountSelectModal(true);
  };

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const supportedFiles = files.filter(file =>
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ||
      file.type === 'application/json' || file.name.toLowerCase().endsWith('.json') ||
      file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
    );

    if (supportedFiles.length === 0) {
      showError('Invalid file type', 'Please upload PDF, JSON, or CSV files only.');
      return;
    }

    setSelectedFiles(supportedFiles);
    setShowAccountSelectModal(true);
    e.target.value = ''; // Reset input
  };

  const handleAccountSelectForFiles = async (accountId: number) => {
    setShowAccountSelectModal(false);

    // Upload each file to the selected account
    for (const file of selectedFiles) {
      try {
        showSuccess('Uploading...', `Uploading ${file.name}`);
        const response = await apiClient.uploadFile(file, undefined, accountId) as any;
        showSuccess('Upload successful', `${file.name} uploaded successfully`);
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || 'Upload failed';
        if (errorMessage.toLowerCase().includes('password')) {
          showError('Password required', `${file.name} is password protected and cannot be uploaded via drag & drop.`);
        } else {
          showError('Upload failed', `Failed to upload ${file.name}: ${errorMessage}`);
        }
      }
    }

    setSelectedFiles([]);
  };

  const totalBalance = accounts.reduce(
    (sum, account) => sum + parseFloat(account.balance.toString()),
    0
  );
  const accountTypeGroups = accounts.reduce((groups, account) => {
    if (!groups[account.account_type]) {
      groups[account.account_type] = [];
    }
    groups[account.account_type].push(account);
    return groups;
  }, {} as Record<string, Account[]>);

  return (
    <div
      className="space-y-4 relative min-h-screen"
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      {/* Page-wide drag overlay */}
      {isPageDragOver && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-10 border-4 border-dashed border-blue-400 z-40 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 shadow-lg">
            <div className="text-center">
              <UploadIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Drop files to upload
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Release to select an account for your files
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Clean Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Accounts</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {accounts.length} accounts • Total: {showBalances ? formatCurrency(totalBalance, authState.user) : '••••••'}
            </span>
            <button
              onClick={() => setShowBalances(!showBalances)}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Upload History"
          >
            <History className="w-4 h-4" />
          </button>
          {accounts.length > 0 && (
            <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
              <UploadIcon className="w-4 h-4" />
              Upload Files
              <input
                type="file"
                multiple
                accept=".pdf,.json,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-slate-700 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>
      </div>

      {/* Accounts Section - Side by Side Layout */}
      <div className="flex gap-6 min-h-[500px]">
        {/* Left Side - Account List */}
        <div className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 ${selectedAccountForHistory ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
          {isLoadingAccounts ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-400"></div>
            </div>
          ) : accountsError ? (
            <div className="p-6">
              <Alert variant="error" title="Error loading accounts">
                {accountsError?.message || 'Failed to load accounts'}
              </Alert>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CreditCard className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                No accounts yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Add your first account to start tracking your finances
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-slate-900 dark:bg-slate-700 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your First Account
              </button>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {accounts.map((account) => {
                  const Icon = accountTypeIcons[account.account_type];
                  const balance = parseFloat(account.balance.toString());
                  const isDraggedOver = dragOverAccount === account.id;
                  const isSelected = selectedAccountForHistory?.id === account.id;

                  return (
                    <div
                      key={account.id}
                      className={`flex items-center justify-between py-3 px-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 group transition-colors cursor-pointer ${
                        isDraggedOver
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                          : ''
                      } ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 dark:border-l-blue-400'
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedAccountForHistory(
                          selectedAccountForHistory?.id === account.id ? null : account
                        );
                      }}
                      onDragOver={(e) => handleDragOver(e, account.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, account.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${accountTypeColors[account.account_type]}`}>
                          <Icon className="w-3 h-3" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {account.name}
                          </span>
                          <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                            {account.currency}
                            {account.institution && ` • ${account.institution}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {showBalances && (
                          <span className={`font-medium ${
                            balance >= 0
                              ? 'text-slate-900 dark:text-white'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatCurrency(balance, authState.user)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Right Side - Balance History */}
        {selectedAccountForHistory && (
          <div className="w-1/2">
            <BalanceHistory
              account={selectedAccountForHistory}
              className=""
            />
          </div>
        )}
      </div>


      {/* Account Selection Modal */}
      {showAccountSelectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
              Select Account for {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
            </h3>
            <div className="space-y-3 mb-6">
              {selectedFiles.map((file, index) => (
                <div key={index} className="text-sm text-slate-600 dark:text-slate-400 truncate">
                  • {file.name}
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Account
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-300 dark:border-slate-600 rounded-lg">
                  {accounts.map((account) => {
                    const Icon = accountTypeIcons[account.account_type];
                    return (
                      <button
                        key={account.id}
                        onClick={() => handleAccountSelectForFiles(account.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-200 dark:border-slate-700 last:border-0"
                      >
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${accountTypeColors[account.account_type]}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-slate-900 dark:text-white">{account.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{account.account_type}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowAccountSelectModal(false);
                    setSelectedFiles([]);
                  }}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Account Modal */}
      <Modal
        isOpen={showAddModal}
        title={editingAccount ? "Edit Account" : "Add New Account"}
        onClose={() => {
          setShowAddModal(false);
          setEditingAccount(null);
        }}
        size="lg"
      >
        <ObjectForm
          config={createAccountManagementFormConfig(
            handleAccountSubmit,
            createAccountMutation.isPending || updateAccountMutation.isPending,
            editingAccount ? {
              name: editingAccount.name,
              account_type: editingAccount.account_type,
              balance: editingAccount.balance,
              currency: editingAccount.currency,
              institution: editingAccount.institution || '',
              account_number: editingAccount.account_number || '',
              is_active: editingAccount.is_active !== false,
            } : {
              currency: currencies[0]?.code || 'USD',
              is_active: true,
            },
            !!editingAccount,
            currencies
          )}
        />
      </Modal>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={confirmDelete}
        title="Delete Account"
        message={`Are you sure you want to delete the account "${accountToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Upload History Modal */}
      <Modal
        isOpen={showHistoryModal}
        title="Upload History"
        onClose={() => setShowHistoryModal(false)}
        size="lg"
      >
        <div className="h-64 overflow-y-auto">
          <CompactUploadList />
        </div>
      </Modal>

    </div>
  );
};

