import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import { RouteError, ProtectedRoute } from './components';

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
import { LendingTracker } from './features/finance/LendingTracker';
import { GroupExpenses } from './features/finance/GroupExpenses';
import ExpenseTracker from './features/finance/ExpenseTracker';
import GmailCallback from './features/auth/GmailCallback';
import { Settings } from './features/settings/Settings';
import { UploadHistory } from './features/finance/UploadHistory';
import { TransactionSettings } from './features/finance/TransactionSettings';
import { StatementViewer } from './features/finance/StatementViewer';
import InvoiceOCR from './features/ai/InvoiceOCR';
import MonthlyAnalysis from './features/dashboard/MonthlyAnalysis';
import TelegramIntegration from './features/settings/TelegramIntegration';
import PlanCustomization from './pages/PlanCustomization';
import RecurringInvestments from './features/finance/RecurringInvestments';

// Layout
import { Layout } from './components/layout';

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
                            { path: 'dashboard', element: <Dashboard /> },
                            { path: 'transactions', element: <TransactionTable /> },
                            { path: 'accounts', element: <AccountsManagement /> },
                            { path: 'subscriptions', element: <Navigate to="/settings" replace /> },
                            { path: 'goals', element: <Goals /> },
                            { path: 'expenses', element: <ExpenseTracker /> },
                            { path: 'lending', element: <LendingTracker /> },
                            { path: 'group-expenses', element: <GroupExpenses /> },
                            { path: 'gmail-callback', element: <GmailCallback /> },
                            { path: 'analytics', element: <Navigate to="/dashboard" replace /> },
                            { path: 'settings/*', element: <Settings /> },
                            { path: 'upload-history', element: <UploadHistory /> },
                            { path: 'profile', element: <Navigate to="/settings" replace /> },
                            { path: 'transaction-settings', element: <TransactionSettings /> },
                            { path: 'statement-viewer', element: <StatementViewer /> },
                            { path: 'invoice-ocr', element: <InvoiceOCR /> },
                            { path: 'monthly-analysis', element: <MonthlyAnalysis /> },
                            { path: 'telegram-integration', element: <TelegramIntegration /> },
                            { path: 'plan-customization', element: <PlanCustomization /> },
                            { path: 'recurring-investments', element: <RecurringInvestments /> },
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
