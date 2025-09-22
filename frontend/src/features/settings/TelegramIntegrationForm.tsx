import React, { useState } from 'react';
import { Bot, Plus, Play, Square, TestTube2, BarChart3, Settings, Users, Trash2, Edit2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ObjectForm } from '../../components/forms';
import { createTelegramBotFormConfig } from '../../forms/configs/advancedForms';
import { TelegramBotFormData } from '../../schemas/advanced';
import { useToast } from '../../components/ui/Toast';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/layout/LoadingSpinner';
import {
  useTelegramBots,
  useTelegramUsers,
  useTelegramSetupGuide,
  useTelegramBotStats,
  useCreateTelegramBot,
  useTelegramBotAction,
  useTelegramUserAction,
} from '../../hooks/settings';

interface TelegramBot {
  id: number;
  name: string;
  bot_token: string;
  webhook_url: string;
  status: 'active' | 'inactive' | 'error';
  total_transactions_created: number;
  created_at: string;
  updated_at: string;
}

interface TelegramUser {
  id: number;
  telegram_user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  status: 'active' | 'pending' | 'blocked';
  verification_code: string;
  created_at: string;
}

interface BotStatistics {
  total_users: number;
  active_users: number;
  total_messages: number;
  transactions_created: number;
  uptime_days: number;
}

const TelegramIntegrationForm = () => {
  const { data: botsData, isLoading: botsLoading } = useTelegramBots();
  const { data: usersData, isLoading: usersLoading } = useTelegramUsers();
  const { data: setupGuide } = useTelegramSetupGuide();
  const createBot = useCreateTelegramBot();
  const botAction = useTelegramBotAction();
  const userAction = useTelegramUserAction();

  const [showAddBotModal, setShowAddBotModal] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [selectedBot, setSelectedBot] = useState<TelegramBot | null>(null);
  const [editingBot, setEditingBot] = useState<TelegramBot | null>(null);

  const { data: botStats, refetch: refetchStats } = useTelegramBotStats(
    selectedBot?.id,
    !!selectedBot
  );

  const { showSuccess, showError } = useToast();

  const bots: TelegramBot[] = Array.isArray(botsData)
    ? botsData
    : (botsData?.results as TelegramBot[]) || [];
  const users: TelegramUser[] = Array.isArray(usersData)
    ? usersData
    : (usersData?.results as TelegramUser[]) || [];
  const loading = botsLoading || usersLoading;

  const handleCreateBot = async (data: TelegramBotFormData) => {
    try {
      await createBot.mutateAsync(data);
      setShowAddBotModal(false);
      showSuccess('Telegram bot created successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to create bot');
    }
  };

  const handleUpdateBot = async (data: TelegramBotFormData) => {
    if (!editingBot) return;

    try {
      await botAction.mutateAsync({
        botId: editingBot.id,
        action: 'update',
        data,
      });
      setEditingBot(null);
      showSuccess('Bot updated successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to update bot');
    }
  };

  const handleBotAction = async (botId: number, action: string) => {
    try {
      await botAction.mutateAsync({ botId, action });

      const actionMessages = {
        start: 'Bot started successfully',
        stop: 'Bot stopped successfully',
        restart: 'Bot restarted successfully',
        delete: 'Bot deleted successfully',
        test: 'Test message sent successfully',
      };

      showSuccess(actionMessages[action as keyof typeof actionMessages] || 'Action completed');

      if (action === 'test') {
        refetchStats();
      }
    } catch (error: any) {
      showError(error.message || `Failed to ${action} bot`);
    }
  };

  const handleUserAction = async (userId: number, action: string) => {
    try {
      await userAction.mutateAsync({ userId, action });

      const actionMessages = {
        approve: 'User approved successfully',
        block: 'User blocked successfully',
        unblock: 'User unblocked successfully',
        delete: 'User removed successfully',
      };

      showSuccess(actionMessages[action as keyof typeof actionMessages] || 'Action completed');
    } catch (error: any) {
      showError(error.message || `Failed to ${action} user`);
    }
  };

  const createBotFormConfig = createTelegramBotFormConfig(handleCreateBot, createBot.isPending);
  const editBotFormConfig = editingBot
    ? createTelegramBotFormConfig(
        handleUpdateBot,
        botAction.isPending,
      )
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Telegram Integration</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect Telegram bots for transaction notifications and management
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={() => setShowSetupGuide(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Setup Guide
          </Button>
          <Button onClick={() => setShowAddBotModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bot
          </Button>
        </div>
      </div>

      {/* Bots Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Bot className="h-5 w-5 mr-2" />
            Your Bots ({bots.length})
          </h3>
        </div>

        {bots.length === 0 ? (
          <div className="p-6 text-center">
            <Bot className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No bots configured</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by adding your first Telegram bot.
            </p>
            <div className="mt-6">
              <Button onClick={() => setShowAddBotModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bot
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {bots.map((bot) => (
              <div key={bot.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Bot className="h-10 w-10 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">{bot.name}</h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <StatusBadge
                          status={bot.status}
                          variant={
                            bot.status === 'active' ? 'success' :
                            bot.status === 'inactive' ? 'warning' : 'error'
                          }
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {bot.total_transactions_created} transactions created
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Created {new Date(bot.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBot(bot)}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingBot(bot)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBotAction(bot.id, 'test')}
                    >
                      <TestTube2 className="h-4 w-4" />
                    </Button>
                    {bot.status === 'active' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBotAction(bot.id, 'stop')}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBotAction(bot.id, 'start')}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBotAction(bot.id, 'delete')}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {selectedBot?.id === bot.id && botStats && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{botStats.total_users}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Total Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{botStats.active_users}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Active Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{botStats.total_messages}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Messages</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{botStats.transactions_created}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Transactions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{botStats.uptime_days}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Days Uptime</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users Section */}
      {users.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Connected Users ({users.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <div key={user.id} className="p-6 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.first_name} {user.last_name}
                  </h4>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</span>
                    <StatusBadge
                      status={user.status}
                      variant={
                        user.status === 'active' ? 'success' :
                        user.status === 'pending' ? 'warning' : 'error'
                      }
                    />
                    {user.status === 'pending' && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Code: {user.verification_code}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {user.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUserAction(user.id, 'approve')}
                    >
                      Approve
                    </Button>
                  )}
                  {user.status === 'active' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUserAction(user.id, 'block')}
                    >
                      Block
                    </Button>
                  ) : user.status === 'blocked' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUserAction(user.id, 'unblock')}
                    >
                      Unblock
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUserAction(user.id, 'delete')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Bot Modal */}
      <Modal
        isOpen={showAddBotModal}
        onClose={() => setShowAddBotModal(false)}
        title="Add Telegram Bot"
      >
        <ObjectForm config={createBotFormConfig} />
      </Modal>

      {/* Edit Bot Modal */}
      <Modal
        isOpen={!!editingBot}
        onClose={() => setEditingBot(null)}
        title="Edit Bot"
      >
        {editBotFormConfig && <ObjectForm config={editBotFormConfig} />}
      </Modal>

      {/* Setup Guide Modal */}
      <Modal
        isOpen={showSetupGuide}
        onClose={() => setShowSetupGuide(false)}
        title="Telegram Bot Setup Guide"
      >
        <div className="space-y-4">
          <div className="prose dark:prose-invert max-w-none">
            <h3>Setting up your Telegram Bot</h3>
            <ol>
              <li>Open Telegram and search for <code>@BotFather</code></li>
              <li>Send <code>/newbot</code> to create a new bot</li>
              <li>Follow the instructions to name your bot</li>
              <li>Copy the bot token provided by BotFather</li>
              <li>Paste the token in the form above</li>
              <li>Users can then find your bot and start conversations</li>
            </ol>

            <h3>Bot Features</h3>
            <ul>
              <li>Receive transaction notifications</li>
              <li>Add transactions via chat</li>
              <li>Check account balances</li>
              <li>Get spending summaries</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TelegramIntegrationForm;