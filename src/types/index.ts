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
  project_permission_id: number,
  created_at: string;
  is_owner: boolean,
  permission_name: string,
  user?: {
    id: string;
    email: string;
    profile?: UserProfile;
  };
}


export interface Page {
  id: string;
  project_id: string;
  parent_page_id?: string;
  title: string;
  slug: string;
  content?: any; // Contenido Yoopta (puede ser null si es solo contenedor)
  description?: string;
  icon?: string; // Emoji o icono
  is_published: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  
  // Propiedades calculadas (no están en la DB, se agregan en runtime)
  children?: Page[]; // Sub-páginas
  path?: string; // Ruta completa: "/getting-started/installation"
  level?: number; // Nivel de anidación (0 = raíz)
  has_content?: boolean; // Si tiene contenido o es solo contenedor
  children_count?: number; // Número de páginas hijas
  
  // Información relacionada (desde JOINs)
  project?: {
    id: string;
    name: string;
    slug: string;
    is_public: boolean;
  };
  parent?: {
    id: string;
    title: string;
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
}

// =============== TIPOS PARA VERSIONADO DE PROYECTOS ===============

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: string; // "3.7.0"
  version_name?: string; // "Winter Release", "Bug Fixes", etc.
  is_current: boolean;
  is_archived: boolean;
  is_draft: boolean;
  release_notes?: string;
  published_at?: string;
  created_at: string;
  created_by: string;
  
  // Propiedades calculadas
  pages_count?: number;
  
  // Información relacionada
  project?: {
    id: string;
    name: string;
    slug: string;
  };
  created_by_user?: {
    email: string;
    user_profiles?: UserProfile[];
  };
}

export interface PageVersion {
  id: string;
  project_version_id: string;
  page_id: string;
  content_snapshot?: any; // Snapshot del contenido en esta versión
  title_snapshot: string; // Título en esta versión
  description_snapshot?: string; // Descripción en esta versión
  created_at: string;
  
  // Información relacionada
  project_version?: ProjectVersion;
  page?: {
    id: string;
    title: string;
    slug: string;
    project_id: string;
    parent_page_id: string;
    order_index: number;
  };
}

// =============== TIPOS PARA BÚSQUEDA ACTUALIZADA ===============

export interface PageSearchResult {
  id: string;
  title: string;
  description?: string;
  project_id: string;
  project_name: string;
  updated_at: string;
  rank: number;
  path: string; // Ruta completa de la página
  has_content: boolean;
}

// =============== TIPOS PARA PUBLICACIÓN Y SITIOS PÚBLICOS ===============

export interface PublicSite {
  id: string;
  project_id: string;
  site_name: string;
  description?: string;
  logo_url?: string;
  primary_color: string;
  secondary_color?: string;
  custom_css?: string;
  navigation_style: 'sidebar' | 'top' | 'both';
  show_search: boolean;
  show_breadcrumbs: boolean;
  footer_text?: string;
  custom_domain?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Información relacionada
  project?: Project;
}

export interface AccessToken {
  id: string;
  project_id?: string;
  project_version_id?: string;
  page_id?: string;
  token: string;
  name: string;
  expires_at?: string;
  created_at: string;
  created_by: string;
  last_used_at?: string;
  is_active: boolean;
  
  // Información relacionada
  project?: Project;
  project_version?: ProjectVersion;
  page?: Page;
}

// =============== TIPOS AUXILIARES ACTUALIZADOS ===============

// Archivos adjuntos (ahora vinculados a páginas en lugar de documentos)
export interface Attachment {
  id: string;
  page_id?: string;
  project_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  created_by: string;
  
  // Información relacionada
  page?: {
    id: string;
    title: string;
  };
}

// Comentarios (ahora en páginas en lugar de documentos)
export interface Comment {
  id: string;
  page_id: string;
  parent_id?: string;
  content: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  
  // Información relacionada
  page?: {
    id: string;
    title: string;
  };
  created_by_user?: {
    email: string;
    user_profiles?: UserProfile[];
  };
  replies?: Comment[];
}

// Enlaces entre páginas (actualizado)
export interface PageLink {
  id: string;
  source_page_id: string;
  target_page_id: string;
  link_text?: string;
  created_at: string;
  created_by: string;
  
  // Información relacionada
  source_page?: Page;
  target_page?: Page;
}

// Etiquetas para páginas
export interface Tag {
  id: string;
  project_id: string;
  name: string;
  color?: string;
  created_at: string;
  
  // Propiedades calculadas
  pages_count?: number;
}

export interface PageTag {
  id: string;
  page_id: string;
  tag_id: string;
  created_at: string;
  created_by: string;
  
  // Información relacionada
  tag?: Tag;
  page?: Page;
}

// Vistas de páginas (actualizado)
export interface PageView {
  id: string;
  page_id: string;
  project_version_id?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  created_at: string;
}

// =============== TIPOS PARA NAVEGACIÓN Y UI ===============

// Árbol de páginas para navegación
export interface PageTreeNode {
  id: string;
  title: string;
  description?: string;
  slug: string;
  icon?: string;
  has_content: boolean;
  is_published: boolean;
  order_index: number;
  level: number;
  path: string;
  children: PageTreeNode[];
  parent_id?: string;
}

// Breadcrumbs para navegación
export interface BreadcrumbItem {
  id: string;
  title: string;
  slug: string;
  path: string;
  level: number;
}

// Información de navegación completa
export interface NavigationContext {
  current_page: Page;
  breadcrumbs: BreadcrumbItem[];
  page_tree: PageTreeNode[];
  siblings: Page[];
  next_page?: Page;
  previous_page?: Page;
  project: Project;
  project_version?: ProjectVersion;
}

// =============== TIPOS PARA COMPONENTES Y PROPS ===============

// Props para el editor de páginas
export interface PageEditorProps {
  pageId?: string;
  projectId: string;
  parentPageId?: string;
  initialContent?: any;
  onSave?: (page: Page) => void;
  readOnly?: boolean;
}

// Props para el árbol de navegación
export interface PageTreeProps {
  projectId: string;
  projectVersionId?: string;
  selectedPageId?: string;
  onPageSelect?: (page: Page) => void;
  onPageMove?: (pageId: string, newParentId?: string, newIndex?: number) => void;
  onPageCreate?: (parentId?: string) => void;
  expandedNodes?: Set<string>;
  onToggleNode?: (nodeId: string) => void;
  enableDragAndDrop?: boolean;
  showCreateButtons?: boolean;
}

// Props para el selector de versión
export interface VersionSelectorProps {
  projectId: string;
  currentVersionId?: string;
  onVersionChange?: (version: ProjectVersion) => void;
  showDrafts?: boolean;
  showArchived?: boolean;
}

// Props para el visor público
export interface PublicPageViewerProps {
  projectSlug: string;
  versionNumber?: string;
  pagePath?: string;
  publicSite?: PublicSite;
}

// =============== TIPOS PARA SERVICIOS Y RESPUESTAS ===============

// Respuesta estándar de servicios
export interface ServiceResponse<T> {
  data: T | null;
  error: any;
}

// Opciones para crear página
export interface CreatePageOptions {
  title: string;
  slug?: string;
  content?: any;
  description?: string;
  icon?: string;
  parent_page_id?: string;
  order_index?: number;
  is_published?: boolean;
}

// Opciones para mover página
export interface MovePageOptions {
  new_parent_id?: string;
  new_order_index?: number;
}

// Opciones para duplicar página
export interface DuplicatePageOptions {
  new_title?: string;
  new_parent_id?: string;
  include_children?: boolean;
}

// Opciones para crear versión de proyecto
export interface CreateVersionOptions {
  version_number: string;
  version_name?: string;
  release_notes?: string;
  include_drafts?: boolean;
}

// Opciones para búsqueda de páginas
export interface SearchPagesOptions {
  query: string;
  project_id?: string;
  project_version_id?: string;
  only_published?: boolean;
  limit?: number;
  offset?: number;
}

// =============== TIPOS PARA AUTENTICACIÓN Y CONTEXTO ===============

// Contexto de autenticación actualizado
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
}

// Contexto de tema (se mantiene igual)
export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// =============== TIPOS PARA ESTADÍSTICAS Y ANALYTICS ===============

export interface ProjectStats {
  id: string;
  name: string;
  slug: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  members_count: number;
  pages_count: number;
  versions_count: number;
  published_pages_count: number;
  last_page_update?: string;
}

export interface PageStats {
  page_id: string;
  views_count: number;
  comments_count: number;
  links_count: number;
  children_count: number;
  last_viewed?: string;
  average_reading_time?: number;
}

export interface VersionStats {
  version_id: string;
  pages_count: number;
  published_pages_count: number;
  total_views: number;
  creation_date: string;
  publish_date?: string;
}

// =============== TIPOS PARA CONFIGURACIÓN Y PERSONALIZACIÓN ===============

export interface SiteTheme {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  link_color: string;
  border_color: string;
  sidebar_background: string;
  header_background: string;
  font_family: string;
  font_size: string;
  line_height: string;
}

export interface NavigationConfig {
  style: 'sidebar' | 'top' | 'both';
  show_search: boolean;
  show_breadcrumbs: boolean;
  show_version_selector: boolean;
  max_depth: number;
  auto_expand: boolean;
  sticky_navigation: boolean;
}

export interface SiteSettings {
  site_name: string;
  description?: string;
  logo_url?: string;
  favicon_url?: string;
  theme: SiteTheme;
  navigation: NavigationConfig;
  footer_text?: string;
  analytics_code?: string;
  custom_css?: string;
  custom_js?: string;
}

// =============== TIPOS PARA IMPORTACIÓN Y EXPORTACIÓN ===============

export interface ExportOptions {
  format: 'json' | 'markdown' | 'html' | 'pdf';
  include_versions: boolean;
  include_comments: boolean;
  include_attachments: boolean;
  version_id?: string;
  page_ids?: string[];
}

export interface ImportOptions {
  source_format: 'notion' | 'confluence' | 'gitbook' | 'docusaurus' | 'json';
  project_id: string;
  parent_page_id?: string;
  preserve_structure: boolean;
  import_attachments: boolean;
  create_version: boolean;
}

// =============== TIPOS PARA WEBHOOKS Y INTEGRACIONES ===============

export interface WebhookEvent {
  id: string;
  event_type: 'page.created' | 'page.updated' | 'page.deleted' | 'version.published' | 'project.created';
  project_id: string;
  entity_id: string;
  entity_type: 'page' | 'project' | 'version';
  payload: any;
  timestamp: string;
  user_id?: string;
}

export interface Integration {
  id: string;
  project_id: string;
  type: 'slack' | 'discord' | 'teams' | 'webhook' | 'github';
  name: string;
  config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============== TIPOS PARA PLANTILLAS ===============

export interface PageTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'documentation' | 'tutorial' | 'api' | 'changelog' | 'custom';
  content_template: any; // Estructura Yoopta
  variables?: Array<{
    name: string;
    type: 'text' | 'image' | 'link' | 'date';
    default_value?: string;
    required: boolean;
  }>;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

export interface TemplateVariable {
  name: string;
  value: string;
  type: 'text' | 'image' | 'link' | 'date';
}

// =============== TIPOS PARA COLABORACIÓN ===============

export interface CollaborationSession {
  id: string;
  page_id: string;
  user_id: string;
  cursor_position?: any;
  selection?: any;
  last_seen: string;
  is_editing: boolean;
}

export interface PageLock {
  id: string;
  page_id: string;
  locked_by: string;
  locked_at: string;
  expires_at: string;
  reason?: string;
}

// =============== TIPOS PARA NOTIFICACIONES ===============

export interface Notification {
  id: string;
  user_id: string;
  type: 'page_commented' | 'page_mentioned' | 'version_published' | 'permission_changed';
  title: string;
  message: string;
  entity_type: 'page' | 'project' | 'comment';
  entity_id: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

// =============== TIPOS LEGACY (PARA MIGRACIÓN) ===============

// Estos tipos se mantienen temporalmente para facilitar la migración
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
}

export interface Document {
  id: string;
  project_id: string;
  category_id: string;
  title: string;
  slug: string;
  description?: string;
  content?: any;
  version: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  content: any;
  version_number: string;
  commit_message?: string;
  created_at: string;
  created_by: string;
  is_published: boolean;
}

// =============== TIPOS UTILITARIOS ===============

// Tipo genérico para estado de carga
export interface LoadingState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Tipo para respuestas paginadas
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// Tipo para filtros de búsqueda
export interface SearchFilters {
  query?: string;
  project_ids?: string[];
  tags?: string[];
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
  is_published?: boolean;
}

// Tipo para ordenamiento
export interface SortOptions {
  field: 'title' | 'created_at' | 'updated_at' | 'order_index';
  direction: 'asc' | 'desc';
}

// =============== TIPOS PARA VALIDACIÓN ===============

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
}

