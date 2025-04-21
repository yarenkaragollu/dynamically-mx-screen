import React, { useState } from 'react';
import { Formik, Form, useFormikContext, Field as FormikField, ErrorMessage, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Container, Box, Button, Tabs, Tab, Typography, AppBar, TextField, FormControl, InputLabel, Select, MenuItem, FormHelperText, useTheme, alpha, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { Field, FormValues, FormatDefinition } from '../types/schema';
import FormSection from './FormSection';
import XmlPreview from './XmlPreview';
import { createInitialValues, generateXmlFromValues } from '../utils/xmlGenerator';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface MessageFormProps {
  headerFields: Field[];
  bodyFields: Field[];
  headerFormat: FormatDefinition;
  bodyFormat: FormatDefinition;
}

const MessageForm: React.FC<MessageFormProps> = ({ 
  headerFields, 
  bodyFields, 
  headerFormat, 
  bodyFormat 
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [generatedXml, setGeneratedXml] = useState('');
  const [isXmlTabEnabled, setIsXmlTabEnabled] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupMessageId, setPopupMessageId] = useState('');

  const getInitialValues = () => {
    const dynamicInitialValues = createInitialValues(headerFields, bodyFields, headerFormat, bodyFormat);
    return {
      birim: '',
      portfoy: '',
      mesajTipi: '',
      karsiBanka: '',
      referans: '',
      ...dynamicInitialValues,
    };
  };

  const createValidationSchema = () => {
    let dynamicValidationSchema: Yup.ObjectShape = {};
    const allFields = [...headerFields, ...bodyFields];

    const findAncestorControllerPaths = (path: string): string[] => {
        const controllers: string[] = [];
        let currentPath = path;
        while (currentPath.includes('/')) {
            const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
            if (!parentPath) break;
            const parentFieldDef = allFields.find(f => f.path === parentPath);
            if (parentFieldDef) {
                 if (parentFieldDef.minOccurs !== '1') {
                     controllers.push(parentPath);
                 }
            }
            currentPath = parentPath;
        }
        return controllers;
    };

    const processField = (field: Field, formatDefinition: FormatDefinition) => {
      if (field.xsdType) {
        const xsdType = formatDefinition.xsdTypes[field.xsdType];
        if (!xsdType) return;
        const baseType = formatDefinition.baseTypes[xsdType.baseType];
        if (!baseType) return;

        let validation: Yup.AnySchema;

        if (field.xsdType === 'CBPR_DateTime') {
            validation = Yup.date().typeError('Geçerli bir tarih giriniz').nullable();
        } else {
            switch (xsdType.baseType) {
              case 'string': validation = Yup.string().nullable(); break;
              case 'decimal': validation = Yup.number().typeError('Sayı olmalı').nullable(); break;
              case 'boolean': validation = Yup.boolean().nullable(); break;
              default: validation = Yup.string().nullable();
            }
        }

        if (xsdType.minLength && validation instanceof Yup.StringSchema) validation = validation.min(xsdType.minLength, `Min ${xsdType.minLength}`);
        if (xsdType.maxLength && validation instanceof Yup.StringSchema) validation = validation.max(xsdType.maxLength, `Maks ${xsdType.maxLength}`);
        if (xsdType.pattern && validation instanceof Yup.StringSchema) validation = validation.matches(new RegExp(xsdType.pattern), `Geçersiz format`);
        if (xsdType.minInclusive !== undefined && validation instanceof Yup.NumberSchema) validation = validation.min(xsdType.minInclusive, `Min ${xsdType.minInclusive}`);

        if (field.minOccurs === "1") {
            const ancestorControllers = findAncestorControllerPaths(field.path);
            if (ancestorControllers.length > 0) {
                validation = validation.when(ancestorControllers, {
                    is: (...values: any[]) => values.every(val => val === true),
                    then: schema => schema.required('Bu alan zorunludur (üst bölüm aktif)'),
                    otherwise: schema => schema.nullable(),
                });
            } else {
                 validation = validation.required('Bu alan zorunludur');
            }
        } else {
           validation = validation.nullable();
        }

        dynamicValidationSchema[field.path] = validation;
      }
    };

    headerFields.forEach(field => processField(field, headerFormat));
    bodyFields.forEach(field => processField(field, bodyFormat));

    const topLevelSchema = Yup.object({
        birim: Yup.string().required('Birim alanı zorunludur'),
        portfoy: Yup.string().nullable(),
        mesajTipi: Yup.string().required('Mesaj Tipi alanı zorunludur'),
        karsiBanka: Yup.string().required('Karşı Banka alanı zorunludur'),
        referans: Yup.string().nullable(),
    });

    dynamicValidationSchema = { ...topLevelSchema.fields, ...dynamicValidationSchema };
    return Yup.object().shape(dynamicValidationSchema);
  };

  const handleSubmit = (values: FormValues, actions: FormikHelpers<any>) => {
    const allFields = [...headerFields, ...bodyFields];
    let outputString = "Doldurulan Alanlar:\n====================\n";

    Object.entries(values).forEach(([path, value]) => {
      if (value !== null && value !== '' && value !== undefined && 
          !['birim', 'portfoy', 'mesajTipi', 'karsiBanka', 'referans'].includes(path) &&
          !path.endsWith('_enabled') && !path.endsWith('_selection')) {
        const fieldDefinition = allFields.find(f => f.path === path);
        const fieldName = fieldDefinition?.documentationName || fieldDefinition?.tag || path;
        let displayValue = value;
        if (typeof value === 'boolean') {
            displayValue = value ? 'Evet' : 'Hayır';
        }
        outputString += `${path} - ${fieldName}: ${displayValue}\n`;
      }
    });

    setGeneratedXml(outputString);
    setIsXmlTabEnabled(true); 
    setPopupMessageId(values['/AppHdr/BizMsgIdr'] || 'Referans Bulunamadı');
    setTabValue(2);

    actions.setSubmitting(false);
  };

  const TopFieldsSection = () => {
    const { setFieldValue, errors, touched } = useFormikContext<FormValues>();
    const theme = useTheme();

    const requiredFieldStyle = {
      backgroundColor: alpha(theme.palette.info.light, 0.1),
      borderRadius: theme.shape.borderRadius,
      '& .MuiOutlinedInput-root': {
          backgroundColor: alpha(theme.palette.info.light, 0.1),
      },
    };

    const handleClear = () => {
      setFieldValue('birim', '');
      setFieldValue('portfoy', '');
      setFieldValue('mesajTipi', '');
      setFieldValue('karsiBanka', '');
      setFieldValue('referans', '');
      setFieldValue('/AppHdr/To/FIId/FinInstnId/BICFI', '');
    };

    return (
      <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 1, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{ flexGrow: 1, minWidth: '150px' }}>
            <FormikField name="birim">
              {({ field }: any) => (
                <FormControl fullWidth size="small" required error={touched.birim && !!errors.birim} sx={requiredFieldStyle}>
                  <InputLabel>Birim</InputLabel>
                  <Select {...field} label="Birim">
                    <MenuItem value=""><em>Boş</em></MenuItem>
                    <MenuItem value="0">0 - SWIFT MERKEZI</MenuItem>
                  </Select>
                  <ErrorMessage name="birim" component={FormHelperText} />
                </FormControl>
              )}
            </FormikField>
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: '150px' }}>
            <FormikField name="portfoy">
              {({ field }: any) => (
                <FormControl fullWidth size="small">
                  <InputLabel>Portföy</InputLabel>
                  <Select {...field} label="Portföy">
                    <MenuItem value=""><em>Boş</em></MenuItem>
                    <MenuItem value="NOREF">NOREF</MenuItem>
                  </Select>
                </FormControl>
              )}
            </FormikField>
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: '150px' }}>
            <FormikField name="mesajTipi">
              {({ field }: any) => (
                <FormControl fullWidth size="small" required error={touched.mesajTipi && !!errors.mesajTipi} sx={requiredFieldStyle}>
                  <InputLabel>Mesaj Tipi</InputLabel>
                  <Select {...field} label="Mesaj Tipi">
                    <MenuItem value=""><em>Boş</em></MenuItem>
                    <MenuItem value="Pacs.008 STP">Pacs.008 STP</MenuItem>
                  </Select>
                  <ErrorMessage name="mesajTipi" component={FormHelperText} />
                </FormControl>
              )}
            </FormikField>
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: '150px' }}>
            <FormikField name="karsiBanka">
              {({ field }: any) => (
                <TextField
                  {...field}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newValue = e.target.value;
                    field.onChange(e);
                    setFieldValue('/AppHdr/To/FIId/FinInstnId/BICFI', newValue);
                  }}
                  fullWidth
                  required
                  size="small"
                  label="Karşı Banka"
                  error={touched.karsiBanka && !!errors.karsiBanka}
                  helperText={<ErrorMessage name="karsiBanka" />}
                  sx={requiredFieldStyle}
                />
              )}
            </FormikField>
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: '150px' }}>
            <FormikField name="referans">
              {({ field }: any) => (
                <TextField
                  {...field}
                  fullWidth
                  size="small"
                  label="Referans"
                />
              )}
            </FormikField>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexGrow: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' }, minWidth: '200px', pt: 3.5 }}>
            <Button variant="contained" color="secondary" size="medium" onClick={handleClear}>
              Temizle
            </Button>
            <Button variant="contained" color="success" size="medium" type="button"> 
              Oluştur
            </Button>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          SWIFT MX Mesaj Oluşturucu
        </Typography>

        <Formik
          initialValues={getInitialValues()}
          validationSchema={createValidationSchema()}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, errors, touched, validateForm, setTouched, values }) => {
             // Log isSubmitting state on each render
             console.log("[Formik Render] isSubmitting:", isSubmitting);

             const handleTabChangeWithValidation = async (event: React.SyntheticEvent, newValue: number) => {
                if (tabValue === 0 && newValue === 1) {
                    const headerPaths = headerFields.map(f => f.path);
                    const topFields = ['birim', 'portfoy', 'mesajTipi', 'karsiBanka', 'referans'];
                    const allHeaderKeys = [...topFields, ...headerPaths];
                    const touchObject = allHeaderKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {});
                    
                    await setTouched(touchObject, true);
                    const validationErrors = await validateForm();
                    const errorKeys = Object.keys(validationErrors);
                    
                    const headerErrorKeys = allHeaderKeys.filter(key => errorKeys.includes(key));
                    
                    if (headerErrorKeys.length > 0) {
                        console.log("Preventing tab switch due to Header errors:", headerErrorKeys);
                        return;
                    }
                }
                setTabValue(newValue);
             };

            return (
              <Form>
                <TopFieldsSection />
                <AppBar position="static" color="default" sx={{ mb: 3 }}>
                  <Tabs
                    value={tabValue}
                    onChange={handleTabChangeWithValidation}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                  >
                    <Tab label="Header (AppHdr)" />
                    <Tab label="Body" />
                    <Tab label="XML" disabled={!isXmlTabEnabled} />
                  </Tabs>
                </AppBar>

                <TabPanel value={tabValue} index={0}>
                  <FormSection
                    fields={headerFields}
                    formatDefinition={headerFormat}
                    title="Business Application Header"
                  />
                  <Box display="flex" justifyContent="flex-end" mt={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={(e) => handleTabChangeWithValidation(e, 1)}
                    >
                      İleri
                    </Button>
                  </Box>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <FormSection 
                    fields={bodyFields}
                    formatDefinition={bodyFormat}
                    title="Message Body"
                  />
                  <Box display="flex" justifyContent="space-between" mt={2}>
                    <Button
                      variant="outlined"
                      onClick={(e) => handleTabChangeWithValidation(e, 0)}
                    >
                      Geri
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      XML Oluştur
                    </Button>
                  </Box>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  <XmlPreview xml={generatedXml} />
                  <Box display="flex" justifyContent="space-between" mt={2}>
                    <Button
                      variant="outlined"
                      onClick={(e) => {
                        handleTabChangeWithValidation(e, 1);
                        setIsXmlTabEnabled(false); 
                      }}
                    >
                      Forma Geri Dön
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => setIsPopupOpen(true)}
                    >
                      Onayla
                    </Button>
                  </Box>
                </TabPanel>
              </Form>
            );
          }}
        </Formik>
      </Box>

      <Dialog
        open={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Onay</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {`${popupMessageId} referanslı mesajınız oluşturulmuştur.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPopupOpen(false)} color="primary" autoFocus>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default MessageForm; 