import { parseMarkdownText, applyTextFormatting } from '../text/textFormatting';
import { Field } from '../types/fieldTypes';

// Canvas coordinates utilities
export const getCanvasCoordinates = (
  e: React.MouseEvent<HTMLCanvasElement> | MouseEvent,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  zoomLevel: number,
  canvasOffsetX: number,
  canvasOffsetY: number
) => {
  if (!canvasRef.current) return { x: 0, y: 0 };
  
  const rect = canvasRef.current.getBoundingClientRect();
  const x = (e.clientX - rect.left) / zoomLevel - canvasOffsetX;
  const y = (e.clientY - rect.top) / zoomLevel - canvasOffsetY;
  return { x, y };
};

// Field position detection utilities
export const getFieldAtPosition = (
  x: number,
  y: number,
  fields: Field[],
  ctxRef: React.RefObject<CanvasRenderingContext2D>,
  getFieldDisplayText: (field: Field) => string
): { index: number, isResizeHandle: boolean } => {
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
};

// Mouse event handlers for canvas interactions
export const createCanvasMouseHandlers = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  canvasContainerRef: React.RefObject<HTMLDivElement>,
  panStartRef: React.MutableRefObject<{ x: number; y: number }>,
  dragStartRef: React.MutableRefObject<{ x: number; y: number; fieldX: number; fieldY: number; fontSize: number }>,
  fields: Field[],
  zoomLevel: number,
  canvasOffsetX: number,
  canvasOffsetY: number,
  isPanning: boolean,
  isDragging: boolean,
  isResizing: boolean,
  selectedFieldIndex: number,
  getFieldDisplayText: (field: Field) => string,
  setIsPanning: (panning: boolean) => void,
  setIsDragging: (dragging: boolean) => void,
  setIsResizing: (resizing: boolean) => void,
  setSelectedFieldIndex: (index: number) => void,
  setFields: React.Dispatch<React.SetStateAction<Field[]>>,
  addFieldAtPosition: (x: number, y: number) => void
) => {
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
    
    const coords = getCanvasCoordinates(e, canvasRef, zoomLevel, canvasOffsetX, canvasOffsetY);
    const hit = getFieldAtPosition(coords.x, coords.y, fields, { current: canvasRef.current.getContext('2d') }, getFieldDisplayText);
    
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
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    // Panning is handled by global mouse events, so skip if panning
    if (isPanning) return;
    
    const coords = getCanvasCoordinates(e, canvasRef, zoomLevel, canvasOffsetX, canvasOffsetY);
    
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
      const hit = getFieldAtPosition(coords.x, coords.y, fields, { current: canvasRef.current.getContext('2d') }, getFieldDisplayText);
      if (hit.index >= 0) {
        canvasRef.current.style.cursor = hit.isResizeHandle ? 'nw-resize' : 'move';
      } else {
        canvasRef.current.style.cursor = 'crosshair';
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
  };

  const handleWheelNative = (e: WheelEvent) => {
    // Always prevent default scrolling behavior
    e.preventDefault();
    
    if (!canvasRef.current) return;
    
    // Convert native event to React-like coordinates
    const coords = getCanvasCoordinates(e as any, canvasRef, zoomLevel, canvasOffsetX, canvasOffsetY);
    const hit = getFieldAtPosition(coords.x, coords.y, fields, { current: canvasRef.current.getContext('2d') }, getFieldDisplayText);
    
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
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheelNative
  };
};