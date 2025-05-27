-- ===============================================================
-- SCRIPT COMPLETO PARA SISTEMA DE DOCUMENTACIÓN CON SUPABASE
-- Arquitectura: Proyectos → Pages (jerarquía infinita) → Versiones
-- ===============================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============== TABLAS PRINCIPALES ===============

-- Tabla de perfiles (extendiendo la tabla auth.users de Supabase)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  job_title TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de roles (roles pre-definidos en el sistema)
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asignación de roles a usuarios
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role_id)
);

-- Proyectos
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Asignación de usuarios a proyectos
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('viewer', 'editor', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

-- =============== NUEVO SISTEMA DE PAGES (UNIFICADO) ===============

-- Reemplaza tanto categories como documents con un sistema unificado
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content JSONB,
  description TEXT,
  icon TEXT, -- Emoji o icono
  is_published BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0, -- Para ordenar al mismo nivel
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (project_id, parent_page_id, slug),
  CONSTRAINT no_self_parent CHECK (id != parent_page_id)
);

-- =============== SISTEMA DE VERSIONADO DE PROYECTOS ===============

-- Versiones del proyecto completo (no por página individual)
CREATE TABLE project_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL, -- "3.7.0"
  version_name TEXT, -- "Winter Release", "Bug Fixes", etc.
  is_current BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_draft BOOLEAN DEFAULT true,
  release_notes TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (project_id, version_number)
);

-- Snapshot de páginas por versión (permite versionado completo del proyecto)
CREATE TABLE page_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_version_id UUID NOT NULL REFERENCES project_versions(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  content_snapshot JSONB, -- Snapshot del contenido en esta versión
  title_snapshot TEXT, -- Título en esta versión
  description_snapshot TEXT, -- Descripción en esta versión
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (project_version_id, page_id)
);

-- =============== TABLAS AUXILIARES ===============

-- Archivos adjuntos
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Comentarios en páginas
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enlaces entre páginas
CREATE TABLE page_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  target_page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  link_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (source_page_id, target_page_id)
);

-- Etiquetas para páginas
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (project_id, name)
);

-- Relación entre páginas y etiquetas
CREATE TABLE page_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (page_id, tag_id)
);

-- Tokens de acceso para compartir con usuarios externos
CREATE TABLE access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  project_version_id UUID REFERENCES project_versions(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT scoped_access_token CHECK (
    (project_id IS NOT NULL AND project_version_id IS NULL AND page_id IS NULL) OR
    (project_id IS NULL AND project_version_id IS NOT NULL AND page_id IS NULL) OR
    (project_id IS NULL AND project_version_id IS NULL AND page_id IS NOT NULL)
  )
);

-- Registro de actividad y auditoría
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL, -- 'page', 'project', 'project_version', etc.
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'publish', etc.
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Vistas de páginas (para análisis)
CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  project_version_id UUID REFERENCES project_versions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Preferencias de usuarios
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light',
  editor_autosave BOOLEAN DEFAULT TRUE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============== CONFIGURACIÓN DE PUBLICACIÓN ===============

-- Configuración de sitios públicos por proyecto
CREATE TABLE public_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E40AF',
  custom_css TEXT,
  navigation_style TEXT DEFAULT 'sidebar' CHECK (navigation_style IN ('sidebar', 'top', 'both')),
  show_search BOOLEAN DEFAULT true,
  show_breadcrumbs BOOLEAN DEFAULT true,
  footer_text TEXT,
  custom_domain TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (project_id)
);

-- =============== DATOS INICIALES ===============

-- Insertar roles predefinidos
INSERT INTO roles (name, description) VALUES
('admin', 'Administrador del sistema con acceso completo'),
('developer', 'Desarrollador que puede crear y editar documentación'),
('project_manager', 'Gestor de proyectos que puede administrar proyectos y asignar usuarios'),
('client', 'Cliente con acceso de solo lectura a documentación específica');

-- =============== FUNCIONES Y TRIGGERS ===============

-- Función para actualizar el campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER update_pages_updated_at
BEFORE UPDATE ON pages
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER update_public_sites_updated_at
BEFORE UPDATE ON public_sites
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at();

-- Función para registrar actividad
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (entity_type, entity_id, action, details, user_id)
  VALUES (
    TG_ARGV[0],
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)),
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para registrar actividad
CREATE TRIGGER log_page_activity
AFTER INSERT OR UPDATE OR DELETE ON pages
FOR EACH ROW
EXECUTE PROCEDURE log_activity('page');

CREATE TRIGGER log_project_activity
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW
EXECUTE PROCEDURE log_activity('project');

CREATE TRIGGER log_project_version_activity
AFTER INSERT OR UPDATE OR DELETE ON project_versions
FOR EACH ROW
EXECUTE PROCEDURE log_activity('project_version');

-- Función para crear versión inicial del proyecto
CREATE OR REPLACE FUNCTION create_initial_project_version()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_versions (project_id, version_number, version_name, is_current, is_draft, created_by)
  VALUES (NEW.id, '1.0.0', 'Initial Version', true, false, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear versión inicial
CREATE TRIGGER create_project_initial_version
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE PROCEDURE create_initial_project_version();

-- =============== FUNCIONES AUXILIARES PARA PERMISOS ===============

CREATE OR REPLACE FUNCTION is_project_member(project_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_id_param 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_project_admin(project_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_id_param 
    AND user_id = auth.uid() 
    AND permission_level = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id_param AND created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_project_editor_or_admin(project_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_id_param 
    AND user_id = auth.uid() 
    AND permission_level IN ('admin', 'editor')
  ) OR EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id_param AND created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_app_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============== ÍNDICES PARA BÚSQUEDA Y RENDIMIENTO ===============

-- Índices para búsqueda de páginas
CREATE INDEX pages_title_search ON pages USING GIN (to_tsvector('spanish', title));
CREATE INDEX pages_content_search ON pages USING GIN (to_tsvector('spanish', COALESCE(content::text, '')));
CREATE INDEX pages_project_id ON pages (project_id);
CREATE INDEX pages_parent_page_id ON pages (parent_page_id);
CREATE INDEX pages_hierarchy ON pages (project_id, parent_page_id, order_index);

-- Índices para versiones
CREATE INDEX project_versions_project_id ON project_versions (project_id);
CREATE INDEX project_versions_current ON project_versions (project_id, is_current);
CREATE INDEX page_versions_project_version_id ON page_versions (project_version_id);

-- Índices para miembros de proyecto
CREATE INDEX project_members_user_id ON project_members (user_id);
CREATE INDEX project_members_project_id ON project_members (project_id);

-- Índices para actividad y vistas
CREATE INDEX activity_logs_entity ON activity_logs (entity_type, entity_id);
CREATE INDEX page_views_page_id ON page_views (page_id);

-- =============== FUNCIONES PARA BÚSQUEDA Y NAVEGACIÓN ===============

-- Función para búsqueda de texto completo en páginas
CREATE OR REPLACE FUNCTION search_pages(
  search_term TEXT,
  project_id_param UUID DEFAULT NULL,
  project_version_id_param UUID DEFAULT NULL,
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  project_id UUID,
  project_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  rank FLOAT,
  path TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE page_paths AS (
    -- Páginas raíz
    SELECT 
      p.id,
      p.title,
      p.slug,
      p.project_id,
      p.parent_page_id,
      p.slug::TEXT as path,
      0 as level
    FROM pages p
    WHERE p.parent_page_id IS NULL
    
    UNION ALL
    
    -- Páginas hijas
    SELECT 
      p.id,
      p.title,
      p.slug,
      p.project_id,
      p.parent_page_id,
      pp.path || '/' || p.slug,
      pp.level + 1
    FROM pages p
    JOIN page_paths pp ON p.parent_page_id = pp.id
  )
  SELECT
    p.id,
    p.title,
    p.description,
    p.project_id,
    pr.name as project_name,
    p.updated_at,
    ts_rank(
      to_tsvector('spanish', p.title || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.content::text, '')), 
      to_tsquery('spanish', search_term)
    ) as rank,
    pp.path
  FROM
    pages p
    JOIN projects pr ON p.project_id = pr.id
    LEFT JOIN project_members pm ON p.project_id = pm.project_id
    LEFT JOIN page_paths pp ON p.id = pp.id
  WHERE
    (pr.is_public OR pm.user_id = auth.uid()) AND
    (project_id_param IS NULL OR p.project_id = project_id_param) AND
    (
      search_term IS NULL OR
      to_tsvector('spanish', p.title || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.content::text, '')) 
      @@ to_tsquery('spanish', search_term)
    )
  ORDER BY
    rank DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener árbol de páginas
CREATE OR REPLACE FUNCTION get_page_tree(
  project_id_param UUID,
  project_version_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  parent_page_id UUID,
  level INTEGER,
  path TEXT,
  order_index INTEGER,
  has_subpage_blocks BOOLEAN -- Si tiene bloques de subpáginas en el contenido
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE page_tree AS (
    -- Páginas raíz
    SELECT 
      p.id,
      p.title,
      p.slug,
      p.parent_page_id,
      0 as level,
      p.slug::TEXT as path,
      p.order_index,
      (p.content::text LIKE '%"type": "sub-page"%') as has_subpage_blocks
    FROM pages p
    WHERE p.project_id = project_id_param 
    AND p.parent_page_id IS NULL
    
    UNION ALL
    
    -- Páginas hijas
    SELECT 
      p.id,
      p.title,
      p.slug,
      p.parent_page_id,
      pt.level + 1,
      pt.path || '/' || p.slug,
      p.order_index,
      (p.content::text LIKE '%"type": "sub-page"%') as has_subpage_blocks
    FROM pages p
    JOIN page_tree pt ON p.parent_page_id = pt.id
    WHERE p.project_id = project_id_param
  )
  SELECT * FROM page_tree
  ORDER BY level, order_index, title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para extraer referencias a subpáginas del contenido Yoopta
CREATE OR REPLACE FUNCTION extract_subpage_references(content_jsonb JSONB)
RETURNS TABLE (
  referenced_page_id UUID,
  display_mode TEXT,
  order_in_content INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (block->'data'->>'page_id')::UUID AS referenced_page_id,
    COALESCE(block->'data'->>'display_mode', 'link') AS display_mode,
    COALESCE((block->'data'->>'order')::INTEGER, 0) AS order_in_content
  FROM
    jsonb_array_elements(content_jsonb->'blocks') AS block
  WHERE
    block->>'type' = 'sub-page'
    AND (block->'data'->>'page_id') IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- =============== HABILITAR ROW LEVEL SECURITY ===============

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_sites ENABLE ROW LEVEL SECURITY;

-- =============== POLÍTICAS DE SEGURIDAD RLS ===============

-- USER_PROFILES: Solo el propio usuario
CREATE POLICY "user_profiles_self_access" ON user_profiles
FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ROLES: Solo administradores
CREATE POLICY "roles_admin_only" ON roles
FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

-- USER_ROLES: Los usuarios pueden ver sus roles, admins gestionan todos
CREATE POLICY "user_roles_view_own" ON user_roles
FOR SELECT USING (user_id = auth.uid() OR is_app_admin());

CREATE POLICY "user_roles_admin_manage" ON user_roles
FOR INSERT WITH CHECK (is_app_admin());

CREATE POLICY "user_roles_admin_update" ON user_roles
FOR UPDATE USING (is_app_admin());

CREATE POLICY "user_roles_admin_delete" ON user_roles
FOR DELETE USING (is_app_admin());

-- PROJECTS: Públicos o miembros pueden ver, admins/creadores gestionan
CREATE POLICY "projects_view" ON projects
FOR SELECT USING (
  is_public OR is_project_member(id) OR is_app_admin()
);

CREATE POLICY "projects_create" ON projects
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "projects_update" ON projects
FOR UPDATE USING (
  created_by = auth.uid() OR is_project_admin(id) OR is_app_admin()
);

CREATE POLICY "projects_delete" ON projects
FOR DELETE USING (
  created_by = auth.uid() OR is_app_admin()
);

-- PROJECT_MEMBERS: Miembros ven miembros, creadores gestionan
CREATE POLICY "project_members_view" ON project_members
FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND created_by = auth.uid()) OR
  is_app_admin()
);

CREATE POLICY "project_members_manage" ON project_members
FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND created_by = auth.uid()) OR
  is_app_admin()
) WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND created_by = auth.uid()) OR
  is_app_admin()
);

-- PAGES: Miembros/público leen, editores/admins escriben
CREATE POLICY "pages_view" ON pages
FOR SELECT USING (
  is_project_member(project_id) OR
  EXISTS (SELECT 1 FROM projects WHERE id = pages.project_id AND is_public = true) OR
  is_app_admin()
);

CREATE POLICY "pages_create" ON pages
FOR INSERT WITH CHECK (
  is_project_editor_or_admin(project_id) OR is_app_admin()
);

CREATE POLICY "pages_update" ON pages
FOR UPDATE USING (
  is_project_editor_or_admin(project_id) OR is_app_admin()
);

CREATE POLICY "pages_delete" ON pages
FOR DELETE USING (
  is_project_admin(project_id) OR is_app_admin()
);

-- PROJECT_VERSIONS: Mismas reglas que projects
CREATE POLICY "project_versions_view" ON project_versions
FOR SELECT USING (
  is_project_member(project_id) OR
  EXISTS (SELECT 1 FROM projects WHERE id = project_versions.project_id AND is_public = true) OR
  is_app_admin()
);

CREATE POLICY "project_versions_manage" ON project_versions
FOR ALL USING (
  is_project_admin(project_id) OR is_app_admin()
) WITH CHECK (
  is_project_admin(project_id) OR is_app_admin()
);

-- PAGE_VERSIONS: Siguen las reglas de las páginas
CREATE POLICY "page_versions_view" ON page_versions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM project_versions pv 
    WHERE pv.id = page_versions.project_version_id 
    AND (
      is_project_member(pv.project_id) OR
      EXISTS (SELECT 1 FROM projects WHERE id = pv.project_id AND is_public = true)
    )
  ) OR is_app_admin()
);

CREATE POLICY "page_versions_manage" ON page_versions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM project_versions pv 
    WHERE pv.id = page_versions.project_version_id 
    AND is_project_admin(pv.project_id)
  ) OR is_app_admin()
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_versions pv 
    WHERE pv.id = page_versions.project_version_id 
    AND is_project_admin(pv.project_id)
  ) OR is_app_admin()
);

-- ATTACHMENTS: Siguen las reglas de las páginas
CREATE POLICY "attachments_view" ON attachments
FOR SELECT USING (
  is_project_member(project_id) OR
  EXISTS (SELECT 1 FROM projects WHERE id = attachments.project_id AND is_public = true) OR
  is_app_admin()
);

CREATE POLICY "attachments_manage" ON attachments
FOR ALL USING (
  is_project_editor_or_admin(project_id) OR 
  created_by = auth.uid() OR 
  is_app_admin()
) WITH CHECK (
  is_project_editor_or_admin(project_id) OR is_app_admin()
);

-- COMMENTS: Miembros comentan, autores/admins gestionan
CREATE POLICY "comments_view" ON comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pages p 
    WHERE p.id = comments.page_id 
    AND (
      is_project_member(p.project_id) OR
      EXISTS (SELECT 1 FROM projects WHERE id = p.project_id AND is_public = true)
    )
  ) OR is_app_admin()
);

CREATE POLICY "comments_create" ON comments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM pages p 
    WHERE p.id = comments.page_id 
    AND is_project_member(p.project_id)
  ) OR is_app_admin()
);

CREATE POLICY "comments_update" ON comments
FOR UPDATE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM pages p 
    WHERE p.id = comments.page_id 
    AND is_project_admin(p.project_id)
  ) OR is_app_admin()
);

CREATE POLICY "comments_delete" ON comments
FOR DELETE USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM pages p 
    WHERE p.id = comments.page_id 
    AND is_project_admin(p.project_id)
  ) OR is_app_admin()
);

-- Políticas similares para el resto de tablas...
-- PAGE_LINKS, TAGS, PAGE_TAGS, ACCESS_TOKENS, etc.
-- (Siguen el mismo patrón basado en permisos de proyecto)

-- ACCESS_TOKENS: Solo admins del proyecto
CREATE POLICY "access_tokens_manage" ON access_tokens
FOR ALL USING (
  created_by = auth.uid() OR
  (project_id IS NOT NULL AND is_project_admin(project_id)) OR
  (project_version_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM project_versions pv 
    WHERE pv.id = access_tokens.project_version_id 
    AND is_project_admin(pv.project_id)
  )) OR
  (page_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pages p 
    WHERE p.id = access_tokens.page_id 
    AND is_project_admin(p.project_id)
  )) OR
  is_app_admin()
) WITH CHECK (
  (project_id IS NOT NULL AND is_project_admin(project_id)) OR
  (project_version_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM project_versions pv 
    WHERE pv.id = access_tokens.project_version_id 
    AND is_project_admin(pv.project_id)
  )) OR
  (page_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pages p 
    WHERE p.id = access_tokens.page_id 
    AND is_project_admin(p.project_id)
  )) OR
  is_app_admin()
);

-- ACTIVITY_LOGS: Solo lectura para propios, admins ven todo
CREATE POLICY "activity_logs_view" ON activity_logs
FOR SELECT USING (
  user_id = auth.uid() OR is_app_admin()
);

CREATE POLICY "activity_logs_insert" ON activity_logs
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- No permitir actualización o eliminación excepto para admins
CREATE POLICY "activity_logs_admin_only" ON activity_logs
FOR UPDATE USING (is_app_admin());

CREATE POLICY "activity_logs_delete" ON activity_logs
FOR DELETE USING (is_app_admin());

-- PAGE_VIEWS: Inserción libre, lectura para admins
CREATE POLICY "page_views_insert" ON page_views
FOR INSERT WITH CHECK (true); -- Permitir vistas anónimas

CREATE POLICY "page_views_view" ON page_views
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM pages p 
    WHERE p.id = page_views.page_id 
    AND is_project_admin(p.project_id)
  ) OR
  is_app_admin()
);

-- USER_PREFERENCES: Solo el propio usuario
CREATE POLICY "user_preferences_self" ON user_preferences
FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- PUBLIC_SITES: Admins del proyecto
CREATE POLICY "public_sites_view" ON public_sites
FOR SELECT USING (
  is_project_member(project_id) OR
  EXISTS (SELECT 1 FROM projects WHERE id = public_sites.project_id AND is_public = true) OR
  is_app_admin()
);

CREATE POLICY "public_sites_manage" ON public_sites
FOR ALL USING (
  is_project_admin(project_id) OR is_app_admin()
) WITH CHECK (
  is_project_admin(project_id) OR is_app_admin()
);

-- PAGE_LINKS: Siguen las reglas de las páginas
CREATE POLICY "page_links_view" ON page_links
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pages p 
    WHERE p.id = page_links.source_page_id 
    AND (
      is_project_member(p.project_id) OR
      EXISTS (SELECT 1 FROM projects WHERE id = p.project_id AND is_public = true)
    )
  ) OR is_app_admin()
);

CREATE POLICY "page_links_manage" ON page_links
FOR ALL USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM pages p 
    WHERE p.id = page_links.source_page_id 
    AND is_project_editor_or_admin(p.project_id)
  ) OR is_app_admin()
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM pages p 
    WHERE p.id = page_links.source_page_id 
    AND is_project_editor_or_admin(p.project_id)
  ) OR is_app_admin()
);

-- TAGS: Miembros ven, editores/admins gestionan
CREATE POLICY "tags_view" ON tags
FOR SELECT USING (
  is_project_member(project_id) OR
  EXISTS (SELECT 1 FROM projects WHERE id = tags.project_id AND is_public = true) OR
  is_app_admin()
);

CREATE POLICY "tags_manage" ON tags
FOR ALL USING (
  is_project_editor_or_admin(project_id) OR is_app_admin()
) WITH CHECK (
  is_project_editor_or_admin(project_id) OR is_app_admin()
);

-- PAGE_TAGS: Siguen las reglas de las páginas
CREATE POLICY "page_tags_view" ON page_tags
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pages p 
    WHERE p.id = page_tags.page_id 
    AND (
      is_project_member(p.project_id) OR
      EXISTS (SELECT 1 FROM projects WHERE id = p.project_id AND is_public = true)
    )
  ) OR is_app_admin()
);

CREATE POLICY "page_tags_manage" ON page_tags
FOR ALL USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM pages p 
    WHERE p.id = page_tags.page_id 
    AND is_project_editor_or_admin(p.project_id)
  ) OR is_app_admin()
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM pages p 
    WHERE p.id = page_tags.page_id 
    AND is_project_editor_or_admin(p.project_id)
  ) OR is_app_admin()
);

-- =============== VISTAS OPTIMIZADAS ===============

-- Vista con detalles completos de páginas
CREATE OR REPLACE VIEW page_details AS
SELECT 
  p.*,
  pr.name AS project_name,
  pr.slug AS project_slug,
  pr.is_public AS project_is_public,
  parent.title AS parent_title,
  u_created.email AS created_by_email,
  up_created.first_name AS created_by_first_name,
  up_created.last_name AS created_by_last_name,
  u_updated.email AS updated_by_email,
  up_updated.first_name AS updated_by_first_name,
  up_updated.last_name AS updated_by_last_name,
  (SELECT COUNT(*) FROM pages children WHERE children.parent_page_id = p.id) AS children_count
FROM 
  pages p
LEFT JOIN projects pr ON p.project_id = pr.id
LEFT JOIN pages parent ON p.parent_page_id = parent.id
LEFT JOIN auth.users u_created ON p.created_by = u_created.id
LEFT JOIN user_profiles up_created ON u_created.id = up_created.id
LEFT JOIN auth.users u_updated ON p.updated_by = u_updated.id
LEFT JOIN user_profiles up_updated ON u_updated.id = up_updated.id;

-- Vista con detalles de versiones de proyecto
CREATE OR REPLACE VIEW project_version_details AS
SELECT 
  pv.*,
  p.name AS project_name,
  p.slug AS project_slug,
  u.email AS created_by_email,
  up.first_name AS created_by_first_name,
  up.last_name AS created_by_last_name,
  (SELECT COUNT(*) FROM page_versions WHERE project_version_id = pv.id) AS pages_count
FROM 
  project_versions pv
JOIN projects p ON pv.project_id = p.id
LEFT JOIN auth.users u ON pv.created_by = u.id
LEFT JOIN user_profiles up ON u.id = up.id;

-- Vista para estadísticas de proyecto
CREATE OR REPLACE VIEW project_stats AS
SELECT 
  p.id,
  p.name,
  p.slug,
  p.is_public,
  p.created_at,
  p.updated_at,
  COUNT(DISTINCT pm.user_id) AS members_count,
  COUNT(DISTINCT pg.id) AS pages_count,
  COUNT(DISTINCT pv.id) AS versions_count,
  COUNT(DISTINCT CASE WHEN pg.is_published THEN pg.id END) AS published_pages_count,
  MAX(pg.updated_at) AS last_page_update
FROM 
  projects p
LEFT JOIN project_members pm ON p.id = pm.project_id
LEFT JOIN pages pg ON p.id = pg.project_id
LEFT JOIN project_versions pv ON p.id = pv.project_id
GROUP BY p.id, p.name, p.slug, p.is_public, p.created_at, p.updated_at;

-- =============== FUNCIONES ADICIONALES PARA GESTIÓN DE PÁGINAS ===============

-- Función para mover página en la jerarquía
CREATE OR REPLACE FUNCTION move_page(
  page_id_param UUID,
  new_parent_id_param UUID DEFAULT NULL,
  new_order_index_param INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_project_id UUID;
  target_project_id UUID;
  max_order_index INTEGER;
BEGIN
  -- Verificar que la página existe y obtener el proyecto
  SELECT project_id INTO current_project_id 
  FROM pages 
  WHERE id = page_id_param;
  
  IF current_project_id IS NULL THEN
    RAISE EXCEPTION 'Página no encontrada';
  END IF;
  
  -- Verificar permisos
  IF NOT (is_project_editor_or_admin(current_project_id) OR is_app_admin()) THEN
    RAISE EXCEPTION 'Sin permisos para mover la página';
  END IF;
  
  -- Si hay nuevo padre, verificar que esté en el mismo proyecto
  IF new_parent_id_param IS NOT NULL THEN
    SELECT project_id INTO target_project_id 
    FROM pages 
    WHERE id = new_parent_id_param;
    
    IF target_project_id != current_project_id THEN
      RAISE EXCEPTION 'No se puede mover a un proyecto diferente';
    END IF;
    
    -- Verificar que no se cree un ciclo
    IF EXISTS (
      WITH RECURSIVE page_hierarchy AS (
        SELECT id, parent_page_id FROM pages WHERE id = page_id_param
        UNION ALL
        SELECT p.id, p.parent_page_id 
        FROM pages p 
        JOIN page_hierarchy ph ON p.id = ph.parent_page_id
      )
      SELECT 1 FROM page_hierarchy WHERE id = new_parent_id_param
    ) THEN
      RAISE EXCEPTION 'No se puede crear un ciclo en la jerarquía';
    END IF;
  END IF;
  
  -- Determinar el order_index si no se proporciona
  IF new_order_index_param IS NULL THEN
    SELECT COALESCE(MAX(order_index), -1) + 1 
    INTO max_order_index
    FROM pages 
    WHERE project_id = current_project_id 
    AND parent_page_id IS NOT DISTINCT FROM new_parent_id_param;
    
    new_order_index_param := max_order_index;
  END IF;
  
  -- Actualizar la página
  UPDATE pages 
  SET 
    parent_page_id = new_parent_id_param,
    order_index = new_order_index_param,
    updated_at = NOW()
  WHERE id = page_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para duplicar página
CREATE OR REPLACE FUNCTION duplicate_page(
  source_page_id UUID,
  new_title TEXT DEFAULT NULL,
  new_parent_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  source_page pages%ROWTYPE;
  new_page_id UUID;
  new_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Obtener la página fuente
  SELECT * INTO source_page FROM pages WHERE id = source_page_id;
  
  IF source_page.id IS NULL THEN
    RAISE EXCEPTION 'Página fuente no encontrada';
  END IF;
  
  -- Verificar permisos
  IF NOT (is_project_editor_or_admin(source_page.project_id) OR is_app_admin()) THEN
    RAISE EXCEPTION 'Sin permisos para duplicar la página';
  END IF;
  
  -- Generar nuevo título si no se proporciona
  IF new_title IS NULL THEN
    new_title := source_page.title || ' (Copia)';
  END IF;
  
  -- Generar slug único
  new_slug := LOWER(REGEXP_REPLACE(new_title, '[^a-zA-Z0-9\s]', '', 'g'));
  new_slug := REGEXP_REPLACE(new_slug, '\s+', '-', 'g');
  
  -- Asegurar que el slug sea único
  WHILE EXISTS (
    SELECT 1 FROM pages 
    WHERE project_id = source_page.project_id 
    AND parent_page_id IS NOT DISTINCT FROM COALESCE(new_parent_id, source_page.parent_page_id)
    AND slug = new_slug
  ) LOOP
    counter := counter + 1;
    new_slug := LOWER(REGEXP_REPLACE(new_title, '[^a-zA-Z0-9\s]', '', 'g'));
    new_slug := REGEXP_REPLACE(new_slug, '\s+', '-', 'g') || '-' || counter;
  END LOOP;
  
  -- Crear la nueva página
  INSERT INTO pages (
    project_id,
    parent_page_id,
    title,
    slug,
    content,
    description,
    icon,
    created_by
  ) VALUES (
    source_page.project_id,
    COALESCE(new_parent_id, source_page.parent_page_id),
    new_title,
    new_slug,
    source_page.content,
    source_page.description,
    source_page.icon,
    auth.uid()
  ) RETURNING id INTO new_page_id;
  
  RETURN new_page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear nueva versión del proyecto
CREATE OR REPLACE FUNCTION create_project_version(
  project_id_param UUID,
  version_number_param TEXT,
  version_name_param TEXT DEFAULT NULL,
  release_notes_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_version_id UUID;
  page_record RECORD;
BEGIN
  -- Verificar permisos
  IF NOT (is_project_admin(project_id_param) OR is_app_admin()) THEN
    RAISE EXCEPTION 'Sin permisos para crear versiones del proyecto';
  END IF;
  
  -- Verificar que no exista ya esta versión
  IF EXISTS (
    SELECT 1 FROM project_versions 
    WHERE project_id = project_id_param 
    AND version_number = version_number_param
  ) THEN
    RAISE EXCEPTION 'Ya existe una versión con ese número';
  END IF;
  
  -- Crear nueva versión
  INSERT INTO project_versions (
    project_id,
    version_number,
    version_name,
    release_notes,
    is_draft,
    created_by
  ) VALUES (
    project_id_param,
    version_number_param,
    version_name_param,
    release_notes_param,
    true,
    auth.uid()
  ) RETURNING id INTO new_version_id;
  
  -- Crear snapshots de todas las páginas actuales
  FOR page_record IN 
    SELECT id, title, description, content 
    FROM pages 
    WHERE project_id = project_id_param
  LOOP
    INSERT INTO page_versions (
      project_version_id,
      page_id,
      content_snapshot,
      title_snapshot,
      description_snapshot
    ) VALUES (
      new_version_id,
      page_record.id,
      page_record.content,
      page_record.title,
      page_record.description
    );
  END LOOP;
  
  RETURN new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para publicar versión del proyecto
CREATE OR REPLACE FUNCTION publish_project_version(
  version_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  version_record project_versions%ROWTYPE;
BEGIN
  -- Obtener la versión
  SELECT * INTO version_record FROM project_versions WHERE id = version_id_param;
  
  IF version_record.id IS NULL THEN
    RAISE EXCEPTION 'Versión no encontrada';
  END IF;
  
  -- Verificar permisos
  IF NOT (is_project_admin(version_record.project_id) OR is_app_admin()) THEN
    RAISE EXCEPTION 'Sin permisos para publicar la versión';
  END IF;
  
  -- Marcar todas las otras versiones como no actuales
  UPDATE project_versions 
  SET is_current = false 
  WHERE project_id = version_record.project_id;
  
  -- Publicar esta versión
  UPDATE project_versions 
  SET 
    is_current = true,
    is_draft = false,
    published_at = NOW()
  WHERE id = version_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============== SCRIPT DE MIGRACIÓN DESDE SISTEMA ANTERIOR ===============

-- Función para migrar datos del sistema categories/documents al nuevo sistema de pages
CREATE OR REPLACE FUNCTION migrate_to_pages_system()
RETURNS TEXT AS $$
DECLARE
  category_record RECORD;
  document_record RECORD;
  new_page_id UUID;
  migration_log TEXT := '';
BEGIN
  migration_log := 'Iniciando migración a sistema de pages...' || CHR(10);
  
  -- Solo ejecutar si existen las tablas antigas
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories') THEN
    migration_log := migration_log || 'Migrando categorías...' || CHR(10);
    
    -- Migrar categorías como páginas contenedoras
    FOR category_record IN 
      SELECT * FROM categories ORDER BY parent_id NULLS FIRST, order_index
    LOOP
      INSERT INTO pages (
        project_id,
        parent_page_id,
        title,
        slug,
        description,
        icon,
        order_index,
        is_published,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        category_record.project_id,
        (SELECT id FROM pages WHERE project_id = category_record.project_id AND title = (
          SELECT name FROM categories WHERE id = category_record.parent_id
        )),
        category_record.name,
        category_record.slug,
        category_record.description,
        category_record.icon,
        'container',
        category_record.order_index,
        true,
        category_record.created_by,
        category_record.created_at,
        category_record.updated_at
      ) RETURNING id INTO new_page_id;
      
      migration_log := migration_log || 'Migrado categoría: ' || category_record.name || ' -> ' || new_page_id || CHR(10);
    END LOOP;
  END IF;
  
  -- Migrar documentos como páginas de contenido
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    migration_log := migration_log || 'Migrando documentos...' || CHR(10);
    
    FOR document_record IN SELECT * FROM documents ORDER BY created_at LOOP
      INSERT INTO pages (
        project_id,
        parent_page_id,
        title,
        slug,
        content,
        description,
        is_published,
        created_by,
        updated_by,
        created_at,
        updated_at
      ) VALUES (
        document_record.project_id,
        (SELECT id FROM pages WHERE project_id = document_record.project_id AND title = (
          SELECT name FROM categories WHERE id = document_record.category_id
        )),
        document_record.title,
        document_record.slug,
        document_record.content,
        document_record.description,
        'content',
        document_record.is_published,
        document_record.created_by,
        document_record.updated_by,
        document_record.created_at,
        document_record.updated_at
      ) RETURNING id INTO new_page_id;
      
      migration_log := migration_log || 'Migrado documento: ' || document_record.title || ' -> ' || new_page_id || CHR(10);
    END LOOP;
  END IF;
  
  migration_log := migration_log || 'Migración completada.' || CHR(10);
  RETURN migration_log;
END;
$$ LANGUAGE plpgsql;

-- =============== COMENTARIOS FINALES ===============

/*
INSTRUCCIONES DE USO:

1. Ejecutar este script completo en Supabase SQL Editor
2. Ejecutar función de migración si vienes del sistema anterior:
   SELECT migrate_to_pages_system();
3. Crear un usuario admin inicial:
   INSERT INTO user_roles (user_id, role_id) 
   VALUES ('tu-user-id', (SELECT id FROM roles WHERE name = 'admin'));

CARACTERÍSTICAS PRINCIPALES:
- Sistema unificado de Pages (reemplaza categories + documents)
- Versionado a nivel de proyecto completo
- Jerarquía infinita de páginas
- URLs semánticas para sitios públicos
- Búsqueda full-text optimizada
- Sistema completo de permisos RLS
- Funciones para gestión avanzada de páginas
- Migración automática desde sistema anterior

PRÓXIMOS PASOS:
1. Actualizar tipos TypeScript
2. Crear nuevos servicios (pageService, versionService)
3. Implementar componentes UI (PageTree, VersionSelector)
4. Actualizar rutas públicas
*/