import React from 'react';
import * as QRCode from 'qrcode';

// Color presets for QR codes (same as text fields)
export const QR_COLOR_PRESETS = [
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

export interface QRCodeFieldData {
  type: 'qrcode';
  name: string;
  x: number;
  y: number;
  size: number; // QR code size in pixels
  color: string; // QR code color
  backgroundColor: string | null; // null for transparent, color string for background
  demoText: string;
}

export interface QRCodeFieldProps {
  field: QRCodeFieldData;
  onUpdate: (field: QRCodeFieldData) => void;
}

export const QRCodeFieldEditor: React.FC<QRCodeFieldProps> = ({
  field,
  onUpdate
}) => {
  const handleSizeChange = (size: number) => {
    onUpdate({ ...field, size });
  };

  const handleColorChange = (color: string) => {
    onUpdate({ ...field, color });
  };

  const handleBackgroundColorChange = (backgroundColor: string | null) => {
    onUpdate({ ...field, backgroundColor });
  };

  const handleDemoTextChange = (demoText: string) => {
    onUpdate({ ...field, demoText });
  };

  return (
    <>
      {/* QR Code Size Control */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-gray-700 text-xs font-medium mb-1">
            QR Size: {field.size}px
          </label>
          <input
            type="range"
            min="20"
            max="200"
            value={field.size}
            onChange={(e) => handleSizeChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
        <div>
          <label className="block text-gray-700 text-xs font-medium mb-1">
            Size Value
          </label>
          <input
            type="number"
            value={field.size}
            onChange={(e) => handleSizeChange(parseInt(e.target.value) || 50)}
            min="20"
            max="200"
            placeholder="QR Size"
            className="bg-white border border-gray-300 text-gray-900 px-2 py-1 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* QR Code Color Controls */}
      <div>
        <label className="block text-gray-700 text-xs font-medium mb-2">QR Code Color</label>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {QR_COLOR_PRESETS.map((colorPreset) => (
              <button
                key={colorPreset.value}
                onClick={() => handleColorChange(colorPreset.value)}
                className={`w-6 h-6 rounded border-2 ${
                  field.color === colorPreset.value ? 'border-gray-800' : 'border-gray-300'
                } hover:border-gray-800 transition-colors`}
                style={{ backgroundColor: colorPreset.value }}
                title={colorPreset.name}
              />
            ))}
          </div>
          <details className="mt-2">
            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">Custom Color</summary>
            <input
              type="color"
              value={field.color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-full h-8 bg-white border border-gray-300 rounded cursor-pointer mt-1"
            />
          </details>
        </div>
      </div>

      {/* Background Options */}
      <div className="mt-3">
        <label className="block text-gray-700 text-xs font-medium mb-2">Background</label>
        <div className="flex gap-2 mb-2">
          <label className="flex items-center text-gray-700 text-sm flex-1">
            <input
              type="radio"
              name={`bg-${field.name}`}
              checked={field.backgroundColor === null}
              onChange={() => handleBackgroundColorChange(null)}
              className="mr-2 accent-blue-600"
            />
            Transparent
          </label>
          <label className="flex items-center text-gray-700 text-sm flex-1">
            <input
              type="radio"
              name={`bg-${field.name}`}
              checked={field.backgroundColor !== null}
              onChange={() => handleBackgroundColorChange('#ffffff')}
              className="mr-2 accent-blue-600"
            />
            With Background
          </label>
        </div>
        
        {field.backgroundColor !== null && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {QR_COLOR_PRESETS.map((colorPreset) => (
                <button
                  key={colorPreset.value}
                  onClick={() => handleBackgroundColorChange(colorPreset.value)}
                  className={`w-6 h-6 rounded border-2 ${
                    field.backgroundColor === colorPreset.value ? 'border-gray-800' : 'border-gray-300'
                  } hover:border-gray-800 transition-colors`}
                  style={{ backgroundColor: colorPreset.value }}
                  title={colorPreset.name}
                />
              ))}
            </div>
            <input
              type="color"
              value={field.backgroundColor || '#ffffff'}
              onChange={(e) => handleBackgroundColorChange(e.target.value)}
              className="w-full h-8 bg-white border border-gray-300 rounded cursor-pointer"
            />
          </div>
        )}
      </div>
    </>
  );
};

// Utility function to generate QR code data URL
export const generateQRCodeDataURL = async (
  text: string,
  options: {
    size: number;
    color: string;
    backgroundColor: string | null;
  }
): Promise<string> => {
  try {
    const qrOptions: any = {
      width: options.size,
      height: options.size,
      color: {
        dark: options.color,
        light: options.backgroundColor || '#00000000', // transparent if no background
      },
      margin: 1,
      errorCorrectionLevel: 'M'
    };

    const dataURL = await QRCode.toDataURL(text || 'Empty', qrOptions) as unknown as string;
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Return a simple fallback
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiI+RXJyb3I8L3RleHQ+PC9zdmc+';
  }
};

// Utility function to draw QR code on canvas
export const drawQRCodeOnCanvas = async (
  ctx: CanvasRenderingContext2D,
  field: QRCodeFieldData,
  text: string
): Promise<void> => {
  try {
    const dataURL = await generateQRCodeDataURL(text, {
      size: field.size,
      color: field.color,
      backgroundColor: field.backgroundColor
    });

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, field.x, field.y, field.size, field.size);
        resolve();
      };
      img.onerror = () => {
        // Draw error placeholder
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(field.x, field.y, field.size, field.size);
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR Error', field.x + field.size / 2, field.y + field.size / 2);
        resolve();
      };
      img.src = dataURL;
    });
  } catch (error) {
    console.error('Error drawing QR code:', error);
    // Draw error placeholder
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(field.x, field.y, field.size, field.size);
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR Error', field.x + field.size / 2, field.y + field.size / 2);
  }
};
