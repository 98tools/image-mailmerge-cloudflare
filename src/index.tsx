import { Hono } from 'hono'
import { renderer } from './renderer'
import Papa from 'papaparse'
import JSZip from 'jszip'

const app = new Hono()

app.use(renderer)

// Main page with upload forms
app.get('/', (c) => {
  return c.render(
    <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Mail Merge Image Generator</h1>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h2 style="color: #555; margin-top: 0;">Step 1: Upload Template Image</h2>
        <form id="imageForm" enctype="multipart/form-data" style="margin-bottom: 20px;">
          <input type="file" id="imageFile" accept="image/*" required 
                 style="padding: 10px; border: 2px dashed #ccc; border-radius: 5px; width: 100%; margin-bottom: 10px;" />
          <button type="submit" style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
            Upload Image
          </button>
        </form>
        <div id="imagePreview" style="margin-top: 20px;"></div>
      </div>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h2 style="color: #555; margin-top: 0;">Step 2: Define Field Positions</h2>
        <div id="fieldDefinition" style="display: none;">
          <p style="color: #666; margin-bottom: 15px;">Click on the image to add text fields. Each click will create a new field.</p>
          <div id="fieldList" style="margin-bottom: 15px;"></div>
          <button id="clearFields" style="background: #dc3545; color: white; padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
            Clear All Fields
          </button>
          <button id="saveFields" style="background: #28a745; color: white; padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer;">
            Save Field Configuration
          </button>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h2 style="color: #555; margin-top: 0;">Step 3: Upload CSV Data</h2>
        <form id="csvForm" enctype="multipart/form-data" style="margin-bottom: 20px;">
          <input type="file" id="csvFile" accept=".csv" required 
                 style="padding: 10px; border: 2px dashed #ccc; border-radius: 5px; width: 100%; margin-bottom: 10px;" />
          <button type="submit" style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
            Upload CSV
          </button>
        </form>
        <div id="csvPreview" style="margin-top: 20px;"></div>
      </div>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 10px;">
        <h2 style="color: #555; margin-top: 0;">Step 4: Generate Images</h2>
        <button id="generateImages" style="background: #17a2b8; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;" disabled>
          Generate and Download Images
        </button>
        <div id="progress" style="margin-top: 20px; display: none;">
          <div style="background: #e9ecef; border-radius: 10px; overflow: hidden;">
            <div id="progressBar" style="background: #007bff; height: 20px; width: 0%; transition: width 0.3s;"></div>
          </div>
          <p id="progressText" style="text-align: center; margin-top: 10px;">Processing...</p>
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
              <h3>Template Image Preview:</h3>
              <div style="position: relative; display: inline-block; border: 2px solid #ddd; border-radius: 5px;">
                <canvas id="imageCanvas" style="cursor: crosshair; max-width: 100%; height: auto;"></canvas>
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
              document.getElementById('fieldDefinition').style.display = 'block';
              
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

            const fieldName = prompt('Enter field name:');
            if (!fieldName) return;

            const field = {
              name: fieldName,
              x: x,
              y: y,
              fontSize: 24,
              color: '#000000'
            };

            fields.push(field);
            drawFields();
            updateFieldList();
          }

          function drawFields() {
            // Redraw image
            const img = new Image();
            img.onload = function() {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              
              // Draw field markers
              fields.forEach((field, index) => {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                ctx.fillRect(field.x - 5, field.y - 5, 10, 10);
                ctx.fillStyle = '#fff';
                ctx.font = '12px Arial';
                ctx.fillText(\`\${index + 1}. \${field.name}\`, field.x + 10, field.y + 5);
              });
            };
            img.src = canvas.toDataURL();
          }

          function updateFieldList() {
            const fieldList = document.getElementById('fieldList');
            fieldList.innerHTML = \`
              <h4>Defined Fields:</h4>
              \${fields.map((field, index) => \`
                <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 5px;">
                  <strong>\${index + 1}. \${field.name}</strong>
                  <div style="margin-top: 5px;">
                    <label>Font Size: 
                      <input type="number" value="\${field.fontSize}" onchange="updateField(\${index}, 'fontSize', this.value)" 
                             style="width: 60px; margin-left: 5px;">
                    </label>
                    <label style="margin-left: 15px;">Color: 
                      <input type="color" value="\${field.color}" onchange="updateField(\${index}, 'color', this.value)" 
                             style="margin-left: 5px;">
                    </label>
                    <button onclick="removeField(\${index})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; margin-left: 15px; cursor: pointer;">
                      Remove
                    </button>
                  </div>
                </div>
              \`).join('')}
            \`;
          }

          function updateField(index, property, value) {
            fields[index][property] = property === 'fontSize' ? parseInt(value) : value;
            drawFields();
          }

          function removeField(index) {
            fields.splice(index, 1);
            drawFields();
            updateFieldList();
          }

          document.getElementById('clearFields').addEventListener('click', () => {
            fields = [];
            drawFields();
            updateFieldList();
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
              <h3>CSV Data Preview (\${data.length} rows):</h3>
              <div style="overflow-x: auto; max-height: 200px; border: 1px solid #ddd; border-radius: 5px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background: #f8f9fa;">
                      \${headers.map(header => \`<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">\${header}</th>\`).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    \${data.slice(0, 5).map(row => \`
                      <tr>
                        \${headers.map(header => \`<td style="padding: 8px; border: 1px solid #ddd;">\${row[header] || ''}</td>\`).join('')}
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              </div>
              \${data.length > 5 ? \`<p style="color: #666; font-style: italic;">Showing first 5 rows of \${data.length} total rows</p>\` : ''}
            \`;
          }

          function checkReadyToGenerate() {
            const btn = document.getElementById('generateImages');
            if (templateImage && csvData && fields.length > 0) {
              btn.disabled = false;
              btn.style.opacity = '1';
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
            
            progress.style.display = 'block';
            
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
                zip.file(\`image_\${i + 1}.png\`, blob);
                
                // Update progress
                const percent = ((i + 1) / csvData.length) * 100;
                progressBar.style.width = percent + '%';
                progressText.textContent = \`Processing image \${i + 1} of \${csvData.length}\`;
                
                // Allow UI to update
                await new Promise(resolve => setTimeout(resolve, 10));
              }
              
              // Generate and download zip
              progressText.textContent = 'Generating ZIP file...';
              const zipBlob = await zip.generateAsync({ type: 'blob' });
              
              const url = URL.createObjectURL(zipBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'mailmerge_images.zip';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              progress.style.display = 'none';
              alert('Images generated and downloaded successfully!');
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
