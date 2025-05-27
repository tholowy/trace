import { useState, type FC } from 'react';
import { Globe, Lock, Eye, Copy, X } from 'lucide-react';
import { publicationService } from '../../services/publicationService';
import { supabase } from '../../lib/supabase';

interface PublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string;
  projectId?: string;
  type: 'document' | 'project';
}

const PublicationModal: FC<PublicationModalProps> = ({ 
  isOpen, 
  onClose, 
  documentId, 
  projectId, 
  type 
}) => {
  const [publicationType, setPublicationType] = useState<'public' | 'protected' | 'private'>('private');
  const [accessPassword, setAccessPassword] = useState<string>('');
  const [allowedDomains, setAllowedDomains] = useState<string>('');
  const [expirationDays, setExpirationDays] = useState<number>(30);
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handlePublish = async () => {
    if (!documentId && !projectId) return;
    
    try {
      setLoading(true);
      
      if (type === 'document' && documentId) {
        // Actualizar estado de publicación del documento
        const { error: docError } = await supabase
          .from('documents')
          .update({ is_published: publicationType !== 'private' })
          .eq('id', documentId);
          
        if (docError) throw docError;

        if (publicationType !== 'private') {
          // Crear configuración de publicación
          await publicationService.publishDocument(documentId, {
            isPublic: publicationType === 'public',
            requiresAuth: publicationType === 'protected',
            accessPassword: accessPassword || undefined,
            allowedDomains: allowedDomains ? allowedDomains.split(',').map(d => d.trim()) : undefined,
            expiresAt: expirationDays > 0 
              ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString() 
              : undefined
          });

          // Generar token de acceso si es necesario
          if (publicationType === 'protected') {
            const { data: tokenData } = await publicationService.generateAccessToken(
              documentId, 
              'document',
              { expiresInDays: expirationDays }
            );
            
            if (tokenData) {
              setGeneratedUrl(tokenData.url);
            }
          } else {
            // URL pública directa
            setGeneratedUrl(`${window.location.origin}/public/doc/${documentId}`);
          }
        }
      }
      
      window.toast?.success('Configuración de publicación actualizada');
    } catch (error: any) {
      window.toast?.error('Error al configurar publicación: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    window.toast?.success('URL copiada al portapapeles');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-45 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Configurar publicación
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Tipo de publicación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de acceso
            </label>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="publicationType"
                  value="private"
                  checked={publicationType === 'private'}
                  onChange={(e) => setPublicationType(e.target.value as any)}
                  className="mr-2"
                />
                <Lock size={16} className="mr-2 text-gray-500" />
                <span>Privado - Solo usuarios autenticados</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="publicationType"
                  value="protected"
                  checked={publicationType === 'protected'}
                  onChange={(e) => setPublicationType(e.target.value as any)}
                  className="mr-2"
                />
                <Eye size={16} className="mr-2 text-gray-500" />
                <span>Protegido - Con enlace especial</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="publicationType"
                  value="public"
                  checked={publicationType === 'public'}
                  onChange={(e) => setPublicationType(e.target.value as any)}
                  className="mr-2"
                />
                <Globe size={16} className="mr-2 text-gray-500" />
                <span>Público - Accesible para todos</span>
              </label>
            </div>
          </div>

          {/* Opciones adicionales para acceso protegido */}
          {publicationType === 'protected' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contraseña (opcional)
                </label>
                <input
                  type="password"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  className="form-input"
                  placeholder="Dejar vacío para acceso sin contraseña"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dominios permitidos (opcional)
                </label>
                <input
                  type="text"
                  value={allowedDomains}
                  onChange={(e) => setAllowedDomains(e.target.value)}
                  className="form-input"
                  placeholder="ejemplo.com, empresa.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separar múltiples dominios con comas
                </p>
              </div>
            </>
          )}

          {/* Expiración */}
          {publicationType !== 'private' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expiración (días)
              </label>
              <input
                type="number"
                value={expirationDays}
                onChange={(e) => setExpirationDays(parseInt(e.target.value) || 0)}
                className="form-input"
                min="0"
                placeholder="0 = sin expiración"
              />
            </div>
          )}

          {/* URL generada */}
          {generatedUrl && (
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                URL de acceso público
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={generatedUrl}
                  readOnly
                  className="form-input flex-grow text-sm"
                />
                <button
                  onClick={() => copyToClipboard(generatedUrl)}
                  className="btn-secondary px-3"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handlePublish}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Configurando...' : 'Aplicar configuración'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicationModal;
