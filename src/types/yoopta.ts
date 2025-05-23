// =============== TIPOS PARA YOOPTA INTEGRATION ===============

import type { YooptaContent } from ".";

export interface YooptaEditorProps {
  store: any;
  defaultValue?: YooptaContent;
  onChange?: (content: YooptaContent) => void;
  className?: string;
  readOnly?: boolean;
}

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
