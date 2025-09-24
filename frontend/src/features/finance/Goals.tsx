import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Target,
  DollarSign,
  TrendingUp,
  PiggyBank,
  CreditCard,
  Calendar,
  CheckCircle,
  Pause,
  Play,
  Eye,
  EyeOff
} from 'lucide-react';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useUpdateGoalProgress, useToggleGoalStatus } from '../../hooks/finance';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/preferences';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ProgressBar } from '../../components/common/ProgressBar';
import { ColorPickerButton } from '../../components/ui/ColorPickerButton';
import { Select } from '../../components/ui/Select';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { SummaryCards } from '../../components/ui/SummaryCards';
import { FinancePageHeader } from '../../components/ui/FinancePageHeader';
import type { Goal } from '../types';

interface GoalFormData {
  name: string;
  description: string;
  goal_type: 'savings' | 'spending' | 'debt_payoff' | 'investment';
  target_amount: string;
  current_amount: string;
  currency: string;
  start_date: string;
  target_date: string;
  category?: number;
  account?: number;
  auto_track: boolean;
  color: string;
  priority: number;
}

const goalTypeIcons = {
  savings: PiggyBank,
  spending: DollarSign,
  debt_payoff: CreditCard,
  investment: TrendingUp
};

const goalTypeColors = {
  savings: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  spending: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  debt_payoff: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  investment: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
};

const statusColors = {
  active: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  completed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  paused: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
};

export const Goals = () => {
  const goalsQuery = useGoals();
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();
  const updateProgressMutation = useUpdateGoalProgress();
  const toggleStatusMutation = useToggleGoalStatus();
  const { state: authState } = useAuth();
  const { showError } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showAmounts, setShowAmounts] = useState(true);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [progressAmount, setProgressAmount] = useState('');
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    description: '',
    goal_type: 'savings',
    target_amount: '1000.00',
    current_amount: '0.00',
    currency: 'INR',
    start_date: new Date().toISOString().split('T')[0],
    target_date: '',
    category: undefined,
    account: undefined,
    auto_track: false,
    color: '#3B82F6',
    priority: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // React Query handles data fetching automatically
  }, []);

  const goalTypes = [
    { value: 'savings', label: 'Savings Goal', description: 'Save money for future purchases or emergencies' },
    { value: 'spending', label: 'Spending Budget', description: 'Track spending limits for categories' },
    { value: 'debt_payoff', label: 'Debt Payoff', description: 'Pay down credit cards or loans' },
    { value: 'investment', label: 'Investment Target', description: 'Build investment portfolio value' }
  ];

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      goal_type: 'savings',
      target_amount: '1000.00',
      current_amount: '0.00',
      currency: authState.user?.preferred_currency || 'USD',
      start_date: new Date().toISOString().split('T')[0],
      target_date: '',
      category: undefined,
      account: undefined,
      auto_track: false,
      color: '#3B82F6',
      priority: 0
    });
  };

  const handleAddGoal = () => {
    resetForm();
    setEditingGoal(null);
    setShowAddModal(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setFormData({
      name: goal.name,
      description: goal.description || '',
      goal_type: goal.goal_type,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      currency: goal.currency,
      start_date: goal.start_date,
      target_date: goal.target_date || '',
      category: goal.category,
      account: goal.account,
      auto_track: goal.auto_track,
      color: goal.color,
      priority: goal.priority
    });
    setEditingGoal(goal);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingGoal(null);
    resetForm();
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const goalData = {
        ...formData,
        target_date: formData.target_date || undefined,
        status: 'active' as const
      };

      if (editingGoal) {
        await updateGoalMutation.mutateAsync({ id: editingGoal.id, data: goalData });
      } else {
        await createGoalMutation.mutateAsync(goalData);
      }

      handleCloseModal();
    } catch (error) {
      console.error('Failed to save goal:', error);
      showError('Failed to save goal', 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = (goal: Goal) => {
    setGoalToDelete(goal);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;

    try {
      await deleteGoalMutation.mutateAsync(goalToDelete.id);
      setGoalToDelete(null);
    } catch (error) {
      console.error('Failed to delete goal:', error);
      showError('Failed to delete goal', 'Please try again.');
    }
  };

  const handleUpdateProgress = async () => {
    if (!progressGoal || !progressAmount) return;

    try {
      await updateProgressMutation.mutateAsync({ id: progressGoal.id, amount: parseFloat(progressAmount) });
      setShowProgressModal(false);
      setProgressGoal(null);
      setProgressAmount('');
    } catch (error) {
      console.error('Failed to update goal progress:', error);
      showError('Failed to update goal progress', 'Please try again.');
    }
  };

  const handleToggleStatus = async (goal: Goal, newStatus: 'active' | 'paused' | 'cancelled') => {
    try {
      await toggleStatusMutation.mutateAsync({ id: goal.id, status: newStatus });
    } catch (error) {
      console.error('Failed to toggle goal status:', error);
      showError('Failed to update goal status', 'Please try again.');
    }
  };

  const getGoalIcon = (type: string) => {
    const IconComponent = goalTypeIcons[type as keyof typeof goalTypeIcons] || Target;
    return IconComponent;
  };

  const getGoalTypeLabel = (type: string) => {
    return goalTypes.find(t => t.value === type)?.label || type;
  };

  const goals = goalsQuery.data || [];
  const activeGoals = goals.filter(goal => goal.status === 'active');
  const completedGoals = goals.filter(goal => goal.status === 'completed');
  const otherGoals = goals.filter(goal => !['active', 'completed'].includes(goal.status));

  return (
    <div className="space-y-4">
      <FinancePageHeader
        title="🎯 Financial Goals"
        subtitle="Set, track, and achieve your financial milestones"
        gradientFrom="emerald-600"
        gradientVia="teal-600"
        gradientTo="cyan-700"
        darkGradientFrom="emerald-800"
        darkGradientVia="teal-800"
        darkGradientTo="cyan-900"
        subtitleColor="text-emerald-100"
        darkSubtitleColor="text-emerald-200"
        summaryCards={[
          {
            id: 'total',
            label: 'Total',
            value: goals.length,
            icon: Target,
            iconColor: 'text-emerald-300 dark:text-emerald-400'
          },
          {
            id: 'active',
            label: 'Active',
            value: activeGoals.length,
            icon: CheckCircle,
            iconColor: 'text-green-300 dark:text-green-400'
          },
          {
            id: 'completed',
            label: 'Done',
            value: completedGoals.length,
            icon: TrendingUp,
            iconColor: 'text-cyan-300 dark:text-cyan-400'
          },
          {
            id: 'target',
            label: showAmounts ? 'Target' : 'Hidden',
            value: showAmounts
              ? formatCurrency(goals.reduce((sum, goal) => sum + parseFloat(goal.target_amount), 0), authState.user)
              : '••••',
            icon: showAmounts ? DollarSign : EyeOff,
            iconColor: showAmounts ? 'text-yellow-300 dark:text-yellow-400' : 'text-gray-300 dark:text-gray-400'
          }
        ]}
        buttons={[
          {
            label: showAmounts ? 'Hide Amounts' : 'Show Amounts',
            icon: showAmounts ? EyeOff : Eye,
            onClick: () => setShowAmounts(!showAmounts),
            variant: 'ghost-white',
            className: 'bg-white/20 hover:bg-white/30 text-white border border-white/30 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20'
          },
          {
            label: 'Add Goal',
            icon: Plus,
            onClick: handleAddGoal,
            variant: 'primary',
            className: 'bg-white text-emerald-600 hover:bg-gray-100 dark:bg-white dark:text-emerald-700 dark:hover:bg-gray-200 shadow-lg'
          }
        ]}
      />

      {/* Goals Loading */}
      {goalsQuery.isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="bg-gray-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Target className="h-8 w-8 text-secondary-500 dark:text-secondary-400" />
          </div>
          <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">No goals yet</h3>
          <p className="text-secondary-600 dark:text-secondary-400 mb-6">Start tracking your financial goals and make progress towards your dreams.</p>
          <button
            onClick={handleAddGoal}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-3">Active Goals ({activeGoals.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeGoals.map((goal) => {
                  const IconComponent = getGoalIcon(goal.goal_type);
                  const colorClass = goalTypeColors[goal.goal_type as keyof typeof goalTypeColors];
                  const progressPercent = Math.min(goal.progress_percentage, 100);
                  
                  return (
                    <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-xl ${colorClass}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex space-x-0.5">
                          <button
                            onClick={() => {
                              setProgressGoal(goal);
                              setProgressAmount(goal.current_amount);
                              setShowProgressModal(true);
                            }}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                            title="Update progress"
                          >
                            <Target className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditGoal(goal)}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Edit goal"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(goal, 'paused')}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                            title="Pause goal"
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal)}
                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete goal"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-base text-gray-900 dark:text-white">{goal.name}</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{getGoalTypeLabel(goal.goal_type)}</p>
                          {goal.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{goal.description}</p>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Progress</span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                              {progressPercent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-2.5 rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-emerald-500 to-teal-500"
                              style={{
                                width: `${progressPercent}%`,
                                backgroundColor: goal.color || '#10B981'
                              }}
                            />
                          </div>
                        </div>

                        {showAmounts && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-300">Current:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatCurrency(parseFloat(goal.current_amount), authState.user)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-300">Target:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatCurrency(parseFloat(goal.target_amount), authState.user)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs border-t border-gray-200 dark:border-gray-600 pt-1.5">
                              <span className="text-gray-600 dark:text-gray-300">Remaining:</span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(parseFloat(goal.remaining_amount), authState.user)}
                              </span>
                            </div>
                          </div>
                        )}

                        {goal.target_date && (
                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                            <Calendar className="h-3 w-3 mr-1.5 text-gray-500" />
                            <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md ${statusColors[goal.status]}`}>
                            {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {goal.goal_type.charAt(0).toUpperCase() + goal.goal_type.slice(1).replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-3">Completed Goals ({completedGoals.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedGoals.map((goal) => {
                  return (
                    <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-green-200 dark:border-green-800 p-4 shadow-md opacity-95">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-md">
                          Completed
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-base text-gray-900 dark:text-white">{goal.name}</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{getGoalTypeLabel(goal.goal_type)}</p>
                        </div>

                        {showAmounts && (
                          <div className="text-center bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(parseFloat(goal.target_amount), authState.user)}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">Goal Achieved! 🎉</p>
                          </div>
                        )}

                        {goal.completed_date && (
                          <div className="text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Completed on {new Date(goal.completed_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other Goals (Paused/Cancelled) */}
          {otherGoals.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Other Goals ({otherGoals.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherGoals.map((goal) => {
                  const IconComponent = getGoalIcon(goal.goal_type);
                  const colorClass = goalTypeColors[goal.goal_type as keyof typeof goalTypeColors];
                  
                  return (
                    <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg opacity-70">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex space-x-2">
                          {goal.status === 'paused' && (
                            <button
                              onClick={() => handleToggleStatus(goal, 'active')}
                              className="p-1 text-secondary-500 dark:text-secondary-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Resume goal"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditGoal(goal)}
                            className="p-1 text-secondary-500 dark:text-secondary-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="Edit goal"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal)}
                            className="p-1 text-secondary-500 dark:text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete goal"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg text-secondary-900 dark:text-secondary-100">{goal.name}</h3>
                          <p className="text-sm text-secondary-600 dark:text-secondary-400">{getGoalTypeLabel(goal.goal_type)}</p>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${statusColors[goal.status]}`}>
                            {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Goal Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        title={editingGoal ? 'Edit Goal' : 'Add New Goal'}
      >
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Goal Name */}
          <Input
            label="Goal Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Emergency Fund, Vacation, New Car"
            required
          />

          {/* Goal Type */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Goal Type *
            </label>
            <div className="grid grid-cols-1 gap-3">
              {goalTypes.map((type) => (
                <label key={type.value} className="relative flex cursor-pointer">
                  <input
                    type="radio"
                    value={type.value}
                    checked={formData.goal_type === type.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, goal_type: e.target.value as GoalFormData['goal_type'] }))}
                    className="sr-only"
                  />
                  <div className={`flex-1 p-4 border-2 rounded-lg transition-colors duration-200 ${
                    formData.goal_type === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                  }`}>
                    <div className="flex items-center">
                      <div className={`p-3 rounded-full mr-3 ${
                        formData.goal_type === type.value
                          ? goalTypeColors[type.value as keyof typeof goalTypeColors]
                          : 'bg-gray-100 text-secondary-500 dark:text-secondary-400'
                      }`}>
                        {React.createElement(getGoalIcon(type.value), { className: 'h-5 w-5' })}
                      </div>
                      <div>
                        <div className="font-semibold text-lg text-gray-800 dark:text-gray-200">{type.label}</div>
                        <div className="text-sm text-secondary-600 dark:text-secondary-400">{type.description}</div>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Target Amount and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Target Amount"
              type="number"
              step="0.01"
              value={formData.target_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, target_amount: e.target.value }))}
              placeholder="1000.00"
              required
            />
            <Select
              label="Currency"
              value={formData.currency}
              onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
              options={[
                { value: "INR", label: "INR - Indian Rupee" },
                { value: "USD", label: "USD - US Dollar" },
                { value: "EUR", label: "EUR - Euro" },
                { value: "GBP", label: "GBP - British Pound" },
                { value: "JPY", label: "JPY - Japanese Yen" },
                { value: "CAD", label: "CAD - Canadian Dollar" },
                { value: "AUD", label: "AUD - Australian Dollar" },
              ]}
            />
          </div>

          {/* Current Amount */}
          <Input
            label="Current Amount"
            type="number"
            step="0.01"
            value={formData.current_amount}
            onChange={(e) => setFormData(prev => ({ ...prev, current_amount: e.target.value }))}
            placeholder="0.00"
          />

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              required
            />
            <Input
              label="Target Date"
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
            />
          </div>

          {/* Description */}
          <Input
            label="Description"
            as="textarea"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            placeholder="Optional: Add details about your goal..."
          />

          {/* Color and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Color Theme
              </label>
              <div className="flex space-x-2">
                {colors.map(color => (
                  <ColorPickerButton
                    key={color}
                    color={color}
                    isSelected={formData.color === color}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>
            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: Number(e.target.value) }))}
              options={[
                { value: 0, label: "Normal" },
                { value: 1, label: "High" },
                { value: 2, label: "Urgent" },
              ]}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-6 py-3 text-secondary-600 dark:text-secondary-400 hover:text-gray-800 transition-colors font-medium rounded-lg"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3 inline-block"></div>
                  {editingGoal ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingGoal ? 'Update Goal' : 'Create Goal'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Progress Update Modal */}
      <Modal
        isOpen={showProgressModal}
        onClose={() => {
          setShowProgressModal(false);
          setProgressGoal(null);
          setProgressAmount('');
        }}
        title={`Update Progress - ${progressGoal?.name}`}
      >
        <div className="space-y-6 p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-blue-900 mb-3">Current Progress</h4>
            <div className="text-base text-blue-700 space-y-1">
              <div>Current: {formatCurrency(parseFloat(progressGoal?.current_amount || '0'), authState.user)}</div>
              <div>Target: {formatCurrency(parseFloat(progressGoal?.target_amount || '0'), authState.user)}</div>
              <div>Progress: <span className="font-bold">{progressGoal?.progress_percentage.toFixed(1)}%</span></div>
            </div>
          </div>
          
          <Input
            type="number"
            label="New Amount"
            value={progressAmount}
            onChange={(e) => setProgressAmount(e.target.value)}
            placeholder="Enter new amount"
            step="0.01"
            autoFocus
          />

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setShowProgressModal(false);
                setProgressGoal(null);
                setProgressAmount('');
              }}
              className="px-6 py-3 text-secondary-600 dark:text-secondary-400 hover:text-gray-800 transition-colors font-medium rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProgress}
              disabled={!progressAmount || isNaN(parseFloat(progressAmount))}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md"
            >
              Update Progress
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!goalToDelete}
        onClose={() => setGoalToDelete(null)}
        onConfirm={confirmDeleteGoal}
        title="Delete Goal"
      >
        Are you sure you want to delete "{goalToDelete?.name}"? This action cannot be undone.
      </ConfirmationModal>
    </div>
  );
};