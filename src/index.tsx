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
                  <p class="text-emerald-300 text-sm mt-1">💡 Tip 1: Use the "Demo Text" input to preview how your text will look on the image!</p>
                  <p class="text-emerald-300 text-sm mt-1">💡 Tip 2: Hover over a field in the preview and scroll with your mouse wheel to adjust its size, or hold click and move to change its position.</p>
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
