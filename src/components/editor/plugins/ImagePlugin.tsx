import { YooptaPlugin, useYooptaEditor, useBlockData } from "@yoopta/editor";
import { useState, useRef, useEffect } from "react";
import {
  ImageIcon,
  Settings,
  Download,
  Trash2,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { imageService } from "../../../services/imageService";

// Componente de renderizado para la imagen
const ImageDiagram = (props: any) => {
  const { attributes, children, element, readOnly } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Usar el hook oficial de Yoopta-Editor
  const editor = useYooptaEditor();

  // ✅ Usar el hook para obtener datos del bloque
  const blockData = useBlockData(element.id);

  // Props del elemento (usar blockData si está disponible)
  const elementProps = blockData?.props || element.props || {};
  const {
    src = "",
    alt = "",
    width,
    height,
    alignment = "center",
    caption = "",
    imageId,
  } = elementProps;

  // Obtener contexto desde el global (esto sí puede quedar así)
  const context = (window as any).yooptaContext;
  const projectId = context?.projectId;
  const pageId = context?.pageId;

  // Debugging mejorado al inicio del componente
  useEffect(() => {
    console.log("🔍 ImageDiagram mount/update:", {
      elementId: element.id,
      elementType: element.type,
      hasEditor: !!editor,
      editorValue: editor ? Object.keys(editor.getEditorValue()) : "No editor",
      blockData: blockData,
      elementProps: elementProps,
    });
  }, [element.id, elementProps.src, elementProps.imageId]);

  console.log("🔍 ImageDiagram render:", {
    elementId: element.id,
    elementType: element.type,
    src: src,
    imageId: imageId,
    hasEditor: !!editor,
    hasContext: !!context,
    projectId: projectId,
    elementProps: elementProps,
    blockData: blockData,
  });

  // ✅ Función corregida para actualizar el elemento
  const updateElement = (updates: any) => {
    console.log("🔄 Actualizando elemento:", {
      elementId: element.id,
      updates: updates,
    });

    if (!editor) {
      console.error("❌ Editor no disponible");
      return;
    }

    try {
      // ✅ Obtener el bloque actual primero
      const currentValue = editor.getEditorValue();
      console.log("📊 Valor actual del editor:", currentValue);

      // Buscar el bloque que contiene nuestro elemento
      let targetBlockId = null;
      let targetBlock = null;

      Object.keys(currentValue).forEach((blockId) => {
        const block = currentValue[blockId];
        console.log(`🔍 Revisando bloque ${blockId}:`, block);

        // Verificar si este bloque contiene nuestro elemento
        if (block.id === element.id) {
          targetBlockId = blockId;
          targetBlock = block;
          console.log("🎯 Elemento encontrado como bloque principal");
        } else if (block.value && Array.isArray(block.value)) {
          const elementInBlock = block.value.find(
            (el: any) => el.id === element.id
          );
          if (elementInBlock) {
            targetBlockId = blockId;
            targetBlock = block;
            console.log("🎯 Elemento encontrado en value array");
          }
        }
      });

      if (!targetBlockId || !targetBlock) {
        console.error("❌ No se encontró el bloque contenedor");
        return;
      }

      // ✅ Actualizar usando la API correcta de updateBlock
      // Según los tipos, updateBlock espera: (blockId: string, blockData: YooptaBlockData)
      const updatedBlockData = {
        id: targetBlock.id,
        type: targetBlock.type,
        value: targetBlock.value
          ? targetBlock.value.map((el: any) => {
              if (el.id === element.id) {
                return {
                  ...el,
                  props: {
                    ...el.props,
                    ...updates,
                  },
                };
              }
              return el;
            })
          : [],
        meta: targetBlock.meta || { order: 0, depth: 0 },
      };

      console.log("📝 Datos del bloque a actualizar:", updatedBlockData);

      // ✅ Llamar updateBlock con los parámetros correctos
      editor.updateBlock(targetBlockId, updatedBlockData);

      console.log("✅ Bloque actualizado correctamente usando updateBlock");

      // Notificar al contexto si existe
      if (context?.onEditorChange) {
        console.log("📡 Notificando cambio al contexto");
        setTimeout(() => {
          const newValue = editor.getEditorValue();
          context.onEditorChange(newValue);
        }, 100);
      }
    } catch (err) {
      console.error("❌ Error al actualizar con updateBlock:", err);

      // ✅ Método de respaldo usando setEditorValue
      try {
        console.log("🔄 Intentando método de respaldo...");
        const currentValue = editor.getEditorValue();
        const updatedValue = { ...currentValue };

        Object.keys(updatedValue).forEach((blockId) => {
          const block = updatedValue[blockId];

          if (block.value && Array.isArray(block.value)) {
            const newValue = block.value.map((el: any) => {
              if (el.id === element.id) {
                console.log("🎯 Actualizando elemento en método de respaldo");
                return {
                  ...el,
                  props: {
                    ...el.props,
                    ...updates,
                  },
                };
              }
              return el;
            });

            updatedValue[blockId] = {
              ...block,
              value: newValue,
            };
          }
        });

        editor.setEditorValue(updatedValue);
        console.log("✅ Actualización de respaldo exitosa");

        // Notificar cambio
        if (context?.onEditorChange) {
          context.onEditorChange(updatedValue);
        }
      } catch (altErr) {
        console.error("❌ Error en método de respaldo:", altErr);
      }
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!projectId) {
      setError("ID de proyecto requerido");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("📤 Subiendo imagen:", file.name);

      const uploadedImage = await imageService.uploadImage(file, {
        projectId,
        pageId,
        altText: alt || file.name,
        description: caption,
      });

      console.log("✅ Imagen subida:", uploadedImage);

      // Mostrar mensaje de éxito
      setUploadSuccess("¡Imagen subida correctamente!");
      setTimeout(() => setUploadSuccess(null), 3000);

      // ✅ Actualizar usando la función corregida
      updateElement({
        src: uploadedImage.public_url,
        imageId: uploadedImage.id,
        width: uploadedImage.width,
        height: uploadedImage.height,
        alt: alt || file.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir imagen");
      console.error("❌ Error en upload:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    }
  };

  // Componente del panel de configuración
  const SettingsPanel = () => {
    const [localAlt, setLocalAlt] = useState(alt);
    const [localCaption, setLocalCaption] = useState(caption);
    const [localAlignment, setLocalAlignment] = useState(alignment);
    const [localWidth, setLocalWidth] = useState(width?.toString() || "");

    const handleSave = async () => {
      const updates = {
        alt: localAlt,
        caption: localCaption,
        alignment: localAlignment,
        width: localWidth ? parseInt(localWidth) : undefined,
      };

      updateElement(updates);

      // Actualizar metadatos en Supabase si existe imageId
      if (imageId) {
        try {
          await imageService.updateImageMetadata(imageId, {
            alt_text: localAlt,
            description: localCaption,
          });
          console.log("✅ Metadatos actualizados en Supabase");
        } catch (error) {
          console.error("❌ Error updating image metadata:", error);
        }
      }

      setShowSettings(false);
    };

    const handleDelete = async () => {
      if (confirm("¿Estás seguro de que quieres eliminar esta imagen?")) {
        // Eliminar de Supabase si existe imageId
        if (imageId) {
          try {
            await imageService.deleteImage(imageId);
            console.log("✅ Imagen eliminada de Supabase");
          } catch (error) {
            console.error("❌ Error deleting image:", error);
          }
        }

        // ✅ Buscar el bloque que contiene el elemento y eliminarlo
        try {
          const currentValue = editor.getEditorValue();
          let targetBlockId = null;

          Object.keys(currentValue).forEach((blockId) => {
            const block = currentValue[blockId];
            if (block.value && Array.isArray(block.value)) {
              const hasElement = block.value.some(
                (el: any) => el.id === element.id
              );
              if (hasElement) {
                targetBlockId = blockId;
              }
            }
          });

          if (targetBlockId) {
            editor.deleteBlock(targetBlockId);
            console.log("✅ Bloque eliminado correctamente");
          } else {
            throw new Error("No se encontró el bloque a eliminar");
          }
        } catch (err) {
          console.error("❌ Error eliminando bloque:", err);
          // Fallback: resetear elemento
          updateElement({
            src: "",
            imageId: undefined,
            width: undefined,
            height: undefined,
            alt: "",
            caption: "",
          });
        }

        setShowSettings(false);
      }
    };

    const handleDownload = () => {
      if (src) {
        const link = document.createElement("a");
        link.href = src;
        link.download = alt || "image";
        link.click();
      }
    };

    return (
      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold dark:text-white">
              Configuración de imagen
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Texto alternativo
              </label>
              <input
                type="text"
                value={localAlt}
                onChange={(e) => setLocalAlt(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Descripción de la imagen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pie de imagen
              </label>
              <input
                type="text"
                value={localCaption}
                onChange={(e) => setLocalCaption(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Pie de imagen opcional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Alineación
              </label>
              <select
                value={localAlignment}
                onChange={(e) => setLocalAlignment(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="left">Izquierda</option>
                <option value="center">Centro</option>
                <option value="right">Derecha</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ancho (px)
              </label>
              <input
                type="number"
                value={localWidth}
                onChange={(e) => setLocalWidth(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Ancho automático"
              />
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Download className="w-4 h-4" />
                Descargar
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Si no hay imagen, mostrar área de upload
  if (!src) {
    return (
      <div
        {...attributes}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors my-4"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-gray-600 dark:text-gray-400">
              Subiendo imagen...
            </p>
          </div>
        ) : uploadSuccess ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400">✓</span>
            </div>
            <p className="text-green-600 dark:text-green-400">
              {uploadSuccess}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Imagen actualizada en el editor
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fileInputRef.current?.click();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Intentar de nuevo
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Arrastra una imagen aquí o haz clic para seleccionar
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Seleccionar imagen
            </button>
          </div>
        )}
        {children}
      </div>
    );
  }

  // Mostrar imagen con controles
  return (
    <div {...attributes} className="my-4 relative group">
      <figure
        className={`relative ${
          alignment === "center"
            ? "mx-auto text-center"
            : alignment === "right"
            ? "ml-auto text-right"
            : "text-left"
        }`}
        style={{ maxWidth: width ? `${width}px` : "none" }}
      >
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="max-w-full h-auto rounded-lg shadow-sm"
          loading="lazy"
          onError={() => {
            console.error("❌ Error al cargar imagen:", src);
            setError("Error al cargar la imagen");
          }}
          onLoad={() => {
            console.log("✅ Imagen cargada correctamente:", src);
            setError(null);
          }}
        />

        {/* Toolbar flotante - Solo si no es readOnly */}
        {!readOnly && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
            >
              <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        )}

        {caption && (
          <figcaption className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
            {caption}
          </figcaption>
        )}
      </figure>

      {/* Panel de configuración */}
      {showSettings && <SettingsPanel />}

      {children}
    </div>
  );
};

// ✅ Plugin corregido con configuración mejorada
export const ImagePlugin = new YooptaPlugin({
  type: "Image",
  elements: {
    Image: {
      // ✅ Usar el mismo nombre que el type
      render: ImageDiagram,
      props: {
        nodeType: "void",
        src: "",
        alt: "",
        width: undefined,
        height: undefined,
        alignment: "center",
        caption: "",
        imageId: undefined,
      },
    },
  },
  options: {
    display: {
      title: "Imagen",
      description: "Insertar imagen desde Supabase Storage",
      icon: <ImageIcon size={24} />,
    },
    shortcuts: ["img", "image", "imagen"],
    HTMLAttributes: {
      className: "yoopta-image-upload",
    },
  },
  parsers: {
    html: {
      deserialize: {
        nodeNames: ["IMG", "FIGURE"],
      },
      serialize: (element: any) => {
        const { src, alt, width, height, caption } = element.props || {};
        if (!src) return "";

        const imgTag = `<img src="${src}" alt="${alt || ""}" ${
          width ? `width="${width}"` : ""
        } ${height ? `height="${height}"` : ""} />`;
        return caption
          ? `<figure>${imgTag}<figcaption>${caption}</figcaption></figure>`
          : imgTag;
      },
    },
  },
});
