import { supabase } from "../lib/supabase";

// Tipos corregidos
export interface ImageUploadOptions {
  projectId: string;
  pageId?: string;
  altText?: string;
  description?: string;
  isPublic?: boolean;
}

export interface ImageMetadata {
  id: string;
  project_id: string;
  page_id?: string;
  storage_path: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  alt_text?: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  created_by: string;
  public_url?: string;
}



class ImageService {
  private readonly bucketName = "documentation-images";

  async uploadImage(
    file: File,
    options: ImageUploadOptions
  ): Promise<ImageMetadata> {
    try {
      this.validateFile(file);
      const dimensions = await this.getImageDimensions(file);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const fileExtension = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExtension}`;
      const filePath = `${user.id}/${options.projectId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(this.bucketName).getPublicUrl(filePath);

      const { data: metadata, error: metadataError } = await supabase
        .from("image_metadata")
        .insert({
          project_id: options.projectId,
          page_id: options.pageId,
          storage_path: filePath,
          original_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          width: dimensions.width,
          height: dimensions.height,
          alt_text: options.altText,
          description: options.description,
          is_public: options.isPublic ?? true,
          created_by: user.id,
        })
        .select()
        .single();

      if (metadataError) {
        await supabase.storage.from(this.bucketName).remove([filePath]);
        throw metadataError;
      }

      return {
        ...metadata,
        public_url: publicUrl,
      };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }

  async updateImageMetadata(
    imageId: string,
    updates: Partial<
      Pick<ImageMetadata, "alt_text" | "description" | "is_public">
    >
  ): Promise<ImageMetadata> {
    const { data, error } = await supabase
      .from("image_metadata")
      .update(updates)
      .eq("id", imageId)
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      public_url: supabase.storage
        .from(this.bucketName)
        .getPublicUrl(data.storage_path).data.publicUrl,
    };
  }

  async deleteImage(imageId: string): Promise<void> {
    const { data: metadata } = await supabase
      .from("image_metadata")
      .select("storage_path")
      .eq("id", imageId)
      .single();

    if (metadata) {
      await supabase.storage
        .from(this.bucketName)
        .remove([metadata.storage_path]);
    }

    const { error } = await supabase
      .from("image_metadata")
      .delete()
      .eq("id", imageId);

    if (error) throw error;
  }

  private validateFile(file: File): void {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
      "image/gif",
    ];

    if (file.size > maxSize) {
      throw new Error("El archivo es demasiado grande (máximo 50MB)");
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Tipo de archivo no permitido");
    }
  }

  private getImageDimensions(
    file: File
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo cargar la imagen"));
      };

      img.src = url;
    });
  }
}

export const imageService = new ImageService();
