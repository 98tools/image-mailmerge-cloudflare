import { QRCodeFieldData } from '../QRCodeField';

// Text field interface
export interface TextField {
  type: 'text';
  name: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  demoText: string;
  textAlign: 'left' | 'center' | 'right';
}

// Union type for all field types
export type Field = TextField | QRCodeFieldData;

// CSV row interface
export interface CSVRow {
  [key: string]: string;
}

// Field mapping interface
export interface FieldMapping {
  fieldName: string;
  csvColumn: string | null;
}

// File name mapping interface
export interface FileNameMapping {
  csvColumn: string | null;
  includeNumbering: boolean;
}