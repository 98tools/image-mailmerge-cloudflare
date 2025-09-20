import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { QRCodeFieldData, QRCodeFieldEditor, drawQRCodeOnCanvas } from './components/QRCodeField';
import { comprehensiveFontList, DEFAULT_FONT_OPTIONS } from './components/font/fontsList';
import { detectSystemFonts, updateFontFamilyOptions, type FontOption } from './components/font/fontFunctions';
import { parseSpreadsheetFile, type CSVRow } from './components/data/spreadsheetUtils';
import { parseMarkdownText, applyTextFormatting, drawFormattedText } from './components/text/textFormatting';
import { COLOR_PRESETS, TEXT_ALIGN_OPTIONS } from './components/ui/constants';
import { TextField, Field, FieldMapping, FileNameMapping } from './components/types/fieldTypes';
import { createCanvasMouseHandlers } from './components/canvas/canvasInteraction';
import { generateImages as generateImagesUtil } from './components/generation/imageGeneration';
import { 
  createTextField, 
  createQRField, 
  addFieldToList, 
  removeFieldFromList, 
  clearAllFields,
  updateTextField,
  updateQRField,
  updateField,
  getFieldDisplayText,
  updateFieldMapping,
  clearFieldMappings,
  getUnmappedFields,
  checkReadyToGenerate
} from './components/fields/fieldManagement';
import { createZoomControls, createFullscreenControls } from './components/canvas/zoomControls';

const ImageMailMerge: React.FC = () => {
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentCsvRowIndex, setCurrentCsvRowIndex] = useState(0);
  const [showFieldTypeModal, setShowFieldTypeModal] = useState(false);
  const [pendingFieldPosition, setPendingFieldPosition] = useState<{x: number, y: number} | null>(null);
  
  // Font-related state
  const [availableFonts, setAvailableFonts] = useState<FontOption[]>(DEFAULT_FONT_OPTIONS);
  const [isFontsLoading, setIsFontsLoading] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontSearchTerm, setFontSearchTerm] = useState('');
  const [showFontDropdown, setShowFontDropdown] = useState(-1); // -1 means no dropdown, index means which field's dropdown
  const [fontDetectionMethod, setFontDetectionMethod] = useState<'api' | 'fallback' | 'none'>('none');

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
  const mainLayoutRef = useRef<HTMLDivElement>(null);

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

  // Lazy font loading - only when user first opens font dropdown
  const loadFontsLazily = useCallback(async () => {
    if (fontsLoaded || isFontsLoading) {
      return; // Fonts already loaded or currently loading
    }
    
    setIsFontsLoading(true);
    try {
      console.log('Detecting system fonts...');
      const detectedFonts = await detectSystemFonts();
      console.log(`Detected ${detectedFonts.length} system fonts`);
      
      // Determine detection method used
      if (detectedFonts.length > 50) {
        setFontDetectionMethod('api');
      } else if (detectedFonts.length > 0) {
        setFontDetectionMethod('fallback');
      } else {
        setFontDetectionMethod('none');
      }
      
      // Combine default fonts with detected fonts, avoiding duplicates
      const combinedFonts = [...DEFAULT_FONT_OPTIONS];
      
      detectedFonts.forEach(font => {
        if (!combinedFonts.find(existing => existing.name === font.name)) {
          combinedFonts.push(font);
        }
      });
      
      // Sort all fonts alphabetically
      combinedFonts.sort((a, b) => a.name.localeCompare(b.name));
      
      setAvailableFonts(combinedFonts);
      updateFontFamilyOptions(combinedFonts); // Update the global variable too
      setFontsLoaded(true);
      console.log(`Total fonts available: ${combinedFonts.length}`);
    } catch (error) {
      console.error('Error detecting fonts:', error);
      setAvailableFonts(DEFAULT_FONT_OPTIONS);
      setFontDetectionMethod('none');
    } finally {
      setIsFontsLoading(false);
    }
  }, [fontsLoaded, isFontsLoading]);

  // Filter fonts based on search term
  const filteredFonts = useMemo(() => {
    if (!fontSearchTerm) return availableFonts;
    return availableFonts.filter(font => 
      font.name.toLowerCase().includes(fontSearchTerm.toLowerCase())
    );
  }, [availableFonts, fontSearchTerm]);

  // Function to get font dropdown for a specific field
  const getFontDropdownForField = useCallback((fieldIndex: number) => {
    return showFontDropdown === fieldIndex;
  }, [showFontDropdown]);

  // Function to toggle font dropdown
  const toggleFontDropdown = useCallback((fieldIndex: number) => {
    // If opening dropdown (not closing), trigger lazy font loading
    if (showFontDropdown !== fieldIndex) {
      loadFontsLazily(); // Start loading fonts when user first opens dropdown
    }
    
    setShowFontDropdown(prev => prev === fieldIndex ? -1 : fieldIndex);
    setFontSearchTerm(''); // Reset search when opening dropdown
  }, [showFontDropdown, loadFontsLazily]);

  // Function to close font dropdown when clicking outside
  const closeFontDropdown = useCallback(() => {
    setShowFontDropdown(-1);
    setFontSearchTerm('');
  }, []);

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

  // Handle spreadsheet file upload (CSV, XLS, XLSX, ODS)
  const handleSpreadsheetUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size === 0) {
      alert('Please select a spreadsheet file');
      return;
    }

    console.log('Spreadsheet file selected:', file.name, file.size);
    
    try {
      const result = await parseSpreadsheetFile(file);
      
      if (result.error) {
        console.error('Spreadsheet parse error:', result.error);
        alert('Error parsing spreadsheet: ' + result.error);
        return;
      }

      console.log('Spreadsheet parsed:', result);
      console.log('Headers:', result.headers);
      console.log('Data rows:', result.data.length);
      
      // Filter out empty rows
      const filteredData = result.data.filter(row => {
        return Object.values(row).some(value => value && value.trim() !== '');
      });
      
      setCsvData(filteredData);
      setCsvHeaders(result.headers);
      setCurrentCsvRowIndex(0); // Reset to first row
      
      console.log('Filtered data:', filteredData.length, 'rows');
      
      // Initialize empty field mappings for existing fields
      if (fields.length > 0) {
        const mappings = fields.map(field => ({
          fieldName: field.name,
          csvColumn: null
        }));
        setFieldMappings(mappings);
      }
    } catch (error) {
      console.error('Spreadsheet processing error:', error);
      alert('Error processing spreadsheet: ' + (error as Error).message);
    }
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
      
      // F11 for fullscreen toggle
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
      
      // Escape to close font dropdown
      if (e.key === 'Escape' && showFontDropdown !== -1) {
        e.preventDefault();
        closeFontDropdown();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [templateImage, showFontDropdown, closeFontDropdown]);

  // Click outside handler for font dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showFontDropdown !== -1) {
        const target = e.target as Element;
        // Check if click is outside font dropdown
        if (!target.closest('.font-dropdown') && !target.closest('.font-dropdown-trigger')) {
          closeFontDropdown();
        }
      }
    };

    if (showFontDropdown !== -1) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFontDropdown, closeFontDropdown]);

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
      const result = await generateImagesUtil(
        templateImage,
        imageUrl,
        csvData,
        fields,
        fieldMappings,
        fileNameMapping,
        (progress, text) => {
          setProgress(progress);
          setProgressText(text);
        }
      );

      if (result.success) {
        // Show success message
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error generating images:', error);
      alert(`Error generating images: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressText('');
    }
  }, [templateImage, csvData, fields, fieldMappings, fileNameMapping, imageUrl]);

  // Create zoom controls
  const { zoomIn, zoomOut, zoomToFit, zoomToActual } = createZoomControls(
    setZoomLevel,
    canvasRef,
    canvasContainerRef,
    originalImageWidthRef,
    originalImageHeightRef
  );

  // Create fullscreen controls
  const { toggleFullscreen: toggleFullscreenUtil, setupFullscreenListeners } = createFullscreenControls(
    setIsFullscreen,
    mainLayoutRef
  );

  const toggleFullscreen = useCallback(() => {
    toggleFullscreenUtil(isFullscreen);
  }, [isFullscreen, toggleFullscreenUtil]);

  // Listen for fullscreen changes (user pressing F11 or Esc)
  useEffect(() => {
    return setupFullscreenListeners(setIsFullscreen);
  }, [setupFullscreenListeners]);

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
    <>
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

      {/* Main Layout */}
      <div ref={mainLayoutRef} className="flex h-full bg-white">
        {/* Sidebar */}
        <div 
          className="bg-white border-r border-gray-200 flex flex-col overflow-y-auto transition-all duration-300"
          style={{ width: sidebarWidth, minWidth: 300, maxWidth: 600 }}
        >
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                Options
                {isFullscreen && (
                  <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                    Fullscreen Mode
                  </span>
                )}
              </h2>
              <button 
                onClick={toggleFullscreen} 
                title={isFullscreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"} 
                className="bg-gray-100 hover:bg-gray-50 text-gray-700 p-2 rounded-lg transition-colors border border-gray-300"
              >
                {isFullscreen ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15H4.5M9 15v4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-4 space-y-6 mb-20">
            {/* Image Upload Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                  1
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Template Image</h3>
              </div>
              
              <div>
                <label htmlFor="imageFile" className="cursor-pointer block">
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50 hover:bg-blue-100 transition-all duration-300 group">
                    <svg className="w-12 h-12 text-blue-500 mx-auto mb-3 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span className="text-blue-600 font-medium">Upload Image</span>
                    <p className="text-xs text-blue-500 mt-1">PNG, JPG, GIF up to 10MB</p>
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
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                    2
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Text Fields</h3>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-blue-700 text-sm">Click on the preview to add text fields. Use demo text to preview positioning. Drag fields to move, scroll over fields to resize.</p>
                  <div className="mt-2 text-xs text-blue-600">
                    <p className="font-medium mb-1">Text Formatting (Markdown-style):</p>
                    <div className="space-y-1">
                      <p>• <strong>**Bold text**</strong> - Use double asterisks</p>
                      <p>• <em>*Italic text*</em> - Use single asterisks</p>
                      <p>• <u>__Underlined text__</u> - Use double underscores</p>
                      <p>• <s>~~Strikethrough text~~</s> - Use double tildes</p>
                    </div>
                  </div>
                  {isFontsLoading && (
                    <div className="mt-3 flex items-center text-blue-600 text-sm">
                      <svg className="animate-spin w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      Detecting system fonts... ({availableFonts.length} found)
                    </div>
                  )}
                  {fontsLoaded && !isFontsLoading && (
                    <div className="mt-3 space-y-2">
                      <div className="text-blue-600 text-sm">
                        ✓ Found {availableFonts.length} fonts 
                        {fontDetectionMethod === 'api' && <span className="text-blue-700 ml-1">(Full access)</span>}
                        {fontDetectionMethod === 'fallback' && <span className="text-orange-600 ml-1">(Limited)</span>}
                        {fontDetectionMethod === 'none' && <span className="text-red-600 ml-1">(Default only)</span>}
                      </div>
                      {fontDetectionMethod === 'fallback' && (
                        <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
                          Enhanced font detection active. Using fallback method to detect {availableFonts.length} fonts.
                          {(() => {
                            const isChrome = navigator.userAgent.includes('Chrome');
                            const isEdge = navigator.userAgent.includes('Edge') || navigator.userAgent.includes('Edg/');
                            const chromeVersion = isChrome ? navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] : null;
                            const edgeVersion = isEdge ? navigator.userAgent.match(/Edg?\/(\d+)/)?.[1] : null;
                            
                            const hasAPI = 'queryLocalFonts' in navigator;
                            const hasCompatibleBrowser = 
                              (isChrome && chromeVersion && parseInt(chromeVersion) >= 103) ||
                              (isEdge && edgeVersion && parseInt(edgeVersion) >= 103);
                            
                            if (!hasCompatibleBrowser) {
                              return (
                                <div className="mt-2 text-blue-700">
                                  💡 For access to all system fonts, upgrade to Chrome 103+ or Edge 103+
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                      {fontDetectionMethod === 'none' && (
                        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                          Font detection failed. Using default fonts only. Try "Reload" or upgrade your browser.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-3 mb-4">
                  {fields.map((field, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${selectedFieldIndex === index ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}>
                      <div className="flex items-center mb-2">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateField(index, 'name', e.target.value)}
                          placeholder="Field Name"
                          className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm flex-1 mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded mr-2 flex-shrink-0">
                          {field.type === 'text' ? 'Text' : 'QR'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => setSelectedFieldIndex(index)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors whitespace-nowrap"
                          >
                            Select
                          </button>
                          <button
                            onClick={() => removeField(index)}
                            className="bg-red-600 hover:bg-red-700 text-white p-1 rounded transition-colors flex-shrink-0"
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
                        className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm w-full mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                              className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {/* Font Dropdown with Search */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => toggleFontDropdown(index)}
                                className="font-dropdown-trigger w-full bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm text-left flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isFontsLoading}
                              >
                                <span className="truncate">
                                  {isFontsLoading ? 'Loading fonts...' : 
                                   (availableFonts.find(font => font.value === field.fontFamily)?.name || 'Arial')}
                                </span>
                                <svg className="w-4 h-4 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                              </button>
                              
                              {getFontDropdownForField(index) && (
                                <div className="font-dropdown absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                                  {/* Search Input */}
                                  <div className="p-2 border-b border-gray-200">
                                    <input
                                      type="text"
                                      value={fontSearchTerm}
                                      onChange={(e) => setFontSearchTerm(e.target.value)}
                                      placeholder="Search fonts..."
                                      className="w-full bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      autoFocus
                                    />
                                  </div>
                                  
                                  {/* Font List */}
                                  <div className="overflow-y-auto max-h-48">
                                    {filteredFonts.length > 0 ? (
                                      filteredFonts.map(font => (
                                        <button
                                          key={font.value}
                                          type="button"
                                          onClick={() => {
                                            updateTextField(index, 'fontFamily', font.value);
                                            closeFontDropdown();
                                          }}
                                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                                            field.fontFamily === font.value ? 'bg-blue-600 text-white' : 'text-gray-700'
                                          }`}
                                          style={{ fontFamily: font.value }}
                                        >
                                          {font.name}
                                        </button>
                                      ))
                                    ) : (
                                      <div className="px-3 py-2 text-sm text-gray-500">
                                        No fonts found
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Font Count */}
                                  <div className="px-3 py-1 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
                                    {filteredFonts.length} of {availableFonts.length} fonts
                                    {fontDetectionMethod === 'api' && (
                                      <span className="ml-2 text-green-600">• Full system access</span>
                                    )}
                                    {fontDetectionMethod === 'fallback' && (
                                      <span className="ml-2 text-orange-600">• Limited detection</span>
                                    )}
                                    {fontDetectionMethod === 'none' && (
                                      <span className="ml-2 text-red-600">• Default fonts only</span>
                                    )}
                                    {isFontsLoading && (
                                      <span className="ml-2 text-green-600">
                                        • Detecting...
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Text Color Controls */}
                          <div>
                            <label className="block text-gray-700 text-xs font-medium mb-2">Text Color</label>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-1">
                                {COLOR_PRESETS.map(color => (
                                  <button
                                    key={color.value}
                                    onClick={() => updateField(index, 'color', color.value)}
                                    className={`w-6 h-6 rounded border-2 ${field.color === color.value ? 'border-gray-800' : 'border-gray-300'} hover:border-gray-800 transition-colors`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                  />
                                ))}
                              </div>
                              <details className="mt-2">
                                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">Custom Color</summary>
                                <input
                                  type="color"
                                  value={field.color}
                                  onChange={(e) => updateField(index, 'color', e.target.value)}
                                  className="w-full h-8 bg-white border border-gray-300 rounded cursor-pointer mt-1"
                                />
                              </details>
                            </div>
                          </div>

                          {/* Text Alignment Controls */}
                          <div className="mt-3">
                            <label className="block text-gray-700 text-xs font-medium mb-2">Text Alignment</label>
                            <div className="flex gap-2">
                              {TEXT_ALIGN_OPTIONS.map(option => (
                                <button
                                  key={option.value}
                                  onClick={() => updateTextField(index, 'textAlign', option.value)}
                                  className={`flex-1 px-3 py-1 rounded-lg text-sm font-medium transition-all flex items-center justify-center
                                    ${field.textAlign === option.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-blue-600 hover:bg-blue-100 border border-gray-300'}
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
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm shadow-md"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Spreadsheet Upload Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                  3
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Spreadsheet Data</h3>
              </div>
              
              <div>
                <label htmlFor="csvFile" className="cursor-pointer block">
                  <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 text-center bg-orange-50 hover:bg-orange-100 transition-all duration-300 group">
                    <svg className="w-12 h-12 text-orange-500 mx-auto mb-3 group-hover:text-orange-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span className="text-orange-600 font-medium">Upload Spreadsheet</span>
                    <p className="text-xs text-orange-500 mt-1">CSV, XLS, XLSX, or ODS files</p>
                  </div>
                </label>
                <input 
                  type="file" 
                  id="csvFile" 
                  accept=".csv,.xls,.xlsx,.ods" 
                  className="hidden" 
                  onChange={handleSpreadsheetUpload}
                />
              </div>
              
              {csvData && (
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center">
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
                        className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 border border-gray-300"
                        title="Previous Row"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                      </button>
                      
                      <span className="text-xs text-gray-600 min-w-[60px] text-center">
                        Row {currentCsvRowIndex + 1} of {csvData.length}
                      </span>
                      
                      <button
                        onClick={goToNextRow}
                        disabled={currentCsvRowIndex === csvData.length - 1}
                        className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 border border-gray-300"
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
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-xs">
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
                  <div className="bg-white border border-gray-200 rounded overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-100">
                          <tr>
                            {csvHeaders.map(header => (
                              <th key={header} className="px-2 py-1 text-left text-gray-700 font-medium">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="text-gray-800">
                          <tr className="border-b border-gray-200 bg-blue-50">
                            {csvHeaders.map(header => (
                              <td key={header} className="px-2 py-1 font-medium text-blue-700">
                                {getCurrentRowData()?.[header] || ''}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Show preview tip */}
                  <div className="mt-2 text-xs text-gray-600 flex items-center">
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
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                    4
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Field Mapping</h3>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                  <p className="text-purple-700 text-sm">Map your template fields to spreadsheet columns. Unmapped fields will be left empty.</p>
                </div>
                
                <div className="space-y-3 mb-4">
                  {/* File Name Mapping */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                      </svg>
                      <span className="text-sm font-medium text-indigo-700">Custom File Names</span>
                    </div>
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-sm text-gray-700 min-w-[80px]">file_name:</span>
                      <div className="flex-1 min-w-0">
                        <select
                          value={fileNameMapping.csvColumn || ''}
                          onChange={(e) => updateFileNameMapping(e.target.value)}
                          className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <label htmlFor="includeNumbering" className="text-sm text-gray-700">
                          Include numbering prefix (0001_filename.png)
                        </label>
                      </div>
                    )}
                    <p className="text-xs text-indigo-600 mt-2">
                      Optional: Select a spreadsheet column to use custom file names. Files will be automatically saved as .png
                      {fileNameMapping.csvColumn && !fileNameMapping.includeNumbering && (
                        <span className="block mt-1 text-orange-600">⚠️ Without numbering, duplicate filenames will overwrite each other</span>
                      )}
                    </p>
                  </div>

                  {/* Field Mappings */}
                  {fieldMappings.map((mapping, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700 min-w-[80px]">{mapping.fieldName}:</span>
                      <select
                        value={mapping.csvColumn || ''}
                        onChange={(e) => updateFieldMapping(mapping.fieldName, e.target.value)}
                        className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm shadow-md"
                  >
                    Clear All Mappings
                  </button>
                </div>
              </div>
            )}

            {/* Generate Images Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                  5
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Generate Images</h3>
              </div>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center mb-2">
                    <span className="text-sm text-gray-700">Generating Images...</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-700 whitespace-nowrap min-w-[120px]">
                      {progressText || `${Math.round(progress)}%`}
                    </span>
                  </div>
                </div>
              )}

              <button 
                onClick={generateImages}
                disabled={!isReadyToGenerate || isProcessing}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  {isProcessing ? 'Generating...' : 'Generate Images'}
                </span>
              </button>

              {!isReadyToGenerate && !isProcessing && (
                <div className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-2">
                  {!templateImage && "• Upload a template image"}
                  {templateImage && fields.length === 0 && "• Add text fields by clicking on the preview"}
                  {templateImage && fields.length > 0 && !csvData && "• Upload spreadsheet data"}
                  {templateImage && fields.length > 0 && csvData && getUnmappedFields().length > 0 && "• Map all fields to spreadsheet columns"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        <div 
          className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors"
          onMouseDown={handleSidebarResizeStart}
        />

        {/* Main Preview Area */}
        <div className="flex-1 bg-gray-50 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Preview Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
                {showZoomControls && ( <>
                <span className="text-xs text-gray-600 ml-4 flex items-center">
                  {/* Mouse Middle Button SVG */}
                  Hold
                  <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="3" width="14" height="18" rx="4" fill="#F3F4F6" stroke="#6B7280" strokeWidth="1.5"/>
                    <rect x="11" y="5" width="2" height="4" rx="1" fill="#6B7280"/>
                  </svg>
                  <span className="mx-1 px-1 bg-gray-100 text-gray-700 rounded">mouse middle button</span>
                  and drag to pan
                </span>
                  <div className="flex items-center space-x-3">
                    <button onClick={zoomOut} title="Zoom Out (Ctrl+-)" className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors border border-gray-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
                      </svg>
                    </button>
                    <span className="text-gray-700 text-sm font-medium min-w-[60px] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button onClick={zoomIn} title="Zoom In (Ctrl++)" className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors border border-gray-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                      </svg>
                    </button>
                    <button onClick={zoomToFit} title="Zoom to Fit (Ctrl+0)" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors text-xs border border-gray-300">
                      Fit
                    </button>
                    <button onClick={zoomToActual} title="Actual Size (Ctrl+1)" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors text-xs border border-gray-300">
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
                  className="h-full w-full bg-white border border-gray-200 rounded-lg canvas-container overflow-auto shadow-md"
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
                    <svg className="w-24 h-24 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <p className="text-xl font-medium text-gray-700">Upload an image to start</p>
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
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw shadow-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Field Type</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleFieldTypeSelection('text')}
                className="w-full p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-left transition-colors shadow-md hover:shadow-lg"
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
                className="w-full p-4 bg-green-600 hover:bg-green-700 rounded-lg text-white text-left transition-colors shadow-md hover:shadow-lg"
              >
                <div className="flex items-center">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                  </svg>
                  <div>
                    <div className="font-medium">QR Code Field</div>
                    <div className="text-sm text-green-200">Generate QR codes from spreadsheet data</div>
                  </div>
                </div>
              </button>
            </div>
            <button
              onClick={() => {
                setShowFieldTypeModal(false);
                setPendingFieldPosition(null);
              }}
              className="w-full mt-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors border border-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageMailMerge;