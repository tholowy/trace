// Tipos globales para la aplicación

// Tipos para usuarios y autenticación
export interface User {
  id: string;
  email: string;
  role?: string;
}

export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  job_title?: string;
  company?: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: number;
  created_at: string;
}

// Tipos para proyectos
export interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
  logo_url?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_user?: {
    email: string;
    user_profiles?: UserProfile[];
  };
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  permission_level: 'viewer' | 'editor' | 'admin';
  created_at: string;
  user?: {
    id: string;
    email: string;
    profile?: UserProfile;
  };
}

// Tipos para categorías
export interface Category {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  slug: string;
  icon?: string;
  parent_id?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  parent?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
  document_count?: {
    count: number;
  };
}

// Tipos para documentos
export interface Document {
  id: string;
  project_id: string;
  category_id: string;
  title: string;
  slug: string;
  description?: string;
  content?: any; // Contenido del editor Yoopta
  version: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  category?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
    slug: string;
  };
  created_by_user?: {
    email: string;
    user_profiles?: UserProfile[];
  };
  updated_by_user?: {
    email: string;
    user_profiles?: UserProfile[];
  };
  author?: {
    name: string;
    email: string;
  }
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  content: any; // Contenido del editor Yoopta
  version_number: string;
  commit_message?: string;
  created_at: string;
  created_by: string;
  branch_name?: string;
  parent_version_id?: string;
  is_published: boolean;
  document?: {
    id: string;
    title: string;
    project_id: string;
    category_id: string;
  };
  created_by_user?: {
    email: string;
    user_profiles?: UserProfile[];
  };
}

// Tipos para archivos adjuntos
export interface Attachment {
  id: string;
  document_id?: string;
  project_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  created_by: string;
}

// Tipos para comentarios
export interface Comment {
  id: string;
  document_id: string;
  parent_id?: string;
  content: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

// Tipos para búsqueda
export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  category_id: string;
  category_name: string;
  project_id: string;
  project_name: string;
  updated_at: string;
  rank: number;
}

// Tipos para componentes
export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signup: (email: string, password: string, userData?: any) => Promise<{ data: any; error: any }>;
  logout: () => Promise<{ error: any }>;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<{ data: UserProfile | null; error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  getUserRoles: () => Promise<{ data: Role[] | null; error: any }>;
  refreshSession: () => Promise<{ success: boolean; error: any }>;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// Tipos de respuesta para servicios
export interface ServiceResponse<T> {
  data: T | null;
  error: any;
}
