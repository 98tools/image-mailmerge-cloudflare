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

class MailMergeApp {
  private templateImage: File | null = null;
  private csvData: CSVRow[] | null = null;
  private fields: Field[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

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

    // Handle file input styling
    this.bindFileInputStyling();
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
      <div class="bg-white/10 border border-white/20 rounded-2xl p-6">
        <h3 class="text-xl font-semibold text-white mb-4 flex items-center">
          <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          Template Preview
        </h3>
        <div class="bg-white rounded-xl p-4 shadow-lg">
          <canvas id="imageCanvas" class="cursor-crosshair max-w-full h-auto rounded-lg shadow-md"></canvas>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('imageCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
      if (this.canvas && this.ctx) {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);

        // Show field definition section
        const fieldDefinition = document.getElementById('fieldDefinition') as HTMLElement;
        fieldDefinition.classList.remove('hidden');

        // Add click event for field placement
        this.canvas.addEventListener('click', (e) => this.addField(e));
      }
    };
    img.src = imageUrl;
  }

  private addField(e: MouseEvent) {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const fieldName = prompt('Enter field name (must match CSV column):');
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
    this.drawFields();
    this.updateFieldList();
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

        // Draw demo text if available
        if (field.demoText && field.demoText.trim()) {
          this.ctx.font = `${field.fontSize}px Arial`;
          this.ctx.fillStyle = field.color;
          this.ctx.fillText(field.demoText, field.x, field.y);
        } else {
          // Draw field name if no demo text
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

    fieldList.innerHTML = `
      <div class="space-y-4">
        <h4 class="text-lg font-semibold text-emerald-200 mb-4">Configured Fields (${this.fields.length})</h4>
        ${this.fields.map((field, index) => `
          <div class="bg-white/10 border border-emerald-300/30 rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <span class="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">${index + 1}</span>
                <span class="text-white font-semibold text-lg">${field.name}</span>
              </div>
              <button onclick="window.mailMergeApp.removeField(${index})" class="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-emerald-200 text-sm font-medium mb-2">Demo Text</label>
                <input type="text" value="${field.demoText || ''}" 
                       placeholder="Add demo text here..."
                       onchange="window.mailMergeApp.updateField(${index}, 'demoText', this.value)"
                       oninput="window.mailMergeApp.updateField(${index}, 'demoText', this.value)"
                       class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              </div>
              <div>
                <label class="block text-emerald-200 text-sm font-medium mb-2">Font Size</label>
                <input type="number" value="${field.fontSize}" onchange="window.mailMergeApp.updateField(${index}, 'fontSize', this.value)" 
                       class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              </div>
              <div>
                <label class="block text-emerald-200 text-sm font-medium mb-2">Text Color</label>
                <input type="color" value="${field.color}" onchange="window.mailMergeApp.updateField(${index}, 'color', this.value)" 
                       class="w-full h-10 bg-white/10 border border-white/20 rounded-lg cursor-pointer">
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
    this.fields.splice(index, 1);
    this.drawFields();
    this.updateFieldList();
    this.checkReadyToGenerate();
  }

  private clearFields() {
    this.fields = [];
    this.drawFields();
    this.updateFieldList();
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

    this.displayCSVPreview(this.csvData);
    this.checkReadyToGenerate();
  }

  private displayCSVPreview(data: CSVRow[]) {
    const preview = document.getElementById('csvPreview') as HTMLElement;
    const headers = Object.keys(data[0] || {});

    preview.innerHTML = `
      <div class="bg-white/10 border border-white/20 rounded-2xl p-6">
        <h3 class="text-xl font-semibold text-white mb-4 flex items-center">
          <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          CSV Preview - ${data.length} rows
        </h3>
        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
          <div class="overflow-x-auto max-h-80">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  ${headers.map(header => `<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">${header}</th>`).join('')}
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${data.slice(0, 5).map((row, rowIndex) => `
                  <tr class="${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                    ${headers.map(header => `<td class="px-4 py-3 text-sm text-gray-900 border-b">${row[header] || '-'}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ${data.length > 5 ? `<p class="text-orange-200 text-sm mt-3 italic">Showing first 5 rows of ${data.length} total rows</p>` : ''}
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

    const progress = document.getElementById('progress') as HTMLElement;
    const progressBar = document.getElementById('progressBar') as HTMLElement;
    const progressText = document.getElementById('progressText') as HTMLElement;

    progress.classList.remove('hidden');

    const zip = new (window as any).JSZip();
    const img = new Image();

    img.onload = async () => {
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

        // Draw text fields
        this.fields.forEach(field => {
          const text = row[field.name] || '';
          tempCtx.font = `${field.fontSize}px Arial`;
          tempCtx.fillStyle = field.color;
          tempCtx.fillText(text, field.x, field.y);
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
}

// Initialize the app
(window as any).mailMergeApp = new MailMergeApp();
