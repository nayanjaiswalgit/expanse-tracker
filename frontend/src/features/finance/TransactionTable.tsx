import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table';
import type { SortingState, ColumnFiltersState } from '@tanstack/react-table';
import type { Transaction, TransactionSplit, Filter as FilterType } from '../../types';
import { Filter, ChevronUp, ChevronDown, Split, Upload, Lock, CheckSquare, Square, Sparkles, Plus, TrendingUp, Scan, ChevronDown as DropdownIcon, MoreHorizontal, History, RotateCcw, Eye, Clock } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TagInput } from '../../components/ui/TagInput';
import { SplitEditor } from './SplitEditor';
import ReceiptScanner from '../ai/ReceiptScanner';
import { useTransactions, useUpdateTransaction, useDeleteTransaction, useBulkUpdateTransactionAccount, useUpdateTransactionSplits, useAccounts, useCategories, useCreateTransaction } from '../../hooks/finance';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/preferences';
import { sanitizeInput } from '../../utils/security';
import { apiClient } from 'src/api/client';
import { useSearchParams, Link } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

const columnHelper = createColumnHelper<Transaction>();

interface PasswordPromptProps {
  filename: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

const PasswordPrompt = ({ filename, onSubmit, onCancel }: PasswordPromptProps) => {
  const [password, setPassword] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(password);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
        <div className="flex items-center mb-4">
          <Lock className="h-6 w-6 text-yellow-500 mr-2" />
          <h3 className="text-lg font-medium theme-text-primary">Password Protected PDF</h3>
        </div>
        <p className="theme-text-secondary mb-4">
          The file "{filename}" is password protected. Please enter the password to continue.
        </p>
        <form onSubmit={handleSubmit}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter PDF password"
            autoFocus
          />
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={onCancel}
              variant="secondary"
              size="md"
            >
              Cancel
            </Button>
            <Button
              type="submit"
            >
              Upload
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const TransactionTable = () => {
  const [searchParams] = useSearchParams();
  const transactionsQuery = useTransactions();
  const accountsQuery = useAccounts();
  const categoriesQuery = useCategories();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();
  const bulkUpdateMutation = useBulkUpdateTransactionAccount();
  const updateSplitsMutation = useUpdateTransactionSplits();
  const createTransactionMutation = useCreateTransaction();
  const { state: authState } = useAuth();
  const { showSuccess, showError } = useToast();

  // Helper to get transactions array from query data - memoized for performance
  const transactions = useMemo(() => {
    const data = transactionsQuery.data || [];
    return Array.isArray(data) ? data : (data.results || []);
  }, [transactionsQuery.data]);
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [editingData, setEditingData] = useState<Partial<Transaction>>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitTransaction, setSplitTransaction] = useState<Transaction | null>(null);
  const [selectedUploadAccount, setSelectedUploadAccount] = useState<number | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<{file: File, filename: string} | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<{
    accountId?: number;
    categoryId?: string;
    tags?: string[];
    verified?: boolean;
    action?: 'edit' | 'delete';
  }>({});
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [selectedAddOption, setSelectedAddOption] = useState<'transaction' | 'scan' | 'upload'>('transaction');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // History tracking
  const [actionHistory, setActionHistory] = useState<Array<{
    id: string;
    type: 'single' | 'bulk' | 'scan' | 'upload';
    action: string;
    timestamp: Date;
    count: number;
    transactionIds?: number[];
    canRevert: boolean;
  }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [transactionData, setTransactionData] = useState<{
    input: string;
    defaultAccountId: number | null;
    defaultCategoryId: string;
    defaultDate: string;
    notes: string;
    tags: string[];
  }>({
    input: '',
    defaultAccountId: null,
    defaultCategoryId: '',
    defaultDate: new Date().toISOString().split('T')[0],
    notes: '',
    tags: []
  });

  useEffect(() => {
    // Set default account if available
    const accounts = accountsQuery.data || [];
    if (accounts.length > 0 && !selectedUploadAccount) {
      setSelectedUploadAccount(accounts[0].id);
    }
    if (accounts.length > 0 && !transactionData.defaultAccountId) {
      setTransactionData(prev => ({ ...prev, defaultAccountId: accounts[0].id }));
    }
  }, [accountsQuery.data, selectedUploadAccount, transactionData.defaultAccountId]);

  // Helper functions for inline editing - memoized callbacks
  const startEditing = useCallback((transactionId: number, field: string, currentValue: unknown) => {
    setEditingCell({ id: transactionId.toString(), field });
    setEditingData({ [field]: currentValue });
  }, []);

  const saveField = useCallback(async (transactionId: number, field: string, value: unknown) => {
    try {
      await updateTransactionMutation.mutateAsync({ id: transactionId, data: { [field]: value } });
      setEditingCell(null);
      setEditingData({});
    } catch (error) {
      console.error('Failed to update transaction:', error);
    }
  }, [updateTransactionMutation]);

  const cancelEditing = useCallback(() => {
    setEditingCell(null);
    setEditingData({});
  }, []);

  // History management functions
  const addToHistory = useCallback((type: 'single' | 'bulk' | 'scan' | 'upload', action: string, count: number, transactionIds?: number[]) => {
    const historyItem = {
      id: Date.now().toString(),
      type,
      action,
      timestamp: new Date(),
      count,
      transactionIds,
      canRevert: true
    };
    setActionHistory(prev => [historyItem, ...prev.slice(0, 9)]); // Keep last 10 actions
  }, []);

  const revertAction = useCallback(async (historyItem: typeof actionHistory[0]) => {
    if (!historyItem.canRevert || !historyItem.transactionIds) return;

    try {
      // Delete the transactions that were created
      const deletePromises = historyItem.transactionIds.map(id =>
        deleteTransactionMutation.mutateAsync(id)
      );
      await Promise.all(deletePromises);

      // Mark the history item as reverted
      setActionHistory(prev =>
        prev.map(item =>
          item.id === historyItem.id
            ? { ...item, canRevert: false, action: `${item.action} (Reverted)` }
            : item
        )
      );

      showSuccess('Action reverted', `Successfully reverted ${historyItem.count} transaction${historyItem.count !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Failed to revert action:', error);
      showError('Failed to revert action', 'Please try again.');
    }
  }, [deleteTransactionMutation]);

  const clearHistory = useCallback(() => {
    setActionHistory([]);
  }, []);

  // Notion-style cell components
  const EditableTextCell = ({ transaction, field, value, placeholder = "Empty" }: {
    transaction: Transaction;
    field: string;
    value: string;
    placeholder?: string;
  }) => {
    const isEditing = editingCell?.id === transaction.id.toString() && editingCell?.field === field;

    if (isEditing) {
      return (
        <Input
          type="text"
          value={(editingData as Record<string, unknown>)[field] as string || value || ''}
          onChange={(e) => setEditingData(prev => ({ ...prev, [field]: e.target.value }))}
          onBlur={() => saveField(transaction.id, field, (editingData as Record<string, unknown>)[field] || value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              saveField(transaction.id, field, (editingData as Record<string, unknown>)[field] || value);
            } else if (e.key === 'Escape') {
              cancelEditing();
            }
          }}
          autoFocus
        />
      );
    }

    return (
      <div
        onClick={() => startEditing(transaction.id, field, value)}
        className="px-3 py-2 min-h-[36px] text-sm cursor-pointer hover:bg-blue-50 rounded-md transition-colors duration-150 flex items-center"
      >
        {value || <span className="theme-text-muted italic">{placeholder}</span>}
      </div>
    );
  };

  const EditableSelectCell = ({ transaction, field, value, options, placeholder = "Select..." }: {
    transaction: Transaction;
    field: string;
    value: unknown;
    options: { value: unknown; label: string }[];
    placeholder?: string;
  }) => {
    const isEditing = editingCell?.id === transaction.id.toString() && editingCell?.field === field;

    if (isEditing) {
      return (
        <Select
          value={(editingData as Record<string, unknown>)[field] !== undefined ? (editingData as Record<string, unknown>)[field] as string : value as string || ''}
          onChange={(e) => {
            const newValue = e.target.value || undefined;
            setEditingData(prev => ({ ...prev, [field]: newValue }));
            saveField(transaction.id, field, newValue);
          }}
          onBlur={cancelEditing}
          options={options}
          placeholder={placeholder}
          autoFocus
        />
      );
    }

    const selectedOption = options.find(opt => opt.value === value);
    return (
      <div
        onClick={() => startEditing(transaction.id, field, value)}
        className="px-3 py-2 min-h-[36px] text-sm cursor-pointer hover:bg-blue-50 rounded-md flex items-center transition-colors duration-150"
      >
        {selectedOption ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {selectedOption.label}
          </span>
        ) : (
          <span className="theme-text-muted italic">{placeholder}</span>
        )}
      </div>
    );
  };


  const EditableDateCell = ({ transaction, field, value }: {
    transaction: Transaction;
    field: string;
    value: string;
  }) => {
    const isEditing = editingCell?.id === transaction.id.toString() && editingCell?.field === field;

    if (isEditing) {
      return (
        <Input
          type="date"
          value={(editingData as Record<string, unknown>)[field] as string || value || ''}
          onChange={(e) => setEditingData(prev => ({ ...prev, [field]: e.target.value }))}
          onBlur={() => saveField(transaction.id, field, (editingData as Record<string, unknown>)[field] || value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              saveField(transaction.id, field, (editingData as Record<string, unknown>)[field] || value);
            } else if (e.key === 'Escape') {
              cancelEditing();
            }
          }}
          autoFocus
        />
      );
    }

    return (
      <div
        onClick={() => startEditing(transaction.id, field, value)}
        className="px-3 py-2 min-h-[36px] text-sm cursor-pointer hover:bg-blue-50 rounded-md flex items-center transition-colors duration-150"
      >
        <span className="theme-text-primary font-medium">
          {new Date(value).toLocaleDateString()}
        </span>
      </div>
    );
  };

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => {
        const allSelected = table.getRowModel().rows.length > 0 && 
          table.getRowModel().rows.every(row => selectedRows.has(row.original.id));
        const someSelected = table.getRowModel().rows.some(row => selectedRows.has(row.original.id));
        
        return (
          <div className="flex items-center">
            <Button
              onClick={() => handleSelectAll(!allSelected)}
              variant="ghost"
              size="sm"
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : someSelected ? (
                <div className="h-4 w-4 bg-blue-600 border border-blue-600 rounded flex items-center justify-center">
                  <div className="h-2 w-2 bg-white rounded-sm"></div>
                </div>
              ) : (
                <Square className="h-4 w-4 theme-text-muted" />
              )}
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const isSelected = selectedRows.has(row.original.id);
        return (
          <div className="flex items-center">
            <button
              onClick={() => handleRowSelection(row.original.id, !isSelected)}
              className="theme-btn-icon"
            >
              {isSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : (
                <Square className="h-4 w-4 theme-text-muted" />
              )}
            </button>
          </div>
        );
      },
      size: 40,
    }),
    columnHelper.accessor('date', {
      header: 'Date',
      cell: ({ getValue, row }) => (
        <EditableDateCell
          transaction={row.original}
          field="date"
          value={getValue()}
        />
      ),
      size: 120,
    }),
    columnHelper.accessor('description', {
      header: 'Description', 
      cell: ({ getValue, row }) => (
        <EditableTextCell
          transaction={row.original}
          field="description"
          value={getValue()}
          placeholder="Add description..."
        />
      ),
      size: 250,
    }),
    columnHelper.accessor('account_id', {
      header: 'Account',
      cell: ({ getValue, row }) => (
        <EditableSelectCell
          transaction={row.original}
          field="account_id"
          value={getValue()}
          options={accountsQuery.data || [].map(acc => ({ value: acc.id, label: acc.name }))}
          placeholder="Select account"
        />
      ),
      size: 150,
    }),
    columnHelper.accessor('category_id', {
      header: 'Category',
      cell: ({ getValue, row }) => (
        <EditableSelectCell
          transaction={row.original}
          field="category_id"
          value={getValue()}
          options={categoriesQuery.data || [].map(cat => ({ value: cat.id, label: cat.name }))}
          placeholder="No category"
        />
      ),
      size: 150,
    }),
    columnHelper.accessor('amount', {
      header: 'Amount',
      cell: ({ getValue, row }) => {
        const isEditing = editingCell?.id === row.original.id.toString() && editingCell?.field === 'amount';
        const value = getValue();
        
        if (isEditing) {
          return (
            <Input
              type="number"
              step="0.01"
              value={editingData.amount !== undefined ? editingData.amount : value || ''}
              onChange={(e) => setEditingData(prev => ({ ...prev, amount: e.target.value }))}
              onBlur={() => saveField(row.original.id, 'amount', editingData.amount || value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveField(row.original.id, 'amount', editingData.amount || value);
                } else if (e.key === 'Escape') {
                  cancelEditing();
                }
              }}
              autoFocus
            />
          );
        }
        
        return (
          <div
            onClick={() => startEditing(row.original.id, 'amount', value)}
            className="px-3 py-2 min-h-[36px] text-sm cursor-pointer hover:bg-blue-50 rounded-md text-right flex items-center justify-end transition-colors duration-150"
          >
            <span className={`font-medium ${parseFloat(value) > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(value) > 0 ? '+' : ''}{formatCurrency(parseFloat(value), authState.user)}
            </span>
          </div>
        );
      },
      size: 120,
    }),
    columnHelper.accessor('tags', {
      header: 'Tags',
      enableSorting: false,
      cell: ({ getValue, row }) => {
        const isEditing = editingCell?.id === row.original.id.toString() && editingCell?.field === 'tags';
        const value = getValue();
        
        if (isEditing) {
          return (
            <TagInput
              tags={editingData.tags || value}
              onTagsChange={(newTags) => setEditingData(prev => ({ ...prev, tags: newTags }))}
              onBlur={() => saveField(row.original.id, 'tags', editingData.tags || value)}
            />
          );
        }
        
        return (
          <div 
            onClick={() => startEditing(row.original.id, 'tags', value)}
            className="flex flex-wrap gap-1 px-3 py-2 min-h-[36px] cursor-pointer hover:bg-blue-50 rounded-md transition-colors duration-150 items-center"
          >
            {value.length > 0 ? (
              value.map((tag, index) => (
                <span key={index} className="px-2.5 py-1 text-xs bg-purple-100 text-purple-800 rounded-full font-medium">
                  {tag}
                </span>
              ))
            ) : (
              <span className="theme-text-muted text-sm italic">Add tags...</span>
            )}
          </div>
        );
      },
      size: 200,
    }),
    columnHelper.accessor('notes', {
      header: 'Notes',
      cell: ({ getValue, row }) => (
        <EditableTextCell
          transaction={row.original}
          field="notes"
          value={getValue() || ''}
          placeholder="Add notes..."
        />
      ),
      size: 200,
    }),
    columnHelper.accessor('verified', {
      header: 'Verified',
      cell: ({ getValue, row }) => {
        const isEditing = editingCell?.id === row.original.id.toString() && editingCell?.field === 'verified';
        const value = getValue();
        
        if (isEditing) {
          return (
            <Select
              value={editingData.verified !== undefined ? editingData.verified.toString() : value.toString()}
              onChange={(e) => {
                const newValue = e.target.value === 'true';
                setEditingData(prev => ({ ...prev, verified: newValue }));
                saveField(row.original.id, 'verified', newValue);
              }}
              onBlur={cancelEditing}
              options={[{ value: "true", label: "Verified" }, { value: "false", label: "Unverified" }]}
              autoFocus
            />
          );
        }
        
        return (
          <div
            onClick={() => startEditing(row.original.id, 'verified', value)}
            className="px-3 py-2 min-h-[36px] text-sm cursor-pointer hover:bg-blue-50 rounded-md flex items-center transition-colors duration-150"
          >
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              value 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {value ? 'Verified' : 'Unverified'}
            </span>
          </div>
        );
      },
      size: 100,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const transaction = row.original;
        
        return (
          <div className="flex gap-1">
            <Button
              onClick={() => handleSplitEdit(transaction)}
              variant="ghost"
              size="sm"
              title="Edit category splits"
            >
              <Split className="h-4 w-4" />
            </Button>
            {transaction.suggested_category && !transaction.category_id && (
              <Button
              onClick={() => handleAcceptSuggestion(transaction)}
              variant="ghost"
              size="sm"
              title="Accept suggested category"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            )}
            <Button
              onClick={() => handleAutoCategorize(transaction)}
              variant="ghost"
              size="sm"
              title="Auto-categorize"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      size: 140,
    })
  ], [editingCell, editingData, selectedRows, accountsQuery.data || [], categoriesQuery.data || [], authState.user]);

  const table = useReactTable({
    data: (() => {
      const data = transactions;
      return Array.isArray(data) ? data : (data.results || []);
    })(),
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  useEffect(() => {
    // Get filters from URL params and apply them to the table
    const uploadSession = searchParams.get('upload_session');
    const groupExpense = searchParams.get('group_expense');
    const accountFilter = searchParams.get('account_id');
    const categoryFilter = searchParams.get('category_id');

    // Apply URL parameter filters to the table
    if (uploadSession && table.getColumn('upload_session')) {
      table.getColumn('upload_session')?.setFilterValue(Number(uploadSession));
    }
    if (groupExpense && table.getColumn('group_expense')) {
      table.getColumn('group_expense')?.setFilterValue(Number(groupExpense));
    }
    if (accountFilter && table.getColumn('account_id')) {
      table.getColumn('account_id')?.setFilterValue(Number(accountFilter));
    }
    if (categoryFilter && table.getColumn('category_id')) {
      table.getColumn('category_id')?.setFilterValue(categoryFilter);
    }
  }, [searchParams, table]);

  const handleSplitEdit = (transaction: Transaction) => {
    setSplitTransaction(transaction);
    setSplitModalOpen(true);
  };

  const handleSplitsUpdate = async (splits: TransactionSplit[]) => {
    if (splitTransaction) {
      try {
        await updateSplitsMutation.mutateAsync({ id: Number(splitTransaction.id), splits });
      } catch (error) {
        console.error('Failed to update transaction splits:', error);
        showError('Failed to update transaction splits', 'Please try again.');
      }
    }
  };

  const uploadFileToAPI = async (file: File, password?: string): Promise<any> => {
    try {
      const response = await apiClient.uploadFile(file, password, selectedUploadAccount || undefined);
      return response;
    } catch (error: unknown) {
      const errorMessage = error.response?.data?.error || 'Upload failed';
      
      // Check if it's a password-related error
      if (errorMessage.toLowerCase().includes('password')) {
        throw new Error('PASSWORD_REQUIRED');
      }
      
      throw new Error(errorMessage);
    }
  };

  const processFile = async (file: File, password?: string): Promise<any> => {
    try {
      const result = await uploadFileToAPI(file, password);
      return result;
    } catch (error: unknown) {
      if (error.message === 'PASSWORD_REQUIRED') {
        throw error; // Re-throw to trigger password prompt
      }
      
      throw error;
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedUploadAccount) {
      showError('No account selected', 'Please select an account before uploading.');
      return;
    }

    try {
      console.log('Uploading file:', file.name, 'to account:', selectedUploadAccount);
      const result = await processFile(file);
      console.log('Upload result:', result);

      // Add to history - Note: We don't have individual transaction IDs from file upload
      // so we can't provide revert functionality for file uploads
      addToHistory('upload', `Uploaded file: ${file.name}`, result.total_transactions);

      showSuccess('File uploaded successfully', `${result.total_transactions} transactions processed.`);
      // Refresh transactions to show new data
      // React Query handles refetching automatically
      setShowAddTransactionModal(false);
      setSelectedAddOption('transaction');
    } catch (error: unknown) {
      if (error.message === 'PASSWORD_REQUIRED') {
        setShowPasswordPrompt({ file, filename: file.name });
      } else {
        console.error('Upload error:', error);
        showError('Upload failed', error.message);
      }
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!showPasswordPrompt) return;
    
    const { file } = showPasswordPrompt;
    setShowPasswordPrompt(null);

    try {
      const result = await processFile(file, password);
      console.log('Upload result:', result);

      // Add to history
      addToHistory('upload', `Uploaded file: ${file.name} (password protected)`, result.total_transactions);

      showSuccess('File uploaded successfully', `${result.total_transactions} transactions processed.`);
      // Refresh transactions to show new data
      // React Query handles refetching automatically
      setShowAddTransactionModal(false);
      setSelectedAddOption('transaction');
    } catch (error: unknown) {
      if (error.message === 'PASSWORD_REQUIRED') {
        // Still need password - show prompt again
        setShowPasswordPrompt({ file, filename: file.name });
        showError('Incorrect password', 'Please try again.');
      } else {
        // Other error
        console.error('Upload error:', error);
        showError('Upload failed', error.message);
      }
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordPrompt(null);
  };

  const handleRowSelection = (transactionId: number, selected: boolean) => {
    const newSelection = new Set(selectedRows);
    if (selected) {
      newSelection.add(transactionId);
    } else {
      newSelection.delete(transactionId);
    }
    setSelectedRows(newSelection);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = new Set(transactions.map(t => t.id));
      setSelectedRows(allIds);
    } else {
      setSelectedRows(new Set());
    }
  };

  // const handleBulkEdit = () => {
  //   if (selectedRows.size === 0) {
  //     alert('Please select at least one transaction to edit.');
  //     return;
  //   }
  //   setBulkEditData({ action: 'edit' });
  //   setShowBulkEdit(true);
  // };

  // const handleBulkDelete = () => {
  //   if (selectedRows.size === 0) {
  //     alert('Please select at least one transaction to delete.');
  //     return;
  //   }
  //   setBulkEditData({ action: 'delete' });
  //   setShowBulkEdit(true);
  // };

  const handleBulkSave = async () => {
    if (selectedRows.size === 0) return;

    try {
      if (bulkEditData.action === 'delete') {
        setShowDeleteConfirm(true);
        return;
      } else {
        const promises = [];
        
        // Handle account change
        if (bulkEditData.accountId) {
          const transactionIds = Array.from(selectedRows).map(id => Number(id));
          promises.push(bulkUpdateMutation.mutateAsync({ transactionIds, accountId: bulkEditData.accountId }));
        }

        // Handle category change - we'll need individual updates for this
        if (bulkEditData.categoryId) {
          const categoryPromises = Array.from(selectedRows).map(id => 
            updateTransactionMutation.mutateAsync({ id: Number(id), data: { category_id: bulkEditData.categoryId } })
          );
          promises.push(...categoryPromises);
        }

        // Handle verification change
        if (bulkEditData.verified !== undefined) {
          const verifyPromises = Array.from(selectedRows).map(id => 
            updateTransactionMutation.mutateAsync({ id: Number(id), data: { verified: bulkEditData.verified } })
          );
          promises.push(...verifyPromises);
        }

        // Handle tags addition
        if (bulkEditData.tags && bulkEditData.tags.length > 0) {
          const tagPromises = Array.from(selectedRows).map(id => {
            const transaction = transactions.find(t => t.id === id);
            if (transaction) {
              const newTags = [...new Set([...transaction.tags, ...bulkEditData.tags!])];
              return updateTransactionMutation.mutateAsync({ id: Number(id), data: { tags: newTags } });
            }
            return Promise.resolve();
          });
          promises.push(...tagPromises);
        }

        await Promise.all(promises);
        
        showSuccess('Transactions updated', `Successfully updated ${selectedRows.size} transaction${selectedRows.size !== 1 ? 's' : ''}.`);
      }
      
      // Clear selection and close bulk edit
      setSelectedRows(new Set());
      setShowBulkEdit(false);
      setBulkEditData({});
    } catch (error) {
      console.error('Failed to bulk update transactions:', error);
      showError('Failed to update transactions', 'Please try again.');
    }
  };

  const handleBulkCancel = () => {
    setShowBulkEdit(false);
    setBulkEditData({});
  };

  const confirmDeleteTransactions = async () => {
    try {
      // Delete transactions
      const deletePromises = Array.from(selectedRows).map(id =>
        deleteTransactionMutation.mutateAsync(Number(id))
      );
      await Promise.all(deletePromises);

      showSuccess('Transactions deleted', `Successfully deleted ${selectedRows.size} transaction${selectedRows.size !== 1 ? 's' : ''}.`);

      setSelectedRows(new Set());
      setShowBulkEdit(false);
      setBulkEditData({});
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete transactions:', error);
      showError('Failed to delete transactions', 'Please try again.');
    }
  };

  const handleAcceptSuggestion = async (transaction: Transaction) => {
    try {
      await apiClient.acceptSuggestedCategory(Number(transaction.id));
      // Update local state
      // React Query handles refetching automatically
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
      showError('Failed to accept suggestion', 'Please try again.');
    }
  };

  const handleAutoCategorize = async (transaction: Transaction) => {
    try {
      await apiClient.autoCategorizTransaction(Number(transaction.id));
      // Update local state
      // React Query handles refetching automatically
    } catch (error) {
      console.error('Failed to auto-categorize:', error);
      showError('Failed to auto-categorize', 'Please try again.');
    }
  };

  const handleAddTransactions = async () => {
    if (!transactionData.input.trim() || !transactionData.defaultAccountId) {
      showError('Missing information', 'Please enter transaction data and select an account');
      return;
    }

    try {
      const lines = transactionData.input.trim().split('\n').filter(line => line.trim());

      // Detect if it's single or multiple transactions
      const isSingleTransaction = lines.length === 1 && !lines[0].includes(',') && !lines[0].includes('|');

      if (isSingleTransaction) {
        // Handle as single transaction
        const line = lines[0];
        let description = '';
        let amount = 0;

        // Try to parse the single line
        const amountMatch = line.match(/-?\d+(?:\.\d+)?/);
        if (amountMatch) {
          amount = parseFloat(amountMatch[0]);
          description = line.replace(amountMatch[0], '').trim();
        } else {
          description = line;
          showError('Missing amount', 'Please include an amount in your transaction. Example: "Groceries -50" or "-50 Groceries"');
          return;
        }

        if (!description || amount === 0) {
          showError('Incomplete transaction', 'Please provide both description and amount. Example: "Groceries -50" or "-50 Groceries"');
          return;
        }

        const result = await createTransactionMutation.mutateAsync({
          description: sanitizeInput(description),
          amount: amount.toString(),
          date: transactionData.defaultDate,
          account_id: transactionData.defaultAccountId!,
          category_id: transactionData.defaultCategoryId || undefined,
          transaction_type: amount >= 0 ? 'income' : 'expense',
          notes: sanitizeInput(transactionData.notes),
          tags: transactionData.tags.map(tag => sanitizeInput(tag)),
          verified: true,
          splits: []
        });

        addToHistory('single', `Added "${description}"`, 1, [result.id]);
        showSuccess('Transaction created successfully!', '');
      } else {
        // Handle as bulk transactions - use the existing bulk logic
        const transactions: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [];
        let successCount = 0;
        let errorCount = 0;

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            let description = '';
            let amount = 0;
            let date = transactionData.defaultDate;
            let categoryId = transactionData.defaultCategoryId;

            // Try comma-separated format first
            if (line.includes(',')) {
              const parts = line.split(',').map(part => part.trim());
              description = parts[0] || '';
              amount = parseFloat(parts[1]) || 0;
              if (parts[2] && parts[2].match(/^\d{4}-\d{2}-\d{2}$/)) {
                date = parts[2];
              }
              if (parts[3]) {
                const foundCategory = (categoriesQuery.data || []).find(cat =>
                  cat.name.toLowerCase().includes(parts[3].toLowerCase())
                );
                if (foundCategory) categoryId = foundCategory.id;
              }
            }
            // Try pipe-separated format
            else if (line.includes('|')) {
              const parts = line.split('|').map(part => part.trim());
              description = parts[0] || '';
              amount = parseFloat(parts[1]) || 0;
              if (parts[2] && parts[2].match(/^\d{4}-\d{2}-\d{2}$/)) {
                date = parts[2];
              }
              if (parts[3]) {
                const foundCategory = (categoriesQuery.data || []).find(cat =>
                  cat.name.toLowerCase().includes(parts[3].toLowerCase())
                );
                if (foundCategory) categoryId = foundCategory.id;
              }
            }
            // Try space-separated format (amount first)
            else {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 2) {
                if (!isNaN(parseFloat(parts[0]))) {
                  amount = parseFloat(parts[0]);
                  description = parts.slice(1).join(' ');
                } else {
                  const amountMatch = line.match(/-?\d+(?:\.\d+)?/);
                  if (amountMatch) {
                    amount = parseFloat(amountMatch[0]);
                    description = line.replace(amountMatch[0], '').trim();
                  } else {
                    description = line;
                    amount = 0;
                  }
                }
              }
            }

            if (description && amount !== 0) {
              const transactionItem: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
                description: sanitizeInput(description),
                amount: amount.toString(),
                date: date,
                account_id: transactionData.defaultAccountId!,
                category_id: categoryId || undefined,
                transaction_type: amount >= 0 ? 'income' : 'expense',
                notes: '',
                tags: [],
                verified: true,
                splits: []
              };
              transactions.push(transactionItem);
            } else {
              errorCount++;
            }
          } catch (lineError) {
            console.warn('Failed to parse line:', line);
            errorCount++;
          }
        }

        // Create all transactions
        const createdTransactionIds: number[] = [];
        for (const transaction of transactions) {
          try {
            const result = await createTransactionMutation.mutateAsync(transaction);
            createdTransactionIds.push(result.id);
            successCount++;
          } catch (error) {
            console.error('Failed to create transaction:', transaction.description, error);
            errorCount++;
          }
        }

        if (successCount > 0) {
          addToHistory('bulk', `Bulk added ${successCount} transactions`, successCount, createdTransactionIds);
        }

        if (successCount > 0) {
          showSuccess('Transactions created', `Successfully created ${successCount} transactions${errorCount > 0 ? `. ${errorCount} failed to create.` : '!'}`);
        } else {
          showError('No transactions created', 'Please check your format.');
        }
      }

      // Reset form and close modal
      setTransactionData({
        input: '',
        defaultAccountId: transactionData.defaultAccountId,
        defaultCategoryId: '',
        defaultDate: new Date().toISOString().split('T')[0],
        notes: '',
        tags: []
      });
      setShowAddTransactionModal(false);
      setSelectedAddOption('transaction');

    } catch (error) {
      console.error('Failed to create transactions:', error);
      showError('Failed to create transactions', 'Please try again.');
    }
  };


  return (
    <div className="space-y-4">
      {(searchParams.get('upload_session') || searchParams.get('group_expense')) && (
        <div className="theme-alert-info">
          <h4 className="text-sm font-medium text-blue-900 mb-1">Filtered View</h4>
          <p className="text-sm text-blue-700">
            {searchParams.get('upload_session') && 
              <>Showing transactions from upload session #{searchParams.get('upload_session')}.</>
            }
            {searchParams.get('group_expense') && 
              <>Showing transactions from group expense #{searchParams.get('group_expense')}.</>
            }
            <button 
              onClick={() => window.location.href = '/transactions'}
              className="text-blue-600 underline ml-1"
            >
              View all transactions
            </button>
          </p>
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold theme-text-primary">Transactions</h1>
          </div>
          <div className="flex items-center gap-2 text-sm theme-text-secondary">
            <span>{table.getRowModel().rows.length} total</span>
            {selectedRows.size > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs">
                {selectedRows.size} selected
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setShowAddTransactionModal(true);
              setSelectedAddOption('transaction');
            }}
            variant="primary"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>



      {/* Modern Table with Card Design */}
      <div className="space-y-4">
        {/* Compact Filters Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-0">
              <Input
                type="text"
                placeholder="Search transactions..."
                value={(table.getColumn('description')?.getFilterValue() as string) ?? ''}
                onChange={(e) => table.getColumn('description')?.setFilterValue(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="min-w-0">
              <Select
                value={(table.getColumn('account_id')?.getFilterValue() as string) ?? ''}
                onChange={(e) => table.getColumn('account_id')?.setFilterValue(e.target.value || undefined)}
                className="h-8 text-sm min-w-[140px]"
                options={[
                  { value: "", label: "All Accounts" },
                  ...accountsQuery.data?.map(account => ({ value: account.id, label: account.name })) || []
                ]}
              />
            </div>
            <div className="min-w-0">
              <Select
                value={(table.getColumn('category_id')?.getFilterValue() as string) ?? ''}
                onChange={(e) => table.getColumn('category_id')?.setFilterValue(e.target.value || undefined)}
                className="h-8 text-sm min-w-[140px]"
                options={[
                  { value: "", label: "All Categories" },
                  ...categoriesQuery.data?.map(category => ({ value: category.id, label: category.name })) || []
                ]}
              />
            </div>
            <Button
              onClick={() => {
                table.getColumn('description')?.setFilterValue('');
                table.getColumn('account_id')?.setFilterValue(undefined);
                table.getColumn('category_id')?.setFilterValue(undefined);
              }}
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-sm"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Selection Actions Bar */}
        {selectedRows.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedRows.size} transaction{selectedRows.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setBulkEditData({ action: 'edit' });
                  setShowBulkEdit(true);
                }}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Edit Selected
              </Button>
              <Button
                onClick={() => {
                  setBulkEditData({ action: 'delete' });
                  setShowBulkEdit(true);
                }}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Modern Table Container */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  {table.getHeaderGroups().map(headerGroup =>
                    headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                        style={{ width: header.getSize() }}
                      >
                        <div className="flex items-center justify-between">
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          {header.column.getCanSort() && (
                            <div className="flex flex-col ml-2">
                              <ChevronUp className={`h-3 w-3 ${header.column.getIsSorted() === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} />
                              <ChevronDown className={`h-3 w-3 -mt-1 ${header.column.getIsSorted() === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} />
                            </div>
                          )}
                        </div>
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={table.getAllColumns().length} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No transactions found</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                            Get started by adding your first transaction or importing from a bank statement.
                          </p>
                        </div>
                        <Button
                          onClick={() => setShowAddTransactionModal(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Your First Transaction
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr
                      key={row.id}
                      className={`
                        group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200
                        ${editingCell?.id === row.original.id.toString() ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800' : ''}
                        ${selectedRows.has(row.original.id) ? 'bg-blue-50 dark:bg-blue-950/30' : ''}
                      `}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4 p-4">
            {table.getRowModel().rows.length === 0 ? (
              <div className="flex flex-col items-center space-y-4 py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-gray-400" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No transactions found</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add your first transaction to get started.
                  </p>
                </div>
                <Button
                  onClick={() => setShowAddTransactionModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Transaction
                </Button>
              </div>
            ) : (
              table.getRowModel().rows.map(row => {
                const transaction = row.original;
                const isSelected = selectedRows.has(transaction.id);
                const accountName = accountsQuery.data?.find(acc => acc.id === transaction.account_id)?.name || 'Unknown Account';
                const categoryName = categoriesQuery.data?.find(cat => cat.id === transaction.category_id)?.name;

                return (
                  <div
                    key={row.id}
                    className={`
                      bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4 shadow-sm
                      ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}
                      ${editingCell?.id === transaction.id.toString() ? 'ring-2 ring-blue-300' : ''}
                    `}
                  >
                    {/* Mobile Transaction Card Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleRowSelection(transaction.id, !isSelected)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        <div>
                          <EditableTextCell
                            transaction={transaction}
                            field="description"
                            value={transaction.description}
                            placeholder="Add description..."
                          />
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(transaction.date).toLocaleDateString()} • {accountName}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-semibold ${
                          parseFloat(transaction.amount) > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {parseFloat(transaction.amount) > 0 ? '+' : ''}{formatCurrency(parseFloat(transaction.amount), authState.user)}
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Button
                            onClick={() => handleSplitEdit(transaction)}
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto"
                          >
                            <Split className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleAutoCategorize(transaction)}
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto"
                          >
                            <Sparkles className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Transaction Details */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Category</label>
                          <EditableSelectCell
                            transaction={transaction}
                            field="category_id"
                            value={transaction.category_id}
                            options={categoriesQuery.data?.map(cat => ({ value: cat.id, label: cat.name })) || []}
                            placeholder="No category"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Status</label>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            transaction.verified
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {transaction.verified ? 'Verified' : 'Unverified'}
                          </span>
                        </div>
                      </div>

                      {(transaction.tags.length > 0 || transaction.notes) && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-600">
                          {transaction.tags.length > 0 && (
                            <div className="mb-2">
                              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Tags</label>
                              <div className="flex flex-wrap gap-1">
                                {transaction.tags.map((tag, index) => (
                                  <span key={index} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {transaction.notes && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Notes</label>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{transaction.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={splitModalOpen}
        onClose={() => setSplitModalOpen(false)}
        title={`Edit Splits - ${splitTransaction?.description || 'Transaction'}`}
      >
        {splitTransaction && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm theme-text-secondary">
                <div>Transaction: {splitTransaction.description}</div>
                <div>Amount: ${Math.abs(parseFloat(splitTransaction.amount)).toFixed(2)}</div>
                <div>Date: {new Date(splitTransaction.date).toLocaleDateString()}</div>
              </div>
            </div>
            
            <SplitEditor
              splits={splitTransaction.splits || []}
              totalAmount={parseFloat(splitTransaction.amount)}
              onSplitsChange={handleSplitsUpdate}
            />
            
            <div className="flex justify-end space-x-2">
              <Button
              onClick={() => setSplitModalOpen(false)}
              variant="secondary"
              size="md"
            >
              Close
            </Button>
            </div>
          </div>
        )}
      </Modal>


      {/* Bulk Edit Modal */}
      <Modal
        isOpen={showBulkEdit}
        onClose={handleBulkCancel}
        title={`${bulkEditData.action === 'delete' ? 'Delete' : 'Bulk Edit'} ${selectedRows.size} Transaction${selectedRows.size !== 1 ? 's' : ''}`}
      >
        <div className="space-y-6">
          {bulkEditData.action === 'delete' ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-900 mb-2">Confirm Deletion</h4>
              <p className="text-sm text-red-700">
                Are you sure you want to delete {selectedRows.size} transaction{selectedRows.size !== 1 ? 's' : ''}? This action cannot be undone.
              </p>
            </div>
          ) : (
            <div className="theme-alert-info">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Bulk Edit Options</h4>
              <p className="text-sm text-blue-700">
                Make changes to all {selectedRows.size} selected transactions. Only modified fields will be updated.
              </p>
            </div>
          )}
          
          {bulkEditData.action !== 'delete' && (
            <div className="space-y-4">
              {/* Account Selection */}
              <div>
                <Select
                  label="Change Account"
                  value={bulkEditData.accountId || ''}
                  onChange={(e) => setBulkEditData(prev => ({ 
                    ...prev, 
                    accountId: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                  options={[
                    { value: "", label: "Keep current accounts" },
                    ...accountsQuery.data || [].map((account) => ({ value: account.id, label: `${account.name} (${account.account_type}) - ${formatCurrency(parseFloat(account.balance || '0'), authState.user)}` }))
                  ]}
                />
              </div>

              {/* Category Selection */}
              <div>
                <Select
                  label="Change Category"
                  value={bulkEditData.categoryId || ''}
                  onChange={(e) => setBulkEditData(prev => ({ 
                    ...prev, 
                    categoryId: e.target.value || undefined 
                  }))}
                  options={[
                    { value: "", label: "Keep current categories" },
                    ...categoriesQuery.data || [].map((category) => ({ value: category.id, label: category.name }))
                  ]}
                />
              </div>

              {/* Verification Status */}
              <div>
                <Select
                  label="Verification Status"
                  value={bulkEditData.verified === undefined ? '' : bulkEditData.verified.toString()}
                  onChange={(e) => setBulkEditData(prev => ({ 
                    ...prev, 
                    verified: e.target.value === '' ? undefined : e.target.value === 'true'
                  }))}
                  options={[
                    { value: "", label: "Keep current status" },
                    { value: "true", label: "Mark as Verified" },
                    { value: "false", label: "Mark as Unverified" },
                  ]}
                />
              </div>

              {/* Tags Addition */}
              <div>
                <TagInput
                  tags={bulkEditData.tags || []}
                  onTagsChange={(newTags) => setBulkEditData(prev => ({ 
                    ...prev, 
                    tags: newTags
                  }))}
                  placeholder="e.g. business, travel, important"
                />
                <p className="text-xs theme-text-muted mt-1">
                  These tags will be added to existing tags (duplicates will be ignored)
                </p>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-yellow-900 mb-1">Auto-Save</h5>
            <p className="text-sm text-yellow-700">
              Changes will be applied immediately when you click "Apply Changes". This action cannot be undone.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={handleBulkCancel}
              variant="secondary"
              size="md"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkSave}
              disabled={!bulkEditData.accountId && !bulkEditData.categoryId}
            >
              Apply Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Enhanced Add Transaction Modal */}
      <Modal
        isOpen={showAddTransactionModal}
        onClose={() => {
          setShowAddTransactionModal(false);
          setSelectedAddOption('transaction');
        }}
        title="Add Transactions"
        size="xl"
      >
        <div className="space-y-4">
          {/* History Section - Simplified */}
          {actionHistory.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="theme-text-secondary">Recent: {actionHistory[0].action}</span>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {showHistory ? 'Hide' : `View all (${actionHistory.length})`}
                </button>
              </div>
              {showHistory && (
                <div className="mt-3 space-y-1">
                  {actionHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs py-1">
                      <span>{item.action}</span>
                      {item.canRevert && (
                        <button
                          onClick={() => revertAction(item)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alternative Options */}
          <div className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <span className="text-sm theme-text-secondary">Or use:</span>
            <button
              onClick={() => setSelectedAddOption('scan')}
              className={`text-sm font-medium transition-colors ${
                selectedAddOption === 'scan'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
              }`}
            >
              Scan Receipt
            </button>
            <span className="theme-text-muted">•</span>
            <button
              onClick={() => setSelectedAddOption('upload')}
              className={`text-sm font-medium transition-colors ${
                selectedAddOption === 'upload'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
              }`}
            >
              Upload File
            </button>
          </div>

          {/* Main Transaction Form */}
          {selectedAddOption === 'transaction' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium theme-text-primary mb-1">
                    Account *
                  </label>
                  <select
                    value={transactionData.defaultAccountId || ''}
                    onChange={(e) => setTransactionData(prev => ({
                      ...prev,
                      defaultAccountId: e.target.value ? Number(e.target.value) : null
                    }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 theme-text-primary"
                    required
                  >
                    <option value="">Select account...</option>
                    {accountsQuery.data?.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.account_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium theme-text-primary mb-1">
                    Default Category
                  </label>
                  <select
                    value={transactionData.defaultCategoryId}
                    onChange={(e) => setTransactionData(prev => ({ ...prev, defaultCategoryId: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 theme-text-primary"
                  >
                    <option value="">No category</option>
                    {categoriesQuery.data?.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium theme-text-primary mb-1">
                    Default Date
                  </label>
                  <input
                    type="date"
                    value={transactionData.defaultDate}
                    onChange={(e) => setTransactionData(prev => ({ ...prev, defaultDate: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 theme-text-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium theme-text-primary mb-1">
                  Transaction(s) *
                </label>
                <textarea
                  value={transactionData.input}
                  onChange={(e) => setTransactionData(prev => ({ ...prev, input: e.target.value }))}
                  placeholder="Enter transactions here..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 theme-text-primary font-mono text-sm"
                  rows={6}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium theme-text-primary mb-1">
                    Tags <span className="text-xs theme-text-secondary font-normal">(optional)</span>
                  </label>
                  <TagInput
                    tags={transactionData.tags}
                    onTagsChange={(newTags) => setTransactionData(prev => ({ ...prev, tags: newTags }))}
                    placeholder="business, travel, important"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium theme-text-primary mb-1">
                    Notes <span className="text-xs theme-text-secondary font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={transactionData.notes}
                    onChange={(e) => setTransactionData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes for single transactions"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 theme-text-primary"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={handleAddTransactions}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                >
                  Add Transaction(s)
                </Button>
              </div>
            </div>
          )}

          {selectedAddOption === 'scan' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold theme-text-primary">Scan & OCR</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-300 dark:border-gray-600 rounded p-4">
                  <h4 className="font-medium theme-text-primary mb-2">Receipt Scanner</h4>
                  <p className="text-sm theme-text-secondary mb-4">
                    Use your camera to scan receipts and extract transaction data automatically.
                  </p>
                  <ReceiptScanner
                    accounts={accountsQuery.data || []}
                    categories={categoriesQuery.data || []}
                    onTransactionCreated={(transactionData) => {
                      addToHistory('scan', `Scanned receipt: ${transactionData?.description || 'Receipt'}`, 1);
                      setShowAddTransactionModal(false);
                      window.location.reload();
                    }}
                    onClose={() => setSelectedAddOption('transaction')}
                  />
                </div>

                <div className="border border-gray-300 dark:border-gray-600 rounded p-4">
                  <h4 className="font-medium theme-text-primary mb-2">Invoice OCR</h4>
                  <p className="text-sm theme-text-secondary mb-4">
                    Process invoices and business documents with advanced OCR technology.
                  </p>
                  <Link to="/invoice-ocr">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Open Invoice OCR
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedAddOption('transaction')}
                  className="text-blue-600 hover:text-blue-700"
                >
                  ← Back to Manual Entry
                </button>
              </div>
            </div>
          )}

          {selectedAddOption === 'upload' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold theme-text-primary">Upload File</h3>

              <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm">
                <p className="theme-text-primary mb-2"><strong>Supported formats:</strong></p>
                <div className="text-xs theme-text-secondary space-y-1">
                  <div>• CSV: date,description,amount,category</div>
                  <div>• PDF: Bank statements</div>
                  <div>• JSON: Structured transaction data</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium theme-text-primary mb-1">
                  Account for imported transactions
                </label>
                <select
                  value={selectedUploadAccount || ''}
                  onChange={(e) => setSelectedUploadAccount(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 theme-text-primary"
                >
                  <option value="">Select account...</option>
                  {accountsQuery.data?.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.account_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded p-6 text-center hover:border-blue-400 transition-colors">
                <Upload className="mx-auto h-12 w-12 theme-text-muted mb-3" />
                <label className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    Choose file to upload
                  </span>
                  <input
                    type="file"
                    accept=".csv,.pdf,.json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await handleFileUpload(file);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
                <p className="text-sm theme-text-secondary mt-1">
                  CSV, PDF, or JSON files up to 10MB
                </p>
              </div>

              <div className="flex justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedAddOption('transaction')}
                  className="text-blue-600 hover:text-blue-700"
                >
                  ← Back to Manual Entry
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>


      {/* Password Prompt */}
      {showPasswordPrompt && (
        <PasswordPrompt
          filename={showPasswordPrompt.filename}
          onSubmit={handlePasswordSubmit}
          onCancel={handlePasswordCancel}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteTransactions}
        title="Delete Transactions"
      >
        Are you sure you want to delete {selectedRows.size} transaction{selectedRows.size !== 1 ? 's' : ''}? This action cannot be undone.
      </ConfirmationModal>
    </div>
  );
};