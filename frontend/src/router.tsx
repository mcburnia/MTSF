import { createBrowserRouter } from 'react-router-dom';

import RootLayout from './layouts/RootLayout';
import PublicLayout from './layouts/PublicLayout';
import AuthenticatedLayout from './layouts/AuthenticatedLayout';
import AdminLayout from './layouts/AdminLayout';

import LoginPage from './pages/public/LoginPage';
import SignupPage from './pages/public/SignupPage';
import AcceptInvitePage from './pages/public/AcceptInvitePage';
import OrgSetupPage from './pages/setup/OrgSetupPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ItemsPage from './pages/items/ItemsPage';
import ItemDetailPage from './pages/items/ItemDetailPage';
import BillingPage from './pages/billing/BillingPage';
import SettingsPage from './pages/settings/SettingsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminOrgsPage from './pages/admin/AdminOrgsPage';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public routes
      {
        element: <PublicLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/signup', element: <SignupPage /> },
          { path: '/accept-invite', element: <AcceptInvitePage /> },
          { path: '/setup/org', element: <OrgSetupPage /> },
          { path: '/', element: <LoginPage /> },
        ],
      },

      // Authenticated routes
      {
        element: <AuthenticatedLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/items', element: <ItemsPage /> },
          { path: '/items/:id', element: <ItemDetailPage /> },
          { path: '/billing', element: <BillingPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/welcome', element: <DashboardPage /> },
        ],
      },

      // Admin routes
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin/dashboard', element: <AdminDashboardPage /> },
          { path: '/admin/users', element: <AdminUsersPage /> },
          { path: '/admin/orgs', element: <AdminOrgsPage /> },
          { path: '/admin/billing', element: <AdminOrgsPage /> },
        ],
      },
    ],
  },
]);
