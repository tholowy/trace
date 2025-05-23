import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Clock, Archive, GitBranch, Tag } from 'lucide-react';
import { versionService } from '../../services/versionService';
import type { ProjectVersion } from '../../types';

interface VersionSelectorProps {
  projectId: string;
  currentVersionId?: string;
  onVersionChange?: (version: ProjectVersion) => void;
  showDrafts?: boolean;
  showArchived?: boolean;
  size?: 'sm' | 'md' | 'lg';
  placement?: 'bottom' | 'top';
}

interface VersionItemProps {
  version: ProjectVersion;
  isSelected: boolean;
  onSelect: (version: ProjectVersion) => void;
}

const VersionItem: React.FC<VersionItemProps> = ({ version, isSelected, onSelect }) => {
  const getVersionIcon = (version: ProjectVersion) => {
    if (version.is_current) return <Check size={14} className="text-success" />;
    if (version.is_draft) return <Clock size={14} className="text-warning" />;
    if (version.is_archived) return <Archive size={14} className="text-muted-foreground" />;
    return <Tag size={14} className="text-primary" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <button
      onClick={() => onSelect(version)}
      className={`w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors ${
        isSelected ? 'bg-secondary text-secondary-foreground' : 'text-foreground'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-grow min-w-0">
          {getVersionIcon(version)}

          <div className="flex-grow min-w-0">
            <div className="flex items-center space-x-2">
              <span className={`font-medium truncate ${
                isSelected ? 'text-primary' : 'text-foreground'
              }`}>
                {version.version_number}
              </span>

              {version.version_name && (
                <span className="text-sm text-muted-foreground truncate">
                  {version.version_name}
                </span>
              )}
            </div>

            <div className="text-xs text-muted-foreground mt-1">
              {version.published_at
                ? `Publicado ${formatDate(version.published_at)}`
                : `Creado ${formatDate(version.created_at)}`
              }
            </div>
          </div>
        </div>

        {isSelected && (
          <Check size={16} className="text-primary flex-shrink-0" />
        )}
      </div>

      {version.release_notes && (
        <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
          {version.release_notes}
        </div>
      )}
    </button>
  );
};

const VersionSelector: React.FC<VersionSelectorProps> = ({
  projectId,
  currentVersionId,
  onVersionChange,
  showDrafts = false,
  showArchived = false,
  size = 'md',
  placement = 'bottom'
}) => {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<ProjectVersion | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar versiones
  useEffect(() => {
    async function loadVersions() {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await versionService.getProjectVersions(projectId, showArchived);

        if (error) throw error;

        setVersions(data || []);

        // Establecer versión actual
        if (currentVersionId) {
          const version = data?.find(v => v.id === currentVersionId);
          setCurrentVersion(version || null);
        } else {
          // Usar la versión actual del proyecto
          const current = data?.find(v => v.is_current);
          setCurrentVersion(current || null);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadVersions();
  }, [projectId, currentVersionId, showArchived]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar versiones según las opciones
  const filteredVersions = versions.filter(version => {
    if (!showDrafts && version.is_draft) return false;
    if (!showArchived && version.is_archived) return false;
    return true;
  });

  // Agrupar versiones por estado
  const groupedVersions = {
    current: filteredVersions.filter(v => v.is_current && !v.is_draft),
    published: filteredVersions.filter(v => !v.is_current && !v.is_draft && !v.is_archived),
    drafts: showDrafts ? filteredVersions.filter(v => v.is_draft) : [],
    archived: showArchived ? filteredVersions.filter(v => v.is_archived) : []
  };

  const handleVersionSelect = (version: ProjectVersion) => {
    setCurrentVersion(version);
    setIsOpen(false);
    onVersionChange?.(version);
  };

  // Iconos de las versiones dentro del selector
  const getDisplayVersionIcon = (version: ProjectVersion) => {
    if (version.is_current) return <Check size={14} className="text-success" />;
    if (version.is_draft) return <Clock size={14} className="text-warning" />;
    if (version.is_archived) return <Archive size={14} className="text-muted-foreground" />;
    return <GitBranch size={14} className="text-primary" />; // Usar GitBranch como default más genérico
  };

  const getButtonSize = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-sm';
      case 'lg':
        return 'px-4 py-3 text-base';
      default:
        return 'px-3 py-2 text-sm';
    }
  };

  const getDropdownPosition = () => {
    return placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1';
  };

  if (loading) {
    return (
      <div className={`${getButtonSize()} bg-secondary rounded-md animate-pulse`}>
        <div className="w-16 h-4 bg-border rounded"></div>
      </div>
    );
  }

  if (error || !currentVersion) {
    return (
      <div className={`${getButtonSize()} bg-destructive/10 text-destructive-foreground rounded-md`}>
        Error
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón selector */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${getButtonSize()} bg-card border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary flex items-center space-x-2 transition-colors duration-200 text-foreground`}
      >
        {getDisplayVersionIcon(currentVersion)}
        <span className="font-medium">
          {currentVersion.version_number}
        </span>
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute ${getDropdownPosition()} right-0 w-72 bg-popover border border-border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto`}>
          {/* Header */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center space-x-2">
              <GitBranch size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Versiones del proyecto
              </span>
            </div>
          </div>

          {/* Versión actual */}
          {groupedVersions.current.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase bg-secondary">
                Actual
              </div>
              {groupedVersions.current.map(version => (
                <VersionItem
                  key={version.id}
                  version={version}
                  isSelected={currentVersion.id === version.id}
                  onSelect={handleVersionSelect}
                />
              ))}
            </div>
          )}

          {/* Versiones publicadas */}
          {groupedVersions.published.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase bg-secondary">
                Publicadas
              </div>
              {groupedVersions.published.map(version => (
                <VersionItem
                  key={version.id}
                  version={version}
                  isSelected={currentVersion.id === version.id}
                  onSelect={handleVersionSelect}
                />
              ))}
            </div>
          )}

          {/* Borradores */}
          {groupedVersions.drafts.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase bg-secondary">
                Borradores
              </div>
              {groupedVersions.drafts.map(version => (
                <VersionItem
                  key={version.id}
                  version={version}
                  isSelected={currentVersion.id === version.id}
                  onSelect={handleVersionSelect}
                />
              ))}
            </div>
          )}

          {/* Archivadas */}
          {groupedVersions.archived.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase bg-secondary">
                Archivadas
              </div>
              {groupedVersions.archived.map(version => (
                <VersionItem
                  key={version.id}
                  version={version}
                  isSelected={currentVersion.id === version.id}
                  onSelect={handleVersionSelect}
                />
              ))}
            </div>
          )}

          {/* Footer con información adicional */}
          <div className="p-3 border-t border-border">
            <div className="text-xs text-muted-foreground">
              Total: {filteredVersions.length} versiones
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionSelector;