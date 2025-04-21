import React, { useState, useEffect } from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import MessageForm from './components/MessageForm';
import { Field, FormatDefinition } from './types/schema';

// JSON dosyalarını import et
import headerSchemaData from './data/head.001.001.02.json';
import headerFormatData from './data/format_head.001.001.02.json';
import bodySchemaData from './data/CBPRPlus_SR2024_(Combined)_CBPRPlus-pacs_008_001_08_FIToFICustomerCreditTransfer_20250321_1308_iso15enriched.json';
import bodyFormatData from './data/format_CBPRPlus_SR2024_(Combined)_CBPRPlus-pacs_008_001_08_FIToFICustomerCreditTransfer_20250321_1308_iso15enriched.json';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4caf50',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

// Format tanımlarını dönüştür
const convertToFormatDefinition = (formatData: any): FormatDefinition => {
  // Format_head dosyası bir array, format_body_008 dosyası ise bir obje
  if (Array.isArray(formatData)) {
    // Header format dosyası için
    const xsdTypes: Record<string, any> = {};
    
    formatData.forEach(type => {
      const baseType = type.restriction?.base?.replace('xs:', '') || 'string';
      
      xsdTypes[type.name] = {
        baseType: baseType,
        minLength: type.restriction?.facets?.minLength,
        maxLength: type.restriction?.facets?.maxLength,
        pattern: type.restriction?.facets?.pattern,
        enumeration: type.restriction?.enumerations?.map((e: any) => e.value)
      };
    });
    
    return {
      xsdTypes,
      baseTypes: {
        string: { validation: 'text', inputType: 'text', defaultValue: '' },
        decimal: { validation: 'number', inputType: 'number', defaultValue: 0 },
        dateTime: { validation: 'date', inputType: 'datetime-local', defaultValue: '' },
        date: { validation: 'date', inputType: 'date', defaultValue: '' },
        boolean: { validation: 'boolean', inputType: 'checkbox', defaultValue: false },
        complex: { validation: 'none', inputType: 'none', defaultValue: null }
      }
    };
  } else {
    // Body format dosyası için (zaten doğru formatta)
    return formatData as FormatDefinition;
  }
};

function App() {
  const [headerFields, setHeaderFields] = useState<Field[]>([]);
  const [bodyFields, setBodyFields] = useState<Field[]>([]);
  const [headerFormat, setHeaderFormat] = useState<FormatDefinition | null>(null);
  const [bodyFormat, setBodyFormat] = useState<FormatDefinition | null>(null);

  useEffect(() => {
    // JSON verilerini yükle
    setHeaderFields(headerSchemaData as unknown as Field[]);
    setBodyFields(bodySchemaData as unknown as Field[]);
    
    // Format tanımlarını dönüştür
    setHeaderFormat(convertToFormatDefinition(headerFormatData));
    setBodyFormat(convertToFormatDefinition(bodyFormatData));
  }, []);

  if (headerFields.length === 0 || bodyFields.length === 0 || !headerFormat || !bodyFormat) {
    return <div>Şemalar yükleniyor...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MessageForm 
        headerFields={headerFields} 
        bodyFields={bodyFields}
        headerFormat={headerFormat}
        bodyFormat={bodyFormat}
      />
    </ThemeProvider>
  );
}

export default App;
