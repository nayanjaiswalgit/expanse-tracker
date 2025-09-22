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
import { formatCurrency } from '../../utils/preferences';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ProgressBar } from '../../components/common/ProgressBar';
import { ColorPickerButton } from '../../components/ui/ColorPickerButton';
import { Select } from '../../components/ui/Select';
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showAmounts, setShowAmounts] = useState(true);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [progressAmount, setProgressAmount] = useState('');
  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    description: '',
    goal_type: 'savings',
    target_amount: '1000.00',
    current_amount: '0.00',
    currency: 'USD',
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
      alert('Failed to save goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goal: Goal) => {
    if (!confirm(`Are you sure you want to delete "${goal.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteGoalMutation.mutateAsync(goal.id);
    } catch (error) {
      console.error('Failed to delete goal:', error);
      alert('Failed to delete goal. Please try again.');
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
      alert('Failed to update goal progress. Please try again.');
    }
  };

  const handleToggleStatus = async (goal: Goal, newStatus: 'active' | 'paused' | 'cancelled') => {
    try {
      await toggleStatusMutation.mutateAsync({ id: goal.id, status: newStatus });
    } catch (error) {
      console.error('Failed to toggle goal status:', error);
      alert('Failed to update goal status. Please try again.');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">🎯 Your Financial Goals</h1>
            <p className="text-purple-100 text-lg">Set, track, and achieve your financial milestones.</p>
            <div className="mt-4 flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                <span>{goals.length} total goals</span>
              </div>
              {showAmounts && (
                <div className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  <span>Total Target: {formatCurrency(goals.reduce((sum, goal) => sum + parseFloat(goal.target_amount), 0), authState.user)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 lg:mt-0 flex items-center space-x-3">
            <button
              onClick={() => setShowAmounts(!showAmounts)}
              className="flex items-center px-4 py-2 bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 dark:hover:bg-gray-800/30 transition-colors text-sm border border-white/30 dark:border-gray-600/30"
            >
              {showAmounts ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showAmounts ? 'Hide' : 'Show'} Amounts
            </button>
            <button
              onClick={handleAddGoal}
              className="flex items-center px-6 py-2 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm shadow-md border border-gray-200 dark:border-gray-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Goal
            </button>
          </div>
        </div>
      </div>

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
        <div className="space-y-8">
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Active Goals ({activeGoals.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeGoals.map((goal) => {
                  const IconComponent = getGoalIcon(goal.goal_type);
                  const colorClass = goalTypeColors[goal.goal_type as keyof typeof goalTypeColors];
                  const progressPercent = Math.min(goal.progress_percentage, 100);
                  
                  return (
                    <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-shadow duration-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setProgressGoal(goal);
                              setProgressAmount(goal.current_amount);
                              setShowProgressModal(true);
                            }}
                            className="p-1 text-secondary-500 dark:text-secondary-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="Update progress"
                          >
                            <Target className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditGoal(goal)}
                            className="p-1 text-secondary-500 dark:text-secondary-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="Edit goal"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(goal, 'paused')}
                            className="p-1 text-secondary-500 dark:text-secondary-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                            title="Pause goal"
                          >
                            <Pause className="h-4 w-4" />
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

                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg text-secondary-900 dark:text-secondary-100">{goal.name}</h3>
                          <p className="text-sm text-secondary-600 dark:text-secondary-400">{getGoalTypeLabel(goal.goal_type)}</p>
                          {goal.description && (
                            <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{goal.description}</p>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-secondary-600 dark:text-secondary-400">Progress</span>
                            <span className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                              {progressPercent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <ProgressBar
                              percentage={progressPercent}
                              className="h-3 rounded-full transition-all duration-500"
                              style={{ backgroundColor: goal.color }}
                            />
                          </div>
                        </div>

                        {showAmounts && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-600 dark:text-secondary-400">Current:</span>
                              <span className="font-medium">
                                {formatCurrency(parseFloat(goal.current_amount), authState.user)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-600 dark:text-secondary-400">Target:</span>
                              <span className="font-medium">
                                {formatCurrency(parseFloat(goal.target_amount), authState.user)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-600 dark:text-secondary-400">Remaining:</span>
                              <span className="font-medium text-blue-600">
                                {formatCurrency(parseFloat(goal.remaining_amount), authState.user)}
                              </span>
                            </div>
                          </div>
                        )}

                        {goal.target_date && (
                          <div className="flex items-center text-sm text-secondary-600 dark:text-secondary-400">
                            <Calendar className="h-4 w-4 mr-2" />
                            Target: {new Date(goal.target_date).toLocaleDateString()}
                          </div>
                        )}

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

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Completed Goals ({completedGoals.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedGoals.map((goal) => {
                  return (
                    <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-green-200 p-6 shadow-lg opacity-90">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg bg-green-100 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          Completed
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg text-secondary-900 dark:text-secondary-100">{goal.name}</h3>
                          <p className="text-sm text-secondary-600 dark:text-secondary-400">{getGoalTypeLabel(goal.goal_type)}</p>
                        </div>

                        {showAmounts && (
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(parseFloat(goal.target_amount), authState.user)}
                            </p>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400">Goal Achieved!</p>
                          </div>
                        )}

                        {goal.completed_date && (
                          <div className="text-center">
                            <p className="text-xs text-secondary-500 dark:text-secondary-400">
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
    </div>
  );
};