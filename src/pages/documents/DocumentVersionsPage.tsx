import { useState, useEffect, type FC } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { documentService } from '../../services/documentService';
import { Clock, ArrowLeft, RotateCcw, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DocumentViewer from '../../components/documents/DocumentViewer';
import type { Document, DocumentVersion } from '../../types';

const DocumentVersionsPage: FC = () => {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  const navigate = useNavigate();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [versionContent, setVersionContent] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [restoring, setRestoring] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cargar documento y versiones
  useEffect(() => {
    async function fetchData() {
      if (!documentId) return;
      
      try {
        setLoading(true);
        
        // Cargar documento
        const { data: docData, error: docError } = await documentService.getDocumentById(documentId);
        
        if (docError) throw docError;
        
        setDocument(docData);
        
        // Cargar versiones
        const { data: versionsData, error: versionsError } = await documentService.getDocumentVersions(documentId);
        
        if (versionsError) throw versionsError;
        
        setVersions(versionsData || []);
        
        // Seleccionar la primera versión por defecto
        if (versionsData && versionsData.length > 0) {
          setSelectedVersion(versionsData[0]);
          setVersionContent(versionsData[0].content);
        }
      } catch (err: any) {
        setError('Error al cargar el historial de versiones: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [documentId]);
  
  // Función para seleccionar una versión
  const handleSelectVersion = (version: DocumentVersion) => {
    setSelectedVersion(version);
    setVersionContent(version.content);
  };
  
  // Función para restaurar una versión
  const handleRestoreVersion = async () => {
    if (!selectedVersion || !documentId) return;
    
    try {
      setRestoring(true);
      
      const { error } = await documentService.restoreVersion(documentId, selectedVersion.id);
      
      if (error) throw error;
      
      // Redirigir a la vista del documento
      navigate(`/projects/${projectId}/documents/${documentId}`);
    } catch (err: any) {
      setError('Error al restaurar la versión: ' + err.message);
      setRestoring(false);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center p-8">Cargando historial de versiones...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }
  
  if (!document) {
    return <div className="p-4">Documento no encontrado</div>;
  }
  
  return (
    <div className="max-w-screen-xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/projects/${projectId}/documents/${documentId}`)}
          className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ArrowLeft size={16} className="mr-1" />
          Volver al documento
        </button>
      </div>
      
      <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        Historial de versiones - {document.title}
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Panel lateral con lista de versiones */}
        <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
            Versiones
          </h2>
          
          {versions.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400">
              No hay versiones disponibles
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => handleSelectVersion(version)}
                  className={`w-full text-left p-3 rounded-md flex flex-col ${
                    selectedVersion?.id === version.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700/40'
                  }`}
                >
                  <div className="font-medium text-gray-800 dark:text-white">
                    v{version.version_number}
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                    <Clock size={12} className="mr-1" />
                    {format(new Date(version.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                  </div>
                  
                  {version.commit_message && (
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      {version.commit_message}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Por: {version.created_by_user?.user_profiles?.[0]
                      ? `${version.created_by_user.user_profiles[0].first_name} ${version.created_by_user.user_profiles[0].last_name}`
                      : version.created_by_user?.email || 'Usuario desconocido'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Visualización de la versión seleccionada */}
        <div className="md:col-span-4">
          {selectedVersion ? (
            <div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4 flex justify-between items-center">
                <div>
                  <h2 className="font-semibold text-gray-800 dark:text-white">
                    Versión {selectedVersion.version_number}
                  </h2>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {format(new Date(selectedVersion.created_at), 'dd MMMM yyyy, HH:mm', { locale: es })}
                  </div>
                </div>
                
                {/* Botones de acción */}
                <div className="flex space-x-2">
                  <Link
                    to={`/projects/${projectId}/documents/${documentId}`}
                    className="btn-secondary flex items-center"
                  >
                    <Eye size={16} className="mr-1.5" />
                    Ver actual
                  </Link>
                  
                  <button
                    onClick={handleRestoreVersion}
                    className="btn-primary flex items-center"
                    disabled={restoring}
                  >
                    <RotateCcw size={16} className="mr-1.5" />
                    {restoring ? 'Restaurando...' : 'Restaurar a esta versión'}
                  </button>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <DocumentViewer content={versionContent} />
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Selecciona una versión para ver su contenido
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentVersionsPage;