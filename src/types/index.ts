// ===============================================================
// TIPOS TYPESCRIPT COMPLETOS Y ORGANIZADOS
// Sistema simplificado de páginas con subpáginas como bloques Yoopta
// ===============================================================

// =============== TIPOS BASE DE USUARIOS Y AUTENTICACIÓN ===============

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

// =============== TIPOS BASE DE PROYECTOS ===============

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
  
  // Información relacionada (opcional)
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
  
  // Información relacionada (opcional)
  user?: {
    id: string;
    email: string;
    profile?: UserProfile;
  };
}

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

// =============== TIPOS PARA CONTENIDO YOOPTA ===============

export interface YooptaContent {
  blocks: Record<string, YooptaBlock>;
  version?: string;
}

export interface YooptaBlock {
  type: string;
  data: any;
  meta?: {
    order: number;
    depth?: number;
  };
}

// Bloque especial para subpáginas
export interface SubPageBlock extends YooptaBlock {
  type: 'sub-page';
  data: {
    page_id: string;
    title: string;
    preview?: string;
    display_mode: SubPageDisplayMode;
    order: number;
    icon?: string;
    description?: string;
  };
}

export type SubPageDisplayMode = 'inline' | 'embedded' | 'link';

// Props para el componente de bloque subpágina
export interface SubPageBlockProps {
  block: SubPageBlock;
  editor: any;
  readOnly?: boolean;
  onPageSelect?: (pageId: string) => void;
  onEditPage?: (pageId: string) => void;
}

// Configuración del plugin de subpáginas
export interface SubPagePluginConfig {
  projectId: string;
  onPageCreate?: (parentId: string) => Promise<Page>;
  onPageSelect?: (page: Page) => void;
  allowedDisplayModes?: SubPageDisplayMode[];
  maxDepth?: number;
}

// =============== TIPOS PRINCIPALES DE PÁGINAS ===============

export interface Page {
  id: string;
  project_id: string;
  parent_page_id?: string;
  title: string;
  slug: string;
  content?: YooptaContent | null;
  description?: string;
  icon?: string;
  is_published: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  
  // Propiedades calculadas (no están en DB)
  children?: Page[];
  path?: string;
  level?: number;
  has_subpage_blocks?: boolean;
  
  // Información relacionada (opcional)
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

export interface PageTreeNode {
  id: string;
  title: string;
  slug: string;
  icon?: string;
  is_published: boolean;
  order_index: number;
  level: number;
  path: string;
  parent_id?: string;
  has_subpage_blocks: boolean;
  children: PageTreeNode[];
  content_children?: PageReference[];
}

export interface PageReference {
  page_id: string;
  title: string;
  display_mode: SubPageDisplayMode;
  order_in_content: number;
  preview?: string;
}

export interface ExtractedSubPageReference {
  block_id: string;
  page_id: string;
  title: string;
  display_mode: SubPageDisplayMode;
  order: number;
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

// =============== TIPOS PARA VERSIONADO ===============

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: string; // "3.7.0"
  version_name?: string; // "Winter Release"
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
  content_snapshot?: any;
  title_snapshot: string;
  description_snapshot?: string;
  created_at: string;
  
  // Información relacionada
  project_version?: ProjectVersion;
  page?: {
    id: string;
    title: string;
    slug: string;
    project_id: string;
  };
}

export interface VersionStats {
  version_id: string;
  pages_count: number;
  published_pages_count: number;
  total_views: number;
  creation_date: string;
  publish_date?: string;
}

// =============== TIPOS PARA NAVEGACIÓN ===============

export interface BreadcrumbItem {
  id: string;
  title: string;
  slug: string;
  path: string;
  level: number;
}

export interface NavigationContext {
  current_page: Page;
  breadcrumbs: BreadcrumbItem[];
  tree_children: Page[];
  content_children: PageReference[];
  siblings: Page[];
  next_page?: Page;
  previous_page?: Page;
  project: Project;
  version?: ProjectVersion;
}

// =============== TIPOS PARA BÚSQUEDA ===============

export interface PageSearchResult {
  id: string;
  title: string;
  description?: string;
  project_id: string;
  project_name: string;
  updated_at: string;
  rank: number;
  path: string;
  has_content: boolean;
}

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

export interface SortOptions {
  field: 'title' | 'created_at' | 'updated_at' | 'order_index';
  direction: 'asc' | 'desc';
}

// =============== TIPOS PARA PUBLICACIÓN ===============

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

// =============== TIPOS AUXILIARES ===============

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

// =============== TIPOS PARA SERVICIOS ===============

export interface ServiceResponse<T> {
  data: T | null;
  error: any;
}

export interface LoadingState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// =============== TIPOS PARA OPCIONES DE SERVICIOS ===============

export interface CreatePageOptions {
  title: string;
  slug?: string;
  content?: YooptaContent | null;
  description?: string;
  icon?: string;
  parent_page_id?: string;
  order_index?: number;
  is_published?: boolean;
}

export interface MovePageOptions {
  new_parent_id?: string;
  new_order_index?: number;
}

export interface DuplicatePageOptions {
  new_title?: string;
  new_parent_id?: string;
  include_children?: boolean;
}

export interface SearchPagesOptions {
  query: string;
  project_id?: string;
  only_published?: boolean;
  limit?: number;
  offset?: number;
}

export interface AddSubPageBlockOptions {
  parent_page_id: string;
  child_page_id: string;
  display_mode: SubPageDisplayMode;
  order_in_content: number;
  insert_after_block?: string;
}

export interface CreateVersionOptions {
  version_number: string;
  version_name?: string;
  release_notes?: string;
  include_drafts?: boolean;
}

// =============== TIPOS PARA OPERACIONES DE CONTENIDO ===============

export interface ContentOperations {
  extractSubPageReferences: (content: YooptaContent | null) => ExtractedSubPageReference[];
  addSubPageBlock: (content: YooptaContent, options: AddSubPageBlockOptions) => YooptaContent;
  removeSubPageBlock: (content: YooptaContent, blockId: string) => YooptaContent;
  updateSubPageBlock: (content: YooptaContent, blockId: string, updates: Partial<SubPageBlock['data']>) => YooptaContent;
  reorderSubPageBlocks: (content: YooptaContent, blockOrders: Array<{blockId: string, order: number}>) => YooptaContent;
}

export interface CircularReferenceCheck {
  isCircular: boolean;
  path: string[];
  conflictingPageId?: string;
}

export interface DepthCalculation {
  maxDepth: number;
  deepestPath: string[];
  pageCount: number;
}

// =============== TIPOS PARA PROPS DE COMPONENTES ===============

export interface PageEditorProps {
  pageId?: string;
  projectId: string;
  parentPageId?: string;
  initialContent?: YooptaContent;
  onSave?: (page: Page) => void;
  readOnly?: boolean;
}

export interface PageTreeProps {
  projectId: string;
  selectedPageId?: string;
  onPageSelect?: (page: Page) => void;
  onPageMove?: (pageId: string, newParentId?: string, newIndex?: number) => void;
  onPageCreate?: (parentId?: string) => void;
  expandedNodes?: Set<string>;
  onToggleNode?: (nodeId: string) => void;
  enableDragAndDrop?: boolean;
  showCreateButtons?: boolean;
}

export interface VersionSelectorProps {
  projectId: string;
  currentVersionId?: string;
  onVersionChange?: (version: ProjectVersion) => void;
  showDrafts?: boolean;
  showArchived?: boolean;
}

export interface PublicPageViewerProps {
  projectSlug: string;
  versionNumber?: string;
  pagePath?: string;
  publicSite?: PublicSite;
}

export interface PageSelectorProps {
  projectId: string;
  excludePageIds?: string[];
  onPageSelect: (page: Page) => void;
  allowCreateNew?: boolean;
  maxDepth?: number;
}

export interface PagePreviewProps {
  pageId: string;
  displayMode: SubPageDisplayMode;
  compact?: boolean;
  showActions?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
}

// =============== TIPOS PARA ESTADO DE COMPONENTES ===============

export interface PageEditorState {
  currentPage: Page;
  contentPages: PageReference[];
  availablePages: Page[];
  isCreatingSubPage: boolean;
  selectedSubPageBlock?: string;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// =============== TIPOS PARA IMPORTACIÓN/EXPORTACIÓN ===============

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

// =============== TIPOS PARA INTEGRACIONES ===============

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
  content_template: YooptaContent;
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

// =============== TIPOS LEGACY (PARA MIGRACIÓN) ===============

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

export interface LegacyMigrationMap {
  categories_to_pages: Array<{
    old_category_id: string;
    new_page_id: string;
    content_includes_children: boolean;
  }>;
  documents_to_pages: Array<{
    old_document_id: string;
    new_page_id: string;
    parent_page_id?: string;
    referenced_in_parent?: boolean;
  }>;
}

// =============== TIPOS PARA SUPABASE DATABASE ===============

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Project, 'id' | 'created_at'>>;
      };
      pages: {
        Row: Page;
        Insert: Omit<Page, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Page, 'id' | 'created_at'>>;
      };
      project_versions: {
        Row: ProjectVersion;
        Insert: Omit<ProjectVersion, 'id' | 'created_at'>;
        Update: Partial<Omit<ProjectVersion, 'id' | 'created_at'>>;
      };
      page_versions: {
        Row: PageVersion;
        Insert: Omit<PageVersion, 'id' | 'created_at'>;
        Update: Partial<Omit<PageVersion, 'id' | 'created_at'>>;
      };
      public_sites: {
        Row: PublicSite;
        Insert: Omit<PublicSite, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PublicSite, 'id' | 'created_at'>>;
      };
      // Agregar más tablas según sea necesario
    };
    Views: {
      [key: string]: any;
    };
    Functions: {
      get_page_tree_simple: {
        Args: {
          project_id_param: string;
          project_version_id_param?: string;
        };
        Returns: PageTreeNode[];
      };
      search_pages: {
        Args: {
          search_term: string;
          project_id_param?: string;
          only_published_param?: boolean;
          limit_param?: number;
          offset_param?: number;
        };
        Returns: PageSearchResult[];
      };
    };
  };
}

// =============== EJEMPLO DE USO COMPLETO ===============

export const ExampleYooptaContent: YooptaContent = {
  blocks: {
    "intro-paragraph": {
      type: "paragraph",
      data: { text: "Esta es la introducción de nuestra documentación." },
      meta: { order: 0 }
    },
    "getting-started-subpage": {
      type: "sub-page",
      data: {
        page_id: "uuid-getting-started",
        title: "Guía de Inicio Rápido",
        preview: "Aprende los conceptos básicos en 5 minutos...",
        display_mode: "embedded" as SubPageDisplayMode,
        order: 1,
        icon: "🚀",
        description: "Todo lo que necesitas para empezar"
      },
      meta: { order: 1 }
    },
    "middle-content": {
      type: "paragraph",
      data: { text: "Aquí va contenido adicional entre subpáginas." },
      meta: { order: 2 }
    },
    "advanced-topics-subpage": {
      type: "sub-page", 
      data: {
        page_id: "uuid-advanced-topics",
        title: "Temas Avanzados",
        preview: "Configuración avanzada y casos de uso...",
        display_mode: "link" as SubPageDisplayMode,
        order: 3,
        icon: "⚙️",
        description: "Para usuarios experimentados"
      },
      meta: { order: 3 }
    }
  },
  version: "1.0.0"
};

// =============== EXPORTS PRINCIPALES ===============

// // Re-exportar tipos más utilizados para fácil importación
// export type {
//   // Tipos core
//   Page,
//   Project,
//   User,
  
//   // Tipos de contenido
//   YooptaContent,
//   SubPageBlock,
//   SubPageDisplayMode,
  
//   // Tipos de servicios
//   ServiceResponse,
//   CreatePageOptions,
//   SearchPagesOptions,
  
//   // Tipos de componentes
//   PageTreeProps,
//   PageEditorProps,
//   SubPageBlockProps,
  
//   // Tipos de navegación
//   PageTreeNode,
//   NavigationContext,
//   BreadcrumbItem,
  
//   // Tipos de versionado
//   ProjectVersion,
//   PageVersion,
  
//   // Tipos de publicación
//   PublicSite,
//   AccessToken,
  
//   // Tipos auxiliares
//   LoadingState,
//   PaginatedResponse,
//   ValidationResult
// };