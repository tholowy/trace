import React, { useState, useEffect } from "react";
import { Search, Filter, TrendingUp } from "lucide-react";
import { mermaidService } from "../services/mermaidService";
import type { MermaidDiagram, MermaidDiagramType } from "../services/mermaidService";

interface DiagramGalleryProps {
  projectId: string;
  onSelectDiagram?: (diagram: MermaidDiagram) => void;
  selectable?: boolean;
}

export const DiagramGallery: React.FC<DiagramGalleryProps> = ({
  projectId,
  onSelectDiagram,
  selectable = false,
}) => {
  const [diagrams, setDiagrams] = useState<MermaidDiagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<MermaidDiagramType | "all">(
    "all"
  );

  useEffect(() => {
    loadDiagrams();
  }, [projectId]);

  const loadDiagrams = async () => {
    try {
      setLoading(true);
      const projectDiagrams = await mermaidService.getProjectDiagrams(
        projectId
      );
      setDiagrams(projectDiagrams);
    } catch (error) {
      console.error("Error loading diagrams:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDiagrams = diagrams.filter((diagram) => {
    const matchesSearch =
      diagram.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diagram.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "all" || diagram.diagram_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return <div className="flex justify-center p-8">Cargando diagramas...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar diagramas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(e.target.value as MermaidDiagramType | "all")
          }
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="all">Todos los tipos</option>
          <option value="flowchart">Diagrama de Flujo</option>
          <option value="sequence">Secuencia</option>
          <option value="gantt">Gantt</option>
          <option value="pie">Circular</option>
          <option value="class">Clases</option>
          <option value="er">ER</option>
          <option value="state">Estados</option>
        </select>
      </div>

      {/* Lista de Diagramas */}
      {filteredDiagrams.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          No se encontraron diagramas
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDiagrams.map((diagram) => (
            <div
              key={diagram.id}
              className={`border rounded-lg p-4 ${
                selectable
                  ? "cursor-pointer hover:shadow-lg hover:border-blue-300"
                  : ""
              }`}
              onClick={() => selectable && onSelectDiagram?.(diagram)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-900 truncate">
                  {diagram.title}
                </h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {diagram.diagram_type}
                </span>
              </div>

              {diagram.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {diagram.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Tema: {diagram.theme}</span>
                <span>{new Date(diagram.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
