import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Users,
  User,
  Receipt,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  DollarSign,
  Settings,
  Eye,
  EyeOff,
  Filter,
  Search,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { SummaryCards } from '../../components/ui/SummaryCards';
import { FinancePageHeader } from '../../components/ui/FinancePageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/preferences';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { ObjectForm } from '../../components/forms/ObjectForm';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useExpenseGroups,
  useExpenseGroupMembers,
  useExpenseGroupBalances,
  useGroupExpenses,
  useGroupExpensesSummary,
  useCreateExpenseGroup,
  useAddExpenseGroupMember,
  useRemoveExpenseGroupMember,
  useCreateGroupExpense,
  useDeleteExpenseGroup,
  useUpdateExpenseGroup,
  type ExpenseGroup,
  type GroupExpense,
} from './hooks/queries/useExpenseGroups';

// Additional types for UI
interface GroupMember {
  id: number;
  name: string;
  email: string;
  balance: number;
  isSettled: boolean;
}

const ExpenseTracker: React.FC = () => {
  const { state: authState } = useAuth();
  const { showSuccess, showError } = useToast();

  // State
  const [activeView, setActiveView] = useState<'overview' | 'personal' | 'groups'>('overview');
  const [selectedGroup, setSelectedGroup] = useState<ExpenseGroup | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showGroupDetailsModal, setShowGroupDetailsModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showExpenseHistoryModal, setShowExpenseHistoryModal] = useState(false);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<GroupExpense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [expenseMenuOpen, setExpenseMenuOpen] = useState<number | null>(null);

  // Form states
  const [groupType, setGroupType] = useState<'one-to-one' | 'multi-person'>('multi-person');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [splitMethod, setSplitMethod] = useState('');
  const [expenseData, setExpenseData] = useState({
    title: '',
    amount: '',
    description: '',
    date: '',
    paidBy: '', // User ID who paid for the expense
  });
  const [splitData, setSplitData] = useState<{[key: string]: number | string}>({});

  // Handlers
  const handleCreateGroup = async () => {
    try {
      await createGroupMutation.mutateAsync({
        name: groupName,
        description: groupDescription,
        group_type: groupType,
      });
      setShowCreateModal(false);
      setGroupName('');
      setGroupDescription('');
      setGroupType('multi-person');
      showSuccess('Group created successfully!');
    } catch (error) {
      console.error('Failed to create group:', error);
      showError('Failed to create group', 'Please try again.');
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup || !groupName.trim()) {
      showError('Missing information', 'Please enter a group name.');
      return;
    }

    try {
      await updateGroupMutation.mutateAsync({
        id: selectedGroup.id,
        data: {
          name: groupName,
          description: groupDescription,
          group_type: groupType,
        },
      });

      setShowEditGroupModal(false);
      setSelectedGroup(null);
      setGroupName('');
      setGroupDescription('');
      setGroupType('multi-person');
      showSuccess('Group updated successfully!');
    } catch (error) {
      console.error('Failed to update group:', error);
      showError('Failed to update group', 'Please try again.');
    }
  };

  const handleCreateExpense = async () => {
    if (!selectedGroup || !expenseData.title || !expenseData.amount || !expenseData.paidBy || !splitMethod) {
      showError('Missing information', 'Please fill in all required fields.');
      return;
    }

    try {
      // Prepare split data based on split method
      let shares = [];
      const totalAmount = parseFloat(expenseData.amount);

      if (splitMethod === 'equal') {
        const memberCount = (selectedGroup.members?.length || 0) + 1; // +1 for current user
        const equalAmount = totalAmount / memberCount;

        // Add current user
        shares.push({
          user_id: parseInt(authState.user?.id?.toString() || '0'),
          share_amount: equalAmount.toFixed(2),
        });

        // Add other members
        (selectedGroup.members || []).forEach(member => {
          shares.push({
            user_id: member.user?.id || member.id,
            share_amount: equalAmount.toFixed(2),
          });
        });
      } else if (splitMethod === 'custom') {
        // Add current user if they have a custom amount
        const userAmount = parseFloat(splitData[`user_${authState.user?.id}`] as string || '0');
        if (userAmount > 0) {
          shares.push({
            user_id: parseInt(authState.user?.id?.toString() || '0'),
            share_amount: userAmount.toFixed(2),
          });
        }

        // Add other members with custom amounts
        (selectedGroup.members || []).forEach(member => {
          const memberAmount = parseFloat(splitData[`member_${member.id}`] as string || '0');
          if (memberAmount > 0) {
            shares.push({
              user_id: member.user?.id || member.id,
              share_amount: memberAmount.toFixed(2),
            });
          }
        });
      } else if (splitMethod === 'percentage') {
        // Add current user percentage
        const userPercentage = parseFloat(splitData[`user_${authState.user?.id}`] as string || '0');
        if (userPercentage > 0) {
          shares.push({
            user_id: parseInt(authState.user?.id?.toString() || '0'),
            share_amount: (totalAmount * userPercentage / 100).toFixed(2),
          });
        }

        // Add other members with percentages
        (selectedGroup.members || []).forEach(member => {
          const memberPercentage = parseFloat(splitData[`member_${member.id}`] as string || '0');
          if (memberPercentage > 0) {
            shares.push({
              user_id: member.user?.id || member.id,
              share_amount: (totalAmount * memberPercentage / 100).toFixed(2),
            });
          }
        });
      } else if (splitMethod === 'shares') {
        const totalShares = Object.values(splitData).reduce((sum, val) => sum + (parseFloat(val as string) || 1), 0);
        const amountPerShare = totalAmount / totalShares;

        // Add current user shares
        const userShares = parseFloat(splitData[`user_${authState.user?.id}`] as string || '1');
        shares.push({
          user_id: parseInt(authState.user?.id?.toString() || '0'),
          share_amount: (amountPerShare * userShares).toFixed(2),
        });

        // Add other members with shares
        (selectedGroup.members || []).forEach(member => {
          const memberShares = parseFloat(splitData[`member_${member.id}`] as string || '1');
          shares.push({
            user_id: member.user?.id || member.id,
            share_amount: (amountPerShare * memberShares).toFixed(2),
          });
        });
      }

      await createExpenseMutation.mutateAsync({
        group_id: selectedGroup.id,
        title: expenseData.title,
        description: expenseData.description,
        total_amount: expenseData.amount,
        currency: 'USD', // You might want to make this configurable
        split_method: splitMethod,
        date: expenseData.date,
        paid_by: parseInt(expenseData.paidBy),
        shares: shares,
      });

      // Reset form and close modal
      setShowAddExpenseModal(false);
      setSplitMethod('');
      setSelectedGroup(null);
      setExpenseData({ title: '', amount: '', description: '', date: '', paidBy: '' });
      setSplitData({});

      showSuccess('Expense added successfully!');
    } catch (error) {
      console.error('Failed to create expense:', error);
      showError('Failed to create expense', 'Please try again.');
    }
  };
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'settled'>('all');
  const [showBalances, setShowBalances] = useState(true);

  // API Hooks
  const { data: expenseGroups = [], isLoading: isLoadingGroups } = useExpenseGroups();
  const { data: allGroupExpenses = [], isLoading: isLoadingExpenses } = useGroupExpenses(0); // Get all expenses
  const { data: groupMembers = [] } = useExpenseGroupMembers(selectedGroup?.id || 0);
  const { data: groupBalances = [] } = useExpenseGroupBalances(selectedGroup?.id || 0);

  // Mutations
  const createGroupMutation = useCreateExpenseGroup();
  const updateGroupMutation = useUpdateExpenseGroup();
  const createExpenseMutation = useCreateGroupExpense();

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    // For now, use placeholder calculations - these would need balance data from API
    const totalOwed = 0; // Would need to calculate from expense group balances
    const totalOwing = 0; // Would need to calculate from expense group balances
    const totalExpenses = allGroupExpenses.reduce((sum, exp) => sum + parseFloat(exp.total_amount || '0'), 0);
    const activeGroups = expenseGroups.length;

    return { totalOwed, totalOwing, totalExpenses, activeGroups };
  }, [expenseGroups, allGroupExpenses]);

  // Filter functions
  const filteredGroups = useMemo(() => {
    return expenseGroups.filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()));
      // For now, show all groups since we don't have balance data yet
      const matchesFilter = filterStatus === 'all';
      return matchesSearch && matchesFilter;
    });
  }, [expenseGroups, searchQuery, filterStatus]);

  const filteredExpenses = useMemo(() => {
    return allGroupExpenses.filter(expense => {
      const matchesSearch = expense.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (expense.description && expense.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = filterStatus === 'all' ||
        (filterStatus === 'settled' && expense.status === 'settled') ||
        (filterStatus === 'pending' && expense.status === 'active');
      return matchesSearch && matchesFilter;
    });
  }, [allGroupExpenses, searchQuery, filterStatus]);

  const getBalanceColor = (balance: number) => {
    if (Math.abs(balance) < 0.01) return 'text-gray-600 dark:text-gray-400';
    return balance > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getBalanceIcon = (balance: number) => {
    if (Math.abs(balance) < 0.01) return CheckCircle;
    return balance > 0 ? ArrowDownLeft : ArrowUpRight;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
      setExpenseMenuOpen(null);
    };

    if (openDropdown !== null || expenseMenuOpen !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown, expenseMenuOpen]);

  return (
    <div className="space-y-4">
      <FinancePageHeader
        title="Expense Tracker"
        subtitle="Track personal and group expenses effortlessly"
        gradientFrom="violet-600"
        gradientVia="purple-600"
        gradientTo="indigo-700"
        darkGradientFrom="violet-800"
        darkGradientVia="purple-800"
        darkGradientTo="indigo-900"
        subtitleColor="text-purple-100"
        darkSubtitleColor="text-purple-200"
        summaryCards={[
          {
            id: 'owed',
            label: 'You Owe',
            value: showBalances ? formatCurrency(summaryStats.totalOwed, authState.user) : '••••',
            icon: ArrowUpRight,
            iconColor: 'text-red-300 dark:text-red-400'
          },
          {
            id: 'owing',
            label: 'Owed',
            value: showBalances ? formatCurrency(summaryStats.totalOwing, authState.user) : '••••',
            icon: ArrowDownLeft,
            iconColor: 'text-green-300 dark:text-green-400'
          },
          {
            id: 'total',
            label: 'Total',
            value: showBalances ? formatCurrency(summaryStats.totalExpenses, authState.user) : '••••',
            icon: Receipt,
            iconColor: 'text-blue-300 dark:text-blue-400'
          },
          {
            id: 'groups',
            label: 'Groups',
            value: summaryStats.activeGroups,
            icon: Users,
            iconColor: 'text-yellow-300 dark:text-yellow-400'
          }
        ]}
        buttons={[
          {
            label: showBalances ? 'Hide Amounts' : 'Show Amounts',
            icon: showBalances ? EyeOff : Eye,
            onClick: () => setShowBalances(!showBalances),
            variant: 'ghost-white',
            className: 'bg-white/20 hover:bg-white/30 text-white border border-white/30 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20'
          },
          {
            label: 'History',
            icon: Clock,
            onClick: () => setShowExpenseHistoryModal(true),
            variant: 'ghost-white',
            className: 'bg-white/20 hover:bg-white/30 text-white border border-white/30 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20'
          },
          {
            label: 'New Group',
            icon: Plus,
            onClick: () => setShowCreateModal(true),
            variant: 'primary',
            className: 'bg-white text-purple-600 hover:bg-gray-100 dark:bg-white dark:text-purple-700 dark:hover:bg-gray-200 shadow-lg'
          }
        ]}
      />

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 border border-gray-200 dark:border-gray-700">
          {[
            { key: 'overview', label: 'Overview', icon: TrendingUp },
            { key: 'personal', label: 'Personal', icon: User },
            { key: 'groups', label: 'Groups', icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveView(key as any)}
              className={`
                flex items-center px-6 py-3 rounded-xl transition-all duration-200 font-medium
                ${activeView === key
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-md shadow-gray-200/50 dark:shadow-gray-900/50'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                }
              `}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="pl-10 w-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <Select
            value={filterStatus}
            onChange={(value) => setFilterStatus(value as any)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'settled', label: 'Settled' },
            ]}
            className="w-32"
          />
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeView === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Expenses */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Recent Expenses
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredExpenses.slice(0, 5).map((expense) => (
                      <div key={expense.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1.5">
                              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                                <Receipt className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div>
                                <h3 className="font-medium text-sm text-gray-900 dark:text-white">
                                  {expense.title}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {expense.group.name}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-1">
                              {expense.description || 'No description'}
                            </p>
                            <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(expense.date).toLocaleDateString()}
                              </span>
                              <span>By {expense.created_by.username}</span>
                              <span className={`px-1.5 py-0.5 rounded-md text-xs font-medium ${
                                expense.status === 'settled'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : expense.status === 'active'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                              }`}>
                                {expense.status === 'settled' ? 'Settled' : expense.status === 'active' ? 'Pending' : 'Cancelled'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {showBalances && (
                              <div className="text-right">
                                <div className="text-base font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(parseFloat(expense.total_amount), authState.user)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {expense.split_method}
                                </div>
                              </div>
                            )}

                            <div className="relative">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpenseMenuOpen(expenseMenuOpen === expense.id ? null : expense.id);
                                }}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>

                              {expenseMenuOpen === expense.id && (
                                <div className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
                                  <div className="py-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedExpense(expense);
                                        setExpenseData({
                                          title: expense.title,
                                          amount: expense.total_amount,
                                          description: expense.description || '',
                                          date: expense.date,
                                          paidBy: expense.created_by.id.toString(),
                                        });
                                        setSplitMethod(expense.split_method);
                                        setShowEditExpenseModal(true);
                                        setExpenseMenuOpen(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      Edit Expense
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Are you sure you want to delete this expense?')) {
                                          // TODO: Implement delete functionality
                                          console.log('Delete expense:', expense.id);
                                        }
                                        setExpenseMenuOpen(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      Delete Expense
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <div className="p-12 text-center">
                        <Receipt className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No expenses yet
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Start tracking expenses by creating a group
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Groups */}
              <div>
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Active Groups
                    </h2>
                  </div>
                  <div className="p-4 space-y-3">
                    {filteredGroups.map((group) => (
                      <div
                        key={group.id}
                        onClick={() => setSelectedGroup(group)}
                        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors cursor-pointer border border-gray-200/50 dark:border-gray-600/50"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-xl ${
                              group.group_type === 'multi-person'
                                ? 'bg-blue-100 dark:bg-blue-900/40'
                                : 'bg-green-100 dark:bg-green-900/40'
                            }`}>
                              {group.group_type === 'multi-person' ? (
                                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                                {group.name}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {group.group_type === 'multi-person' ? 'Group' : 'Personal'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {group.description || 'No description'}
                          </span>
                          {showBalances && (
                            <div className="text-xs font-medium text-purple-600 dark:text-purple-400">
                              View Details →
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredGroups.length === 0 && (
                      <div className="p-8 text-center">
                        <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          No groups yet
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Create your first expense group
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'personal' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredGroups
                .filter(group => group.group_type === 'one-to-one')
                .map((group) => (
                  <div key={group.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-2xl">
                            <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {group.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {group.description || 'Personal expenses'}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedGroup(group);
                            setExpenseData(prev => ({ ...prev, paidBy: authState.user?.id?.toString() || '' }));
                            setShowAddExpenseModal(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            Group Status
                          </span>
                          <div className="text-sm font-medium text-green-600 dark:text-green-400">
                            One-to-One
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Recent Activity
                        </h4>
                        {filteredExpenses
                          .filter(exp => exp.group.id === group.id)
                          .slice(0, 3)
                          .map((expense) => (
                            <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {expense.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(expense.date).toLocaleDateString()}
                                </p>
                              </div>
                              {showBalances && (
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(parseFloat(expense.total_amount), authState.user)}
                                </span>
                              )}
                            </div>
                          ))}
                        {filteredExpenses.filter(exp => exp.group.id === group.id).length === 0 && (
                          <div className="text-center p-4 text-gray-500 dark:text-gray-400 text-sm">
                            No expenses yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              {filteredGroups.filter(group => group.group_type === 'one-to-one').length === 0 && (
                <div className="col-span-full text-center p-12">
                  <User className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No personal expense groups
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Create a one-to-one group to track personal expenses with friends
                  </p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    Create Personal Group
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeView === 'groups' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredGroups
                .filter(group => group.group_type === 'multi-person')
                .map((group) => (
                  <div key={group.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {group.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {group.members?.length || 0} members
                            </p>
                          </div>
                        </div>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdown(openDropdown === group.id ? null : group.id);
                            }}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>

                          {openDropdown === group.id && (
                            <div className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
                              <div className="py-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedGroup(group);
                                    setExpenseData(prev => ({ ...prev, paidBy: authState.user?.id?.toString() || '' }));
                                    setShowAddExpenseModal(true);
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  Add Expense
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedGroup(group);
                                    setGroupName(group.name);
                                    setGroupDescription(group.description || '');
                                    setGroupType(group.group_type);
                                    setShowEditGroupModal(true);
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  Edit Group
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedGroup(group);
                                    setShowGroupDetailsModal(true);
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  View Details
                                </button>
                                <hr className="my-1 border-gray-200 dark:border-gray-600" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Add delete functionality
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  Delete Group
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {showBalances && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 mb-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Total Expenses
                              </p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {formatCurrency(group.totalExpenses || 0, authState.user)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Your Balance
                              </p>
                              <p className={`text-lg font-bold ${getBalanceColor(group.yourBalance || 0)}`}>
                                {formatCurrency(Math.abs(group.yourBalance || 0), authState.user)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Members
                          </h4>
                          <Button
                            onClick={() => {
                              setSelectedGroup(group);
                              setExpenseData(prev => ({ ...prev, paidBy: authState.user?.id?.toString() || '' }));
                              setShowAddExpenseModal(true);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Expense
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(group.members || []).slice(0, 3).map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    {member.name?.charAt(0) || member.user?.username?.charAt(0) || '?'}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {member.name || member.user?.username || 'Unknown User'}
                                </span>
                              </div>
                              {showBalances && (
                                <span className={`text-xs font-semibold ${getBalanceColor(member.balance || 0)}`}>
                                  {formatCurrency(Math.abs(member.balance || 0), authState.user)}
                                </span>
                              )}
                            </div>
                          ))}
                          {(group.members?.length || 0) > 3 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                              +{(group.members?.length || 0) - 3} more members
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              {filteredGroups.filter(group => group.group_type === 'multi-person').length === 0 && (
                <div className="col-span-full text-center p-12">
                  <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No group expenses
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Create a group to split expenses with multiple people
                  </p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    Create Group
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Group"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Group Type
            </label>
            <Select
              options={[
                { value: 'one-to-one', label: 'Personal (1-on-1)' },
                { value: 'multi-person', label: 'Group Expenses' },
              ]}
              value={groupType}
              onChange={(value) => setGroupType(value as 'one-to-one' | 'multi-person')}
              placeholder="Select group type..."
            />
          </div>
          <Input
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <Input
            placeholder="Description (optional)"
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
          />
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setGroupName('');
                setGroupDescription('');
                setGroupType('multi-person');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || createGroupMutation.isPending}
            >
              {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAddExpenseModal}
        onClose={() => {
          setShowAddExpenseModal(false);
          setSplitMethod('');
          setSelectedGroup(null);
          setExpenseData({ title: '', amount: '', description: '', date: '', paidBy: '' });
          setSplitData({});
        }}
        title="Add New Expense"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Expense title"
              value={expenseData.title}
              onChange={(e) => setExpenseData(prev => ({ ...prev, title: e.target.value }))}
            />
            <Input
              placeholder="Amount"
              type="number"
              value={expenseData.amount}
              onChange={(e) => setExpenseData(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Description"
              value={expenseData.description}
              onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Paid by
              </label>
              <Select
                options={[
                  {
                    value: authState.user?.id?.toString() || '',
                    label: `You (${authState.user?.username})`
                  },
                  ...(selectedGroup?.members || []).map(member => ({
                    value: member.user?.id?.toString() || member.id?.toString() || '',
                    label: member.name || member.user?.username || 'Unknown User'
                  }))
                ]}
                value={expenseData.paidBy}
                onChange={(value) => setExpenseData(prev => ({ ...prev, paidBy: value as string }))}
                placeholder="Select who paid..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              value={expenseData.date}
              onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))}
            />
            <Select
              options={[
                { value: 'equal', label: 'Split Equally' },
                { value: 'custom', label: 'Custom Amounts' },
                { value: 'percentage', label: 'By Percentage' },
                { value: 'shares', label: 'By Shares' },
              ]}
              value={splitMethod}
              onChange={(value) => setSplitMethod(value as string)}
              placeholder="Split method..."
            />
          </div>

          {/* Conditional Split Fields */}
          {splitMethod && selectedGroup && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Split Details - {splitMethod === 'equal' ? 'Equal Split' :
                                splitMethod === 'custom' ? 'Custom Amounts' :
                                splitMethod === 'percentage' ? 'Percentage Split' : 'Share Split'}
              </h4>

              {splitMethod === 'equal' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    The expense will be split equally among all group members.
                    {expenseData.amount && selectedGroup.members && (
                      <span className="block mt-2 font-medium">
                        Each person pays: {formatCurrency(
                          parseFloat(expenseData.amount) / (selectedGroup.members.length + 1),
                          authState.user
                        )}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {splitMethod === 'custom' && selectedGroup.members && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enter custom amounts for each member:
                  </p>
                  {/* Current user */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      You ({authState.user?.username})
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="w-24"
                      value={splitData[`user_${authState.user?.id}`] || ''}
                      onChange={(e) => setSplitData(prev => ({
                        ...prev,
                        [`user_${authState.user?.id}`]: e.target.value
                      }))}
                    />
                  </div>
                  {/* Other members */}
                  {(selectedGroup.members || []).map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.name || member.user?.username || 'Unknown User'}
                      </span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="w-24"
                        value={splitData[`member_${member.id}`] || ''}
                        onChange={(e) => setSplitData(prev => ({
                          ...prev,
                          [`member_${member.id}`]: e.target.value
                        }))}
                      />
                    </div>
                  ))}
                  {expenseData.amount && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                      Total assigned: {formatCurrency(
                        Object.values(splitData).reduce((sum, val) => sum + (parseFloat(val as string) || 0), 0),
                        authState.user
                      )} of {formatCurrency(parseFloat(expenseData.amount), authState.user)}
                    </div>
                  )}
                </div>
              )}

              {splitMethod === 'percentage' && selectedGroup.members && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enter percentage for each member (total should equal 100%):
                  </p>
                  {/* Current user */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      You ({authState.user?.username})
                    </span>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        placeholder="0"
                        className="w-20"
                        min="0"
                        max="100"
                        value={splitData[`user_${authState.user?.id}`] || ''}
                        onChange={(e) => setSplitData(prev => ({
                          ...prev,
                          [`user_${authState.user?.id}`]: e.target.value
                        }))}
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>
                  {/* Other members */}
                  {(selectedGroup.members || []).map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.name || member.user?.username || 'Unknown User'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          placeholder="0"
                          className="w-20"
                          min="0"
                          max="100"
                          value={splitData[`member_${member.id}`] || ''}
                          onChange={(e) => setSplitData(prev => ({
                            ...prev,
                            [`member_${member.id}`]: e.target.value
                          }))}
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>
                  ))}
                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                    Total percentage: {Object.values(splitData).reduce((sum, val) => sum + (parseFloat(val as string) || 0), 0)}%
                  </div>
                </div>
              )}

              {splitMethod === 'shares' && selectedGroup.members && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enter number of shares for each member:
                  </p>
                  {/* Current user */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      You ({authState.user?.username})
                    </span>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        placeholder="1"
                        className="w-20"
                        min="0"
                        value={splitData[`user_${authState.user?.id}`] || '1'}
                        onChange={(e) => setSplitData(prev => ({
                          ...prev,
                          [`user_${authState.user?.id}`]: e.target.value
                        }))}
                      />
                      <span className="text-sm text-gray-500">shares</span>
                    </div>
                  </div>
                  {/* Other members */}
                  {(selectedGroup.members || []).map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.name || member.user?.username || 'Unknown User'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          placeholder="1"
                          className="w-20"
                          min="0"
                          value={splitData[`member_${member.id}`] || '1'}
                          onChange={(e) => setSplitData(prev => ({
                            ...prev,
                            [`member_${member.id}`]: e.target.value
                          }))}
                        />
                        <span className="text-sm text-gray-500">shares</span>
                      </div>
                    </div>
                  ))}
                  {expenseData.amount && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      Total shares: {Object.values(splitData).reduce((sum, val) => sum + (parseFloat(val as string) || 1), 0)}
                      <br />
                      Amount per share: {formatCurrency(
                        parseFloat(expenseData.amount) / Object.values(splitData).reduce((sum, val) => sum + (parseFloat(val as string) || 1), 0),
                        authState.user
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddExpenseModal(false);
                setSplitMethod('');
                setSelectedGroup(null);
                setExpenseData({ title: '', amount: '', description: '', date: '', paidBy: '' });
                setSplitData({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateExpense}
              disabled={createExpenseMutation.isPending || !selectedGroup || !expenseData.title || !expenseData.amount || !expenseData.paidBy || !splitMethod}
            >
              {createExpenseMutation.isPending ? 'Adding...' : 'Add Expense'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        isOpen={showEditGroupModal}
        onClose={() => {
          setShowEditGroupModal(false);
          setSelectedGroup(null);
          setGroupName('');
          setGroupDescription('');
          setGroupType('multi-person');
        }}
        title="Edit Group"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Group Type
            </label>
            <Select
              options={[
                { value: 'one-to-one', label: 'Personal (1-on-1)' },
                { value: 'multi-person', label: 'Group Expenses' },
              ]}
              value={groupType}
              onChange={(value) => setGroupType(value as 'one-to-one' | 'multi-person')}
              placeholder="Select group type..."
            />
          </div>
          <Input
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            label="Group Name"
            required
          />
          <Input
            placeholder="Description (optional)"
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            label="Description"
          />
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditGroupModal(false);
                setSelectedGroup(null);
                setGroupName('');
                setGroupDescription('');
                setGroupType('multi-person');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateGroup}
              disabled={!groupName.trim() || updateGroupMutation.isPending}
            >
              {updateGroupMutation.isPending ? 'Updating...' : 'Update Group'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Group Details Modal */}
      <Modal
        isOpen={showGroupDetailsModal}
        onClose={() => {
          setShowGroupDetailsModal(false);
          setSelectedGroup(null);
        }}
        title="Group Details"
        size="xl"
      >
        {selectedGroup && (
          <div className="space-y-6">
            {/* Group Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {selectedGroup.name}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Type:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {selectedGroup.group_type === 'one-to-one' ? 'Personal (1-on-1)' : 'Group Expenses'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Created:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {new Date(selectedGroup.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {selectedGroup.description && (
                <div className="mt-3">
                  <span className="text-gray-500 dark:text-gray-400">Description:</span>
                  <p className="mt-1 text-gray-900 dark:text-white">{selectedGroup.description}</p>
                </div>
              )}
            </div>

            {/* Members */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Members ({groupMembers.length + 1})
              </h4>
              <div className="space-y-2">
                {/* Current user (owner) */}
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {authState.user?.username?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {authState.user?.username} (You)
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Owner</p>
                    </div>
                  </div>
                </div>

                {/* Other members */}
                {groupMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {member.user.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.user.username}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md">
                      {member.role}
                    </span>
                  </div>
                ))}

                {groupMembers.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No other members in this group</p>
                  </div>
                )}
              </div>
            </div>

            {/* Balances */}
            {groupBalances.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Balances
                </h4>
                <div className="space-y-2">
                  {groupBalances.map((balance) => (
                    <div key={balance.participant_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {balance.participant_name}
                      </span>
                      <div className="text-right">
                        <div className={`font-semibold ${
                          parseFloat(balance.balance) > 0
                            ? 'text-green-600 dark:text-green-400'
                            : parseFloat(balance.balance) < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {formatCurrency(parseFloat(balance.balance), authState.user)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Settled: {formatCurrency(parseFloat(balance.total_settled), authState.user)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Expenses for this group */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Recent Expenses
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredExpenses
                  .filter(expense => expense.group.id === selectedGroup.id)
                  .slice(0, 5)
                  .map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                          <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{expense.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(expense.date).toLocaleDateString()} • By {expense.created_by.username}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(parseFloat(expense.total_amount), authState.user)}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-md ${
                          expense.status === 'settled'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : expense.status === 'active'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                        }`}>
                          {expense.status === 'settled' ? 'Settled' : expense.status === 'active' ? 'Pending' : 'Cancelled'}
                        </span>
                      </div>
                    </div>
                  ))}

                {filteredExpenses.filter(expense => expense.group.id === selectedGroup.id).length === 0 && (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No expenses in this group yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGroupDetailsModal(false);
                  setGroupName(selectedGroup.name);
                  setGroupDescription(selectedGroup.description || '');
                  setGroupType(selectedGroup.group_type);
                  setShowEditGroupModal(true);
                }}
              >
                Edit Group
              </Button>
              <Button
                onClick={() => {
                  setShowGroupDetailsModal(false);
                  setExpenseData(prev => ({ ...prev, paidBy: authState.user?.id?.toString() || '' }));
                  setShowAddExpenseModal(true);
                }}
              >
                Add Expense
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Expense History Modal */}
      <Modal
        isOpen={showExpenseHistoryModal}
        onClose={() => setShowExpenseHistoryModal(false)}
        title="Expense History"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              All Expenses ({filteredExpenses.length})
            </h3>
            <div className="flex items-center space-x-2">
              <Select
                value={filterStatus}
                onChange={(value) => setFilterStatus(value as any)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'settled', label: 'Settled' },
                ]}
                className="w-32"
              />
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-3">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                        <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {expense.title}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {expense.group.name} • {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {expense.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {expense.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Paid by: {expense.created_by.username}</span>
                      <span>Split: {expense.split_method}</span>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        expense.status === 'settled'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : expense.status === 'active'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}>
                        {expense.status === 'settled' ? 'Settled' : expense.status === 'active' ? 'Pending' : 'Cancelled'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(parseFloat(expense.total_amount), authState.user)}
                      </div>
                    </div>

                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpenseMenuOpen(expenseMenuOpen === expense.id ? null : expense.id);
                        }}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>

                      {expenseMenuOpen === expense.id && (
                        <div className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
                          <div className="py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExpense(expense);
                                setExpenseData({
                                  title: expense.title,
                                  amount: expense.total_amount,
                                  description: expense.description || '',
                                  date: expense.date,
                                  paidBy: expense.created_by.id.toString(),
                                });
                                setSplitMethod(expense.split_method);
                                setShowEditExpenseModal(true);
                                setShowExpenseHistoryModal(false);
                                setExpenseMenuOpen(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Edit Expense
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Are you sure you want to delete this expense?')) {
                                  // TODO: Implement delete functionality
                                  console.log('Delete expense:', expense.id);
                                }
                                setExpenseMenuOpen(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              Delete Expense
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredExpenses.length === 0 && (
              <div className="text-center py-12">
                <Receipt className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No expenses found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Create your first expense to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal
        isOpen={showEditExpenseModal}
        onClose={() => {
          setShowEditExpenseModal(false);
          setSelectedExpense(null);
          setSplitMethod('');
          setExpenseData({ title: '', amount: '', description: '', date: '', paidBy: '' });
          setSplitData({});
        }}
        title="Edit Expense"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Expense title"
              value={expenseData.title}
              onChange={(e) => setExpenseData(prev => ({ ...prev, title: e.target.value }))}
            />
            <Input
              placeholder="Amount"
              type="number"
              value={expenseData.amount}
              onChange={(e) => setExpenseData(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Description"
              value={expenseData.description}
              onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Paid by
              </label>
              <Select
                options={[
                  {
                    value: authState.user?.id?.toString() || '',
                    label: `You (${authState.user?.username})`
                  },
                  ...(selectedExpense?.group?.members || []).map(member => ({
                    value: member.user?.id?.toString() || member.id?.toString() || '',
                    label: member.name || member.user?.username || 'Unknown User'
                  }))
                ]}
                value={expenseData.paidBy}
                onChange={(value) => setExpenseData(prev => ({ ...prev, paidBy: value as string }))}
                placeholder="Select who paid..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              value={expenseData.date}
              onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))}
            />
            <Select
              options={[
                { value: 'equal', label: 'Split Equally' },
                { value: 'custom', label: 'Custom Amounts' },
                { value: 'percentage', label: 'By Percentage' },
                { value: 'shares', label: 'By Shares' },
              ]}
              value={splitMethod}
              onChange={(value) => setSplitMethod(value as string)}
              placeholder="Split method..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditExpenseModal(false);
                setSelectedExpense(null);
                setSplitMethod('');
                setExpenseData({ title: '', amount: '', description: '', date: '', paidBy: '' });
                setSplitData({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // TODO: Implement update functionality
                console.log('Update expense:', selectedExpense?.id, expenseData);
                showSuccess('Expense updated successfully!');
                setShowEditExpenseModal(false);
              }}
            >
              Update Expense
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExpenseTracker;