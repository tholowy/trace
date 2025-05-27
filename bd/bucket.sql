-- Crear bucket (si no lo hiciste desde la UI)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentation-images',
  'documentation-images', 
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para objetos del bucket
CREATE POLICY "Public can view documentation images" ON storage.objects
FOR SELECT USING (bucket_id = 'documentation-images');

CREATE POLICY "Authenticated users can upload documentation images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documentation-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own documentation images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documentation-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own documentation images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documentation-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Tabla de metadatos de imágenes
CREATE TABLE IF NOT EXISTS image_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(storage_path)
);

CREATE INDEX IF NOT EXISTS image_metadata_project_id ON image_metadata(project_id);
CREATE INDEX IF NOT EXISTS image_metadata_page_id ON image_metadata(page_id);
CREATE INDEX IF NOT EXISTS image_metadata_created_by ON image_metadata(created_by);

ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view images from accessible projects" ON image_metadata
FOR SELECT USING (
  is_public = true OR
  is_project_member(project_id) OR
  EXISTS (SELECT 1 FROM projects WHERE id = image_metadata.project_id AND is_public = true)
);

CREATE POLICY "Users can manage images in their projects" ON image_metadata
FOR ALL USING (
  is_project_editor_or_admin(project_id) OR 
  created_by = auth.uid()
) WITH CHECK (
  is_project_editor_or_admin(project_id)
);