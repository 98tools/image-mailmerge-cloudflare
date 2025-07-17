import React, { useState, useRef, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { QRCodeFieldData, QRCodeFieldEditor, drawQRCodeOnCanvas } from './components/QRCodeField';

// Color and font presets (from Tailwind CSS)
const COLOR_PRESETS = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' }
];

const FONT_FAMILY_OPTIONS = [
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Courier New', value: '"Courier New", Courier, monospace' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { name: 'Impact', value: 'Impact, Arial Black, sans-serif' },
  { name: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { name: 'Palatino', value: '"Palatino Linotype", Palatino, serif' },
  { name: 'Tahoma', value: 'Tahoma, sans-serif' },
  { name: 'Lucida Console', value: '"Lucida Console", monospace' }
];

// Add text alignment options constant
const TEXT_ALIGN_OPTIONS = [
  { name: 'Left', value: 'left' as const },
  { name: 'Center', value: 'center' as const },
  { name: 'Right', value: 'right' as const }
];

// Field type definitions
interface TextField {
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

type Field = TextField | QRCodeFieldData;

interface CSVRow {
  [key: string]: string;
}

interface FieldMapping {
  fieldName: string;
  csvColumn: string | null;
}

interface FileNameMapping {
  csvColumn: string | null;
  includeNumbering: boolean;
}

const MailMerge: React.FC = () => {
  // State
  const [templateImage, setTemplateImage] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[] | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [fileNameMapping, setFileNameMapping] = useState<FileNameMapping>({ csvColumn: null, includeNumbering: true });
  const [imageUrl, setImageUrl] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [canvasOffsetX, setCanvasOffsetX] = useState(0);
  const [canvasOffsetY, setCanvasOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showFieldDefinition, setShowFieldDefinition] = useState(false);
  const [showZoomControls, setShowZoomControls] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [currentCsvRowIndex, setCurrentCsvRowIndex] = useState(0);
  const [showFieldTypeModal, setShowFieldTypeModal] = useState(false);
  const [pendingFieldPosition, setPendingFieldPosition] = useState<{x: number, y: number} | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const originalImageWidthRef = useRef(0);
  const originalImageHeightRef = useRef(0);
  const dragStartRef = useRef({ x: 0, y: 0, fieldX: 0, fieldY: 0, fontSize: 0 });
  const sidebarResizeStartRef = useRef({ width: 0, x: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Initialize canvas context
  useEffect(() => {
    console.log('Initializing canvas context...');
    if (canvasRef.current && !ctxRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctxRef.current = ctx;
      console.log('Canvas context initialized:', ctx ? 'success' : 'failed');
      if (ctx) {
        // Set initial canvas size
        canvasRef.current.width = 300;
        canvasRef.current.height = 300;
        console.log('Canvas dimensions set to:', canvasRef.current.width, 'x', canvasRef.current.height);
      }
    }
  }, []); // Only run once

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size === 0) {
      alert('Please select an image file');
      return;
    }

    console.log('Image file selected:', file.name, file.size);
    setIsImageLoading(true);
    
    // Clean up previous URL if exists
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setTemplateImage(file);
    displayImagePreview(url, file);
  }, [imageUrl]);

  // Display image preview (matching original functionality)
  const displayImagePreview = useCallback((imageUrl: string, file: File) => {
    console.log('Starting image preview with URL:', imageUrl);
    const img = new Image();
    img.onload = () => {
      console.log('Image loaded successfully:', img.width, 'x', img.height);
      originalImageWidthRef.current = img.width;
      originalImageHeightRef.current = img.height;
      imageRef.current = img;
      
      // Ensure canvas and context are available
      if (canvasRef.current) {
        // Initialize context if not already done
        if (!ctxRef.current) {
          ctxRef.current = canvasRef.current.getContext('2d');
          console.log('Context initialized in displayImagePreview:', ctxRef.current ? 'success' : 'failed');
        }
        
        if (ctxRef.current) {
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
          
          console.log('Canvas size set to:', canvasRef.current.width, 'x', canvasRef.current.height);
          
          // Draw the image immediately
          ctxRef.current.drawImage(img, 0, 0);
          console.log('Image drawn to canvas');
          
          // Show field definition section and zoom controls
          setShowFieldDefinition(true);
          setShowZoomControls(true);
          setIsImageLoading(false);
          
          // Initial zoom to fit after image is drawn
          requestAnimationFrame(() => {
            zoomToFit();
          });
          
          // Bind canvas events
          bindCanvasEvents();
        } else {
          console.error('Failed to get canvas context');
          setIsImageLoading(false);
        }
      } else {
        console.error('Canvas element not available');
        setIsImageLoading(false);
      }
    };
    img.onerror = (error) => {
      console.error('Error loading image:', error);
      alert('Error loading image');
      setIsImageLoading(false);
    };
    img.src = imageUrl;
  }, []);

  // Handle CSV upload
  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size === 0) {
      alert('Please select a CSV file');
      return;
    }

    console.log('CSV file selected:', file.name, file.size);
    
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        console.log('CSV parsed:', results);
        const data = results.data as CSVRow[];
        const headers = results.meta.fields || [];
        console.log('CSV headers:', headers);
        console.log('CSV data rows:', data.length);
        
        // Filter out empty rows
        const filteredData = data.filter(row => {
          return Object.values(row).some(value => value && value.trim() !== '');
        });
        
        setCsvData(filteredData);
        setCsvHeaders(headers);
        setCurrentCsvRowIndex(0); // Reset to first row
        
        console.log('Filtered CSV data:', filteredData.length, 'rows');
        
        // Initialize empty field mappings for existing fields
        if (fields.length > 0) {
          const mappings = fields.map(field => ({
            fieldName: field.name,
            csvColumn: null
          }));
          setFieldMappings(mappings);
        }
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        alert('Error parsing CSV: ' + error.message);
      }
    });
  }, [fields]);

  // Add field at position - now shows modal for field type selection
  const addFieldAtPosition = useCallback((x: number, y: number) => {
    setPendingFieldPosition({ x, y });
    setShowFieldTypeModal(true);
  }, []);

  // Create text field
  const createTextField = useCallback((name: string, x: number, y: number) => {
    const field: TextField = {
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

    setFields(prev => [...prev, field]);
    
    // Add empty mapping for new field
    setFieldMappings(prev => [...prev, {
      fieldName: name,
      csvColumn: null
    }]);
    
    drawFields();
    checkReadyToGenerate();
  }, []);

  // Create QR code field
  const createQRField = useCallback((name: string, x: number, y: number) => {
    const field: QRCodeFieldData = {
      type: 'qrcode',
      name: name,
      x: x,
      y: y,
      size: 50,
      color: '#000000',
      backgroundColor: null,
      demoText: ''
    };

    setFields(prev => [...prev, field]);
    
    // Add empty mapping for new field
    setFieldMappings(prev => [...prev, {
      fieldName: name,
      csvColumn: null
    }]);
    
    drawFields();
    checkReadyToGenerate();
  }, []);

  // Handle field type selection
  const handleFieldTypeSelection = useCallback((fieldType: 'text' | 'qrcode') => {
    if (!pendingFieldPosition) return;
    
    const fieldName = prompt('Enter field name:');
    if (!fieldName) {
      setShowFieldTypeModal(false);
      setPendingFieldPosition(null);
      return;
    }

    if (fieldType === 'text') {
      createTextField(fieldName, pendingFieldPosition.x, pendingFieldPosition.y);
    } else {
      createQRField(fieldName, pendingFieldPosition.x, pendingFieldPosition.y);
    }

    setShowFieldTypeModal(false);
    setPendingFieldPosition(null);
  }, [pendingFieldPosition, createTextField, createQRField]);

  // Get current CSV row data for preview
  const getCurrentRowData = useCallback(() => {
    if (!csvData || !csvData[currentCsvRowIndex]) return null;
    return csvData[currentCsvRowIndex];
  }, [csvData, currentCsvRowIndex]);

  // Get display text for a field (demo text or actual CSV data)
  const getFieldDisplayText = useCallback((field: Field, useActualData: boolean = true) => {
    if (!useActualData || !csvData) return field.demoText;
    
    const rowData = getCurrentRowData();
    if (!rowData) return field.demoText;
    
    const mapping = fieldMappings.find(m => m.fieldName === field.name);
    if (!mapping?.csvColumn) return field.demoText;
    
    const csvValue = rowData[mapping.csvColumn];
    return csvValue && csvValue.trim() ? csvValue : field.demoText;
  }, [csvData, currentCsvRowIndex, fieldMappings, getCurrentRowData]);

  // Draw fields (updated to handle both text and QR code fields)
  const drawFields = useCallback(async () => {
    if (!templateImage || !canvasRef.current || !ctxRef.current || !imageRef.current) return;

    const ctx = ctxRef.current;
    const img = imageRef.current;
    
    // Clear the entire canvas first
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Ensure the image is available and draw it fresh
    ctx.drawImage(img, 0, 0);

    // Draw field markers and demo content
    for (let index = 0; index < fields.length; index++) {
      const field = fields[index];
      
      if (field.type === 'text') {
        // Handle text field
        const displayText = getFieldDisplayText(field);
        
        // Draw demo text if available
        if (displayText && displayText.trim()) {
          // When demo text is present, only show the demo text, no pointer
          drawFormattedText(
            ctx,
            displayText,
            field.x,
            field.y,
            field.fontSize,
            field.fontFamily || 'Arial, sans-serif',
            field.color,
            field.textAlign
          );
        } else {
          // When no demo text, show the field pointer and name
          // Draw marker circle
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(field.x, field.y, 8, 0, 2 * Math.PI);
          ctx.fill();

          // Draw white center
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(field.x, field.y, 4, 0, 2 * Math.PI);
          ctx.fill();

          // Draw field number
          ctx.fillStyle = '#1f2937';
          ctx.font = 'bold 12px Arial';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${index + 1}`, field.x + 12, field.y - 8);
          
          // Draw field name
          ctx.fillStyle = '#1f2937';
          ctx.font = '12px Arial';
          ctx.textBaseline = 'middle';
          ctx.fillText(field.name, field.x + 12, field.y + 6);
        }

        // Draw selection indicator for text field
        if (index === selectedFieldIndex) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          if (displayText && displayText.trim()) {
            // Calculate text bounds considering alignment
            const segments = parseMarkdownText(displayText);
            let totalWidth = 0;
            
            // Calculate total width with formatting
            segments.forEach(segment => {
              applyTextFormatting(ctx, segment.formats, field.fontFamily || 'Arial, sans-serif', field.fontSize);
              totalWidth += ctx.measureText(segment.text).width;
            });
            
            // Calculate text bounds based on alignment
            let textStartX = field.x;
            if (field.textAlign === 'center') {
              textStartX = field.x - totalWidth / 2;
            } else if (field.textAlign === 'right') {
              textStartX = field.x - totalWidth;
            }
            
            ctx.strokeRect(
              textStartX - 2, 
              field.y - 2, 
              totalWidth + 4, 
              field.fontSize + 4
            );
          } else {
            ctx.strokeRect(field.x - 10, field.y - 10, 20, 20);
          }
        }
      } else if (field.type === 'qrcode') {
        // Handle QR code field
        const displayText = getFieldDisplayText(field);
        
        if (displayText && displayText.trim()) {
          // Draw QR code using the imported function
          await drawQRCodeOnCanvas(ctx, field, displayText);
        } else {
          // When no demo text, show the field pointer and name
          // Draw QR placeholder
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(field.x, field.y, field.size, field.size);
          ctx.strokeStyle = '#d1d5db';
          ctx.lineWidth = 1;
          ctx.strokeRect(field.x, field.y, field.size, field.size);
          
          // Draw QR icon in center
          ctx.fillStyle = '#6b7280';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('QR', field.x + field.size / 2, field.y + field.size / 2);
          
          // Draw field number and name
          ctx.fillStyle = '#1f2937';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${index + 1}`, field.x + field.size + 8, field.y + 8);
          
          ctx.font = '12px Arial';
          ctx.fillText(field.name, field.x + field.size + 8, field.y + 24);
        }

        // Draw selection indicator for QR field
        if (index === selectedFieldIndex) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.strokeRect(field.x - 2, field.y - 2, field.size + 4, field.size + 4);
        }
      }
    }
  }, [fields, selectedFieldIndex, templateImage, currentCsvRowIndex, csvData, fieldMappings]);

  // Redraw canvas when fields change (only if image is loaded)
  useEffect(() => {
    if (templateImage && imageRef.current && canvasRef.current && ctxRef.current) {
      drawFields();
    }
  }, [fields, selectedFieldIndex, templateImage, drawFields]);

  // Get canvas coordinates
  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel - canvasOffsetX;
    const y = (e.clientY - rect.top) / zoomLevel - canvasOffsetY;
    return { x, y };
  }, [zoomLevel, canvasOffsetX, canvasOffsetY]);

  // Get field at position (updated to handle both text and QR code fields)
  const getFieldAtPosition = useCallback((x: number, y: number): { index: number, isResizeHandle: boolean } => {
    if (!ctxRef.current) return { index: -1, isResizeHandle: false };

    for (let i = fields.length - 1; i >= 0; i--) {
      const field = fields[i];
      const displayText = getFieldDisplayText(field);
      
      if (field.type === 'text') {
        if (displayText && displayText.trim()) {
          // Calculate text bounds considering alignment
          const segments = parseMarkdownText(displayText);
          let totalWidth = 0;
          
          // Calculate total width with formatting
          segments.forEach(segment => {
            applyTextFormatting(ctxRef.current!, segment.formats, field.fontFamily || 'Arial, sans-serif', field.fontSize);
            totalWidth += ctxRef.current!.measureText(segment.text).width;
          });
          
          // Calculate text bounds based on alignment
          let textStartX = field.x;
          if (field.textAlign === 'center') {
            textStartX = field.x - totalWidth / 2;
          } else if (field.textAlign === 'right') {
            textStartX = field.x - totalWidth;
          }
          
          // Check if click is within text bounds
          if (x >= textStartX && x <= textStartX + totalWidth &&
              y >= field.y && y <= field.y + field.fontSize) {
            return { index: i, isResizeHandle: false };
          }
        } else {
          // Check marker circle
          const distance = Math.sqrt((x - field.x) ** 2 + (y - field.y) ** 2);
          if (distance <= 8) {
            return { index: i, isResizeHandle: false };
          }
        }
      } else if (field.type === 'qrcode') {
        // Check QR code bounds
        if (x >= field.x && x <= field.x + field.size &&
            y >= field.y && y <= field.y + field.size) {
          return { index: i, isResizeHandle: false };
        }
      }
    }
    return { index: -1, isResizeHandle: false };
  }, [fields, getFieldDisplayText]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    // Handle middle mouse button for panning
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      if (canvasContainerRef.current) {
        canvasContainerRef.current.style.cursor = 'grabbing';
      }
      return;
    }
    
    // Only process left mouse button for field interactions
    if (e.button !== 0) return;
    
    const coords = getCanvasCoordinates(e);
    const hit = getFieldAtPosition(coords.x, coords.y);
    
    if (hit.index >= 0) {
      // Clicking on an existing field
      setSelectedFieldIndex(hit.index);
      const field = fields[hit.index];
      
      if (hit.isResizeHandle) {
        setIsResizing(true);
        dragStartRef.current = { 
          x: coords.x, 
          y: coords.y, 
          fieldX: field.x, 
          fieldY: field.y, 
          fontSize: field.type === 'text' ? field.fontSize : field.size
        };
        canvasRef.current.style.cursor = 'nw-resize';
      } else {
        setIsDragging(true);
        dragStartRef.current = { 
          x: coords.x, 
          y: coords.y, 
          fieldX: field.x, 
          fieldY: field.y, 
          fontSize: field.type === 'text' ? field.fontSize : field.size
        };
        canvasRef.current.style.cursor = 'move';
      }
    } else {
      // Clicking on empty area - add new field
      addFieldAtPosition(coords.x, coords.y);
    }
  }, [fields, getCanvasCoordinates, getFieldAtPosition, addFieldAtPosition]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    // Panning is handled by global mouse events, so skip if panning
    if (isPanning) return;
    
    const coords = getCanvasCoordinates(e);
    
    if (isDragging && selectedFieldIndex >= 0) {
      const field = fields[selectedFieldIndex];
      const newX = dragStartRef.current.fieldX + (coords.x - dragStartRef.current.x);
      const newY = dragStartRef.current.fieldY + (coords.y - dragStartRef.current.y);
      
      setFields(prev => prev.map((f, i) => 
        i === selectedFieldIndex ? { ...f, x: newX, y: newY } : f
      ));
    } else if (isResizing && selectedFieldIndex >= 0) {
      const field = fields[selectedFieldIndex];
      const deltaY = coords.y - dragStartRef.current.y;
      const newFontSize = Math.max(8, Math.min(72, dragStartRef.current.fontSize + deltaY * 0.5));
      
      setFields(prev => prev.map((f, i) => 
        i === selectedFieldIndex ? { ...f, fontSize: newFontSize } : f
      ));
    } else {
      // Update cursor based on hover
      const hit = getFieldAtPosition(coords.x, coords.y);
      if (hit.index >= 0) {
        canvasRef.current.style.cursor = hit.isResizeHandle ? 'nw-resize' : 'move';
      } else {
        canvasRef.current.style.cursor = 'crosshair';
      }
    }
  }, [isPanning, isDragging, isResizing, selectedFieldIndex, fields, getCanvasCoordinates, getFieldAtPosition]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle panning release
    if (e.button === 1 && isPanning) {
      setIsPanning(false);
      if (canvasContainerRef.current) {
        canvasContainerRef.current.style.cursor = '';
      }
      return;
    }
    
    // Handle field interaction release
    setIsDragging(false);
    setIsResizing(false);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'crosshair';
    }
  }, [isPanning]);

  // Handle wheel for field resizing (updated to handle both text and QR code fields)
  const handleWheelNative = useCallback((e: WheelEvent) => {
    // Always prevent default scrolling behavior
    e.preventDefault();
    
    if (!canvasRef.current) return;
    
    // Convert native event to React-like coordinates
    const coords = getCanvasCoordinates(e as any);
    const hit = getFieldAtPosition(coords.x, coords.y);
    
    if (hit.index >= 0) {
      // Only resize if hovering over a field
      const field = fields[hit.index];
      const delta = e.deltaY > 0 ? -2 : 2;
      
      if (field.type === 'text') {
        const newFontSize = Math.max(8, Math.min(72, field.fontSize + delta));
        setFields(prev => prev.map((f, i) => 
          i === hit.index ? { ...f, fontSize: newFontSize } : f
        ));
      } else if (field.type === 'qrcode') {
        const newSize = Math.max(20, Math.min(200, field.size + delta));
        setFields(prev => prev.map((f, i) => 
          i === hit.index ? { ...f, size: newSize } : f
        ));
      }
    }
    // If not hovering over a field, do nothing (no scrolling)
  }, [fields, getCanvasCoordinates, getFieldAtPosition]);

  // Bind native wheel events to prevent passive event listener issues
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    
    if (!canvas || !container) return;
    
    // Container wheel handler to prevent scrolling
    const containerWheelHandler = (e: WheelEvent) => {
      e.preventDefault();
    };
    
    // Add wheel event listeners with { passive: false } to allow preventDefault
    canvas.addEventListener('wheel', handleWheelNative, { passive: false });
    container.addEventListener('wheel', containerWheelHandler, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', handleWheelNative);
      container.removeEventListener('wheel', containerWheelHandler);
    };
  }, [handleWheelNative, templateImage]);

  // Global mouse events for panning
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPanning && canvasContainerRef.current) {
        const deltaX = e.clientX - panStartRef.current.x;
        const deltaY = e.clientY - panStartRef.current.y;
        
        canvasContainerRef.current.scrollLeft -= deltaX;
        canvasContainerRef.current.scrollTop -= deltaY;
        
        panStartRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (e.button === 1 && isPanning) {
        setIsPanning(false);
        if (canvasContainerRef.current) {
          canvasContainerRef.current.style.cursor = '';
        }
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when canvas is active
      if (!canvasRef.current || !templateImage) return;

      // Ctrl/Cmd + Plus/Equals for zoom in
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setZoomLevel(prev => Math.min(prev * 1.2, 5));
      }
      
      // Ctrl/Cmd + Minus for zoom out
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setZoomLevel(prev => Math.max(prev / 1.2, 0.1));
      }
      
      // Ctrl/Cmd + 0 for zoom to fit
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        zoomToFit();
      }
      
      // Ctrl/Cmd + 1 for actual size
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        setZoomLevel(1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [templateImage]);

  // Sidebar resize functionality
  const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    sidebarResizeStartRef.current = { width: sidebarWidth, x: e.clientX };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  useEffect(() => {
    const handleSidebarResizeMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;
      
      const deltaX = e.clientX - sidebarResizeStartRef.current.x;
      const newWidth = sidebarResizeStartRef.current.width + deltaX;
      
      // Constrain the width
      const minWidth = 300;
      const maxWidth = Math.min(600, window.innerWidth * 0.5);
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      
      setSidebarWidth(constrainedWidth);
    };

    const handleSidebarResizeEnd = () => {
      if (isResizingSidebar) {
        setIsResizingSidebar(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    if (isResizingSidebar) {
      document.addEventListener('mousemove', handleSidebarResizeMove);
      document.addEventListener('mouseup', handleSidebarResizeEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleSidebarResizeMove);
      document.removeEventListener('mouseup', handleSidebarResizeEnd);
    };
  }, [isResizingSidebar]);

  // Update field - separate functions for different field types
  const updateTextField = useCallback((index: number, property: keyof TextField, value: any) => {
    setFields(prev => prev.map((field, i) => {
      if (i === index && field.type === 'text') {
        const updatedField = { ...field, [property]: value };
        
        // If the field name is being changed, update the mapping as well
        if (property === 'name' && typeof value === 'string') {
          setFieldMappings(prevMappings => prevMappings.map(mapping => 
            mapping.fieldName === field.name 
              ? { ...mapping, fieldName: value }
              : mapping
          ));
        }
        
        return updatedField;
      }
      return field;
    }));
  }, []);

  const updateQRField = useCallback((index: number, property: keyof QRCodeFieldData, value: any) => {
    setFields(prev => prev.map((field, i) => {
      if (i === index && field.type === 'qrcode') {
        const updatedField = { ...field, [property]: value };
        
        // If the field name is being changed, update the mapping as well
        if (property === 'name' && typeof value === 'string') {
          setFieldMappings(prevMappings => prevMappings.map(mapping => 
            mapping.fieldName === field.name 
              ? { ...mapping, fieldName: value }
              : mapping
          ));
        }
        
        return updatedField;
      }
      return field;
    }));
  }, []);

  // Generic field update for common properties
  const updateField = useCallback((index: number, property: 'name' | 'demoText' | 'color' | 'x' | 'y', value: any) => {
    setFields(prev => prev.map((field, i) => {
      if (i === index) {
        const updatedField = { ...field, [property]: value };
        
        // If the field name is being changed, update the mapping as well
        if (property === 'name' && typeof value === 'string') {
          setFieldMappings(prevMappings => prevMappings.map(mapping => 
            mapping.fieldName === field.name 
              ? { ...mapping, fieldName: value }
              : mapping
          ));
        }
        
        return updatedField;
      }
      return field;
    }));
  }, []);

  // Remove field
  const removeField = useCallback((index: number) => {
    const fieldToRemove = fields[index];
    setFields(prev => prev.filter((_, i) => i !== index));
    // Remove mapping by field name, not by index
    setFieldMappings(prev => prev.filter(mapping => mapping.fieldName !== fieldToRemove.name));
    if (selectedFieldIndex === index) {
      setSelectedFieldIndex(-1);
    } else if (selectedFieldIndex > index) {
      setSelectedFieldIndex(prev => prev - 1);
    }
  }, [selectedFieldIndex, fields]);

  // Clear fields
  const clearFields = useCallback(() => {
    setFields([]);
    setSelectedFieldIndex(-1);
    setFieldMappings([]);
  }, []);

  // Clear field mapping
  const clearFieldMapping = useCallback(() => {
    setFieldMappings(fields.map(field => ({ fieldName: field.name, csvColumn: null })));
    setFileNameMapping({ csvColumn: null, includeNumbering: true });
  }, [fields]);

  // Update field mapping
  const updateFieldMapping = useCallback((fieldName: string, csvColumn: string) => {
    setFieldMappings(prev => prev.map(mapping => 
      mapping.fieldName === fieldName 
        ? { ...mapping, csvColumn } 
        : mapping
    ));
  }, []);

  // Update file name mapping
  const updateFileNameMapping = useCallback((csvColumn: string) => {
    setFileNameMapping(prev => ({ ...prev, csvColumn: csvColumn || null }));
  }, []);

  // Update file name numbering preference
  const updateFileNameNumbering = useCallback((includeNumbering: boolean) => {
    setFileNameMapping(prev => ({ ...prev, includeNumbering }));
  }, []);

  // CSV row navigation
  const goToPreviousRow = useCallback(() => {
    setCurrentCsvRowIndex(prev => Math.max(0, prev - 1));
  }, []);

  const goToNextRow = useCallback(() => {
    setCurrentCsvRowIndex(prev => 
      csvData ? Math.min(csvData.length - 1, prev + 1) : prev
    );
  }, [csvData]);

  const goToRowIndex = useCallback((index: number) => {
    if (csvData && index >= 0 && index < csvData.length) {
      setCurrentCsvRowIndex(index);
    }
  }, [csvData]);

  // Check if field mappings are complete
  const getUnmappedFields = useCallback(() => {
    return fields.filter(field => {
      const mapping = fieldMappings.find(m => m.fieldName === field.name);
      return !mapping?.csvColumn;
    });
  }, [fields, fieldMappings]);

  // Check ready to generate
  const checkReadyToGenerate = useCallback(() => {
    const hasImage = !!templateImage;
    const hasCSV = !!csvData && csvData.length > 0;
    const hasFields = fields.length > 0;
    return hasImage && hasCSV && hasFields;
  }, [templateImage, csvData, fields]);

  // Generate images
  const generateImages = useCallback(async () => {
    if (!templateImage || !csvData || !fields.length) return;

    setIsProcessing(true);
    setProgress(0);
    setProgressText('Starting image generation...');
    setShowSuccessMessage(false);

    try {
      const zip = new JSZip();
      const totalRows = csvData.length;
      console.log(`Starting generation of ${totalRows} images`);

      for (let i = 0; i < totalRows; i++) {
        const row = csvData[i];
        
        // Update progress text to match old format
        const percent = ((i + 1) / totalRows) * 100;
        setProgress(percent);
        setProgressText(`Processing image ${i + 1} of ${totalRows} (${Math.round(percent)}%)`);
        
        // Create canvas for this row
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Load and draw template image
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            resolve();
          };
          img.src = imageUrl;
        });

        // Draw fields with CSV data
        for (const field of fields) {
          const mapping = fieldMappings.find(m => m.fieldName === field.name);
          const text = mapping?.csvColumn ? row[mapping.csvColumn] || '' : field.demoText || '';
          
          if (text) {
            if (field.type === 'text') {
              drawFormattedText(
                ctx,
                text,
                field.x,
                field.y,
                field.fontSize,
                field.fontFamily,
                field.color,
                field.textAlign
              );
            } else if (field.type === 'qrcode') {
              await drawQRCodeOnCanvas(ctx, field, text);
            }
          }
        }

        // Convert to blob and add to zip
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((blob) => resolve(blob!), 'image/png')
        );
        
        // Generate filename - use CSV data if mapped, otherwise default naming
        let fileName = `image_${String(i + 1).padStart(4, '0')}.png`;
        if (fileNameMapping.csvColumn && row[fileNameMapping.csvColumn]) {
          const customName = row[fileNameMapping.csvColumn].trim();
          if (customName) {
            // Sanitize filename and ensure .png extension
            let sanitizedName = customName.replace(/[<>:"/\\|?*]/g, '_');
            if (!sanitizedName.toLowerCase().endsWith('.png')) {
              sanitizedName += '.png';
            }
            // Include numbering prefix only if user wants it
            if (fileNameMapping.includeNumbering) {
              fileName = `${String(i + 1).padStart(4, '0')}_${sanitizedName}`;
            } else {
              fileName = sanitizedName;
            }
          }
        }
        
        // Add to zip with proper error handling
        try {
          zip.file(fileName, blob);
          console.log(`✓ Added file ${i + 1}/${totalRows}: ${fileName}, blob size: ${blob.size}`);
        } catch (error) {
          console.error(`Failed to add file ${fileName}:`, error);
        }

        // Allow UI to update and ensure blob is processed
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Generate ZIP file
      setProgressText('Generating ZIP file...');
      console.log(`Generating ZIP with ${Object.keys(zip.files).length} files`);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      console.log(`ZIP generated, size: ${zipBlob.size} bytes`);
      
      // Download zip
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mailmerge_images_${new Date().toISOString().slice(0,10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);

    } catch (error) {
      console.error('Error generating images:', error);
      alert(`Error generating images: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressText('');
    }
  }, [templateImage, csvData, fields, fieldMappings, fileNameMapping, imageUrl]);

  // Zoom controls
  const zoomIn = useCallback(() => setZoomLevel(prev => Math.min(prev * 1.2, 5)), []);
  const zoomOut = useCallback(() => setZoomLevel(prev => Math.max(prev / 1.2, 0.1)), []);
  const zoomToFit = useCallback(() => {
    if (!canvasRef.current || !originalImageWidthRef.current || !originalImageHeightRef.current) return;
    
    const container = canvasContainerRef.current;
    if (!container) return;
    
    // Get the actual available space for the image
    const containerRect = container.getBoundingClientRect();
    const availableWidth = containerRect.width - 128; // Account for padding (64px on each side)
    const availableHeight = containerRect.height - 128; // Account for padding (64px on each side)
    
    // Calculate scale factors for both dimensions
    const scaleX = availableWidth / originalImageWidthRef.current;
    const scaleY = availableHeight / originalImageHeightRef.current;
    
    // Use the smaller scale to ensure the image fits completely
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
    
    console.log('Zoom to fit:', { 
      containerSize: { width: containerRect.width, height: containerRect.height },
      availableSpace: { width: availableWidth, height: availableHeight },
      imageSize: { width: originalImageWidthRef.current, height: originalImageHeightRef.current },
      scales: { scaleX, scaleY },
      finalScale: scale 
    });
    
    setZoomLevel(scale);
  }, []);
  const zoomToActual = useCallback(() => setZoomLevel(1), []);

  // Bind canvas events
  const bindCanvasEvents = useCallback(() => {
    // Canvas events are already bound via JSX event handlers
    console.log('Canvas events bound');
  }, []);


  // Debug effect to monitor canvas state
  useEffect(() => {
    console.log('Canvas state:', {
      hasCanvas: !!canvasRef.current,
      hasContext: !!ctxRef.current,
      hasImage: !!imageRef.current,
      hasTemplateImage: !!templateImage,
      canvasWidth: canvasRef.current?.width,
      canvasHeight: canvasRef.current?.height,
      zoomLevel
    });
  }, [templateImage, zoomLevel]);

  // Cleanup image URL on unmount
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  // Check if ready to generate
  const isReadyToGenerate = checkReadyToGenerate();

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      {/* Success Notification */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-slide-in-right">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Successfully generated {csvData?.length || 0} images!
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Mail Merge Tool
            </h1>
            <span className="text-sm text-gray-400">for image</span>
            {/* GitHub Link */}
            <a 
              href="https://github.com/abdulkarim1422/image-mailmerge-cloudflare" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200 group"
              title="View on GitHub"
            >
              <svg 
                className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" 
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                GitHub
              </span>
            </a>
          </div>
          <div className="flex items-center space-x-4">
            {/* Progress Bar in Header */}
            {isProcessing && (
              <div className="flex items-center space-x-3 bg-gray-700/50 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-600 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-300 whitespace-nowrap min-w-[120px]">
                    {progressText || `${Math.round(progress)}%`}
                  </span>
                </div>
              </div>
            )}
            
            <button 
              onClick={generateImages}
              disabled={!isReadyToGenerate || isProcessing}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg shadow-lg transition-all duration-300"
            >
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                {isProcessing ? 'Generating...' : 'Generate Images'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex h-full">
        {/* Sidebar */}
        <div 
          className="bg-gray-800 border-r border-gray-700 flex flex-col overflow-y-auto"
          style={{ width: sidebarWidth, minWidth: 300, maxWidth: 600 }}
        >
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-gray-200">Options</h2>
          </div>
          
          <div className="flex-1 p-4 space-y-6 mb-20">
            {/* Image Upload Section */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                  1
                </div>
                <h3 className="text-lg font-semibold text-white">Template Image</h3>
              </div>
              
              <div>
                <label htmlFor="imageFile" className="cursor-pointer block">
                  <div className="border-2 border-dashed border-blue-400/50 rounded-lg p-6 text-center bg-blue-500/10 hover:bg-blue-500/20 transition-all duration-300 group">
                    <svg className="w-12 h-12 text-blue-400 mx-auto mb-3 group-hover:text-blue-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span className="text-blue-300 font-medium">Upload Image</span>
                    <p className="text-xs text-blue-400 mt-1">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </label>
                <input 
                  type="file" 
                  id="imageFile" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={isImageLoading}
                />
              </div>
              
            </div>

            {/* Field Definition Section */}
            {showFieldDefinition && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                    2
                  </div>
                  <h3 className="text-lg font-semibold text-white">Text Fields</h3>
                </div>
                
                <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-3 mb-4">
                  <p className="text-emerald-300 text-sm">Click on the preview to add text fields. Use demo text to preview positioning. Drag fields to move, scroll over fields to resize.</p>
                  <div className="mt-2 text-xs text-emerald-200">
                    <p className="font-medium mb-1">Text Formatting (Markdown-style):</p>
                    <div className="space-y-1">
                      <p>• <strong>**Bold text**</strong> - Use double asterisks</p>
                      <p>• <em>*Italic text*</em> - Use single asterisks</p>
                      <p>• <u>__Underlined text__</u> - Use double underscores</p>
                      <p>• <s>~~Strikethrough text~~</s> - Use double tildes</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  {fields.map((field, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${selectedFieldIndex === index ? 'border-emerald-400 bg-emerald-500/20' : 'border-gray-600 bg-gray-600/50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateField(index, 'name', e.target.value)}
                          placeholder="Field Name"
                          className="bg-gray-700 text-white px-2 py-1 rounded text-sm flex-1 mr-2"
                        />
                        <span className="text-xs bg-gray-600 px-2 py-1 rounded mr-2">
                          {field.type === 'text' ? 'Text' : 'QR'}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setSelectedFieldIndex(index)}
                            className="text-xs bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded"
                          >
                            Select
                          </button>
                          <button
                            onClick={() => removeField(index)}
                            className="bg-red-500 hover:bg-red-600 text-white p-1 rounded transition-colors"
                            title="Delete Field"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={field.demoText}
                        onChange={(e) => updateField(index, 'demoText', e.target.value)}
                        placeholder="Demo text"
                        className="bg-gray-700 text-white px-2 py-1 rounded text-sm w-full mb-2"
                      />
                      
                      {field.type === 'text' ? (
                        <>
                          {/* Text Field Controls */}
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                              type="number"
                              value={field.fontSize}
                              onChange={(e) => updateTextField(index, 'fontSize', parseInt(e.target.value))}
                              placeholder="Font Size"
                              className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
                            />
                            <select
                              value={field.fontFamily}
                              onChange={(e) => updateTextField(index, 'fontFamily', e.target.value)}
                              className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
                            >
                              {FONT_FAMILY_OPTIONS.map(font => (
                                <option key={font.value} value={font.value}>{font.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          {/* Text Color Controls */}
                          <div>
                            <label className="block text-emerald-300 text-xs font-medium mb-2">Text Color</label>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-1">
                                {COLOR_PRESETS.map(color => (
                                  <button
                                    key={color.value}
                                    onClick={() => updateField(index, 'color', color.value)}
                                    className={`w-6 h-6 rounded border-2 ${field.color === color.value ? 'border-white' : 'border-gray-400'} hover:border-white transition-colors`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                  />
                                ))}
                              </div>
                              <details className="mt-2">
                                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">Custom Color</summary>
                                <input
                                  type="color"
                                  value={field.color}
                                  onChange={(e) => updateField(index, 'color', e.target.value)}
                                  className="w-full h-8 bg-gray-700/50 border border-gray-500 rounded cursor-pointer mt-1"
                                />
                              </details>
                            </div>
                          </div>

                          {/* Text Alignment Controls */}
                          <div className="mt-3">
                            <label className="block text-emerald-300 text-xs font-medium mb-2">Text Alignment</label>
                            <div className="flex gap-2">
                              {TEXT_ALIGN_OPTIONS.map(option => (
                                <button
                                  key={option.value}
                                  onClick={() => updateTextField(index, 'textAlign', option.value)}
                                  className={`flex-1 px-3 py-1 rounded-lg text-sm font-medium transition-all flex items-center justify-center
                                    ${field.textAlign === option.value ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-emerald-300 hover:bg-emerald-600'}
                                  `}
                                  title={option.name}
                                >
                                  {option.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* QR Code Field Controls */}
                          <QRCodeFieldEditor
                            field={field}
                            onUpdate={(updatedField) => {
                              setFields(prev => prev.map((f, i) => i === index ? updatedField : f));
                            }}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={clearFields}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* CSV Upload Section */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                  3
                </div>
                <h3 className="text-lg font-semibold text-white">CSV Data</h3>
              </div>
              
              <div>
                <label htmlFor="csvFile" className="cursor-pointer block">
                  <div className="border-2 border-dashed border-orange-400/50 rounded-lg p-6 text-center bg-orange-500/10 hover:bg-orange-500/20 transition-all duration-300 group">
                    <svg className="w-12 h-12 text-orange-400 mx-auto mb-3 group-hover:text-orange-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span className="text-orange-300 font-medium">Upload CSV</span>
                    <p className="text-xs text-orange-400 mt-1">Data for merge fields</p>
                  </div>
                </label>
                <input 
                  type="file" 
                  id="csvFile" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleCsvUpload}
                />
              </div>
              
              {csvData && (
                <div className="mt-4 bg-gray-600/50 border border-gray-500 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      CSV Preview <br />
                      ({csvData.length} rows)
                    </h4>
                    
                    {/* CSV Row Navigation */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={goToPreviousRow}
                        disabled={currentCsvRowIndex === 0}
                        className="p-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                        title="Previous Row"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                      </button>
                      
                      <span className="text-xs text-gray-300 min-w-[60px] text-center">
                        Row {currentCsvRowIndex + 1} of {csvData.length}
                      </span>
                      
                      <button
                        onClick={goToNextRow}
                        disabled={currentCsvRowIndex === csvData.length - 1}
                        className="p-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                        title="Next Row"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Warning for unmapped fields */}
                  {fields.length > 0 && getUnmappedFields().length > 0 && (
                    <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-400/30 rounded text-yellow-300 text-xs">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                        <span>
                          <strong>Warning:</strong> {getUnmappedFields().length} field(s) not mapped: <br />
                          {getUnmappedFields().map(f => f.name).join(', ')}. <br />
                          Go to Field Mapping section below to map them.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Current Row Data Display */}
                  <div className="bg-gray-700 rounded overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-800">
                          <tr>
                            {csvHeaders.map(header => (
                              <th key={header} className="px-2 py-1 text-left text-gray-300 font-medium">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="text-gray-200">
                          <tr className="border-b border-gray-600 bg-blue-500/10">
                            {csvHeaders.map(header => (
                              <td key={header} className="px-2 py-1 font-medium text-blue-200">
                                {getCurrentRowData()?.[header] || ''}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Show preview tip */}
                  <div className="mt-2 text-xs text-gray-400 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Use ← → buttons to preview different rows. The canvas above shows actual data from the current row.
                  </div>
                </div>
              )}
            </div>

            {/* Field Mapping Section */}
            {csvData && fields.length > 0 && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                    4
                  </div>
                  <h3 className="text-lg font-semibold text-white">Field Mapping</h3>
                </div>
                
                <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-3 mb-4">
                  <p className="text-purple-300 text-sm">Map your template fields to CSV columns. Unmapped fields will be left empty.</p>
                </div>
                
                <div className="space-y-3 mb-4">
                  {/* File Name Mapping */}
                  <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-lg p-3 mb-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                      </svg>
                      <span className="text-sm font-medium text-indigo-300">Custom File Names</span>
                    </div>
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-sm text-gray-300 min-w-[80px]">file_name:</span>
                      <div className="flex-1 min-w-0">
                        <select
                          value={fileNameMapping.csvColumn || ''}
                          onChange={(e) => updateFileNameMapping(e.target.value)}
                          className="bg-gray-700 text-white px-2 py-1 rounded text-sm w-full"
                        >
                          <option value="">-- Use Default (image_0001.png) --</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {fileNameMapping.csvColumn && (
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="checkbox"
                          id="includeNumbering"
                          checked={fileNameMapping.includeNumbering}
                          onChange={(e) => updateFileNameNumbering(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
                        />
                        <label htmlFor="includeNumbering" className="text-sm text-gray-300">
                          Include numbering prefix (0001_filename.png)
                        </label>
                      </div>
                    )}
                    <p className="text-xs text-indigo-400 mt-2">
                      Optional: Select a CSV column to use custom file names. Files will be automatically saved as .png
                      {fileNameMapping.csvColumn && !fileNameMapping.includeNumbering && (
                        <span className="block mt-1 text-yellow-400">⚠️ Without numbering, duplicate filenames will overwrite each other</span>
                      )}
                    </p>
                  </div>

                  {/* Field Mappings */}
                  {fieldMappings.map((mapping, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-sm text-gray-300 min-w-[80px]">{mapping.fieldName}:</span>
                      <select
                        value={mapping.csvColumn || ''}
                        onChange={(e) => updateFieldMapping(mapping.fieldName, e.target.value)}
                        className="bg-gray-700 text-white px-2 py-1 rounded text-sm flex-1"
                      >
                        <option value="">-- Select Column --</option>
                        {csvHeaders.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-center">
                  <button 
                    onClick={clearFieldMapping}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Clear All Mappings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resize Handle */}
        <div 
          className="w-1 bg-gray-600 hover:bg-purple-500 cursor-col-resize transition-colors"
          onMouseDown={handleSidebarResizeStart}
        />

        {/* Main Preview Area */}
        <div className="flex-1 bg-gray-900 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Preview Header */}
            <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-200">Preview</h2>
                {showZoomControls && ( <>
                <span className="text-xs text-gray-400 ml-4 flex items-center">
                  {/* Mouse Middle Button SVG */}
                  Hold
                  <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="3" width="14" height="18" rx="4" fill="#374151" stroke="#9CA3AF" strokeWidth="1.5"/>
                    <rect x="11" y="5" width="2" height="4" rx="1" fill="#9CA3AF"/>
                  </svg>
                  <span className="mx-1 px-1 bg-gray-700 rounded">mouse middle button</span>
                  and drag to pan
                </span>
                  <div className="flex items-center space-x-3">
                    <button onClick={zoomOut} title="Zoom Out (Ctrl+-)" className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
                      </svg>
                    </button>
                    <span className="text-gray-300 text-sm font-medium min-w-[60px] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button onClick={zoomIn} title="Zoom In (Ctrl++)" className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                      </svg>
                    </button>
                    <button onClick={zoomToFit} title="Zoom to Fit (Ctrl+0)" className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors text-xs">
                      Fit
                    </button>
                    <button onClick={zoomToActual} title="Actual Size (Ctrl+1)" className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors text-xs">
                      1:1
                    </button>
                  </div>
                </>)}
              </div>
            </div>
            
            {/* Preview Content */}
            <div className="flex-1 p-6 overflow-auto">
              {templateImage ? (
                <div 
                  ref={canvasContainerRef}
                  className="h-full w-full bg-gray-800/50 rounded-lg canvas-container overflow-auto"
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none'
                  }}
                >
                  <div className="flex items-center justify-center min-h-full min-w-full p-8">
                    <div 
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'center center'
                      }}
                    >
                      <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        className="cursor-crosshair rounded-lg shadow-lg max-w-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <p className="text-xl font-medium">Upload an image to start</p>
                    <p className="text-sm text-gray-600 mt-2">Your template will appear here for editing</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Field Type Selection Modal */}
      {showFieldTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-semibold text-white mb-4">Choose Field Type</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleFieldTypeSelection('text')}
                className="w-full p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-left transition-colors"
              >
                <div className="flex items-center">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                  </svg>
                  <div>
                    <div className="font-medium">Text Field</div>
                    <div className="text-sm text-blue-200">Regular text with formatting options</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleFieldTypeSelection('qrcode')}
                className="w-full p-4 bg-green-600 hover:bg-green-700 rounded-lg text-white text-left transition-colors"
              >
                <div className="flex items-center">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                  </svg>
                  <div>
                    <div className="font-medium">QR Code Field</div>
                    <div className="text-sm text-green-200">Generate QR codes from CSV data</div>
                  </div>
                </div>
              </button>
            </div>
            <button
              onClick={() => {
                setShowFieldTypeModal(false);
                setPendingFieldPosition(null);
              }}
              className="w-full mt-4 p-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MailMerge;

// Function to parse markdown-like text and apply formatting
const parseMarkdownText = (text: string) => {
  // Process text by replacing markdown patterns sequentially
  let processedText = text;
  const segments: Array<{ text: string; formats: string[] }> = [];
  
  // Define replacement patterns
  const replacements = [
    { pattern: /\*\*(.*?)\*\*/g, format: 'bold', placeholder: '§BOLD§' },
    { pattern: /__(.*?)__/g, format: 'underline', placeholder: '§UNDERLINE§' },
    { pattern: /~~(.*?)~~/g, format: 'strikethrough', placeholder: '§STRIKE§' },
    { pattern: /\*(.*?)\*/g, format: 'italic', placeholder: '§ITALIC§' }
  ];

  // Store formatted segments
  const formattedSegments: Array<{ text: string; format: string }> = [];
  
  // Process each formatting type
  replacements.forEach(replacement => {
    processedText = processedText.replace(replacement.pattern, (match, content) => {
      const segmentIndex = formattedSegments.length;
      formattedSegments.push({ text: content, format: replacement.format });
      return `${replacement.placeholder}${segmentIndex}${replacement.placeholder}`;
    });
  });

  // Split by placeholder patterns to rebuild segments
  let currentText = processedText;
  const allPlaceholders = replacements.map(r => r.placeholder);
  
  // Simple approach: just split the text and rebuild segments
  const parts = currentText.split(/(§(?:BOLD|UNDERLINE|STRIKE|ITALIC)§\d+§(?:BOLD|UNDERLINE|STRIKE|ITALIC)§)/);
  
  parts.forEach(part => {
    if (part.startsWith('§') && part.endsWith('§')) {
      // This is a formatted segment
      const matches = part.match(/§(BOLD|UNDERLINE|STRIKE|ITALIC)§(\d+)§/);
      if (matches) {
        const segmentIndex = parseInt(matches[2]);
        const formatType = matches[1].toLowerCase();
        // Map STRIKE back to strikethrough
        const actualFormat = formatType === 'strike' ? 'strikethrough' : formatType;
        const formattedSegment = formattedSegments[segmentIndex];
        if (formattedSegment) {
          segments.push({ text: formattedSegment.text, formats: [actualFormat] });
        }
      }
    } else if (part.length > 0) {
      // This is plain text
      segments.push({ text: part, formats: [] });
    }
  });

  // If no segments were created, return the original text
  if (segments.length === 0) {
    segments.push({ text: text, formats: [] });
  }

  return segments;
};

// Function to apply text formatting to canvas context
const applyTextFormatting = (ctx: CanvasRenderingContext2D, formats: string[], fontFamily: string, fontSize: number) => {
  let fontStyle = '';
  let fontWeight = '';
  const textDecorations: string[] = [];

  formats.forEach(format => {
    switch (format) {
      case 'bold':
        fontWeight = 'bold';
        break;
      case 'italic':
        fontStyle = 'italic';
        break;
      case 'strikethrough':
        textDecorations.push('line-through');
        break;
      case 'underline':
        textDecorations.push('underline');
        break;
    }
  });

  // Construct font string
  const fontString = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`.trim();
  ctx.font = fontString;

  return { textDecorations };
};

// Function to draw formatted text on canvas
const drawFormattedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  color: string,
  textAlign: 'left' | 'center' | 'right'
) => {
  const segments = parseMarkdownText(text);
  
  // Calculate total width for alignment
  let totalWidth = 0;
  segments.forEach(segment => {
    applyTextFormatting(ctx, segment.formats, fontFamily, fontSize);
    totalWidth += ctx.measureText(segment.text).width;
  });

  // Calculate starting X position based on alignment
  let startX = x;
  if (textAlign === 'center') {
    startX = x - totalWidth / 2;
  } else if (textAlign === 'right') {
    startX = x - totalWidth;
  }

  // Draw each segment
  let currentX = startX;
  segments.forEach(segment => {
    const { textDecorations } = applyTextFormatting(ctx, segment.formats, fontFamily, fontSize);
    
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.fillText(segment.text, currentX, y);
    
    // Handle text decorations (underline, strikethrough)
    if (textDecorations.length > 0) {
      const segmentWidth = ctx.measureText(segment.text).width;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, fontSize / 20);
      
      textDecorations.forEach(decoration => {
        if (decoration === 'underline') {
          const underlineY = y + fontSize * 0.9;
          ctx.beginPath();
          ctx.moveTo(currentX, underlineY);
          ctx.lineTo(currentX + segmentWidth, underlineY);
          ctx.stroke();
        } else if (decoration === 'line-through') {
          const strikeY = y + fontSize * 0.5;
          ctx.beginPath();
          ctx.moveTo(currentX, strikeY);
          ctx.lineTo(currentX + segmentWidth, strikeY);
          ctx.stroke();
        }
      });
    }
    
    currentX += ctx.measureText(segment.text).width;
  });
};