import React, { useState, useEffect } from 'react';
import { Brain, Settings, TrendingUp, AlertCircle, CheckCircle, TestTube2, Zap, Database, Server } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import OllamaManagement from './OllamaManagement';
import {
  useAISettings,
  useAIUsageStats,
  useAISystemStatus,
  useUpdateAISettingsMutation,
  useTestAIConnectionMutation,
  type AISettings as AISettingsType,
  type UsageStats as UsageStatsType,
  type SystemStatus as SystemStatusType,
} from './hooks/queries';

interface AISettings {
  preferred_provider: 'openai' | 'ollama' | 'system';
  openai_api_key: string;
  openai_model: string;
  ollama_endpoint: string;
  ollama_model: string;
  enable_categorization: boolean;
  enable_transaction_parsing: boolean;
  enable_receipt_ocr: boolean;
  enable_monthly_reports: boolean;
  confidence_threshold: number;
  max_monthly_usage: number;
  auto_approve_high_confidence: boolean;
}

interface UsageStats {
  total_requests: number;
  successful_requests: number;
  success_rate: number;
  total_credits_used: number;
  total_tokens_used: number;
  avg_processing_time: number;
  credits_remaining: number;
  provider_stats: Record<string, { requests: number; tokens: number; avg_time: number }>;
  operation_stats: Record<string, { count: number; credits_used: number; success_rate: number }>;
  daily_usage: Array<{ date: string; requests: number; credits: number }>;
}

interface SystemStatus {
  system_openai_status: 'available' | 'unavailable' | 'error';
  system_ollama_status: 'available' | 'unavailable' | 'error';
  system_openai_endpoint: string | null;
  system_ollama_endpoint: string | null;
  credit_costs: Record<string, number>;
}

const AISettings: React.FC = () => {
  const [settings, setSettings] = useState<AISettingsType | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStatsType | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const { addToast } = useToast();

  // React Query hooks
  const { data: settingsData, isLoading: settingsLoading } = useAISettings();
  const { data: usageData, isLoading: usageLoading } = useAIUsageStats(30);
  const { data: systemData, isLoading: systemLoading } = useAISystemStatus();
  const updateSettingsMutation = useUpdateAISettingsMutation();
  const testConnectionMutation = useTestAIConnectionMutation();

  useEffect(() => {
    if (settingsData?.settings) setSettings(settingsData.settings as AISettingsType);
  }, [settingsData]);

  useEffect(() => {
    if (usageData) setUsageStats(usageData as UsageStatsType);
  }, [usageData]);

  useEffect(() => {
    if (systemData) setSystemStatus(systemData as SystemStatusType);
  }, [systemData]);

  useEffect(() => {
    setLoading(settingsLoading || usageLoading || systemLoading);
  }, [settingsLoading, usageLoading, systemLoading]);

  const handleSettingsChange = (key: keyof AISettings, value: string | boolean) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({ settings: settings as AISettingsType });
      addToast('AI settings saved successfully', 'success');
    } catch {
      addToast('Error saving AI settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!settings) return;

    setTesting(true);
    try {
      const data = await testConnectionMutation.mutateAsync({ provider: settings.preferred_provider });
      if (data.success) {
        addToast(`Connection test successful! Provider: ${data.provider}, Model: ${data.model}, Response time: ${data.processing_time}s`, 'success');
      } else {
        addToast(data.error || 'Connection test failed', 'error');
      }
    } catch {
      addToast('Error testing connection', 'error');
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'providers', label: 'Providers', icon: Brain },
    { id: 'ollama', label: 'Ollama Models', icon: Server },
    { id: 'usage', label: 'Usage & Credits', icon: TrendingUp },
    { id: 'system', label: 'System Status', icon: Database },
  ];

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          AI Configuration
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure AI providers, manage API keys, and monitor your AI usage and credits.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-8 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-secondary-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                AI Features
              </h3>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.enable_categorization}
                    onChange={(e) => handleSettingsChange('enable_categorization', e.target.checked)}
                    className="rounded border-secondary-300 dark:border-secondary-600"
                  />
                  <span className="text-secondary-700 dark:text-secondary-300">
                    Smart Transaction Categorization
                  </span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.enable_transaction_parsing}
                    onChange={(e) => handleSettingsChange('enable_transaction_parsing', e.target.checked)}
                    className="rounded border-secondary-300 dark:border-secondary-600"
                  />
                  <span className="text-secondary-700 dark:text-secondary-300">
                    Natural Language Transaction Parsing
                  </span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.enable_receipt_ocr}
                    onChange={(e) => handleSettingsChange('enable_receipt_ocr', e.target.checked)}
                    className="rounded border-secondary-300 dark:border-secondary-600"
                  />
                  <span className="text-secondary-700 dark:text-secondary-300">
                    Receipt OCR Processing
                  </span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.enable_monthly_reports}
                    onChange={(e) => handleSettingsChange('enable_monthly_reports', e.target.checked)}
                    className="rounded border-secondary-300 dark:border-secondary-600"
                  />
                  <span className="text-secondary-700 dark:text-secondary-300">
                    AI-Generated Monthly Reports
                  </span>
                </label>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                AI Behavior
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Confidence Threshold ({(settings.confidence_threshold * 100).toFixed(0)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.confidence_threshold}
                    onChange={(e) => handleSettingsChange('confidence_threshold', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                    Minimum confidence level for AI suggestions
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Monthly Usage Limit
                  </label>
                  <Input
                    type="number"
                    value={settings.max_monthly_usage}
                    onChange={(e) => handleSettingsChange('max_monthly_usage', parseInt(e.target.value))}
                    placeholder="1000"
                  />
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                    Maximum AI operations per month
                  </p>
                </div>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.auto_approve_high_confidence}
                    onChange={(e) => handleSettingsChange('auto_approve_high_confidence', e.target.checked)}
                    className="rounded border-secondary-300 dark:border-secondary-600"
                  />
                  <span className="text-secondary-700 dark:text-secondary-300">
                    Auto-approve high confidence suggestions ({'>'}90%)
                  </span>
                </label>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'ollama' && (
        <OllamaManagement />
      )}

      {activeTab === 'providers' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                AI Provider
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Preferred Provider
                  </label>
                  <select
                    value={settings.preferred_provider}
                    onChange={(e) => handleSettingsChange('preferred_provider', e.target.value)}
                    className="w-full rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-secondary-900 dark:text-secondary-100"
                  >
                    <option value="system">System Default</option>
                    <option value="openai">OpenAI (Personal)</option>
                    <option value="ollama">Ollama (Self-hosted)</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {settings.preferred_provider === 'openai' && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                  OpenAI Configuration
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      API Key
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        type="password"
                        value={settings.openai_api_key}
                        onChange={(e) => handleSettingsChange('openai_api_key', e.target.value)}
                        placeholder="sk-..."
                        className="flex-1"
                      />
                      <Button
                        onClick={testConnection}
                        disabled={testing}
                        variant="ghost"
                        size="sm"
                      >
                        <TestTube2 className="h-4 w-4 mr-1" />
                        {testing ? 'Testing...' : 'Test'}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Model
                    </label>
                    <select
                      value={settings.openai_model}
                      onChange={(e) => handleSettingsChange('openai_model', e.target.value)}
                      className="w-full rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-secondary-900 dark:text-secondary-100"
                    >
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {settings.preferred_provider === 'ollama' && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                  Ollama Configuration
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Endpoint URL
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        type="url"
                        value={settings.ollama_endpoint}
                        onChange={(e) => handleSettingsChange('ollama_endpoint', e.target.value)}
                        placeholder="http://localhost:11434"
                        className="flex-1"
                      />
                      <Button
                        onClick={testConnection}
                        disabled={testing}
                        variant="ghost"
                        size="sm"
                      >
                        <TestTube2 className="h-4 w-4 mr-1" />
                        {testing ? 'Testing...' : 'Test'}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                      Model
                    </label>
                    <select
                      value={settings.ollama_model}
                      onChange={(e) => handleSettingsChange('ollama_model', e.target.value)}
                      className="w-full rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-secondary-900 dark:text-secondary-100"
                    >
                      <option value="llama2">Llama 2</option>
                      <option value="codellama">Code Llama</option>
                      <option value="mistral">Mistral 7B</option>
                      <option value="neural-chat">Neural Chat</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'usage' && usageStats && (
        <div className="space-y-6">
          {/* Credits Overview */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                Credits & Usage
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center">
                    <Zap className="h-8 w-8 text-blue-500 mb-2" />
                    <div className="ml-3">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {usageStats.credits_remaining}
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Credits Remaining</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-green-500 mb-2" />
                    <div className="ml-3">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {usageStats.total_requests}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">Total Requests</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-purple-500 mb-2" />
                    <div className="ml-3">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {usageStats.success_rate}%
                      </p>
                      <p className="text-sm text-purple-600 dark:text-purple-400">Success Rate</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <div className="flex items-center">
                    <Brain className="h-8 w-8 text-orange-500 mb-2" />
                    <div className="ml-3">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {usageStats.total_credits_used}
                      </p>
                      <p className="text-sm text-orange-600 dark:text-orange-400">Credits Used</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Usage by Provider */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                Usage by Provider
              </h3>
              
              <div className="space-y-3">
                {Object.entries(usageStats.provider_stats).map(([provider, stats]) => (
                  <div key={provider} className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                    <div>
                      <span className="font-medium text-secondary-900 dark:text-secondary-100 capitalize">
                        {provider}
                      </span>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">
                        {stats.requests} requests • {stats.success_rate.toFixed(1)}% success rate
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-secondary-900 dark:text-secondary-100">
                        {stats.credits} credits
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'system' && systemStatus && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                System AI Status
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(systemStatus.system_openai_status)}
                    <div>
                      <span className="font-medium text-secondary-900 dark:text-secondary-100">
                        System OpenAI
                      </span>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">
                        {systemStatus.system_openai_endpoint || 'Not configured'}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm capitalize text-secondary-600 dark:text-secondary-400">
                    {systemStatus.system_openai_status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(systemStatus.system_ollama_status)}
                    <div>
                      <span className="font-medium text-secondary-900 dark:text-secondary-100">
                        System Ollama
                      </span>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">
                        {systemStatus.system_ollama_endpoint || 'Not configured'}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm capitalize text-secondary-600 dark:text-secondary-400">
                    {systemStatus.system_ollama_status}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                Credit Costs
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(systemStatus.credit_costs).map(([operation, cost]) => (
                  <div key={operation} className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                    <span className="font-medium text-secondary-900 dark:text-secondary-100 capitalize">
                      {operation.replace('_', ' ')}
                    </span>
                    <span className="text-secondary-600 dark:text-secondary-400">
                      {cost} credit{cost !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-secondary-200 dark:border-secondary-700">
        <Button
          onClick={testConnection}
          disabled={testing || saving}
          variant="ghost"
        >
          <TestTube2 className="h-4 w-4 mr-2" />
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
        
        <Button
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default AISettings;