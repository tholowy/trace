import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  GitBranch, 
  ArrowRight,
  Plus,
  Minus,
  Edit,
  Eye,
  FileText,
  AlertTriangle,
  Check,
  X,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { versionService } from '../../services/versionService';
import DocumentViewer from '../../components/documents/DocumentViewer';
import VersionSelector from '../../components/versions/VersionSelector';
import type { ProjectVersion, PageVersion } from '../../types';

const VersionComparePage: React.FC = () => {
  const { projectId, versionId, compareVersionId } = useParams<{ 
    projectId: string; 
    versionId: string; 
    compareVersionId: string; 
  }>();
  
  const [version1, setVersion1] = useState<ProjectVersion | null>(null);
  const [version2, setVersion2] = useState<ProjectVersion | null>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'summary' | 'added' | 'modified' | 'removed'>('summary');
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [showDiffFor, setShowDiffFor] = useState<string | null>(null);

  useEffect(() => {
    loadComparison();
  }, [versionId, compareVersionId]);

  const loadComparison = async () => {
    if (!versionId || !compareVersionId) return;
    
    try {
      setLoading(true);
      
      // Cargar ambas versiones
      const [version1Result, version2Result, comparisonResult] = await Promise.all([
        versionService.getVersionById(versionId),
        versionService.getVersionById(compareVersionId),
        versionService.compareVersions(versionId, compareVersionId)
      ]);
      
      if (version1Result.error) throw version1Result.error;
      if (version2Result.error) throw version2Result.error;
      if (comparisonResult.error) throw comparisonResult.error;
      
      setVersion1(version1Result.data);
      setVersion2(version2Result.data);
      setComparison(comparisonResult.data);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePageExpansion = (pageId: string) => {
    setExpandedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  const showPageDiff = async (pageId: string) => {
    if (!versionId || !compareVersionId) return;
    
    try {
      const { data: diff } = await versionService.getPageDiff(versionId, compareVersionId, pageId);
      // Aquí mostrarías el diff en un modal o panel lateral
      setShowDiffFor(pageId);
    } catch (error) {
      console.error('Error loading page diff:', error);
    }
  };

  const getChangeTypeIcon = (changeType: 'added' | 'modified' | 'removed') => {
    switch (changeType) {
      case 'added':
        return <Plus size={16} className="text-green-600" />;
      case 'modified':
        return <Edit size={16} className="text-blue-600" />;
      case 'removed':
        return <Minus size={16} className="text-red-600" />;
    }
  };

  const getChangeTypeColor = (changeType: 'added' | 'modified' | 'removed') => {
    switch (changeType) {
      case 'added':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'modified':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'removed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Comparando versiones...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (!version1 || !version2 || !comparison) {
    return <div className="p-4">Error al cargar la comparación</div>;
  }

  const totalChanges = (comparison.added_pages?.length || 0) + 
                      (comparison.modified_pages?.length || 0) + 
                      (comparison.removed_pages?.length || 0);

  return (
    <div className="p-6">
      {/* Navigation */}
      <div className="mb-6">
        <Link
          to={`/projects/${projectId}/versions`}
          className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ArrowLeft size={16} className="mr-1" />
          Volver al historial
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Comparar Versiones
          </h1>
          
          <div className="flex items-center space-x-2">
            <VersionSelector
              projectId={projectId!}
              currentVersionId={versionId}
              onVersionChange={(version) => {
                // Cambiar la versión base
                window.location.href = `/projects/${projectId}/versions/${version.id}/compare/${compareVersionId}`;
              }}
              size="sm"
            />
            
            <ArrowRight size={16} className="text-gray-400" />
            
            <VersionSelector
              projectId={projectId!}
              currentVersionId={compareVersionId}
              onVersionChange={(version) => {
                // Cambiar la versión de comparación
                window.location.href = `/projects/${projectId}/versions/${versionId}/compare/${version.id}`;
              }}
              size="sm"
            />
          </div>
        </div>

        {/* Version Comparison Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Version 1 */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <GitBranch size={16} className="text-blue-600" />
              <span className="font-medium text-gray-800 dark:text-white">
                {version1.version_name || `v${version1.version_number}`}
              </span>
              {version1.is_current && (
                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded">
                  Actual
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {format(new Date(version1.created_at), 'dd MMM yyyy, HH:mm', { locale: es })}
            </div>
            {version1.release_notes && (
              <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                {version1.release_notes}
              </div>
            )}
          </div>

          {/* Version 2 */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <GitBranch size={16} className="text-blue-600" />
              <span className="font-medium text-gray-800 dark:text-white">
                {version2.version_name || `v${version2.version_number}`}
              </span>
              {version2.is_current && (
                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded">
                  Actual
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {format(new Date(version2.created_at), 'dd MMM yyyy, HH:mm', { locale: es })}
            </div>
            {version2.release_notes && (
              <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                {version2.release_notes}
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {totalChanges}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total cambios
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {comparison.added_pages?.length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Añadidas
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {comparison.modified_pages?.length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Modificadas
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {comparison.removed_pages?.length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Eliminadas
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSelectedTab('summary')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'summary'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setSelectedTab('added')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'added'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Añadidas ({comparison.added_pages?.length || 0})
          </button>
          <button
            onClick={() => setSelectedTab('modified')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'modified'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Modificadas ({comparison.modified_pages?.length || 0})
          </button>
          <button
            onClick={() => setSelectedTab('removed')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'removed'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Eliminadas ({comparison.removed_pages?.length || 0})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'summary' && (
        <div className="space-y-6">
          {totalChanges === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
              <Check size={48} className="mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                No hay diferencias
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Las versiones seleccionadas son idénticas
              </p>
            </div>
          ) : (
            <>
              {/* Páginas añadidas */}
              {comparison.added_pages && comparison.added_pages.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                      <Plus size={20} className="mr-2 text-green-600" />
                      Páginas añadidas ({comparison.added_pages.length})
                    </h3>
                  </div>
                  <div className="p-4 space-y-2">
                    {comparison.added_pages.slice(0, 3).map((page: PageVersion) => (
                      <div key={page.id} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                        <div className="font-medium text-green-800 dark:text-green-300">
                          {page.title_snapshot || 'Sin título'}
                        </div>
                        {page.description_snapshot && (
                          <div className="text-sm text-green-700 dark:text-green-400 mt-1">
                            {page.description_snapshot}
                          </div>
                        )}
                      </div>
                    ))}
                    {comparison.added_pages.length > 3 && (
                      <div className="text-center pt-2">
                        <button
                          onClick={() => setSelectedTab('added')}
                          className="text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        >
                          Ver todas las {comparison.added_pages.length} páginas añadidas
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Páginas modificadas */}
              {comparison.modified_pages && comparison.modified_pages.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                      <Edit size={20} className="mr-2 text-blue-600" />
                      Páginas modificadas ({comparison.modified_pages.length})
                    </h3>
                  </div>
                  <div className="p-4 space-y-2">
                    {comparison.modified_pages.slice(0, 3).map((change: any) => (
                      <div key={change.page_id} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <div className="font-medium text-blue-800 dark:text-blue-300">
                          {change.page_title}
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                          {change.changes.title_changed && <span className="mr-2">• Título</span>}
                          {change.changes.content_changed && <span className="mr-2">• Contenido</span>}
                          {change.changes.description_changed && <span className="mr-2">• Descripción</span>}
                        </div>
                      </div>
                    ))}
                    {comparison.modified_pages.length > 3 && (
                      <div className="text-center pt-2">
                        <button
                          onClick={() => setSelectedTab('modified')}
                          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Ver todas las {comparison.modified_pages.length} páginas modificadas
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Páginas eliminadas */}
              {comparison.removed_pages && comparison.removed_pages.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                      <Minus size={20} className="mr-2 text-red-600" />
                      Páginas eliminadas ({comparison.removed_pages.length})
                    </h3>
                  </div>
                  <div className="p-4 space-y-2">
                    {comparison.removed_pages.slice(0, 3).map((page: PageVersion) => (
                      <div key={page.id} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                        <div className="font-medium text-red-800 dark:text-red-300">
                          {page.title_snapshot || 'Sin título'}
                        </div>
                        {page.description_snapshot && (
                          <div className="text-sm text-red-700 dark:text-red-400 mt-1">
                            {page.description_snapshot}
                          </div>
                        )}
                      </div>
                    ))}
                    {comparison.removed_pages.length > 3 && (
                      <div className="text-center pt-2">
                        <button
                          onClick={() => setSelectedTab('removed')}
                          className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Ver todas las {comparison.removed_pages.length} páginas eliminadas
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Páginas añadidas */}
      {selectedTab === 'added' && (
        <PageChangesList
          pages={comparison.added_pages || []}
          changeType="added"
          emptyMessage="No hay páginas añadidas en esta comparación"
          expandedPages={expandedPages}
          onToggleExpansion={togglePageExpansion}
          onShowDiff={showPageDiff}
        />
      )}

      {/* Páginas modificadas */}
      {selectedTab === 'modified' && (
        <PageChangesList
          pages={comparison.modified_pages || []}
          changeType="modified"
          emptyMessage="No hay páginas modificadas en esta comparación"
          expandedPages={expandedPages}
          onToggleExpansion={togglePageExpansion}
          onShowDiff={showPageDiff}
        />
      )}

      {/* Páginas eliminadas */}
      {selectedTab === 'removed' && (
        <PageChangesList
          pages={comparison.removed_pages || []}
          changeType="removed"
          emptyMessage="No hay páginas eliminadas en esta comparación"
          expandedPages={expandedPages}
          onToggleExpansion={togglePageExpansion}
          onShowDiff={showPageDiff}
        />
      )}
    </div>
  );
};

// Componente para mostrar listas de cambios
interface PageChangesListProps {
  pages: any[];
  changeType: 'added' | 'modified' | 'removed';
  emptyMessage: string;
  expandedPages: Set<string>;
  onToggleExpansion: (pageId: string) => void;
  onShowDiff: (pageId: string) => void;
}

const PageChangesList: React.FC<PageChangesListProps> = ({
  pages,
  changeType,
  emptyMessage,
  expandedPages,
  onToggleExpansion,
  onShowDiff
}) => {
  const getChangeTypeIcon = (type: 'added' | 'modified' | 'removed') => {
    switch (type) {
      case 'added':
        return <Plus size={16} className="text-green-600" />;
      case 'modified':
        return <Edit size={16} className="text-blue-600" />;
      case 'removed':
        return <Minus size={16} className="text-red-600" />;
    }
  };

  const getChangeTypeColor = (type: 'added' | 'modified' | 'removed') => {
    switch (type) {
      case 'added':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'modified':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'removed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
  };

  if (pages.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
        <AlertTriangle size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className={`p-4 space-y-3 ${getChangeTypeColor(changeType)}`}>
        {pages.map((page: any) => {
          const pageId = page.page_id || page.id;
          const title = page.page_title || page.title_snapshot || 'Sin título';
          const description = page.description_snapshot;
          const isExpanded = expandedPages.has(pageId);

          return (
            <div key={pageId} className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-grow">
                    {getChangeTypeIcon(changeType)}
                    <div className="flex-grow">
                      <h4 className="font-medium text-gray-800 dark:text-white">
                        {title}
                      </h4>
                      {description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {description}
                        </p>
                      )}
                      {changeType === 'modified' && page.changes && (
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {page.changes.title_changed && <span>• Título modificado</span>}
                          {page.changes.content_changed && <span>• Contenido modificado</span>}
                          {page.changes.description_changed && <span>• Descripción modificada</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {changeType === 'modified' && (
                      <button
                        onClick={() => onShowDiff(pageId)}
                        className="btn-secondary text-sm flex items-center"
                      >
                        <Eye size={14} className="mr-1" />
                        Ver diff
                      </button>
                    )}
                    
                    <button
                      onClick={() => onToggleExpansion(pageId)}
                      className="btn-secondary p-2"
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                </div>

                {/* Contenido expandido */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                      <div><strong>ID:</strong> {pageId}</div>
                      {changeType === 'modified' && page.version1 && page.version2 && (
                        <div className="mt-4">
                          <h5 className="font-medium text-gray-800 dark:text-white mb-2">
                            Comparación de contenido
                          </h5>
                          {/* Aquí podrías mostrar un diff más detallado */}
                          <div className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded">
                            Contenido modificado - Haz clic en "Ver diff" para más detalles
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VersionComparePage;