import { useState } from 'react';
import { Bot, Plus, Play, Square, TestTube2, BarChart3, Settings, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
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

const TelegramIntegration = () => {
  const { data: botsData, isLoading: botsLoading } = useTelegramBots();
  const { data: usersData, isLoading: usersLoading } = useTelegramUsers();
  const { data: setupGuide } = useTelegramSetupGuide();
  const createBot = useCreateTelegramBot();
  const botAction = useTelegramBotAction();
  const userAction = useTelegramUserAction();
  const [showAddBotModal, setShowAddBotModal] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [selectedBot, setSelectedBot] = useState<TelegramBot | null>(null);
  const { data: botStats, refetch: refetchStats } = useTelegramBotStats(
    selectedBot?.id,
    !!selectedBot
  );
  
  const { addToast } = useToast();

  const bots: TelegramBot[] = Array.isArray(botsData)
    ? botsData
    : (botsData?.results as TelegramBot[]) || [];
  const users: TelegramUser[] = Array.isArray(usersData)
    ? usersData
    : (usersData?.results as TelegramUser[]) || [];
  const loading = botsLoading || usersLoading;

  // Data fetching handled by React Query hooks above

  const handleCreateBot = async (formData: { name: string; bot_token: string; webhook_url: string }) => {
    try {
      await createBot.mutateAsync(formData);
      setShowAddBotModal(false);
      addToast('Telegram bot created successfully', 'success');
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Failed to create bot', 'error');
    }
  };

  const handleBotAction = async (botId: number, action: 'start' | 'stop' | 'test') => {
    try {
      const data = await botAction.mutateAsync({ botId, action });
      addToast(data?.message || `Bot ${action} executed`, 'success');
    } catch (error) {
      addToast(`Failed to ${action} bot`, 'error');
    }
  };

  const handleUserAction = async (userId: number, action: 'verify' | 'block' | 'unblock', verificationCode?: string) => {
    try {
      const data = await userAction.mutateAsync({ userId, action, verificationCode });
      addToast(data?.message || 'Action successful', 'success');
    } catch (error) {
      addToast(`Failed to ${action} user`, 'error');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">Telegram Integration</h2>
          <p className="text-secondary-600 dark:text-secondary-400">Manage Telegram bots and user interactions for automated finance tracking.</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowSetupGuide(true)}
            variant="secondary"
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Setup Guide</span>
          </Button>
          <Button
            onClick={() => setShowAddBotModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Bot</span>
          </Button>
        </div>
      </div>

      {/* Bots Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Telegram Bots</h3>
        {bots.length === 0 ? (
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 p-8 text-center">
            <Bot className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">No Telegram Bots</h4>
            <p className="text-secondary-600 dark:text-secondary-400 mb-4">Create your first Telegram bot to start automating finance tracking.</p>
            <Button onClick={() => setShowAddBotModal(true)}>Add Your First Bot</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {bots.map((bot) => (
              <div key={bot.id} className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">{bot.name}</h4>
                    <p className="text-sm text-secondary-500 dark:text-secondary-500">Token: {bot.bot_token.slice(0, 20)}...</p>
                  </div>
                  <StatusBadge 
                    status={bot.status}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                    <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">{bot.total_transactions_created}</div>
                    <div className="text-xs text-secondary-600 dark:text-secondary-400">Transactions</div>
                  </div>
                  <div className="text-center p-3 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
                    <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">{users.filter(u => u.status === 'active').length}</div>
                    <div className="text-xs text-secondary-600 dark:text-secondary-400">Active Users</div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleBotAction(bot.id, bot.status === 'active' ? 'stop' : 'start')}
                    size="sm"
                    variant={bot.status === 'active' ? 'secondary' : 'primary'}
                    className="flex items-center space-x-1"
                  >
                    {bot.status === 'active' ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    <span>{bot.status === 'active' ? 'Stop' : 'Start'}</span>
                  </Button>
                  <Button
                    onClick={() => handleBotAction(bot.id, 'test')}
                    size="sm"
                    variant="secondary"
                    className="flex items-center space-x-1"
                  >
                    <TestTube2 className="h-3 w-3" />
                    <span>Test</span>
                  </Button>
                  <Button
                    onClick={async () => {
                      setSelectedBot(bot);
                      await refetchStats();
                    }}
                    size="sm"
                    variant="outline"
                    className="flex items-center space-x-1"
                  >
                    <BarChart3 className="h-3 w-3" />
                    <span>Stats</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users Section */}
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Telegram Users</h3>
        {users.length === 0 ? (
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 p-6 text-center">
            <Users className="h-8 w-8 text-secondary-400 mx-auto mb-2" />
            <p className="text-secondary-600 dark:text-secondary-400">No Telegram users yet. Users will appear here after they start your bot.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50 dark:bg-secondary-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200 dark:divide-secondary-600">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-secondary-500 dark:text-secondary-500">@{user.username}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge 
                          status={user.status}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 dark:text-secondary-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        {user.status === 'pending' && (
                          <Button
                            onClick={() => handleUserAction(user.id, 'verify', user.verification_code)}
                            size="sm"
                            variant="primary"
                          >
                            Verify
                          </Button>
                        )}
                        {user.status === 'active' && (
                          <Button
                            onClick={() => handleUserAction(user.id, 'block')}
                            size="sm"
                            variant="secondary"
                          >
                            Block
                          </Button>
                        )}
                        {user.status === 'blocked' && (
                          <Button
                            onClick={() => handleUserAction(user.id, 'unblock')}
                            size="sm"
                            variant="primary"
                          >
                            Unblock
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Bot Modal */}
      <AddBotModal
        isOpen={showAddBotModal}
        onClose={() => setShowAddBotModal(false)}
        onSubmit={handleCreateBot}
      />

      {/* Setup Guide Modal */}
      <SetupGuideModal
        isOpen={showSetupGuide}
        onClose={() => setShowSetupGuide(false)}
        guide={setupGuide}
      />

      {/* Bot Statistics Modal */}
      <BotStatsModal
        isOpen={!!selectedBot}
        onClose={() => {
          setSelectedBot(null);
        }}
        bot={selectedBot}
        stats={botStats ?? null}
      />
    </div>
  );
};

// Add Bot Modal Component
const AddBotModal = ({ isOpen, onClose, onSubmit }: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; bot_token: string; webhook_url: string }) => void;
}) => {
  const [formData, setFormData] = useState({
    name: '',
    bot_token: '',
    webhook_url: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: '', bot_token: '', webhook_url: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Telegram Bot">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Bot Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="My Finance Bot"
          required
        />
        <Input
          label="Bot Token"
          value={formData.bot_token}
          onChange={(e) => setFormData({ ...formData, bot_token: e.target.value })}
          placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
          required
        />
        <Input
          label="Webhook URL"
          value={formData.webhook_url}
          onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
          placeholder="https://your-domain.com/api/telegram/webhook/"
          required
        />
        <div className="flex space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Create Bot
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Setup Guide Modal Component
const SetupGuideModal = ({ isOpen, onClose, guide }: {
  isOpen: boolean;
  onClose: () => void;
  guide: any;
}) => {
  if (!guide) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Telegram Bot Setup Guide">
      <div className="space-y-6">
        {guide.steps?.map((step: any, index: number) => (
          <div key={index} className="border-l-4 border-blue-500 pl-6">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
              Step {step.step}: {step.title}
            </h3>
            <p className="text-secondary-600 dark:text-secondary-400 mb-3">{step.description}</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-secondary-600 dark:text-secondary-400">
              {step.details?.map((detail: string, idx: number) => (
                <li key={idx}>{detail}</li>
              ))}
            </ul>
          </div>
        ))}

        <div className="bg-secondary-50 dark:bg-secondary-700 rounded-lg p-4">
          <h4 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-2">Available Commands</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {guide.commands?.map((command: string, index: number) => (
              <code key={index} className="block bg-white dark:bg-secondary-800 px-2 py-1 rounded text-secondary-800 dark:text-secondary-200">
                {command}
              </code>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Got it</Button>
        </div>
      </div>
    </Modal>
  );
};

// Bot Statistics Modal Component
const BotStatsModal = ({ isOpen, onClose, bot, stats }: {
  isOpen: boolean;
  onClose: () => void;
  bot: TelegramBot | null;
  stats: BotStatistics | null;
}) => {
  if (!bot) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${bot.name} Statistics`}>
      <div className="space-y-4">
        {stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
              <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">{stats.total_users}</div>
              <div className="text-sm text-secondary-600 dark:text-secondary-400">Total Users</div>
            </div>
            <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
              <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">{stats.active_users}</div>
              <div className="text-sm text-secondary-600 dark:text-secondary-400">Active Users</div>
            </div>
            <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
              <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">{stats.total_messages}</div>
              <div className="text-sm text-secondary-600 dark:text-secondary-400">Total Messages</div>
            </div>
            <div className="text-center p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
              <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">{stats.transactions_created}</div>
              <div className="text-sm text-secondary-600 dark:text-secondary-400">Transactions Created</div>
            </div>
          </div>
        ) : (
          <LoadingSpinner />
        )}
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};

export default TelegramIntegration;