import React, { useState, useRef, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import JSZip from 'jszip';

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

interface Field {
  name: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  demoText: string;
}

interface CSVRow {
  [key: string]: string;
}

interface FieldMapping {
  fieldName: string;
  csvColumn: string | null;
}

const MailMerge: React.FC = () => {
  // State
  const [templateImage, setTemplateImage] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[] | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
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
  const [showFieldDefinition, setShowFieldDefinition] = useState(false);
  const [showZoomControls, setShowZoomControls] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);

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
        
        console.log('Filtered CSV data:', filteredData.length, 'rows');
        
        // Initialize field mapping after setting headers
        const mappings = fields.map(field => ({
          fieldName: field.name,
          csvColumn: headers.find(header => 
            header.toLowerCase().includes(field.name.toLowerCase()) ||
            field.name.toLowerCase().includes(header.toLowerCase())
          ) || null
        }));
        setFieldMappings(mappings);
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        alert('Error parsing CSV: ' + error.message);
      }
    });
  }, [fields]);

  // Add field at position (matching original functionality)
  const addFieldAtPosition = useCallback((x: number, y: number) => {
    const fieldName = prompt('Enter field name:');
    if (!fieldName) return;

    const field: Field = {
      name: fieldName,
      x: x,
      y: y,
      fontSize: 24,
      fontFamily: 'Arial, sans-serif',
      color: '#000000',
      demoText: ''
    };

    setFields(prev => [...prev, field]);
    
    // Add mapping for new field
    setFieldMappings(prev => [...prev, {
      fieldName: fieldName,
      csvColumn: null
    }]);
    
    // Try to auto-map the new field if CSV is already loaded
    if (csvHeaders.length > 0) {
      autoMapFields();
    }
    
    drawFields();
    checkReadyToGenerate();
  }, [csvHeaders]);

  // Draw fields (matching original functionality)
  const drawFields = useCallback(() => {
    if (!templateImage || !canvasRef.current || !ctxRef.current || !imageRef.current) return;

    const ctx = ctxRef.current;
    const img = imageRef.current;
    
    // Clear the entire canvas first
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Ensure the image is available and draw it fresh
    ctx.drawImage(img, 0, 0);

    // Draw field markers and demo text
    fields.forEach((field, index) => {
      // Draw demo text if available
      if (field.demoText && field.demoText.trim()) {
        // When demo text is present, only show the demo text, no pointer
        ctx.font = `${field.fontSize}px ${field.fontFamily || 'Arial, sans-serif'}`;
        ctx.fillStyle = field.color;
        ctx.fillText(field.demoText, field.x, field.y);
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
        ctx.fillText(`${index + 1}`, field.x + 12, field.y - 8);
        
        // Draw field name
        ctx.fillStyle = '#1f2937';
        ctx.font = '12px Arial';
        ctx.fillText(field.name, field.x + 12, field.y + 6);
      }

      // Draw selection indicator
      if (index === selectedFieldIndex) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        if (field.demoText && field.demoText.trim()) {
          const metrics = ctx.measureText(field.demoText);
          ctx.strokeRect(
            field.x - 2, 
            field.y - 2, 
            metrics.width + 4, 
            field.fontSize + 4
          );
        } else {
          ctx.strokeRect(field.x - 10, field.y - 10, 20, 20);
        }
      }
    });
  }, [fields, selectedFieldIndex, templateImage]);

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

  // Get field at position
  const getFieldAtPosition = useCallback((x: number, y: number): { index: number, isResizeHandle: boolean } => {
    if (!ctxRef.current) return { index: -1, isResizeHandle: false };

    for (let i = fields.length - 1; i >= 0; i--) {
      const field = fields[i];
      
      if (field.demoText && field.demoText.trim()) {
        // Check text field
        const metrics = ctxRef.current.measureText(field.demoText);
        if (x >= field.x && x <= field.x + metrics.width &&
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
    }
    return { index: -1, isResizeHandle: false };
  }, [fields]);

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
          fontSize: field.fontSize 
        };
        canvasRef.current.style.cursor = 'nw-resize';
      } else {
        setIsDragging(true);
        dragStartRef.current = { 
          x: coords.x, 
          y: coords.y, 
          fieldX: field.x, 
          fieldY: field.y, 
          fontSize: field.fontSize 
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

  // Handle wheel for field resizing
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const coords = getCanvasCoordinates(e);
    const hit = getFieldAtPosition(coords.x, coords.y);
    
    if (hit.index >= 0) {
      e.preventDefault();
      const field = fields[hit.index];
      const delta = e.deltaY > 0 ? -2 : 2;
      const newFontSize = Math.max(8, Math.min(72, field.fontSize + delta));
      
      setFields(prev => prev.map((f, i) => 
        i === hit.index ? { ...f, fontSize: newFontSize } : f
      ));
    }
  }, [fields, getCanvasCoordinates, getFieldAtPosition]);

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

  // Update field
  const updateField = useCallback((index: number, property: keyof Field, value: string | number) => {
    setFields(prev => prev.map((field, i) => 
      i === index ? { ...field, [property]: value } : field
    ));
  }, []);

  // Remove field
  const removeField = useCallback((index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
    setFieldMappings(prev => prev.filter((_, i) => i !== index));
    if (selectedFieldIndex === index) {
      setSelectedFieldIndex(-1);
    } else if (selectedFieldIndex > index) {
      setSelectedFieldIndex(prev => prev - 1);
    }
  }, [selectedFieldIndex]);

  // Clear fields
  const clearFields = useCallback(() => {
    setFields([]);
    setSelectedFieldIndex(-1);
    setFieldMappings([]);
  }, []);

  // Auto map fields
  const autoMapFields = useCallback(() => {
    if (!csvHeaders.length) return;

    const mappings = fields.map(field => ({
      fieldName: field.name,
      csvColumn: csvHeaders.find(header => 
        header.toLowerCase().includes(field.name.toLowerCase()) ||
        field.name.toLowerCase().includes(header.toLowerCase())
      ) || null
    }));
    setFieldMappings(mappings);
  }, [fields, csvHeaders]);

  // Initialize field mapping when CSV is loaded
  useEffect(() => {
    if (csvHeaders.length > 0 && fields.length > 0) {
      autoMapFields();
    }
  }, [csvHeaders, fields, autoMapFields]);

  // Clear field mapping
  const clearFieldMapping = useCallback(() => {
    setFieldMappings(fields.map(field => ({ fieldName: field.name, csvColumn: null })));
  }, [fields]);

  // Update field mapping
  const updateFieldMapping = useCallback((fieldName: string, csvColumn: string) => {
    setFieldMappings(prev => prev.map(mapping => 
      mapping.fieldName === fieldName 
        ? { ...mapping, csvColumn } 
        : mapping
    ));
  }, []);

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

    const zip = new JSZip();
    const totalRows = csvData.length;

    for (let i = 0; i < totalRows; i++) {
      const row = csvData[i];
      
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
      fields.forEach(field => {
        const mapping = fieldMappings.find(m => m.fieldName === field.name);
        const text = mapping?.csvColumn ? row[mapping.csvColumn] || '' : field.demoText || '';
        
        if (text) {
          ctx.font = `${field.fontSize}px ${field.fontFamily}`;
          ctx.fillStyle = field.color;
          ctx.textBaseline = 'top';
          ctx.fillText(text, field.x, field.y);
        }
      });

      // Add to zip
      canvas.toBlob((blob) => {
        if (blob) {
          zip.file(`image_${i + 1}.png`, blob);
        }
      }, 'image/png');

      setProgress(((i + 1) / totalRows) * 100);
    }

    // Download zip
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mailmerge_images.zip';
    a.click();
    URL.revokeObjectURL(url);

    setIsProcessing(false);
    setProgress(0);
  }, [templateImage, csvData, fields, fieldMappings, imageUrl]);

  // Zoom controls
  const zoomIn = useCallback(() => setZoomLevel(prev => Math.min(prev * 1.2, 5)), []);
  const zoomOut = useCallback(() => setZoomLevel(prev => Math.max(prev / 1.2, 0.1)), []);
  const zoomToFit = useCallback(() => {
    if (!canvasRef.current || !originalImageWidthRef.current || !originalImageHeightRef.current) return;
    
    const container = canvasContainerRef.current;
    if (!container) return;
    
    const containerWidth = container.clientWidth - 32; // Account for padding
    const containerHeight = container.clientHeight - 32;
    
    const scaleX = containerWidth / originalImageWidthRef.current;
    const scaleY = containerHeight / originalImageHeightRef.current;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
    
    console.log('Zoom to fit:', { containerWidth, containerHeight, scaleX, scaleY, scale });
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
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Mail Merge Tool
            </h1>
            <span className="text-sm text-gray-400">for image</span>
          </div>
          <div className="flex items-center space-x-4">
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
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input
                          type="number"
                          value={field.fontSize}
                          onChange={(e) => updateField(index, 'fontSize', parseInt(e.target.value))}
                          placeholder="Font Size"
                          className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
                        />
                        <select
                          value={field.fontFamily}
                          onChange={(e) => updateField(index, 'fontFamily', e.target.value)}
                          className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
                        >
                          {FONT_FAMILY_OPTIONS.map(font => (
                            <option key={font.value} value={font.value}>{font.name}</option>
                          ))}
                        </select>
                      </div>
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
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    CSV Preview ({csvData.length} rows)
                  </h4>
                  <div className="bg-gray-700 rounded overflow-hidden">
                    <div className="overflow-x-auto max-h-40">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-800">
                          <tr>
                            {csvHeaders.map(header => (
                              <th key={header} className="px-2 py-1 text-left text-gray-300 font-medium">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="text-gray-200">
                          {csvData.slice(0, 5).map((row, index) => (
                            <tr key={index} className="border-b border-gray-600">
                              {csvHeaders.map(header => (
                                <td key={header} className="px-2 py-1">{row[header] || ''}</td>
                              ))}
                            </tr>
                          ))}
                          {csvData.length > 5 && (
                            <tr>
                              <td colSpan={csvHeaders.length} className="px-2 py-1 text-center text-gray-400 italic">
                                ... and {csvData.length - 5} more rows
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
                
                <div className="flex gap-2">
                  <button 
                    onClick={autoMapFields}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
                  >
                    Auto Map
                  </button>
                  <button 
                    onClick={clearFieldMapping}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Progress Section */}
            {isProcessing && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Processing</h3>
                <div className="bg-gray-600 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-center text-gray-300 mt-2 text-sm">
                  Processing... {Math.round(progress)}%
                </p>
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
                {showZoomControls && (
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
                )}
              </div>
            </div>
            
            {/* Preview Content */}
            <div className="flex-1 p-6 overflow-auto">
              {templateImage ? (
                <div 
                  ref={canvasContainerRef}
                  className="h-full w-full overflow-auto bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center justify-center min-h-full p-4">
                    <div 
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'top left'
                      }}
                    >
                      <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onWheel={handleWheel}
                        className="cursor-crosshair rounded-lg shadow-lg"
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
    </div>
  );
};

export default MailMerge;