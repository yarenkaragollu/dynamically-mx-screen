import React from 'react';
import {
  TextField,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Checkbox,
  FormControlLabel,
  Typography,
  Tooltip,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import { Field as SchemaField } from '../types/schema';
import { useField } from 'formik';
import InfoIcon from '@mui/icons-material/Info';

interface DynamicFieldProps {
  field: SchemaField;
  formatType: string;
  inputType: string;
  options?: string[];
  required?: boolean;
}

const DynamicField: React.FC<DynamicFieldProps> = ({ 
  field, 
  formatType, 
  inputType, 
  options,
  required = false
}) => {
  const theme = useTheme();
  const [formikField, meta] = useField(field.path);
  const hasError = meta.touched && !!meta.error;
  const helperText = hasError ? meta.error : undefined;

  // Define these variables before the conditional block
  const fieldTitle = field.documentationName || field.tag;
  const requiredBgColor = alpha(theme.palette.info.light, 0.15);
  const requiredStyle = required ? {
    backgroundColor: requiredBgColor,
    '& .MuiOutlinedInput-root': {
      backgroundColor: requiredBgColor,
    },
    '& .MuiInputBase-input': {
    },
  } : {};

  // Add specific handling for /AppHdr/Fr/FIId/FinInstnId/BICFI
  if (field.path === '/AppHdr/Fr/FIId/FinInstnId/BICFI') {
    return (
      <FormControl fullWidth error={hasError} required={required} sx={requiredStyle}>
        <InputLabel id={`${field.path}-label`}>{fieldTitle}</InputLabel>
        <Select
          labelId={`${field.path}-label`}
          id={field.path}
          label={fieldTitle}
          {...formikField} // Use formikField for value and onChange
          value={formikField.value || 'TGBATRISXXX'} // Ensure default value is set
        >
          <MenuItem value="TGBATRISXXX">TGBATRISXXX</MenuItem>
          <MenuItem value="TGBAMTMTXXX">TGBAMTMTXXX</MenuItem>
        </Select>
        <FormHelperText>{helperText}</FormHelperText>
      </FormControl>
    );
  }

  // fieldTitle is already defined above
  const fieldPlaceholder = field.tag;

  // requiredStyle is already defined above

  const renderField = () => {
    const commonTextFieldProps = {
      ...formikField,
      id: field.path,
      label: fieldTitle,
      placeholder: fieldPlaceholder,
      fullWidth: true,
      variant: "outlined" as const,
      error: hasError,
      helperText: helperText,
      required: required,
      sx: requiredStyle
    };
    
    const commonSelectProps = {
      ...formikField,
      labelId: `${field.path}-label`,
      id: field.path,
      label: fieldTitle,
      variant: "outlined" as const,
    };

    switch (inputType) {
      case 'text':
      case 'number':
      case 'datetime-local':
      case 'date':
        const specificProps = (inputType === 'datetime-local' || inputType === 'date') 
          ? { placeholder: '', InputLabelProps: { shrink: true } } 
          : {};
        return (
          <TextField
            {...commonTextFieldProps}
            type={inputType === 'number' ? 'number' : inputType}
            inputProps={inputType === 'number' ? { step: 0.01 } : {}}
            {...specificProps}
          />
        );
      case 'select':
        return (
          <FormControl fullWidth error={hasError} required={required} sx={requiredStyle}>
            <InputLabel id={`${field.path}-label`}>{fieldTitle}</InputLabel>
            <Select
               {...commonSelectProps}
            >
              {options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{helperText}</FormHelperText>
          </FormControl>
        );
      case 'checkbox':
        return (
          <FormControlLabel
            sx={requiredStyle}
            control={
              <Checkbox
                {...formikField}
                id={field.path}
                checked={!!formikField.value}
                color="primary"
                required={required}
              />
            }
            label={fieldTitle}
          />
        );
      default:
        return (
          <TextField
             {...commonTextFieldProps}
          />
        );
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box display="flex" alignItems="center" mb={0.5}>
        {field.documentationDefinition && (
          <Tooltip title={field.documentationDefinition} arrow>
            <InfoIcon fontSize="small" color="action" sx={{ mr: 1 }} />
          </Tooltip>
        )}
        <Typography variant="body2" fontWeight="500">
           {fieldTitle} 
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ml: 0.5}}>
           (ID: {field.id})
        </Typography>
      </Box>
      {renderField()}
    </Box>
  );
};

export default DynamicField; 