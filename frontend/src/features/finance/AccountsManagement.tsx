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
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency } from "../../utils/preferences";
import { Modal } from "../../components/ui/Modal";
import { Upload } from "./Upload";
import { useTags } from "./hooks/queries/useTags";
import { Button } from "../../components/ui/Button";
import type { Account } from "../../types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { Alert } from "../../components/ui/Alert";
import { ConfirmationModal } from "../../components/ui/ConfirmationModal";

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

export const AccountsManagement = () => {
  const { state: authState } = useAuth();
  const { allTags, setEntityTags } = useTags();

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
    mutationFn: apiClient.createAccount,
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

  // Statement filtering state
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<
    number | null
  >(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(
    null
  );
  const [showUploadModal, setShowUploadModal] = useState(false);



  const handleAccountSubmit = async (data: AccountManagementFormData) => {
    try {
      const accountData = {
        name: data.name,
        account_type: data.account_type,
        balance: typeof data.balance === 'string' ? parseFloat(data.balance) : data.balance,
        currency: data.currency,
        institution: data.institution || '',
        description: data.description || '',
        is_active: data.is_active,
      };

      let savedAccount;
      if (editingAccount) {
        savedAccount = await updateAccountMutation.mutateAsync({
          id: editingAccount.id,
          account: accountData,
        });
      } else {
        savedAccount = await createAccountMutation.mutateAsync(accountData);
      }

      // Handle tags separately (if needed in the future)
      // Tags functionality would need to be implemented if required

      setShowAddModal(false);
      setEditingAccount(null);
    } catch (err: any) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">
              Accounts & Statements
            </h1>
            <p className="text-blue-100 text-lg">
              Manage your accounts and upload bank statements
            </p>
            <div className="mt-4 flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                <span>{accounts.length} accounts</span>
              </div>
              {showBalances && (
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  <span>
                    Total: {formatCurrency(totalBalance, authState.user)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 lg:mt-0 flex items-center space-x-3">
            <Button
              onClick={() => setShowBalances(!showBalances)}
              variant="ghost-white"
              size="sm"
            >
              {showBalances ? (
                <EyeOff className="w-4 h-4 mr-2" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              {showBalances ? "Hide" : "Show"} Balances
            </Button>
            <Button
              onClick={() => setShowAddModal(true)}
              variant="primary"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Account Summary Cards - Now Clickable Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(accountTypeGroups).map(([type, groupedAccounts]) => {
            const Icon =
              accountTypeIcons[type as keyof typeof accountTypeIcons];
            const total = groupedAccounts.reduce(
              (sum, acc) => sum + parseFloat(acc.balance.toString()),
              0
            );
            const isFiltered =
              selectedAccountFilter &&
              groupedAccounts.some((acc) => acc.id === selectedAccountFilter);

            return (
              <button
                key={type}
                onClick={() => {
                  // Toggle filter - if already filtered to this type, clear filter, otherwise set to first account of this type
                  if (isFiltered) {
                    setSelectedAccountFilter(null);
                  } else {
                    setSelectedAccountFilter(groupedAccounts[0]?.id || null);
                    setSelectedTagFilter(null); // Clear tag filter when account filter is applied
                  }
                }}
                className={`p-4 rounded-xl shadow-md text-left transition-all duration-200 hover:shadow-lg transform hover:scale-105 ${
                  isFiltered
                    ? `${
                        accountTypeColors[
                          type as keyof typeof accountTypeColors
                        ]
                      } ring-2 ring-blue-500 shadow-lg`
                    : `${
                        accountTypeColors[
                          type as keyof typeof accountTypeColors
                        ]
                      } hover:opacity-90`
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-6 h-6" />
                  <span className="text-sm font-semibold">
                    {groupedAccounts.length}
                  </span>
                </div>
                <h3 className="text-lg font-bold capitalize mb-1">
                  {type.replace("_", " ")}
                </h3>
                {showBalances && (
                  <p className="text-xl font-bold">
                    {formatCurrency(total, authState.user)}
                  </p>
                )}
                {isFiltered && (
                  <p className="text-xs mt-1 opacity-75">Click to show all</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Accounts List */}
        <div className="theme-card">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold theme-text-primary">
                Your Accounts
              </h2>
              <p className="theme-text-secondary text-sm mt-1">
                {selectedAccountFilter || selectedTagFilter
                  ? `Showing filtered accounts`
                  : `Manage your ${accounts.length} financial accounts`}
              </p>
              {/* Tag Filter */}
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs text-gray-500 font-medium">
                    Filter by tag:
                  </span>
                  {allTags.map((tag) => (
                    <button
                      key={tag.name}
                      onClick={() => {
                        if (selectedTagFilter === tag.name) {
                          setSelectedTagFilter(null);
                        } else {
                          setSelectedTagFilter(tag.name);
                          setSelectedAccountFilter(null); // Clear account filter when tag filter is applied
                        }
                      }}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        selectedTagFilter === tag.name
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {tag.name} ({tag.usage_count})
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {(selectedAccountFilter || selectedTagFilter) && (
                <Button
                  onClick={() => {
                    setSelectedAccountFilter(null);
                    setSelectedTagFilter(null);
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {isLoadingAccounts ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : accountsError ? (
            <Alert variant="error" title="Error loading accounts">
              {accountsError.message}
            </Alert>
          ) : accounts.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-medium text-gray-900 mb-3">
                No accounts yet
              </h3>
              <p className="text-gray-600 mb-6">
                Add your first account to start tracking your finances
              </p>
              <Button onClick={() => setShowAddModal(true)} size="lg">
                Add Your First Account
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {accounts
                .filter((account) => {
                  if (
                    selectedAccountFilter &&
                    account.id !== selectedAccountFilter
                  )
                    return false;
                  if (
                    selectedTagFilter &&
                    (!account.tags || !account.tags.includes(selectedTagFilter))
                  )
                    return false;
                  return true;
                })
                .map((account) => {
                  const Icon = accountTypeIcons[account.account_type];

                  return (
                    <div
                      key={account.id}
                      className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div
                            className={`p-3 rounded-full ${
                              accountTypeColors[account.account_type]
                            }`}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold theme-text-primary">
                              {account.name}
                            </h3>
                            <div className="flex items-center space-x-3 text-sm theme-text-secondary">
                              <span className="capitalize">
                                {account.account_type.replace("_", " ")}
                              </span>
                              <span>•</span>
                              <span>{account.currency}</span>
                              {account.institution && (
                                <>
                                  <span>•</span>
                                  <span>{account.institution}</span>
                                </>
                              )}
                              {account.account_number_last4 && (
                                <>
                                  <span>•</span>
                                  <span>
                                    ****{account.account_number_last4}
                                  </span>
                                </>
                              )}
                            </div>
                            {account.tags && account.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {account.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {showBalances && (
                            <div className="text-right">
                              <div
                                className={`text-2xl font-bold ${
                                  parseFloat(account.balance.toString()) >= 0
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {formatCurrency(
                                  parseFloat(account.balance.toString()),
                                  authState.user
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => {
                                setEditingAccount(account);
                                setShowAddModal(true);
                              }}
                              variant="ghost"
                              size="sm"
                              title="Edit account"
                            >
                              <Edit2 className="w-5 h-5" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(account)}
                              variant="ghost"
                              size="sm"
                              title="Delete account"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Upload Statements Section */}
        <div className="theme-card">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold theme-text-primary flex items-center">
                  <UploadIcon className="w-6 h-6 mr-3 text-blue-600" />
                  Bank Statements
                </h2>
                <p className="theme-text-secondary text-sm mt-1">
                  Upload and manage your bank statements
                  {selectedAccountFilter &&
                    ` for ${
                      accounts.find((acc) => acc.id === selectedAccountFilter)
                        ?.name
                    }`}
                </p>
              </div>
              <Button onClick={() => setShowUploadModal(true)}>
                <UploadIcon className="w-4 h-4 mr-2" />
                Upload Statement
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium theme-text-primary mb-2">
                No statements uploaded yet
              </h3>
              <p className="theme-text-secondary mb-4">
                Upload your bank statements to automatically import transactions
              </p>
              <p className="text-xs theme-text-muted">
                Supports PDF bank statements, CSV, and JSON files
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Bank Statements"
        size="xl"
      >
        <Upload />
      </Modal>

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
              description: editingAccount.description || '',
              is_active: editingAccount.is_active !== false,
            } : {
              currency: currencies[0]?.code || 'USD',
            },
            !!editingAccount,
            currencies
          )}
        />
      </Modal>

      <ConfirmationModal
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
      >
        Are you sure you want to delete the account "{accountToDelete?.name}"?
        This action cannot be undone.
      </ConfirmationModal>
    </div>
  );
};
