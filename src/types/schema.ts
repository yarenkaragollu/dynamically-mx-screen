export interface Field {
  id: number;
  level: number;
  tag: string;
  path: string;
  parentPath: string;
  xsdType: string | null;
  minOccurs: string;
  maxOccurs: string;
  isChoice: boolean;
  documentationName: string;
  documentationDefinition: string;
  subPaths: string[];
}

export interface MessageDefinition {
  name: string;
  version: string;
  businessArea: string;
  msgDefId: string;
  fields: Field[];
}

export interface XsdTypeDefinition {
  name: string;
  documentationName: string;
  documentationDefinition: string;
  definitionType: string;
  restriction: {
    base: string;
    facets: any;
    enumerations: any[] | null;
  };
  list: any;
  union: any;
}

export interface XsdType {
  baseType: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  enumeration?: string[];
  totalDigits?: number;
  fractionDigits?: number;
  minInclusive?: number;
  hasAttribute?: boolean;
}

export interface BaseType {
  validation: string;
  inputType: string;
  defaultValue: any;
}

export interface FormatDefinition {
  xsdTypes: Record<string, XsdType>;
  baseTypes: Record<string, BaseType>;
}

export interface FormValues {
  [key: string]: any;
} 