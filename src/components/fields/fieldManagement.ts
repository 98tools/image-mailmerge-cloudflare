import { QRCodeFieldData } from '../QRCodeField';
import { TextField, Field, FieldMapping, CSVRow } from '../types/fieldTypes';

// Field creation utilities
export const createTextField = (name: string, x: number, y: number): TextField => {
  return {
    type: 'text',
    name: name,
    x: x,
    y: y,
    fontSize: 24,
    fontFamily: 'Arial, sans-serif',
    color: '#000000',
    demoText: '',
    textAlign: 'left'
  };
};

export const createQRField = (name: string, x: number, y: number): QRCodeFieldData => {
  return {
    type: 'qrcode',
    name: name,
    x: x,
    y: y,
    size: 50,
    color: '#000000',
    backgroundColor: null,
    demoText: ''
  };
};

// Field management utilities
export const addFieldToList = (
  field: Field,
  setFields: React.Dispatch<React.SetStateAction<Field[]>>,
  setFieldMappings: React.Dispatch<React.SetStateAction<FieldMapping[]>>
) => {
  setFields(prev => [...prev, field]);
  
  // Add empty mapping for new field
  setFieldMappings(prev => [...prev, {
    fieldName: field.name,
    csvColumn: null
  }]);
};

export const removeFieldFromList = (
  index: number,
  fields: Field[],
  setFields: React.Dispatch<React.SetStateAction<Field[]>>,
  setFieldMappings: React.Dispatch<React.SetStateAction<FieldMapping[]>>
) => {
  const fieldToRemove = fields[index];
  setFields(prev => prev.filter((_, i) => i !== index));
  // Remove mapping by field name, not by index
  setFieldMappings(prev => prev.filter(mapping => mapping.fieldName !== fieldToRemove.name));
};

export const clearAllFields = (
  setFields: React.Dispatch<React.SetStateAction<Field[]>>,
  setFieldMappings: React.Dispatch<React.SetStateAction<FieldMapping[]>>
) => {
  setFields([]);
  setFieldMappings([]);
};

// Field update utilities
export const updateTextField = (
  index: number,
  property: keyof TextField,
  value: any,
  setFields: React.Dispatch<React.SetStateAction<Field[]>>,
  setFieldMappings?: React.Dispatch<React.SetStateAction<FieldMapping[]>>
) => {
  setFields(prev => prev.map((field, i) => {
    if (i === index && field.type === 'text') {
      const updatedField = { ...field, [property]: value };
      
      // If the field name is being changed, update the mapping as well
      if (property === 'name' && typeof value === 'string' && setFieldMappings) {
        setFieldMappings(prevMappings => prevMappings.map(mapping =>
          mapping.fieldName === field.name ? { ...mapping, fieldName: value } : mapping
        ));
      }
      
      return updatedField;
    }
    return field;
  }));
};

export const updateQRField = (
  index: number,
  property: keyof QRCodeFieldData,
  value: any,
  setFields: React.Dispatch<React.SetStateAction<Field[]>>,
  setFieldMappings?: React.Dispatch<React.SetStateAction<FieldMapping[]>>
) => {
  setFields(prev => prev.map((field, i) => {
    if (i === index && field.type === 'qrcode') {
      const updatedField = { ...field, [property]: value };
      
      // If the field name is being changed, update the mapping as well
      if (property === 'name' && typeof value === 'string' && setFieldMappings) {
        setFieldMappings(prevMappings => prevMappings.map(mapping =>
          mapping.fieldName === field.name ? { ...mapping, fieldName: value } : mapping
        ));
      }
      
      return updatedField;
    }
    return field;
  }));
};

// Generic field update for common properties
export const updateField = (
  index: number,
  property: 'name' | 'demoText' | 'color' | 'x' | 'y',
  value: any,
  setFields: React.Dispatch<React.SetStateAction<Field[]>>,
  setFieldMappings?: React.Dispatch<React.SetStateAction<FieldMapping[]>>
) => {
  setFields(prev => prev.map((field, i) => {
    if (i === index) {
      const updatedField = { ...field, [property]: value };
      
      // If the field name is being changed, update the mapping as well
      if (property === 'name' && typeof value === 'string' && setFieldMappings) {
        setFieldMappings(prevMappings => prevMappings.map(mapping =>
          mapping.fieldName === field.name ? { ...mapping, fieldName: value } : mapping
        ));
      }
      
      return updatedField;
    }
    return field;
  }));
};

// Field display utilities
export const getFieldDisplayText = (
  field: Field,
  csvData: CSVRow[] | null,
  currentCsvRowIndex: number,
  fieldMappings: FieldMapping[],
  useActualData: boolean = true
): string => {
  if (!useActualData || !csvData) return field.demoText;
  
  const rowData = csvData[currentCsvRowIndex];
  if (!rowData) return field.demoText;
  
  const mapping = fieldMappings.find(m => m.fieldName === field.name);
  if (!mapping?.csvColumn) return field.demoText;
  
  const csvValue = rowData[mapping.csvColumn];
  return csvValue && csvValue.trim() ? csvValue : field.demoText;
};

// Field mapping utilities
export const updateFieldMapping = (
  fieldName: string,
  csvColumn: string,
  setFieldMappings: React.Dispatch<React.SetStateAction<FieldMapping[]>>
) => {
  setFieldMappings(prev => prev.map(mapping => 
    mapping.fieldName === fieldName 
      ? { ...mapping, csvColumn } 
      : mapping
  ));
};

export const clearFieldMappings = (
  fields: Field[],
  setFieldMappings: React.Dispatch<React.SetStateAction<FieldMapping[]>>
) => {
  setFieldMappings(fields.map(field => ({ fieldName: field.name, csvColumn: null })));
};

// Field validation utilities
export const getUnmappedFields = (fields: Field[], fieldMappings: FieldMapping[]): Field[] => {
  return fields.filter(field => {
    const mapping = fieldMappings.find(m => m.fieldName === field.name);
    return !mapping?.csvColumn;
  });
};

export const checkReadyToGenerate = (
  templateImage: File | null,
  csvData: CSVRow[] | null,
  fields: Field[]
): boolean => {
  const hasImage = !!templateImage;
  const hasCSV = !!csvData && csvData.length > 0;
  const hasFields = fields.length > 0;
  return hasImage && hasCSV && hasFields;
};