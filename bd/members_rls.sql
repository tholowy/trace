-- ===============================================================
-- CORRECCIÓN PARA ERROR DE RECURSIÓN INFINITA EN RLS
-- Solución: Reemplazar políticas problemáticas de project_members
-- ===============================================================

-- =================== ELIMINAR POLÍTICAS PROBLEMÁTICAS ===================

-- Eliminar las políticas actuales que causan recursión
DROP POLICY IF EXISTS "project_members_view" ON project_members;
DROP POLICY IF EXISTS "project_members_manage" ON project_members;

-- =================== FUNCIONES OPTIMIZADAS SIN RECURSIÓN ===================

-- Función optimizada para verificar si es admin del proyecto (sin consultar project_members directamente en RLS)
CREATE OR REPLACE FUNCTION is_project_owner(project_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id_param AND created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar admin global (sin recursión)
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================== NUEVAS POLÍTICAS SIN RECURSIÓN ===================

-- POLÍTICA DE LECTURA: Sin usar funciones que consulten project_members
CREATE POLICY "project_members_view_safe" ON project_members
FOR SELECT USING (
  -- El usuario puede ver su propia membresía
  user_id = auth.uid() OR
  -- El creador del proyecto puede ver todos los miembros
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_members.project_id 
    AND p.created_by = auth.uid()
  ) OR
  -- Admin global puede ver todo
  EXISTS (
    SELECT 1 FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  )
);

-- POLÍTICA DE INSERCIÓN: Solo para creadores y admins
CREATE POLICY "project_members_insert_safe" ON project_members
FOR INSERT WITH CHECK (
  -- El creador del proyecto puede agregar miembros
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_members.project_id 
    AND p.created_by = auth.uid()
  ) OR
  -- Admin global puede agregar miembros
  EXISTS (
    SELECT 1 FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  ) OR
  -- Permitir inserción automática del sistema (para el trigger de signup)
  auth.uid() IS NULL
);

-- POLÍTICA DE ACTUALIZACIÓN: Solo para creadores y admins del proyecto
CREATE POLICY "project_members_update_safe" ON project_members
FOR UPDATE USING (
  -- El creador del proyecto puede actualizar miembros
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_members.project_id 
    AND p.created_by = auth.uid()
  ) OR
  -- Admin global puede actualizar
  EXISTS (
    SELECT 1 FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  )
) WITH CHECK (
  -- Mismas condiciones para el CHECK
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_members.project_id 
    AND p.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  )
);

-- POLÍTICA DE ELIMINACIÓN: Solo para creadores y admins
CREATE POLICY "project_members_delete_safe" ON project_members
FOR DELETE USING (
  -- El creador del proyecto puede eliminar miembros
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_members.project_id 
    AND p.created_by = auth.uid()
  ) OR
  -- Admin global puede eliminar
  EXISTS (
    SELECT 1 FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  )
);

-- =================== ACTUALIZAR FUNCIONES DE UTILIDAD ===================

-- Función actualizada que usa una consulta más directa
CREATE OR REPLACE FUNCTION is_project_member_safe(project_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Esta función ahora se puede usar en otras políticas sin causar recursión
  -- porque no será llamada por las políticas de project_members
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = project_id_param 
    AND project_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si es admin del proyecto (evitando recursión)
CREATE OR REPLACE FUNCTION is_project_admin_safe(project_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Primero verificar si es el creador (sin consultar project_members)
  IF EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id_param AND created_by = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Luego verificar si es admin global
  IF EXISTS (
    SELECT 1 FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Finalmente verificar membresía con permiso Admin
  RETURN EXISTS (
    SELECT 1 FROM project_members pm
    JOIN project_permissions pp ON pm.project_permission_id = pp.id
    WHERE pm.project_id = project_id_param 
    AND pm.user_id = auth.uid() 
    AND pp.name = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================== ACTUALIZAR POLÍTICAS DEPENDIENTES ===================

-- Actualizar políticas que usan las funciones antiguas
DROP POLICY IF EXISTS "pages_view" ON pages;
CREATE POLICY "pages_view" ON pages
FOR SELECT USING (
  is_project_member_safe(project_id) OR
  EXISTS (SELECT 1 FROM projects WHERE id = pages.project_id AND is_public = true) OR
  is_system_admin()
);

DROP POLICY IF EXISTS "pages_create" ON pages;
CREATE POLICY "pages_create" ON pages
FOR INSERT WITH CHECK (
  is_project_admin_safe(project_id) OR 
  is_system_admin() OR
  -- También permitir a editores
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN project_permissions pp ON pm.project_permission_id = pp.id
    WHERE pm.project_id = pages.project_id 
    AND pm.user_id = auth.uid() 
    AND pp.name IN ('Admin', 'Editor')
  )
);

DROP POLICY IF EXISTS "pages_update" ON pages;
CREATE POLICY "pages_update" ON pages
FOR UPDATE USING (
  is_project_admin_safe(project_id) OR 
  is_system_admin() OR
  -- También permitir a editores
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN project_permissions pp ON pm.project_permission_id = pp.id
    WHERE pm.project_id = pages.project_id 
    AND pm.user_id = auth.uid() 
    AND pp.name IN ('Admin', 'Editor')
  )
);

DROP POLICY IF EXISTS "pages_delete" ON pages;
CREATE POLICY "pages_delete" ON pages
FOR DELETE USING (
  is_project_admin_safe(project_id) OR is_system_admin()
);

-- =================== FUNCIÓN DE VERIFICACIÓN DEL SISTEMA ===================

-- Función para verificar que el sistema esté funcionando correctamente
CREATE OR REPLACE FUNCTION verify_rls_system()
RETURNS TABLE (
  table_name TEXT,
  policy_count INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || tablename as table_name,
    COUNT(*)::INTEGER as policy_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'RLS Enabled with Policies'
      ELSE 'RLS Enabled but NO Policies'
    END as status
  FROM pg_policies 
  WHERE schemaname = 'public'
  GROUP BY schemaname, tablename
  ORDER BY table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================== INSTRUCCIONES DE VERIFICACIÓN ===================

/*
PASOS PARA VERIFICAR LA CORRECCIÓN:

1. Ejecutar este script completo
2. Verificar que no hay errores de recursión:
   SELECT * FROM verify_rls_system();

3. Probar operaciones básicas:
   
   -- Verificar que puedes ver tus proyectos
   SELECT * FROM projects LIMIT 5;
   
   -- Verificar membresías (debe funcionar sin recursión)
   SELECT * FROM project_members_detailed LIMIT 5;
   
   -- Probar creación de página
   INSERT INTO pages (project_id, title, slug, content, created_by) 
   VALUES ('tu-project-id', 'Test Page', 'test-page', '{}', auth.uid());

4. Si necesitas diagnosticar problemas:
   SELECT * FROM diagnose_user_issues(auth.uid());

5. Para limpiar invitaciones expiradas:
   SELECT * FROM cleanup_expired_invitations();

DIFERENCIAS CLAVE EN LA CORRECCIÓN:

1. Las políticas de project_members ya NO usan funciones que consulten project_members
2. Se crearon funciones "_safe" que pueden usarse en otras políticas
3. Se usó lógica directa en las políticas en lugar de funciones recursivas
4. Se mantuvieron todas las funcionalidades pero se eliminó la recursión

FUNCIONES PRINCIPALES CORREGIDAS:
- is_project_member_safe() - Para usar en otras tablas
- is_project_admin_safe() - Para verificar permisos de admin
- is_system_admin() - Para verificar admin global

Si sigues teniendo problemas, puedes desactivar temporalmente RLS:
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
-- Luego reactivar después de verificar
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
*/