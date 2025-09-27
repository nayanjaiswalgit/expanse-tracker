import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import { RouteError, ProtectedRoute } from './components';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Public pages
import ProLandingPage from './pages/ProLandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import { Login } from './features/auth/Login';
import { GoogleCallback } from './features/auth/GoogleCallback';
import OnboardingFlow from './features/auth/OnboardingFlow';

// Protected pages
import { Dashboard } from './features/dashboard/Dashboard';
import { TransactionTable } from './features/finance/TransactionTable';
import { AccountsManagement } from './features/finance/AccountsManagement';
import { Goals } from './features/finance/Goals';
import { GoalDetailPage } from './features/finance/GoalDetailPage';
import { LendingTracker } from './features/finance/LendingTracker';
import { GroupExpenses } from './features/finance/GroupExpenses';
import ExpenseTracker from './features/finance/ExpenseTracker';
import GmailCallback from './features/auth/GmailCallback';
import { Settings } from './features/settings/Settings';
import { BankStatementUploadWrapper } from './features/finance/BankStatementUploadWrapper';
import { TransactionSettings } from './features/finance/TransactionSettings';
import { StatementViewer } from './features/finance/StatementViewer';
import InvoiceOCR from './features/ai/InvoiceOCR';
import MonthlyAnalysis from './features/dashboard/MonthlyAnalysis';
import TelegramIntegration from './features/settings/TelegramIntegration';
import PlanCustomization from './pages/PlanCustomization';
import RecurringInvestments from './features/finance/RecurringInvestments';

// Layout
import { Layout } from './components/layout';

// Helper function to wrap components with error boundary
const withErrorBoundary = (Component: React.ComponentType) => (
  <ErrorBoundary>
    <Component />
  </ErrorBoundary>
);

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        errorElement: <RouteError />,
        children: [
            { index: true, element: <Navigate to="/landing" replace /> },
            { path: 'landing', element: <ProLandingPage /> },
            { path: 'privacy-policy', element: <PrivacyPolicy /> },
            { path: 'terms-of-service', element: <TermsOfService /> },
            { path: 'login', element: <Login /> },
            { path: 'google-callback', element: <GoogleCallback /> },
            {
                element: <ProtectedRoute />,
                children: [
                    { path: 'onboarding', element: <OnboardingFlow /> },
                    {
                        element: <Layout />,
                        children: [
                            { path: 'dashboard', element: withErrorBoundary(Dashboard) },
                            { path: 'transactions', element: withErrorBoundary(TransactionTable) },
                            { path: 'accounts', element: withErrorBoundary(AccountsManagement) },
                            { path: 'subscriptions', element: <Navigate to="/settings" replace /> },
                            { path: 'goals', element: withErrorBoundary(Goals) },
                            { path: 'goals/:goalId', element: withErrorBoundary(GoalDetailPage) },
                            { path: 'expenses', element: withErrorBoundary(ExpenseTracker) },
                            { path: 'lending', element: withErrorBoundary(LendingTracker) },
                            { path: 'group-expenses', element: withErrorBoundary(GroupExpenses) },
                            { path: 'gmail-callback', element: withErrorBoundary(GmailCallback) },
                            { path: 'analytics', element: <Navigate to="/dashboard" replace /> },
                            { path: 'settings/*', element: withErrorBoundary(Settings) },
                            { path: 'upload-history', element: withErrorBoundary(BankStatementUploadWrapper) },
                            { path: 'uploads', element: withErrorBoundary(BankStatementUploadWrapper) },
                            { path: 'profile', element: <Navigate to="/settings" replace /> },
                            { path: 'transaction-settings', element: withErrorBoundary(TransactionSettings) },
                            { path: 'statement-viewer', element: withErrorBoundary(StatementViewer) },
                            { path: 'invoice-ocr', element: withErrorBoundary(InvoiceOCR) },
                            { path: 'monthly-analysis', element: withErrorBoundary(MonthlyAnalysis) },
                            { path: 'telegram-integration', element: withErrorBoundary(TelegramIntegration) },
                            { path: 'plan-customization', element: withErrorBoundary(PlanCustomization) },
                            { path: 'recurring-investments', element: withErrorBoundary(RecurringInvestments) },
                            // Old routes redirects
                            { path: 'upload', element: <Navigate to="/accounts" replace /> },
                            { path: 'social', element: <Navigate to="/expenses" replace /> },
                            { path: 'invoices', element: <Navigate to="/accounts" replace /> },
                            { path: 'gmail', element: <Navigate to="/settings" replace /> },
                            { path: 'telegram', element: <Navigate to="/settings" replace /> },
                        ]
                    }
                ]
            },
            { path: '*' , element: <Navigate to="/landing" replace /> }
        ]
    }
]);

export default router;
