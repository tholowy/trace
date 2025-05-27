import { supabase } from '../lib/supabase';

export interface MermaidDiagram {
  id: string;
  project_id: string;
  page_id?: string;
  title: string;
  description?: string;
  mermaid_code: string;
  diagram_type: MermaidDiagramType;
  theme: MermaidTheme;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export type MermaidDiagramType = 
  | 'flowchart' 
  | 'sequence' 
  | 'gantt' 
  | 'pie' 
  | 'gitgraph' 
  | 'er' 
  | 'journey' 
  | 'class'
  | 'state'
  | 'requirement';

export type MermaidTheme = 'default' | 'dark' | 'forest' | 'neutral';

export interface CreateMermaidDiagramOptions {
  projectId: string;
  pageId?: string;
  title: string;
  description?: string;
  mermaidCode: string;
  diagramType: MermaidDiagramType;
  theme?: MermaidTheme;
  isPublic?: boolean;
}

class MermaidService {
  async createDiagram(options: CreateMermaidDiagramOptions): Promise<MermaidDiagram> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('mermaid_diagrams')
      .insert({
        project_id: options.projectId,
        page_id: options.pageId,
        title: options.title,
        description: options.description,
        mermaid_code: options.mermaidCode,
        diagram_type: options.diagramType,
        theme: options.theme || 'default',
        is_public: options.isPublic ?? true,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateDiagram(
    diagramId: string, 
    updates: Partial<Pick<MermaidDiagram, 'title' | 'description' | 'mermaid_code' | 'theme' | 'is_public'>>
  ): Promise<MermaidDiagram> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('mermaid_diagrams')
      .update({
        ...updates,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', diagramId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getDiagram(diagramId: string): Promise<MermaidDiagram | null> {
    const { data, error } = await supabase
      .from('mermaid_diagrams')
      .select('*')
      .eq('id', diagramId)
      .single();

    if (error) return null;
    return data;
  }

  async getProjectDiagrams(projectId: string): Promise<MermaidDiagram[]> {
    const { data, error } = await supabase
      .from('mermaid_diagrams')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getPageDiagrams(pageId: string): Promise<MermaidDiagram[]> {
    const { data, error } = await supabase
      .from('mermaid_diagrams')
      .select('*')
      .eq('page_id', pageId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async deleteDiagram(diagramId: string): Promise<void> {
    const { error } = await supabase
      .from('mermaid_diagrams')
      .delete()
      .eq('id', diagramId);

    if (error) throw error;
  }

  async exportDiagramAsSVG(mermaidCode: string, theme: MermaidTheme = 'default'): Promise<string> {
    // Usar Mermaid para generar SVG
    const mermaid = await import('mermaid');
    
    mermaid.default.initialize({
      theme,
      startOnLoad: false,
      fontFamily: 'Inter, system-ui, sans-serif'
    });

    try {
      const { svg } = await mermaid.default.render('temp-diagram', mermaidCode);
      return svg;
    } catch (error) {
      console.error('Error generating SVG:', error);
      throw new Error('Error al generar el diagrama');
    }
  }

  validateMermaidCode(code: string, type: MermaidDiagramType): boolean {
    // Validación básica según el tipo de diagrama
    const typeKeywords = {
      flowchart: ['graph', 'flowchart'],
      sequence: ['sequenceDiagram'],
      gantt: ['gantt'],
      pie: ['pie'],
      gitgraph: ['gitGraph'],
      er: ['erDiagram'],
      journey: ['journey'],
      class: ['classDiagram'],
      state: ['stateDiagram'],
      requirement: ['requirementDiagram']
    };

    const keywords = typeKeywords[type];
    return keywords.some(keyword => 
      code.trim().toLowerCase().startsWith(keyword.toLowerCase())
    );
  }

  getTemplateByType(type: MermaidDiagramType): string {
    const templates = {
      flowchart: `graph TD
    A[Inicio] --> B{¿Decisión?}
    B -->|Sí| C[Acción 1]
    B -->|No| D[Acción 2]
    C --> E[Fin]
    D --> E`,
      
      sequence: `sequenceDiagram
    participant A as Actor A
    participant B as Actor B
    A->>B: Mensaje 1
    B-->>A: Respuesta 1
    A->>B: Mensaje 2
    B-->>A: Respuesta 2`,
      
      gantt: `gantt
    title Cronograma del Proyecto
    dateFormat  YYYY-MM-DD
    section Fase 1
    Tarea 1           :done,    des1, 2024-01-01,2024-01-05
    Tarea 2           :active,  des2, 2024-01-06, 3d
    section Fase 2
    Tarea 3           :         des3, after des2, 5d
    Tarea 4           :         des4, after des3, 5d`,
      
      pie: `pie title Distribución de Recursos
    "Desarrollo" : 45
    "Testing" : 25
    "Documentación" : 20
    "Mantenimiento" : 10`,
      
      class: `classDiagram
    class Usuario {
        +String nombre
        +String email
        +login()
        +logout()
    }
    
    class Administrador {
        +String permisos
        +gestionarUsuarios()
    }
    
    Usuario <|-- Administrador`,
      
      er: `erDiagram
    USUARIO ||--o{ PROYECTO : posee
    PROYECTO ||--o{ PAGINA : contiene
    PAGINA ||--o{ IMAGEN : incluye
    
    USUARIO {
        uuid id
        string nombre
        string email
    }
    
    PROYECTO {
        uuid id
        string nombre
        text descripcion
    }`,
      
      state: `stateDiagram-v2
    [*] --> Borrador
    Borrador --> EnRevision : enviar
    EnRevision --> Aprobado : aprobar
    EnRevision --> Borrador : rechazar
    Aprobado --> Publicado : publicar
    Publicado --> [*]`,
      
      journey: `journey
    title Experiencia del Usuario
    section Registro
      Visitar sitio: 5: Usuario
      Crear cuenta: 3: Usuario
      Verificar email: 2: Usuario
    section Uso
      Iniciar sesión: 4: Usuario
      Crear proyecto: 5: Usuario
      Invitar colaboradores: 3: Usuario`,
      
      gitgraph: `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit`,
      
      requirement: `requirementDiagram
    requirement Sistema {
        id: 1
        text: El sistema debe ser seguro
        risk: high
        verifymethod: test
    }
    
    functionalRequirement Autenticación {
        id: 1.1
        text: Los usuarios deben autenticarse
        risk: medium
        verifymethod: inspection
    }
    
    Sistema - satisfies -> Autenticación`
    };

    return templates[type] || '';
  }
}

export const mermaidService = new MermaidService();