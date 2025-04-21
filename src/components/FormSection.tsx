import React, { useMemo } from 'react';
import {
  Typography,
  Paper,
  Box,
  Divider,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Checkbox,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Field as SchemaField, FormatDefinition } from '../types/schema';
import DynamicField from './DynamicField';
import InfoIcon from '@mui/icons-material/Info';
import { useFormikContext } from 'formik';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import { ErrorMessage } from 'formik';

interface FormSectionProps {
  fields: SchemaField[];
  formatDefinition: FormatDefinition;
  title: string;
}

interface FieldNode {
  field: SchemaField;
  children: FieldNode[];
}

// XML ağacını oluştur
const buildFieldTree = (fields: SchemaField[], parentPath: string = "/"): FieldNode[] => {
  const nodes: FieldNode[] = [];
  
  // Bu parent'a ait tüm field'ları bul
  const childFields = fields.filter(f => f.parentPath === parentPath);
  
  // Level'e göre sırala
  childFields.sort((a, b) => a.level - b.level);
  
  for (const field of childFields) {
    const children = buildFieldTree(fields, field.path);
    nodes.push({
      field,
      children
    });
  }
  
  return nodes;
};

// Recursive olarak alt alanları temizleme fonksiyonu
const clearChildValues = (node: FieldNode, setFieldValue: Function, values: any, allFields: SchemaField[]) => {
  if (node.field.xsdType) {
    setFieldValue(node.field.path, ''); // Basit alanları temizle
  }
  if (node.field.isChoice) {
    setFieldValue(`${node.field.path}_selection`, ''); // Choice seçimini temizle
  }
  if (!node.field.xsdType && node.field.minOccurs === "0") {
      setFieldValue(`${node.field.path}_enabled`, false); // Opsiyonel grup checkbox'ını temizle
  }
  node.children.forEach(child => clearChildValues(child, setFieldValue, values, allFields));
};

const FormSection: React.FC<FormSectionProps> = ({ fields, formatDefinition, title }) => {
  const { values, setFieldValue } = useFormikContext<any>();
  
  // XML ağacını oluştur
  const fieldTree = useMemo(() => {
    const filteredFields = fields.filter(f => f.level >= 0);
    return buildFieldTree(filteredFields);
  }, [fields]);

  const getFieldFormat = (field: SchemaField) => {
    if (!field.xsdType) return { formatType: 'group', inputType: 'none', options: undefined };
    
    const xsdType = formatDefinition.xsdTypes[field.xsdType];
    if (!xsdType) return { formatType: 'string', inputType: 'text', options: undefined };

    const baseType = formatDefinition.baseTypes[xsdType.baseType];
    if (!baseType) return { formatType: 'string', inputType: 'text', options: undefined };

    return {
      formatType: xsdType.baseType,
      inputType: xsdType.enumeration ? 'select' : baseType.inputType,
      options: xsdType.enumeration
    };
  };

  const renderFieldNode = (node: FieldNode, level = 0, allFields: SchemaField[]): React.ReactNode => {
    const { field, children } = node;
    // console.log(`Rendering Node: ${field.path} (ID: ${field.id}, isChoice: ${field.isChoice}, xsdType: ${field.xsdType}, Children: ${children.length})`); 
    
    const isRequired = field.minOccurs === "1";
    const isOptionalGroup = !field.xsdType && field.minOccurs === "0" && children.length > 0;
    const enabledPath = `${field.path}_enabled`;
    const isEnabled = isOptionalGroup ? !!values[enabledPath] : true; 
    
    // --- Parent Kontrolleri (Render etmeden önce) ---
    const parentField = allFields.find(f => f.path === field.parentPath);
    // 1. Parent opsiyonel ve kapalıysa render etme
    if (parentField && !parentField.xsdType && parentField.minOccurs === "0") {
        const parentEnabledPath = `${parentField.path}_enabled`;
        if (!values[parentEnabledPath]) {
            // console.log(`  -> Parent Optional Group (${parentField.path}) Disabled - Skipping ${field.path}`);
            return null;
        }
    }
    // 2. Parent choice ise ve bu seçenek seçili değilse render etme (BU KONTROL İLGİLİ YERDE YAPILACAK)

    // --- Render Logic ---

    // 1. Gruplama Alanı (Akordeon, !isChoice)
    if (!field.xsdType && children.length > 0 && !field.isChoice) {
      //  console.log(`  -> Rendering as Group/Accordion: ${field.path}`);
       const handleOptionalGroupChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            const checked = event.target.checked;
            setFieldValue(enabledPath, checked);
            if (!checked) {
                children.forEach(childNode => clearChildValues(childNode, setFieldValue, values, allFields));
            }
        };
        
      return (
        <Box key={field.path + "-group"} sx={{ ml: level * 1, my: 1 }}>
          <Accordion 
             expanded={isOptionalGroup ? isEnabled : undefined}
             onChange={isOptionalGroup ? (event, isExpanded) => {
                if (!isEnabled) {
                    event.preventDefault(); 
                    event.stopPropagation();
                }
             } : undefined}
            defaultExpanded={isRequired && !isOptionalGroup}
            sx={{ boxShadow: 'none', border: '1px solid #e0e0e0', '&:before': { display: 'none' } }}
          >
            <AccordionSummary
              expandIcon={isOptionalGroup && !isEnabled ? null : <ExpandMoreIcon />} 
              aria-controls={`${field.path}-content`}
              id={`${field.path}-header`}
              sx={{ 
                backgroundColor: isOptionalGroup && !isEnabled ? '#eeeeee' : '#f0f0f0',
                opacity: isOptionalGroup && !isEnabled ? 0.7 : 1, 
                cursor: 'pointer' 
              }}
            >
              <Box display="flex" alignItems="center" width="100%" >
                 {isOptionalGroup && (
                    <Checkbox 
                       checked={isEnabled}
                       onChange={handleOptionalGroupChange} 
                       onClick={(e) => e.stopPropagation()}
                       size="small"
                       sx={{ mr: 1, p: 0.5 }}
                    />
                 )}
                 {field.documentationDefinition && (
                  <Tooltip title={field.documentationDefinition} arrow>
                    <InfoIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                  </Tooltip>
                )}
                <Typography 
                    variant="subtitle1" 
                    fontWeight="bold" 
                    sx={{ flexGrow: 1, opacity: isOptionalGroup && !isEnabled ? 0.6 : 1 }}
                    onClick={isOptionalGroup ? (e) => { 
                        e.stopPropagation(); 
                        handleOptionalGroupChange({ target: { checked: !isEnabled } } as React.ChangeEvent<HTMLInputElement>); 
                    } : undefined}
                >
                  {`${field.documentationName || field.tag} (ID: ${field.id})`}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                  (Group {isRequired ? '- Zorunlu' : '- Opsiyonel'})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 2 }}>
              {isEnabled && children.map(childNode => renderFieldNode(childNode, level + 1, allFields))}
            </AccordionDetails>
          </Accordion>
        </Box>
      );
    }
    
    // 2. Choice Alanı (Select)
    if (field.isChoice && children.length > 0) {
      //  console.log(`  -> Rendering as Choice/Select: ${field.path}`);
        const selectionPath = `${field.path}_selection`;
        const selectedTag = values[selectionPath];
             
      return (
        <Box key={field.path + "-choice-" + field.id} sx={{ ml: level * 1, my: 2, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
          <FormControl fullWidth required={isRequired}>
            <InputLabel id={`${field.path}-label`}>{`${field.documentationName || field.tag} (ID: ${field.id})`}</InputLabel>
            <Select
              labelId={`${field.path}-label`}
              id={field.path}
              value={selectedTag || ''}
              label={`${field.documentationName || field.tag} (ID: ${field.id})`}
              onChange={(e) => {
                // console.log(`  -> Choice Selection Changed: ${field.path} = ${e.target.value}`);
                 const newSelectedTag = e.target.value as string;
                 const previousSelectionNode = children.find(c => c.field.tag === selectedTag);
                 if(previousSelectionNode) {
                  //   console.log(`    -> Clearing previous selection children: ${previousSelectionNode.field.tag}`);
                     clearChildValues(previousSelectionNode, setFieldValue, values, allFields);
                 }
                 setFieldValue(selectionPath, newSelectedTag);
              }}
            >
              <MenuItem value=""><em>Seçiniz</em></MenuItem>
              {children.map(childNode => (
                <MenuItem key={childNode.field.tag + "-" + childNode.field.id} value={childNode.field.tag}>
                  {childNode.field.documentationName || childNode.field.tag}
                </MenuItem>
              ))}
            </Select>
             {field.documentationDefinition && <FormHelperText>{field.documentationDefinition}</FormHelperText>} 
          </FormControl>
          
          {selectedTag && (() => {
            //  console.log(`  -> Rendering selected choice content for: ${selectedTag}`);
              const selectedNode = children.find(childNode => childNode.field.tag === selectedTag);
              if (selectedNode) {
                //   console.log(`    -> Found selected node: ${selectedNode.field.path}`);
                  return (
                    <Box key={selectedTag + "-content"} sx={{ mt: 2, borderLeft: '1px solid #eee', pl: 2 }}>
                      {renderFieldNode(selectedNode, level + 1, allFields)}
                    </Box>
                  );
              } else {
                //   console.log(`    -> Selected node NOT FOUND for tag: ${selectedTag}`);
                   return null;
              }
          })()}
        </Box>
      );
    }
    
    // 3. Basit Alan (Input, vb.)
    if (field.xsdType && !field.isChoice) {
      //  console.log(`  -> Checking Simple Field: ${field.path}`);
        // Parent choice kontrolü
        if (parentField && parentField.isChoice) {
            const parentSelectionPath = `${parentField.path}_selection`;
            if (values[parentSelectionPath] !== field.tag) {
              // console.log(`    -> Parent Choice (${parentField.path}) selected is ${values[parentSelectionPath]}, not ${field.tag}. Skipping ${field.path}`);
              return null; // Bu seçenek seçili değilse, bu dalı render etme
            }
            // console.log(`    -> Parent Choice (${parentField.path}) selected is ${field.tag}. Rendering ${field.path}`);
        } else {
            // console.log(`    -> Not a child of a choice or parent choice selected. Rendering ${field.path}`);
        }

        const { formatType, inputType, options } = getFieldFormat(field);
        const fieldLabel = `${field.documentationName || field.tag} (ID: ${field.id})`;
        const fieldProps = {
          name: field.path,
          label: fieldLabel,
          required: isRequired,
          'data-testid': field.path, // Add data-testid
          documentation: field.documentationDefinition
        };
        
        // Check if it's CBPR_DateTime
        if (field.xsdType === 'CBPR_DateTime') {
           // console.log(`  -> Rendering as DateTimePicker: ${field.path}`);
           return (
             <Box key={field.path + '-datetime-box'} sx={{ ml: level * 1, my: 1.5, width: '100%' }}>
               <DateTimePicker
                 label={fieldProps.label}
                 value={values[field.path] ? dayjs(values[field.path]) : null} // Convert string to dayjs object
                 onChange={(newValue) => {
                   // Convert back to full ISO string (includes Z/milliseconds)
                   const formattedValue = newValue ? newValue.toISOString() : null; 
                   // console.log(`Setting ${field.path} back to ISOString: ${formattedValue}`);
                   setFieldValue(field.path, formattedValue);
                 }}
                 // Use TextField component for styling consistency and error display
                 slotProps={{
                     textField: {
                         fullWidth: true,
                         size: 'small',
                         required: fieldProps.required,
                         // Use ErrorMessage directly for simpler structure and avoid nesting issues
                         helperText: <ErrorMessage name={field.path} component="div" />,
                         error: !!(values.touched && values.touched[field.path] && values.errors && values.errors[field.path]), // Show error state
                         InputLabelProps: { shrink: true } // Ensure label doesn't overlap
                     }
                 }}
               />
                {fieldProps.documentation && <FormHelperText sx={{ ml: 1.75 }}>{fieldProps.documentation}</FormHelperText>}
             </Box>
           );
        } else {
           // console.log(`  -> Rendering as DynamicField: ${field.path} (Type: ${inputType})`);
            // Render standard DynamicField for other types
           return (
              <Box key={field.path + '-dynamic-box'} sx={{ ml: level * 1, my: 1.5, width: '100%' }}>
                 <DynamicField
                   key={field.path}
                   field={field}
                   {...fieldProps} // name, label, required, data-testid, documentation
                   formatType={formatType}
                   inputType={inputType}
                   options={options}
                 />
               </Box>
           );
        }
    }

   // console.log(`  -> No render condition met for: ${field.path} - Returning null`);
    return null;
  };

   return (
    <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #e0e0e0' }}>
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Box mt={2}>
        {fieldTree.map(node => renderFieldNode(node, 0, fields))}
      </Box>
    </Paper>
  );
};

export default FormSection; 