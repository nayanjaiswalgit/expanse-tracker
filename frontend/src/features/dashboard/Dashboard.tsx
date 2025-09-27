import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, Plus,
  PieChart as PieChartIcon, BarChart3, RefreshCw, ArrowRight, Sparkles,
  Settings, Target, Users, Zap, Clock, Calendar, Star, User, Eye, MoreHorizontal,
  Menu, Home, Activity, FolderOpen
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTransactions, useTransactionSummary, useCategories, useAccounts, useGoals, useExportTransactions } from '../finance/hooks/queries';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/preferences';
import { useToast } from '../../components/ui/Toast';
import { LoadingSpinner } from '../../components/layout/LoadingSpinner';
import { Select } from '../../components/ui/Select';
import { ColoredCircle } from '../../components/common/ColoredCircle';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import type { Filter } from '../../types';

interface TimeRange {
  label: string;
  value: string;
  days: number;
}

interface AnalyticsData {
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
  avgTransaction: number;
  avgIncome: number;
  avgExpenses: number;
  topCategory: string;
  topCategoryAmount: number;
  transactionTrend: number;
  incomeTrend: number;
  expensesTrend: number;
}

export const Dashboard: React.FC = () => {
  const { state: authState } = useAuth();
  const transactionsQuery = useTransactions();
  const summaryQuery = useTransactionSummary();
  const categoriesQuery = useCategories();
  const accountsQuery = useAccounts();
  const goalsQuery = useGoals();
  const exportTransactionsMutation = useExportTransactions();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [selectedTimeRange, setSelectedTimeRange] = useState('30');
  const [filters] = useState<Filter>({
    accounts: [],
    categories: [],
    dateFrom: '',
    dateTo: '',
    tags: [],
    amountMin: undefined,
    amountMax: undefined,
    search: ''
  });

  const timeRanges: TimeRange[] = [
    { label: 'Last 7 days', value: '7', days: 7 },
    { label: 'Last 30 days', value: '30', days: 30 },
    { label: 'Last 90 days', value: '90', days: 90 },
    { label: 'Last 6 months', value: '180', days: 180 },
    { label: 'Last year', value: '365', days: 365 },
    { label: 'All time', value: 'all', days: 0 },
  ];

  const isLoading = transactionsQuery.isLoading || summaryQuery.isLoading || categoriesQuery.isLoading || accountsQuery.isLoading || goalsQuery.isLoading;

  useEffect(() => {
    if (transactionsQuery.error) {
      showError('Failed to load transactions', 'Please try refreshing the page');
    }
    if (summaryQuery.error) {
      showError('Failed to load summary', 'Please try refreshing the page');
    }
  }, [transactionsQuery.error, summaryQuery.error, showError]);

  const filteredTransactions = useMemo(() => {
    const transactionsData = transactionsQuery.data || [];
    let transactions = Array.isArray(transactionsData) ? transactionsData : (transactionsData.results || []);

    if (selectedTimeRange !== 'all') {
      const days = parseInt(selectedTimeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      transactions = transactions.filter(t => new Date(t.date) >= cutoffDate);
    }

    return transactions.filter(transaction => {
      if (filters.accounts && filters.accounts.length > 0 && !filters.accounts.includes(transaction.account_id)) {
        return false;
      }
      if (filters.categories && filters.categories.length > 0 && transaction.category_id && !filters.categories.includes(transaction.category_id)) {
        return false;
      }
      if (filters.dateFrom && transaction.date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && transaction.date > filters.dateTo) {
        return false;
      }
      if (filters.tags && filters.tags.length > 0 && !filters.tags.some(tag => transaction.tags.includes(tag))) {
        return false;
      }
      if (filters.amountMin !== undefined && Math.abs(parseFloat(transaction.amount)) < filters.amountMin) {
        return false;
      }
      if (filters.amountMax !== undefined && Math.abs(parseFloat(transaction.amount)) > filters.amountMax) {
        return false;
      }
      if (filters.search && !transaction.description.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [transactionsQuery.data, selectedTimeRange, filters]);

  const analyticsData = useMemo((): AnalyticsData => {
    const income = filteredTransactions.filter(t => parseFloat(t.amount) > 0).reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expenses = filteredTransactions.filter(t => parseFloat(t.amount) < 0).reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
    const incomeTransactions = filteredTransactions.filter(t => parseFloat(t.amount) > 0);
    const expenseTransactions = filteredTransactions.filter(t => parseFloat(t.amount) < 0);

    const categoryTotals: Record<string, number> = {};
    filteredTransactions.forEach(transaction => {
      if (transaction.category_id && parseFloat(transaction.amount) < 0) {
        const categories = categoriesQuery.data?.results || [];
        const category = categories.find((cat: any) => cat.id === transaction.category_id);
        const categoryName = category?.name || 'Uncategorized';
        categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + Math.abs(parseFloat(transaction.amount));
      }
    });

    const topCategoryEntry = Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0];

    const currentPeriodDays = selectedTimeRange === 'all' ? 365 : parseInt(selectedTimeRange);
    const previousStartDate = new Date();
    previousStartDate.setDate(previousStartDate.getDate() - (currentPeriodDays * 2));
    const previousEndDate = new Date();
    previousEndDate.setDate(previousEndDate.getDate() - currentPeriodDays);

    const allTransactions = transactionsQuery.data || [];
    const transactionList = Array.isArray(allTransactions) ? allTransactions : (allTransactions.results || []);
    const previousTransactions = transactionList.filter(t => {
      const date = new Date(t.date);
      return date >= previousStartDate && date <= previousEndDate;
    });

    const previousIncome = previousTransactions.filter(t => parseFloat(t.amount) > 0).reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const previousExpenses = previousTransactions.filter(t => parseFloat(t.amount) < 0).reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalTransactions: filteredTransactions.length,
      totalIncome: income,
      totalExpenses: expenses,
      netFlow: income - expenses,
      avgTransaction: filteredTransactions.length > 0 ?
        filteredTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) / filteredTransactions.length : 0,
      avgIncome: incomeTransactions.length > 0 ? income / incomeTransactions.length : 0,
      avgExpenses: expenseTransactions.length > 0 ? expenses / expenseTransactions.length : 0,
      topCategory: topCategoryEntry?.[0] || 'N/A',
      topCategoryAmount: topCategoryEntry?.[1] || 0,
      transactionTrend: calculateTrend(filteredTransactions.length, previousTransactions.length),
      incomeTrend: calculateTrend(income, previousIncome),
      expensesTrend: calculateTrend(expenses, previousExpenses),
    };
  }, [filteredTransactions, selectedTimeRange, transactionsQuery.data, categoriesQuery.data]);

  const chartData = useMemo(() => {
    const groupBy = selectedTimeRange === '7' ? 'day' :
                   selectedTimeRange === '30' || selectedTimeRange === '90' ? 'week' : 'month';

    const dataPoints: Record<string, { period: string; income: number; expenses: number; net: number; date: Date }> = {};

    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      let key: string;

      if (groupBy === 'day') {
        key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (groupBy === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      }

      if (!dataPoints[key]) {
        dataPoints[key] = { period: key, income: 0, expenses: 0, net: 0, date };
      }

      const amount = parseFloat(transaction.amount);
      if (amount > 0) {
        dataPoints[key].income += amount;
      } else {
        dataPoints[key].expenses += Math.abs(amount);
      }
      dataPoints[key].net = dataPoints[key].income - dataPoints[key].expenses;
    });

    return Object.values(dataPoints).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredTransactions, selectedTimeRange]);

  const recentTransactions = useMemo(() => {
    const allTransactions = transactionsQuery.data || [];
    const list = Array.isArray(allTransactions) ? allTransactions : (allTransactions.results || []);
    return list
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // Limit to 5 transactions for better dashboard layout
  }, [transactionsQuery.data]);

  const goals = (goalsQuery.data || []).slice(0, 3);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const summary = summaryQuery.data;
  const accounts = accountsQuery.data?.results || [];
  const totalBalance = summary?.account_balances?.reduce((sum, acc) => sum + parseFloat(acc.balance), 0) ||
                     accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0) || 0;
  const primaryAccount = accounts[0];

  // Get accounts with different types, excluding the primary account for "other accounts"
  const otherAccounts = accounts.filter((acc, index) => index !== 0 && acc.is_active).slice(0, 4);

  // Helper function to mask account number
  const maskAccountNumber = (accountNumber: string | undefined): string => {
    if (!accountNumber) return '•••• •••• •••• ••••';
    if (accountNumber.length < 4) return '•••• •••• •••• ••••';
    const lastFour = accountNumber.slice(-4);
    return `•••• •••• •••• ${lastFour}`;
  };

  // Helper function to get account type display name
  const getAccountTypeDisplay = (accountType: string): string => {
    const typeMap: Record<string, string> = {
      'checking': 'Checking',
      'savings': 'Savings',
      'credit': 'Credit Card',
      'investment': 'Investment',
      'loan': 'Loan',
      'cash': 'Cash',
      'other': 'Other'
    };
    return typeMap[accountType] || accountType;
  };

  // Use real transactions data, limit to 4 for better layout
  const displayTransactions = recentTransactions.slice(0, 4);

  // Helper function to truncate long text
  const truncateText = (text: string | number | undefined | null, maxLength: number = 15): string => {
    if (!text) return '';
    const textStr = String(text);
    if (textStr.length <= maxLength) return textStr;
    return textStr.substring(0, maxLength) + '...';
  };

  // Use real goals data, limit to 3 for better layout
  const displayGoals = goals.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="xl:col-span-4 space-y-6">
            {/* Overall Balance */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">Overall balance</span>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                    <Plus className="w-2 h-2 text-white" />
                  </div>
                  <button
                    onClick={() => navigate('/accounts/new')}
                    className="text-xs text-blue-500 hover:text-blue-600"
                  >
                    Add new
                  </button>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                ${totalBalance.toLocaleString()}
              </div>

              {/* Featured Account Card */}
              {primaryAccount ? (
                <div className={`rounded-2xl p-6 text-white ${
                  primaryAccount.account_type === 'credit' ?
                  'bg-gradient-to-br from-purple-500 to-blue-600' :
                  primaryAccount.account_type === 'savings' ?
                  'bg-gradient-to-br from-green-500 to-teal-600' :
                  primaryAccount.account_type === 'investment' ?
                  'bg-gradient-to-br from-yellow-500 to-orange-600' :
                  'bg-gradient-to-br from-blue-500 to-indigo-600'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-sm opacity-90">{getAccountTypeDisplay(primaryAccount.account_type)}</div>
                      <div className="text-xl font-bold mt-2">{primaryAccount.name}</div>
                      <div className="text-sm opacity-75 mt-1">{maskAccountNumber(primaryAccount.account_number)}</div>
                    </div>
                    <div className="bg-white/20 px-3 py-1 rounded text-sm font-bold">
                      {primaryAccount.institution || primaryAccount.currency}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-sm opacity-75">{new Date().toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })}</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(parseFloat(primaryAccount.balance || '0'), authState.user)}
                    </div>
                  </div>
                </div>
              ) : (
                // Empty state when no accounts exist
                <div className="bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl p-6 text-white">
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="text-lg font-bold mb-2">No Accounts</div>
                    <div className="text-sm opacity-75 text-center">
                      Add your first account to get started
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Other Accounts */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Other accounts</h3>
              <div className="space-y-4">
                {otherAccounts.length > 0 ? (
                  otherAccounts.map((account) => (
                    <div key={account.id} className="flex justify-between items-center">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {maskAccountNumber(account.account_number)}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate" title={account.name}>
                          {truncateText(account.name, 15)}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {getAccountTypeDisplay(account.account_type)}
                        </div>
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white ml-2">
                        {formatCurrency(parseFloat(account.balance || '0'), authState.user)}
                      </div>
                    </div>
                  ))
                ) : (
                  // Empty state when no other accounts exist
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No additional accounts</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add more accounts to see them here</p>
                  </div>
                )}
                <button
                  onClick={() => navigate('/accounts')}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  {otherAccounts.length > 0 ? 'Manage accounts' : 'Add accounts'}
                </button>
              </div>
            </div>

            {/* Goals */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Goals</h3>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                    <Plus className="w-2 h-2 text-white" />
                  </div>
                  <button
                    onClick={() => navigate('/goals/new')}
                    className="text-xs text-blue-500 hover:text-blue-600"
                  >
                    Add new
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {displayGoals.length > 0 ? (
                  displayGoals.map((goal, index) => {
                    const emojis = ['🎯', '💰', '🏆'];
                    const progressColor = goal.progress_percentage >= 70 ? '#10b981' :
                                        goal.progress_percentage >= 50 ? '#f59e0b' : '#3b82f6';
                    return (
                      <div key={goal.id} className="flex items-start space-x-3">
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <svg className="w-12 h-12 transform rotate-0" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              className="text-gray-200 dark:text-gray-600"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke={progressColor}
                              strokeWidth="3"
                              strokeDasharray={`${goal.progress_percentage}, 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                              {Math.round(goal.progress_percentage)}%
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-1">
                              <span
                                className="text-sm font-semibold text-gray-900 dark:text-white truncate"
                                title={goal.name || ''}
                              >
                                {truncateText(goal.name, 14)}
                              </span>
                              <span className="text-sm flex-shrink-0">{emojis[index] || '🎯'}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                              <span className="text-xs font-medium text-gray-900 dark:text-white">
                                {formatCurrency(parseFloat(goal.current_amount || '0'), authState.user)} / {formatCurrency(parseFloat(goal.target_amount || '0'), authState.user)}
                              </span>
                            </div>

                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(goal.progress_percentage, 100)}%`,
                                  backgroundColor: progressColor
                                }}
                              />
                            </div>

                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500 dark:text-gray-400">
                                {formatCurrency(parseFloat(goal.target_amount || '0') - parseFloat(goal.current_amount || '0'), authState.user)} to go
                              </span>
                              <span className={`font-medium ${
                                goal.progress_percentage >= 70 ? 'text-green-600 dark:text-green-400' :
                                goal.progress_percentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-blue-600 dark:text-blue-400'
                              }`}>
                                {goal.progress_percentage >= 90 ? 'Almost there!' :
                                 goal.progress_percentage >= 70 ? 'Great progress!' :
                                 goal.progress_percentage >= 30 ? 'Keep going!' : 'Just started'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Empty state when no goals exist
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🎯</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No goals yet</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Set your first financial goal</p>
                  </div>
                )}
                <button
                  onClick={() => navigate('/goals')}
                  className="text-sm text-blue-500 hover:text-blue-600 w-full text-left"
                >
                  {displayGoals.length > 0 ? 'View all goals' : 'Create your first goal'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="xl:col-span-8 space-y-6">
            {/* Transactions Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Last transactions</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Button
                        onClick={() => navigate('/transactions/new')}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add new
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Date Header */}
                <div className="flex items-center space-x-2 mb-6">
                  <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last 30 days
                  </span>
                </div>

                {/* Table Headers */}
                <div className="grid grid-cols-5 gap-4 pb-3 mb-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-600">
                  <div>Date</div>
                  <div>Transaction</div>
                  <div>Category</div>
                  <div>Account</div>
                  <div className="text-right">Amount</div>
                </div>

                {/* Transaction Rows */}
                <div className="space-y-3">
                  {displayTransactions.length > 0 ? (
                    displayTransactions.map((transaction, index) => {
                    // Get category name from categories data
                    const categories = categoriesQuery.data?.results || [];
                    const category = categories.find((cat: any) =>
                      cat.id == transaction.category_id || cat.id === String(transaction.category_id)
                    );
                    const categoryName = category?.name || 'Uncategorized';

                    // Get account name from accounts data
                    const accounts = accountsQuery.data?.results || [];
                    const account = accounts.find((acc: any) =>
                      acc.id == transaction.account_id || acc.id === String(transaction.account_id)
                    );
                    const accountName = account?.name || 'Unknown Account';

                    // Helper function to get category display using backend icon
                    const getCategoryDisplay = (categoryId: number | undefined | null, categoryName: string | number | undefined | null) => {
                      const categories = categoriesQuery.data?.results || [];
                      const category = categories.find((cat: any) => cat.id === categoryId);
                      const categoryIcon = category?.icon || '💼';

                      // Generate colors based on category name for consistency
                      if (!categoryName) return { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-800 dark:text-gray-200', emoji: categoryIcon };
                      const lowerName = String(categoryName).toLowerCase();

                      if (lowerName.includes('food') || lowerName.includes('restaurant') || lowerName.includes('dining')) {
                        return { bg: 'bg-pink-100 dark:bg-pink-900', text: 'text-pink-800 dark:text-pink-200', emoji: categoryIcon };
                      } else if (lowerName.includes('coffee') || lowerName.includes('cafe')) {
                        return { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-200', emoji: categoryIcon };
                      } else if (lowerName.includes('transport') || lowerName.includes('travel') || lowerName.includes('gas')) {
                        return { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', emoji: categoryIcon };
                      } else if (lowerName.includes('shop') || lowerName.includes('retail') || lowerName.includes('store')) {
                        return { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-200', emoji: categoryIcon };
                      } else if (lowerName.includes('health') || lowerName.includes('medical') || lowerName.includes('pharmacy')) {
                        return { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', emoji: categoryIcon };
                      } else if (lowerName.includes('entertain') || lowerName.includes('movie') || lowerName.includes('game')) {
                        return { bg: 'bg-indigo-100 dark:bg-indigo-900', text: 'text-indigo-800 dark:text-indigo-200', emoji: categoryIcon };
                      } else if (lowerName.includes('utility') || lowerName.includes('bill') || lowerName.includes('electric')) {
                        return { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200', emoji: categoryIcon };
                      } else if (lowerName.includes('income') || lowerName.includes('salary') || lowerName.includes('wage')) {
                        return { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', emoji: categoryIcon };
                      } else {
                        return { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-800 dark:text-gray-200', emoji: categoryIcon };
                      }
                    };

                    const categoryDisplay = getCategoryDisplay(transaction.category_id, categoryName);
                    const amount = parseFloat(transaction.amount || '0');
                    const isIncome = amount > 0;

                    return (
                      <div key={transaction.id} className="grid grid-cols-5 gap-2 lg:gap-4 py-3 px-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-150 hover:shadow-sm -mx-2">
                        <div className="flex items-center text-gray-600 dark:text-gray-300 text-xs lg:text-sm">
                          {new Date(transaction.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          })}
                        </div>
                        <div className="flex items-center space-x-2 lg:space-x-3 min-w-0">
                          <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center text-xs lg:text-sm flex-shrink-0 ${categoryDisplay.bg}`}>
                            {categoryDisplay.emoji}
                          </div>
                          <span
                            className="font-medium text-gray-900 dark:text-white truncate min-w-0"
                            title={transaction.description || ''}
                          >
                            {truncateText(transaction.description, 12)}
                          </span>
                        </div>
                        <div className="flex justify-start">
                          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${categoryDisplay.bg} ${categoryDisplay.text}`}>
                            {truncateText(categoryName, 8)}
                          </span>
                        </div>
                        <div className="text-gray-600 dark:text-gray-300 text-xs truncate" title={accountName}>
                          {truncateText(accountName, 8)}
                        </div>
                        <div className="text-right flex items-center justify-between min-w-0">
                          <span className={`font-semibold text-xs lg:text-sm truncate ${
                            isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {isIncome ? '+' : '-'}{formatCurrency(Math.abs(amount), authState.user)}
                          </span>
                          <button
                            onClick={() => navigate(`/transactions?account_id=${transaction.account_id}&category_id=${transaction.category_id}`)}
                            className="text-gray-300 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 flex-shrink-0 ml-1"
                            title="View similar transactions"
                          >
                            <MoreHorizontal className="w-3 h-3 lg:w-4 lg:h-4 transform rotate-90" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                  ) : (
                    // Empty state when no transactions exist
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">💳</div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No transactions yet</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Start by adding your first transaction or connecting an account
                      </p>
                      <button
                        onClick={() => navigate('/transactions/new')}
                        className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                      >
                        Add your first transaction
                      </button>
                    </div>
                  )}
                </div>

                {displayTransactions.length > 0 && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => navigate('/transactions')}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      View all transactions
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Expenditure Review */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Expenditure review</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedTimeRange === 'all' ? 'All time' : `Last ${selectedTimeRange} days`}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(analyticsData.netFlow, authState.user)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Net Flow</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(analyticsData.totalIncome, authState.user)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Income</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(analyticsData.totalExpenses, authState.user)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Expenses</div>
                  </div>
                </div>


                {/* Chart Placeholder */}
                <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-gray-400 dark:text-gray-500">Chart will be displayed here</div>
                </div>

                <div className="mt-4 flex justify-center space-x-6 text-xs">
                  <span className="text-gray-600 dark:text-gray-300">Mon</span>
                  <span className="text-gray-600 dark:text-gray-300">Tue</span>
                  <span className="text-gray-600 dark:text-gray-300">Wed</span>
                  <span className="text-gray-600 dark:text-gray-300">Thu</span>
                  <span className="text-gray-600 dark:text-gray-300">Fri</span>
                  <span className="text-gray-600 dark:text-gray-300">Sat</span>
                  <span className="text-gray-600 dark:text-gray-300">Sun</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};