import React, { useState, useEffect } from 'react';
import { Crown, Check, Zap, Shield, Star, CreditCard } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { apiClient } from '../api/client';
import { useToast } from '../components/ui/Toast';

interface SubscriptionPlan {
  id: number;
  name: string;
  plan_type: string;
  price: string;
  ai_credits_per_month: number;
  max_transactions_per_month: number;
  max_accounts: number;
  features: Record<string, boolean>;
  is_active: boolean;
}

interface UserSubscription {
  id: number;
  plan: SubscriptionPlan;
  status: string;
  ai_credits_remaining: number;
  ai_credits_used_this_month: number;
  transactions_this_month: number;
}

export const SubscriptionPlans: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      // Try the API first, but fall back to mock data if it fails
      const response = await apiClient.get('/subscription-plans/');
      setPlans(response.data.results || response.data);
    } catch (error) {
      console.warn('API not available, using mock data:', error);
      // Mock subscription plans for demo purposes
      setPlans([
        {
          id: 1,
          name: 'Free',
          plan_type: 'free',
          price: '0',
          ai_credits_per_month: 10,
          max_transactions_per_month: 100,
          max_accounts: 1,
          features: { basic_reports: true },
          is_active: true
        },
        {
          id: 2,
          name: 'Basic',
          plan_type: 'basic',
          price: '9.99',
          ai_credits_per_month: 100,
          max_transactions_per_month: 1000,
          max_accounts: 3,
          features: { basic_reports: true, categorization: true },
          is_active: true
        },
        {
          id: 3,
          name: 'Premium',
          plan_type: 'premium',
          price: '19.99',
          ai_credits_per_month: 500,
          max_transactions_per_month: 10000,
          max_accounts: 10,
          features: { basic_reports: true, categorization: true, advanced_analytics: true, custom_ai: true },
          is_active: true
        },
        {
          id: 4,
          name: 'Enterprise',
          plan_type: 'enterprise',
          price: '49.99',
          ai_credits_per_month: 2000,
          max_transactions_per_month: 100000,
          max_accounts: 50,
          features: { basic_reports: true, categorization: true, advanced_analytics: true, custom_ai: true, priority_support: true },
          is_active: true
        }
      ]);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await apiClient.get('/subscriptions/current/');
      setCurrentSubscription(response.data);
    } catch (error) {
      console.warn('Failed to load current subscription, using default:', error);
      // Set a default free plan for demo
      setCurrentSubscription({
        id: 1,
        plan: {
          id: 1,
          name: 'Free',
          plan_type: 'free',
          price: '0',
          ai_credits_per_month: 10,
          max_transactions_per_month: 100,
          max_accounts: 1,
          features: { basic_reports: true },
          is_active: true
        },
        status: 'active',
        ai_credits_remaining: 8,
        ai_credits_used_this_month: 2,
        transactions_this_month: 45
      });
    } finally {
      setLoading(false);
    }
  };

  const upgradePlan = async (planType: string) => {
    setUpgrading(true);
    try {
      const response = await apiClient.post('/subscriptions/upgrade/', {
        plan_type: planType
      });
      setCurrentSubscription(response.data);
      showSuccess(`Successfully upgraded to ${response.data.plan.name}!`);
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to upgrade subscription');
    } finally {
      setUpgrading(false);
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'free': return <Zap className="w-6 h-6" />;
      case 'basic': return <Star className="w-6 h-6" />;
      case 'premium': return <Crown className="w-6 h-6" />;
      case 'enterprise': return <Shield className="w-6 h-6" />;
      default: return <CreditCard className="w-6 h-6" />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'free': return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
      case 'basic': return 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20';
      case 'premium': return 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20';
      case 'enterprise': return 'border-yellow-200 dark:border-yellow-700 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20';
      default: return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
    }
  };

  const isCurrentPlan = (planType: string) => {
    return currentSubscription?.plan?.plan_type === planType;
  };

  const canUpgrade = (planType: string) => {
    if (!currentSubscription) return true;
    const planOrder = ['free', 'basic', 'premium', 'enterprise'];
    const currentIndex = planOrder.indexOf(currentSubscription.plan.plan_type);
    const targetIndex = planOrder.indexOf(planType);
    return targetIndex > currentIndex;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Choose Your Plan</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Unlock the full potential of AI-powered finance management
        </p>
        
        {currentSubscription && (
          <div className="inline-flex items-center px-6 py-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 mb-8">
            <Check className="w-5 h-5 mr-2" />
            <span className="font-medium">
              Current Plan: {currentSubscription.plan.name}
              ({currentSubscription.ai_credits_remaining} AI credits remaining)
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl shadow-lg p-8 ${getPlanColor(plan.plan_type)} ${
              plan.plan_type === 'premium' ? 'ring-2 ring-purple-500 scale-105' : ''
            } transition-all duration-200 hover:shadow-xl`}
          >
            {plan.plan_type === 'premium' && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-center mb-6">
              <div className={`p-3 rounded-full ${
                plan.plan_type === 'free' ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
                plan.plan_type === 'basic' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300' :
                plan.plan_type === 'premium' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300' :
                'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-300'
              }`}>
                {getPlanIcon(plan.plan_type)}
              </div>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline justify-center">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  ${plan.price}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">/month</span>
              </div>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 dark:text-green-400 mr-3" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {plan.ai_credits_per_month} AI credits/month
                </span>
              </div>

              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 dark:text-green-400 mr-3" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Up to {plan.max_transactions_per_month.toLocaleString()} transactions/month
                </span>
              </div>

              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 dark:text-green-400 mr-3" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {plan.max_accounts} accounts maximum
                </span>
              </div>

              {Object.entries(plan.features).filter(([_, enabled]) => enabled).map(([feature, _]) => (
                <div key={feature} className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 dark:text-green-400 mr-3" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {feature.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
            
            <Button
              onClick={() => upgradePlan(plan.plan_type)}
              disabled={upgrading || isCurrentPlan(plan.plan_type) || !canUpgrade(plan.plan_type)}
              className="w-full"
              variant={isCurrentPlan(plan.plan_type) ? 'secondary' : (canUpgrade(plan.plan_type) ? (plan.plan_type === 'premium' ? 'info' : 'primary') : 'secondary')}
              size="lg"
            >
              {upgrading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Upgrading...
                </div>
              ) : isCurrentPlan(plan.plan_type) ? (
                'Current Plan'
              ) : canUpgrade(plan.plan_type) ? (
                plan.plan_type === 'free' ? 'Start Free Trial' : 'Upgrade Now'
              ) : (
                'Downgrade Not Available'
              )}
            </Button>
          </div>
        ))}
      </div>
      
      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Why Choose Our AI Finance Tracker?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI-Powered Insights</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Let AI categorize transactions, generate reports, and provide financial insights automatically.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Bank-Level Security</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Your financial data is protected with enterprise-grade encryption and security measures.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <Crown className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Premium Features</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Access advanced analytics, custom AI models, and premium support for your financial needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};