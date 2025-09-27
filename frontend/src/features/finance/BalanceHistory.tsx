import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Save,
  Eye,
  BarChart3,
} from 'lucide-react';
import { useBalanceRecords, useCreateBalanceRecord } from './hooks/queries/useAccounts';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/preferences';
import { Account, BalanceRecord } from '../../types';
import { Button } from '../../components/ui/Button';

interface BalanceHistoryProps {
  account: Account;
  className?: string;
}

export const BalanceHistory: React.FC<BalanceHistoryProps> = ({
  account,
  className = ''
}) => {
  const { state: authState } = useAuth();
  const balanceRecordsQuery = useBalanceRecords(account.id);
  const createBalanceRecord = useCreateBalanceRecord();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newBalance, setNewBalance] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [entryType, setEntryType] = useState<'manual' | 'monthly' | 'reconciliation'>('manual');
  const [formError, setFormError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setShowSuccess(false);

    // Validation
    if (!newBalance.trim()) {
      setFormError('Balance is required');
      return;
    }

    const balanceValue = parseFloat(newBalance);
    if (isNaN(balanceValue)) {
      setFormError('Please enter a valid balance amount');
      return;
    }

    if (!newDate) {
      setFormError('Date is required');
      return;
    }

    // Check if date is not in the future for monthly entries
    if (entryType === 'monthly') {
      const selectedDate = new Date(newDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (selectedDate > today) {
        setFormError('Monthly entries cannot be in the future');
        return;
      }
    }

    try {
      await createBalanceRecord.mutateAsync({
        account_id: account.id,
        balance: balanceValue,
        date: newDate,
        entry_type: entryType,
        notes: newNotes.trim() || undefined,
      });

      // Clear form
      setNewBalance('');
      setNewNotes('');
      setNewDate(new Date().toISOString().split('T')[0]);
      setEntryType('manual');
      setShowAddForm(false);
      setShowSuccess(true);

      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      let errorMessage = 'Failed to add balance record. Please try again.';

      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setFormError(errorMessage);
    }
  };

  const clearFormAndErrors = () => {
    setShowAddForm(false);
    setFormError('');
    setShowSuccess(false);
  };

  const getChangeIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600 dark:text-green-400';
    if (current < previous) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  const records = balanceRecordsQuery.data || [];

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Balance History
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {account.name} • {records.length} records
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
            title="Add Balance Record"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

      </div>

      {/* Add Balance Form */}
      {showAddForm && (
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Add Balance Record
          </h4>
          <form onSubmit={handleAddBalance} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Balance *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => {
                    setNewBalance(e.target.value);
                    if (formError) setFormError('');
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => {
                    setNewDate(e.target.value);
                    if (formError) setFormError('');
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Entry Type
              </label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as 'manual' | 'monthly' | 'reconciliation')}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="manual">Manual Entry</option>
                <option value="monthly">Monthly Statement</option>
                <option value="reconciliation">Reconciliation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional notes about this balance record..."
              />
            </div>

            {formError && (
              <div className="text-xs text-red-600 dark:text-red-400">
                {formError}
              </div>
            )}

            {showSuccess && (
              <div className="text-xs text-green-600 dark:text-green-400">
                Balance record added successfully!
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={createBalanceRecord.isPending}
                className="flex-1"
              >
                {createBalanceRecord.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-2" />
                    Add Record
                  </>
                )}
              </Button>
              <button
                type="button"
                onClick={clearFormAndErrors}
                className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Balance Records */}
      <div className="p-3">
        <div className="max-h-[400px] overflow-y-auto">
          {balanceRecordsQuery.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
            </div>
          ) : balanceRecordsQuery.error ? (
            <div className="text-center py-6">
              <p className="text-sm text-red-600 dark:text-red-400">
                Failed to load balance history
                {balanceRecordsQuery.error?.message ? `: ${balanceRecordsQuery.error.message}` : ''}
              </p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-6">
              <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No balance records yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Add your first balance record to track account history
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record, index) => {
                const previousRecord = records[index + 1];
                const change = previousRecord ? record.balance - previousRecord.balance : 0;

                return (
                  <div
                    key={record.id}
                    className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {previousRecord && getChangeIcon(record.balance, previousRecord.balance)}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(record.balance, authState.user)}
                        </span>
                        {previousRecord && Math.abs(change) > 0.01 && (
                          <span className={`text-xs font-medium ${getChangeColor(record.balance, previousRecord.balance)}`}>
                            {change > 0 ? '+' : ''}{formatCurrency(change, authState.user)}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(record.date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                          {record.entry_type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    {record.notes && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {record.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};