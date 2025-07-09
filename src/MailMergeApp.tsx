import React, { useState, useRef, useEffect, useCallback } from 'react'
import Papa from 'papaparse'
import JSZip from 'jszip'

interface Field {
  name: string
  x: number
  y: number
  fontSize: number
  color: string
  demoText: string
}

interface CSVRow {
  [key: string]: string
}

export function MailMergeApp() {
  const [templateImage, setTemplateImage] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [csvData, setCsvData] = useState<CSVRow[] | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [showFieldDefinition, setShowFieldDefinition] = useState(false)
  const [progress, setProgress] = useState({ show: false, percent: 0, text: 'Processing...' })
  const [imageFileName, setImageFileName] = useState<string | null>(null)
  const [csvFileName, setCsvFileName] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const drawFields = useCallback(() => {
    if (!templateImage || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      fields.forEach((field, index) => {
        // Draw marker circle
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(field.x, field.y, 8, 0, 2 * Math.PI)
        ctx.fill()

        // Draw white center
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(field.x, field.y, 4, 0, 2 * Math.PI)
        ctx.fill()

        // Draw field number
        ctx.fillStyle = '#1f2937'
        ctx.font = 'bold 12px Arial'
        ctx.fillText(`${index + 1}`, field.x + 12, field.y - 8)

        // Draw demo text if available
        if (field.demoText && field.demoText.trim()) {
          ctx.font = `${field.fontSize}px Arial`
          ctx.fillStyle = field.color
          ctx.fillText(field.demoText, field.x, field.y)
        } else {
          // Draw field name if no demo text
          ctx.fillStyle = '#1f2937'
          ctx.font = '12px Arial'
          ctx.fillText(field.name, field.x + 12, field.y + 6)
        }
      })
    }
    img.src = URL.createObjectURL(templateImage)
  }, [templateImage, fields])

  useEffect(() => {
    drawFields()
  }, [drawFields])

  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = imageInputRef.current?.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    try {
      const response = await fetch('/upload-image', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const url = URL.createObjectURL(file)
        setImageUrl(url)
        setTemplateImage(file)
        setImageFileName(file.name)
        setShowFieldDefinition(true)
      }
    } catch (error) {
      alert('Error uploading image: ' + (error as Error).message)
    }
  }

  useEffect(() => {
    if (imageUrl && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const img = new Image()
      img.onload = function() {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
      }
      img.src = imageUrl
    }
  }, [imageUrl])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const fieldName = prompt('Enter field name (must match CSV column):')
    if (!fieldName) return

    const field: Field = {
      name: fieldName,
      x: x,
      y: y,
      fontSize: 24,
      color: '#000000',
      demoText: ''
    }

    setFields(prev => [...prev, field])
  }

  const updateField = (index: number, property: keyof Field, value: string | number) => {
    setFields(prev => prev.map((field, i) => 
      i === index 
        ? { ...field, [property]: property === 'fontSize' ? parseInt(value as string) : value }
        : field
    ))
  }

  const removeField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index))
  }

  const clearFields = () => {
    setFields([])
  }

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = csvInputRef.current?.files?.[0]
    if (!file) return

    const text = await file.text()
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
    setCsvData(parsed.data as CSVRow[])
    setCsvFileName(file.name)
  }

  const isReadyToGenerate = templateImage && csvData && fields.length > 0

  const generateImages = async () => {
    if (!templateImage || !csvData || fields.length === 0) {
      alert('Please complete all steps first!')
      return
    }

    setProgress({ show: true, percent: 0, text: 'Processing...' })

    const zip = new JSZip()
    const img = new Image()

    img.onload = async function() {
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) return

      tempCanvas.width = img.width
      tempCanvas.height = img.height

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i]

        // Clear and draw base image
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
        tempCtx.drawImage(img, 0, 0)

        // Draw text fields
        fields.forEach(field => {
          const text = row[field.name] || ''
          tempCtx.font = `${field.fontSize}px Arial`
          tempCtx.fillStyle = field.color
          tempCtx.fillText(text, field.x, field.y)
        })

        // Convert to blob and add to zip
        const blob = await new Promise<Blob>((resolve) => 
          tempCanvas.toBlob((blob) => resolve(blob!), 'image/png')
        )
        zip.file(`image_${String(i + 1).padStart(4, '0')}.png`, blob)

        // Update progress
        const percent = ((i + 1) / csvData.length) * 100
        setProgress({
          show: true,
          percent,
          text: `Processing image ${i + 1} of ${csvData.length} (${Math.round(percent)}%)`
        })

        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      // Generate and download zip
      setProgress({ show: true, percent: 100, text: 'Generating ZIP file...' })
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mailmerge_images_${new Date().toISOString().slice(0,10)}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setProgress({ show: false, percent: 0, text: 'Processing...' })

      // Success notification
      const successDiv = document.createElement('div')
      successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50'
      successDiv.innerHTML = `
        <div class="flex items-center">
          <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Successfully generated ${csvData.length} images!
        </div>
      `
      document.body.appendChild(successDiv)
      setTimeout(() => successDiv.remove(), 5000)
    }

    img.src = URL.createObjectURL(templateImage)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-purple-200 to-violet-200 bg-clip-text text-transparent mb-4 drop-shadow-2xl">
            Mail Merge Studio
          </h1>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto">
            Transform your images with data-driven personalization. Upload, customize, and generate thousands of unique images in seconds.
          </p>
        </div>

        {/* Step 1: Image Upload */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border border-white/20 shadow-2xl">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
              1
            </div>
            <h2 className="text-3xl font-bold text-white">Upload Template Image</h2>
          </div>
          
          <form onSubmit={handleImageUpload} className="mb-6">
            <label htmlFor="imageFile" className="cursor-pointer block">
              <div className={`border-3 border-dashed rounded-2xl p-8 text-center transition-all duration-300 group ${
                imageFileName 
                  ? 'border-green-300/50 bg-green-50/10 hover:bg-green-50/20'
                  : 'border-blue-300/50 bg-blue-50/10 hover:bg-blue-50/20'
              }`}>
                <div className="mb-4">
                  <svg className={`w-16 h-16 mx-auto transition-colors ${
                    imageFileName 
                      ? 'text-green-300 group-hover:text-green-200'
                      : 'text-blue-300 group-hover:text-blue-200'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {imageFileName ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    )}
                  </svg>
                </div>
                <span className={`text-lg font-medium ${
                  imageFileName ? 'text-green-200' : 'text-blue-200'
                }`}>
                  {imageFileName ? `Selected: ${imageFileName}` : 'Click to upload image or drag and drop'}
                </span>
                <p className={`text-sm mt-2 ${
                  imageFileName ? 'text-green-300' : 'text-blue-300'
                }`}>
                  {imageFileName ? 'Click to change image' : 'PNG, JPG, GIF up to 10MB'}
                </p>
              </div>
            </label>
            <input 
              type="file" 
              id="imageFile" 
              ref={imageInputRef}
              accept="image/*" 
              required 
              className="hidden"
              onChange={() => {
                const file = imageInputRef.current?.files?.[0]
                if (file) setImageFileName(file.name)
              }}
            />
            <button 
              type="submit" 
              className="mt-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                Upload Image
              </span>
            </button>
          </form>
          
          {imageUrl && (
            <div className="mt-6">
              <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  Template Preview
                </h3>
                <div className="bg-white rounded-xl p-4 shadow-lg">
                  <canvas 
                    ref={canvasRef}
                    className="cursor-crosshair max-w-full h-auto rounded-lg shadow-md"
                    onClick={handleCanvasClick}
                    onLoad={() => {
                      if (imageUrl) {
                        const img = new Image()
                        img.onload = () => handleCanvasLoad(img)
                        img.src = imageUrl
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Field Definition */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border border-white/20 shadow-2xl">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
              2
            </div>
            <h2 className="text-3xl font-bold text-white">Define Field Positions</h2>
          </div>
          
          {showFieldDefinition && (
            <div>
              <div className="bg-emerald-50/10 border border-emerald-300/30 rounded-2xl p-6 mb-6">
                <div className="flex items-center mb-4">
                  <svg className="w-6 h-6 text-emerald-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <p className="text-emerald-200 font-medium">Click anywhere on your image to add text fields. Each field will correspond to a column in your CSV.</p>
                    <p className="text-emerald-300 text-sm mt-1">💡 Tip: Use the "Demo Text" input to preview how your text will look on the image!</p>
                  </div>
                </div>
              </div>
              
              {fields.length > 0 && (
                <div className="mb-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-emerald-200 mb-4">Configured Fields ({fields.length})</h4>
                    {fields.map((field, index) => (
                      <div key={index} className="bg-white/10 border border-emerald-300/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <span className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">{index + 1}</span>
                            <span className="text-white font-semibold text-lg">{field.name}</span>
                          </div>
                          <button 
                            onClick={() => removeField(index)} 
                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-emerald-200 text-sm font-medium mb-2">Demo Text</label>
                            <input 
                              type="text" 
                              value={field.demoText || ''} 
                              placeholder="Add demo text here..."
                              onChange={(e) => updateField(index, 'demoText', e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-emerald-200 text-sm font-medium mb-2">Font Size</label>
                            <input 
                              type="number" 
                              value={field.fontSize} 
                              onChange={(e) => updateField(index, 'fontSize', e.target.value)} 
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-emerald-200 text-sm font-medium mb-2">Text Color</label>
                            <input 
                              type="color" 
                              value={field.color} 
                              onChange={(e) => updateField(index, 'color', e.target.value)} 
                              className="w-full h-10 bg-white/10 border border-white/20 rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={clearFields} 
                  className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                >
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    Clear All Fields
                  </span>
                </button>
                <button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Save Configuration
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: CSV Upload */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border border-white/20 shadow-2xl">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
              3
            </div>
            <h2 className="text-3xl font-bold text-white">Upload CSV Data</h2>
          </div>
          
          <form onSubmit={handleCsvUpload} className="mb-6">
            <label htmlFor="csvFile" className="cursor-pointer block">
              <div className={`border-3 border-dashed rounded-2xl p-8 text-center transition-all duration-300 group ${
                csvFileName 
                  ? 'border-green-300/50 bg-green-50/10 hover:bg-green-50/20'
                  : 'border-orange-300/50 bg-orange-50/10 hover:bg-orange-50/20'
              }`}>
                <div className="mb-4">
                  <svg className={`w-16 h-16 mx-auto transition-colors ${
                    csvFileName 
                      ? 'text-green-300 group-hover:text-green-200'
                      : 'text-orange-300 group-hover:text-orange-200'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {csvFileName ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    )}
                  </svg>
                </div>
                <span className={`text-lg font-medium ${
                  csvFileName ? 'text-green-200' : 'text-orange-200'
                }`}>
                  {csvFileName ? `Selected: ${csvFileName}` : 'Click to upload CSV file'}
                </span>
                <p className={`text-sm mt-2 ${
                  csvFileName ? 'text-green-300' : 'text-orange-300'
                }`}>
                  {csvFileName ? 'Click to change CSV' : 'CSV files with your data rows'}
                </p>
              </div>
            </label>
            <input 
              type="file" 
              id="csvFile" 
              ref={csvInputRef}
              accept=".csv" 
              required 
              className="hidden"
              onChange={() => {
                const file = csvInputRef.current?.files?.[0]
                if (file) setCsvFileName(file.name)
              }}
            />
            <button 
              type="submit" 
              className="mt-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                Upload CSV
              </span>
            </button>
          </form>
          
          {csvData && (
            <div className="mt-6">
              <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  CSV Preview - {csvData.length} rows
                </h3>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(csvData[0] || {}).map(header => (
                            <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {csvData.slice(0, 5).map((row, rowIndex) => (
                          <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            {Object.keys(csvData[0] || {}).map(header => (
                              <td key={header} className="px-4 py-3 text-sm text-gray-900 border-b">
                                {row[header] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {csvData.length > 5 && (
                  <p className="text-orange-200 text-sm mt-3 italic">
                    Showing first 5 rows of {csvData.length} total rows
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 4: Generate */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 mb-8 border border-white/20 shadow-2xl">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
              4
            </div>
            <h2 className="text-3xl font-bold text-white">Generate Your Images</h2>
          </div>
          
          <button 
            onClick={generateImages}
            disabled={!isReadyToGenerate}
            className={`w-full md:w-auto font-bold py-6 px-12 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-xl ${
              isReadyToGenerate
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed'
            }`}
          >
            <span className="flex items-center justify-center">
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Generate & Download Images
            </span>
          </button>
          
          {progress.show && (
            <div className="mt-8">
              <div className="bg-gray-200/20 rounded-full h-4 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300 relative overflow-hidden"
                  style={{ width: `${progress.percent}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                </div>
              </div>
              <p className="text-center text-purple-200 mt-4 font-medium">{progress.text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
