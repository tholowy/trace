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

// Páginas de pages (nuevo sistema)
import PageViewPage from './pages/pages/PageViewPage';
import PageNewPage from './pages/pages/PageNewPage';
import PageEditPage from './pages/pages/PageEditPage';

// Páginas de versiones (nuevo)
import VersionsPage from './pages/versions/VersionsPage';
import VersionDetailsPage from './pages/versions/VersionDetailsPage';
import VersionComparePage from './pages/versions/VersionComparePage';

// Páginas de publicación
import PublicationSettingsPage from './pages/publication/PublicationSettingsPage';
import SiteSettingsPage from './pages/publication/SiteSettingsPage';

// Páginas públicas actualizadas
import PublicHomePage from './pages/public/PublicHomePage';
import PublicProjectPage from './pages/public/PublicProjectPage';
import PublicPageView from './pages/public/PublicPageView.tsx';
import PublicVersionPage from './pages/public/PublicVersionPage';

// import DocumentVersionsPage from './pages/documents/DocumentVersionsPage';

// Otros
import ProfilePage from './pages/profile/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Auth Guard
import ProtectedRoute from './components/auth/ProtectedRoute';

const routes: RouteObject[] = [
  // =============== RUTAS DE AUTENTICACIÓN ===============
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
  
  // =============== RUTAS PÚBLICAS (SIN AUTENTICACIÓN) ===============
  {
    element: <PublicLayout />,
    children: [
      // Página principal de documentación
      {
        path: '/docs',
        element: <PublicHomePage />
      },
      
      // Acceso por token
      {
        path: '/public/project/:token',
        element: <PublicProjectPage />
      },
      {
        path: '/public/version/:token',
        element: <PublicVersionPage />
      },
      {
        path: '/public/page/:token',
        element: <PublicPageView />
      },
      
      // Rutas de proyectos públicos
      {
        path: '/docs/:projectSlug',
        element: <PublicProjectPage />
      },
      {
        path: '/docs/:projectSlug/:versionNumber',
        element: <PublicVersionPage />
      },
      {
        path: '/docs/:projectSlug/:versionNumber/*',
        element: <PublicPageView />
      }
    ]
  },
  
  // =============== RUTAS PROTEGIDAS PRINCIPALES ===============
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
  
  // =============== RUTAS DE PROYECTO (NUEVO SISTEMA) ===============
  {
    path: '/projects/:projectId',
    element: <ProtectedRoute><ProjectLayout /></ProtectedRoute>,
    children: [
      // Dashboard del proyecto
      {
        index: true,
        element: <ProjectDetailsPage />
      },
      
      // Gestión de páginas (nuevo sistema)
      {
        path: 'pages/new',
        element: <PageNewPage />
      },
      {
        path: 'pages/:pageId',
        element: <PageViewPage />
      },
      {
        path: 'pages/:pageId/edit',
        element: <PageEditPage />
      },
      // {
      //   path: 'categories/:categoryId/pages/new',
      //   element: <PageNewPage /> // Para compatibilidad temporal
      // },
      
      // Gestión de versiones (nuevo)
      {
        path: 'versions',
        element: <VersionsPage />
      },
      {
        path: 'versions/:versionId',
        element: <VersionDetailsPage />
      },
      {
        path: 'versions/:versionId/compare/:compareVersionId',
        element: <VersionComparePage />
      },
      
      // Configuración de publicación
      {
        path: 'publication',
        element: <PublicationSettingsPage />
      },
      {
        path: 'site-settings',
        element: <SiteSettingsPage />
      },
      
      // Gestión de proyecto
      {
        path: 'members',
        element: <ProjectMembersPage />
      },
      {
        path: 'settings',
        element: <ProjectSettingsPage />
      }
    ]
  },
  
  // // =============== RUTAS LEGACY (COMPATIBILIDAD TEMPORAL) ===============
  // {
  //   path: '/projects/:projectId/documents',
  //   element: <ProtectedRoute><ProjectLayout /></ProtectedRoute>,
  //   children: [
  //     // Redirects de documentos a páginas
  //     {
  //       path: 'new',
  //       element: <Navigate to="../pages/new" replace />
  //     },
  //     {
  //       path: ':documentId',
  //       element: <Navigate to="../pages/:documentId" replace />
  //     },
  //     {
  //       path: ':documentId/edit',
  //       element: <Navigate to="../pages/:documentId/edit" replace />
  //     },
  //     {
  //       path: ':documentId/versions',
  //       element: <DocumentVersionsPage /> // Mantener temporalmente
  //     }
  //   ]
  // },
  
  // // =============== REDIRECTS PARA COMPATIBILIDAD ===============
  
  // // Redirect de categorías a páginas
  // {
  //   path: '/projects/:projectId/categories/:categoryId/documents/new',
  //   element: <Navigate to="/projects/:projectId/pages/new?parentId=:categoryId" replace />
  // },
  
  // // Redirect de documentos individuales
  // {
  //   path: '/projects/:projectId/documents/:documentId',
  //   element: <Navigate to="/projects/:projectId/pages/:documentId" replace />
  // },
  
  // =============== RUTA DE 404 ===============
  {
    path: '*',
    element: <NotFoundPage />
  }
];

const router = createHashRouter(routes);

export default router;