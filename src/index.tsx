import { Hono } from 'hono'
import { renderer } from './renderer'
import Papa from 'papaparse'
import JSZip from 'jszip'

const app = new Hono()

app.use(renderer)

// Main page with upload forms
app.get('/', (c) => {
  return c.render(
    <div class="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 p-4 md:p-8">
      <div class="max-w-6xl mx-auto">
        {/* Header */}
        <div class="text-center mb-12">
          <h1 class="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-purple-200 to-violet-200 bg-clip-text text-transparent mb-4 drop-shadow-2xl">
            Mail Merge Studio
          </h1>
          <p class="text-xl text-purple-100 max-w-2xl mx-auto">
            Transform your images with data-driven personalization. Upload, customize, and generate thousands of unique images in seconds.
          </p>
        </div>

        {/* Step 1: Image Upload */}
        <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border border-white/20 shadow-2xl">
          <div class="flex items-center mb-6">
            <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
              1
            </div>
            <h2 class="text-3xl font-bold text-white">Upload Template Image</h2>
          </div>
          
          <form id="imageForm" enctype="multipart/form-data" class="mb-6">
            <label for="imageFile" class="cursor-pointer block">
              <div class="border-3 border-dashed border-blue-300/50 rounded-2xl p-8 text-center bg-blue-50/10 hover:bg-blue-50/20 transition-all duration-300 group">
                <div class="mb-4">
                  <svg class="w-16 h-16 text-blue-300 mx-auto group-hover:text-blue-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <span class="text-lg text-blue-200 font-medium">Click to upload image or drag and drop</span>
                <p class="text-sm text-blue-300 mt-2">PNG, JPG, GIF up to 10MB</p>
              </div>
            </label>
            <input type="file" id="imageFile" accept="image/*" required class="hidden" />
            <button type="submit" class="mt-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <span class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                Upload Image
              </span>
            </button>
          </form>
          <div id="imagePreview" class="mt-6"></div>
        </div>

        {/* Step 2: Field Definition */}
        <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border border-white/20 shadow-2xl">
          <div class="flex items-center mb-6">
            <div class="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
              2
            </div>
            <h2 class="text-3xl font-bold text-white">Define Field Positions</h2>
          </div>
          
          <div id="fieldDefinition" class="hidden">
            <div class="bg-emerald-50/10 border border-emerald-300/30 rounded-2xl p-6 mb-6">
              <div class="flex items-center mb-4">
                <svg class="w-6 h-6 text-emerald-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <p class="text-emerald-200 font-medium">Click anywhere on your image to add text fields. Each field will correspond to a column in your CSV.</p>
                  <p class="text-emerald-300 text-sm mt-1">💡 Tip: Use the "Demo Text" input to preview how your text will look on the image!</p>
                </div>
              </div>
            </div>
            <div id="fieldList" class="mb-6"></div>
            <div class="flex flex-wrap gap-4">
              <button id="clearFields" class="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
                <span class="flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  Clear All Fields
                </span>
              </button>
              <button id="saveFields" class="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
                <span class="flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Save Configuration
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Step 3: CSV Upload */}
        <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border border-white/20 shadow-2xl">
          <div class="flex items-center mb-6">
            <div class="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
              3
            </div>
            <h2 class="text-3xl font-bold text-white">Upload CSV Data</h2>
          </div>
          
          <form id="csvForm" enctype="multipart/form-data" class="mb-6">
            <label for="csvFile" class="cursor-pointer block">
              <div class="border-3 border-dashed border-orange-300/50 rounded-2xl p-8 text-center bg-orange-50/10 hover:bg-orange-50/20 transition-all duration-300 group">
                <div class="mb-4">
                  <svg class="w-16 h-16 text-orange-300 mx-auto group-hover:text-orange-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <span class="text-lg text-orange-200 font-medium">Click to upload CSV file</span>
                <p class="text-sm text-orange-300 mt-2">CSV files with your data rows</p>
              </div>
            </label>
            <input type="file" id="csvFile" accept=".csv" required class="hidden" />
            <button type="submit" class="mt-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <span class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                Upload CSV
              </span>
            </button>
          </form>
          <div id="csvPreview" class="mt-6"></div>
        </div>

        {/* Step 4: Generate */}
        <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border border-white/20 shadow-2xl">
          <div class="flex items-center mb-6">
            <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
              4
            </div>
            <h2 class="text-3xl font-bold text-white">Generate Your Images</h2>
          </div>
          
          <button id="generateImages" disabled 
                  class="w-full md:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-6 px-12 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-xl">
            <span class="flex items-center justify-center">
              <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Generate & Download Images
            </span>
          </button>
          
          <div id="progress" class="mt-8 hidden">
            <div class="bg-gray-200/20 rounded-full h-4 overflow-hidden shadow-inner">
              <div id="progressBar" class="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300 relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
            </div>
            <p id="progressText" class="text-center text-purple-200 mt-4 font-medium">Processing...</p>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `
          let templateImage = null;
          let csvData = null;
          let fields = [];
          let canvas = null;
          let ctx = null;

          // Handle image upload
          document.getElementById('imageForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('imageFile');
            const file = fileInput.files[0];
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
                displayImagePreview(imageUrl);
                templateImage = file;
              }
            } catch (error) {
              alert('Error uploading image: ' + error.message);
            }
          });

          function displayImagePreview(imageUrl) {
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = \`
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
            \`;

            canvas = document.getElementById('imageCanvas');
            ctx = canvas.getContext('2d');
            
            const img = new Image();
            img.onload = function() {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              
              // Show field definition section
              document.getElementById('fieldDefinition').classList.remove('hidden');
              
              // Add click event for field placement
              canvas.addEventListener('click', addField);
            };
            img.src = imageUrl;
          }

          function addField(e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            const fieldName = prompt('Enter field name (must match CSV column):');
            if (!fieldName) return;

            const field = {
              name: fieldName,
              x: x,
              y: y,
              fontSize: 24,
              color: '#000000',
              demoText: ''
            };

            fields.push(field);
            drawFields();
            updateFieldList();
          }

          function drawFields() {
            if (!templateImage) return;
            
            // Create a new image from the original template
            const img = new Image();
            img.onload = function() {
              // Clear the entire canvas first
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              // Draw the fresh original image
              ctx.drawImage(img, 0, 0);
              
              // Draw field markers and demo text
              fields.forEach((field, index) => {
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
                ctx.fillText(\`\${index + 1}\`, field.x + 12, field.y - 8);
                
                // Draw demo text if available
                if (field.demoText && field.demoText.trim()) {
                  ctx.font = \`\${field.fontSize}px Arial\`;
                  ctx.fillStyle = field.color;
                  ctx.fillText(field.demoText, field.x, field.y);
                } else {
                  // Draw field name if no demo text
                  ctx.fillStyle = '#1f2937';
                  ctx.font = '12px Arial';
                  ctx.fillText(field.name, field.x + 12, field.y + 6);
                }
              });
            };
            // Use the original template image URL instead of canvas.toDataURL()
            img.src = URL.createObjectURL(templateImage);
          }

          function updateFieldList() {
            const fieldList = document.getElementById('fieldList');
            if (fields.length === 0) {
              fieldList.innerHTML = '';
              return;
            }
            
            fieldList.innerHTML = \`
              <div class="space-y-4">
                <h4 class="text-lg font-semibold text-emerald-200 mb-4">Configured Fields (\${fields.length})</h4>
                \${fields.map((field, index) => \`
                  <div class="bg-white/10 border border-emerald-300/30 rounded-xl p-4">
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center">
                        <span class="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">\${index + 1}</span>
                        <span class="text-white font-semibold text-lg">\${field.name}</span>
                      </div>
                      <button onclick="removeField(\${index})" class="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label class="block text-emerald-200 text-sm font-medium mb-2">Demo Text</label>
                        <input type="text" value="\${field.demoText || ''}" 
                               placeholder="Add demo text here..."
                               onchange="updateField(\${index}, 'demoText', this.value)"
                               oninput="updateField(\${index}, 'demoText', this.value)"
                               class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      </div>
                      <div>
                        <label class="block text-emerald-200 text-sm font-medium mb-2">Font Size</label>
                        <input type="number" value="\${field.fontSize}" onchange="updateField(\${index}, 'fontSize', this.value)" 
                               class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      </div>
                      <div>
                        <label class="block text-emerald-200 text-sm font-medium mb-2">Text Color</label>
                        <input type="color" value="\${field.color}" onchange="updateField(\${index}, 'color', this.value)" 
                               class="w-full h-10 bg-white/10 border border-white/20 rounded-lg cursor-pointer">
                      </div>
                    </div>
                  </div>
                \`).join('')}
              </div>
            \`;
          }

          function updateField(index, property, value) {
            fields[index][property] = property === 'fontSize' ? parseInt(value) : value;
            drawFields();
            
            // Don't regenerate the field list for demo text changes to avoid losing focus
            // The field list only needs to update when fields are added/removed
          }

          function removeField(index) {
            fields.splice(index, 1);
            drawFields();
            updateFieldList();
            checkReadyToGenerate();
          }

          document.getElementById('clearFields').addEventListener('click', () => {
            fields = [];
            drawFields();
            updateFieldList();
            checkReadyToGenerate();
          });

          // Handle CSV upload
          document.getElementById('csvForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('csvFile');
            const file = fileInput.files[0];
            if (!file) return;

            const text = await file.text();
            const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
            csvData = parsed.data;
            
            displayCSVPreview(csvData);
            checkReadyToGenerate();
          });

          function displayCSVPreview(data) {
            const preview = document.getElementById('csvPreview');
            const headers = Object.keys(data[0] || {});
            
            preview.innerHTML = \`
              <div class="bg-white/10 border border-white/20 rounded-2xl p-6">
                <h3 class="text-xl font-semibold text-white mb-4 flex items-center">
                  <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  CSV Preview - \${data.length} rows
                </h3>
                <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div class="overflow-x-auto max-h-80">
                    <table class="w-full">
                      <thead class="bg-gray-50">
                        <tr>
                          \${headers.map(header => \`<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">\${header}</th>\`).join('')}
                        </tr>
                      </thead>
                      <tbody class="bg-white divide-y divide-gray-200">
                        \${data.slice(0, 5).map((row, rowIndex) => \`
                          <tr class="\${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                            \${headers.map(header => \`<td class="px-4 py-3 text-sm text-gray-900 border-b">\${row[header] || '-'}</td>\`).join('')}
                          </tr>
                        \`).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
                \${data.length > 5 ? \`<p class="text-orange-200 text-sm mt-3 italic">Showing first 5 rows of \${data.length} total rows</p>\` : ''}
              </div>
            \`;
          }

          function checkReadyToGenerate() {
            const btn = document.getElementById('generateImages');
            if (templateImage && csvData && fields.length > 0) {
              btn.disabled = false;
              btn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
              btn.disabled = true;
              btn.classList.add('opacity-50', 'cursor-not-allowed');
            }
          }

          // Generate images
          document.getElementById('generateImages').addEventListener('click', async () => {
            if (!templateImage || !csvData || fields.length === 0) {
              alert('Please complete all steps first!');
              return;
            }

            const progress = document.getElementById('progress');
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            
            progress.classList.remove('hidden');
            
            const zip = new JSZip();
            const img = new Image();
            
            img.onload = async function() {
              const tempCanvas = document.createElement('canvas');
              const tempCtx = tempCanvas.getContext('2d');
              tempCanvas.width = img.width;
              tempCanvas.height = img.height;

              for (let i = 0; i < csvData.length; i++) {
                const row = csvData[i];
                
                // Clear and draw base image
                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(img, 0, 0);
                
                // Draw text fields
                fields.forEach(field => {
                  const text = row[field.name] || '';
                  tempCtx.font = \`\${field.fontSize}px Arial\`;
                  tempCtx.fillStyle = field.color;
                  tempCtx.fillText(text, field.x, field.y);
                });
                
                // Convert to blob and add to zip
                const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));
                zip.file(\`image_\${String(i + 1).padStart(4, '0')}.png\`, blob);
                
                // Update progress
                const percent = ((i + 1) / csvData.length) * 100;
                progressBar.style.width = percent + '%';
                progressText.textContent = \`Processing image \${i + 1} of \${csvData.length} (\${Math.round(percent)}%)\`;
                
                // Allow UI to update
                await new Promise(resolve => setTimeout(resolve, 10));
              }
              
              // Generate and download zip
              progressText.textContent = 'Generating ZIP file...';
              const zipBlob = await zip.generateAsync({ type: 'blob' });
              
              const url = URL.createObjectURL(zipBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = \`mailmerge_images_\${new Date().toISOString().slice(0,10)}.zip\`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              progress.classList.add('hidden');
              
              // Success notification
              const successDiv = document.createElement('div');
              successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
              successDiv.innerHTML = \`
                <div class="flex items-center">
                  <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Successfully generated \${csvData.length} images!
                </div>
              \`;
              document.body.appendChild(successDiv);
              setTimeout(() => successDiv.remove(), 5000);
            };
            
            img.src = URL.createObjectURL(templateImage);
          });

          // Load external libraries
          const script1 = document.createElement('script');
          script1.src = 'https://unpkg.com/papaparse@5.4.1/papaparse.min.js';
          document.head.appendChild(script1);
          
          const script2 = document.createElement('script');
          script2.src = 'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js';
          document.head.appendChild(script2);

          // File input styling
          document.getElementById('imageFile').addEventListener('change', function(e) {
            const label = e.target.previousElementSibling;
            if (e.target.files.length > 0) {
              const fileName = e.target.files[0].name;
              label.innerHTML = \`
                <div class="border-3 border-dashed border-green-300/50 rounded-2xl p-8 text-center bg-green-50/10 hover:bg-green-50/20 transition-all duration-300 group">
                  <div class="mb-4">
                    <svg class="w-16 h-16 text-green-300 mx-auto group-hover:text-green-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span class="text-lg text-green-200 font-medium">Selected: \${fileName}</span>
                  <p class="text-sm text-green-300 mt-2">Click to change image</p>
                </div>
              \`;
            }
          });

          document.getElementById('csvFile').addEventListener('change', function(e) {
            const label = e.target.previousElementSibling;
            if (e.target.files.length > 0) {
              const fileName = e.target.files[0].name;
              label.innerHTML = \`
                <div class="border-3 border-dashed border-green-300/50 rounded-2xl p-8 text-center bg-green-50/10 hover:bg-green-50/20 transition-all duration-300 group">
                  <div class="mb-4">
                    <svg class="w-16 h-16 text-green-300 mx-auto group-hover:text-green-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span class="text-lg text-green-200 font-medium">Selected: \${fileName}</span>
                  <p class="text-sm text-green-300 mt-2">Click to change CSV</p>
                </div>
              \`;
            }
          });
        `
      }} />
    </div>
  )
})

// Handle image upload endpoint
app.post('/upload-image', async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['image'] as File
    
    if (!file) {
      return c.text('No file uploaded', 400)
    }
    
    // In a real implementation, you might want to store this temporarily
    // For now, we'll just return success since the frontend handles the preview
    return c.json({ success: true, message: 'Image uploaded successfully' })
  } catch (error) {
    return c.text('Upload failed', 500)
  }
})

export default app
