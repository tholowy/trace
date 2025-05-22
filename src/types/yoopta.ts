// Tipos para la integración con Yoopta.dev

// Tipos para YooptaEditor
export interface YooptaEditorProps {
  store: any;
  defaultValue?: any;
  onChange?: (content: any) => void;
  className?: string;
  readOnly?: boolean;
}

// Tipos para extensiones
export interface YooptaExtension {
  type: string;
  name: string;
  Icon?: React.FC;
  aliases?: string[];
  group?: string;
  Component: React.FC<YooptaNodeProps>;
  attributes?: Record<string, {
    default: any;
  }>;
}

export interface YooptaNodeProps {
  node: {
    attrs: Record<string, any>;
  };
  updateAttributes?: (attrs: Record<string, any>) => void;
  editor?: any;
  readOnly?: boolean;
}