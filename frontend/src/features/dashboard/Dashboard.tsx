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
      .slice(0, 10);
  }, [transactionsQuery.data]);

  const goals = (goalsQuery.data || []).slice(0, 3);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const summary = summaryQuery.data;

  if (!summary) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">Dashboard</h1>
          <p className="text-secondary-600 dark:text-secondary-400">No data available</p>
        </div>
      </div>
    );
  }

  const totalBalance = parseFloat(summary.account_balances?.reduce((sum, acc) => sum + parseFloat(acc.balance), 0)?.toString() || '0') || 0;
  const primaryAccount = (accountsQuery.data?.results || [])[0];

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Dashboard</h1>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Account Info */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Overall Balance */}
          <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Overall balance</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex items-center justify-center">
                  <Plus className="w-1 h-1 text-white" />
                </div>
                <button
                  onClick={() => navigate('/accounts/new')}
                  className="text-xs text-blue-500 hover:text-blue-600"
                >
                  Add new
                </button>
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(totalBalance, authState.user)}
            </div>

            {/* Featured Account Card */}
            {primaryAccount && (
              <div className="mt-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-6 text-white">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-sm opacity-90 mb-1">Credit Card</div>
                    <div className="text-lg font-semibold">
                      {primaryAccount.name || 'Stefania Nord'}
                    </div>
                    <div className="text-sm opacity-75 mt-1">
                      •••• •••• •••• {primaryAccount.account_number_last4 || '7899'}
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded text-sm font-bold">
                    VISA
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-sm opacity-75">
                    {new Date().toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}
                  </div>
                  <div className="text-xl font-bold">
                    {formatCurrency(parseFloat(primaryAccount.balance?.toString() || '0'), authState.user)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Other Accounts */}
          <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Other accounts</h3>
            <div className="space-y-4">
              {(accountsQuery.data?.results || []).slice(1, 4).map((account) => (
                <div key={account.id} className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      •••• •••• •••• {account.account_number_last4 || '2305'}
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {account.account_type}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(parseFloat(account.balance.toString()), authState.user)}
                    </div>
                  </div>
                </div>
              ))}
              <button className="text-sm text-blue-500 hover:text-blue-600">
                Show more
              </button>
            </div>
          </div>

          {/* Goals */}
          <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">Goals</h3>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex items-center justify-center">
                  <Plus className="w-1 h-1 text-white" />
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
              {goals.map((goal, index) => {
                const progressPercentage = Math.min(Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100), 100);
                const emojis = ['🚗', '😍', '🏠'];

                return (
                  <div key={goal.id} className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="2"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={progressPercentage >= 70 ? '#10b981' : progressPercentage >= 50 ? '#f59e0b' : '#3b82f6'}
                            strokeWidth="2"
                            strokeDasharray={`${progressPercentage}, 100`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                            {progressPercentage}%
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {goal.name}
                          </span>
                          <span className="text-base">{emojis[index] || '🎯'}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Saved up</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(parseFloat(goal.current_amount), authState.user)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Goal</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(parseFloat(goal.target_amount), authState.user)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button className="text-sm text-blue-500 hover:text-blue-600">
                Show more
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Transactions and Analytics */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* Transactions Table */}
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Last transactions</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex items-center justify-center">
                      <Plus className="w-1 h-1 text-white" />
                    </div>
                    <button
                      onClick={() => navigate('/transactions/new')}
                      className="text-xs text-blue-500 hover:text-blue-600"
                    >
                      Add new
                    </button>
                  </div>
                  <button
                    onClick={() => navigate('/transactions')}
                    className="text-blue-500 hover:text-blue-600 text-sm"
                  >
                    Show more
                  </button>
                </div>
              </div>

              {/* Date Filter */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    16-23/05/22
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Select
                    options={[
                      { value: 'all', label: 'All accounts' },
                      ...(accountsQuery.data?.results || []).map(acc => ({
                        value: acc.id.toString(),
                        label: acc.name
                      }))
                    ]}
                    value="all"
                    onChange={() => {}}
                    className="w-32 text-xs"
                  />
                  <Select
                    options={[
                      { value: 'all', label: 'All categories' },
                      ...(categoriesQuery.data?.results || []).map(cat => ({
                        value: cat.id,
                        label: cat.name
                      }))
                    ]}
                    value="all"
                    onChange={() => {}}
                    className="w-32 text-xs"
                  />
                </div>
              </div>

              {/* Table Headers */}
              <div className="grid grid-cols-5 gap-3 pb-2 border-b border-gray-200 dark:border-gray-700 mb-3">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Transaction</div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Category</div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Account</div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">Amount</div>
              </div>

              {/* Transaction Items */}
              <div className="space-y-2">
                {recentTransactions.slice(0, 8).map((transaction) => {
                  const category = (categoriesQuery.data?.results || []).find(cat => cat.id === transaction.category_id);
                  const account = (accountsQuery.data?.results || []).find(acc => acc.id === transaction.account_id);

                  // Format date like "23/05/22"
                  const formattedDate = new Date(transaction.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit'
                  });

                  return (
                    <div key={transaction.id} className="grid grid-cols-5 gap-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-secondary-700/50 rounded">
                      <div className="flex items-center">
                        <span className="text-gray-600 dark:text-gray-400">
                          {formattedDate}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs ${
                          category?.name === 'Cafes' ? 'bg-orange-100 dark:bg-orange-900/30' :
                          category?.name === 'Coffee' ? 'bg-orange-100 dark:bg-orange-900/30' :
                          category?.name === 'Food' ? 'bg-pink-100 dark:bg-pink-900/30' :
                          category?.name === 'Flowers' ? 'bg-green-100 dark:bg-green-900/30' :
                          'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          {category?.name === 'Cafes' || category?.name === 'Coffee' ? '☕' :
                           category?.name === 'Food' ? '🍽️' :
                           category?.name === 'Flowers' ? '🌸' : '💳'}
                        </div>
                        <span className="text-gray-900 dark:text-gray-100 font-medium text-xs">
                          {transaction.description}
                        </span>
                      </div>

                      <div>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          category?.name === 'Cafes' || category?.name === 'Coffee' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                          category?.name === 'Food' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300' :
                          category?.name === 'Flowers' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {category?.name || 'Uncategorized'}
                        </span>
                      </div>

                      <div className="text-gray-600 dark:text-gray-400 text-xs">
                        {account?.account_type || 'Salary'}
                      </div>

                      <div className="text-right flex items-center justify-between">
                        <span className={`font-semibold text-xs ${
                          parseFloat(transaction.amount) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {parseFloat(transaction.amount) < 0 ? '-' : ''}
                          {formatCurrency(Math.abs(parseFloat(transaction.amount)), authState.user)}
                        </span>
                        <button className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 ml-2">
                          <MoreHorizontal className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center mt-6">
                <button
                  onClick={() => navigate('/transactions')}
                  className="text-blue-500 hover:text-blue-600 text-sm"
                >
                  Show more
                </button>
              </div>
            </div>
          </div>

          {/* Expenditure Review */}
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Expenditure review</h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Date: {new Date().toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit'
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {formatCurrency(totalBalance, authState.user)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Balance</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(parseFloat(summary.total_income || '0'), authState.user)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Income</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    {formatCurrency(Math.abs(parseFloat(summary.total_expenses || '0')), authState.user)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Expenses</div>
                </div>
              </div>

              <div className="text-right mb-4">
                <Select
                  options={[{ value: 'all', label: 'All accounts' }]}
                  value="all"
                  onChange={() => {}}
                  className="w-40"
                />
              </div>

              {/* Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value), authState.user), '']}
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex justify-center space-x-6 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Mon</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Tue</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Wed</span>
                </div>
                <span className="text-gray-600 dark:text-gray-400">Thu</span>
                <span className="text-gray-600 dark:text-gray-400">Fri</span>
                <span className="text-gray-600 dark:text-gray-400">Sat</span>
                <span className="text-gray-600 dark:text-gray-400">Sun</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};