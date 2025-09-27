import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Edit3 } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Account, MonthlyBalance } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ObjectForm } from '../../components/forms/ObjectForm';
import { monthlyBalanceSchema, MonthlyBalanceFormData } from './schemas/forms';
import { formatCurrency, formatDate } from '../../utils/preferences';

interface MonthlyBalancesProps {
  selectedAccountId?: number;
}

export function MonthlyBalances({ selectedAccountId }: MonthlyBalancesProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingBalance, setEditingBalance] = useState<MonthlyBalance | null>(null);
  const queryClient = useQueryClient();

  // Get accounts for selection
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiClient.getAccounts()
  });

  // Get monthly balances
  const { data: monthlyBalances = [], isLoading } = useQuery({
    queryKey: selectedAccountId
      ? ['monthlyBalances', selectedAccountId]
      : ['monthlyBalances', 'all'],
    queryFn: () => selectedAccountId
      ? apiClient.getAccountMonthlyBalances(selectedAccountId)
      : apiClient.getAllMonthlyBalances()
  });

  // Get discrepancies
  const { data: discrepancies = [] } = useQuery({
    queryKey: ['discrepancies'],
    queryFn: () => apiClient.getDiscrepancies()
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: MonthlyBalanceFormData) => apiClient.createMonthlyBalance({
      ...data,
      account: data.account || selectedAccountId!
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBalances'] });
      queryClient.invalidateQueries({ queryKey: ['discrepancies'] });
      setShowForm(false);
      setEditingBalance(null);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<MonthlyBalance> }) =>
      apiClient.updateMonthlyBalance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBalances'] });
      queryClient.invalidateQueries({ queryKey: ['discrepancies'] });
      setEditingBalance(null);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteMonthlyBalance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBalances'] });
      queryClient.invalidateQueries({ queryKey: ['discrepancies'] });
    }
  });

  const handleSubmit = (data: MonthlyBalanceFormData) => {
    if (editingBalance) {
      updateMutation.mutate({ id: editingBalance.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getBalanceStatusBadge = (balance: MonthlyBalance) => {
    if (balance.has_discrepancy) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Discrepancy</Badge>;
    }
    if (balance.reconciled) {
      return <Badge variant="success" className="gap-1"><CheckCircle className="w-3 h-3" /> Reconciled</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><XCircle className="w-3 h-3" /> Pending</Badge>;
  };

  const getCurrentMonthDefault = () => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      balance: 0,
      total_income: 0,
      total_expenses: 0,
      calculated_change: 0,
      reconciled: false,
      notes: '',
      account: selectedAccountId || (accounts[0]?.id || 0)
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Monthly Balances
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track monthly account balances to identify missing transactions and analyze trends
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Monthly Balance
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {monthlyBalances.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Discrepancies</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {discrepancies.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Reconciled</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {monthlyBalances.filter(b => b.reconciled).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Discrepancies Alert */}
      {discrepancies.length > 0 && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                {discrepancies.length} Discrepancies Found
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                Some monthly balances don't match expected values. Review these entries for missing transactions.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Monthly Balances List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Loading monthly balances...</p>
          </div>
        ) : monthlyBalances.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Monthly Balances
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start tracking your monthly account balances to identify discrepancies and trends.
            </p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add First Entry
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {monthlyBalances.map((balance) => (
              <Card key={balance.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {balance.account_name}
                      </h3>
                      <Badge variant="outline">{balance.account_type}</Badge>
                      {getBalanceStatusBadge(balance)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Month</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {balance.date_display}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Balance</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(parseFloat(balance.balance))}
                        </p>
                      </div>
                      {balance.statement_balance && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Statement</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(parseFloat(balance.statement_balance))}
                          </p>
                        </div>
                      )}
                      {parseFloat(balance.difference) !== 0 && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Difference</p>
                          <p className={`font-semibold ${
                            parseFloat(balance.difference) > 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatCurrency(parseFloat(balance.difference))}
                          </p>
                        </div>
                      )}
                    </div>

                    {(parseFloat(balance.total_income) > 0 || parseFloat(balance.total_expenses) > 0) && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Income</p>
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(parseFloat(balance.total_income))}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Expenses</p>
                            <p className="font-semibold text-red-600 dark:text-red-400">
                              {formatCurrency(parseFloat(balance.total_expenses))}
                            </p>
                          </div>
                        </div>
                        {parseFloat(balance.missing_transactions) !== 0 && (
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Missing</p>
                            <p className="font-semibold text-orange-600 dark:text-orange-400">
                              {formatCurrency(Math.abs(parseFloat(balance.missing_transactions)))}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {balance.notes && (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{balance.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingBalance(balance)}
                      className="gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this monthly balance entry?')) {
                          deleteMutation.mutate(balance.id);
                        }
                      }}
                      className="gap-1 text-red-600 hover:text-red-700"
                    >
                      <XCircle className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {(showForm || editingBalance) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingBalance ? 'Edit Monthly Balance' : 'Add Monthly Balance'}
            </h3>

            <ObjectForm
              schema={monthlyBalanceSchema}
              onSubmit={handleSubmit}
              initialData={editingBalance || getCurrentMonthDefault()}
              isLoading={createMutation.isPending || updateMutation.isPending}
              submitButtonText={editingBalance ? 'Update Balance' : 'Add Balance'}
              fieldConfigs={{
                account: {
                  type: 'select',
                  label: 'Account',
                  options: accounts.map(account => ({
                    value: account.id,
                    label: `${account.name} (${account.account_type})`
                  })),
                  disabled: !!selectedAccountId
                },
                year: {
                  type: 'number',
                  label: 'Year',
                  placeholder: '2024'
                },
                month: {
                  type: 'select',
                  label: 'Month',
                  options: [
                    { value: 1, label: 'January' },
                    { value: 2, label: 'February' },
                    { value: 3, label: 'March' },
                    { value: 4, label: 'April' },
                    { value: 5, label: 'May' },
                    { value: 6, label: 'June' },
                    { value: 7, label: 'July' },
                    { value: 8, label: 'August' },
                    { value: 9, label: 'September' },
                    { value: 10, label: 'October' },
                    { value: 11, label: 'November' },
                    { value: 12, label: 'December' }
                  ]
                },
                balance: {
                  type: 'number',
                  label: 'Account Balance',
                  placeholder: '0.00',
                  step: '0.01'
                },
                statement_balance: {
                  type: 'number',
                  label: 'Statement Balance (optional)',
                  placeholder: '0.00',
                  step: '0.01'
                },
                total_income: {
                  type: 'number',
                  label: 'Total Income',
                  placeholder: '0.00',
                  step: '0.01'
                },
                total_expenses: {
                  type: 'number',
                  label: 'Total Expenses',
                  placeholder: '0.00',
                  step: '0.01'
                },
                calculated_change: {
                  type: 'number',
                  label: 'Calculated Change',
                  placeholder: '0.00',
                  step: '0.01'
                },
                reconciled: {
                  type: 'checkbox',
                  label: 'Mark as Reconciled',
                  description: 'Check if this balance has been verified and reconciled'
                },
                notes: {
                  type: 'textarea',
                  label: 'Notes',
                  placeholder: 'Add any notes about this monthly balance...',
                  rows: 3
                }
              }}
            />

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingBalance(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}