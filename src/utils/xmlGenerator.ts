import { Field, FormValues, FormatDefinition } from "../types/schema";
import xmlFormatter from "xml-formatter";
import dayjs from 'dayjs';

interface FieldNode {
  field: Field;
  children: FieldNode[];
}

// XML ağacını oluştur
const buildFieldTree = (fields: Field[], parentPath: string = "/"): FieldNode[] => {
  const nodes: FieldNode[] = [];
  
  // Bu parent'a ait tüm field'ları bul
  const childFields = fields.filter(f => f.parentPath === parentPath);
  
  for (const field of childFields) {
    const children = buildFieldTree(fields, field.path);
    nodes.push({
      field,
      children
    });
  }
  
  return nodes;
};

// XML elemanı oluştur
const createXmlElement = (
  node: FieldNode,
  values: FormValues,
  indent: number = 0
): string => {
  const indentStr = "  ".repeat(indent);
  const fieldTag = node.field.tag;
  const fieldPath = node.field.path;
  const fieldValue = values[fieldPath];

  if (node.children.length > 0) {
    // Alt eleman içeren kompleks bir tip
    
    // Eğer bu bir choice ise ve seçili değilse, atla
    const parentField = fields.find(f => f.path === node.field.parentPath);
    if (parentField && parentField.isChoice) {
      const parentSelectionPath = `${parentField.path}_selection`;
      if (values[parentSelectionPath] !== fieldTag) {
        return ""; // Bu dalı dahil etme
      }
    }
    
    const childrenContent = node.children
      .map(childNode => {
        return createXmlElement(childNode, values, indent + 1);
      })
      .filter(Boolean)
      .join("");

    if (!childrenContent) return "";

    return `${indentStr}<${fieldTag}>\n${childrenContent}${indentStr}</${fieldTag}>\n`;
  } else {
    // Basit tip
    if (fieldValue === undefined || fieldValue === null || fieldValue === "") {
      // Zorunlu olmayan boş alanları atla
      if(node.field.minOccurs !== "1") return ""; 
      // Zorunluysa boş tag olarak ekle
      else return `${indentStr}<${fieldTag}></${fieldTag}>\n`;
    }
    
    // Parent'ı bir choice ise ve bu seçenek seçili değilse atla
    const parentField = fields.find(f => f.path === node.field.parentPath);
    if (parentField && parentField.isChoice) {
      const parentSelectionPath = `${parentField.path}_selection`;
      if (values[parentSelectionPath] !== fieldTag) {
        return ""; // Bu alanı dahil etme
      }
    }
    
    return `${indentStr}<${fieldTag}>${fieldValue}</${fieldTag}>\n`;
  }
};

// Bu fonksiyon global scope'da çalışacak şekilde tanımlanmalı
let fields: Field[] = []; // Global field listesi (veya daha iyi bir scope yönetimi)

export const generateXmlFromValues = (
  values: FormValues,
  headerFields: Field[],
  bodyFields: Field[]
): string => {
  // Global fields listesini güncelle
  fields = [...headerFields, ...bodyFields];

  // Header ve Body için ağaç yapılarını oluştur
  // buildFieldTree çağrıları `fields` kullanacak şekilde güncellenmeli (bu örnekte direkt field listelerini kullanıyoruz)
  const headerRoots = buildFieldTree(headerFields); // Root /AppHdr olmalı
  const bodyRoots = buildFieldTree(bodyFields);     // Root /Document/<BodyTag> olmalı
  
  // Namespace için MsgDefIdr bul
  const messageDefIdField = headerFields.find(f => f.tag === "MsgDefIdr");
  const namespaceURI = messageDefIdField ? values[messageDefIdField.path] : "urn:iso:std:iso:20022:tech:xsd:head.001.001.02";
  
  // Body elementinin tag adını bul
  const bodyRootNode = bodyFields.find(f => f.level === 0);
  const bodyTag = bodyRootNode ? bodyRootNode.tag : "Body"; // Body'nin root tag'ını al

  // XML içeriğini oluştur
  let xmlHeader = "";
  let xmlBody = "";
  
  // AppHdr içeriğini oluştur (AppHdr node'undan başlayarak)
  const appHdrNode = headerRoots.find(node => node.field.tag === 'AppHdr');
  if (appHdrNode) {
    xmlHeader = appHdrNode.children
      .map(node => createXmlElement(node, values, 2)) // AppHdr'ın çocuklarından başla
      .filter(Boolean)
      .join("");
  }
  
  // Body içeriğini oluştur (Body root node'unun çocuklarından başlayarak)
  const bodyRootNodeTree = bodyRoots.find(node => node.field.tag === bodyTag);
   if (bodyRootNodeTree) {
      xmlBody = bodyRootNodeTree.children
        .map(node => createXmlElement(node, values, 2))
        .filter(Boolean)
        .join("");
  }
  
  // Final XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:${namespaceURI}">
  <AppHdr>
${xmlHeader}  </AppHdr>
  <${bodyTag}>
${xmlBody}  </${bodyTag}>
</Document>`;

  return xmlFormatter(xml, {
    indentation: "  ",
    collapseContent: true,
  });
};

export const createInitialValues = (
  headerFields: Field[],
  bodyFields: Field[],
  headerFormat: FormatDefinition,
  bodyFormat: FormatDefinition
): FormValues => {
  const initialValues: FormValues = {};

  const processFields = (fields: Field[], formatDefinition: FormatDefinition) => {
    const nowFormatted = dayjs().format('YYYY-MM-DDTHH:mm:ss');
    
    for (const field of fields) {
      if (field.xsdType) {
        if (field.xsdType === 'CBPR_DateTime') {
          initialValues[field.path] = nowFormatted;
        } else {
          initialValues[field.path] = "";
        }
      }
      
      if (field.isChoice && field.subPaths.length > 0) {
        initialValues[`${field.path}_selection`] = "";
      }

      if (!field.xsdType && field.minOccurs === "0" && field.subPaths.length > 0) {
          initialValues[`${field.path}_enabled`] = false;
      }
    }
  };

  processFields(headerFields, headerFormat);
  processFields(bodyFields, bodyFormat);

  return initialValues;
}; 