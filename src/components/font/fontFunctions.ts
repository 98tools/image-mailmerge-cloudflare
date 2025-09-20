import { comprehensiveFontList, DEFAULT_FONT_OPTIONS } from './fontsList';

// Font type definition
export interface FontOption {
  name: string;
  value: string;
}

// Method 1: Discover fonts using CSS enumeration
export const discoverFontsFromCSS = async (): Promise<FontOption[]> => {
  const discoveredFonts: FontOption[] = [];
  
  try {
    // Create a hidden element to test font rendering
    const testElement = document.createElement('div');
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.style.fontSize = '100px';
    testElement.style.left = '-9999px';
    testElement.textContent = 'mmmmmmmmmmlli.';
    document.body.appendChild(testElement);

    // Get computed style baseline with a generic font
    testElement.style.fontFamily = 'monospace';
    const monoWidth = testElement.offsetWidth;
    
    testElement.style.fontFamily = 'serif';
    const serifWidth = testElement.offsetWidth;
    
    testElement.style.fontFamily = 'sans-serif';
    const sansWidth = testElement.offsetWidth;

    // Method: Try common font name patterns and variations
    const fontPatterns = [
      // System fonts that might be available
      'system-ui', '-apple-system', 'BlinkMacSystemFont',
      
      // Windows font variations
      'Segoe UI', 'Segoe UI Light', 'Segoe UI Semibold', 'Segoe UI Symbol',
      'Microsoft Sans Serif', 'Microsoft YaHei', 'Microsoft JhengHei',
      'Calibri Light', 'Cambria Math', 'Candara Light',
      
      // macOS font variations  
      'SF Pro Display', 'SF Pro Text', 'SF Compact Display', 'SF Compact Text',
      'Helvetica Neue Light', 'Avenir Next', 'Avenir Next Condensed',
      
      // Adobe fonts (if installed)
      'Source Sans Pro', 'Source Serif Pro', 'Source Code Pro',
      'Adobe Clean', 'Adobe Garamond Pro', 'Minion Pro',
      
      // Microsoft Office fonts
      'Calibri Light', 'Cambria Math', 'Candara Light', 'Consolas',
      'Constantia', 'Corbel Light', 'Franklin Gothic Medium',
      
      // Google Fonts (commonly installed)
      'Open Sans', 'Open Sans Light', 'Open Sans Condensed',
      'Roboto', 'Roboto Light', 'Roboto Condensed', 'Roboto Slab',
      'Lato', 'Montserrat', 'Source Sans Pro', 'PT Sans',
      
      // Programming fonts
      'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Operator Mono',
      'Input Mono', 'Dank Mono', 'Victor Mono', 'Anonymous Pro',
      
      // Design fonts
      'Proxima Nova', 'Avenir', 'Futura PT', 'Brandon Grotesque',
      'Gotham', 'Circular', 'Inter', 'SF Mono'
    ];

    for (const fontName of fontPatterns) {
      testElement.style.fontFamily = `"${fontName}", monospace`;
      const testWidth1 = testElement.offsetWidth;
      
      testElement.style.fontFamily = `"${fontName}", serif`;
      const testWidth2 = testElement.offsetWidth;
      
      testElement.style.fontFamily = `"${fontName}", sans-serif`;
      const testWidth3 = testElement.offsetWidth;
      
      // If any of the widths differ from baseline, font is likely available (more permissive)
      if ((Math.abs(testWidth1 - monoWidth) > 0.5) || 
          (Math.abs(testWidth2 - serifWidth) > 0.5) || 
          (Math.abs(testWidth3 - sansWidth) > 0.5)) {
        const fontValue = fontName.includes(' ') ? `"${fontName}", sans-serif` : `${fontName}, sans-serif`;
        discoveredFonts.push({ name: fontName, value: fontValue });
      }
      
      // Allow UI to breathe
      if (discoveredFonts.length % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    document.body.removeChild(testElement);
    console.log(`CSS enumeration found ${discoveredFonts.length} fonts`);
    
  } catch (error) {
    console.error('CSS font enumeration error:', error);
  }
  
  return discoveredFonts;
};

// Method 2: Discover fonts from document.fonts
export const discoverFontsFromDocument = async (): Promise<FontOption[]> => {
  const discoveredFonts: FontOption[] = [];
  
  try {
    if ('fonts' in document) {
      // Wait for fonts to be ready
      await document.fonts.ready;
      
      const fontSet = new Set<string>();
      
      // Iterate through loaded fonts
      document.fonts.forEach((font) => {
        if (font.family && !fontSet.has(font.family)) {
          fontSet.add(font.family);
          const fontName = font.family;
          const fontValue = fontName.includes(' ') ? `"${fontName}", sans-serif` : `${fontName}, sans-serif`;
          discoveredFonts.push({ name: fontName, value: fontValue });
        }
      });
      
      console.log(`document.fonts enumeration found ${discoveredFonts.length} fonts`);
    }
  } catch (error) {
    console.error('document.fonts enumeration error:', error);
  }
  
  return discoveredFonts;
};

// Method 3: Font discovery by testing variations and patterns
export const discoverFontsByPattern = async (): Promise<FontOption[]> => {
  const discoveredFonts: FontOption[] = [];
  
  try {
    // Test font name patterns that are commonly used
    const fontBases = [
      'Arial', 'Helvetica', 'Times', 'Courier', 'Georgia', 'Verdana', 'Calibri',
      'Segoe', 'SF', 'Avenir', 'Futura', 'Gill', 'Optima', 'Trebuchet',
      'Ubuntu', 'Roboto', 'Open', 'Source', 'Noto', 'Liberation', 'DejaVu',
      'Fira', 'Inter', 'Lato', 'Montserrat', 'Poppins', 'Playfair'
    ];
    
    const variations = [
      '', ' Light', ' Regular', ' Medium', ' Bold', ' Black', ' Thin',
      ' Condensed', ' Extended', ' Narrow', ' Wide',
      ' Sans', ' Serif', ' Mono', ' Display', ' Text',
      ' Pro', ' UI', ' MT', ' MS'
    ];
    
    const fontSet = new Set<string>();
    
    for (const base of fontBases) {
      for (const variation of variations) {
        const fontName = base + variation;
        
        if (!fontSet.has(fontName) && testFontAvailabilityAdvanced(fontName)) {
          fontSet.add(fontName);
          const fontValue = fontName.includes(' ') ? `"${fontName}", sans-serif` : `${fontName}, sans-serif`;
          discoveredFonts.push({ name: fontName, value: fontValue });
        }
        
        // Also test with common prefixes
        const prefixes = ['Microsoft ', 'Adobe ', 'Google ', 'Apple '];
        for (const prefix of prefixes) {
          const prefixedFont = prefix + fontName;
          if (!fontSet.has(prefixedFont) && testFontAvailabilityAdvanced(prefixedFont)) {
            fontSet.add(prefixedFont);
            const fontValue = prefixedFont.includes(' ') ? `"${prefixedFont}", sans-serif` : `${prefixedFont}, sans-serif`;
            discoveredFonts.push({ name: prefixedFont, value: fontValue });
          }
        }
        
        // Allow UI to breathe
        if (discoveredFonts.length % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
    }
    
    console.log(`Pattern-based discovery found ${discoveredFonts.length} fonts`);
  } catch (error) {
    console.error('Pattern-based font discovery error:', error);
  }
  
  return discoveredFonts;
};

// Enhanced canvas-based font detection with broader testing
export const testFontAvailabilityAdvanced = (fontName: string): boolean => {
  try {
    // Use multiple test methods for better accuracy
    const testStrings = [
      'mmmmmmmmmmlli', // Different character widths
      'abcdefghijklmnopqrstuvwxyz', // Full alphabet
      '1234567890', // Numbers
      'The quick brown fox jumps', // Mixed content
    ];
    
    const testSizes = ['16px', '24px', '32px'];
    const fallbackFonts = ['monospace', 'serif', 'sans-serif'];
    
    for (const testString of testStrings) {
      for (const testSize of testSizes) {
        for (const fallbackFont of fallbackFonts) {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          
          // Measure fallback font
          context.font = `${testSize} ${fallbackFont}`;
          const fallbackMetrics = context.measureText(testString);
          const fallbackWidth = fallbackMetrics.width;
          
          // Measure with target font
          context.font = `${testSize} "${fontName}", ${fallbackFont}`;
          const testMetrics = context.measureText(testString);
          const testWidth = testMetrics.width;
          
          // If widths differ even slightly, font is available (more permissive)
          if (Math.abs(testWidth - fallbackWidth) > 0.1) {
            return true;
          }
        }
      }
    }
    return false;
  } catch (error) {
    console.warn(`Error testing font ${fontName}:`, error);
    return false;
  }
};

// Function to detect available fonts on the system
export const detectSystemFonts = async (): Promise<FontOption[]> => {
  const detectedFonts: FontOption[] = [];
  
  // First, try to request Font Access API permission
  try {
    if ('queryLocalFonts' in navigator) {
      try {
        // Request permission first
        const permission = await navigator.permissions.query({ name: 'local-fonts' as any });
        console.log('Font Access API permission:', permission.state);
        
        if (permission.state === 'granted' || permission.state === 'prompt') {
          const fonts = await (navigator as any).queryLocalFonts();
          const fontSet = new Set<string>();
          
          console.log(`Font Access API returned ${fonts.length} fonts`);
          
          fonts.forEach((font: any) => {
            if (font.family && !fontSet.has(font.family)) {
              fontSet.add(font.family);
              const fontName = font.family;
              const fontValue = fontName.includes(' ') ? `"${fontName}", sans-serif` : `${fontName}, sans-serif`;
              detectedFonts.push({ name: fontName, value: fontValue });
            }
          });
          
          if (detectedFonts.length > 0) {
            console.log(`Successfully detected ${detectedFonts.length} fonts via Font Access API`);
            detectedFonts.sort((a, b) => a.name.localeCompare(b.name));
            return detectedFonts;
          }
        }
      } catch (error) {
        console.log('Font Access API permission denied or failed:', error);
      }
    }
  } catch (error) {
    console.log('Font Access API not available:', error);
  }

  // Dynamic font discovery - try to discover fonts without predefined lists
  console.log('Attempting dynamic font discovery...');
  
  // Method 1: CSS font-family enumeration (works in some browsers)
  try {
    const discoveredFonts = await discoverFontsFromCSS();
    if (discoveredFonts.length > 0) {
      console.log(`Discovered ${discoveredFonts.length} fonts via CSS enumeration`);
      detectedFonts.push(...discoveredFonts);
    }
  } catch (error) {
    console.log('CSS font enumeration failed:', error);
  }

  // Method 2: Font analysis via document.fonts
  try {
    const documentFonts = await discoverFontsFromDocument();
    if (documentFonts.length > 0) {
      console.log(`Discovered ${documentFonts.length} fonts via document.fonts`);
      detectedFonts.push(...documentFonts);
    }
  } catch (error) {
    console.log('document.fonts enumeration failed:', error);
  }

  // Method 3: Pattern-based font discovery
  try {
    const patternFonts = await discoverFontsByPattern();
    if (patternFonts.length > 0) {
      console.log(`Discovered ${patternFonts.length} fonts via pattern testing`);
      detectedFonts.push(...patternFonts);
    }
  } catch (error) {
    console.log('Pattern-based font discovery failed:', error);
  }
  
  // Method 3: Enhanced fallback with comprehensive font testing
  console.log('Using enhanced fallback font detection...');
  
  // Start with discovered fonts from dynamic methods
  const allDiscoveredFonts = new Set<string>();
  detectedFonts.forEach(font => allDiscoveredFonts.add(font.name));
    
  // Test all fonts (discovered + comprehensive) using advanced detection
  const allFontsToTest = [...new Set([...allDiscoveredFonts, ...comprehensiveFontList])];
  console.log(`Testing ${allFontsToTest.length} fonts with enhanced detection...`);
  
  const batchSize = 8; // Larger batches since we simplified the test
  let testedCount = 0;
  
  for (let i = 0; i < allFontsToTest.length; i += batchSize) {
    const batch = allFontsToTest.slice(i, i + batchSize);
    
    for (const fontName of batch) {
      if (!detectedFonts.find(f => f.name === fontName)) {
        if (testFontAvailabilityAdvanced(fontName)) {
          const fontValue = fontName.includes(' ') || fontName.includes('-') ? 
            `"${fontName}", sans-serif` : `${fontName}, sans-serif`;
          detectedFonts.push({ name: fontName, value: fontValue });
        }
      }
      testedCount++;
    }
    
    // Allow UI to breathe and show progress
    if (i % 40 === 0) {
      console.log(`Progress: tested ${testedCount}/${allFontsToTest.length} fonts, found ${detectedFonts.length} available`);
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }
  
  console.log(`Enhanced font detection complete: found ${detectedFonts.length} available fonts out of ${allFontsToTest.length} tested`);
  
  // Remove duplicates and sort
  const uniqueFonts = detectedFonts.filter((font, index, self) => 
    index === self.findIndex(f => f.name === font.name)
  );
  
  uniqueFonts.sort((a, b) => a.name.localeCompare(b.name));
  return uniqueFonts;
};

// Export constants for backward compatibility
export { DEFAULT_FONT_OPTIONS };

// State for available fonts (will be set after detection) - export for external use
export let FONT_FAMILY_OPTIONS = DEFAULT_FONT_OPTIONS;

// Function to update the global font options
export const updateFontFamilyOptions = (fonts: FontOption[]) => {
  FONT_FAMILY_OPTIONS = fonts;
};
