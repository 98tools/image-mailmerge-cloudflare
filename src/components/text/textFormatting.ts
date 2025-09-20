// Text formatting segment interface
export interface TextSegment {
  text: string;
  formats: string[];
}

// Function to parse markdown-like text and apply formatting
export const parseMarkdownText = (text: string): TextSegment[] => {
  // Process text by replacing markdown patterns sequentially
  let processedText = text;
  const segments: TextSegment[] = [];
  
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
export const applyTextFormatting = (
  ctx: CanvasRenderingContext2D, 
  formats: string[], 
  fontFamily: string, 
  fontSize: number
) => {
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
export const drawFormattedText = (
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