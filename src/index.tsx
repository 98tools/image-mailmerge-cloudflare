import { Hono } from 'hono'
import { renderer } from './renderer'
import Papa from 'papaparse'
import JSZip from 'jszip'

const app = new Hono()

app.use(renderer)

// Main page with upload forms
app.get('/', (c) => {
  return c.render(
    <div class="h-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div class="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <h1 class="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Mail Merge Tool
            </h1>
            <span class="text-sm text-gray-400">for image</span>
          </div>
          <div class="flex items-center space-x-4">
            <button id="generateImages" disabled 
                    class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg shadow-lg transition-all duration-300">
              <span class="flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Generate Images
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div class="flex h-full">
        {/* Resizable Sidebar */}
        <div id="sidebar" class="bg-gray-800 border-r border-gray-700 flex flex-col" style="width: 400px; min-width: 300px; max-width: 600px;">
          <div class="p-4 border-b border-gray-700">
            <h2 class="text-lg font-semibold text-gray-200">Options</h2>
          </div>
          
          <div class="flex-1 overflow-y-auto p-4 space-y-6 mb-20">
            {/* Image Upload Section */}
            <div class="bg-gray-700/50 rounded-lg p-4">
              <div class="flex items-center mb-4">
                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                  1
                </div>
                <h3 class="text-lg font-semibold text-white">Template Image</h3>
              </div>
              
              <form id="imageForm" enctype="multipart/form-data">
                <label for="imageFile" class="cursor-pointer block">
                  <div class="border-2 border-dashed border-blue-400/50 rounded-lg p-6 text-center bg-blue-500/10 hover:bg-blue-500/20 transition-all duration-300 group">
                    <svg class="w-12 h-12 text-blue-400 mx-auto mb-3 group-hover:text-blue-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span class="text-blue-300 font-medium">Upload Image</span>
                    <p class="text-xs text-blue-400 mt-1">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </label>
                <input type="file" id="imageFile" accept="image/*" required class="hidden" />
                <button type="submit" class="mt-3 w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300">
                  Upload Image
                </button>
              </form>
            </div>

            {/* Field Definition Section */}
            <div id="fieldDefinition" class="bg-gray-700/50 rounded-lg p-4 hidden">
              <div class="flex items-center mb-4">
                <div class="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                  2
                </div>
                <h3 class="text-lg font-semibold text-white">Text Fields</h3>
              </div>
              
              <div class="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-3 mb-4">
                <p class="text-emerald-300 text-sm">Click on the preview to add text fields. Use demo text to preview positioning. Use zoom controls to zoom in/out. Hover over fields and scroll to adjust text size.</p>
              </div>
              
              <div id="fieldList" class="mb-4"></div>
              
              <div class="flex gap-2">
                <button id="clearFields" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm">
                  Clear All
                </button>
                <button id="saveFields" class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm">
                  Save Config
                </button>
              </div>
            </div>

            {/* CSV Upload Section */}
            <div class="bg-gray-700/50 rounded-lg p-4">
              <div class="flex items-center mb-4">
                <div class="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                  3
                </div>
                <h3 class="text-lg font-semibold text-white">CSV Data</h3>
              </div>
              
              <form id="csvForm" enctype="multipart/form-data" class="space-y-4">
                <label for="csvFile" class="cursor-pointer block">
                  <div class="border-2 border-dashed border-orange-400/50 rounded-lg p-6 text-center bg-orange-500/10 hover:bg-orange-500/20 transition-all duration-300 group">
                    <svg class="w-12 h-12 text-orange-400 mx-auto mb-3 group-hover:text-orange-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span class="text-orange-300 font-medium">Upload CSV</span>
                    <p class="text-xs text-orange-400 mt-1">Data for merge fields</p>
                  </div>
                </label>
                <input type="file" id="csvFile" accept=".csv" required class="hidden" />
                <button type="submit" class="mt-3 w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300">
                  Upload CSV
                </button>
              </form>
              <div id="csvPreview" class="mt-4"></div>
            </div>

            {/* Progress Section */}
            <div id="progress" class="bg-gray-700/50 rounded-lg p-4 hidden">
              <h3 class="text-lg font-semibold text-white mb-4">Processing</h3>
              <div class="bg-gray-600 rounded-full h-3 overflow-hidden">
                <div id="progressBar" class="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"></div>
              </div>
              <p id="progressText" class="text-center text-gray-300 mt-2 text-sm">Processing...</p>
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        <div id="resizeHandle" class="w-1 bg-gray-600 hover:bg-purple-500 cursor-col-resize transition-colors"></div>

        {/* Main Preview Area */}
        <div class="flex-1 bg-gray-900 overflow-hidden">
          <div class="h-full flex flex-col">
            {/* Preview Header */}
            <div class="bg-gray-800 border-b border-gray-700 px-6 py-3">
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-200">Preview</h2>
                <div class="flex items-center space-x-3" id="zoomControls" style="display: none;">
                  <button id="zoomOut" title="Zoom Out (Ctrl+-)" class="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                    </svg>
                  </button>
                  <span id="zoomLevel" class="text-gray-300 text-sm font-medium min-w-[60px] text-center">100%</span>
                  <button id="zoomIn" title="Zoom In (Ctrl++)" class="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                  </button>
                  <button id="zoomFit" title="Zoom to Fit (Ctrl+0)" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors text-xs">
                    Fit
                  </button>
                  <button id="zoomReset" title="Actual Size (Ctrl+1)" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors text-xs">
                    1:1
                  </button>
                </div>
              </div>
            </div>
            
            {/* Preview Content */}
            <div class="flex-1 p-6 overflow-auto">
              <div id="imagePreview" class="h-full flex items-center justify-center">
                <div class="text-center text-gray-500">
                  <svg class="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <p class="text-xl font-medium">Upload an image to start</p>
                  <p class="text-sm text-gray-600 mt-2">Your template will appear here for editing</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Load external libraries */}
      <script src="https://unpkg.com/papaparse@5.4.1/papaparse.min.js"></script>
      <script src="https://unpkg.com/jszip@3.10.1/dist/jszip.min.js"></script>
      
      {/* Load our client-side functionality */}
      <script type="module" src="/src/client.ts"></script>
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
