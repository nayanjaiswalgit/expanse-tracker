import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGoals, useDeleteGoal, useToggleGoalStatus } from '../../hooks/finance';
import { GoalDetail } from './GoalDetail';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';

export const GoalDetailPage: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const goalsQuery = useGoals();
  const deleteGoalMutation = useDeleteGoal();
  const toggleStatusMutation = useToggleGoalStatus();
  const { state: authState } = useAuth();
  const { showError } = useToast();
  const [showAmounts, setShowAmounts] = useState(true);

  // Find the goal by ID
  const goal = goalsQuery.data?.find(g => g.id === parseInt(goalId || '0'));

  if (goalsQuery.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Goal not found</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">The goal you're looking for doesn't exist or has been deleted.</p>
        <button
          onClick={() => navigate('/goals')}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          Back to Goals
        </button>
      </div>
    );
  }

  const handleBack = () => {
    navigate('/goals');
  };

  const handleEdit = () => {
    // Navigate back to goals page with edit mode
    navigate('/goals', { state: { editGoal: goal } });
  };

  const handleDelete = async () => {
    try {
      await deleteGoalMutation.mutateAsync(goal.id);
      navigate('/goals');
    } catch (error) {
      console.error('Failed to delete goal:', error);
      showError('Failed to delete goal', 'Please try again.');
    }
  };

  const handleUpdateProgress = () => {
    // Navigate back to goals page with progress update mode
    navigate('/goals', { state: { updateProgressGoal: goal } });
  };

  const handleToggleStatus = async (status: 'active' | 'paused') => {
    try {
      await toggleStatusMutation.mutateAsync({ id: goal.id, status });
    } catch (error) {
      console.error('Failed to toggle goal status:', error);
      showError('Failed to update goal status', 'Please try again.');
    }
  };

  return (
    <GoalDetail
      goal={goal}
      onBack={handleBack}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onUpdateProgress={handleUpdateProgress}
      onToggleStatus={handleToggleStatus}
      showAmounts={showAmounts}
      onToggleAmounts={() => setShowAmounts(!showAmounts)}
    />
  );
};