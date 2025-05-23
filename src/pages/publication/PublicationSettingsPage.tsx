import { useState, useEffect, type FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Globe, 
  Lock, 
  Eye, 
  Share, 
  Copy, 
  ExternalLink, 
  Settings,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { publicationService } from '../../services/publicationService';
import { versionService } from '../../services/versionService';
import type { 
  PublicSite, 
  ProjectVersion, 
  AccessToken 
} from '../../types';

const PublicationSettingsPage: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  
  const [publicSite, setPublicSite] = useState<PublicSite | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [accessTokens, setAccessTokens] = useState<AccessToken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<boolean>(false);
  
  // Estado de configuración
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('');
  const [siteDescription, setSiteDescription] = useState<string>('');
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  
  // Cargar datos iniciales
  useEffect(() => {
    async function loadData() {
      if (!projectId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Cargar configuración actual del sitio público
        const { data: siteData } = await publicationService.getPublicSite(projectId);
        if (siteData) {
          setPublicSite(siteData);
          setIsPublic(siteData.is_active);
          setSiteName(siteData.site_name);
          setSiteDescription(siteData.description || '');
        }
        
        // Cargar versiones disponibles
        const { data: versionsData, error: versionsError } = await versionService.getProjectVersions(projectId);
        if (versionsError) throw versionsError;
        setVersions(versionsData || []);
        
        // Seleccionar versión actual por defecto
        const currentVersion = versionsData?.find(v => v.is_current);
        if (currentVersion) {
          setSelectedVersionId(currentVersion.id);
        }
        
        // Cargar tokens de acceso
        const { data: tokensData } = await publicationService.getAccessTokens(projectId);
        setAccessTokens(tokensData || []);
        
      } catch (err: any) {
        setError('Error al cargar configuración: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [projectId]);
  
  // Publicar o despublicar proyecto
  const handleTogglePublication = async () => {
    if (!projectId) return;
    
    try {
      setPublishing(true);
      setError(null);
      setSuccess(null);
      
      if (isPublic) {
        // Despublicar
        const { error } = await publicationService.unpublishProject(projectId);
        if (error) throw error;
        
        setSuccess('Proyecto despublicado correctamente');
        setPublicSite(null);
      } else {
        // Publicar
        const { data, error } = await publicationService.publishProject(projectId, {
          version_id: selectedVersionId,
          site_config: {
            site_name: siteName || 'Documentación',
            description: siteDescription,
            is_active: true
          },
          make_project_public: true
        });
        
        if (error) throw error;
        
        setPublicSite(data!.public_site);
        setSuccess(`Proyecto publicado correctamente. URL: ${data!.public_url}`);
      }
      
      setIsPublic(!isPublic);
      
    } catch (err: any) {
      setError('Error al cambiar estado de publicación: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };
  
  // Actualizar configuración del sitio
  const handleUpdateSiteConfig = async () => {
    if (!projectId || !publicSite) return;
    
    try {
      setPublishing(true);
      
      const { data, error } = await publicationService.createOrUpdatePublicSite(projectId, {
        site_name: siteName,
        description: siteDescription,
        is_active: isPublic
      });
      
      if (error) throw error;
      
      setPublicSite(data!);
      setSuccess('Configuración actualizada correctamente');
      
    } catch (err: any) {
      setError('Error al actualizar configuración: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };
  
  // Generar vista previa
  const handleGeneratePreview = async () => {
    if (!projectId) return;
    
    try {
      const { data, error } = await publicationService.generateSitePreview(projectId, selectedVersionId);
      
      if (error) throw error;
      
      // Abrir preview en nueva ventana
      window.open(data!.preview_url, '_blank');
      
    } catch (err: any) {
      setError('Error al generar vista previa: ' + err.message);
    }
  };
  
  // Copiar URL al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('URL copiada al portapapeles');
    
    setTimeout(() => setSuccess(null), 3000);
  };
  
  if (loading) {
    return <div className="flex justify-center p-8">Cargando configuración de publicación...</div>;
  }
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Configuración de publicación
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Controla cómo se publica y comparte tu documentación
        </p>
      </div>
      
      {/* Mensajes de estado */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg flex items-center">
          <AlertTriangle size={20} className="mr-2" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-lg flex items-center">
          <CheckCircle size={20} className="mr-2" />
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuración principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Toggle de publicación */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Estado de publicación
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {isPublic 
                    ? 'Tu documentación está disponible públicamente' 
                    : 'Tu documentación está privada'
                  }
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                {isPublic ? (
                  <span className="flex items-center text-green-600 dark:text-green-400">
                    <Globe size={20} className="mr-2" />
                    Público
                  </span>
                ) : (
                  <span className="flex items-center text-gray-500 dark:text-gray-400">
                    <Lock size={20} className="mr-2" />
                    Privado
                  </span>
                )}
                
                <button
                  onClick={handleTogglePublication}
                  disabled={publishing}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    isPublic
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  } disabled:opacity-50`}
                >
                  {publishing ? (
                    <>
                      <Clock size={16} className="inline mr-2" />
                      {isPublic ? 'Despublicando...' : 'Publicando...'}
                    </>
                  ) : (
                    isPublic ? 'Despublicar' : 'Publicar'
                  )}
                </button>
              </div>
            </div>
            
            {/* URL pública */}
            {publicSite && isPublic && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL pública
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/docs/${publicSite.project?.slug}`}
                    readOnly
                    className="flex-grow px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/docs/${publicSite.project?.slug}`)}
                    className="btn-secondary px-3"
                  >
                    <Copy size={16} />
                  </button>
                  <a
                    href={`${window.location.origin}/docs/${publicSite.project?.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary px-3"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            )}
          </div>
          
          {/* Configuración del sitio */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Configuración del sitio
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del sitio
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Nombre de tu documentación"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Descripción de tu documentación"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Versión a publicar
                </label>
                <select
                  value={selectedVersionId}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {versions.map(version => (
                    <option key={version.id} value={version.id}>
                      {version.version_number} 
                      {version.version_name && ` - ${version.version_name}`}
                      {version.is_current && ' (Actual)'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={handleGeneratePreview}
                  className="btn-secondary flex items-center"
                >
                  <Eye size={16} className="mr-2" />
                  Vista previa
                </button>
                
                <button
                  onClick={handleUpdateSiteConfig}
                  disabled={publishing}
                  className="btn-primary"
                >
                  Guardar configuración
                </button>
              </div>
            </div>
          </div>
          
          {/* Tokens de acceso */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Enlaces de acceso
              </h2>
              <button
                onClick={() => setShowTokenModal(true)}
                className="btn-secondary flex items-center"
              >
                <Share size={16} className="mr-2" />
                Crear enlace
              </button>
            </div>
            
            {accessTokens.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Share size={48} className="mx-auto mb-4 opacity-50" />
                <p className="mb-2">No hay enlaces de acceso</p>
                <p className="text-sm">
                  Crea enlaces seguros para compartir tu documentación
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {accessTokens.map(token => (
                  <div key={token.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white">
                        {token.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Creado el {new Date(token.created_at).toLocaleDateString()}
                        {token.expires_at && (
                          <span> • Expira el {new Date(token.expires_at).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/public/project/${token.token}`)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Estado actual */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Estado actual
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Estado</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  isPublic 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                }`}>
                  {isPublic ? 'Público' : 'Privado'}
                </span>
              </div>
              
              {publicSite && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Sitio activo</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      publicSite.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {publicSite.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Enlaces activos</span>
                    <span className="text-gray-800 dark:text-white font-medium">
                      {accessTokens.filter(t => t.is_active).length}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Acciones rápidas */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Acciones rápidas
            </h3>
            
            <div className="space-y-2">
              <Link
                to={`/projects/${projectId}/site-settings`}
                className="block w-full px-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
              >
                <Settings size={16} className="mr-2" />
                Configurar apariencia
              </Link>
              
              <button
                onClick={handleGeneratePreview}
                className="w-full px-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
              >
                <Eye size={16} className="mr-2" />
                Vista previa
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de crear token */}
      {showTokenModal && (
        <CreateTokenModal
          isOpen={showTokenModal}
          projectId={projectId!}
          onClose={() => setShowTokenModal(false)}
          onCreated={(token) => {
            setAccessTokens([...accessTokens, token]);
            setShowTokenModal(false);
          }}
        />
      )}
    </div>
  );
};

// Modal para crear token de acceso
interface CreateTokenModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onCreated: (token: AccessToken & { url: string }) => void;
}

const CreateTokenModal: FC<CreateTokenModalProps> = ({ isOpen, projectId, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [creating, setCreating] = useState(false);
  
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    try {
      setCreating(true);
      
      const { data, error } = await publicationService.generateAccessToken({
        project_id: projectId,
        name: name.trim(),
        expires_in_days: expiresInDays > 0 ? expiresInDays : undefined
      });
      
      if (error) throw error;
      
      onCreated(data!);
      
      // Reset form
      setName('');
      setExpiresInDays(30);
      
    } catch (error: any) {
      alert('Error al crear enlace: ' + error.message);
    } finally {
      setCreating(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Crear enlace de acceso
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre del enlace *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enlace para cliente X"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Expiración (días)
            </label>
            <input
              type="number"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              min="0"
              placeholder="30"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              0 = sin expiración
            </p>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={creating}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={creating || !name.trim()}
            >
              {creating ? 'Creando...' : 'Crear enlace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicationSettingsPage;