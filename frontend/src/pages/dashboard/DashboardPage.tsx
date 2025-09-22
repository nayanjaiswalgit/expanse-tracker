import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { User } from '../../types';

const DashboardPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [usageStats, setUsageStats] = useState<any>(null); // TODO: Define a proper type for usageStats
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current user data
        const currentUser = await apiClient.getCurrentUser();
        setUser(currentUser);

        // Fetch AI usage statistics
        const stats = await apiClient.getAIUsageStats(); // Assuming this method exists in apiClient
        setUsageStats(stats);

      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="container mx-auto p-4">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {user && (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Welcome, {user.full_name || user.email}!</h2>
          <p className="mb-2">Email: {user.email}</p>
          <p className="mb-2">Current Plan: {user.current_plan || 'Free Tier'}</p>
          <p className="mb-2">Subscription Status: {user.subscription_status || 'N/A'}</p>
          <p className="mb-2">AI Credits Remaining: {user.ai_credits_remaining !== undefined ? user.ai_credits_remaining : 'N/A'}</p>
        </div>
      )}

      {usageStats && (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">AI Usage Statistics (Last {usageStats.period_days} Days)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded">
              <h3 className="text-lg font-medium">Total Requests</h3>
              <p className="text-xl">{usageStats.total_requests}</p>
            </div>
            <div className="p-4 border rounded">
              <h3 className="text-lg font-medium">Successful Requests</h3>
              <p className="text-xl">{usageStats.successful_requests} ({usageStats.success_rate}%)</p>
            </div>
            <div className="p-4 border rounded">
              <h3 className="text-lg font-medium">Total Credits Used</h3>
              <p className="text-xl">{usageStats.total_credits_used}</p>
            </div>
            <div className="p-4 border rounded">
              <h3 className="text-lg font-medium">Total Tokens Used</h3>
              <p className="text-xl">{usageStats.total_tokens_used}</p>
            </div>
            <div className="p-4 border rounded">
              <h3 className="text-lg font-medium">Avg. Processing Time</h3>
              <p className="text-xl">{usageStats.avg_processing_time}s</p>
            </div>
          </div>
          {/* You can add more detailed charts/tables for provider_stats, operation_stats, daily_usage here */}
        </div>
      )}

      {!user && !loading && !error && (
        <p>Please log in to view your dashboard.</p>
      )}
    </div>
  );
};

export default DashboardPage;