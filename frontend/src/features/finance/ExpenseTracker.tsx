import React, { useState, useMemo } from 'react';
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
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [groupType, setGroupType] = useState<'one-to-one' | 'multi-person'>('multi-person');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

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
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'settled'>('all');
  const [showBalances, setShowBalances] = useState(true);

  // API Hooks
  const { data: expenseGroups = [], isLoading: isLoadingGroups } = useExpenseGroups();
  const { data: allGroupExpenses = [], isLoading: isLoadingExpenses } = useGroupExpenses(0); // Get all expenses

  // Mutations
  const createGroupMutation = useCreateExpenseGroup();
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
                          onClick={() => setShowAddExpenseModal(true)}
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
                  <div key={group.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700">
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
                              {group.members.length} members
                            </p>
                          </div>
                        </div>
                        <div className="relative">
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
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
                                {formatCurrency(group.totalExpenses, authState.user)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Your Balance
                              </p>
                              <p className={`text-lg font-bold ${getBalanceColor(group.yourBalance)}`}>
                                {formatCurrency(Math.abs(group.yourBalance), authState.user)}
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
                            onClick={() => setShowAddExpenseModal(true)}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Expense
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {group.members.slice(0, 3).map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    {member.name.charAt(0)}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {member.name}
                                </span>
                              </div>
                              {showBalances && (
                                <span className={`text-xs font-semibold ${getBalanceColor(member.balance)}`}>
                                  {formatCurrency(Math.abs(member.balance), authState.user)}
                                </span>
                              )}
                            </div>
                          ))}
                          {group.members.length > 3 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                              +{group.members.length - 3} more members
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
        onClose={() => setShowAddExpenseModal(false)}
        title="Add New Expense"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Expense title" />
            <Input placeholder="Amount" type="number" />
          </div>
          <Input placeholder="Description" />
          <div className="grid grid-cols-2 gap-4">
            <Input type="date" />
            <Select
              options={[
                { value: 'equal', label: 'Split Equally' },
                { value: 'custom', label: 'Custom Amounts' },
                { value: 'percentage', label: 'By Percentage' },
              ]}
              placeholder="Split method..."
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowAddExpenseModal(false)}
            >
              Cancel
            </Button>
            <Button>
              Add Expense
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExpenseTracker;