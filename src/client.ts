// Client-side mail merge functionality

interface Field {
  name: string;
  x: number;
  y: number;
  fontSize: number;
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

class MailMergeApp {
  private templateImage: File | null = null;
  private csvData: CSVRow[] | null = null;
  private csvHeaders: string[] = [];
  private fields: Field[] = [];
  private fieldMappings: FieldMapping[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  // Mouse interaction state
  private isDragging = false;
  private isResizing = false;
  private selectedFieldIndex = -1;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartFieldX = 0;
  private dragStartFieldY = 0;
  private dragStartFontSize = 0;

  // Sidebar resize state
  private isResizingSidebar = false;
  private sidebarStartWidth = 0;
  private resizeStartX = 0;

  // Zoom state
  private zoomLevel = 1;
  private minZoom = 0.1;
  private maxZoom = 5;
  private originalImageWidth = 0;
  private originalImageHeight = 0;
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private canvasOffsetX = 0;
  private canvasOffsetY = 0;

  constructor() {
    this.init();
  }

  private init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bindEvents());
    } else {
      this.bindEvents();
    }
  }

  private bindEvents() {
    // Handle image upload
    const imageForm = document.getElementById('imageForm') as HTMLFormElement;
    imageForm?.addEventListener('submit', (e: Event) => this.handleImageUpload(e));

    // Handle CSV upload
    const csvForm = document.getElementById('csvForm') as HTMLFormElement;
    csvForm?.addEventListener('submit', (e: Event) => this.handleCsvUpload(e));

    // Handle generate button
    const generateBtn = document.getElementById('generateImages') as HTMLButtonElement;
    generateBtn?.addEventListener('click', () => this.generateImages());

    // Handle clear fields button
    const clearFieldsBtn = document.getElementById('clearFields') as HTMLButtonElement;
    clearFieldsBtn?.addEventListener('click', () => this.clearFields());

    // Handle field mapping buttons
    const autoMapBtn = document.getElementById('autoMapFields') as HTMLButtonElement;
    autoMapBtn?.addEventListener('click', () => this.autoMapFields());

    const clearMappingBtn = document.getElementById('clearMapping') as HTMLButtonElement;
    clearMappingBtn?.addEventListener('click', () => this.clearFieldMapping());

    // Handle file input styling
    this.bindFileInputStyling();

    // Handle sidebar resizing
    this.bindSidebarResize();

    // Handle zoom controls
    this.bindZoomControls();

    // Handle keyboard shortcuts
    this.bindKeyboardShortcuts();

    // Handle global mouse events for panning
    this.bindGlobalMouseEvents();
  }

  private bindSidebarResize() {
    const resizeHandle = document.getElementById('resizeHandle') as HTMLElement;
    const sidebar = document.getElementById('sidebar') as HTMLElement;

    if (!resizeHandle || !sidebar) return;

    resizeHandle.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      this.isResizingSidebar = true;
      this.sidebarStartWidth = sidebar.offsetWidth;
      this.resizeStartX = e.clientX;
      
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isResizingSidebar) return;
      
      const deltaX = e.clientX - this.resizeStartX;
      const newWidth = this.sidebarStartWidth + deltaX;
      
      // Constrain the width
      const minWidth = 300;
      const maxWidth = Math.min(600, window.innerWidth * 0.5);
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      
      sidebar.style.width = `${constrainedWidth}px`;
    });

    document.addEventListener('mouseup', () => {
      if (this.isResizingSidebar) {
        this.isResizingSidebar = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  private async handleImageUpload(e: Event) {
    e.preventDefault();
    const fileInput = document.getElementById('imageFile') as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/upload-image', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const imageUrl = URL.createObjectURL(file);
        this.displayImagePreview(imageUrl);
        this.templateImage = file;
      }
    } catch (error) {
      alert('Error uploading image: ' + (error as Error).message);
    }
  }

  private displayImagePreview(imageUrl: string) {
    const preview = document.getElementById('imagePreview') as HTMLElement;
    preview.innerHTML = `
      <div class="h-full w-full overflow-auto bg-gray-800/50 rounded-lg" id="canvasContainer">
        <div class="flex items-center justify-center min-h-full p-4" id="canvasWrapper">
          <canvas id="imageCanvas" class="cursor-crosshair rounded-lg shadow-lg"></canvas>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('imageCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
      if (this.canvas && this.ctx) {
        // Store original dimensions
        this.originalImageWidth = img.width;
        this.originalImageHeight = img.height;
        
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        
        // Initial zoom to fit
        this.zoomToFit();
        
        this.ctx.drawImage(img, 0, 0);

        // Show field definition section and zoom controls
        const fieldDefinition = document.getElementById('fieldDefinition') as HTMLElement;
        fieldDefinition.classList.remove('hidden');
        
        const zoomControls = document.getElementById('zoomControls') as HTMLElement;
        if (zoomControls) {
          zoomControls.style.display = 'flex';
        }

        // Add mouse event handlers for field interaction and zoom
        this.bindCanvasEvents();
        this.bindCanvasZoom();
      }
    };
    img.src = imageUrl;
  }

  private addFieldAtPosition(x: number, y: number) {
    const fieldName = prompt('Enter field name:');
    if (!fieldName) return;

    const field: Field = {
      name: fieldName,
      x: x,
      y: y,
      fontSize: 24,
      color: '#000000',
      demoText: ''
    };

    this.fields.push(field);
    
    // Add mapping for new field
    this.fieldMappings.push({
      fieldName: fieldName,
      csvColumn: null
    });
    
    // Try to auto-map the new field if CSV is already loaded
    if (this.csvHeaders.length > 0) {
      this.autoMapFields();
    }
    
    this.drawFields();
    this.updateFieldList();
    this.updateFieldMappingDisplay();
    this.checkReadyToGenerate();
  }

  private drawFields() {
    if (!this.templateImage || !this.canvas || !this.ctx) return;

    // Create a new image from the original template
    const img = new Image();
    img.onload = () => {
      if (!this.ctx || !this.canvas) return;
      
      // Clear the entire canvas first
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // Draw the fresh original image
      this.ctx.drawImage(img, 0, 0);

      // Draw field markers and demo text
      this.fields.forEach((field, index) => {
        if (!this.ctx) return;
        
        // Draw demo text if available
        if (field.demoText && field.demoText.trim()) {
          // When demo text is present, only show the demo text, no pointer
          this.ctx.font = `${field.fontSize}px Arial`;
          this.ctx.fillStyle = field.color;
          this.ctx.fillText(field.demoText, field.x, field.y);
        } else {
          // When no demo text, show the field pointer and name
          // Draw marker circle
          this.ctx.fillStyle = '#ef4444';
          this.ctx.beginPath();
          this.ctx.arc(field.x, field.y, 8, 0, 2 * Math.PI);
          this.ctx.fill();

          // Draw white center
          this.ctx.fillStyle = '#ffffff';
          this.ctx.beginPath();
          this.ctx.arc(field.x, field.y, 4, 0, 2 * Math.PI);
          this.ctx.fill();

          // Draw field number
          this.ctx.fillStyle = '#1f2937';
          this.ctx.font = 'bold 12px Arial';
          this.ctx.fillText(`${index + 1}`, field.x + 12, field.y - 8);
          
          // Draw field name
          this.ctx.fillStyle = '#1f2937';
          this.ctx.font = '12px Arial';
          this.ctx.fillText(field.name, field.x + 12, field.y + 6);
        }
      });
    };
    // Use the original template image URL instead of canvas.toDataURL()
    img.src = URL.createObjectURL(this.templateImage);
  }

  private updateFieldList() {
    const fieldList = document.getElementById('fieldList') as HTMLElement;
    if (this.fields.length === 0) {
      fieldList.innerHTML = '';
      return;
    }

    // Tailwind color presets
    const colorPresets = [
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

    fieldList.innerHTML = `
      <div class="space-y-3">
        <h4 class="text-sm font-semibold text-emerald-300">Fields (${this.fields.length})</h4>
        ${this.fields.map((field, index) => `
          <div class="bg-gray-600/50 border border-gray-500 rounded-lg p-3">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center">
                <span class="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">${index + 1}</span>
                <span class="text-white font-medium text-sm">${field.name}</span>
              </div>
              <button onclick="window.mailMergeApp.removeField(${index})" class="bg-red-500 hover:bg-red-600 text-white p-1 rounded transition-colors">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div class="space-y-2">
              <div>
                <label class="block text-emerald-300 text-xs font-medium mb-1">Demo Text</label>
                <input type="text" value="${field.demoText || ''}" 
                       placeholder="Preview text..."
                       onchange="window.mailMergeApp.updateField(${index}, 'demoText', this.value)"
                       oninput="window.mailMergeApp.updateField(${index}, 'demoText', this.value)"
                       class="w-full bg-gray-700/50 border border-gray-500 rounded px-2 py-1 text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500">
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-emerald-300 text-xs font-medium mb-1">Size</label>
                  <input type="number" value="${field.fontSize}" onchange="window.mailMergeApp.updateField(${index}, 'fontSize', this.value)" 
                         class="w-full bg-gray-700/50 border border-gray-500 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500">
                </div>
                <div>
                  <label class="block text-emerald-300 text-xs font-medium mb-1">Font Size</label>
                  <input type="range" min="8" max="72" value="${field.fontSize}" 
                         onchange="window.mailMergeApp.updateField(${index}, 'fontSize', this.value)"
                         oninput="window.mailMergeApp.updateField(${index}, 'fontSize', this.value)"
                         class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider">
                </div>
              </div>
              <div>
                <label class="block text-emerald-300 text-xs font-medium mb-2">Text Color</label>
                <div class="space-y-2">
                  <div class="flex flex-wrap gap-1">
                    ${colorPresets.map(color => `
                      <button onclick="window.mailMergeApp.updateField(${index}, 'color', '${color.value}')"
                              class="w-6 h-6 rounded border-2 ${field.color === color.value ? 'border-white' : 'border-gray-400'} hover:border-white transition-colors"
                              style="background-color: ${color.value}"
                              title="${color.name}">
                      </button>
                    `).join('')}
                  </div>
                  <details class="mt-2">
                    <summary class="text-xs text-gray-400 cursor-pointer hover:text-gray-300">Custom Color</summary>
                    <input type="color" value="${field.color}" onchange="window.mailMergeApp.updateField(${index}, 'color', this.value)" 
                           class="w-full h-8 bg-gray-700/50 border border-gray-500 rounded cursor-pointer mt-1">
                  </details>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  public updateField(index: number, property: keyof Field, value: string | number) {
    if (property === 'fontSize') {
      (this.fields[index] as any)[property] = parseInt(value as string);
    } else {
      (this.fields[index] as any)[property] = value;
    }
    this.drawFields();
  }

  public removeField(index: number) {
    const removedField = this.fields[index];
    this.fields.splice(index, 1);
    
    // Remove corresponding mapping
    const mappingIndex = this.fieldMappings.findIndex(m => m.fieldName === removedField.name);
    if (mappingIndex >= 0) {
      this.fieldMappings.splice(mappingIndex, 1);
    }
    
    this.drawFields();
    this.updateFieldList();
    this.updateFieldMappingDisplay();
    this.checkReadyToGenerate();
  }

  private clearFields() {
    this.fields = [];
    this.fieldMappings = [];
    this.drawFields();
    this.updateFieldList();
    this.updateFieldMappingDisplay();
    this.checkReadyToGenerate();
  }

  private async handleCsvUpload(e: Event) {
    e.preventDefault();
    const fileInput = document.getElementById('csvFile') as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = (window as any).Papa.parse(text, { header: true, skipEmptyLines: true });
    this.csvData = parsed.data as CSVRow[];
    this.csvHeaders = Object.keys(this.csvData[0] || {});

    this.displayCSVPreview(this.csvData);
    this.initializeFieldMapping();
    this.checkReadyToGenerate();
  }

  private displayCSVPreview(data: CSVRow[]) {
    const preview = document.getElementById('csvPreview') as HTMLElement;
    const headers = Object.keys(data[0] || {});

    preview.innerHTML = `
      <div class="bg-gray-600/50 border border-gray-500 rounded-lg p-3 mt-3">
        <h4 class="text-sm font-semibold text-white mb-2 flex items-center">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          CSV Preview (${data.length} rows)
        </h4>
        <div class="bg-gray-700 rounded overflow-hidden">
          <div class="overflow-x-auto max-h-40">
            <table class="w-full text-xs">
              <thead class="bg-gray-800">
                <tr>
                  ${headers.map(header => `<th class="px-2 py-1 text-left text-gray-300 font-medium">${header}</th>`).join('')}
                </tr>
              </thead>
              <tbody class="text-gray-200">
                ${data.slice(0, 5).map(row => `
                  <tr class="border-b border-gray-600">
                    ${headers.map(header => `<td class="px-2 py-1">${row[header] || ''}</td>`).join('')}
                  </tr>
                `).join('')}
                ${data.length > 5 ? `
                  <tr>
                    <td colspan="${headers.length}" class="px-2 py-1 text-center text-gray-400 italic">
                      ... and ${data.length - 5} more rows
                    </td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  private checkReadyToGenerate() {
    const btn = document.getElementById('generateImages') as HTMLButtonElement;
    if (this.templateImage && this.csvData && this.fields.length > 0) {
      btn.disabled = false;
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    }
  }

  private async generateImages() {
    if (!this.templateImage || !this.csvData || this.fields.length === 0) {
      alert('Please complete all steps first!');
      return;
    }

    // Disable the generate button during processing
    const generateBtn = document.getElementById('generateImages') as HTMLButtonElement;
    generateBtn.disabled = true;
    generateBtn.classList.add('opacity-50', 'cursor-not-allowed');
    
    const progress = document.getElementById('progress') as HTMLElement;
    const progressBar = document.getElementById('progressBar') as HTMLElement;
    const progressText = document.getElementById('progressText') as HTMLElement;

    progress.classList.remove('hidden');

    const zip = new (window as any).JSZip();
    const img = new Image();

    img.onload = async () => {
      try {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx || !this.csvData) return;

        tempCanvas.width = img.width;
        tempCanvas.height = img.height;

        for (let i = 0; i < this.csvData.length; i++) {
          const row = this.csvData[i];

          // Clear and draw base image
          tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.drawImage(img, 0, 0);

          // Draw text fields using field mappings
          this.fields.forEach(field => {
            // Find the mapping for this field
            const mapping = this.fieldMappings.find(m => m.fieldName === field.name);
            const csvColumn = mapping?.csvColumn;
            
            // Get text from mapped CSV column or leave empty if unmapped
            const text = (csvColumn && row[csvColumn]) ? row[csvColumn] : '';
            
            if (text) { // Only draw if there's text to display
              tempCtx.font = `${field.fontSize}px Arial`;
              tempCtx.fillStyle = field.color;
              tempCtx.fillText(text, field.x, field.y);
            }
          });

          // Convert to blob and add to zip
          const blob = await new Promise<Blob>((resolve) =>
            tempCanvas.toBlob((blob) => resolve(blob!), 'image/png')
          );
          zip.file(`image_${String(i + 1).padStart(4, '0')}.png`, blob);

          // Update progress
          const percent = ((i + 1) / this.csvData.length) * 100;
          progressBar.style.width = percent + '%';
          progressText.textContent = `Processing image ${i + 1} of ${this.csvData.length} (${Math.round(percent)}%)`;

          // Allow UI to update
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Generate and download zip
        progressText.textContent = 'Generating ZIP file...';
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mailmerge_images_${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        progress.classList.add('hidden');

        // Re-enable the generate button
        generateBtn.disabled = false;
        generateBtn.classList.remove('opacity-50', 'cursor-not-allowed');

        // Success notification
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
        successDiv.innerHTML = `
          <div class="flex items-center">
            <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Successfully generated ${this.csvData!.length} images!
          </div>
        `;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 5000);
      } catch (error) {
        // Hide progress and re-enable button on error
        progress.classList.add('hidden');
        generateBtn.disabled = false;
        generateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        
        // Show error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
        errorDiv.innerHTML = `
          <div class="flex items-center">
            <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Error generating images: ${(error as Error).message}
          </div>
        `;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
        
        console.error('Error generating images:', error);
      }
    };

    img.src = URL.createObjectURL(this.templateImage);
  }

  private bindFileInputStyling() {
    const imageFileInput = document.getElementById('imageFile') as HTMLInputElement;
    imageFileInput?.addEventListener('change', function(e) {
      const target = e.target as HTMLInputElement;
      const label = target.previousElementSibling as HTMLElement;
      if (target.files && target.files.length > 0) {
        const fileName = target.files[0].name;
        label.innerHTML = `
          <div class="border-3 border-dashed border-green-300/50 rounded-2xl p-8 text-center bg-green-50/10 hover:bg-green-50/20 transition-all duration-300 group">
            <div class="mb-4">
              <svg class="w-16 h-16 text-green-300 mx-auto group-hover:text-green-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <span class="text-lg text-green-200 font-medium">Selected: ${fileName}</span>
            <p class="text-sm text-green-300 mt-2">Click to change image</p>
          </div>
        `;
      }
    });

    const csvFileInput = document.getElementById('csvFile') as HTMLInputElement;
    csvFileInput?.addEventListener('change', function(e) {
      const target = e.target as HTMLInputElement;
      const label = target.previousElementSibling as HTMLElement;
      if (target.files && target.files.length > 0) {
        const fileName = target.files[0].name;
        label.innerHTML = `
          <div class="border-3 border-dashed border-green-300/50 rounded-2xl p-8 text-center bg-green-50/10 hover:bg-green-50/20 transition-all duration-300 group">
            <div class="mb-4">
              <svg class="w-16 h-16 text-green-300 mx-auto group-hover:text-green-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <span class="text-lg text-green-200 font-medium">Selected: ${fileName}</span>
            <p class="text-sm text-green-300 mt-2">Click to change CSV</p>
          </div>
        `;
      }
    });
  }

  private bindZoomControls() {
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const zoomFit = document.getElementById('zoomFit');
    const zoomReset = document.getElementById('zoomReset');

    zoomIn?.addEventListener('click', () => this.zoomIn());
    zoomOut?.addEventListener('click', () => this.zoomOut());
    zoomFit?.addEventListener('click', () => this.zoomToFit());
    zoomReset?.addEventListener('click', () => this.zoomToActual());
  }

  private zoomIn() {
    this.setZoom(Math.min(this.zoomLevel * 1.2, this.maxZoom));
  }

  private zoomOut() {
    this.setZoom(Math.max(this.zoomLevel / 1.2, this.minZoom));
  }

  private zoomToFit() {
    if (!this.canvas || !this.originalImageWidth || !this.originalImageHeight) return;
    
    const previewContainer = document.getElementById('imagePreview') as HTMLElement;
    const containerWidth = previewContainer.offsetWidth - 64; // account for padding
    const containerHeight = previewContainer.offsetHeight - 64;
    
    const scaleX = containerWidth / this.originalImageWidth;
    const scaleY = containerHeight / this.originalImageHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
    
    this.setZoom(scale);
  }

  private zoomToActual() {
    this.setZoom(1);
  }

  private setZoom(newZoom: number) {
    this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    this.updateCanvasDisplay();
    this.updateZoomDisplay();
  }

  private updateZoomDisplay() {
    const zoomDisplay = document.getElementById('zoomLevel');
    if (zoomDisplay) {
      zoomDisplay.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
  }

  private updateCanvasDisplay() {
    if (!this.canvas || !this.originalImageWidth || !this.originalImageHeight) return;
    
    const displayWidth = this.originalImageWidth * this.zoomLevel;
    const displayHeight = this.originalImageHeight * this.zoomLevel;
    
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
  }

  private bindCanvasZoom() {
    // Only button-based zoom controls are used
    // Panning is handled in the canvas mouse event handlers
    // This method is kept for future zoom-related functionality
  }

  // Mouse interaction methods
  private getCanvasCoordinates(e: MouseEvent): { x: number, y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private getFieldAtPosition(x: number, y: number): { index: number, isResizeHandle: boolean } {
    for (let i = this.fields.length - 1; i >= 0; i--) {
      const field = this.fields[i];
      
      // Check resize handle (small square at bottom-right)
      const handleSize = 10;
      const handleX = field.x + 100; // Approximate text width
      const handleY = field.y + field.fontSize;
      
      if (x >= handleX - handleSize && x <= handleX + handleSize &&
          y >= handleY - handleSize && y <= handleY + handleSize) {
        return { index: i, isResizeHandle: true };
      }
      
      // Check field area
      if (x >= field.x && x <= field.x + 100 && // Approximate field width
          y >= field.y - field.fontSize && y <= field.y + 5) {
        return { index: i, isResizeHandle: false };
      }
    }
    return { index: -1, isResizeHandle: false };
  }

  private handleMouseDown(e: MouseEvent) {
    if (!this.canvas) return;
    
    // Handle middle mouse button for panning
    if (e.button === 1) {
      e.preventDefault();
      this.isPanning = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      const canvasContainer = document.getElementById('canvasContainer');
      if (canvasContainer) {
        canvasContainer.style.cursor = 'grabbing';
      }
      return; // Don't process as field interaction
    }
    
    // Only process left mouse button for field interactions
    if (e.button !== 0) return;
    
    const coords = this.getCanvasCoordinates(e);
    const hit = this.getFieldAtPosition(coords.x, coords.y);
    
    if (hit.index >= 0) {
      // Clicking on an existing field
      this.selectedFieldIndex = hit.index;
      const field = this.fields[hit.index];
      
      if (hit.isResizeHandle) {
        this.isResizing = true;
        this.dragStartFontSize = field.fontSize;
      } else {
        this.isDragging = true;
        this.dragStartFieldX = field.x;
        this.dragStartFieldY = field.y;
      }
      
      this.dragStartX = coords.x;
      this.dragStartY = coords.y;
      
      this.canvas.style.cursor = hit.isResizeHandle ? 'nw-resize' : 'move';
    } else {
      // Clicking on empty area - add new field
      this.addFieldAtPosition(coords.x, coords.y);
    }
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.canvas) return;
    
    // Panning is handled by global mouse events, so skip if panning
    if (this.isPanning) return;
    
    const coords = this.getCanvasCoordinates(e);
    
    if (this.isDragging && this.selectedFieldIndex >= 0) {
      const field = this.fields[this.selectedFieldIndex];
      field.x = this.dragStartFieldX + (coords.x - this.dragStartX);
      field.y = this.dragStartFieldY + (coords.y - this.dragStartY);
      this.drawFields();
    } else if (this.isResizing && this.selectedFieldIndex >= 0) {
      const field = this.fields[this.selectedFieldIndex];
      const deltaY = coords.y - this.dragStartY;
      field.fontSize = Math.max(8, Math.min(72, this.dragStartFontSize + deltaY * 0.5));
      this.drawFields();
      this.updateFieldList();
    } else {
      // Update cursor based on hover
      const hit = this.getFieldAtPosition(coords.x, coords.y);
      if (hit.index >= 0) {
        this.canvas.style.cursor = hit.isResizeHandle ? 'nw-resize' : 'move';
      } else {
        this.canvas.style.cursor = 'crosshair';
      }
    }
  }

  private handleMouseUp(e: MouseEvent) {
    // Handle panning release
    if (e.button === 1 && this.isPanning) {
      this.isPanning = false;
      const canvasContainer = document.getElementById('canvasContainer');
      if (canvasContainer) {
        canvasContainer.style.cursor = '';
      }
      return;
    }
    
    // Handle field interaction release
    this.isDragging = false;
    this.isResizing = false;
    this.selectedFieldIndex = -1;
    if (this.canvas) {
      this.canvas.style.cursor = 'crosshair';
    }
  }

  private handleWheel(e: WheelEvent) {
    if (!this.canvas) return;
    
    const coords = this.getCanvasCoordinates(e);
    const hit = this.getFieldAtPosition(coords.x, coords.y);
    
    if (hit.index >= 0) {
      // Only prevent default and handle field resizing if hovering over a field
      e.preventDefault();
      const field = this.fields[hit.index];
      const delta = e.deltaY > 0 ? -2 : 2;
      field.fontSize = Math.max(8, Math.min(72, field.fontSize + delta));
      this.drawFields();
      this.updateFieldList();
    }
    // If not hovering over a field, let the zoom functionality handle it
  }

  private initializeFieldMapping() {
    // Initialize mappings for all fields
    this.fieldMappings = this.fields.map(field => ({
      fieldName: field.name,
      csvColumn: null
    }));

    // Try to auto-map fields that match CSV columns exactly
    this.autoMapFields();

    // Show the field mapping section
    const fieldMappingSection = document.getElementById('fieldMapping') as HTMLElement;
    if (fieldMappingSection && this.fields.length > 0) {
      fieldMappingSection.classList.remove('hidden');
      this.updateFieldMappingDisplay();
    }
  }

  private autoMapFields() {
    this.fieldMappings.forEach(mapping => {
      // Try exact match first
      const exactMatch = this.csvHeaders.find(header => 
        header.toLowerCase() === mapping.fieldName.toLowerCase()
      );
      
      if (exactMatch) {
        mapping.csvColumn = exactMatch;
        return;
      }

      // Try partial match
      const partialMatch = this.csvHeaders.find(header => 
        header.toLowerCase().includes(mapping.fieldName.toLowerCase()) ||
        mapping.fieldName.toLowerCase().includes(header.toLowerCase())
      );
      
      if (partialMatch) {
        mapping.csvColumn = partialMatch;
      }
    });

    this.updateFieldMappingDisplay();
    this.checkReadyToGenerate();
  }

  private clearFieldMapping() {
    this.fieldMappings.forEach(mapping => {
      mapping.csvColumn = null;
    });
    this.updateFieldMappingDisplay();
    this.checkReadyToGenerate();
  }

  private updateFieldMappingDisplay() {
    const mappingList = document.getElementById('mappingList') as HTMLElement;
    if (!mappingList) return;

    mappingList.innerHTML = this.fieldMappings.map((mapping, index) => {
      const isUnmapped = !mapping.csvColumn;
      const availableColumns = this.csvHeaders.filter(header => 
        !this.fieldMappings.some(m => m.csvColumn === header && m !== mapping)
      );

      return `
        <div class="bg-gray-600/50 border ${isUnmapped ? 'border-yellow-400/50' : 'border-gray-500'} rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <span class="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">${index + 1}</span>
              <span class="text-white font-medium text-sm">${mapping.fieldName}</span>
            </div>
            ${isUnmapped ? '<div class="w-2 h-2 bg-yellow-400 rounded-full" title="Unmapped field"></div>' : '<div class="w-2 h-2 bg-green-400 rounded-full" title="Mapped field"></div>'}
          </div>
          <select onchange="window.mailMergeApp.updateFieldMapping('${mapping.fieldName}', this.value)" 
                  class="w-full bg-gray-700/50 border border-gray-500 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500">
            <option value="">-- Select CSV Column --</option>
            ${availableColumns.map(header => `
              <option value="${header}" ${mapping.csvColumn === header ? 'selected' : ''}>${header}</option>
            `).join('')}
            ${mapping.csvColumn && !availableColumns.includes(mapping.csvColumn) ? `
              <option value="${mapping.csvColumn}" selected>${mapping.csvColumn}</option>
            ` : ''}
          </select>
        </div>
      `;
    }).join('');
  }

  public updateFieldMapping(fieldName: string, csvColumn: string) {
    const mapping = this.fieldMappings.find(m => m.fieldName === fieldName);
    if (mapping) {
      mapping.csvColumn = csvColumn || null;
      this.updateFieldMappingDisplay();
      this.checkReadyToGenerate();
    }
  }

  private bindCanvasEvents() {
    if (!this.canvas) return;
    
    // Remove existing event listeners to avoid duplicates
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    
    // Add event listeners
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
    this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
  }

  private bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Only handle shortcuts when canvas is active
      if (!this.canvas || !document.getElementById('zoomControls')?.style.display || document.getElementById('zoomControls')?.style.display === 'none') {
        return;
      }

      // Ctrl/Cmd + Plus/Equals for zoom in
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        this.zoomIn();
      }
      
      // Ctrl/Cmd + Minus for zoom out
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        this.zoomOut();
      }
      
      // Ctrl/Cmd + 0 for zoom to fit
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        this.zoomToFit();
      }
      
      // Ctrl/Cmd + 1 for actual size
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        this.zoomToActual();
      }
    });
  }

  private bindGlobalMouseEvents() {
    // Global mouse move for panning
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isPanning) {
        const deltaX = e.clientX - this.panStartX;
        const deltaY = e.clientY - this.panStartY;
        
        const canvasContainer = document.getElementById('canvasContainer');
        if (canvasContainer) {
          canvasContainer.scrollLeft -= deltaX;
          canvasContainer.scrollTop -= deltaY;
        }
        
        this.panStartX = e.clientX;
        this.panStartY = e.clientY;
      }
    });

    // Global mouse up for panning
    document.addEventListener('mouseup', (e: MouseEvent) => {
      if (e.button === 1 && this.isPanning) {
        this.isPanning = false;
        const canvasContainer = document.getElementById('canvasContainer');
        if (canvasContainer) {
          canvasContainer.style.cursor = '';
        }
      }
    });
  }
}

// Initialize the app
(window as any).mailMergeApp = new MailMergeApp();
