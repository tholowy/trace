import { createHashRouter, Navigate, type RouteObject } from 'react-router-dom';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';
import ProjectLayout from './components/layout/ProjectLayout';
import PublicLayout from './components/layout/PublicLayout';

// Páginas de autenticación
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Páginas principales
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectNewPage from './pages/projects/ProjectNewPage';
import ProjectEditPage from './pages/projects/ProjectEditPage';
import ProjectDetailsPage from './pages/projects/ProjectDetailsPage';
import ProjectMembersPage from './pages/projects/ProjectMembersPage';
import ProjectSettingsPage from './pages/projects/ProjectSettingsPage';

// Páginas de documentación
import DocumentNewPage from './pages/documents/DocumentNewPage';
import DocumentEditPage from './pages/documents/DocumentEditPage';
import DocumentViewPage from './pages/documents/DocumentViewPage';
import DocumentVersionsPage from './pages/documents/DocumentVersionsPage';

// Páginas públicas (simplificadas)
import PublicDocsPage from './pages/public/PublicDocsPage';
import PublicDocumentView from './components/public/PublicDocumentView';

// Otros
import ProfilePage from './pages/profile/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Auth Guard
import ProtectedRoute from './components/auth/ProtectedRoute';

const routes: RouteObject[] = [
  // Rutas de autenticación
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />
      },
      {
        path: '/register',
        element: <RegisterPage />
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />
      },
      {
        path: '/reset-password',
        element: <ResetPasswordPage />
      }
    ]
  },
  
  // Rutas públicas (SIN autenticación) - Simplificadas
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/docs',
        element: <PublicDocsPage />
      },
      {
        path: '/docs/:documentId',
        element: <PublicDocumentView />
      },
      {
        path: '/docs/token/:token',
        element: <PublicDocumentView />
      }
    ]
  },
  
  // Rutas protegidas (requieren autenticación)
  {
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: '/dashboard',
        element: <DashboardPage />
      },
      {
        path: '/projects',
        element: <ProjectsPage />
      },
      {
        path: '/projects/new',
        element: <ProjectNewPage />
      },
      {
        path: '/projects/:id/edit',
        element: <ProjectEditPage />
      },
      {
        path: '/profile',
        element: <ProfilePage />
      }
    ]
  },
  
  // Rutas de proyecto (requieren autenticación)
  {
    path: '/projects/:projectId',
    element: <ProtectedRoute><ProjectLayout /></ProtectedRoute>,
    children: [
      {
        index: true,
        element: <ProjectDetailsPage />
      },
      {
        path: 'members',
        element: <ProjectMembersPage />
      },
      {
        path: 'settings',
        element: <ProjectSettingsPage />
      },
      {
        path: 'documents/new',
        element: <DocumentNewPage />
      },
      {
        path: 'documents/:documentId',
        element: <DocumentViewPage />
      },
      {
        path: 'documents/:documentId/edit',
        element: <DocumentEditPage />
      },
      {
        path: 'documents/:documentId/versions',
        element: <DocumentVersionsPage />
      },
      {
        path: 'categories/:categoryId/documents/new',
        element: <DocumentNewPage />
      }
    ]
  },
  
  // Ruta de 404
  {
    path: '*',
    element: <NotFoundPage />
  }
];
const router = createHashRouter(routes);

export default router;