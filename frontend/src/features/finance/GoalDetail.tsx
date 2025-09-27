import React, { useState } from 'react';
import {
  ArrowLeft,
  Target,
  Calendar,
  DollarSign,
  TrendingUp,
  Edit2,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ZoomIn,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/preferences';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { Goal } from '../../types';

interface GoalDetailProps {
  goal: Goal;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateProgress: () => void;
  onToggleStatus: (status: 'active' | 'paused') => void;
  showAmounts: boolean;
  onToggleAmounts: () => void;
}

export const GoalDetail: React.FC<GoalDetailProps> = ({
  goal,
  onBack,
  onEdit,
  onDelete,
  onUpdateProgress,
  onToggleStatus,
  showAmounts,
  onToggleAmounts
}) => {
  const { state: authState } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const progressPercent = Math.min(goal.progress_percentage, 100);
  const images = goal.images || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Goals
        </button>

        <div className="flex items-center space-x-2">
          <Button onClick={onToggleAmounts} variant="ghost" size="sm">
            {showAmounts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button onClick={onEdit} variant="ghost" size="sm">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button onClick={onDelete} variant="ghost" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Goal Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{goal.name}</h1>
              <div className="flex items-center space-x-3 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                  {goal.status?.charAt(0).toUpperCase() + (goal.status?.slice(1) || '') || 'Unknown'}
                </span>
                {goal.goal_type && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {goal.goal_type.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            {goal.status === 'active' && (
              <>
                <Button onClick={onUpdateProgress} size="sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Update Progress
                </Button>
                <Button onClick={() => onToggleStatus('paused')} variant="outline" size="sm">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              </>
            )}
            {goal.status === 'paused' && (
              <Button onClick={() => onToggleStatus('active')} variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
          </div>
        </div>

        {goal.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-4">{goal.description}</p>
        )}

        {/* Progress Section */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {progressPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-blue-500 transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: goal.color || '#3B82F6'
              }}
            />
          </div>
        </div>

        {/* Financial Details */}
        {showAmounts && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(parseFloat(goal.current_amount), authState.user)}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Target</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(parseFloat(goal.target_amount), authState.user)}
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Remaining</div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(parseFloat(goal.remaining_amount), authState.user)}
              </div>
            </div>
          </div>
        )}

        {/* Date Info */}
        <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
          {goal.start_date && (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Started: {new Date(goal.start_date).toLocaleDateString()}
            </div>
          )}
          {goal.target_date && (
            <div className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Target: {new Date(goal.target_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <ImageIcon className="h-5 w-5 mr-2" />
              Goal Images ({images.length})
            </h2>
          </div>

          {images.length === 1 ? (
            <div className="relative">
              <img
                src={images[0].image_url}
                alt="Goal image"
                className="w-full max-h-96 object-cover rounded-lg cursor-pointer"
                onClick={() => setSelectedImage(images[0].image_url)}
              />
              {images[0].caption && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{images[0].caption}</p>
              )}
              <button
                onClick={() => setSelectedImage(images[0].image_url)}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Main Image */}
              <div className="relative mb-4">
                <img
                  src={images[currentImageIndex].image_url}
                  alt={`Goal image ${currentImageIndex + 1}`}
                  className="w-full max-h-96 object-cover rounded-lg cursor-pointer"
                  onClick={() => setSelectedImage(images[currentImageIndex].image_url)}
                />
                {images[currentImageIndex].caption && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {images[currentImageIndex].caption}
                  </p>
                )}

                {/* Navigation buttons */}
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </button>

                <button
                  onClick={() => setSelectedImage(images[currentImageIndex].image_url)}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>

              {/* Thumbnail Navigation */}
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === currentImageIndex
                        ? 'border-blue-500'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <img
                      src={image.thumbnail_url || image.image_url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Full Screen Image Modal */}
      <Modal
        isOpen={selectedImage !== null}
        onClose={() => setSelectedImage(null)}
        size="full"
        className="bg-black/90"
      >
        <div className="relative w-full h-full flex items-center justify-center p-4">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Goal image full size"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          )}
        </div>
      </Modal>
    </div>
  );
};